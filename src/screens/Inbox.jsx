// Unified inbox — admin notification broadcasts + threads (orders +
// clubhouse + DMs) sorted by recency. Replaces the old Notifications
// screen. Tap a thread → opens the thread/chat view (chunk 4).
// Tap a notification → marks read + expands the body inline.
//
// v0.12.2 — adds two dismissal affordances on top of the existing X +
// confirm flow:
//   · Swipe a row left to dismiss it instantly (no modal). Translates
//     the row over a red "Delete" rail; release past the threshold
//     commits, release short of it springs back.
//   · A Select button toggles bulk-select mode. Rows render with a
//     checkbox, the row tap toggles selection instead of opening,
//     and a sticky bottom bar shows "Dismiss N · Cancel."
// Both dismiss paths show an Undo snackbar for 5s so a misfire is
// always one tap away from being reversed. Per Marc's rule, dismiss
// never hard-deletes — it only toggles hidden_at on
// notification_reads / thread_participants. An admin's broadcast list
// still shows every notification because the row stays in DB.
import { useEffect, useRef, useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useNav } from '../hooks/useNav.jsx';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import { useAuth } from '../hooks/useAuth.jsx';
import {
  useInbox,
  markNotificationRead,
  hideThread,
  hideNotification,
  hideThreads,
  hideNotifications,
  unhideThread,
  unhideNotification,
} from '../hooks/useInbox.js';
import { isPushSupported, pushPermission, subscribeToPush } from '../lib/push.js';
import FeatureOff from '../components/FeatureOff.jsx';

const PUSH_DISMISSED_KEY = 'inbox.pushBannerDismissed';
const SWIPE_THRESHOLD = 90;     // px of left-swipe required to commit dismiss
const SWIPE_DIRECTION_LOCK = 8; // px of horizontal motion to lock as a swipe
const UNDO_SNACKBAR_MS = 5000;  // how long Undo stays visible

