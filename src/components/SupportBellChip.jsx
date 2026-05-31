// SupportBellChip — admin top-bar chip that shows the support inbox
// unread count for super_admins. Sits alongside the regular BellChip
// in AdminLayoutDesktop. Only renders when the viewer is a super_admin
// AND the count is > 0 — keeps the top bar clean when there's nothing
// pending.
//
// Click → navigates to Platform → Support → Inbox. Uses a hard URL
// navigation (vs the existing in-page state update) since the bell
// click is a rare event and consistency with the push-notification
// deep-link URL is more important than spa-style smoothness.

import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useSupportUnread } from '../hooks/useSupportUnread.js';

export default function SupportBellChip() {
  const { isSuperAdmin } = useAuth();
  const unread = useSupportUnread();

  // Hide entirely for non-super_admins or when there are no unread —
  // matches the "out of sight when irrelevant" principle of the
  // existing Comms unread dots.
  if (!isSuperAdmin || unread <= 0) return null;

  const countLabel = unread > 99 ? '99+' : String(unread);

  const onClick = () => {
    // Same URL pattern as the v0.13.2 push notification deep-link.
    window.location.href = '/admin/?area=platform&section=support';
  };

  return (
    <div
      onClick={onClick}
      data-tap
      title={`Support inbox · ${unread} unread`}
      aria-label={`Support inbox · ${unread} unread`}
      style={{
        position: 'relative',
        cursor: 'pointer',
        width: 36, height: 36,
        borderRadius: '50%',
        border: '1.5px solid rgba(155,122,30,0.45)',  // brass-tint border to differentiate from the green BellChip
        background: 'rgba(155,122,30,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Envelope icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="1.8">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </svg>
      <span
        style={{
          position: 'absolute',
          top: -3, right: -3,
          minWidth: 16, height: 16, padding: '0 4px',
          borderRadius: 8,
          background: G.clsBg,                          // red for "needs attention" parity with the existing unread dot
          border: '1.5px solid #1B3A2D',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: '"Lora",serif', fontSize: 9, fontWeight: 700,
          color: '#F2E5C0', lineHeight: 1,
        }}
      >
        {countLabel}
      </span>
    </div>
  );
}
