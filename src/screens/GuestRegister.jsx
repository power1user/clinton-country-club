// GuestRegister — public-facing branded landing for guest QR scans.
// v0.8.1 (Phase 8).
//
// URL: groundslive.com/guest/<club-slug>   OR
//      <club-slug>.groundslive.com/guest/<club-slug>
// (both resolve to the same screen via resolveClubSlug in lib/supabase.js)
//
// Query params:
//   ?ref=<member_id>   — referring member (member-scanned QR). v0.8.3
//                         will validate this as a signed token; for
//                         v0.8.1 the Edge Function accepts the raw uuid
//                         since the only thing it gates is which member
//                         shows up on the admin guest list "brought by"
//                         column. Guest access itself is still tightly
//                         scoped by club + time + access_level.
//   ?via=member_qr|clubhouse_qr  — explicit visit-type signal. Defaults
//                         to member_qr when ?ref is present, clubhouse_qr
//                         otherwise.
//
// Flow:
//   1. Page loads — branded with club logo + colors via useBrand.
//   2. Guest fills the form (name + email + zip always; phone per club
//      config; ToU checkbox).
//   3. Submit → calls the public guest-register Edge Function which
//      writes the guests row + guest_visits row via service role.
//   4. On Edge Function success, client calls supabase.auth.signInWithOtp
//      with the captured email — Supabase sends a magic link.
//   5. UI flips to the "check your email" success state.
//   6. (Out of scope for v0.8.1) When guest clicks the magic link, they
//      land at the app root with a session; v0.8.2 wires up the
//      link-the-guest-to-this-auth-user step there.
//
// Rendering for clubs that haven't enabled guest_registration:
//   The Edge Function returns 403 in that case; we surface the message
//   inline below the form. We do NOT proactively check the flag on
//   page load because the Auth provider hasn't loaded the club row at
//   that point on a fresh tab (no session yet) — the Edge Function is
//   the source of truth.

import { useState } from 'react';
import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useBrand } from '../hooks/useBrand.jsx';
import { usePWAInstall } from '../hooks/usePWAInstall.js';
import { supabase, CLUB_SLUG } from '../lib/supabase.js';
import { PLATFORM_NAME } from '../lib/version.js';

// Parse the URL params once at module load (the page is a single-load
// surface — guests don't navigate within it).
function readQuery() {
  if (typeof window === 'undefined') return { ref: null, clubhouseToken: null, via: 'clubhouse_qr' };
  const sp = new URLSearchParams(window.location.search);
  const ref = sp.get('ref');
  const clubhouseToken = sp.get('token');  // v0.8.4 clubhouse QR
  const via = sp.get('via') || (ref ? 'member_qr' : (clubhouseToken ? 'clubhouse_qr' : 'clubhouse_qr'));
  return { ref, clubhouseToken, via };
}

