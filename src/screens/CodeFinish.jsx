// CodeFinish — magic-link landing for the QR onboarding flow.
// Phase 19, v0.17.0. v0.18.0 adds the 4-checkbox consent step.
//
// URL: groundslive.com/code/finish?code=<code>
//
// Flow:
//   1. Read code from query string.
//   2. Wait for the magic-link Supabase session to settle.
//   3. Show the consent screen (Terms+Privacy required, 18+ required,
//      email mkt optional, SMS mkt disabled-with-hint because we have
//      no phone yet at this stage).
//   4. On accept: write consents via record_consent RPC.
//   5. Call redeem-code stage='consume' to provision the membership/club.
//   6. Redirect to the club URL.

import { useEffect, useState } from 'react';
import { G } from '../theme.js';
import { supabase } from '../lib/supabase.js';
import { PLATFORM_NAME } from '../lib/version.js';
import ConsentCheckboxes, { EMPTY_CONSENT, isConsentValid } from '../components/ConsentCheckboxes.jsx';
import { CONSENT_TEXT, CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '../lib/terms.js';

function readCodeFromQuery() {
  try {
    const url = new URL(window.location.href);
    return (url.searchParams.get('code') || '').trim().toUpperCase();
  } catch { return ''; }
}

const ERROR_COPY = {
  invalid_code:        ["That code isn't valid.",        "Double-check it on whatever you scanned and try again."],
  revoked:             ["That code was revoked.",        "Ask whoever shared it with you for a fresh one."],
  expired:             ["That code expired.",            "Ask whoever shared it with you for a fresh one."],
  exhausted:           ["That code is fully redeemed.",  "If this is a club code, ask the club for a new one."],
  locked:              ["That code is locked.",          "Too many wrong attempts. Try again later or ask for a new code."],
  invalid_email:       ["Email mismatch.",               "This code is tied to a specific email; you'll need to sign in with that one."],
  slug_taken:          ["The club name is unavailable.", "The slug for the club this code creates is already taken. Reach out for a new code."],
  not_authenticated:   ["Sign-in didn't stick.",         "Click the magic link again from your email, or start over."],
  unsupported_prefix:  ["That code type isn't ready.",   "This flow doesn't support this kind of code yet."],
};

export default function CodeFinish() {
  const [phase, setPhase] = useState('waiting-for-session'); // waiting-for-session | consent | redeeming | redirecting | error
  const [error, setError] = useState(null);
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(EMPTY_CONSENT);
  const [busy, setBusy] = useState(false);

  // Stage 1: wait for the session from the magic-link callback.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = readCodeFromQuery();
      if (!c) {
        if (!cancelled) { setError('missing_code'); setPhase('error'); }
        return;
      }
      setCode(c);

      let session = null;
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) { session = data.session; break; }
        await new Promise(r => setTimeout(r, 150));
      }
      if (cancelled) return;
      if (!session) {
        setError('not_authenticated');
        setPhase('error');
        return;
      }

      setPhase('consent');
    })();
    return () => { cancelled = true; };
  }, []);

  // Stage 2: user accepts consents → record them → redeem.
  const acceptAndRedeem = async () => {
    if (!isConsentValid(consent) || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Required consents — server-side RPC handles person resolution.
      const calls = [
        { p_consent_type: 'terms_and_privacy', p_consent_value: true,                       p_consent_text: CONSENT_TEXT.terms_and_privacy, p_terms_version: CURRENT_TERMS_VERSION, p_privacy_version: CURRENT_PRIVACY_VERSION },
        { p_consent_type: 'age_18_plus',       p_consent_value: true,                       p_consent_text: CONSENT_TEXT.age_18_plus },
        { p_consent_type: 'email_marketing',   p_consent_value: !!consent.emailMarketing,   p_consent_text: CONSENT_TEXT.email_marketing },
        // SMS is intentionally not written here — we have no phone on
        // file from the CodeLanding step. User can opt in from Settings
        // once they add a phone.
      ];
      for (const args of calls) {
        const { error: rpcErr } = await supabase.rpc('record_consent', {
          p_source: 'registration',
          p_club_id: null,
          ...args,
        });
        if (rpcErr) {
          // record_consent fails if there's no people row for the auth
          // user yet — for a brand-new C-code creator, the person row
          // is created during redemption. We tolerate that case by
          // letting the redeem step run, then re-trying consents after.
          // For other errors, log and continue — the redemption itself
          // is the more critical step.
          console.warn('[CodeFinish] record_consent (pre-redeem) failed:', rpcErr.message);
        }
      }

      // Now run the redemption.
      setPhase('redeeming');
      const { data, error: fnErr } = await supabase.functions.invoke('redeem-code', {
        body: { stage: 'consume', code },
      });
      if (fnErr) {
        setError(fnErr.message || 'network_error');
        setPhase('error');
        setBusy(false);
        return;
      }
      if (!data?.ok) {
        setError(data?.error || 'unknown');
        setPhase('error');
        setBusy(false);
        return;
      }

      // Best-effort retry of consent writes for the brand-new-person case
      // (C-code first-time creator). The redeem step will have ensured a
      // people row exists by now.
      for (const args of calls) {
        await supabase.rpc('record_consent', {
          p_source: 'registration',
          p_club_id: null,
          ...args,
        }).then(({ error: e }) => {
          if (e) console.warn('[CodeFinish] record_consent (post-redeem retry) skipped:', e.message);
        });
      }

      setPhase('redirecting');
      setTimeout(() => {
        window.location.href = data.redirect;
      }, 800);
    } catch (e) {
      setError(e?.message || 'unknown');
      setPhase('error');
      setBusy(false);
    }
  };

  const decline = async () => {
    await supabase.auth.signOut();
    window.location.href = '/code';
  };

  const titleColor = '#F2EDE0';

  if (phase === 'waiting-for-session') {
    return (
      <SimpleHero
        title="Setting up your access"
        subtitle="One moment…"
      />
    );
  }

  if (phase === 'consent') {
    return (
      <div style={{ minHeight: '100vh', background: G.bg, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 'env(safe-area-inset-top, 0)', background: G.green }} />
        <div style={{ background: G.green, padding: '20px 24px 22px', textAlign: 'center' }}>
          <img
            src="/grounds-icon.png"
            alt={PLATFORM_NAME}
            style={{ width: 56, height: 56, borderRadius: 12, boxShadow: '0 4px 14px rgba(0,0,0,0.25)', marginBottom: 12 }}
          />
          <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 22, color: titleColor, margin: '0 0 4px', fontWeight: 700 }}>
            One more step
          </h1>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: '#A8D8B8', margin: 0 }}>
            Confirm the items below to finish setup.
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px 18px', maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <ConsentCheckboxes
            values={consent}
            onChange={setConsent}
            hasPhone={false}
          />

          {error && (
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: '8px 0 0' }}>
              {error}
            </p>
          )}
        </div>

        <div style={{ flexShrink: 0, padding: '12px 22px max(16px, calc(env(safe-area-inset-bottom) + 10px))', borderTop: `1px solid ${G.border}`, background: G.bg }}>
          <button
            type="button"
            onClick={acceptAndRedeem}
            disabled={!isConsentValid(consent) || busy}
            style={{
              width: '100%',
              padding: 14,
              background: (isConsentValid(consent) && !busy) ? G.green : G.muted,
              border: 'none',
              borderRadius: 4,
              cursor: (isConsentValid(consent) && !busy) ? 'pointer' : 'not-allowed',
              fontFamily: '"Lora",serif',
              fontSize: 14,
              color: '#F2EDE0',
              fontWeight: 500,
              opacity: (isConsentValid(consent) && !busy) ? 1 : 0.65,
            }}
          >
            {busy ? 'Finishing…' : 'I agree — finish setup'}
          </button>
          <div onClick={busy ? undefined : decline} data-tap style={{ padding: '12px 8px 4px', textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, textDecoration: 'underline', textUnderlineOffset: 2 }}>
              Decline and start over
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'redeeming') {
    return (
      <SimpleHero
        title="Almost there"
        subtitle="Finalizing your access…"
      />
    );
  }

  if (phase === 'redirecting') {
    return (
      <div style={{ minHeight: '100vh', background: G.green, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, marginBottom: 18, borderRadius: '50%', background: G.brass, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1A180F" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, color: titleColor, margin: '0 0 6px', fontWeight: 700 }}>
          You&rsquo;re in
        </h1>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: '#A8D8B8', margin: 0 }}>
          Taking you to your club…
        </p>
      </div>
    );
  }

  // Error phase
  const [heading, body] = ERROR_COPY[error] || ["Something went wrong.", "Try starting over from the code page."];

  return (
    <div style={{ minHeight: '100vh', background: G.green, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, marginBottom: 18, borderRadius: '50%', background: 'rgba(220,90,80,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1A180F" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
      <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, color: titleColor, margin: '0 0 8px', fontWeight: 700, maxWidth: 360 }}>
        {heading}
      </h1>
      <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: 'rgba(242,237,224,0.75)', margin: '0 0 22px', lineHeight: 1.55, maxWidth: 360 }}>
        {body}
      </p>
      <a
        href="/code"
        style={{
          padding: '12px 22px', background: G.brass, borderRadius: 4,
          textDecoration: 'none',
          fontFamily: '"Lora",serif', fontSize: 13, fontWeight: 600,
          color: '#1A180F', letterSpacing: '0.06em',
        }}
      >
        Start over
      </a>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10, color: 'rgba(242,237,224,0.35)', margin: '20px 0 0', letterSpacing: '0.08em' }}>
        Code error: {error}
      </p>
    </div>
  );
}

function SimpleHero({ title, subtitle }) {
  const titleColor = '#F2EDE0';
  return (
    <div style={{ minHeight: '100vh', background: G.green, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <img
        src="/grounds-icon.png"
        alt={PLATFORM_NAME}
        style={{ width: 72, height: 72, borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', marginBottom: 22 }}
      />
      <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, color: titleColor, margin: '0 0 6px', fontWeight: 700 }}>
        {title}
      </h1>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: '#A8D8B8', margin: 0 }}>
        {subtitle}
      </p>
    </div>
  );
}
