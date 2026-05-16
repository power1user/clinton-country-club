import { useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { Brass } from '../components/Buttons.jsx';
import { usePartnerPosts } from '../hooks/useClubData.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabase.js';

export default function PartnerBoard() {
  const { data: posts, refresh } = usePartnerPosts();
  const { club, member } = useAuth();
  const [cat, setCat] = useState('all');
  const [contact, setContact] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const cats = [{ id: 'all', l: 'All' }, { id: 'Foursome', l: 'Foursome' }, { id: 'Single', l: 'Single' }, { id: 'Cart Share', l: 'Cart Share' }];
  const filtered = cat === 'all' ? posts : posts.filter(p => p.cat === cat);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Golf Partners" />
      <div style={{ display: 'flex', gap: 0, padding: '0 16px', background: G.greenMid, flexShrink: 0, overflowX: 'auto' }}>
        {cats.map(c => (
          <div key={c.id} onClick={() => setCat(c.id)} data-tap style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: cat === c.id ? `2px solid ${G.brass}` : '2px solid transparent', marginBottom: -1 }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: cat === c.id ? '#F2EDE0' : '#7AAC88', fontWeight: cat === c.id ? 600 : 400 }}>{c.l}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 80px' }}>
        {filtered.map(p => (
          <div key={p.id} style={{ marginBottom: 12, padding: '14px 16px', background: G.card, borderRadius: 4, border: `1px solid ${G.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 9, fontWeight: 700, color: G.brass, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(155,122,30,0.1)', padding: '2px 8px', borderRadius: 2 }}>{p.cat}</span>
                {!p.open && <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.clsDot, background: 'rgba(107,32,32,0.1)', padding: '2px 8px', borderRadius: 2 }}>Filled</span>}
              </div>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted }}>{p.date}</span>
            </div>
            <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: '0 0 6px', lineHeight: 1.25 }}>{p.title}</h3>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, lineHeight: 1.55, margin: '0 0 10px' }}>{p.body}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, fontWeight: 500 }}>{p.author} <span style={{ color: G.muted, fontWeight: 400 }}>· Hcp {p.hcp}</span></span>
              {p.open && (
                <div onClick={() => setContact(p)} data-tap style={{ padding: '5px 14px', background: G.green, borderRadius: 3, cursor: 'pointer' }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#F2EDE0', fontWeight: 500 }}>Contact</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 20, right: 20 }}>
        <div onClick={() => setShowForm(true)} data-tap style={{ width: 50, height: 50, borderRadius: '50%', background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F2EDE0" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
        </div>
      </div>
      {showForm && <NewPartnerSheet onClose={() => setShowForm(false)} onSubmitted={refresh} club={club} member={member} />}
      {contact && (
        <div onClick={() => setContact(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.6)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '24px 24px 40px', width: '100%' }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, margin: '0 0 4px' }}>Contacting</p>
            <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 20, fontWeight: 700, color: G.text, margin: '0 0 16px' }}>{contact.author}</h3>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '0 0 20px', lineHeight: 1.6 }}>Your contact information will be shared with this member. They will reach out directly.</p>
            <Brass onPress={() => setContact(null)} style={{ width: '100%', padding: '13px' }}>Send Contact Request</Brass>
          </div>
        </div>
      )}
    </div>
  );
}

function NewPartnerSheet({ onClose, onSubmitted, club, member }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cat, setCat] = useState('Foursome');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    if (!title || !body || !club || !member) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from('partner_posts').insert({
      club_id: club.id,
      member_id: member.id,
      category: cat,
      title,
      body,
      hcp: member.hcp ? parseInt(member.hcp, 10) || null : null,
      is_open: true,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSubmitted?.();
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.65)', display: 'flex', alignItems: 'flex-end', zIndex: 10 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 20px 40px', width: '100%', maxHeight: '85%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text, margin: 0 }}>New Partner Post</h3>
          <div onClick={onClose} data-tap style={{ cursor: 'pointer', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Category</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Foursome', 'Single', 'Threesome', 'Cart Share', 'Practice'].map(c => (
              <div key={c} onClick={() => setCat(c)} data-tap style={{ padding: '8px 12px', borderRadius: 3, background: cat === c ? G.green : G.card, border: `1px solid ${cat === c ? G.green : G.border}`, cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: cat === c ? '#F2EDE0' : G.muted }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Looking for 3 — Saturday 8am" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Playfair Display",serif', fontSize: 15, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Details</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Day, time, format, handicap preference…" style={{ width: '100%', height: 90, padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', lineHeight: 1.6, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}
        <div onClick={submit} data-tap style={{ padding: 12, background: title && body && !busy ? G.green : G.border, borderRadius: 3, textAlign: 'center', cursor: title && body && !busy ? 'pointer' : 'not-allowed' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: title && body && !busy ? '#F2EDE0' : G.muted, fontWeight: 500 }}>{busy ? 'Posting…' : 'Publish Post'}</span>
        </div>
      </div>
    </div>
  );
}
