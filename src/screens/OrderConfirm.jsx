import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { Brass } from '../components/Buttons.jsx';

export default function OrderConfirm({ params }) {
  const { goTab, clearCart } = useNav();
  const hole = params?.hole || null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <div style={{ height: 50, background: G.green, display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0 }}>
        <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: '#F2EDE0', margin: 0 }}>Order Placed</h2>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 28px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: G.openBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={G.openDot} strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: G.text, margin: '0 0 10px' }}>Order Confirmed</h2>
        {hole && (
          <p style={{ fontFamily: '"Lora",serif', fontSize: 15, color: G.muted, margin: '0 0 6px', fontStyle: 'italic' }}>You're currently on hole {hole}</p>
        )}
        <div style={{ marginTop: 14, marginBottom: 24, padding: '16px 20px', background: G.card, borderRadius: 6, width: '100%', border: `1px solid ${G.border}` }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 6px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pickup</p>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1.3 }}>
            Ready at the clubhouse
          </p>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '6px 0 0' }}>
            when you finish your round
          </p>
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 28px', lineHeight: 1.6 }}>
          The kitchen has your order. Stop by the clubhouse when you walk off the {hole ? `back nine` : 'course'} — it'll be ready.
        </p>
        <Brass onPress={() => { clearCart(); goTab('food'); }} style={{ width: '100%', padding: '13px' }}>Done</Brass>
      </div>
    </div>
  );
}
