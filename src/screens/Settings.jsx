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
import { useEffect } from 'react';
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

export default function Settings() {
  const { member, club } = useAuth();
  const displayModeOn = useFlag('display_mode');
  const profilePhotosOn = useFlag('profile_photos');

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

        {/* App — install affordance. Always shows unless already
            standalone (handled inside InstallEntry). iOS gets a
            step-by-step instructions card; Android tap triggers the
            native prompt. */}
        <div style={{ marginTop: 18 }} />
        <SectionHeading>App</SectionHeading>
        <InstallEntry />
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
