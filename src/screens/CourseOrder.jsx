import { useState, useMemo } from 'react';
import { G } from '../theme.js';
import { useNav, priceToNumber } from '../hooks/useNav.jsx';
import { BackHeader, SectionHead } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useBrand } from '../hooks/useBrand.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { supabase, isConfigured } from '../lib/supabase.js';
import { useAnalytics } from '../hooks/useAnalytics.js';
import PendingGuard from '../components/PendingGuard.jsx';

// v0.10.18 — Order type pivot: To-Go vs Eat-In.
//   · 'to_go'  — member picks up at the clubhouse window.
//   · 'eat_in' — member dines at the clubhouse.
//
// Both flows end with the member walking off the course to the
// clubhouse. The difference is whether they take the food with
// them (to_go) or sit down to eat it (eat_in). On-course delivery
// (v0.10.15) is gone — staff finding members on 18 holes proved
// operationally messy.
//
// What's the hole picker for, then? It's the kitchen's primary
// timing signal: the member's current hole + the club's typical
// hole-completion time tells staff when to fire the order so it
// matches the member's arrival at the clubhouse. Both order types
// use it.
//
// Migration 60 backfilled existing 'delivery' rows to 'to_go' and
// updated the CHECK constraint to ('to_go', 'eat_in') only.

const PICKUP_INCREMENT_MIN = 15;
const PICKUP_DEFAULT_OFFSET_MIN = 30;
const PICKUP_OPTION_COUNT = 16; // 16 × 15min = 4 hours of ahead-time

// Build "12:45 PM" style labels for the pickup-time options.
function fmtPickup(d) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// Round a date UP to the next PICKUP_INCREMENT_MIN-minute boundary.
function roundUpToIncrement(d) {
  const out = new Date(d);
  out.setSeconds(0, 0);
  const remainder = out.getMinutes() % PICKUP_INCREMENT_MIN;
  if (remainder !== 0) out.setMinutes(out.getMinutes() + (PICKUP_INCREMENT_MIN - remainder));
  return out;
}

