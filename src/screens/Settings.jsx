// Settings — the single home for member-level personal preferences.
// Reachable from MyClub via the gear icon in the header.
//
// Sections (v0.6.2 scaffold; more land in v0.6.3+):
//   · Notifications   — push toggle (v0.6.2)
//   · Privacy         — member DM opt-out         (v0.6.3, pending)
//   · Appearance      — display mode picker       (v0.6.4, pending)
//   · Profile         — profile photo upload      (v0.6.5, pending)
//   · App             — install to home screen    (v0.6.6, pending)
//
// Each section renders only when it's relevant for the member: e.g.
// the display-mode picker hides when the club hasn't enabled the
// display_mode feature flag.
import { useEffect, useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import NotificationsToggle from '../components/NotificationsToggle.jsx';
import DmOptOutToggle from '../components/DmOptOutToggle.jsx';
import DisplayModePicker from '../components/DisplayModePicker.jsx';
import ProfilePhotoCard from '../components/ProfilePhotoCard.jsx';
import InstallEntry from '../components/InstallEntry.jsx';
import Avatar from '../components/Avatar.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { useNav } from '../hooks/useNav.jsx';
import { PLATFORM_NAME, VERSION } from '../lib/version.js';
import { CURRENT_TERMS_DATE, CURRENT_TERMS_VERSION } from '../lib/terms.js';
import MarketingPrefsCard from '../components/MarketingPrefsCard.jsx';

export default function Settings() {
  const { member, club, isGuest } = useAuth();
  const { push } = useNav();
  const displayModeOn = useFlag('display_mode');
  const profilePhotosOn = useFlag('profile_photos');
  const guestFlagOn = useFlag('guest_registration');

  // v0.7.10: once a member visits Settings, they know the persistent
  // Install entry lives here — no need to keep showing the MyClub
  // InstallCard. Setting this localStorage key on mount tells the
  // card variant of InstallCard to hide itself on every future visit.
  // Banner variant (Login post-signup) is unaffected — that fires only
  // once and dismisses on the same screen.
  useEffect(() => {
    try { localStorage.setItem('pwa.installCoordinated', '1'); } catch (_) { /* ignore quota / private mode */ }
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Settings" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px' }}>
        {/* Member identity strip — small reminder of whose settings
            we're editing. Useful when the member shares a device with
            family and wants to confirm they're in their own account.
            Shows the profile photo when the club has the flag on;
            falls back to initials otherwise (Avatar handles both). */}
        {member && (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '12px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar photoUrl={profilePhotosOn ? member.photo_url : null} name={member.name} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1.2 }}>{member.name || '—'}</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0' }}>
                {club?.name || ''}{member.membership_number ? ` · #${member.membership_number}` : ''}
              </p>
            </div>
          </div>
        )}

        <SectionHeading>Notifications</SectionHeading>
        <NotificationsToggle />

        {/* v0.18.0 — Marketing communications. Email + SMS toggles, each
            independent; every change writes a consent_log row. Hidden
            for guests (they pass through their own consent at QR
            registration; managing prefs is a member feature). */}
        {!isGuest && member?.person_id && (
          <>
            <div style={{ marginTop: 18 }} />
            <SectionHeading>Communications</SectionHeading>
            <MarketingPrefsCard />
          </>
        )}

        {/* Privacy — DM opt-out auto-hides itself when the club's
            dms flag is off, so no manual condition needed here. */}
        <div style={{ marginTop: 18 }} />
        <SectionHeading>Privacy</SectionHeading>
        <DmOptOutToggle />

        {/* Appearance — only shown when the club has the display_mode
            feature flag enabled. The picker has its own internal flag
            check too, but skipping the heading when off keeps the
            section list tidy. */}
        {displayModeOn && (
          <>
            <div style={{ marginTop: 18 }} />
            <SectionHeading>Appearance</SectionHeading>
            <DisplayModePicker />
          </>
        )}

        {/* Profile — upload/change/remove the member's avatar. Auto-
            hides when the club has profile_photos off (heading too). */}
        {profilePhotosOn && (
          <>
            <div style={{ marginTop: 18 }} />
            <SectionHeading>Profile</SectionHeading>
            <ProfilePhotoCard />
          </>
        )}

        {/* v0.8.3: Sharing — member's personal guest check-in QR. Lives
            in Settings as a second entry point in addition to the
            Guest QR button on the Membership Card screen. Hidden for
            guests (they can't invite other guests) and when the club
            hasn't enabled guest_registration. */}
        {guestFlagOn && !isGuest && member?.id && (
          <>
            <div style={{ marginTop: 18 }} />
            <SectionHeading>Sharing</SectionHeading>
            <div
              onClick={() => push('myclub/guest-qr')}
              data-tap
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, cursor: 'pointer' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.5">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0 }}>Your Guest Check-In QR</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0', lineHeight: 1.4 }}>
                  Share with someone to add them as your guest at {club?.name || 'the club'}.
                </p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </div>
          </>
        )}

        {/* App — install affordance. Always shows unless already
            standalone (handled inside InstallEntry). iOS gets a
            step-by-step instructions card; Android tap triggers the
            native prompt. */}
        <div style={{ marginTop: 18 }} />
        <SectionHeading>App</SectionHeading>
        <InstallEntry />

        {/* v0.10.14 — Help & Support. Single row that opens the
            Support screen with platform-level contact (mailto to
            support@groundslive.com) + the club's own contact info
            + an FAQ accordion. Positioned below the preference
            sections (Notifications / Privacy / Appearance / Profile
            / Sharing / App) and above About which is metadata. */}
        <div style={{ marginTop: 18 }} />
        <SectionHeading>Help</SectionHeading>
        <div
          onClick={() => push('myclub/support')}
          data-tap
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, cursor: 'pointer' }}
        >
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0 }}>Help & Support</p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0', lineHeight: 1.4 }}>
              FAQs, contact {PLATFORM_NAME}, or reach your club directly
            </p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </div>

        {/* About — v0.18.0. Six rows, all read-only:
              · Terms of Use → opens /terms in new tab
              · Privacy Policy → opens /privacy in new tab
              · App version
              · Powered by Grounds Live
              · Support contact */}
        <div style={{ marginTop: 18 }} />
        <SectionHeading>About</SectionHeading>
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {/* Terms of Use — external link */}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', textDecoration: 'none' }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0 }}>Terms of Use</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0' }}>
                Version {CURRENT_TERMS_VERSION} · last updated {CURRENT_TERMS_DATE}
              </p>
            </div>
            <ExternalIcon />
          </a>

          {/* Privacy Policy — external link */}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderTop: `1px solid ${G.border}`, textDecoration: 'none' }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0 }}>Privacy Policy</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0' }}>
                How your information is used and protected
              </p>
            </div>
            <ExternalIcon />
          </a>

          {/* App version */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderTop: `1px solid ${G.border}` }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500 }}>App version</span>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: G.muted }}>v{VERSION}</span>
          </div>

          {/* Powered by */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderTop: `1px solid ${G.border}` }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500 }}>Powered by</span>
            <span style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.brass }}>{PLATFORM_NAME}</span>
          </div>

          {/* Support contact */}
          <a
            href={`mailto:${club?.contact_email || 'support@groundslive.com'}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderTop: `1px solid ${G.border}`, textDecoration: 'none' }}
          >
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500 }}>Contact support</span>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.brass, textDecoration: 'underline', textUnderlineOffset: 2 }}>
              {club?.contact_email || 'support@groundslive.com'}
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '4px 0 8px', fontWeight: 700 }}>
      {children}
    </p>
  );
}

function ExternalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
