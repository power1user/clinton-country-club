// Member directory — searchable roster of fellow members with a
// 'Message' button per row. Only reachable from MyClub when the
// manager has enabled member-to-member DMs.
//
// Tap Message → calls the get_or_create_dm() Postgres function which
// either returns an existing DM thread between the two of us or
// creates a new one. We then navigate to that thread.
import { useEffect, useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNav } from '../hooks/useNav.jsx';
import { supabase } from '../lib/supabase.js';
import PendingGuard from '../components/PendingGuard.jsx';

export default function MemberDirectory() {
  const { club, member, session, canMemberWrite } = useAuth();
  const { push } = useNav();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('id, user_id, name, membership_number, tier, status')
        .eq('club_id', club.id)
        .not('user_id', 'is', null)    // only members with accounts can be messaged
        .neq('status', 'inactive')
        .order('name', { ascending: true });
      if (cancelled) return;
      if (!error) setMembers(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [club?.id]);

  // Exclude the current user from the directory list
  const others = members.filter(m => m.user_id !== session?.user?.id);
  const filtered = q
    ? others.filter(m =>
        (m.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (m.membership_number || '').toLowerCase().includes(q.toLowerCase())
      )
    : others;

  const message = async (other) => {
    if (busyId || !other.user_id) return;
    setBusyId(other.id); setErr(null);
    const { data, error } = await supabase.rpc('get_or_create_dm', { p_other_user_id: other.user_id });
    setBusyId(null);
    if (error) { setErr(error.message); return; }
    push('thread', { threadId: data });
  };

  if (!canMemberWrite) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
        <BackHeader title="Member Directory" />
        <PendingGuard action="message other members" />
      </div>
    );
  }

  // Defensive — if a member somehow lands here while DMs are disabled
  // (manager toggle), show a friendly message
  if (!club?.enable_member_dms) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
        <BackHeader title="Member Directory" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, margin: 0 }}>
            Member-to-member messaging is currently turned off at this club.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Member Directory" />

      <div style={{ padding: '14px 16px 10px', flexShrink: 0 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name or member #"
          style={{
            width: '100%', padding: '10px 12px',
            border: `1px solid ${G.border}`, borderRadius: 3,
            fontFamily: '"Lora",serif', fontSize: 13, color: G.text,
            background: '#F8F4EC', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, margin: '0 16px 8px', textAlign: 'center' }}>{err}</p>}

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px' }}>
        {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '40px 0', textAlign: 'center' }}>Loading…</p>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0 }}>
              {q ? 'No members match your search.' : 'No other members in the directory yet.'}
            </p>
          </div>
        )}
        {filtered.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 6, gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.membership_number ? `#${m.membership_number} · ` : ''}{m.tier || 'Member'}
              </p>
            </div>
            <div
              onClick={() => message(m)}
              data-tap
              style={{
                padding: '7px 12px',
                background: busyId === m.id ? G.muted : G.green,
                borderRadius: 3,
                cursor: busyId ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                flexShrink: 0,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F2EDE0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#F2EDE0', fontWeight: 500 }}>
                {busyId === m.id ? '…' : 'Message'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