export default function CourseOrder() {
  const { pop, push, cart, addToCart, removeFromCart, cartTotal } = useNav();
  const { club, member, canMemberWrite } = useAuth();
  const brand = useBrand();
  const { trackEvent } = useAnalytics();
  // v0.12.5 — pickup-time picker is now manager-opt-in. Default off
  // (the catalog default) — when off, the picker section disappears
  // and orders submit with requested_pickup_time = null (kitchen
  // queue treats null as ASAP, same as if the member tapped the
  // ASAP chip explicitly).
  const pickupTimeOn = useFlag('food_pickup_time');
  const [orderType, setOrderType] = useState('to_go');
  const [hole, setHole] = useState(null);
  const [pickupTime, setPickupTime] = useState(''); // ISO string when set; '' = ASAP
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // Pre-compute the pickup-time picker options once per mount. Build
  // forward from the next quarter-hour after "now + default offset"
  // so the first option is always a sane default.
  const pickupOptions = useMemo(() => {
    const start = new Date();
    start.setMinutes(start.getMinutes() + PICKUP_DEFAULT_OFFSET_MIN);
    const firstSlot = roundUpToIncrement(start);
    const out = [];
    for (let i = 0; i < PICKUP_OPTION_COUNT; i++) {
      const d = new Date(firstSlot);
      d.setMinutes(d.getMinutes() + i * PICKUP_INCREMENT_MIN);
      out.push({ iso: d.toISOString(), label: fmtPickup(d) });
    }
    return out;
  }, []);

  if (!canMemberWrite) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
        <BackHeader title="Order Ahead" />
        <PendingGuard action="place food orders" />
      </div>
    );
  }

  // Validation: hole is required for both types — it's the kitchen's
  // timing signal. Pickup time stays optional (blank = ASAP, fire
  // whenever the order rotates to the top of the queue).
  const submitReady = cart.length > 0 && hole != null && !busy;

  const placeOrder = async () => {
    if (!submitReady) return;
    if (!isConfigured || !club || !member) {
      push('food/confirm', { orderType, hole, notes, pickupTime });
      return;
    }
    setBusy(true); setErr(null);
    const { error } = await supabase.from('food_orders').insert({
      club_id: club.id,
      member_id: member.id,
      items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
      order_type: orderType,
      hole,
      location_note: notes || null,
      requested_pickup_time: pickupTime || null,
      subtotal: parseFloat(cartTotal),
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    // v0.10.16 — GA4 event. PII-free: item_count + order_type only.
    trackEvent('food_order_placed', {
      item_count: cart.reduce((n, i) => n + (i.qty || 1), 0),
      order_type: orderType,
    });
    push('food/confirm', { orderType, hole, notes, pickupTime });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Order Ahead" />
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
                <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: 0 }}>{item.price || 'Ask staff for price'} each</p>
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
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, fontWeight: 600, color: G.text, minWidth: 44, textAlign: 'right' }}>${(item.qty * priceToNumber(item.price)).toFixed(2)}</span>
            </div>
          ))}
          {cart.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `2px solid ${G.border}` }}>
              <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text }}>Subtotal</span>
              <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text }}>${cartTotal}</span>
            </div>
          )}
        </div>

        {/* v0.10.18 — Order type picker: To-Go vs Eat-In. Both end
            at the clubhouse; the choice signals staff how to plate
            and serve (counter handoff vs sit-down setup). */}
        {cart.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionHead label="How will you have your order?" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { id: 'to_go', label: 'To-Go', sub: 'Grab and head out from the clubhouse window.', icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2l1 4h10l1-4" />
                    <path d="M5 6h14l-1 14H6L5 6z" />
                    <path d="M9 10v6M15 10v6" />
                  </svg>
                )},
                { id: 'eat_in', label: 'Eat In', sub: 'Sit down at the clubhouse and dine.', icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    {/* fork + knife glyph */}
                    <path d="M7 2v10a2 2 0 002 2h0v8" />
                    <path d="M5 2v6" />
                    <path d="M9 2v6" />
                    <path d="M16 2c-1.5 0-3 1.5-3 4v6h2v10h2V2z" />
                  </svg>
                )},
              ].map(opt => {
                const selected = orderType === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setOrderType(opt.id)}
                    data-tap
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 14px',
                      background: selected ? G.green : G.card,
                      border: `1.5px solid ${selected ? G.green : G.border}`,
                      borderRadius: 4, cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: selected ? 'rgba(168,216,184,0.15)' : G.bg, color: selected ? '#A8D8B8' : G.brass, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {opt.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: selected ? '#F2EDE0' : G.text, margin: 0 }}>{opt.label}</p>
                      <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: selected ? '#A8D8B8' : G.muted, margin: '2px 0 0' }}>{opt.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hole picker — always shown for both order types. It's the
            kitchen's primary timing signal: current hole + typical
            pace = when to fire. */}
        {cart.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionHead label="What hole are you on?" />
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 10px' }}>
              So the kitchen can time your order to your walk-off.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Array.from({ length: brand.holes }, (_, i) => i + 1).map(n => (
                <div key={n} onClick={() => setHole(n)} data-tap style={{ width: 42, height: 42, borderRadius: 3, background: hole === n ? G.green : G.card, border: `1.5px solid ${hole === n ? G.green : G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 13, fontWeight: hole === n ? 700 : 500, color: hole === n ? '#F2EDE0' : G.text }}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pickup / arrival time — optional for both types. Blank =
            "fire whenever it bubbles up the queue."
            v0.12.5 — gated behind the food_pickup_time flag. Off by
            default; manager opts in from Features → Dining when the
            club wants the call-ahead window. */}
        {cart.length > 0 && pickupTimeOn && (
          <div style={{ marginBottom: 20 }}>
            <SectionHead label={orderType === 'eat_in' ? 'When would you like to be seated?' : 'When would you like to pick up?'} />
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 10px' }}>
              Optional — leave blank for as soon as you walk in.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <div
                onClick={() => setPickupTime('')}
                data-tap
                style={{
                  padding: '8px 14px', borderRadius: 16,
                  background: pickupTime === '' ? G.green : G.card,
                  border: `1.5px solid ${pickupTime === '' ? G.green : G.border}`,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, fontWeight: pickupTime === '' ? 700 : 500, color: pickupTime === '' ? '#F2EDE0' : G.text }}>ASAP</span>
              </div>
              {pickupOptions.map(opt => (
                <div
                  key={opt.iso}
                  onClick={() => setPickupTime(opt.iso)}
                  data-tap
                  style={{
                    padding: '8px 14px', borderRadius: 16,
                    background: pickupTime === opt.iso ? G.green : G.card,
                    border: `1.5px solid ${pickupTime === opt.iso ? G.green : G.border}`,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 12, fontWeight: pickupTime === opt.iso ? 700 : 500, color: pickupTime === opt.iso ? '#F2EDE0' : G.text }}>{opt.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {cart.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionHead label="Notes (Optional)" />
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. extra ranch, hold the onions, finishing in ~30 min…"
              style={{ width: '100%', height: 80, padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, color: G.text, background: '#F8F4EC', lineHeight: 1.6, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {cart.length > 0 && (
          <div style={{ padding: '12px 14px', background: G.card, borderRadius: 4, border: `1px solid ${G.border}`, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: 0 }}>
              Our team will do our best to have your order <strong style={{ color: G.text }}>ready for you at the clubhouse</strong>.
            </p>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 20px 32px', background: G.bg, borderTop: `1px solid ${G.border}`, flexShrink: 0 }}>
        <div
          onClick={placeOrder}
          data-tap
          style={{ padding: '14px', background: submitReady ? G.green : G.border, borderRadius: 4, textAlign: 'center', cursor: submitReady ? 'pointer' : 'not-allowed' }}
        >
          <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: submitReady ? '#F2EDE0' : G.muted, fontWeight: 500 }}>
            {busy
              ? 'Placing order…'
              : hole == null
                ? 'Select your current hole to continue'
                : `Place Order · $${cartTotal}`}
          </span>
        </div>
        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginTop: 8 }}>{err}</p>}
      </div>
    </div>
  );
}
