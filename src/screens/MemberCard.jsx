import { useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { Brass, GhostBtn } from '../components/Buttons.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { DATA_MEMBER } from '../data/mock.js';

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
  const { member, club } = useAuth();
  const m = member ? {
    name: member.name,
    number: member.membership_number,
    type: member.tier || 'Member',
    since: member.member_since || '—',
  } : DATA_MEMBER;
  const cityState = club ? `${club.city}, ${STATE_NAMES[club.state] || club.state}` : 'Clinton, Illinois';
  const founded = club?.founded || 1921;
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
                <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 8.5, color: '#7AAC88', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 2px' }}>{club?.name?.replace(/\s+Country\s+Club\s*$/i, '') || 'Clinton'}</p>
                <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: '#F2EDE0', margin: 0 }}>Country Club</p>
              </div>
              <div style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px solid rgba(122,172,136,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7AAC88" strokeWidth="1.2">
                  <path d="M12 3L2 8l2 14h16l2-14L12 3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 26, left: 26, right: 26 }}>
              <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 9, color: '#7AAC88', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>Member Since {m.since}</p>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 20, fontWeight: 400, fontStyle: 'italic', color: '#F2EDE0', margin: '0 0 3px', letterSpacing: '0.01em' }}>{m.name}</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#7AAC88', margin: 0, letterSpacing: '0.04em' }}>No. {m.number} · {m.type}</p>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${G.brass}, ${G.brassLt}, ${G.brass})` }} />
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 346, height: 218, background: '#F8F4EC', borderRadius: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `2px solid ${G.border}`, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}>
            <svg width="120" height="120" viewBox="0 0 120 120" style={{ marginBottom: 10 }}>
              <rect width="120" height="120" fill={G.green} rx="4" />
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => <rect key={i} x={8 + (i % 3) * 36} y={8 + Math.floor(i / 3) * 36} width={30} height={30} fill="none" stroke="#7AAC88" strokeWidth="2" rx="2" />)}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => i % 2 === 0 && <rect key={`f${i}`} x={13 + (i % 3) * 36} y={13 + Math.floor(i / 3) * 36} width={20} height={20} fill="#7AAC88" rx="1" />)}
            </svg>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>Member No. {m.number}</p>
          </div>
        )}
        <div style={{ marginTop: 22, display: 'flex', gap: 10, width: '100%', maxWidth: 346 }}>
          <GhostBtn onPress={() => setShowQR(!showQR)} style={{ flex: 1 }}>{showQR ? 'Show Card' : 'QR Code'}</GhostBtn>
          <Brass style={{ flex: 1 }}>Add to Wallet</Brass>
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, marginTop: 16, textAlign: 'center' }}>Est. {founded} · {cityState}</p>
      </div>
    </div>
  );
}
