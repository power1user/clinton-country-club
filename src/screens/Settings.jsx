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
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import NotificationsToggle from '../components/NotificationsToggle.jsx';
import DmOptOutToggle from '../components/DmOptOutToggle.jsx';
import DisplayModePicker from '../components/DisplayModePicker.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFlag } from '../hooks/useFlag.js';

export default function Settings() {
  const { member, club } = useAuth();
  const displayModeOn = useFlag('display_mode');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Settings" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px' }}>
        {/* Member identity strip — small reminder of whose settings
            we're editing. Useful when the member shares a device with
            family and wants to confirm they're in their own account. */}
        {member && (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '12px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, color: '#A8D8B8', fontWeight: 700 }}>
                {(member.name || '?').trim().charAt(0).toUpperCase()}
              </span>
            </div>
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

        {/* Placeholders for v0.6.5+ — kept inline as comments so the
            shape of this screen is obvious before those commits land.

            <SectionHeading>Profile</SectionHeading>
            {profilePhotosOn && <ProfilePhotoCard />}

            <SectionHeading>App</SectionHeading>
            <InstallEntry />
        */}
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