export default function GuestRegister() {
  const { club } = useAuth();
  const brand = useBrand();
  const { ref, clubhouseToken, via } = readQuery();
  // v0.8.8: PWA install gate. When clubs.guest_pwa_required is true,
  // we render an "install the app first" panel above the form and
  // disable submit until the page is running standalone. Once the
  // guest installs and opens the installed PWA at /guest/<slug>,
  // isStandalone flips true and the form unlocks.
  const { canInstall, install, isStandalone, isIOSSafari } = usePWAInstall();
  const [pwaBusy, setPwaBusy] = useState(false);

  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [zip, setZip]         = useState('');
  const [accept, setAccept]   = useState(false);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Phone field configuration comes from the club row. While the club
  // is still loading we render the form without the phone field; if
  // the club requires phone, the Edge Function will reject and we'll
  // surface the error.
  const phoneSetting   = club?.guest_phone_collection || 'off';
  const showPhone      = phoneSetting !== 'off';
  const phoneRequired  = phoneSetting === 'required';

  // v0.8.8: PWA install requirement. When the club has flipped it on,
  // the form is locked until the registration page is running as a
  // standalone PWA (i.e. the guest has installed and re-opened from
  // their home screen). When the club hasn't required PWA, this is
  // always true and the form behaves like before.
  const pwaRequired       = !!club?.guest_pwa_required;
  const pwaRequirementMet = !pwaRequired || isStandalone;

  const formValid =
    pwaRequirementMet &&
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    zip.trim().length >= 5 &&
    accept &&
    (!phoneRequired || phone.trim().length >= 5);

  const handleInstall = async () => {
    if (pwaBusy) return;
    setPwaBusy(true);
    try { await install(); } finally { setPwaBusy(false); }
  };

  const submit = async () => {
    if (!formValid || busy) return;
    setBusy(true); setErr(null);
    try {
      // 1. Record the guest server-side.
      // v0.8.3: signed-token QRs send `ref` as `<member_id>.<sig>`. We
      // forward it as `ref_token` so the Edge Function can validate
      // the signature server-side. The Edge Function ALSO still
      // accepts the legacy `referring_member_id` (raw uuid) so old
      // QR codes minted before signing rolled out keep working —
      // remove that fallback after rotating member QRs.
      const isSignedToken = typeof ref === 'string' && ref.includes('.');
      // v0.9.18: the Edge Function now sends the magic link itself
      // (writes the guests row FIRST with status='pending_authentication',
      // then calls signInWithOtp). Client no longer fires signInWithOtp —
      // that double-call could leave an auth.users row orphaned without
      // a matching guests row when the function failed mid-flow.
      const { data, error } = await supabase.functions.invoke('guest-register', {
        body: {
          club_slug: CLUB_SLUG,
          name: name.trim(),
          email: email.trim(),
          phone: showPhone ? phone.trim() : null,
          zip: zip.trim(),
          ref_token: isSignedToken ? ref : null,
          referring_member_id: isSignedToken ? null : ref,
          clubhouse_token: clubhouseToken || null,
          visit_type: via === 'member_qr' ? 'member_guest' : 'public_play',
          check_in_method: via === 'member_qr' ? 'member_qr' : 'clubhouse_qr',
          redirect_to: `${window.location.origin}/`,
        },
      });
      if (error || !data?.ok) {
        setErr(data?.error || error?.message || 'Registration failed. Please try again.');
        setBusy(false);
        return;
      }
      // If the OTP send failed on the server side, the registration
      // is still recorded — staff will see it in People and can
      // reach out manually. Show a softer message but still confirm.
      if (data?.ok && data?.otp_sent === false) {
        setErr(`We've recorded your registration, but couldn't send the access email automatically: ${data.otp_error || 'unknown error'}. ${club?.name || 'The club'} will reach out shortly.`);
        setSubmitted(true);
        setBusy(false);
        return;
      }
      setSubmitted(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ─── Layout ──────────────────────────────────────────────────────
  if (!club) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: G.green, padding: 32, minHeight: '100vh' }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', color: '#A8D8B8', fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', background: G.bg, minHeight: '100vh' }}>
      {/* Branded hero — green band with club logo + name. Matches the
          Login splash treatment so guests immediately know they're
          at the right club. */}
      <div style={{ background: G.green, padding: '36px 24px 28px', textAlign: 'center', flexShrink: 0 }}>
        {club.logo_url && (
          <img src={club.logo_url} alt={`${club.name} logo`} style={{ maxHeight: 64, maxWidth: 200, marginBottom: 14, objectFit: 'contain' }} />
        )}
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 10, color: '#A8D8B8', letterSpacing: '0.24em', textTransform: 'uppercase', margin: '0 0 6px' }}>
          {brand.prefix || club.slug}
        </p>
        <h1 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 28, fontWeight: 700, color: '#F2EDE0', margin: '0 0 6px', lineHeight: 1.15 }}>
          {club.name}
        </h1>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: '#A8D8B8', margin: 0 }}>
          Guest Check-In
        </p>
      </div>

      {submitted ? (
        <SuccessState email={email} clubName={club.name} />
      ) : (
        <div style={{ flex: 1, padding: '24px 22px 36px', maxWidth: 460, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, lineHeight: 1.6, margin: '0 0 18px' }}>
            {via === 'member_qr'
              ? <>Welcome! A member of {club.name} invited you. Fill out the quick form below and we'll email you a one-tap access link.</>
              : <>Welcome to {club.name}! Check in below and we'll email you a one-tap access link.</>}
          </p>

          {/* v0.8.8: PWA install gate. Renders when the club requires
              install + the page isn't already running standalone.
              iOS gets explicit instructions; Android Chrome / Edge get
              the native install prompt. The form below renders but is
              locked (formValid stays false until isStandalone flips). */}
          {pwaRequired && !isStandalone && (
            <div style={{ background: G.card, border: `1.5px solid ${G.brass}`, borderRadius: 6, padding: '14px 16px', marginBottom: 18 }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 6px' }}>Install the {club.name} app first</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
                {club.name} requires guests to use the installed app rather than the mobile browser. It only takes a few seconds and you'll skip the install step on future visits.
              </p>
              {isIOSSafari ? (
                <ol style={{ margin: 0, paddingLeft: 20, fontFamily: '"Lora",serif', fontSize: 12, color: G.text, lineHeight: 1.6 }}>
                  <li>Tap the <strong>Share</strong> icon in Safari's bottom bar.</li>
                  <li>Scroll down → <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> in the top corner.</li>
                  <li>Open the new app icon and you'll come right back here.</li>
                </ol>
              ) : canInstall ? (
                <div onClick={handleInstall} data-tap style={{ display: 'inline-block', padding: '10px 18px', background: G.green, borderRadius: 3, cursor: pwaBusy ? 'wait' : 'pointer' }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>
                    {pwaBusy ? 'Installing…' : 'Install the app'}
                  </span>
                </div>
              ) : (
                <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: 0 }}>
                  Your browser doesn't support installing as an app. Try Chrome, Edge, or Safari on iPhone to register as a guest. Or ask club staff to register you in person.
                </p>
              )}
            </div>
          )}

          <Field label="Full name" required>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="First Last" style={inputStyle} autoComplete="name" />
          </Field>
          <Field label="Email" required>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={inputStyle} autoComplete="email" inputMode="email" />
          </Field>
          {showPhone && (
            <Field label="Phone" required={phoneRequired} hint={phoneRequired ? null : '(optional)'}>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="(555) 123-4567" style={inputStyle} autoComplete="tel" inputMode="tel" />
            </Field>
          )}
          <Field label="Home ZIP / postal code" required>
            <input value={zip} onChange={e => setZip(e.target.value)} placeholder="60010" style={inputStyle} autoComplete="postal-code" inputMode="text" />
          </Field>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 0 18px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={accept}
              onChange={e => setAccept(e.target.checked)}
              style={{ marginTop: 3, flexShrink: 0 }}
            />
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, lineHeight: 1.55 }}>
              I agree to the club's terms of use and acknowledge that guest access is time-limited and may be revoked by club staff at any time.
            </span>
          </label>

          {err && (
            <div style={{ padding: '10px 14px', marginBottom: 12, background: 'rgba(167,67,55,0.10)', border: `1px solid ${G.clsDot}`, borderRadius: 4 }}>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: 0 }}>{err}</p>
            </div>
          )}

          <div
            onClick={formValid && !busy ? submit : undefined}
            data-tap
            style={{
              padding: '14px',
              background: formValid && !busy ? G.green : G.border,
              borderRadius: 4,
              textAlign: 'center',
              cursor: formValid && !busy ? 'pointer' : 'not-allowed',
            }}
          >
            <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: formValid && !busy ? '#F2EDE0' : G.muted, fontWeight: 500 }}>
              {busy ? 'Sending…' :
                (pwaRequired && !isStandalone) ? 'Install the app to continue' :
                'Send Access Link'}
            </span>
          </div>

          {/* Footer attribution — same treatment as the MyClub footer.
              v0.8.6: small Grounds mark inline with the text. */}
          <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <img src="/grounds-mark.png" alt="" style={{ width: 16, height: 16, opacity: 0.85 }} />
            <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
              Powered by {PLATFORM_NAME}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────

