// Inbox data + unread counts.
//
// useInbox()        — full feed: threads (with preview of last message) +
//                     admin notification broadcasts, sorted by recency.
//                     Subscribed in realtime to messages, threads, and
//                     notification_messages so the list stays fresh.
//
// useInboxUnread()  — lightweight unread count for the bell badge. Counts:
//                       · messages newer than thread_participants.last_read_at
//                         (in threads where the current user is a participant)
//                       · published notification_messages without a
//                         notification_reads row for the current user
//                     Also subscribed in realtime.
import { useEffect, useState } from 'react';
import { supabase, isConfigured } from '../lib/supabase.js';
import { useAuth } from './useAuth.jsx';

// ────────────────────────────────────────────────────────────────────────────
// Lightweight unread count (used by BellChip in every tab header)
// ────────────────────────────────────────────────────────────────────────────
export function useInboxUnread() {
  const { club, session, member } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isConfigured || !club || !session?.user) { setUnread(0); return; }
    let cancelled = false;

    const recount = async () => {
      // 1) Thread messages newer than my last_read_at, in threads I participate in
      const { data: parts } = await supabase
        .from('thread_participants')
        .select('thread_id, last_read_at, hidden_at')
        .eq('user_id', session.user.id);
      // Hidden threads don't contribute to the bell unread count — the
      // member has explicitly dismissed them. A new message clears the
      // hidden_at flag (DB trigger) so the unread badge can come back.
      const partRows = (parts || []).filter(p => !p.hidden_at);

      let threadUnread = 0;
      if (partRows.length) {
        // For each participated thread, count messages newer than last_read_at
        // (single round trip per thread is fine for typical inbox sizes; we can
        // batch this into an RPC later if it gets noisy).
        const counts = await Promise.all(partRows.map(async (p) => {
          const after = p.last_read_at || '1970-01-01';
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('thread_id', p.thread_id)
            .gt('created_at', after)
            .neq('sender_user_id', session.user.id); // don't count my own messages
          return count || 0;
        }));
        threadUnread = counts.reduce((s, c) => s + c, 0);
      }

      // 2) Published notification_messages without a notification_reads row
      let notifUnread = 0;
      if (member?.id) {
        // Notifications for this club that are published (or no published_at == draft → skip)
        const { data: notifs } = await supabase
          .from('notification_messages')
          .select('id, published_at')
          .eq('club_id', club.id)
          .not('published_at', 'is', null)
          .lte('published_at', new Date().toISOString())
          .limit(200);

        const ids = (notifs || []).map(n => n.id);
        if (ids.length) {
          const { data: reads } = await supabase
            .from('notification_reads')
            .select('message_id')
            .eq('member_id', member.id)
            .in('message_id', ids);
          const readSet = new Set((reads || []).map(r => r.message_id));
          notifUnread = ids.filter(id => !readSet.has(id)).length;
        }
      }

      if (!cancelled) setUnread(threadUnread + notifUnread);
    };

    recount();

    const channel = supabase
      .channel(`inbox_unread:${session.user.id}:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => recount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'thread_participants', filter: `user_id=eq.${session.user.id}` }, () => recount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_messages', filter: `club_id=eq.${club.id}` }, () => recount())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_reads' }, () => recount())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, session?.user?.id, member?.id]);

  // v0.7.3: mirror the unread count to the OS-level app badge. Wired
  // directly into useInboxUnread so it stays in sync with the bell
  // chip automatically — anything that already updates the bell will
  // also update the badge. Feature-detected, so iOS Safari (no Badging
  // API), older browsers, or sandboxed contexts no-op silently. The
  // .catch swallows the rejection that fires on installed iOS PWAs
  // that have the API but haven't been granted notification permission
  // (badge requires a granted push permission on iOS 16.4+).
  //
  // Visible payoff is on installed Android PWAs (Chrome / Edge / Brave
  // on Android, plus desktop Chrome / Edge): the launcher icon gets a
  // small unread count badge, same UX members get from native messaging
  // apps. Idempotent — calling with the same count is cheap.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('setAppBadge' in navigator)) return;
    if (unread > 0) {
      navigator.setAppBadge(unread).catch(() => { /* permission not granted / unsupported context */ });
    } else {
      navigator.clearAppBadge?.().catch(() => { /* same */ });
    }
  }, [unread]);

  return unread;
}

// ────────────────────────────────────────────────────────────────────────────
// Full inbox feed
// ────────────────────────────────────────────────────────────────────────────
export function useInbox() {
  const { club, session, member } = useAuth();
  const [threads, setThreads] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !club || !session?.user) {
      setThreads([]); setNotifications([]); setLoading(false); return;
    }
    let cancelled = false;

    const load = async () => {
      // Threads I participate in. Skip threads the member explicitly
      // hid — they'll resurface when a fresh message clears hidden_at
      // (DB trigger fn_clear_hidden_on_new_message).
      const { data: parts } = await supabase
        .from('thread_participants')
        .select('thread_id, last_read_at, hidden_at, threads(id, kind, subject, context_table, context_id, last_message_at, club_id)')
        .eq('user_id', session.user.id);

      const myThreads = (parts || [])
        .filter(p => !p.hidden_at)
        .map(p => ({ ...p.threads, last_read_at: p.last_read_at }))
        .filter(t => t && t.club_id === club.id);

      // Preview message + unread count per thread
      const enriched = await Promise.all(myThreads.map(async (t) => {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('id, body, sender_user_id, is_system, created_at')
          .eq('thread_id', t.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const after = t.last_read_at || '1970-01-01';
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('thread_id', t.id)
          .gt('created_at', after)
          .neq('sender_user_id', session.user.id);

        return { ...t, preview: lastMsg, unread: count || 0 };
      }));

      // Notification broadcasts — pull created_by so we can attribute
      // each broadcast to the staff member or super-admin who sent it.
      // Falls back to "The Clubhouse" when the row has no created_by
      // (older seed rows, or scripted system-sent notifications).
      let notifs = [];
      if (member?.id) {
        const { data: ns } = await supabase
          .from('notification_messages')
          .select('id, title, body, urgency, published_at, created_by')
          .eq('club_id', club.id)
          .not('published_at', 'is', null)
          .lte('published_at', new Date().toISOString())
          .order('published_at', { ascending: false })
          .limit(50);

        const ids = (ns || []).map(n => n.id);
        let readSet = new Set();
        let hiddenSet = new Set();
        if (ids.length) {
          const { data: reads } = await supabase
            .from('notification_reads')
            .select('message_id, read_at, hidden_at')
            .eq('member_id', member.id)
            .in('message_id', ids);
          (reads || []).forEach(r => {
            if (r.read_at)   readSet.add(r.message_id);
            if (r.hidden_at) hiddenSet.add(r.message_id);
          });
        }
        // Resolve sender labels for every distinct created_by.
        const senderIds = Array.from(new Set((ns || []).map(n => n.created_by).filter(Boolean)));
        const senderMap = {};
        if (senderIds.length) {
          const [mb, rl] = await Promise.all([
            supabase.from('members').select('user_id, name')
              .eq('club_id', club.id).in('user_id', senderIds),
            supabase.from('user_roles').select('user_id, role, display_name')
              .in('user_id', senderIds)
              .or(`club_id.eq.${club.id},club_id.is.null`),
          ]);
          (rl.data || []).forEach(r => {
            senderMap[r.user_id] = r.display_name || (r.role === 'super_admin' ? 'The Grounds' : 'Staff');
          });
          (mb.data || []).forEach(m => {
            if (!senderMap[m.user_id]) senderMap[m.user_id] = m.name;
          });
        }
        // Filter out notifications the member has explicitly hidden.
        // Mirrors the thread hide flow — row stays in DB so admin still
        // sees it in their broadcast list; only this member's view loses it.
        notifs = (ns || [])
          .filter(n => !hiddenSet.has(n.id))
          .map(n => ({
            ...n,
            read: readSet.has(n.id),
            sender_label: n.created_by ? (senderMap[n.created_by] || 'Staff') : 'The Clubhouse',
          }));
      }

      if (cancelled) return;
      setThreads(enriched.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)));
      setNotifications(notifs);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`inbox_feed:${session.user.id}:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threads', filter: `club_id=eq.${club.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'thread_participants', filter: `user_id=eq.${session.user.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_messages', filter: `club_id=eq.${club.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_reads' }, () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, session?.user?.id, member?.id]);

  return { threads, notifications, loading };
}

// Mark a single notification as read for the current member.
export async function markNotificationRead(notificationId, memberId) {
  if (!notificationId || !memberId) return;
  await supabase.from('notification_reads').upsert(
    { message_id: notificationId, member_id: memberId, read_at: new Date().toISOString() },
    { onConflict: 'message_id,member_id' }
  );
}

// Mark a thread read up to now for the current participant.
export async function markThreadRead(threadId, userId) {
  if (!threadId || !userId) return;
  await supabase
    .from('thread_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('user_id', userId);
}

// Hide a thread from the calling user's inbox only. Other participants
// still see it. A new message resurfaces it (DB trigger).
export async function hideThread(threadId, userId) {
  if (!threadId || !userId) return;
  await supabase
    .from('thread_participants')
    .update({ hidden_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('user_id', userId);
}

// Hide a broadcast notification from the calling member's inbox only.
// Upsert into notification_reads so a member who never read the message
// can still hide it (read_at stays null in that case). Other members
// still see it; an admin's deletion (NotificationsAdmin) removes the
// underlying row for everyone.
export async function hideNotification(notificationId, memberId) {
  if (!notificationId || !memberId) return;
  await supabase.from('notification_reads').upsert(
    {
      message_id: notificationId,
      member_id: memberId,
      hidden_at: new Date().toISOString(),
    },
    { onConflict: 'message_id,member_id' }
  );
}

// v0.12.2 — bulk + undo helpers. The single-item hideNotification +
// hideThread above stay (used by the per-row X / confirm modal). The
// new bulk + unhide helpers are used by:
//   · Swipe-to-dismiss (mobile) — single dismiss + Undo snackbar
//   · Bulk-select mode — multiple dismiss with one network round-trip
//     per item, then one Undo snackbar that reverses the whole set
// Per Marc's "dismiss from view only" rule, the underlying rows are
// never deleted — we just toggle hidden_at on notification_reads /
// thread_participants. Setting it to null restores the row to the
// member's inbox feed instantly (realtime sub picks up the change).

export async function unhideNotification(notificationId, memberId) {
  if (!notificationId || !memberId) return;
  await supabase.from('notification_reads').upsert(
    { message_id: notificationId, member_id: memberId, hidden_at: null },
    { onConflict: 'message_id,member_id' }
  );
}

export async function unhideThread(threadId, userId) {
  if (!threadId || !userId) return;
  await supabase
    .from('thread_participants')
    .update({ hidden_at: null })
    .eq('thread_id', threadId)
    .eq('user_id', userId);
}

// Bulk versions. Done as parallel single-row writes rather than one
// statement because the notification_reads side needs an upsert on the
// composite key (member_id, message_id) — Postgres can take the
// multi-row form but supabase-js's upsert with onConflict on a list of
// objects is the cleanest cross-version path.
export async function hideNotifications(notificationIds, memberId) {
  if (!notificationIds?.length || !memberId) return;
  const now = new Date().toISOString();
  await supabase.from('notification_reads').upsert(
    notificationIds.map(id => ({ message_id: id, member_id: memberId, hidden_at: now })),
    { onConflict: 'message_id,member_id' }
  );
}

export async function hideThreads(threadIds, userId) {
  if (!threadIds?.length || !userId) return;
  await supabase
    .from('thread_participants')
    .update({ hidden_at: new Date().toISOString() })
    .in('thread_id', threadIds)
    .eq('user_id', userId);
}
