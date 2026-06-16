// ConsentCheckboxes — shared signup-time consent UI. Used by
// GuestRegister, CodeLanding, CodeFinish, and TermsGate (the existing-
// member re-acceptance flow uses a near-identical inline version).
//
// Two required boxes (Terms+Privacy, 18+) and two optional boxes
// (email marketing, SMS marketing with full TCPA disclosure inline).
// Marketing boxes are NEVER pre-checked. Phone-less users see the SMS
// box disabled with a hint to add a phone first.
//
// Parent owns the state; this component just renders + calls onChange.

import { G } from '../theme.js';
import { CONSENT_TEXT } from '../lib/terms.js';

export const EMPTY_CONSENT = Object.freeze({
  agreeTermsPrivacy: false,
  age18Plus: false,
  emailMarketing: false,
  smsMarketing: false,
});

export function isConsentValid(values) {
  return !!(values?.agreeTermsPrivacy && values?.age18Plus);
}

export default function ConsentCheckboxes({ values, onChange, hasPhone = false, compact = false }) {
  const set = (key, v) => onChange({ ...values, [key]: v });

  // SMS box is force-cleared when there's no phone, so we never claim
  // an opt-in we can't actually deliver.
  const handleSmsChange = (v) => {
    if (!hasPhone) return;
    set('smsMarketing', v);
  };

  const labelFs = compact ? 12.5 : 13;
  const sectionFs = compact ? 12 : 13;

  return (
    <div>
      {/* Required */}
      <Check
        id="cc-terms"
        checked={values.agreeTermsPrivacy}
        onChange={(v) => set('agreeTermsPrivacy', v)}
        required
        fs={labelFs}
      >
        I agree to the{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer" style={linkStyle}>Terms of Use</a>
        {' '}and{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>Privacy Policy</a>.
      </Check>

      <Check
        id="cc-age"
        checked={values.age18Plus}
        onChange={(v) => set('age18Plus', v)}
        required
        fs={labelFs}
      >
        I confirm that I am 18 years of age or older.
      </Check>

      {/* Optional marketing — visually separated */}
      <div style={{ margin: '14px 0 6px' }}>
        <p style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: sectionFs,
          fontWeight: 700,
          color: G.text,
          margin: '0 0 2px',
          letterSpacing: '0.02em',
        }}>
          Optional &mdash; marketing messages
        </p>
        <p style={{
          fontFamily: '"Lora",serif',
          fontSize: 10.5,
          fontStyle: 'italic',
          color: G.muted,
          margin: 0,
          lineHeight: 1.4,
        }}>
          You can change these any time in Settings. Service messages (account, orders, events) are not affected.
        </p>
      </div>

      <Check
        id="cc-email"
        checked={values.emailMarketing}
        onChange={(v) => set('emailMarketing', v)}
        fs={labelFs}
      >
        {CONSENT_TEXT.email_marketing}
      </Check>

      <Check
        id="cc-sms"
        checked={values.smsMarketing && hasPhone}
        onChange={handleSmsChange}
        disabled={!hasPhone}
        fs={labelFs}
      >
        {CONSENT_TEXT.sms_marketing}
      </Check>
      {!hasPhone && (
        <p style={{
          fontFamily: '"Lora",serif',
          fontSize: 10.5,
          color: G.muted,
          margin: '-4px 0 6px 30px',
          lineHeight: 1.4,
          fontStyle: 'italic',
        }}>
          Add a phone number above to enable text marketing.
        </p>
      )}
    </div>
  );
}

// v0.19.9 — see TermsGate.jsx Check for the explainer. tl;dr: keeping
// BOTH the `htmlFor` AND the nested input caused a double click-
// dispatch (bubble + label re-dispatch) on iOS Safari that toggled the
// checkbox twice, so the box never visibly changed state. Nested
// controls are auto-associated with the wrapping label.
function Check({ id, checked, onChange, children, required, disabled, fs = 13 }) {
  return (
    <label
      data-tap
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '8px 0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange && onChange(e.target.checked)}
        disabled={disabled}
        style={{
          width: 20,
          height: 20,
          marginTop: 1,
          flexShrink: 0,
          accentColor: G.green,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      />
      <span style={{
        fontFamily: '"Lora",serif',
        fontSize: fs,
        color: G.text,
        lineHeight: 1.5,
      }}>
        {children}
        {required && (
          <span style={{ color: G.clsDot, marginLeft: 4, fontWeight: 600 }} aria-label="required">*</span>
        )}
      </span>
    </label>
  );
}

const linkStyle = { color: G.green, textDecoration: 'underline', textUnderlineOffset: 2, fontWeight: 500 };
