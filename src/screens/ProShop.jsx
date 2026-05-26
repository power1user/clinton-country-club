import { G } from '../theme.js';
import { BackHeader, SectionHead } from '../components/Headers.jsx';
import { useProShopItems } from '../hooks/useClubData.jsx';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import { useFlag } from '../hooks/useFlag.js';
import { useNav } from '../hooks/useNav.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import FeatureOff from '../components/FeatureOff.jsx';
import { guestCanSee } from '../lib/guestAccess.js';

export default function ProShop() {
  const on = useFlag('pro_shop');
  const { data: items, loading } = useProShopItems();
  const [scrollRef, onScroll] = useScrollRestore();
  const { push } = useNav();
  const { isGuest, guestAccessLevel } = useAuth();
  // Phase 7 gating — flag default is ON so existing clubs keep ProShop
  // visible. Manager turns it off in Admin → Features.
  if (!on) return <FeatureOff label="Pro Shop" />;
  // v0.8.5: guests gated by access level. read_only guests don't see
  // pro shop; full_temporary guests browse the catalog (no checkout,
  // no inquiries — "My Inquiries" is gated separately below).
  if (isGuest && !guestCanSee(guestAccessLevel, 'pro_shop')) {
    return <FeatureOff label="Pro Shop" body="The pro shop catalog isn't available to guests at your access level." />;
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Pro Shop" />
      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 24px' }}>
        {/* My Inquiries entry — v0.7.6. Members only (guests don't
            have inquiries to view; pro_shop_inquiries is members-only
            via RLS). v0.8.5: hidden for guests. */}
        {!isGuest && (
        <div
          onClick={() => push('myclub/proshop/inquiries')}
          data-tap
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: G.green, borderRadius: 6, marginBottom: 16, cursor: 'pointer' }}
        >
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid rgba(168,216,184,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.6">
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <path d="M8 8h8M8 12h8M8 16h5" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.2 }}>My Inquiries</p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#A8D8B8', margin: '2px 0 0' }}>Lesson requests + pro shop inquiries you've submitted</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </div>
        )}

        <SectionHead label="Current Catalog" />
        {loading && (
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '20px 0' }}>Loading the catalog…</p>
        )}
        {!loading && items.length === 0 && (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '16px 0' }}>
            Nothing in the pro shop right now. Check back soon, or visit us in person.
          </p>
        )}
        {items.map(item => (
          <div key={item.id} style={{ padding: '14px 14px', background: G.card, borderRadius: 4, marginBottom: 10, border: `1px solid ${G.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 10 }}>
              <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: 0, flex: 1, lineHeight: 1.25 }}>{item.name}</h3>
              {item.category && (
                <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.brass, textTransform: 'uppercase', letterSpacing: '0.07em', background: 'rgba(155,122,30,0.1)', padding: '2px 7px', borderRadius: 2, flexShrink: 0 }}>{item.category}</span>
              )}
            </div>
            {item.description && (
              <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 8px' }}>{item.description}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {item.price != null && (
                <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text }}>${Number(item.price).toFixed(2)}</span>
              )}
              {!item.in_stock && (
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, fontStyle: 'italic' }}>Out of stock</span>
              )}
            </div>
          </div>
        ))}
        {/* v0.7.12: removed the "Club Fitting Available" decorative
            card. Had a "Schedule a Fitting" button that did nothing
            (no onClick wired) — dead buttons train members to
            distrust the UI. If a club wants to offer fittings they
            can post about it on the Bulletin Board, broadcast a
            Notification, or list it as a Lesson Pro service. */}
      </div>
    </div>
  );
}
