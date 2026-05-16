import { useState, useEffect, useRef } from 'react';
import { G, gCfg } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase, isConfigured } from '../lib/supabase.js';
import { useClubStatus, usePaceOfPlay, usePinPlacements } from '../hooks/useClubData.jsx';

const SECTIONS = [
  { id: 'status', l: 'Club Status' },
  { id: 'news',   l: 'Post News' },
  { id: 'pace',   l: 'Pace of Play' },
  { id: 'pins',   l: 'Pin Positions' },
];

export default function AdminPanel() {
  const { club, member, isAdmin } = useAuth();
  const [sec, setSec] = useState('status');

  if (!isAdmin) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
        <BackHeader title="Staff Admin" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
          <h2 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 22, color: G.muted, margin: '0 0 8px' }}>Staff access only</h2>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, lineHeight: 1.6 }}>Contact the pro shop if you need administrator access.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Staff Admin" right={<span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brassLt }}>{member?.name || 'Staff'}</span>} />
      <div style={{ display: 'flex', background: G.greenMid, flexShrink: 0, overflowX: 'auto' }}>
        {SECTIONS.map(s => (
          <div key={s.id} onClick={() => setSec(s.id)} data-tap style={{ padding: '10px 14px', cursor: 'pointer', flexShrink: 0, borderBottom: sec === s.id ? `2px solid ${G.brass}` : '2px solid transparent', marginBottom: -1 }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: sec === s.id ? '#F2EDE0' : '#7AAC88', fontWeight: sec === s.id ? 600 : 400 }}>{s.l}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 28px' }}>
        {sec === 'status' && <StatusAdmin club={club} />}
        {sec === 'news'   && <NewsAdmin club={club} />}
        {sec === 'pace'   && <PaceAdmin club={club} />}
        {sec === 'pins'   && <PinsAdmin club={club} />}
      </div>
    </div>
  );
}

// ─── Status pills editor ───────────────────────────────────────────────────
function StatusAdmin({ club }) {
  const { data: pills, loading } = useClubStatus();
  const [draft, setDraft] = useState({});       // { category: { state, hours_note, staff_note } }
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const dirty = useRef(false);

  // Re-sync the draft whenever fresh data arrives — UNLESS the user has
  // unsaved edits, in which case we leave them alone so realtime doesn't
  // clobber what they're typing.
  useEffect(() => {
    if (dirty.current) return;
    const next = {};
    for (const p of pills) {
      next[p.id] = { state: p.st, hours_note: p.hrs, staff_note: p.note };
    }
    setDraft(next);
  }, [pills]);

  const setField = (cat, k, v) => {
    dirty.current = true;
    setDraft(p => ({ ...p, [cat]: { ...p[cat], [k]: v } }));
  };

  const publish = async () => {
    if (!isConfigured || !club) return;
    setBusy(true);
    const updates = pills.map(p => ({
      category: p.id,
      state: draft[p.id]?.state || p.st,
      hours_note: draft[p.id]?.hours_note ?? p.hrs,
      staff_note: draft[p.id]?.staff_note ?? p.note,
    }));
    for (const u of updates) {
      await supabase
        .from('club_status')
        .update({ state: u.state, hours_note: u.hours_note, staff_note: u.staff_note })
        .eq('club_id', club.id)
        .eq('category', u.category);
    }
    dirty.current = false;
    setBusy(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
  };

  if (loading) return <Loading label="Loading current status…" />;

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 14px' }}>Changes publish in real time to every member's home screen.</p>
      {pills.map(item => {
        const d = draft[item.id] || { state: item.st, hours_note: item.hrs, staff_note: item.note };
        return (
          <div key={item.id} style={{ padding: '13px 14px', background: G.card, borderRadius: 4, marginBottom: 9, border: `1px solid ${G.border}` }}>
            <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 10px' }}>{item.label}</h4>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {['open', 'limited', 'closed'].map(st => (
                <div key={st} onClick={() => setField(item.id, 'state', st)} data-tap style={{ flex: 1, padding: '6px 0', textAlign: 'center', borderRadius: 3, cursor: 'pointer', background: d.state === st ? gCfg(st).bg : G.bg, border: `1px solid ${d.state === st ? 'transparent' : G.border}`, transition: 'all 0.15s' }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: d.state === st ? '#F2EDE0' : G.muted, textTransform: 'capitalize' }}>{st}</span>
                </div>
              ))}
            </div>
            <input
              value={d.hours_note}
              onChange={e => setField(item.id, 'hours_note', e.target.value)}
              placeholder="Hours, e.g. 11:30am – 8:30pm"
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 11, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box', marginBottom: 6 }}
            />
            <input
              value={d.staff_note}
              onChange={e => setField(item.id, 'staff_note', e.target.value)}
              placeholder="Staff note…"
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 11, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        );
      })}
      <div onClick={publish} data-tap style={{ marginTop: 14, padding: 12, background: savedAt ? G.openBg : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer', transition: 'background 0.3s' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>
          {busy ? 'Publishing…' : savedAt ? '✓ Published to all members' : 'Publish Changes'}
        </span>
      </div>
    </div>
  );
}

