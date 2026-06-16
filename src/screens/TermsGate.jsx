// TermsGate — full-screen consent capture shown when a member's
// terms_accepted_version is below CURRENT_TERMS_VERSION. Rendered by
// App.jsx's Gate before any nav happens, so members can't reach in-app
// screens without affirmative consent.
//
// v0.18.0 — Now captures FOUR consents in one screen:
//   1. Terms of Use + Privacy Policy (required)
//   2. 18+ age affirmation (required)
//   3. Email marketing opt-in (optional, unchecked default)
//   4. SMS marketing opt-in (optional, unchecked default, full TCPA
//      disclosure visible inline)
//
// No forced scroll — both required boxes are visible immediately above
// the Accept button. Members can read the linked /terms and /privacy
// docs in a new tab. "Decline" signs them out.

import { useState } from 'react';
import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabase.js';
import {
  CURRENT_TERMS_VERSION, CURRENT_TERMS_DATE,
  CURRENT_PRIVACY_VERSION,
  CONSENT_TEXT,
} from '../lib/terms.js';
import { PLATFORM_NAME } from '../lib/version.js';
import { useConfirm } from '../components/ConfirmModal.jsx';

export default function TermsGate({ onAccept, onDecline, previewBanner }) {
  const { club, member, signOut, refreshMember } = useAuth();
  const confirmAsync = useConfirm();

  const [agreeTermsPrivacy, setAgreeTermsPrivacy] = useState(false);
  const [age18Plus, setAge18Plus] = useState(false);
  const [emailMarketing, setEmailMarketing] = useState(false);
  const [smsMarketing, setSmsMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const hasPhone = !!(member?.phone && String(member.phone).trim());
  const canAccept = agreeTermsPrivacy && age18Plus && !busy;

  // v0.19.2 — when onAccept/onDecline are provided (TermsGatePreview),
  // run those instead of the real DB writes + sign-out. Lets super_admin
  // dry-run the gate without bumping their own terms_accepted_version
  // or losing their session.
  const acceptOverride = typeof onAccept === 'function';
  const declineOverride = typeof onDecline === 'function';

  const accept = async () => {
    if (!canAccept) return;
    if (acceptOverride) {
      setBusy(true);
      await Promise.resolve(onAccept({ agreeTermsPrivacy, age18Plus, emailMarketing, smsMarketing }));
      setBusy(false);
      // Reset so the preview can be re-fired.
      setAgreeTermsPrivacy(false); setAge18Plus(false);
      setEmailMarketing(false); setSmsMarketing(false);
      return;
    }
    if (!member?.id) return;
    setBusy(true); setErr(null);
    try {
      // Required consents — both must be true when we get here.
      const { error: e1 } = await supabase.rpc('record_consent', {
        p_consent_type: 'terms_and_privacy',
        p_consent_value: true,
        p_consent_text: CONSENT_TEXT.terms_and_privacy,
        p_source: 'terms_gate',
        p_club_id: club?.id ?? null,
        p_terms_version: CURRENT_TERMS_VERSION,
        p_privacy_version: CURRENT_PRIVACY_VERSION,
      });
      if (e1) throw e1;

      const { error: e2 } = await supabase.rpc('record_consent', {
        p_consent_type: 'age_18_plus',
        p_consent_value: true,
        p_consent_text: CONSENT_TEXT.age_18_plus,
        p_source: 'terms_gate',
        p_club_id: club?.id ?? null,
      });
      if (e2) throw e2;

      // Marketing consents — always log (positive opt-in OR explicit no).
      const { error: e3 } = await supabase.rpc('record_consent', {
        p_consent_type: 'email_marketing',
        p_consent_value: !!emailMarketing,
        p_consent_text: CONSENT_TEXT.email_marketing,
        p_source: 'terms_gate',
        p_club_id: club?.id ?? null,
      });
      if (e3) throw e3;

      // SMS only if phone on file; otherwise we skip the row entirely so
      // we never claim the user opted in without a contact channel. The
      // user can opt in later from Settings once they add a phone.
      if (hasPhone) {
        const { error: e4 } = await supabase.rpc('record_consent', {
          p_consent_type: 'sms_marketing',
          p_consent_value: !!smsMarketing,
          p_consent_text: CONSENT_TEXT.sms_marketing,
          p_source: 'terms_gate',
          p_club_id: club?.id ?? null,
        });
        if (e4) throw e4;
      }

      // Mirror the ToU acceptance onto members (pre-existing pattern).
      const { error: eMember } = await supabase
        .from('members')
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_accepted_version: CURRENT_TERMS_VERSION,
        })
        .eq('id', member.id);
      if (eMember) throw eMember;

      await refreshMember?.();
      setBusy(false);
    } catch (e) {
      console.error('[TermsGate] accept failed', e);
      setBusy(false);
      setErr("Couldn't save your acceptance. Please try again, or sign out and back in.");
    }
  };

  const decline = async () => {
    if (declineOverride) {
      onDecline();
      return;
    }
    if (!(await confirmAsync({
      title: 'Decline and sign out?',
      body: 'You can come back and agree later — these terms are required to use the app.',
      confirmLabel: 'Decline & sign out',
      danger: true,
    }))) return;
    await signOut();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: G.bg }}>
      {previewBanner}
      {/* Header — branded, matches StatusBar pattern */}
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <div style={{ background: G.green, padding: '6px 24px 18px', flexShrink: 0 }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 9, color: '#A8D8B8', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 2px' }}>
          {PLATFORM_NAME} · {club?.name || 'Your club'}
        </p>
        <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 22, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.15 }}>
          Before you continue
        </h1>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: '#A8D8B8', margin: '4px 0 0' }}>
          Terms version {CURRENT_TERMS_VERSION} · effective {CURRENT_TERMS_DATE}
        </p>
      </div>

      {/* Scrollable body — intro, then the 4 checkboxes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 8px' }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 13.5, color: G.text, margin: '0 0 16px', lineHeight: 1.55 }}>
          We&rsquo;ve updated our Terms of Use and Privacy Policy. Please
          confirm the items below to continue using {PLATFORM_NAME}.
        </p>

        {/* Required: ToU + Privacy */}
        <Check
          checked={agreeTermsPrivacy}
          onChange={setAgreeTermsPrivacy}
          required
          id="agree-terms-privacy"
        >
          I agree to the{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" style={linkStyle}>Terms of Use</a>
          {' '}and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>Privacy Policy</a>.
        </Check>

        {/* Required: 18+ */}
        <Check
          checked={age18Plus}
          onChange={setAge18Plus}
          required
          id="age-18"
        >
          I confirm that I am 18 years of age or older.
        </Check>

        <div style={{ margin: '18px 0 10px' }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text, margin: '0 0 4px', letterSpacing: '0.02em' }}>
            Optional &mdash; marketing messages
          </p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11.5, fontStyle: 'italic', color: G.muted, margin: 0, lineHeight: 1.45 }}>
            You can change these any time in Settings. Service messages (account, orders, events) are not affected.
          </p>
        </div>

        {/* Optional: email marketing */}
        <Check
          checked={emailMarketing}
          onChange={setEmailMarketing}
          id="email-marketing"
        >
          {CONSENT_TEXT.email_marketing}
        </Check>

        {/* Optional: SMS marketing — TCPA disclosure visible inline */}
        <Check
          checked={smsMarketing}
          onChange={hasPhone ? setSmsMarketing : undefined}
          disabled={!hasPhone}
          id="sms-marketing"
        >
          {CONSENT_TEXT.sms_marketing}
        </Check>
        {!hasPhone && (
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '-4px 0 8px 32px', lineHeight: 1.4 }}>
            Add a phone number in Settings to enable text marketing.
          </p>
        )}
      </div>

      {/* Sticky action bar */}
      <div style={{ flexShrink: 0, padding: '12px 20px max(16px, calc(env(safe-area-inset-bottom) + 10px))', borderTop: `1px solid ${G.border}`, background: G.bg }}>
        {err && (
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, margin: '0 0 8px', textAlign: 'center' }}>{err}</p>
        )}
        <div
          onClick={canAccept ? accept : undefined}
          data-tap
          aria-disabled={!canAccept}
          style={{
            padding: 13,
            background: canAccept ? G.green : G.muted,
            borderRadius: 4,
            textAlign: 'center',
            cursor: canAccept ? 'pointer' : 'not-allowed',
            opacity: canAccept ? 1 : 0.65,
          }}
        >
          <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: '#F2EDE0', fontWeight: 500 }}>
            {busy ? 'Saving…' : 'I agree — continue'}
          </span>
        </div>
        <div onClick={busy ? undefined : decline} data-tap style={{ padding: '12px 8px 4px', textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, textDecoration: 'underline', textUnderlineOffset: 2 }}>
            Decline and sign out
          </span>
        </div>
      </div>
    </div>
  );
}

// Shared checkbox row. Big tap target, required-marker, disabled state.
//
// v0.19.9 — NO `htmlFor` on the <label> when the <input> is nested
// inside it. Having BOTH nesting AND htmlFor causes a double click-
// dispatch on iOS Safari: the click bubbles from input → label, and
// the label's htmlFor re-dispatches a synthetic click back to the
// input. Net effect = toggle twice = state never changes, so the
// checkboxes silently refuse to flip. Nested form controls are auto-
// associated with the wrapping label per HTML5, so removing htmlFor
// keeps accessibility intact.
function Check({ checked, onChange, children, id, required, disabled }) {
  return (
    <label
      data-tap
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '10px 0',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange && onChange(e.target.checked)}
        disabled={disabled}
        style={{
          width: 20,
          height: 20,
          marginTop: 2,
          flexShrink: 0,
          accentColor: G.green,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      />
      <span style={{
        fontFamily: '"Lora",serif',
        fontSize: 13,
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
