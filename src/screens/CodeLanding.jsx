// CodeLanding — public-facing landing for the universal QR onboarding
// flow (Phase 19, v0.17.0).
//
// URL: groundslive.com/code             — generic pitch (sales prospects)
//      groundslive.com/code?c=<slug>    — club-branded pitch (member prospects)
//      <slug>.groundslive.com/code      — same as ?c=<slug> (slug implied)
//
// The QR on a golf ball / business card / printed material points here.
// The visitor enters a code (e.g. C-70332 or J-28052) plus their email,
// hits Submit, gets a magic link in their inbox. Clicking the magic link
// lands them at /code/finish (CodeFinish.jsx) which completes the redemption.
//
// The QR itself carries ZERO secret. The code is the credential and is
// given separately (in a meeting, on the back of a card, posted at the
// clubhouse, etc.).

import { useState, useEffect } from 'react';
import { G } from '../theme.js';
import { supabase, CLUB_SLUG } from '../lib/supabase.js';

const PITCH_GENERIC = {
  eyebrow: 'The Grounds',
  title: 'Welcome',
  body: "A country-club platform built for clubs that want their own member experience. Have a code from someone at a club? Enter it below.",
};

function PitchForClub(club) {
  return {
    eyebrow: 'Welcome to',
    title: club.name,
    body: 'Course status, tee times, food orders, news, and the member directory — all in one place. Enter your access code below to set up your account.',
  };
}

function readQueryClubSlug() {
  try {
    const url = new URL(window.location.href);
    const c = (url.searchParams.get('c') || '').trim().toLowerCase();
    if (c) return c;
  } catch { /* */ }
  // If we're already on a club subdomain, use that as the implicit slug
  // (so visiting clinton.groundslive.com/code shows Clinton's brand).
  if (CLUB_SLUG && CLUB_SLUG !== 'groundslive') return CLUB_SLUG;
  return null;
}

export default function CodeLanding() {
  const initialSlug = readQueryClubSlug();
  const [brand, setBrand] = useState(null);          // { name, slug, logo_url, ... } | null
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  // Look up the club's brand if we have a slug context
  useEffect(() => {
    if (!initialSlug) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc('get_public_club_brand', { p_slug: initialSlug });
      if (!cancelled && Array.isArray(data) && data.length > 0) {
        setBrand(data[0]);
      }
    })();
    return () => { cancelled = true; };
  }, [initialSlug]);

  const pitch = brand ? PitchForClub(brand) : PITCH_GENERIC;

  const onCodeChange = (e) => {
    // Auto-uppercase, allow only A-Z, 0-9, and dash. Auto-insert the
    // dash after the prefix letter so users don't have to think.
    let v = (e.target.value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (v.length === 1 && /[CJSG]/.test(v) && !v.includes('-')) v = v + '-';
    if (v.length > 7) v = v.slice(0, 7); // X-XXXXX = 7 chars
    setCode(v);
  };

  const submit = async () => {
    setError(null);
    if (!/^[CJSG]-\d{5}$/.test(code)) {
      setError('Code should look like C-12345 or J-12345.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email.');
      return;
    }
    setBusy(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('redeem-code', {
        body: { stage: 'request', code: code.trim(), email: email.trim() },
      });
      if (fnErr) {
        setError(fnErr.message || 'Could not send. Try again.');
        return;
      }
      if (!data?.ok) {
        setError(data?.error || 'Could not validate code.');
        return;
      }
      setSent(true);
    } catch (e) {
      setError(e?.message || 'Network error.');
    } finally {
      setBusy(false);
    }
  };

  // Color theming: if we have club brand, use their colors; otherwise
  // fall back to The Grounds palette.
  const primaryBg = brand?.primary_color || G.green;
  const accentBg  = brand?.accent_color  || G.brass;
  const titleColor = '#F2EDE0';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: primaryBg }}>
      {/* Status-bar safe-area padding (top) */}
      <div style={{ height: 'env(safe-area-inset-top, 0)' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '28px 24px' }}>
        {/* Logo / brand */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img
            src={brand?.logo_url || '/grounds-icon.png'}
            alt={brand?.name || 'The Grounds'}
            style={{ width: 72, height: 72, borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', objectFit: 'cover' }}
          />
        </div>

        {/* Pitch */}
        <div style={{ textAlign: 'center', maxWidth: 380, margin: '0 auto', marginBottom: 28 }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: accentBg, letterSpacing: '0.22em', textTransform: 'uppercase', margin: '0 0 6px', fontWeight: 600 }}>
            {pitch.eyebrow}
          </p>
          <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 30, fontWeight: 700, color: titleColor, margin: '0 0 12px', lineHeight: 1.15 }}>
            {pitch.title}
          </h1>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: 'rgba(242,237,224,0.85)', lineHeight: 1.55, margin: 0 }}>
            {pitch.body}
          </p>
        </div>

        {/* Form OR success state */}
        {!sent ? (
          <div style={{ maxWidth: 360, width: '100%', margin: '0 auto', background: 'rgba(0,0,0,0.18)', padding: 20, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            <label style={{ display: 'block', fontFamily: '"Lora",serif', fontSize: 11, color: 'rgba(242,237,224,0.65)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
              Access code
            </label>
            <input
              value={code}
              onChange={onCodeChange}
              placeholder="X-12345"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 14px',
                fontFamily: '"Lora",serif', fontSize: 18, fontWeight: 600,
                background: 'rgba(255,255,255,0.95)', color: '#1A180F',
                border: 'none', borderRadius: 4,
                letterSpacing: '0.10em',
                marginBottom: 14,
              }}
            />
            <label style={{ display: 'block', fontFamily: '"Lora",serif', fontSize: 11, color: 'rgba(242,237,224,0.65)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>
              Your email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 14px',
                fontFamily: '"Lora",serif', fontSize: 14,
                background: 'rgba(255,255,255,0.95)', color: '#1A180F',
                border: 'none', borderRadius: 4,
                marginBottom: 16,
              }}
            />

            {error && (
              <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F8C4B0', margin: '0 0 12px' }}>
                {error}
              </p>
            )}

            <div
              onClick={busy ? undefined : submit}
              data-tap
              style={{
                padding: 14, background: accentBg, borderRadius: 4,
                textAlign: 'center', cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.6 : 1,
                fontFamily: '"Lora",serif', fontSize: 14, fontWeight: 600,
                color: '#1A180F', letterSpacing: '0.06em',
              }}
            >
              {busy ? 'Sending…' : 'Send my magic link'}
            </div>

            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: 'rgba(242,237,224,0.5)', margin: '12px 0 0', textAlign: 'center' }}>
              Don't have a code? Ask the person who shared this with you.
            </p>
          </div>
        ) : (
          <div style={{ maxWidth: 360, width: '100%', margin: '0 auto', background: 'rgba(0,0,0,0.18)', padding: 26, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: '50%', background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1A180F" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 22, color: titleColor, margin: '0 0 8px' }}>
              Check your email
            </h2>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: 'rgba(242,237,224,0.85)', lineHeight: 1.5, margin: '0 0 4px' }}>
              We sent a magic link to <strong style={{ color: titleColor }}>{email}</strong>.
            </p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: 'rgba(242,237,224,0.65)', lineHeight: 1.5, margin: '8px 0 0' }}>
              Click the link to finish setup. The link works for a few minutes.
            </p>
          </div>
        )}
      </div>

      {/* Footer attribution */}
      <div style={{ padding: '0 24px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10, color: 'rgba(242,237,224,0.4)', margin: 0, letterSpacing: '0.08em' }}>
          Powered by The Grounds
        </p>
      </div>
    </div>
  );
}
