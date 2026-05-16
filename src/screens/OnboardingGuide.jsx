import { useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useOnboarding } from '../hooks/useClubData.jsx';
import { useBrand } from '../hooks/useBrand.jsx';

export default function OnboardingGuide() {
  const [open, setOpen] = useState('welcome');
  const { data: ONBOARDING } = useOnboarding();
  const brand = useBrand();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Member Guide" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 28px' }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 20, fontWeight: 700, color: G.text, margin: '0 0 4px' }}>Welcome to {brand.prefix}</h2>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0, lineHeight: 1.6 }}>Everything you need to know about your membership.</p>
        </div>
        {ONBOARDING.map(section => (
          <div key={section.id} style={{ marginBottom: 8, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
            <div onClick={() => setOpen(open === section.id ? null : section.id)} data-tap style={{ padding: '13px 14px', background: open === section.id ? G.green : G.card, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{section.icon}</span>
              <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: open === section.id ? '#F2EDE0' : G.text, flex: 1 }}>{section.title}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={open === section.id ? '#A8D8B8' : G.muted} strokeWidth="2">
                <path d={open === section.id ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} />
              </svg>
            </div>
            {open === section.id && (
              <div style={{ padding: '14px 16px', background: G.bg, borderTop: `1px solid ${G.border}` }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, lineHeight: 1.75, margin: 0 }}>{section.body}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
