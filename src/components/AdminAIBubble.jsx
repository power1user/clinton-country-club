// AdminAIBubble — v0.14.9 floating admin AI launcher.
//
// Shipped because the topbar icon (v0.14.2) was too subtle for
// most admins to notice. This is a much more prominent
// brass-accented pill in the bottom-right corner that opens the
// SAME AdminAIChatModal as the topbar icon.
//
// Brass color distinguishes from MemberAIBubble (green). The two
// never show at the same time (admin bubble is admin-shell-only;
// member bubble is member-shell-only) but using different colors
// keeps super_admins who flip between contexts oriented.
//
// Dismissible: localStorage key `admin-ai-dismissed:<user_id>`. A
// tiny brass tab on the right edge recalls it.
//
// Renders the open/close trigger only — the actual chat modal is
// AdminAIChatModal, owned by the parent shell (AdminLayoutDesktop
// or wherever this is mounted). Parent passes `onOpen`.

import { useState } from 'react';
import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';

export default function AdminAIBubble({ onOpen }) {
  const { session } = useAuth();
  // user.id isn't exported by useAuth — fall back to session.user.id
  // (the supabase session object has the user nested).
  const userId = session?.user?.id || 'anon';
  const dismissKey = `admin-ai-dismissed:${userId}`;

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(dismissKey) === '1';
  });

  const dismiss = () => {
    localStorage.setItem(dismissKey, '1');
    setDismissed(true);
  };
  const recall = () => {
    localStorage.removeItem(dismissKey);
    setDismissed(false);
  };

  // ── Dismissed: tiny brass recall tab on the right edge ───────────
  if (dismissed) {
    return (
      <div onClick={recall} data-tap
        style={{
          position: 'fixed', bottom: 18, right: 0,
          background: G.brass,
          padding: '6px 8px 6px 10px',
          borderRadius: '14px 0 0 14px',
          cursor: 'pointer',
          zIndex: 200,
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
          opacity: 0.85,
        }}
        title="Show GroundsLive Admin AI">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A180F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </div>
    );
  }

  // ── Visible: prominent brass pill with chat icon + label ─────────
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      zIndex: 200,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
    }}>
      {/* Small dismiss above the pill */}
      <div onClick={dismiss} data-tap
        style={{
          background: 'rgba(26,24,15,0.65)',
          padding: '2px 8px',
          borderRadius: 10,
          cursor: 'pointer',
          fontFamily: '"Lora",serif',
          fontSize: 10,
          color: '#F2E5C0',
          opacity: 0.85,
        }}
        title="Hide AI">
        Hide
      </div>

      {/* The pill — brass, labelled, large enough to notice */}
      <div onClick={onOpen} data-tap
        style={{
          background: G.brass,
          padding: '12px 18px 12px 14px',
          borderRadius: 28,
          display: 'flex', alignItems: 'center', gap: 9,
          cursor: 'pointer',
          boxShadow: '0 8px 22px rgba(167, 132, 60, 0.4), 0 2px 6px rgba(0,0,0,0.18)',
          border: '1.5px solid rgba(255,255,255,0.22)',
        }}
        title="Ask GroundsLive Admin AI">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1A180F" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: 14,
          fontWeight: 700,
          color: '#1A180F',
          letterSpacing: '0.02em',
        }}>
          Ask AI
        </span>
      </div>
    </div>
  );
}
