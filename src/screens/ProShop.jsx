import { G } from '../theme.js';
import { BackHeader, SectionHead } from '../components/Headers.jsx';
import { DATA_PROSHOP } from '../data/mock.js';

export default function ProShop() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Pro Shop" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 24px' }}>
        <SectionHead label="Current Specials" />
        {DATA_PROSHOP.map(item => (
          <div key={item.id} style={{ padding: '14px 14px', background: G.card, borderRadius: 4, marginBottom: 10, border: `1px solid ${G.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: 0, flex: 1, paddingRight: 10, lineHeight: 1.25 }}>{item.name}</h3>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.brass, textTransform: 'uppercase', letterSpacing: '0.07em', background: 'rgba(155,122,30,0.1)', padding: '2px 7px', borderRadius: 2, flexShrink: 0 }}>{item.tag}</span>
            </div>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 8px' }}>{item.desc}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text }}>{item.now}</span>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, textDecoration: 'line-through' }}>{item.was}</span>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 16, padding: '14px 16px', background: G.card, borderRadius: 4, border: `1px solid ${G.border}` }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 4px' }}>Club Fitting Available</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: '0 0 10px', lineHeight: 1.55 }}>Schedule a complimentary fitting session with our PGA professionals. Available Tuesday–Sunday, 8am–5pm.</p>
          <div data-tap style={{ padding: '9px 16px', background: G.green, borderRadius: 3, cursor: 'pointer', display: 'inline-block' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0' }}>Schedule a Fitting</span>
          </div>
        </div>
      </div>
    </div>
  );
}
