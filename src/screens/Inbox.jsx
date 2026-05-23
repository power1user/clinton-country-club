// Unified inbox — admin notification broadcasts + threads (orders +
// clubhouse + DMs) sorted by recency. Replaces the old Notifications
// screen. Tap a thread → opens the thread/chat view (chunk 4).
// Tap a notification → marks read + expands the body inline.
import { useEffect, useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useNav } from '../hooks/useNav.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useInbox, markNotificationRead, hideThread } from '../hooks/useInbox.js';
import { isPushSupported, pushPermission, subscribeToPush } from '../lib/push.js';

const PUSH_DISMISSED_KEY = 'inbox.pushBannerDismissed';

export default function Inbox() {
  const { push } = useNav();
  const { session, member } = useAuth();
  const { threads, notifications, loading } = useInbox();
  const [expanded, setExpanded] = useState({});      // notification id → bool
  const [pushState, setPushState] = useState(() => pushPermission());
  const [pushBusy, setPushBusy] = useState(false);
  const [pushErr, setPushErr] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem(PUSH_DISMISSED_KEY) === '1'
  );

  // Re-poll permission state when the screen mounts (user may have changed it elsewhere)
  useEffect(() => { setPushState(pushPermission()); }, []);

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
      raw: n,
    })),
  ].sort((a, b) => new Date(b.time) - new Date(a.time));

  const handleTap = async (item) => {
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

  const showPushBanner = isPushSupported() && pushState !== 'granted' && pushState !== 'denied' && !bannerDismissed;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Inbox" />

      <div style={{ flex: 1, overflowY: 'auto' }}>
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
            onTap={() => handleTap(item)}
            onHide={item.type === 'thread' ? () => hideThread(item.threadId, session?.user?.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function InboxRow({ item, expanded, onTap, onHide }) {
  const chipBg = item.type === 'thread'
    ? (item.kind === 'order'     ? G.openBg
      : item.kind === 'clubhouse' ? G.brass
      : G.greenMid)
    : urgencyChipBg(item.urgency);
  const chipLabel = item.type === 'thread'
    ? (item.kind === 'order' ? 'Order' : item.kind === 'clubhouse' ? 'Clubhouse' : 'Message')
    : (item.urgency === 'urgent' ? 'Urgent' : item.urgency === 'high' ? 'Alert' : 'Notice');

  return (
    <div
      onClick={onTap}
      data-tap
      style={{
        padding: '13px 20px',
        borderBottom: `1px solid ${G.border}`,
        background: item.unread ? G.card : G.bg,
        cursor: 'pointer',
        display: 'flex',
        gap: 12,
      }}
    >
      <span
        style={{
          width: 8, height: 8, borderRadius: '50%',
          background: item.unread ? G.brass : G.border,
          marginTop: 7, flexShrink: 0,
        }}
      />
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
          {absoluteDate(item.time)} · {relativeTime(item.time)}
        </span>
      </div>
      {onHide && (
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