function Field({ label, required, hint, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 5, fontWeight: 700 }}>
        <span>{label}{required && <span style={{ color: G.clsDot }}> *</span>}</span>
        {hint && <span style={{ fontStyle: 'italic', fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', fontSize: 10, color: G.muted }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function SuccessState({ email, clubName }) {
  return (
    <div style={{ flex: 1, padding: '36px 24px', maxWidth: 460, margin: '0 auto', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: G.openBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={G.openDot} strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      </div>
      <h2 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 22, fontWeight: 700, color: G.text, margin: '0 0 12px', lineHeight: 1.2 }}>Check your email</h2>
      <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, lineHeight: 1.6, margin: '0 0 12px' }}>
        We sent a one-tap access link to <strong>{email}</strong>. Open the email on this device and tap the link to enter the {clubName} app.
      </p>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, lineHeight: 1.55, margin: 0 }}>
        The link expires in an hour. If you don't see it within a minute or two, check your spam folder or try registering again with the same email.
      </p>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  border: `1px solid ${G.border}`,
  borderRadius: 4,
  fontFamily: '"Lora",serif',
  fontSize: 16,            // 16px to suppress iOS auto-zoom on focus
  color: G.text,
  background: '#F8F4EC',
  outline: 'none',
  boxSizing: 'border-box',
};
