import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import { SectionHead } from '../components/Headers.jsx';
import BellChip from '../components/BellChip.jsx';
import InstallCard from '../components/InstallCard.jsx';
import NotificationsToggle from '../components/NotificationsToggle.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useBrand } from '../hooks/useBrand.jsx';
import { useNow, formatClockTime } from '../hooks/useClubData.jsx';
import { PLATFORM_NAME, VERSION } from '../lib/version.js';

export default function MyClub() {
  const { push } = useNav();
  const [scrollRef, onScroll] = useScrollRestore();
  const { member, isAdmin, signOut, club } = useAuth();
  const brand = useBrand();
  const now = useNow();
  // Map DB member shape to the design's prop names. Empty placeholders if
  // there's no member record yet (e.g. signed in but pending claim).
  const m = member ? {
    name: member.name,
    number: member.membership_number,
    type: member.tier || 'Member',
    since: member.member_since || '—',
    hcp: member.hcp || '—',
    email: member.email || '',
    locker: member.locker || '—',
    cart: member.cart || '—',
    parking: member.parking || '—',
  } : { name: '—', number: '—', type: 'Member', since: '—', hcp: '—', email: '', locker: '—', cart: '—', parking: '—' };

  const actions = [
    { id: 'message-clubhouse', label: 'Message Clubhouse', sub: 'Questions · Requests',       icon: <><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeWidth="1.3" fill="none"/></> },
    ...(club?.enable_member_dms ? [
      { id: 'member-directory', label: 'Member Directory',  sub: 'Find · DM other members',    icon: <><circle cx="9" cy="7" r="4" strokeWidth="1.3" fill="none"/><circle cx="17" cy="7" r="3" strokeWidth="1.3" fill="none"/><path d="M1 20c0-3 3.6-5.5 8-5.5s8 2.5 8 5.5" strokeWidth="1.3" fill="none"/></> },
    ] : []),
    { id: 'myclub/card',       label: 'Membership Card',   sub: 'Digital · QR code',          icon: <><rect x="3" y="5" width="14" height="10" rx="1.5" strokeWidth="1.3" fill="none"/><path d="M6 10h6M6 8h6" strokeWidth="1.3" fill="none"/></> },
    { id: 'myclub/proshop',    label: 'Pro Shop',          sub: 'Specials · Equipment',       icon: <><path d="M12 3L2 8l2 13h16l2-13-10-5z" strokeWidth="1.3" fill="none"/><circle cx="12" cy="13" r="3" strokeWidth="1.3" fill="none"/></> },
    { id: 'myclub/lessons',    label: 'Book a Lesson',     sub: 'PGA pros on staff',          icon: <><circle cx="8" cy="12" r="3" strokeWidth="1.3" fill="none"/><path d="M8 9V3m0 0l4 2" strokeWidth="1.3" fill="none"/></> },
    { id: 'myclub/onboarding', label: 'Member Guide',      sub: 'Rules · Facilities · FAQs',  icon: <><rect x="4" y="2" width="12" height="16" rx="1.5" strokeWidth="1.3" fill="none"/><path d="M8 7h6M8 10h6M8 13h4" strokeWidth="1.3" fill="none"/></> },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: '0 20px 9px' }}>
        <span style={{ color: '#7AAC88', fontSize: 11, fontFamily: '"Lora",serif' }}>{formatClockTime(now)}</span>
      </div>
      <div style={{ background: G.green, padding: '6px 20px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 9, color: '#7AAC88', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 1px' }}>{brand.prefix}</p>
            <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: '#F2EDE0', margin: '0 0 14px', lineHeight: 1.1 }}>My Club</h1>
          </div>
          <BellChip />
        </div>
        <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 6, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '1.5px solid rgba(122,172,136,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7AAC88" strokeWidth="1.5">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: '#F2EDE0', margin: '0 0 2px', fontStyle: 'italic' }}>{m.name}</p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#7AAC88', margin: 0 }}>No. {m.number} · {m.type} · Hcp {m.hcp}</p>
          </div>
          <div onClick={() => push('myclub/card')} data-tap style={{ padding: '6px 12px', border: '1px solid rgba(122,172,136,0.4)', borderRadius: 3, cursor: 'pointer', flexShrink: 0 }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#A8D8B8' }}>Card</span>
          </div>
        </div>
      </div>

      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {actions.map(a => (
              <div key={a.id} onClick={() => push(a.id)} data-tap style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, padding: '16px 14px', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" stroke={G.brass} fill="none" style={{ marginBottom: 10 }}>{a.icon}</svg>
                <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 2px' }}>{a.label}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: 0 }}>{a.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '8px 16px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <NotificationsToggle />
          <InstallCard variant="card" />
        </div>

        {(club?.address || club?.contact_phone || club?.contact_email) && (
          <div style={{ padding: '8px 20px 4px' }}>
            <SectionHead label="Contact the Club" />
            {club.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(club.address)}`}
                target="_blank" rel="noopener noreferrer"
                data-tap
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${G.border}`, textDecoration: 'none' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, flex: 1 }}>{club.address}</span>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted }}>Open in maps →</span>
              </a>
            )}
            {club.contact_phone && (
              <a
                href={`tel:${club.contact_phone.replace(/[^+\d]/g, '')}`}
                data-tap
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${G.border}`, textDecoration: 'none' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.37 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0122 16.92z"/></svg>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, flex: 1 }}>{club.contact_phone}</span>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted }}>Call →</span>
              </a>
            )}
            {club.contact_email && (
              <a
                href={`mailto:${club.contact_email}`}
                data-tap
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${G.border}`, textDecoration: 'none' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club.contact_email}</span>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted }}>Email →</span>
              </a>
            )}
          </div>
        )}

        <div style={{ padding: '0 20px 8px' }}>
          <SectionHead label="My Account" />
          {[
            ['Member Since', m.since],
            ['Locker',        `No. ${m.locker}`],
            ['Cart Assignment', m.cart],
            ['Parking',       m.parking],
            ['Email on File', m.email],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${G.border}` }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>{k}</span>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, textAlign: 'right', maxWidth: '55%' }}>{v}</span>
            </div>
          ))}
        </div>

        {isAdmin && (
          <div style={{ padding: '14px 20px 8px' }}>
            <div onClick={() => push('myclub/admin')} data-tap style={{ padding: '12px 16px', border: `1px solid ${G.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 12 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.5">
                <path d="M12 2l3 3H9l3-3z" />
                <path d="M9 5H5l-2 7h18l-2-7h-4" />
                <path d="M3 12v8h18v-8" />
                <line x1="12" y1="12" x2="12" y2="20" />
              </svg>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, flex: 1 }}>Staff Admin Panel</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </div>
          </div>
        )}

        <div style={{ padding: '8px 20px 4px' }}>
          <div onClick={signOut} data-tap style={{ padding: '11px 16px', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, textDecoration: 'underline', textUnderlineOffset: 2 }}>Sign out</span>
          </div>
        </div>

        {/* About — parent-brand attribution + version */}
        <div style={{ padding: '4px 20px 28px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 3px' }}>
            Powered by {PLATFORM_NAME}
          </p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: 0, opacity: 0.7 }}>
            v{VERSION}
          </p>
        </div>
      </div>
    </div>
  );
}
