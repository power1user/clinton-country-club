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
        if (ids.length) {
          const { data: reads } = await supabase
            .from('notification_reads')
            .select('message_id')
            .eq('member_id', member.id)
            .in('message_id', ids);
          readSet = new Set((reads || []).map(r => r.message_id));
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
        notifs = (ns || []).map(n => ({
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
