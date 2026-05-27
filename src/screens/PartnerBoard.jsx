// Golf Partner Board — members post requests for tee-time partners
// and browse other members' open posts.
//
// v0.9.3 redesign per Marc's spec. The card surfaces FOUR essentials
// at a glance, in priority order, without tapping in:
//   1. WHO is posting        — avatar + name
//   2. WHAT type of game     — chip: Foursome / Threesome / Single / etc
//   3. WHEN they want to play — chip: Sat May 24 (omitted if open-ended)
//   4. HOW many spots needed — chip: "3 spots needed"
// Plus HCP as a small optional tag if provided. Everything else
// (member-since, tier, free-form note) is secondary and de-emphasized.
//
// Compose flow matches the same minimalism:
//   · Game type chip selector  · Date picker
//   · Spots needed (1-3)       · Optional HCP  · Optional short note
// Post in under 30 seconds.
//
// Contact button — three states:
//   A. DM available  → "Message" button → get_or_create_dm RPC
//                      (requires: club DMs enabled AND poster has
//                      user_id AND poster's allow_dms !== false)
//   B. Clubhouse fallback → "Contact via clubhouse" → new thread
//                      with subject "Golf Partner Inquiry: ..."
//                      (always available unless viewer can't write)
//   C. Neither → button hidden, plain-text "Contact at the front desk"
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
import Avatar from '../components/Avatar.jsx';
import FeatureOff from '../components/FeatureOff.jsx';

const GAME_TYPES = ['Foursome', 'Threesome', 'Single', 'Practice', 'Cart Share'];

