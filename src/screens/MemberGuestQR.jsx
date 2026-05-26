// MemberGuestQR — member-facing screen displaying the member's
// personal guest check-in QR code. v0.8.3 (Phase 8).
//
// Reached from:
//   · MyClub → Membership Card → "Guest Check-In QR" button (v0.8.3)
//   · Settings → Profile section → "Your Guest QR" row (v0.8.3)
//
// The QR encodes a signed URL of the form:
//   https://<club-slug>.groundslive.com/guest/<club-slug>?ref=<token>&via=member_qr
//
// where <token> = `<member_id>.<HMAC-SHA256(secret, club_id:member_id)>`.
// The signature is generated server-side by the guest-qr-token Edge
// Function; clients never see the signing secret. When a guest scans
// the QR, they land on the public registration page with their
// referring_member_id auto-attributed AFTER server-side signature
// validation.
//
// Members can also tap "Share" to copy/share the URL via the OS share
// sheet (Web Share API) or fall back to clipboard. Useful for texting
// or emailing the invite when scanning isn't practical.
import { useEffect, useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { supabase } from '../lib/supabase.js';
import { QRCodeSVG } from 'qrcode.react';
import FeatureOff from '../components/FeatureOff.jsx';

export default function MemberGuestQR() {
  const { member, club, isGuest } = useAuth();
  const guestFlagOn = useFlag('guest_registration');
  const [url, setUrl]     = useState(null);
  const [token, setToken] = useState(null);
  const [busy, setBusy]   = useState(true);
  const [err, setErr]     = useState(null);
  const [copied, setCopied] = useState(false);

  // Mint the signed URL on mount. We don't cache because the signing
  // secret could be rotated at the platform level; freshly minted is
  // always correct.
  useEffect(() => {
    if (!member?.id) { setBusy(false); return; }
    let cancelled = false;
    (async () => {
      setBusy(true); setErr(null);
      try {
        const { data, error } = await supabase.functions.invoke('guest-qr-token', { body: {} });
        if (cancelled) return;
        if (error || !data?.ok) {
          setErr(data?.error || error?.message || 'Could not generate your QR code.');
          setBusy(false);
          return;
        }
        setUrl(data.url);
        setToken(data.token);
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Network error.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [member?.id]);

  // v0.8.3 gates:
  //   - Feature flag off at this club → FeatureOff
  //   - Guest somehow lands here → FeatureOff (only members invite guests)
  //   - No member row (e.g. pending claim) → friendly fallback inside
  if (!guestFlagOn) {
    return <FeatureOff label="Guest Check-In QR" body="Your club hasn't enabled guest registration." />;
  }
  if (isGuest) {
    return <FeatureOff label="Guest Check-In QR" body="Only members can invite guests." />;
  }

  const share = async () => {
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${club?.name || 'My club'} guest invitation`,
          text: `You're invited as my guest at ${club?.name || 'the club'}. Tap to check in:`,
          url,
        });
        return;
      }
    } catch (_) { /* user cancelled or share failed — fall through to copy */ }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      setErr('Could not copy the link. Long-press the URL below to copy manually.');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Guest Check-In QR" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 36px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, textAlign: 'center', margin: '0 0 18px', maxWidth: 320, lineHeight: 1.55 }}>
          Show this to your guest at the gate or pro shop. When scanned, it opens a quick registration form pre-filled with your name as the host.
        </p>

        {busy && (
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '40px 0' }}>Generating your QR…</p>
        )}

        {!busy && err && (
          <div style={{ padding: '12px 16px', background: 'rgba(167,67,55,0.10)', border: `1px solid ${G.clsDot}`, borderRadius: 4, maxWidth: 320 }}>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: 0, textAlign: 'center' }}>{err}</p>
          </div>
        )}

        {!busy && url && (
          <>
            {/* High-contrast QR — black on white, level M error correction.
                240px is big enough to scan from a phone screen held at
                arm's length even with mild reflections. */}
            <div style={{ background: '#ffffff', padding: 14, borderRadius: 8, border: `1px solid ${G.border}`, marginBottom: 18 }}>
              <QRCodeSVG value={url} size={240} bgColor="#ffffff" fgColor="#000000" level="M" marginSize={0} />
            </div>

            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 4px', textAlign: 'center' }}>
              {member?.name ? `${member.name.split(' ')[0]}'s guest invite` : 'Guest invite'}
            </p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 16px', textAlign: 'center' }}>
              for {club?.name || 'the club'}
            </p>

            {/* Share + copy fallback — useful when the guest isn't
                in scanning range, or for sending a text invite ahead. */}
            <div onClick={share} data-tap style={{ padding: '10px 22px', background: G.green, borderRadius: 4, cursor: 'pointer', marginBottom: 14 }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>
                {copied ? '✓ Link copied' : 'Share link'}
              </span>
            </div>

            <p
              style={{ fontFamily: 'monospace', fontSize: 10, color: G.muted, margin: '0 0 4px', textAlign: 'center', wordBreak: 'break-all', maxWidth: 320, lineHeight: 1.5, padding: '8px 12px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4 }}
              onClick={() => navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); })}
            >
              {url}
            </p>

            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10, color: G.muted, margin: '14px 0 0', textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
              The link is uniquely tied to your account. Guests who register through it appear in the club's records as your guests.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
