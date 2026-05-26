// GuestThankYou — terminal screen for `data_only` guest sessions.
// v0.8.2 (Phase 8).
//
// When a club's guest_default_access_level is 'data_only', the guest's
// magic-link click lands them here instead of inside the app. The club
// captured the contact info; the guest gets a polite confirmation +
// the club's contact details. No further app access.
//
// They can sign out (clears the session) or close the tab.
import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { PLATFORM_NAME } from '../lib/version.js';

export default function GuestThankYou() {
  const { guest, club, signOut } = useAuth();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', background: G.bg, minHeight: '100vh' }}>
      {/* Branded hero */}
      <div style={{ background: G.green, padding: '40px 24px 28px', textAlign: 'center', flexShrink: 0 }}>
        {club?.logo_url && (
          <img src={club.logo_url} alt={`${club.name} logo`} style={{ maxHeight: 64, maxWidth: 200, marginBottom: 14, objectFit: 'contain' }} />
        )}
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 10, color: '#A8D8B8', letterSpacing: '0.24em', textTransform: 'uppercase', margin: '0 0 6px' }}>
          {club?.slug || 'club'}
        </p>
        <h1 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 26, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.2 }}>
          {club?.name || 'The Club'}
        </h1>
      </div>

      <div style={{ flex: 1, padding: '32px 24px 36px', maxWidth: 460, margin: '0 auto', width: '100%', boxSizing: 'border-box', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: G.openBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={G.openDot} strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <h2 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 22, fontWeight: 700, color: G.text, margin: '0 0 10px' }}>
          {guest?.name ? `Welcome, ${guest.name.split(' ')[0]}` : 'Welcome'}
        </h2>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, lineHeight: 1.65, margin: '0 0 18px' }}>
          Your visit has been recorded. {club?.name || 'The club'} will be in touch by email if there's anything to follow up on.
        </p>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, lineHeight: 1.6, margin: '0 0 24px' }}>
          Enjoy your visit. We hope to see you again soon.
        </p>

        {(club?.contact_phone || club?.contact_email || club?.address) && (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, padding: '14px 18px', textAlign: 'left', marginBottom: 24 }}>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 700 }}>Contact the club</p>
            {club.address && (
              <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: '0 0 4px', lineHeight: 1.5 }}>{club.address}</p>
            )}
            {club.contact_phone && (
              <a href={`tel:${club.contact_phone.replace(/[^+\d]/g, '')}`} style={{ display: 'block', fontFamily: '"Lora",serif', fontSize: 13, color: G.text, textDecoration: 'none', margin: '4px 0' }}>
                {club.contact_phone}
              </a>
            )}
            {club.contact_email && (
              <a href={`mailto:${club.contact_email}`} style={{ display: 'block', fontFamily: '"Lora",serif', fontSize: 13, color: G.text, textDecoration: 'none', margin: '4px 0' }}>
                {club.contact_email}
              </a>
            )}
          </div>
        )}

        <div onClick={signOut} data-tap style={{ padding: '11px 24px', display: 'inline-block', cursor: 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, textDecoration: 'underline', textUnderlineOffset: 2 }}>Sign out</span>
        </div>

        {/* v0.8.6: Grounds mark inline with the attribution text */}
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <img src="/grounds-mark.png" alt="" style={{ width: 16, height: 16, opacity: 0.85 }} />
          <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
            Powered by {PLATFORM_NAME}
          </p>
        </div>
      </div>
    </div>
  );
}
