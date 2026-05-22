// Inbox bell — circular green chip with bell icon + unread badge.
// Pushes the 'inbox' route into the current tab's stack. Designed to
// match the existing Home-screen bell shape so it sits naturally in
// any tab header title row.
import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useInboxUnread } from '../hooks/useInbox.js';

export default function BellChip() {
  const { push } = useNav();
  const unread = useInboxUnread();
  const showCount = unread > 0;
  const countLabel = unread > 99 ? '99+' : String(unread);

  return (
    <div
      onClick={() => push('inbox')}
      data-tap
      style={{
        position: 'relative',
        cursor: 'pointer',
        width: 36, height: 36,
        borderRadius: '50%',
        border: '1.5px solid rgba(122,172,136,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-label={showCount ? `Inbox · ${unread} unread` : 'Inbox'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7AAC88" strokeWidth="1.5">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {showCount && (
        <span
          style={{
            position: 'absolute',
            top: -3, right: -3,
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 8,
            background: G.brass,
            border: '1.5px solid #1B3A2D',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"Lora",serif', fontSize: 9, fontWeight: 700,
            color: '#F2E5C0', lineHeight: 1,
          }}
        >
          {countLabel}
        </span>
      )}
    </div>
  );
}
