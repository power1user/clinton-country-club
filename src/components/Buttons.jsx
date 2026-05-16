import { G } from '../theme.js';

export function Brass({ children, onPress, style = {} }) {
  return (
    <div
      onClick={onPress}
      data-tap
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 22px', background: G.green, borderRadius: 3, cursor: 'pointer', ...style }}
    >
      <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{children}</span>
    </div>
  );
}

export function GhostBtn({ children, onPress, style = {} }) {
  return (
    <div
      onClick={onPress}
      data-tap
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '10px 22px', border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer', ...style }}
    >
      <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text }}>{children}</span>
    </div>
  );
}
