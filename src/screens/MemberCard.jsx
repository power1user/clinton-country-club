import { useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { GhostBtn } from '../components/Buttons.jsx';
import Avatar from '../components/Avatar.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { QRCodeSVG } from 'qrcode.react';
import FeatureOff from '../components/FeatureOff.jsx';

const STATE_NAMES = {
  AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas', CA:'California',
  CO:'Colorado', CT:'Connecticut', DE:'Delaware', FL:'Florida', GA:'Georgia',
  HI:'Hawaii', ID:'Idaho', IL:'Illinois', IN:'Indiana', IA:'Iowa', KS:'Kansas',
  KY:'Kentucky', LA:'Louisiana', ME:'Maine', MD:'Maryland', MA:'Massachusetts',
  MI:'Michigan', MN:'Minnesota', MS:'Mississippi', MO:'Missouri', MT:'Montana',
  NE:'Nebraska', NV:'Nevada', NH:'New Hampshire', NJ:'New Jersey', NM:'New Mexico',
  NY:'New York', NC:'North Carolina', ND:'North Dakota', OH:'Ohio', OK:'Oklahoma',
  OR:'Oregon', PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina',
  SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah', VT:'Vermont',
  VA:'Virginia', WA:'Washington', WV:'West Virginia', WI:'Wisconsin', WY:'Wyoming',
};

export default function MemberCard() {
  const [showQR, setShowQR] = useState(false);
  const { member, club, isGuest } = useAuth();
  const profilePhotosOn = useFlag('profile_photos');
  // v0.8.2: guests don't have a membership card. Defense in depth —
  // the My Club tab also routes them to a guest-mode view rather than
  // the action grid that links here.
  if (isGuest) return <FeatureOff label="Membership Card" body="Membership cards are for club members. You're signed in as a guest." />;
  const m = member ? {
    name: member.name,
    number: member.membership_number,
    type: member.tier || 'Member',
    since: member.member_since || '—',
    photoUrl: profilePhotosOn ? member.photo_url : null,
  } : { name: '—', number: '—', type: 'Member', since: '—', photoUrl: null };
  const cityState = club ? `${club.city || ''}, ${STATE_NAMES[club.state] || club.state || ''}`.replace(/^, |, $/g, '') : '';
  const founded = club?.founded || null;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Membership Card" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 28px 40px' }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 20px' }}>Digital Membership Card</p>
        {!showQR ? (
          <div style={{ width: '100%', maxWidth: 346, height: 218, background: G.green, borderRadius: 14, padding: 26, position: 'relative', overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)' }}>
            <div style={{ position: 'absolute', right: -44, top: -44, width: 200, height: 200, borderRadius: '50%', border: '46px solid rgba(255,255,255,0.04)' }} />
            <div style={{ position: 'absolute', right: 12, bottom: -52, width: 172, height: 172, borderRadius: '50%', border: '36px solid rgba(255,255,255,0.03)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
              <div>
                <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 8.5, color: '#A8D8B8', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 2px' }}>{club?.name?.replace(/\s+Country\s+Club\s*$/i, '') || 'Clinton'}</p>
                <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: '#F2EDE0', margin: 0 }}>Country Club</p>
              </div>
              <div style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px solid rgba(122,172,136,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.2">
                  <path d="M12 3L2 8l2 14h16l2-14L12 3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 26, left: 26, right: 26, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              {/* Member photo when uploaded; initials circle otherwise.
                  Sits to the left of the name/since stack so the card
                  reads as a personal credential rather than a generic
                  club artifact. */}
              <Avatar
                photoUrl={m.photoUrl}
                name={m.name}
                size={52}
                bgColor="rgba(255,255,255,0.10)"
                fgColor="#F2EDE0"
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 9, color: '#A8D8B8', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Member Since {m.since}</p>
                <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 20, fontWeight: 400, fontStyle: 'italic', color: '#F2EDE0', margin: '0 0 3px', letterSpacing: '0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#A8D8B8', margin: 0, letterSpacing: '0.04em' }}>No. {m.number} · {m.type}</p>
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${G.brass}, ${G.brassLt}, ${G.brass})` }} />
          </div>
        ) : (
          // Real scannable QR (v0.6.7) — encodes the member's
          // membership_number as a plain string. Any QR reader will
          // surface the number. 160px on the card keeps it readable
          // at arm's length on a phone screen even in moderate
          // glare. Falls back to a dash if for some reason the
          // member has no membership_number set.
          <div style={{ width: '100%', maxWidth: 346, height: 218, background: '#F8F4EC', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `2px solid ${G.border}`, boxShadow: '0 12px 40px rgba(0,0,0,0.1)', padding: 16 }}>
            <div style={{ background: '#fff', padding: 8, borderRadius: 4, marginBottom: 10, lineHeight: 0 }}>
              <QRCodeSVG
                value={String(m.number || '-')}
                size={160}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                marginSize={0}
              />
            </div>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>Member No. {m.number || '—'}</p>
          </div>
        )}
        {/* Add-to-Wallet button removed in v0.6.2 and PERMANENTLY parked
            as of v0.7.5 — no longer on the roadmap. Apple Developer +
            Google Wallet API credentials cost real money and engineering
            time; we'll only build this when an actual country club asks
            for it. At that point it goes on the roadmap with the
            requesting club's name attached. Do NOT re-add a stub
            button (a button that says "Coming soon" reads as broken). */}
        <div style={{ marginTop: 22, display: 'flex', gap: 10, width: '100%', maxWidth: 346 }}>
          <GhostBtn onPress={() => setShowQR(!showQR)} style={{ flex: 1 }}>{showQR ? 'Show Card' : 'QR Code'}</GhostBtn>
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, marginTop: 16, textAlign: 'center' }}>
          {[founded && `Est. ${founded}`, cityState].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  );
}
