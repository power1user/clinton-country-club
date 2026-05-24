// Golf Partner Board — members post requests for tee-time partners and
// browse other members' open posts.
//
// Card surfaces at-a-glance: poster (with circle initial + tier + Hcp),
// game type (foursome / single / etc) as a chip, the date they want to
// play (if specified) as a second chip, and a Contact action.
//
// Contact flow:
//  · If DMs are on AND we know the poster's user_id → open or create a
//    DM with that user (uses get_or_create_dm RPC).
//  · Otherwise (DMs disabled per-club, or the poster is an anonymous /
//    orphan record with no user_id) → open a clubhouse thread with
//    subject "Golf Partner Inquiry: <post title>" so the front office
//    can route them. Never a dead-end button.
import { useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { usePartnerPosts } from '../hooks/useClubData.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { useNav } from '../hooks/useNav.jsx';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import { supabase } from '../lib/supabase.js';
import Replies from '../components/Replies.jsx';

// Pretty short date — "Sat May 24" — for the "when" chip on a card.
function fmtDateChip(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T12:00:00');   // noon to dodge tz edge cases
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function PartnerBoard() {
  const { data: posts, refresh } = usePartnerPosts();
  const { club, member, session, canMemberWrite } = useAuth();
  const dmsOn = useFlag('dms');
  const { push } = useNav();
  const [scrollRef, onScroll] = useScrollRestore();
  const [cat, setCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState(null);

  const cats = [{ id: 'all', l: 'All' }, { id: 'Foursome', l: 'Foursome' }, { id: 'Single', l: 'Single' }, { id: 'Cart Share', l: 'Cart Share' }];
  const filtered = cat === 'all' ? posts : posts.filter(p => p.cat === cat);

  // Open or create the right kind of thread for contacting the poster.
  // Returns silently after navigation; we surface errors via the `err`
  // banner just under the category nav.
  const contact = async (p) => {
    if (!session?.user?.id || !club || busyId) return;
    setBusyId(p.id); setErr(null);

    // Can we open a real DM? Need: DMs enabled at the club, and the
    // post has a known author user_id (orphan/anonymous posts can't
    // be DM'd — fall through to clubhouse).
    const canDm = dmsOn && p.authorUserId && p.authorUserId !== session.user.id;

    try {
      if (canDm) {
        const { data: threadId, error } = await supabase.rpc('get_or_create_dm', {
          p_other_user_id: p.authorUserId,
        });
        if (error) throw error;
        push('thread', { threadId });
        return;
      }
      // Fallback path — clubhouse thread with subject tying back to
      // the partner post. Same pattern as MessageClubhouse.startThread.
      const subject = `Golf Partner Inquiry: ${p.title}`;
      const { data: thread, error: tErr } = await supabase
        .from('threads')
        .insert({
          club_id: club.id,
          kind: 'clubhouse',
          subject,
          created_by: session.user.id,
        })
        .select()
        .single();
      if (tErr) throw tErr;
      const { error: pErr } = await supabase
        .from('thread_participants')
        .insert({
          thread_id: thread.id,
          user_id: session.user.id,
          member_id: member?.id || null,
          role: 'member',
        });
      if (pErr) throw pErr;
      push('thread', { threadId: thread.id });
    } catch (e) {
      setErr(e?.message?.includes('row-level security')
        ? "You don't have permission to contact this poster."
        : (e?.message || 'Could not open the conversation. Try again.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Golf Partners" />
      <div style={{ display: 'flex', gap: 0, padding: '0 16px', background: G.greenMid, flexShrink: 0, overflowX: 'auto' }}>
        {cats.map(c => (
          <div key={c.id} onClick={() => setCat(c.id)} data-tap style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: cat === c.id ? `2px solid ${G.brass}` : '2px solid transparent', marginBottom: -1 }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: cat === c.id ? '#F2EDE0' : '#A8D8B8', fontWeight: cat === c.id ? 600 : 400 }}>{c.l}</span>
          </div>
        ))}
      </div>

      {err && (
        <div onClick={() => setErr(null)} data-tap style={{ background: 'rgba(224,84,84,0.10)', borderBottom: `1px solid ${G.clsDot}`, padding: '8px 16px', cursor: 'pointer' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, margin: 0 }}>{err} <span style={{ color: G.muted }}>· tap to dismiss</span></p>
        </div>
      )}

      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 80px' }}>
        {filtered.length === 0 && (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, textAlign: 'center', padding: '40px 0' }}>
            No partner requests yet. Tap + to post the first one.
          </p>
        )}
        {filtered.map(p => {
          const whenChip = fmtDateChip(p.dateWanted);
          const isOwn = p.authorUserId && p.authorUserId === session?.user?.id;
          const busy = busyId === p.id;
          return (
            <div key={p.id} style={{ marginBottom: 12, padding: '14px 16px', background: G.card, borderRadius: 4, border: `1px solid ${G.border}` }}>
              {/* Top chips row: game type, when, filled status, posted-on */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 9, fontWeight: 700, color: G.brass, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(155,122,30,0.1)', padding: '2px 8px', borderRadius: 2 }}>{p.cat || 'Partner'}</span>
                  {whenChip && (
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 9, fontWeight: 700, color: G.openTxt, textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(82,193,120,0.10)', padding: '2px 8px', borderRadius: 2 }}>{whenChip}</span>
                  )}
                  {!p.open && <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.clsDot, background: 'rgba(107,32,32,0.1)', padding: '2px 8px', borderRadius: 2 }}>Filled</span>}
                </div>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, flexShrink: 0 }}>{p.date}</span>
              </div>

              {/* Author row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#A8D8B8', fontWeight: 700 }}>
                    {(p.author || '?').trim().charAt(0).toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, fontWeight: 600, margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.author}</p>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '1px 0 0' }}>
                    {[
                      p.authorTier,
                      p.authorSince && `Member since ${p.authorSince}`,
                      p.hcp != null && `Hcp ${p.hcp}`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: '0 0 6px', lineHeight: 1.25 }}>{p.title}</h3>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, lineHeight: 1.55, margin: '0 0 10px' }}>{p.body}</p>

              {/* Contact action — DMs the poster when DMs are on; routes
                  through the clubhouse otherwise so the button is never
                  a dead end. Suppressed on the member's own posts. */}
              {p.open && !isOwn && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div
                    onClick={busy ? undefined : () => contact(p)}
                    data-tap
                    style={{
                      padding: '6px 16px',
                      background: busy ? G.muted : G.green,
                      borderRadius: 3,
                      cursor: busy ? 'wait' : 'pointer',
                    }}
                  >
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#F2EDE0', fontWeight: 500 }}>
                      {busy ? 'Opening…' : (dmsOn && p.authorUserId ? 'Message' : 'Contact via clubhouse')}
                    </span>
                  </div>
                </div>
              )}
              {isOwn && (
                <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10, color: G.muted, margin: 0, textAlign: 'right' }}>
                  Your post
                </p>
              )}

              {/* Public reply thread — always available, regardless of
                  DM availability or whose post it is. Lets members
                  coordinate publicly ("count me in" / "what tee?") */}
              <Replies postTable="partner_posts" postId={p.id} />
            </div>
          );
        })}
      </div>

      <div style={{ position: 'absolute', bottom: 20, right: 20 }}>
        <div onClick={() => setShowForm(true)} data-tap style={{ width: 50, height: 50, borderRadius: '50%', background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F2EDE0" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
        </div>
      </div>
      {showForm && <NewPartnerSheet onClose={() => setShowForm(false)} onSubmitted={refresh} club={club} member={member} />}
    </div>
  );
}

