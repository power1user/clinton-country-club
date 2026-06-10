// MarketingPrefsCard — email + SMS marketing toggles in Settings.
//
// Each toggle change appends a consent_log row (source='settings') and
// updates the mirror column on people via the record_consent RPC.
// Match-consent-at-send-time semantics live on people.opt_in columns,
// not here.
//
// SMS toggle is disabled when the user has no phone on file (with a
// hint to add one in their profile) — we never claim an opt-in we
// can't deliver on.

import { useEffect, useState } from 'react';
import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabase.js';
import { CONSENT_TEXT } from '../lib/terms.js';

export default function MarketingPrefsCard() {
  const { member, club } = useAuth();
  const personId = member?.person_id;

  const [email, setEmail] = useState(false);
  const [sms, setSms] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [savingKey, setSavingKey] = useState(null); // 'email' | 'sms' | null
  const [err, setErr] = useState(null);

  const hasPhone = !!(member?.phone && String(member.phone).trim());

  // Read current state from people.
  useEffect(() => {
    if (!personId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('people')
        .select('email_marketing_opt_in, sms_marketing_opt_in')
        .eq('id', personId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn('[MarketingPrefsCard] load failed', error.message);
      }
      setEmail(!!data?.email_marketing_opt_in);
      setSms(!!data?.sms_marketing_opt_in);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [personId]);

  const writeConsent = async (consent_type, consent_value, consent_text, optimisticSet, prevValue) => {
    if (savingKey) return;
    setSavingKey(consent_type === 'email_marketing' ? 'email' : 'sms');
    setErr(null);
    optimisticSet(consent_value);
    const { error } = await supabase.rpc('record_consent', {
      p_consent_type: consent_type,
      p_consent_value: consent_value,
      p_consent_text: consent_text,
      p_source: 'settings',
      p_club_id: club?.id ?? null,
    });
    if (error) {
      console.error('[MarketingPrefsCard] record_consent failed', error.message);
      setErr(error.message || 'Could not save preference.');
      optimisticSet(prevValue); // rollback
    }
    setSavingKey(null);
  };

  const onEmailToggle = (v) => writeConsent(
    'email_marketing', v, CONSENT_TEXT.email_marketing, setEmail, email,
  );
  const onSmsToggle = (v) => {
    if (!hasPhone) return;
    writeConsent('sms_marketing', v, CONSENT_TEXT.sms_marketing, setSms, sms);
  };

  return (
    <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
      <Row
        label="Email marketing"
        sub="News, events, and promotional emails from your club and Grounds Live."
        checked={loaded && email}
        onToggle={onEmailToggle}
        saving={savingKey === 'email'}
      />
      <Row
        label="Text marketing"
        sub={
          hasPhone
            ? 'Promotional SMS. Msg & data rates may apply. Reply STOP to cancel.'
            : 'Add a phone number to your profile to enable text marketing.'
        }
        checked={loaded && sms && hasPhone}
        onToggle={onSmsToggle}
        saving={savingKey === 'sms'}
        disabled={!hasPhone}
        borderTop
      />
      {err && (
        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, margin: '8px 14px 10px' }}>
          {err}
        </p>
      )}
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10.5, color: G.muted, margin: 0, padding: '8px 14px 10px', borderTop: `1px solid ${G.border}`, lineHeight: 1.45 }}>
        Service messages (account, orders, events) cannot be turned off while your account is active.
      </p>
    </div>
  );
}

function Row({ label, sub, checked, onToggle, saving, disabled, borderTop }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px',
      borderTop: borderTop ? `1px solid ${G.border}` : 'none',
      opacity: disabled ? 0.6 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0 }}>{label}</p>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '3px 0 0', lineHeight: 1.45 }}>{sub}</p>
      </div>
      <Switch checked={checked} onChange={onToggle} disabled={disabled || saving} />
    </div>
  );
}

function Switch({ checked, onChange, disabled }) {
  const w = 42, h = 24;
  const onClick = () => { if (!disabled) onChange(!checked); };
  return (
    <div
      onClick={onClick}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      data-tap
      style={{
        width: w,
        height: h,
        background: checked ? G.green : G.border,
        borderRadius: h / 2,
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        transition: 'background 0.18s',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2,
        left: checked ? w - h + 2 : 2,
        width: h - 4,
        height: h - 4,
        background: '#F2EDE0',
        borderRadius: '50%',
        transition: 'left 0.18s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}
