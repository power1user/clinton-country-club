// DisplayModePicker — lives in the Appearance section of Settings.
//
// Three segmented options (light / medium / dark) that write to
// members.display_mode. The active mode applies immediately via the
// data-theme attribute on <html> driven by useAuth.
//
// Hidden when the club has the display_mode feature flag off — the
// effective mode is forced to 'medium' in that case via useAuth so
// a half-broken theme doesn't persist if a club later disables the
// feature.
import { useState } from 'react';
import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { supabase } from '../lib/supabase.js';

const MODES = [
  { id: 'light',  label: 'Light',  sub: 'Brighter, airier' },
  { id: 'medium', label: 'Medium', sub: 'Default' },
  { id: 'dark',   label: 'Dark',   sub: 'Easier at night' },
];

export default function DisplayModePicker() {
  const { member, refreshMember } = useAuth();
  const enabled = useFlag('display_mode');
  const current = member?.display_mode || 'medium';
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (!enabled || !member?.id) return null;

  const onPick = async (mode) => {
    if (busy || mode === current) return;
    setBusy(true); setErr(null);
    const { error } = await supabase
      .from('members')
      .update({ display_mode: mode })
      .eq('id', member.id);
    setBusy(false);
    if (error) {
      setErr("Couldn't save. Try again.");
      return;
    }
    await refreshMember?.();
  };

  return (
    <div style={{ padding: '12px 16px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 6 }}>
      <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 4px' }}>Display mode</p>
      <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 10px', lineHeight: 1.45 }}>
        Background brightness only — your club's brand colors stay the same.
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        {MODES.map(m => {
          const active = current === m.id;
          return (
            <div
              key={m.id}
              onClick={() => onPick(m.id)}
              data-tap
              aria-pressed={active}
              style={{
                flex: 1,
                padding: '10px 8px',
                background: active ? G.green : 'transparent',
                border: `1px solid ${active ? G.green : G.border}`,
                borderRadius: 4,
                cursor: busy ? 'wait' : 'pointer',
                textAlign: 'center',
                opacity: busy ? 0.7 : 1,
              }}
            >
              <p style={{ fontFamily: '"Lora",serif', fontSize: 12, fontWeight: active ? 600 : 500, color: active ? '#F2EDE0' : G.text, margin: 0, lineHeight: 1.2 }}>{m.label}</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: active ? '#A8D8B8' : G.muted, margin: '2px 0 0' }}>{m.sub}</p>
            </div>
          );
        })}
      </div>
      {err && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.clsDot, margin: '8px 0 0' }}>{err}</p>
      )}
    </div>
  );
}
