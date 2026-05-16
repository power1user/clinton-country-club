import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useBrand } from '../hooks/useBrand.jsx';

export function StatusBar() {
  return (
    <div style={{ height: 44, background: G.green, flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: '0 20px 9px' }}>
      <span style={{ color: '#7AAC88', fontSize: 11, fontFamily: '"Lora",serif', fontWeight: 500 }}>9:41 AM</span>
      <span style={{ marginLeft: 'auto', color: '#7AAC88', fontSize: 10, letterSpacing: 2 }}>●●●</span>
    </div>
  );
}

export function ClubHeader({ title, subtitle, right }) {
  const brand = useBrand();
  return (
    <div style={{ background: G.green, padding: '4px 20px 14px', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 9, color: '#7AAC88', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 1px' }}>{brand.prefix}</p>
          <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.1 }}>{title}</h1>
        </div>
        {right}
      </div>
      {subtitle && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: '#7AAC88', margin: '6px 0 0' }}>{subtitle}</p>
      )}
    </div>
  );
}

export function BackHeader({ title, right }) {
  const { pop } = useNav();
  return (
    <div style={{ height: 50, background: G.green, display: 'flex', alignItems: 'center', padding: '0 16px', flexShrink: 0, gap: 12 }}>
      <div onClick={pop} data-tap style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 6px 6px 0', flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="2">
          <path d="M19 12H5M5 12l7-7M5 12l7 7" />
        </svg>
      </div>
      <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: '#F2EDE0', flex: 1, margin: 0, lineHeight: 1 }}>{title}</h2>
      {right}
    </div>
  );
}

export function SectionHead({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: G.border }} />
    </div>
  );
}
