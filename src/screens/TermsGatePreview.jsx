// TermsGatePreview — super_admin-only dry-run of the real TermsGate.
// v0.19.2.
//
// Hosted at /dev/terms-preview. Renders the real TermsGate component
// with mock onAccept / onDecline handlers so super_admin can:
//   · See the actual UI (no copy drift from production)
//   · Tick the checkboxes and see the "I agree — continue" button
//     enable
//   · Trigger Accept and see the captured consent state surfaced in a
//     toast, WITHOUT bumping their own members.terms_accepted_version
//   · Trigger Decline and see the confirm modal flow, WITHOUT being
//     signed out
//
// Gated at the App.jsx Gate level — non-super_admin sessions fall
// through to the normal app routing, so a member who somehow lands on
// /dev/terms-preview just sees their home screen.

import { useState } from 'react';
import { G } from '../theme.js';
import { PLATFORM_NAME } from '../lib/version.js';
import TermsGate from './TermsGate.jsx';

export default function TermsGatePreview() {
  const [lastEvent, setLastEvent] = useState(null);

  const onAccept = (consents) => {
    setLastEvent({ kind: 'accept', consents, at: new Date().toISOString() });
  };
  const onDecline = () => {
    setLastEvent({ kind: 'decline', at: new Date().toISOString() });
  };

  return (
    <TermsGate
      onAccept={onAccept}
      onDecline={onDecline}
      previewBanner={<PreviewBanner lastEvent={lastEvent} onClear={() => setLastEvent(null)} />}
    />
  );
}

function PreviewBanner({ lastEvent, onClear }) {
  return (
    <div style={{
      flexShrink: 0,
      background: '#5C2A0F',
      color: '#F2EDE0',
      padding: '8px 16px',
      fontFamily: '"Lora",serif',
      fontSize: 11,
      lineHeight: 1.45,
      borderBottom: `1px solid ${G.border}`,
    }}>
      <div style={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Preview · {PLATFORM_NAME} · super_admin only
      </div>
      <div style={{ marginTop: 2, fontStyle: 'italic', opacity: 0.85 }}>
        Dry-run of the real TermsGate. Accept and Decline do NOT touch
        the DB or sign you out — they surface the captured state below.
      </div>
      {lastEvent && (
        <div style={{
          marginTop: 6,
          padding: '6px 8px',
          background: 'rgba(0,0,0,0.25)',
          borderRadius: 3,
          fontFamily: 'monospace',
          fontSize: 11,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}>
          <div style={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
            {lastEvent.kind === 'accept'
              ? `ACCEPT — terms+privacy:${lastEvent.consents.agreeTermsPrivacy} | 18+:${lastEvent.consents.age18Plus} | email:${lastEvent.consents.emailMarketing} | sms:${lastEvent.consents.smsMarketing}`
              : 'DECLINE — would call signOut() in production'}
          </div>
          <div
            onClick={onClear}
            data-tap
            style={{
              cursor: 'pointer',
              padding: '0 6px',
              border: `1px solid rgba(242,237,224,0.4)`,
              borderRadius: 3,
              fontSize: 10,
            }}
          >
            clear
          </div>
        </div>
      )}
    </div>
  );
}
