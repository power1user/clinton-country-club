import { useEffect, useState } from 'react';
import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import BellChip from '../components/BellChip.jsx';
import { useMenu, useNow, formatClockTime } from '../hooks/useClubData.jsx';
import { useBrand } from '../hooks/useBrand.jsx';

const SPECIALS_TAB = '__specials__';

export default function FoodMenu() {
  const { push, addToCart, removeFromCart, cart, cartCount, cartTotal } = useNav();
  const { data: menu, loading } = useMenu();
  const brand = useBrand();
  const now = useNow();
  const [cat, setCat] = useState(null);          // category id, or SPECIALS_TAB
  const getQty = (id) => cart.find(i => i.id === id)?.qty || 0;

  // Build tab list: Specials (if any) + every active category from the DB
  const hasSpecials = (menu.specials || []).length > 0;
  const cats = [
    ...(hasSpecials ? [{ id: SPECIALS_TAB, l: "Today's Specials" }] : []),
    ...(menu.categories || []).map(c => ({ id: c.id, l: c.name })),
  ];

  // Pick a sensible default tab once the data lands.
  useEffect(() => {
    if (cat !== null) return;
    if (cats.length > 0) setCat(cats[0].id);
  }, [cats.length, cat]);

  const items =
    cat === SPECIALS_TAB ? (menu.specials || []) :
    cat ? (menu.itemsByCategory?.[cat] || []) :
    [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: '0 20px 9px' }}>
        <span style={{ color: '#7AAC88', fontSize: 11, fontFamily: '"Lora",serif' }}>{formatClockTime(now)}</span>
        <span style={{ marginLeft: 'auto', color: '#7AAC88', fontSize: 10, letterSpacing: 2 }}>●●●</span>
      </div>

      <div style={{ background: G.green, padding: '4px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 9, color: '#7AAC88', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 1px' }}>{brand.prefix}</p>
            <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.1 }}>Dining</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {cartCount > 0 && (
              <div onClick={() => push('food/order')} data-tap style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: G.brass, borderRadius: 3, cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.98-1.69L23 6H6" /></svg>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: 'white', fontWeight: 600 }}>{cartCount} · ${cartTotal}</span>
              </div>
            )}
            <BellChip />
          </div>
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: '#7AAC88', margin: '6px 0 0' }}>Clubhouse Pub Menu</p>
      </div>

      <div style={{ background: G.greenMid, padding: '8px 20px', flexShrink: 0, display: 'flex', gap: 16 }}>
        {[['Kitchen', 'Open during clubhouse hours'], ['Pub', 'See clubhouse for hours'], ['Order to course', 'Available during play']].map(([l, h]) => (
          <div key={l} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: G.openDot, flexShrink: 0 }} />
            <span style={{ fontFamily: '"Lora",serif', fontSize: 10.5, color: '#C0D8C8' }}><strong>{l}</strong> {h}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', background: G.bg, borderBottom: `1px solid ${G.border}`, flexShrink: 0, overflowX: 'auto' }}>
        {cats.map(c => (
          <div key={c.id} onClick={() => setCat(c.id)} data-tap style={{ padding: '11px 14px', cursor: 'pointer', borderBottom: cat === c.id ? `2px solid ${G.brass}` : '2px solid transparent', marginBottom: -1, flexShrink: 0 }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: cat === c.id ? G.text : G.muted, fontWeight: cat === c.id ? 600 : 400 }}>{c.l}</span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div onClick={() => push('food/order')} data-tap style={{ margin: '12px 16px 4px', padding: '11px 14px', background: G.green, borderRadius: 4, display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 12 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7AAC88" strokeWidth="1.5"><circle cx="12" cy="10" r="3" /><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: '#F2EDE0', margin: 0 }}>Order Ahead</p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: '#7AAC88', margin: 0 }}>Ready when you finish your round</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7AAC88" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </div>

        <div style={{ padding: '8px 16px 80px' }}>
          {cat === SPECIALS_TAB && (
            <div style={{ marginBottom: 8, padding: '10px 12px', background: 'rgba(155,122,30,0.08)', border: '1px solid rgba(155,122,30,0.25)', borderRadius: 4 }}>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.brass, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>Chef's Features Today</p>
            </div>
          )}
          {!loading && cats.length === 0 && (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, textAlign: 'center', padding: '40px 0' }}>
              The menu is being prepared. Check back soon.
            </p>
          )}
          {!loading && cats.length > 0 && items.length === 0 && cat !== SPECIALS_TAB && (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, textAlign: 'center', padding: '24px 0' }}>
              Nothing in this category yet.
            </p>
          )}
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
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {cartCount > 0 && (
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