// Compact date chip — "Sat May 24" — for the "when" pill on a card.
function fmtDateChip(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T12:00:00');   // noon to dodge tz edge cases
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// One reusable chip component so all four card pills share spacing/feel.
function Chip({ children, tone = 'brass' }) {
  const tones = {
    brass: { bg: 'rgba(155,122,30,0.10)', fg: G.brass },
    green: { bg: 'rgba(82,193,120,0.12)', fg: G.openTxt },
    red:   { bg: 'rgba(107,32,32,0.12)',  fg: G.clsDot },
    grey:  { bg: G.bg,                     fg: G.muted },
  };
  const { bg, fg } = tones[tone] || tones.brass;
  return (
    <span style={{ fontFamily: '"Lora",serif', fontSize: 10, fontWeight: 700, color: fg, textTransform: 'uppercase', letterSpacing: '0.06em', background: bg, padding: '3px 8px', borderRadius: 3, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export default function PartnerBoard() {
  const { data: posts, refresh } = usePartnerPosts();
  const { club, member, session, canMemberWrite, isGuest } = useAuth();
  const dmsOn = useFlag('dms');
  const profilePhotosOn = useFlag('profile_photos');
  const partnerBoardOn = useFlag('partner_board');
  const { push } = useNav();
  const [scrollRef, onScroll] = useScrollRestore();
  const [cat, setCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState(null);

  if (!partnerBoardOn) return <FeatureOff label="Golf Partners" />;
  if (isGuest) return <FeatureOff label="Golf Partners" body="Finding playing partners is for club members only." />;

  const cats = [{ id: 'all', l: 'All' }, ...GAME_TYPES.map(g => ({ id: g, l: g }))];
  const filtered = cat === 'all' ? posts : posts.filter(p => (p.gameType || p.cat) === cat);

  // Decide which contact path applies to a given post. Returned
  // values: 'dm' | 'clubhouse' | 'none'. 'none' means we hide the
  // button entirely and show plain text.
  const contactMode = (p) => {
    if (!canMemberWrite) return 'none';           // pending member can't message
    const canDm = dmsOn && p.authorUserId && p.authorUserId !== session?.user?.id && p.authorAllowDms;
    if (canDm) return 'dm';
    return 'clubhouse';
  };

  const contact = async (p) => {
    if (!session?.user?.id || !club || busyId) return;
    const mode = contactMode(p);
    if (mode === 'none') return;
    setBusyId(p.id); setErr(null);
    try {
      if (mode === 'dm') {
        const { data: threadId, error } = await supabase.rpc('get_or_create_dm', {
          p_other_user_id: p.authorUserId,
        });
        if (error) throw error;
        push('thread', { threadId });
        return;
      }
      // Clubhouse fallback — subject ties back to the partner post
      // so the front office can route the inquiry.
      const subject = `Golf Partner Inquiry: ${synthTitle(p)}`;
      const { data: thread, error: tErr } = await supabase
        .from('threads')
        .insert({ club_id: club.id, kind: 'clubhouse', subject, created_by: session.user.id })
        .select()
        .single();
      if (tErr) throw tErr;
      const { error: pErr } = await supabase
        .from('thread_participants')
        .insert({ thread_id: thread.id, user_id: session.user.id, member_id: member?.id || null, role: 'member' });
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
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: cat === c.id ? '#F2EDE0' : '#A8D8B8', fontWeight: cat === c.id ? 600 : 400, whiteSpace: 'nowrap' }}>{c.l}</span>
          </div>
        ))}
      </div>

      {err && (
        <div onClick={() => setErr(null)} data-tap style={{ background: 'rgba(224,84,84,0.10)', borderBottom: `1px solid ${G.clsDot}`, padding: '8px 16px', cursor: 'pointer' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, margin: 0 }}>{err} <span style={{ color: G.muted }}>· tap to dismiss</span></p>
        </div>
      )}

      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 80px' }}>
        {filtered.length === 0 && (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, textAlign: 'center', padding: '40px 0' }}>
            No partner requests yet. Tap + to post the first one.
          </p>
        )}
        {filtered.map(p => {
          const whenChip = fmtDateChip(p.dateWanted);
          const isOwn = p.authorUserId && p.authorUserId === session?.user?.id;
          const busy = busyId === p.id;
          const mode = contactMode(p);
          const game = p.gameType || p.cat || 'Partner';
          const spotsLabel = p.spotsNeeded != null
            ? `${p.spotsNeeded} ${p.spotsNeeded === 1 ? 'spot' : 'spots'} needed`
            : null;
          const note = p.body && p.body.trim() ? p.body.trim() : null;
          return (
            <div key={p.id} style={{ marginBottom: 10, padding: '10px 12px', background: G.card, borderRadius: 4, border: `1px solid ${G.border}` }}>
              {/* Row 1: WHO + HCP tag (top-right). Avatar + name front and center. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Avatar photoUrl={profilePhotosOn ? p.authorPhotoUrl : null} name={p.author} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 600, margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.author}</p>
                  {p.authorTier && (
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.authorTier}</p>
                  )}
                </div>
                {p.hcp != null && (
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 10, fontWeight: 700, color: G.brass, background: 'rgba(155,122,30,0.10)', padding: '3px 8px', borderRadius: 3, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    HCP: {p.hcp}
                  </span>
                )}
              </div>

              {/* Row 2: WHAT / WHEN / SPOTS chips — the four essentials laid bare */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: note ? 6 : 8 }}>
                <Chip tone="brass">{game}</Chip>
                {whenChip && <Chip tone="green">{whenChip}</Chip>}
                {spotsLabel && <Chip tone="brass">{spotsLabel}</Chip>}
                {!p.open && <Chip tone="red">Filled</Chip>}
              </div>

              {/* Optional secondary note — only renders if author actually wrote one */}
              {note && (
                <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 8px', lineHeight: 1.4 }}>{note}</p>
              )}

              {/* Row 3: action — DM / clubhouse / plain-text-fallback */}
              {p.open && !isOwn && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minHeight: 28 }}>
                  {mode === 'none' ? (
                    <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted }}>
                      To contact, ask the front desk.
                    </span>
                  ) : (
                    <div
                      onClick={busy ? undefined : () => contact(p)}
                      data-tap
                      style={{
                        padding: '5px 14px',
                        background: busy ? G.muted : G.green,
                        borderRadius: 3,
                        cursor: busy ? 'wait' : 'pointer',
                      }}
                    >
                      <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#F2EDE0', fontWeight: 500 }}>
                        {busy ? 'Opening…' : (mode === 'dm' ? 'Message' : 'Contact via clubhouse')}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {isOwn && (
                <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10, color: G.muted, margin: 0, textAlign: 'right' }}>
                  Your post · posted {p.date}
                </p>
              )}

              {/* Public reply thread — for "count me in" / "what tee?" */}
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

// Synthesize a one-line title for the clubhouse-fallback subject and
// for any legacy reader that still expects `title`. Form looks like
// "Foursome · Sat May 24 · 3 spots" or "Single · open date" etc.
function synthTitle(p) {
  const game = p.gameType || p.cat || 'Partner';
  const when = fmtDateChip(p.dateWanted) || 'open date';
  const spots = p.spotsNeeded != null
    ? ` · ${p.spotsNeeded} ${p.spotsNeeded === 1 ? 'spot' : 'spots'}`
    : '';
  return `${game} · ${when}${spots}`;
}

function NewPartnerSheet({ onClose, onSubmitted, club, member }) {
  const [gameType, setGameType] = useState('Foursome');
  const [dateWanted, setDateWanted] = useState('');
  const [spotsNeeded, setSpotsNeeded] = useState(1);
  // Prepopulate handicap from the member's saved value so common case
  // is zero-typing. Manually editable for one-off rounds where they
  // want to declare a different range.
  const [hcp, setHcp] = useState(() => {
    if (member?.hcp == null || member?.hcp === '') return '';
    const n = parseInt(member.hcp, 10);
    return Number.isFinite(n) ? String(n) : '';
  });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async () => {
    if (!club || !member || busy) return;
    setBusy(true); setErr(null);
    const hcpInt = hcp === '' ? null : parseInt(hcp, 10);
    // title + body stay populated for back-compat with anything that
    // still reads them (e.g. old admin moderation views). Synthesized
    // values mirror what the card would display.
    const title = `${gameType} · ${spotsNeeded} ${spotsNeeded === 1 ? 'spot' : 'spots'}${dateWanted ? ` · ${fmtDateChip(dateWanted)}` : ''}`;
    const body = note.trim() || null;
    const { error } = await supabase.from('partner_posts').insert({
      club_id: club.id,
      member_id: member.id,
      game_type: gameType,
      category: gameType,                   // legacy mirror
      spots_needed: spotsNeeded,
      hcp: Number.isFinite(hcpInt) ? hcpInt : null,
      date_wanted: dateWanted || null,
      title,
      body,
      is_open: true,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSubmitted?.();
    onClose();
  };

  const labelStyle = { fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 };
  const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 16, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.65)', display: 'flex', alignItems: 'flex-end', zIndex: 10 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 20px 40px', width: '100%', maxHeight: '90%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text, margin: 0 }}>Find a Partner</h3>
          <div onClick={onClose} data-tap style={{ cursor: 'pointer', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        {/* Game type chips */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Game Type</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GAME_TYPES.map(g => (
              <div key={g} onClick={() => setGameType(g)} data-tap style={{ padding: '8px 12px', borderRadius: 3, background: gameType === g ? G.green : G.card, border: `1px solid ${gameType === g ? G.green : G.border}`, cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: gameType === g ? '#F2EDE0' : G.muted, fontWeight: gameType === g ? 600 : 400 }}>{g}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Date */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>When</label>
          <input type="date" value={dateWanted} onChange={e => setDateWanted(e.target.value)} style={inputStyle} />
        </div>

        {/* Spots needed — +/- stepper for one-tap adjustments */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Spots Needed</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div onClick={() => setSpotsNeeded(Math.max(1, spotsNeeded - 1))} data-tap style={{ width: 38, height: 38, borderRadius: 3, background: G.card, border: `1px solid ${G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.text} strokeWidth="2"><path d="M5 12h14" /></svg>
            </div>
            <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 22, fontWeight: 700, color: G.text, minWidth: 32, textAlign: 'center' }}>{spotsNeeded}</span>
            <div onClick={() => setSpotsNeeded(Math.min(7, spotsNeeded + 1))} data-tap style={{ width: 38, height: 38, borderRadius: 3, background: G.card, border: `1px solid ${G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.text} strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            </div>
            <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, marginLeft: 8 }}>{spotsNeeded === 1 ? 'looking for 1 more' : `looking for ${spotsNeeded}`}</span>
          </div>
        </div>

        {/* Optional handicap */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Your Handicap (optional)</label>
          <input
            type="number"
            inputMode="numeric"
            value={hcp}
            onChange={e => setHcp(e.target.value.replace(/[^\d-]/g, '').slice(0, 3))}
            placeholder="e.g. 12"
            style={inputStyle}
          />
        </div>

        {/* Optional short note */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Note (optional)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 280))}
            placeholder="Anything specific? Tee time, skill level, format…"
            style={{ ...inputStyle, height: 70, lineHeight: 1.5, resize: 'none' }}
          />
        </div>

        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}
        <div onClick={busy ? undefined : submit} data-tap style={{ padding: 12, background: busy ? G.border : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'not-allowed' : 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Posting…' : 'Post'}</span>
        </div>
      </div>
    </div>
  );
}
