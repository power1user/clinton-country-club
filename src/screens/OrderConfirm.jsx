import { useState, useEffect } from 'react';
import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { Brass } from '../components/Buttons.jsx';

export default function OrderConfirm({ params }) {
  const { goTab, clearCart } = useNav();
  const [countdown, setCountdown] = useState(25);
  const hole = params?.hole || 5;

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 60000);
    return () => clearInterval(t);
  }, []);

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
        <p style={{ fontFamily: '"Lora",serif', fontSize: 15, color: G.muted, margin: '0 0 6px', fontStyle: 'italic' }}>Delivering to Hole {hole}</p>
        <div style={{ marginTop: 8, marginBottom: 28, padding: '14px 20px', background: G.card, borderRadius: 6, width: '100%', border: `1px solid ${G.border}` }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 4px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Estimated Arrival</p>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 32, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1 }}>
            {countdown} <span style={{ fontSize: 14, fontWeight: 400, fontFamily: '"Lora",serif', color: G.muted }}>min</span>
          </p>
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 28px', lineHeight: 1.6 }}>Our team has received your order. We'll bring it out to hole {hole} as soon as it's ready.</p>
        <Brass onPress={() => { clearCart(); goTab('food'); }} style={{ width: '100%', padding: '13px' }}>Done</Brass>
      </div>
    </div>
  );
}