export default function Inbox() {
  const { push } = useNav();
  const [scrollRef, onScroll] = useScrollRestore();
  const { session, member, isGuest } = useAuth();
  // (guest gate moved below all hook calls — rules of hooks)
  const { threads, notifications, loading } = useInbox();
  const [expanded, setExpanded] = useState({});      // notification id → bool
  const [pendingHide, setPendingHide] = useState(null);  // thread item awaiting confirm
  const [pushState, setPushState] = useState(() => pushPermission());
  const [pushBusy, setPushBusy] = useState(false);
  const [pushErr, setPushErr] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(PUSH_DISMISSED_KEY) === '1'
  );

  // v0.12.2 — bulk select state
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set()); // keys: "thread:UUID" | "notif:UUID"
  // v0.12.2 — Undo snackbar state. `pending` holds the items just
  // dismissed so the Undo button can restore them. `timerRef` ensures
  // we don't double-fire when a second dismissal lands before the
  // first snackbar finishes.
  const [undoPending, setUndoPending] = useState(null); // { items: [...] } | null
  const undoTimerRef = useRef(null);

  // Re-poll permission state when the screen mounts (user may have changed it elsewhere)
  useEffect(() => { setPushState(pushPermission()); }, []);

  // Cancel any pending undo timer on unmount so we don't update state
  // after the component is gone.
  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }, []);

  const enablePush = async () => {
    setPushBusy(true); setPushErr(null);
    try {
      await subscribeToPush(session.user.id);
      setPushState(pushPermission());
    } catch (e) {
      setPushErr(e.message || 'Could not enable notifications');
    } finally {
      setPushBusy(false);
    }
  };

  const dismissBanner = () => {
    setBannerDismissed(true);
    try { localStorage.setItem(PUSH_DISMISSED_KEY, '1'); } catch (_) {}
  };

  // Merge threads + notifications into a single feed sorted by recency
  const feed = [
    ...threads.map(t => ({
      key: `thread:${t.id}`,
      kind: t.kind,           // 'order' | 'clubhouse' | 'dm'
      title: t.subject || (t.kind === 'order' ? 'Food order' : t.kind === 'clubhouse' ? 'Clubhouse' : 'Direct message'),
      preview: t.preview?.body || '',
      time: t.last_message_at,
      unread: t.unread,
      type: 'thread',
      threadId: t.id,
      raw: t,
    })),
    ...notifications.map(n => ({
      key: `notif:${n.id}`,
      kind: 'notif',
      title: n.title,
      preview: n.body,
      time: n.published_at,
      unread: !n.read,
      urgency: n.urgency,
      type: 'notification',
      notificationId: n.id,
      sender: n.sender_label,
      raw: n,
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time));

  // v0.12.2 — fire the Undo snackbar with the given dismissed items.
  // Clears any existing timer so back-to-back dismisses don't pile up;
  // the snackbar shows the most recent batch, which matches iOS Mail.
  const showUndo = (items) => {
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    setUndoPending({ items });
    undoTimerRef.current = setTimeout(() => {
      setUndoPending(null);
      undoTimerRef.current = null;
    }, UNDO_SNACKBAR_MS);
  };

  // v0.12.2 — dismiss a single item from a swipe gesture. Same
  // underlying hideThread/hideNotification call as the confirm modal —
  // we just skip the confirm because the swipe IS the confirmation.
  const dismissOne = async (item) => {
    if (item.type === 'thread') {
      await hideThread(item.threadId, session?.user?.id);
    } else {
      await hideNotification(item.notificationId, member?.id);
    }
    showUndo([item]);
  };

  // v0.12.2 — dismiss the selected set. Splits by type so we can
  // submit one bulk update per table; both calls run in parallel.
  const dismissSelected = async () => {
    if (!selected.size) return;
    const items = feed.filter(f => selected.has(f.key));
    const threadIds = items.filter(i => i.type === 'thread').map(i => i.threadId);
    const notifIds  = items.filter(i => i.type === 'notification').map(i => i.notificationId);
    await Promise.all([
      hideThreads(threadIds, session?.user?.id),
      hideNotifications(notifIds, member?.id),
    ]);
    setSelected(new Set());
    setSelectMode(false);
    showUndo(items);
  };

  // v0.12.2 — Undo just-dismissed items. Reverses each via the
  // matching unhide helper; realtime sub re-renders the inbox.
  const undoDismiss = async () => {
    if (!undoPending?.items?.length) return;
    const items = undoPending.items;
    setUndoPending(null);
    if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    await Promise.all(items.map(i =>
      i.type === 'thread'
        ? unhideThread(i.threadId, session?.user?.id)
        : unhideNotification(i.notificationId, member?.id)
    ));
  };

  const toggleSelected = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleTap = async (item) => {
    if (selectMode) {
      toggleSelected(item.key);
      return;
    }
    if (item.type === 'thread') {
      push('thread', { threadId: item.threadId });
    } else {
      // toggle expanded + mark read
      setExpanded(p => ({ ...p, [item.notificationId]: !p[item.notificationId] }));
      if (item.unread) {
        await markNotificationRead(item.notificationId, member?.id);
      }
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const showPushBanner = isPushSupported() && pushState !== 'granted' && pushState !== 'denied' && !bannerDismissed;

  // v0.8.2: Inbox is always hidden from guests. Placed after all
  // hook calls (rules of hooks).
  if (isGuest) return <FeatureOff label="Inbox" body="Messaging is for club members only." />;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Inbox" />

      {/* v0.12.2 — Select / Cancel toolbar. Lives just under the
          header so it's always reachable. Counter doubles as a hint
          that bulk mode is active. */}
      {!loading && feed.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px', borderBottom: `1px solid ${G.border}`, background: G.bg,
        }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted }}>
            {selectMode
              ? (selected.size === 0 ? 'Tap items to select' : `${selected.size} selected`)
              : `${feed.length} item${feed.length === 1 ? '' : 's'}`}
          </span>
          <div
            onClick={selectMode ? exitSelectMode : () => setSelectMode(true)}
            data-tap
            style={{ padding: '4px 10px', cursor: 'pointer' }}
          >
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.brass, fontWeight: 500 }}>
              {selectMode ? 'Cancel' : 'Select'}
            </span>
          </div>
        </div>
      )}

      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto' }}>
        {showPushBanner && (
          <div style={{ margin: '14px 16px 6px', padding: '12px 14px', background: G.card, border: `1px solid ${G.brass}`, borderRadius: 6, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text, margin: '0 0 4px' }}>Get notified</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 8px', lineHeight: 1.45 }}>
                Push notifications when your food is ready, the clubhouse messages you, or a member sends a DM.
              </p>
              {pushErr && <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.clsDot, margin: '0 0 6px' }}>{pushErr}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <div onClick={enablePush} data-tap style={{ padding: '6px 12px', background: G.green, borderRadius: 3, cursor: pushBusy ? 'wait' : 'pointer' }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#F2EDE0', fontWeight: 500 }}>{pushBusy ? 'Enabling…' : 'Enable'}</span>
                </div>
                <div onClick={dismissBanner} data-tap style={{ padding: '6px 12px', cursor: 'pointer' }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, textDecoration: 'underline', textUnderlineOffset: 2 }}>Not now</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '40px 0', textAlign: 'center' }}>
            Loading…
          </p>
        )}

        {!loading && feed.length === 0 && (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 16, color: G.muted, margin: '0 0 6px' }}>Nothing in your inbox yet</p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: 0, lineHeight: 1.55 }}>
              Order updates, clubhouse messages, and announcements will appear here.
            </p>
          </div>
        )}

        {feed.map(item => (
          <InboxRow
            key={item.key}
            item={item}
            expanded={!!expanded[item.notificationId]}
            selectMode={selectMode}
            selected={selected.has(item.key)}
            onTap={() => handleTap(item)}
            onHide={() => setPendingHide(item)}
            onSwipeDismiss={() => dismissOne(item)}
          />
        ))}
        {/* Pad the bottom so the last row clears any sticky bars. */}
        {(selectMode || undoPending) && <div style={{ height: 80 }} />}
      </div>

      {/* v0.12.2 — Sticky bulk action bar. Only renders in select
          mode. The "Dismiss N" button is the explicit confirmation;
          no modal here because the Undo snackbar fires immediately
          and is the same affordance the rest of the row dismissals
          use. */}
      {selectMode && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '12px 16px', background: G.card, borderTop: `1px solid ${G.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
        }}>
          <span style={{ flex: 1, fontFamily: '"Lora",serif', fontSize: 13, color: G.text }}>
            {selected.size === 0
              ? 'Select items to dismiss'
              : `${selected.size} selected`}
          </span>
          <div
            onClick={exitSelectMode}
            data-tap
            style={{ padding: '8px 12px', cursor: 'pointer' }}
          >
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>Cancel</span>
          </div>
          <div
            onClick={selected.size > 0 ? dismissSelected : undefined}
            data-tap
            style={{
              padding: '8px 16px',
              background: selected.size > 0 ? G.clsBg : G.border,
              borderRadius: 3,
              cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
              opacity: selected.size > 0 ? 1 : 0.6,
            }}
          >
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>
              Dismiss{selected.size > 0 ? ` ${selected.size}` : ''}
            </span>
          </div>
        </div>
      )}

      {/* v0.12.2 — Undo snackbar. Floats above the bulk action bar
          when both are visible (won't happen in practice — dismiss
          exits select mode — but the z-stack is correct either way). */}
      {undoPending && !selectMode && (
        <div style={{
          position: 'absolute', left: 12, right: 12, bottom: 12,
          padding: '12px 14px', background: G.text, borderRadius: 6,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
          zIndex: 250,
        }}>
          <span style={{ flex: 1, fontFamily: '"Lora",serif', fontSize: 13, color: G.bg }}>
            Dismissed {undoPending.items.length === 1 ? '1 item' : `${undoPending.items.length} items`}
          </span>
          <div
            onClick={undoDismiss}
            data-tap
            style={{ padding: '6px 12px', cursor: 'pointer' }}
          >
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.brass, fontWeight: 700, letterSpacing: '0.04em' }}>UNDO</span>
          </div>
        </div>
      )}

      {/* Confirm-hide modal — same pattern as inside Thread so members
          who came in via the row's x button get the same safety net. */}
      {pendingHide && (
        <div
          onClick={() => setPendingHide(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200, padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: G.bg,
              borderRadius: 8,
              maxWidth: 340, width: '100%',
              padding: '18px 18px 14px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.32)',
              border: `1px solid ${G.border}`,
            }}
          >
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: '0 0 6px' }}>
              {pendingHide.type === 'thread' ? 'Delete this conversation?' : 'Delete this notification?'}
            </p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: '0 0 14px', lineHeight: 1.55 }}>
              {pendingHide.title ? <><em>{pendingHide.title}</em> — </> : null}
              {pendingHide.type === 'thread'
                ? "it will disappear from your inbox. If someone sends a new message it'll come back."
                : "it will be removed from your inbox. Other members are unaffected."}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <div
                onClick={() => setPendingHide(null)}
                data-tap
                style={{ padding: '8px 14px', cursor: 'pointer' }}
              >
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>Cancel</span>
              </div>
              <div
                onClick={async () => {
                  const item = pendingHide;
                  setPendingHide(null);
                  if (item.type === 'thread') {
                    await hideThread(item.threadId, session?.user?.id);
                  } else if (item.type === 'notification') {
                    await hideNotification(item.notificationId, member?.id);
                  }
                  // X-button path also surfaces the Undo snackbar so
                  // members who tapped X by accident can recover.
                  showUndo([item]);
                }}
                data-tap
                style={{ padding: '8px 14px', background: G.clsBg, borderRadius: 3, cursor: 'pointer' }}
              >
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>Delete</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InboxRow({ item, expanded, selectMode, selected, onTap, onHide, onSwipeDismiss }) {
  const chipBg = item.type === 'thread'
    ? (item.kind === 'order'     ? G.openBg
      : item.kind === 'clubhouse' ? G.brass
      : G.greenMid)
    : urgencyChipBg(item.urgency);
  const chipLabel = item.type === 'thread'
    ? (item.kind === 'order' ? 'Order' : item.kind === 'clubhouse' ? 'Clubhouse' : 'Message')
    : (item.urgency === 'urgent' ? 'Urgent' : item.urgency === 'high' ? 'Alert' : 'Notice');

  // v0.12.2 — swipe-to-dismiss state. translateX is mirrored from a
  // ref during touchmove (rAF style) to avoid React re-renders on
  // every pixel; the visible row uses the ref via inline style.
  // We commit a setState only when the swipe ends so the row can
  // animate back or off.
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const touchStateRef = useRef({ startX: 0, startY: 0, locked: null, didSwipe: false });

  const onTouchStart = (e) => {
    if (selectMode) return; // swipe disabled in select mode — taps toggle selection
    const t = e.touches[0];
    touchStateRef.current = { startX: t.clientX, startY: t.clientY, locked: null, didSwipe: false };
    setAnimating(false);
  };

  const onTouchMove = (e) => {
    if (selectMode) return;
    const st = touchStateRef.current;
    if (!st.startX) return;
    const t = e.touches[0];
    const dx = t.clientX - st.startX;
    const dy = t.clientY - st.startY;
    // Lock direction once we've moved beyond the deadzone
    if (st.locked == null) {
      if (Math.abs(dx) > SWIPE_DIRECTION_LOCK || Math.abs(dy) > SWIPE_DIRECTION_LOCK) {
        st.locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
    }
    if (st.locked !== 'h') return;        // vertical scroll — let the page handle it
    if (dx > 0) { setSwipeOffset(0); return; } // only left-swipes dismiss
    st.didSwipe = true;
    setSwipeOffset(dx);
  };

  const onTouchEnd = () => {
    if (selectMode) return;
    const st = touchStateRef.current;
    const committed = st.didSwipe && swipeOffset <= -SWIPE_THRESHOLD;
    if (committed) {
      // Animate the row sliding fully off, then commit the dismiss.
      // The list re-renders without it so no further cleanup needed.
      setAnimating(true);
      setSwipeOffset(-1000);
      setTimeout(() => { onSwipeDismiss && onSwipeDismiss(); }, 160);
    } else {
      // Spring back.
      setAnimating(true);
      setSwipeOffset(0);
      // Click suppression: if a real swipe happened (even if not
      // committed), don't let the synthetic click fire. React's
      // onClick fires after touchend so this short-circuit needs to
      // outlive this frame; we use the ref + a stopPropagation guard
      // inside handleClick.
    }
    touchStateRef.current = { ...st, startX: 0, startY: 0, locked: null };
  };

  // Suppress the click if a horizontal swipe was started. Without this,
  // a near-threshold swipe that springs back would also open the row.
  const handleClick = (e) => {
    if (touchStateRef.current?.didSwipe) {
      e.preventDefault(); e.stopPropagation();
      touchStateRef.current.didSwipe = false;
      return;
    }
    onTap();
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${G.border}` }}>
      {/* Red Delete rail revealed by the swipe. Static — the row
          slides over it. */}
      {!selectMode && (
        <div style={{
          position: 'absolute', inset: 0,
          background: G.clsBg,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 22px',
        }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>
            {swipeOffset <= -SWIPE_THRESHOLD ? 'Release to dismiss' : 'Dismiss'}
          </span>
        </div>
      )}
      <div
        onClick={handleClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        data-tap
        style={{
          padding: '13px 20px',
          background: selected ? G.openBg : (item.unread ? G.card : G.bg),
          cursor: 'pointer',
          display: 'flex',
          gap: 12,
          transform: `translateX(${swipeOffset}px)`,
          transition: animating ? 'transform 160ms ease-out' : 'none',
          position: 'relative',
        }}
      >
        {/* Bulk-select checkbox (v0.12.2) — replaces the unread dot
            so we don't waste a column. Same width so layout doesn't
            jitter when select mode toggles. */}
        {selectMode ? (
          <span
            style={{
              width: 18, height: 18, borderRadius: 3,
              border: `2px solid ${selected ? G.green : G.muted}`,
              background: selected ? G.green : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 2, flexShrink: 0,
            }}
          >
            {selected && (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F2EDE0" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </span>
        ) : (
          <span
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: item.unread ? G.brass : G.border,
              marginTop: 7, flexShrink: 0,
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: chipBg, padding: '2px 7px', borderRadius: 2, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, flexShrink: 0 }}>{chipLabel}</span>
            <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
          </div>
          <p style={{
            fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, lineHeight: 1.55, margin: '0 0 4px',
            ...(expanded ? {} : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
          }}>{item.preview}</p>
          <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10, color: G.muted }}>
            {item.sender ? `${item.sender} · ` : ''}{absoluteDate(item.time)} · {relativeTime(item.time)}
          </span>
          {/* In-message Delete (v0.6.8) — only shown for notifications
              when expanded. Threads have their own kebab inside Thread
              view; the X button at the row level still works for both. */}
          {expanded && item.type === 'notification' && onHide && !selectMode && (
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <div
                onClick={(e) => { e.stopPropagation(); onHide(); }}
                data-tap
                style={{ padding: '5px 12px', border: `1px solid ${G.border}`, borderRadius: 3, background: G.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G.clsDot} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                </svg>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, fontWeight: 500 }}>Delete</span>
              </div>
            </div>
          )}
        </div>
        {/* Per-row X — hidden in select mode (the checkbox is the
            primary affordance there). */}
        {onHide && !selectMode && (
          <div
            onClick={(e) => { e.stopPropagation(); onHide(); }}
            data-tap
            aria-label="Hide this thread from my inbox"
            style={{
              width: 26, height: 26, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, marginTop: 2,
              background: 'transparent',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        )}
      </div>
    </div>
  );
}

function absoluteDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const opts = sameYear
    ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  return d.toLocaleString(undefined, opts);
}

function urgencyChipBg(urgency) {
  if (urgency === 'urgent') return G.clsBg;
  if (urgency === 'high')   return G.limBg;
  if (urgency === 'low')    return G.muted;
  return G.greenMid;
}

function relativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)        return 'just now';
  if (diff < 3600)      return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString();
}
