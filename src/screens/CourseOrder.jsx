import { useState } from 'react';
import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { BackHeader, SectionHead } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useBrand } from '../hooks/useBrand.jsx';
import { supabase, isConfigured } from '../lib/supabase.js';

export default function CourseOrder() {
  const { pop, push, cart, addToCart, removeFromCart, cartTotal } = useNav();
  const { club, member } = useAuth();
  const brand = useBrand();
  const [hole, setHole] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const placeOrder = async () => {
    if (cart.length === 0 || !hole) return;
    if (!isConfigured || !club || !member) {
      push('food/confirm', { hole, notes });
      return;
    }
    setBusy(true); setErr(null);
    const { error } = await supabase.from('food_orders').insert({
      club_id: club.id,
      member_id: member.id,
      items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
      hole,
      location_note: notes || null,
      subtotal: parseFloat(cartTotal),
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    push('food/confirm', { hole, notes });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Order to the Course" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 100px' }}>
        <div style={{ marginBottom: 20 }}>
          <SectionHead label="Your Order" />
          {cart.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted }}>Your order is empty.</p>
              <div onClick={pop} data-tap style={{ marginTop: 10, display: 'inline-block', cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.brass }}>← Back to menu</span>
              </div>
            </div>
          ) : cart.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${G.border}`, gap: 12 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 600, color: G.text, margin: '0 0 2px' }}>{item.name}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: 0 }}>{item.price} each</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div onClick={() => removeFromCart(item.id)} data-tap style={{ width: 26, height: 26, borderRadius: 3, border: `1px solid ${G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={G.text} strokeWidth="2.5"><path d="M5 12h14" /></svg>
                </div>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 13, fontWeight: 600, color: G.text, minWidth: 18, textAlign: 'center' }}>{item.qty}</span>
                <div onClick={() => addToCart(item)} data-tap style={{ width: 26, height: 26, borderRadius: 3, background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F2EDE0" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                </div>
              </div>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, fontWeight: 600, color: G.text, minWidth: 44, textAlign: 'right' }}>${(item.qty * parseFloat(item.price.replace('$', ''))).toFixed(2)}</span>
            </div>
          ))}
          {cart.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `2px solid ${G.border}` }}>
              <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text }}>Subtotal</span>
              <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text }}>${cartTotal}</span>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <SectionHead label="Deliver to Hole" />
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 10px' }}>Select the hole where you'd like your order delivered.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Array.from({ length: brand.holes }, (_, i) => i + 1).map(n => (
              <div key={n} onClick={() => setHole(n)} data-tap style={{ width: 42, height: 42, borderRadius: 3, background: hole === n ? G.green : G.card, border: `1.5px solid ${hole === n ? G.green : G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 13, fontWeight: hole === n ? 700 : 500, color: hole === n ? '#F2EDE0' : G.text }}>{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <SectionHead label="Delivery Notes (Optional)" />
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. No ice please, arriving at hole in ~15 min…"
            style={{ width: '100%', height: 80, padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, color: G.text, background: '#F8F4EC', lineHeight: 1.6, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ padding: '12px 14px', background: G.card, borderRadius: 4, border: `1px solid ${G.border}`, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: 0 }}>Estimated delivery: <strong style={{ color: G.text }}>20–30 minutes</strong> to your hole</p>
        </div>
      </div>

      <div style={{ padding: '12px 20px 32px', background: G.bg, borderTop: `1px solid ${G.border}`, flexShrink: 0 }}>
        <div
          onClick={placeOrder}
          data-tap
          style={{ padding: '14px', background: cart.length > 0 && hole && !busy ? G.green : G.border, borderRadius: 4, textAlign: 'center', cursor: cart.length > 0 && hole && !busy ? 'pointer' : 'not-allowed' }}
        >
          <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: cart.length > 0 && hole && !busy ? '#F2EDE0' : G.muted, fontWeight: 500 }}>
            {busy ? 'Placing order…' : !hole ? 'Select a delivery hole to continue' : `Place Order · $${cartTotal}`}
          </span>
        </div>
        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginTop: 8 }}>{err}</p>}
      </div>
    </div>
  );
}
