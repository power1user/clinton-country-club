import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { DATA_NEWS } from '../data/mock.js';

export default function NewsDetail({ params }) {
  const news = params?.news || DATA_NEWS[0];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Club News" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.brass }}>{news.cat}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: G.border, display: 'inline-block' }} />
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>{news.date}</span>
        </div>
        <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: G.text, margin: '0 0 16px', lineHeight: 1.25 }}>{news.head}</h1>
        <div style={{ height: 1, background: G.border, marginBottom: 16 }} />
        <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, lineHeight: 1.75, margin: 0 }}>{news.body}</p>

        <div style={{ marginTop: 28, padding: '16px', background: G.card, borderRadius: 4, border: `1px solid ${G.border}` }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 10px' }}>Related</p>
          {news.cat === 'Events' && <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 600, color: G.text, margin: 0, cursor: 'pointer' }}>→ View Events Calendar</p>}
          {news.cat === 'Course' && <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 600, color: G.text, margin: 0, cursor: 'pointer' }}>→ View Pin Placement Maps</p>}
          {news.cat === 'Dining' && <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 600, color: G.text, margin: 0, cursor: 'pointer' }}>→ View Dining Menu</p>}
        </div>
      </div>
    </div>
  );
}
