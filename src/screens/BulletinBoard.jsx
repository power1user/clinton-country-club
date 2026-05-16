import { useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useBulletinPosts } from '../hooks/useClubData.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase } from '../lib/supabase.js';

function NewPostSheet({ onClose, onSubmitted, club, member }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cat, setCat] = useState('Classifieds');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    if (!title || !body || !club || !member) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from('bulletin_posts').insert({
      club_id: club.id,
      member_id: member.id,
      category: cat,
      title,
      body,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSubmitted?.();
    setDone(true);
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.65)', display: 'flex', alignItems: 'flex-end', zIndex: 10 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 20px 40px', width: '100%', maxHeight: '85%', overflowY: 'auto' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: G.openBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={G.openDot} strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text, margin: '0 0 8px' }}>Post Published</h3>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 20px' }}>Your post is now live on the Bulletin Board.</p>
            <div onClick={onClose} data-tap style={{ padding: '11px 28px', background: G.green, borderRadius: 3, cursor: 'pointer', display: 'inline-block' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>Done</span>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text, margin: 0 }}>New Post</h3>
              <div onClick={onClose} data-tap style={{ cursor: 'pointer', padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Category</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Classifieds', 'Wanted', 'General'].map(c => (
                  <div key={c} onClick={() => setCat(c)} data-tap style={{ flex: 1, padding: '8px 0', textAlign: 'center', borderRadius: 3, background: cat === c ? G.green : G.card, border: `1px solid ${cat === c ? G.green : G.border}`, cursor: 'pointer' }}>
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: cat === c ? '#F2EDE0' : G.muted }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you posting about?" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Playfair Display",serif', fontSize: 15, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Details</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Describe your item, request, or message…" style={{ width: '100%', height: 90, padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', lineHeight: 1.6, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}
            <div onClick={submit} data-tap style={{ padding: 12, background: title && body && !busy ? G.green : G.border, borderRadius: 3, textAlign: 'center', cursor: title && body && !busy ? 'pointer' : 'not-allowed' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: title && body && !busy ? '#F2EDE0' : G.muted, fontWeight: 500 }}>{busy ? 'Posting…' : 'Publish Post'}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BulletinBoard() {
  const { data: posts, refresh } = useBulletinPosts();
  const { club, member } = useAuth();
  const [cat, setCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const cats = [{ id: 'all', l: 'All' }, { id: 'Classifieds', l: 'Classifieds' }, { id: 'Wanted', l: 'Wanted' }, { id: 'General', l: 'General' }];
  const tagColors = { Classifieds: G.brass, Wanted: G.limDot, General: G.muted };
  const filtered = cat === 'all' ? posts : posts.filter(p => p.cat === cat);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader
        title="Bulletin Board"
        right={
          <div onClick={() => setShowForm(true)} data-tap style={{ padding: '5px 12px', border: '1px solid rgba(122,172,136,0.4)', borderRadius: 3, cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#A8D8B8' }}>+ Post</span>
          </div>
        }
      />
      <div style={{ display: 'flex', background: G.greenMid, flexShrink: 0, padding: '0 16px' }}>
        {cats.map(c => (
          <div key={c.id} onClick={() => setCat(c.id)} data-tap style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: cat === c.id ? `2px solid ${G.brass}` : '2px solid transparent', marginBottom: -1 }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: cat === c.id ? '#F2EDE0' : '#7AAC88', fontWeight: cat === c.id ? 600 : 400 }}>{c.l}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
        {filtered.map(post => (
          <div key={post.id} style={{ marginBottom: 10, padding: '14px 14px', background: G.card, borderRadius: 4, border: `1px solid ${G.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 9, fontWeight: 700, color: tagColors[post.cat] || G.muted, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(155,122,30,0.09)', padding: '2px 8px', borderRadius: 2 }}>{post.cat}</span>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted }}>{post.date}</span>
            </div>
            <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: '0 0 5px', lineHeight: 1.25 }}>{post.title}</h3>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, lineHeight: 1.55, margin: '0 0 10px' }}>{post.body}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, fontWeight: 500 }}>{post.author}</span>
              <div style={{ padding: '5px 14px', border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, fontWeight: 500, color: G.text }}>Reply</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {showForm && <NewPostSheet onClose={() => setShowForm(false)} onSubmitted={refresh} club={club} member={member} />}
    </div>
  );
}