function NewPartnerSheet({ onClose, onSubmitted, club, member }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cat, setCat] = useState('Foursome');
  const [dateWanted, setDateWanted] = useState('');
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
      date_wanted: dateWanted || null,
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
          <label style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Game Type</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Foursome', 'Single', 'Threesome', 'Cart Share', 'Practice'].map(c => (
              <div key={c} onClick={() => setCat(c)} data-tap style={{ padding: '8px 12px', borderRadius: 3, background: cat === c ? G.green : G.card, border: `1px solid ${cat === c ? G.green : G.border}`, cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: cat === c ? '#F2EDE0' : G.muted }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>When</label>
          <input type="date" value={dateWanted} onChange={e => setDateWanted(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 16, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Looking for 3 — Saturday 8am" style={{ width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Playfair Display",serif', fontSize: 16, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Details</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Day, time, format, handicap preference…" style={{ width: '100%', height: 90, padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 16, color: G.text, background: '#F8F4EC', lineHeight: 1.6, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}
        <div onClick={submit} data-tap style={{ padding: 12, background: title && body && !busy ? G.green : G.border, borderRadius: 3, textAlign: 'center', cursor: title && body && !busy ? 'pointer' : 'not-allowed' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: title && body && !busy ? '#F2EDE0' : G.muted, fontWeight: 500 }}>{busy ? 'Posting…' : 'Publish Post'}</span>
        </div>
      </div>
    </div>
  );
}
