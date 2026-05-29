// Support — v0.10.14.
//
// Reachable from Settings → Help & Support. Two destinations + an
// FAQ accordion:
//   · Contact Support (mailto:support@groundslive.com with prefilled
//     subject so the platform support team sees which club the
//     request came from at a glance)
//   · Contact Your Club (phone + email from clubs row; falls back
//     to "not configured" muted text when the club hasn't set them)
//
// FAQ content lives in src/lib/supportFaq.js for easy editing without
// touching this file.
//
// IMPORTANT — operational pre-req: Cloudflare Email Routing for
// support@groundslive.com must be set up and verified before this
// screen ships externally. Without it, every mailto bounces and the
// support promise is broken.

import { useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { VERSION } from '../lib/version.js';
import { SUPPORT_FAQ } from '../lib/supportFaq.js';

const PLATFORM_SUPPORT_EMAIL = 'support@groundslive.com';

// Build the mailto with a club-aware subject + a small diagnostic
// footer in the body. No PII (no name, email, membership number) —
// just version + club so the platform team can route quickly.
function buildSupportMailto(clubName) {
  const subject = encodeURIComponent(`Support Request from ${clubName || 'a club'}`);
  const body = encodeURIComponent(
    `\n\n— — — — —\nApp version: v${VERSION}\nClub: ${clubName || '(unknown)'}\n(Replace this header with your question — the support team will see it.)`
  );
  return `mailto:${PLATFORM_SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

export default function Support() {
  const { club } = useAuth();
  const [openIdx, setOpenIdx] = useState(null);

  const clubName = club?.name || 'your club';
  const clubPhone = club?.contact_phone;
  const clubEmail = club?.contact_email;
  const hasClubContact = !!(clubPhone || clubEmail);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Help & Support" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px' }}>
        {/* ─── FAQ accordion at top so members can self-serve before
            reaching for support. Each row is collapsed by default. */}
        <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 700 }}>
          Common questions
        </p>
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden', marginBottom: 22 }}>
          {SUPPORT_FAQ.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${G.border}` }}>
                <div
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  data-tap
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', cursor: 'pointer' }}
                >
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0, flex: 1, minWidth: 0 }}>
                    {item.q}
                  </p>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"
                    style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s', flexShrink: 0 }}
                  ><path d="M9 18l6-6-6-6" /></svg>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 14px 14px', background: G.bg }}>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, lineHeight: 1.65, margin: 0 }}>
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ─── Contact Support — platform-level path, opens device
            mail client with a prefilled subject. mailto: works on
            every device including PWAs without an extra deps. */}
        <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 700 }}>
          Get help
        </p>

        <a
          href={buildSupportMailto(clubName)}
          style={{ display: 'block', textDecoration: 'none', marginBottom: 10 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, cursor: 'pointer' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0 }}>Contact Support</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0', lineHeight: 1.4 }}>
                App questions, bugs, feature requests. Opens your email app.
              </p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" /></svg>
          </div>
        </a>

        {/* ─── Contact Your Club — uses the club's stored contact info.
            Renders disabled-state copy if the club hasn't set phone/
            email yet so we don't dump a "mailto:" link that goes
            nowhere. */}
        {hasClubContact ? (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px 8px', borderBottom: `1px solid ${G.border}` }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0 }}>Contact Your Club</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0', lineHeight: 1.4 }}>
                Club-specific questions, RSVPs, billing, dining reservations.
              </p>
            </div>
            {clubPhone && (
              <a href={`tel:${clubPhone}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', textDecoration: 'none', borderBottom: clubEmail ? `1px solid ${G.border}` : 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, flex: 1 }}>Call the clubhouse</span>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.brass }}>{clubPhone}</span>
              </a>
            )}
            {clubEmail && (
              <a href={`mailto:${clubEmail}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', textDecoration: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, flex: 1 }}>Email the clubhouse</span>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.brass, textDecoration: 'underline', textUnderlineOffset: 2 }}>{clubEmail}</span>
              </a>
            )}
          </div>
        ) : (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, padding: '14px 16px' }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 4px' }}>Contact Your Club</p>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0, lineHeight: 1.5 }}>
              {clubName} hasn't published a contact phone or email yet. Use the Support option above and we'll route your message.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
