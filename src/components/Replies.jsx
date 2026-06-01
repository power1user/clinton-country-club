// Replies — reusable threaded-reply component for any member-generated
// content (bulletin posts, partner posts, event RSVPs, pro shop
// inquiries, …). All data lives in public.post_replies, keyed by
// (post_table, post_id).
//
// Usage:
//   <Replies postTable="bulletin_posts" postId={post.id} />
//
// Renders:
//   · A header row with the reply count + a "show/hide" toggle so
//     the reply list doesn't dominate the parent card by default
//   · Reply list (when expanded): each reply shows author name +
//     initial + relative time + body. Members can delete their own.
//   · Compose box for adding a new reply (pending-member-aware via
//     useAuth.canMemberWrite)
//
// Live updates via realtime subscription on (post_table, post_id) so
// new replies appear without a refresh.
import { useEffect, useRef, useState } from 'react';
import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase, isConfigured } from '../lib/supabase.js';

// Short relative time — "just now", "5m", "2h", "Mar 4"
function rel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60)        return 'just now';
  if (s < 3600)      return `${Math.floor(s / 60)}m`;
  if (s < 86400)     return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Replies({ postTable, postId, defaultOpen = false }) {
  const { club, session, member, canMemberWrite } = useAuth();
  const [replies, setReplies] = useState([]);
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (!isConfigured || !club || !postId) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from('post_replies')
        .select('id, body, member_id, user_id, created_at, members(name)')
        .eq('post_table', postTable)
        .eq('post_id', postId)
        .eq('hidden', false)
        .order('created_at', { ascending: true });
      if (cancelled) return;
      setReplies(data || []);
      setLoading(false);
    };
    load();

    // Realtime subscription — server filter is by post_id (post_table
    // change would require a different filter). Cheaper than no filter
    // because most clubs have small reply volumes per post.
    const channel = supabase
      .channel(`post_replies:${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_replies', filter: `post_id=eq.${postId}` }, () => load())
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [postTable, postId, club?.id]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || busy || !club || !session?.user?.id) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from('post_replies').insert({
      club_id: club.id,
      post_table: postTable,
      post_id: postId,
      member_id: member?.id || null,
      user_id: session.user.id,
      body,
    });
    setBusy(false);
    if (error) {
      setErr(error.message?.includes('row-level security')
        ? "You don't have permission to reply here."
        : (error.message || "Couldn't post your reply. Try again."));
      return;
    }
    setDraft('');
    setOpen(true);   // reveal the list so they see their reply land
  };

  const removeOwn = async (id) => {
    if (!confirm('Delete this reply?')) return;
    const { error } = await supabase.from('post_replies').delete().eq('id', id);
    if (error) setErr(error.message);
  };

  const count = replies.length;
  // Empty + collapsed is the most common state — just render the toggle.
  // Open OR has-content gets the full panel.
  if (loading) return null;

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${G.border}` }}>
      <div
        onClick={() => setOpen(o => !o)}
        data-tap
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '2px 0' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.8"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, flex: 1 }}>
          {count === 0 ? 'Add a reply' : `${count} ${count === 1 ? 'reply' : 'replies'}`}
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {open && (
        <div style={{ marginTop: 8 }}>
          {replies.map(r => {
            const isOwn = r.user_id === session?.user?.id;
            const name = r.members?.name || 'Anonymous';
            return (
              <div key={r.id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: `1px solid ${G.border}` }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: '#A8D8B8', fontWeight: 700 }}>
                    {name.trim().charAt(0).toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, fontWeight: 600 }}>{name}</span>
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted }}>{rel(r.created_at)}</span>
                    {isOwn && (
                      <span
                        onClick={(e) => { e.stopPropagation(); removeOwn(r.id); }}
                        data-tap
                        style={{ marginLeft: 'auto', fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
                      >
                        delete
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: '2px 0 0', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {r.body}
                  </p>
                </div>
              </div>
            );
          })}

          {canMemberWrite ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginTop: 10 }}>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Write a reply…"
                rows={1}
                disabled={busy}
                style={{
                  flex: 1, minWidth: 0,
                  padding: '8px 10px',
                  border: `1px solid ${G.border}`,
                  borderRadius: 14,
                  fontFamily: '"Lora",serif',
                  fontSize: 16,    // keeps iOS from auto-zooming on focus
                  color: G.text,
                  background: G.card,
                  outline: 'none',
                  resize: 'none',
                  maxHeight: 90,
                  lineHeight: 1.4,
                  boxSizing: 'border-box',
                  opacity: busy ? 0.6 : 1,
                }}
              />
              <div
                onClick={busy ? undefined : submit}
                data-tap
                style={{
                  width: 32, height: 32,
                  borderRadius: '50%',
                  background: draft.trim() && !busy ? G.green : G.border,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: draft.trim() && !busy ? 'pointer' : 'not-allowed',
                  flexShrink: 0,
                }}
                aria-label="Post reply"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={draft.trim() && !busy ? '#F2EDE0' : G.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </div>
            </div>
          ) : (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '10px 0 0', textAlign: 'center' }}>
              Membership pending — replies open once your account is approved.
            </p>
          )}
          {err && (
            <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.clsDot, margin: '6px 0 0' }}>{err}</p>
          )}
        </div>
      )}
    </div>
  );
}
