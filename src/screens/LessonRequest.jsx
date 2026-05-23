import { useState } from 'react';
import { G } from '../theme.js';
import { BackHeader, SectionHead } from '../components/Headers.jsx';
import { Brass } from '../components/Buttons.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase, isConfigured } from '../lib/supabase.js';
import PendingGuard from '../components/PendingGuard.jsx';

const PROS = [
  { id: 'james', name: 'James Thornton, PGA', sub: 'Head Professional',         rate: '$125 / 45 min' },
  { id: 'sarah', name: 'Sarah Calloway, PGA', sub: 'Teaching Professional',    rate: '$95 / 45 min' },
  { id: 'mike',  name: 'Mike Ferrante, LPGA', sub: "Junior & Women's Programs", rate: '$90 / 45 min' },
];
const FOCUSES = ['Full Swing', 'Short Game', 'Putting', 'Bunker Play', 'Course Management', 'Junior Lesson'];

export default function LessonRequest() {
  const { club, member, canMemberWrite } = useAuth();
  const [pro, setPro] = useState(null);
  const [date, setDate] = useState('');
  const [focus, setFocus] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const toggleFocus = (f) => setFocus(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const handleSubmit = async () => {
    if (!pro) return;
    if (!isConfigured || !club || !member) { setSubmitted(true); return; }
    setBusy(true); setErr(null);
    const proName = PROS.find(p => p.id === pro)?.name || pro;
    const { error } = await supabase.from('pro_shop_inquiries').insert({
      club_id: club.id,
      member_id: member.id,
      kind: 'lesson',
      pro: proName,
      preferred_date: date || null,
      focus_areas: focus,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
        <BackHeader title="Book a Lesson" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: G.openBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={G.openDot} strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
          </div>
          <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 22, fontWeight: 700, color: G.text, margin: '0 0 8px' }}>Request Sent</h2>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, margin: '0 0 6px' }}>with {PROS.find(p => p.id === pro)?.name}</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '0 0 28px', lineHeight: 1.6 }}>The pro shop will follow up by email to confirm your lesson time.</p>
          <Brass onPress={() => setSubmitted(false)}>Book Another</Brass>
        </div>
      </div>
    );
  }

  if (!canMemberWrite) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
        <BackHeader title="Book a Lesson" />
        <PendingGuard action="book lessons" />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Book a Lesson" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 24px' }}>
        <div style={{ marginBottom: 18 }}>
          <SectionHead label="Choose a Professional" />
          {PROS.map(p => (
            <div key={p.id} onClick={() => setPro(p.id)} data-tap style={{ padding: '13px 14px', background: pro === p.id ? G.green : G.card, borderRadius: 4, marginBottom: 8, border: `1.5px solid ${pro === p.id ? G.green : G.border}`, cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: pro === p.id ? G.greenMid : 'rgba(155,122,30,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={pro === p.id ? '#A8D8B8' : G.brass} strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: pro === p.id ? '#F2EDE0' : G.text, margin: '0 0 1px' }}>{p.name}</p>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: pro === p.id ? '#7AAC88' : G.muted, margin: 0 }}>{p.sub}</p>
                </div>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: pro === p.id ? G.brassLt : G.muted, flexShrink: 0 }}>{p.rate}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 18 }}>
          <SectionHead label="Preferred Date" />
          <input value={date} onChange={e => setDate(e.target.value)} type="date" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <SectionHead label="Focus Areas (select all that apply)" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {FOCUSES.map(f => (
              <div key={f} onClick={() => toggleFocus(f)} data-tap style={{ padding: '7px 14px', borderRadius: 3, background: focus.includes(f) ? G.green : G.card, border: `1px solid ${focus.includes(f) ? G.green : G.border}`, cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: focus.includes(f) ? '#F2EDE0' : G.text }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div onClick={handleSubmit} data-tap style={{ padding: 13, background: pro && !busy ? G.green : G.border, borderRadius: 4, textAlign: 'center', cursor: pro && !busy ? 'pointer' : 'not-allowed' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 14, color: pro && !busy ? '#F2EDE0' : G.muted, fontWeight: 500 }}>{busy ? 'Submitting…' : 'Submit Lesson Request'}</span>
        </div>
        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginTop: 8 }}>{err}</p>}
      </div>
    </div>
  );
}
