// CodeFinish — magic-link landing for the QR onboarding flow.
// Phase 19, v0.17.0.
//
// URL: groundslive.com/code/finish?code=<code>
//
// When a user clicks the magic link from the redeem-code Edge Function,
// they land here with an authenticated Supabase session. This component:
//   1. Reads the code from the query string
//   2. Confirms a session exists (otherwise: "link expired, start over")
//   3. Calls the redeem-code Edge Function with stage='consume'
//   4. On success: redirects to the returned club URL (e.g. <slug>.groundslive.com/)
//   5. On error: shows a friendly message with a "start over" link
//
// This is the only place where the actual provisioning (new club creation
// or member join) happens. Everything before this point was just signing
// in to confirm the user owns the email.

import { useEffect, useState } from 'react';
import { G } from '../theme.js';
import { supabase } from '../lib/supabase.js';

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
  const [phase, setPhase] = useState('checking'); // checking | redirecting | error
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const code = readCodeFromQuery();
      if (!code) {
        if (!cancelled) { setError('missing_code'); setPhase('error'); }
        return;
      }

      // Wait briefly for Supabase to ingest the magic-link tokens.
      // The detect-session-in-URL flow happens on auth init; on a fresh
      // page load from clicking a magic link, the session should be
      // available almost immediately.
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

      // Hit the consume endpoint
      const { data, error: fnErr } = await supabase.functions.invoke('redeem-code', {
        body: { stage: 'consume', code },
      });
      if (cancelled) return;
      if (fnErr) {
        setError(fnErr.message || 'network_error');
        setPhase('error');
        return;
      }
      if (!data?.ok) {
        setError(data?.error || 'unknown');
        setPhase('error');
        return;
      }

      // Success — navigate to the new club's URL.
      setPhase('redirecting');
      // Small delay so the user sees the success state
      setTimeout(() => {
        if (cancelled) return;
        window.location.href = data.redirect;
      }, 800);
    };

    run();
    return () => { cancelled = true; };
  }, []);

  const titleColor = '#F2EDE0';

  if (phase === 'checking') {
    return (
      <div style={{ minHeight: '100vh', background: G.green, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <img
          src="/grounds-icon.png"
          alt="The Grounds"
          style={{ width: 72, height: 72, borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', marginBottom: 22 }}
        />
        <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, color: titleColor, margin: '0 0 6px', fontWeight: 700 }}>
          Setting up your access
        </h1>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: '#A8D8B8', margin: 0 }}>
          One moment…
        </p>
      </div>
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
          You're in
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
