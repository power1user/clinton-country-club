// FoodMenu — the dining tab. Renders every menu category in a single
// scrolling list (no horizontal slider, which fought the new swipe-
// between-tabs gesture). A sticky chip bar at the top anchor-jumps to
// each category section.
//
// History note: previously had a hardcoded "Kitchen / Pub / Order to
// course" info strip and an "Order Ahead" call-to-action bar above
// the menu. Both were removed (v0.4.7): the status strip duplicated
// live status pills on Home and used facility names that didn't match
// the actual club_status labels; the Order Ahead bar was redundant —
// the floating "View Order" CTA already takes the member to the same
// place once they have items in the cart.
import { useEffect, useRef, useState } from 'react';
import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import { useFlag } from '../hooks/useFlag.js';
import { useAuth } from '../hooks/useAuth.jsx';
import BellChip from '../components/BellChip.jsx';
import { useMenu, useNow, formatClockTime } from '../hooks/useClubData.jsx';
import { useBrand } from '../hooks/useBrand.jsx';
import FeatureOff from '../components/FeatureOff.jsx';

const SPECIALS_KEY = '__specials__';

export default function FoodMenu() {
  const on = useFlag('food_ordering');
  const { push, addToCart, removeFromCart, cart, cartCount, cartTotal } = useNav();
  const [scrollRef, onScroll] = useScrollRestore();
  const { data: menu, loading } = useMenu();
  const { isGuest } = useAuth();
  const brand = useBrand();
  const now = useNow();
  const getQty = (id) => cart.find(i => i.id === id)?.qty || 0;
  // v0.8.2: guests see the menu but can't order. Hides the floating
  // View Order CTA + the per-item add-to-cart controls. Effective
  // cartCount stays 0 for guests since the cart is in-memory and they
  // never add anything; explicit gate here is belt+suspenders.
  const canOrder = !isGuest;

  // Section refs keyed by category id (or SPECIALS_KEY). Used by the
  // chip bar's scrollIntoView so taps jump to the right section.
  const sectionRefs = useRef({});
  const setSectionRef = (key) => (el) => {
    if (el) sectionRefs.current[key] = el;
    else delete sectionRefs.current[key];
  };

  // Track which section is currently in view so the chip bar can
  // highlight it. Uses scroll position rather than IntersectionObserver
  // because the observer's root is fiddly with our nested scroll container.
  const [activeSection, setActiveSection] = useState(null);
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const update = () => {
      // Find the topmost section whose top is at or above 80px from the
      // container top (just below the sticky chip bar).
      const containerTop = container.getBoundingClientRect().top;
      let bestKey = null;
      for (const [key, el] of Object.entries(sectionRefs.current)) {
        const rel = el.getBoundingClientRect().top - containerTop;
        if (rel <= 80) bestKey = key; else break;
      }
      setActiveSection(bestKey);
    };
    update();
    container.addEventListener('scroll', update, { passive: true });
    return () => container.removeEventListener('scroll', update);
  }, [scrollRef, menu]);

  // Build the chip bar entries: Specials first (if any), then every
  // category that has at least one item.
  const hasSpecials = (menu.specials || []).length > 0;
  const orderedCats = (menu.categories || []).filter(c => (menu.itemsByCategory?.[c.id] || []).length > 0);
  const chips = [
    ...(hasSpecials ? [{ key: SPECIALS_KEY, l: "Today's Specials" }] : []),
    ...orderedCats.map(c => ({ key: c.id, l: c.name })),
  ];

  const jumpTo = (key) => {
    const el = sectionRefs.current[key];
    const container = scrollRef.current;
    if (!el || !container) return;
    // smooth-scroll the section to ~10px below the sticky chip bar
    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    container.scrollTo({ top: container.scrollTop + (elTop - containerTop) - 10, behavior: 'smooth' });
  };

  // Phase 7 gating — default ON. BottomNav also hides the Food tab
  // when this is off, so members shouldn't normally reach this path.
  if (!on) return <FeatureOff label="Food & Drink" />;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: '0 20px 9px' }}>
        <span style={{ color: '#A8D8B8', fontSize: 11, fontFamily: '"Lora",serif' }}>{formatClockTime(now)}</span>
      </div>

      <div style={{ background: G.green, padding: '4px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 9, color: '#A8D8B8', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 1px' }}>{brand.prefix}</p>
            <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.1 }}>Dining</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {canOrder && cartCount > 0 && (
              <div onClick={() => push('food/order')} data-tap style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: G.brass, borderRadius: 3, cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.98-1.69L23 6H6" /></svg>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: 'white', fontWeight: 600 }}>{cartCount} · ${cartTotal}</span>
              </div>
            )}
            <BellChip />
          </div>
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: '#A8D8B8', margin: '6px 0 0' }}>Menu</p>
      </div>

      {/* Sticky chip nav — tap a chip to jump to its section. Wraps to
          a second row if a club has many categories; phones can still
          horizontally scroll inside the wrap zone if needed. */}
      {chips.length > 0 && (
        <div style={{ background: G.bg, borderBottom: `1px solid ${G.border}`, flexShrink: 0, padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 6, overflowX: 'auto' }}>
          {chips.map(c => {
            const active = activeSection === c.key;
            return (
              <div
                key={c.key}
                onClick={() => jumpTo(c.key)}
                data-tap
                style={{
                  padding: '6px 12px',
                  borderRadius: 14,
                  background: active ? G.green : 'transparent',
                  border: `1px solid ${active ? G.green : G.border}`,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11.5, color: active ? '#F2EDE0' : G.text, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>
                  {c.l}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Scrollable menu list — every section renders inline. No
          horizontal slider, no swipe gesture conflicts. */}
      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '8px 16px 90px' }}>
          {loading && (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, textAlign: 'center', padding: '40px 0' }}>
              Loading the menu…
            </p>
          )}
          {!loading && chips.length === 0 && (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, textAlign: 'center', padding: '40px 0' }}>
              The menu is being prepared. Check back soon.
            </p>
          )}

          {hasSpecials && (
            <MenuSection
              setRef={setSectionRef(SPECIALS_KEY)}
              label="Today's Specials"
              accent
              items={menu.specials || []}
              getQty={getQty}
              addToCart={canOrder ? addToCart : null}
              removeFromCart={canOrder ? removeFromCart : null}
            />
          )}

          {orderedCats.map(c => (
            <MenuSection
              key={c.id}
              setRef={setSectionRef(c.id)}
              label={c.name}
              items={menu.itemsByCategory?.[c.id] || []}
              getQty={getQty}
              addToCart={canOrder ? addToCart : null}
              removeFromCart={canOrder ? removeFromCart : null}
            />
          ))}
        </div>
      </div>

      {canOrder && cartCount > 0 && (
        <div style={{ position: 'absolute', bottom: 80, left: 16, right: 16 }}>
          <div onClick={() => push('food/order')} data-tap style={{ background: G.green, borderRadius: 5, padding: '13px 18px', display: 'flex', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
            <span style={{ background: G.brass, color: '#1B3A2D', fontSize: 11, fontWeight: 700, fontFamily: '"Lora",serif', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 }}>{cartCount}</span>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500, flex: 1 }}>View Order</span>
            <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: '#F2EDE0' }}>${cartTotal}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// One category's section header + item list. accent=true gives the
// brass-tinted treatment used for Today's Specials.
function MenuSection({ setRef, label, items, accent = false, getQty, addToCart, removeFromCart }) {
  if (!items.length) return null;
  return (
    <div ref={setRef} style={{ marginBottom: 18 }}>
      <div style={{
        margin: '14px 0 8px',
        padding: '6px 10px',
        background: accent ? 'rgba(155,122,30,0.10)' : 'transparent',
        border: accent ? '1px solid rgba(155,122,30,0.25)' : 'none',
        borderRadius: 4,
      }}>
        <p style={{
          fontFamily: '"Lora",serif',
          fontSize: accent ? 9 : 10,
          color: accent ? G.brass : G.muted,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          margin: 0,
          fontWeight: 700,
        }}>
          {label}
        </p>
      </div>
      {items.map(item => {
        const qty = getQty(item.id);
        return (
          <div key={item.id} style={{ padding: '14px 0', borderBottom: `1px solid ${G.border}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1.2 }}>{item.name}</h3>
                  {item.tag && <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.brass, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(155,122,30,0.1)', padding: '2px 6px', borderRadius: 2, flexShrink: 0 }}>{item.tag}</span>}
                </div>
                <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, lineHeight: 1.5, margin: '0 0 6px' }}>{item.desc}</p>
                <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 600, color: G.text }}>{item.price}</span>
              </div>
              {/* v0.8.2: when addToCart is null (guest mode), hide the
                  +/- cart controls entirely — the menu reads as a
                  view-only catalog. Members get the full ordering UI. */}
              {addToCart && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginTop: 2 }}>
                  {qty > 0 && (
                    <>
                      <div onClick={() => removeFromCart(item.id)} data-tap style={{ width: 28, height: 28, borderRadius: 3, border: `1px solid ${G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G.text} strokeWidth="2.5"><path d="M5 12h14" /></svg>
                      </div>
                      <span style={{ fontFamily: '"Lora",serif', fontSize: 14, fontWeight: 600, color: G.text, minWidth: 16, textAlign: 'center' }}>{qty}</span>
                    </>
                  )}
                  <div onClick={() => addToCart(item)} data-tap style={{ width: 28, height: 28, borderRadius: 3, background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F2EDE0" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