// ─── News composer ─────────────────────────────────────────────────────────
function NewsAdmin({ club }) {
  const [cat, setCat] = useState('Events');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [dateLabel, setDateLabel] = useState('Today');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const publish = async () => {
    if (!headline || !body || !club) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from('news').insert({
      club_id: club.id,
      category: cat,
      headline,
      body,
      date_label: dateLabel || 'Today',
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setHeadline(''); setBody('');
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Publishes immediately to all member devices.</p>
      <div>
        <label style={labelStyle}>Category</label>
        <select value={cat} onChange={e => setCat(e.target.value)} style={selectStyle}>
          {['Events', 'Course', 'Dining', 'Club', 'General'].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Headline</label>
        <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Enter headline…" style={{ ...inputStyle, fontFamily: '"Playfair Display",serif', fontSize: 16 }} />
      </div>
      <div>
        <label style={labelStyle}>Body</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your announcement…" style={{ ...inputStyle, height: 110, lineHeight: 1.6, resize: 'none', fontSize: 12 }} />
      </div>
      <div>
        <label style={labelStyle}>Date label (what members see)</label>
        <input value={dateLabel} onChange={e => setDateLabel(e.target.value)} placeholder="Today, May 14, etc." style={inputStyle} />
      </div>
      {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, margin: 0 }}>{err}</p>}
      <div onClick={publish} data-tap style={{ padding: 12, background: done ? G.openBg : (headline && body && !busy ? G.green : G.border), borderRadius: 3, textAlign: 'center', cursor: headline && body && !busy ? 'pointer' : 'not-allowed' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Publishing…' : done ? '✓ Published' : 'Publish'}</span>
      </div>
    </div>
  );
}

// ─── Pace editor ───────────────────────────────────────────────────────────
function PaceAdmin({ club }) {
  const { data: pace, loading } = usePaceOfPlay();
  const [state, setState] = useState('open');
  const [timeLabel, setTimeLabel] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (dirty.current) return;
    if (pace) {
      setState(pace.state || 'open');
      setTimeLabel(pace.time_label || '');
      setMessage(pace.message || '');
    }
  }, [pace?.state, pace?.time_label, pace?.message]);

  const markDirty = (setter) => (v) => { dirty.current = true; setter(v); };

  const publish = async () => {
    if (!club) return;
    setBusy(true);
    await supabase
      .from('pace_of_play')
      .update({ state, time_label: timeLabel, message })
      .eq('club_id', club.id);
    dirty.current = false;
    setBusy(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
  };

  if (loading) return <Loading label="Loading current pace…" />;

  const options = [
    { state: 'open',    label: 'On pace' },
    { state: 'limited', label: 'Slightly slow' },
    { state: 'closed',  label: 'Significantly slow' },
  ];

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 14px' }}>Set the current pace of play indicator visible to all members.</p>
      {options.map(o => (
        <div key={o.state} onClick={() => markDirty(setState)(o.state)} data-tap style={{ padding: '12px 14px', background: state === o.state ? gCfg(o.state).bg : G.card, borderRadius: 4, marginBottom: 8, border: `1px solid ${state === o.state ? 'transparent' : G.border}`, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: gCfg(o.state).dot, flexShrink: 0 }} />
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: state === o.state ? '#F2EDE0' : G.text }}>{o.label}</span>
        </div>
      ))}
      <div style={{ marginTop: 10 }}>
        <label style={labelStyle}>Current time (e.g. 4h 12m)</label>
        <input value={timeLabel} onChange={e => markDirty(setTimeLabel)(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={labelStyle}>Message (optional)</label>
        <input value={message} onChange={e => markDirty(setMessage)(e.target.value)} placeholder="On pace, slowing on the back nine, etc." style={inputStyle} />
      </div>
      <div onClick={publish} data-tap style={{ marginTop: 14, padding: 12, background: savedAt ? G.openBg : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Updating…' : savedAt ? '✓ Updated' : 'Update Pace'}</span>
      </div>
    </div>
  );
}

// ─── Pin placements editor (per-hole) ──────────────────────────────────────
function PinsAdmin({ club }) {
  const { data: holes, loading } = usePinPlacements();
  const [hole, setHole] = useState(1);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const dirty = useRef(false);
  const h = holes[hole - 1] || holes[0];

  // Re-sync when the selected hole's data arrives or changes — but only when
  // the user hasn't been editing.
  useEffect(() => {
    if (dirty.current) return;
    if (h) setDraft({ pin_position: h.pin, green_condition: h.grn, hazard_note: h.haz });
  }, [hole, h?.n, h?.pin, h?.grn, h?.haz]);

  const setField = (k, v) => {
    dirty.current = true;
    setDraft(d => ({ ...d, [k]: v }));
  };

  const selectHole = (n) => { dirty.current = false; setHole(n); };

  const publish = async () => {
    if (!club || !h) return;
    setBusy(true);
    const today = new Date().toISOString().slice(0, 10);
    await supabase
      .from('pin_placements')
      .update({
        pin_position: draft.pin_position,
        green_condition: draft.green_condition,
        hazard_note: draft.hazard_note,
      })
      .eq('club_id', club.id)
      .eq('hole_number', h.n)
      .eq('effective_date', today);
    dirty.current = false;
    setBusy(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
  };

  if (loading) return <Loading label="Loading pin placements…" />;
  if (!h) return null;

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 14px' }}>Update conditions for today's pin placements. Select a hole below.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {holes.map(hd => (
          <div key={hd.n} onClick={() => selectHole(hd.n)} data-tap style={{ width: 36, height: 36, borderRadius: 3, background: hole === hd.n ? G.brass : G.card, border: `1px solid ${hole === hd.n ? G.brass : G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, fontWeight: hole === hd.n ? 700 : 500, color: hole === hd.n ? '#1B3A2D' : G.text }}>{hd.n}</span>
          </div>
        ))}
      </div>
      <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: '0 0 12px' }}>Hole {h.n} · Par {h.par} · {h.yds} yards</h4>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Pin Position</label>
        <input value={draft.pin_position || ''} onChange={e => setField('pin_position', e.target.value)} style={inputStyle} placeholder="e.g. Front-right, 6 paces from edge" />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Green Condition</label>
        <input value={draft.green_condition || ''} onChange={e => setField('green_condition', e.target.value)} style={inputStyle} placeholder="e.g. Firm and fast — stimp 11" />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Hazard Note</label>
        <input value={draft.hazard_note || ''} onChange={e => setField('hazard_note', e.target.value)} style={inputStyle} placeholder="e.g. Cart path only — irrigation" />
      </div>
      <div onClick={publish} data-tap style={{ marginTop: 14, padding: 12, background: savedAt ? G.openBg : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Updating…' : savedAt ? `✓ Hole ${h.n} updated` : `Update Hole ${h.n}`}</span>
      </div>
    </div>
  );
}

// ─── Loading state ─────────────────────────────────────────────────────────
function Loading({ label }) {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted }}>{label}</p>
    </div>
  );
}

// ─── Shared form styles ────────────────────────────────────────────────────
const labelStyle = { fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };
const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' };
const selectStyle = { ...inputStyle };
