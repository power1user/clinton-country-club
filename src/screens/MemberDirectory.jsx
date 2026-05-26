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
import { useFlag } from '../hooks/useFlag.js';
import { useNav } from '../hooks/useNav.jsx';
import { supabase } from '../lib/supabase.js';
import PendingGuard from '../components/PendingGuard.jsx';
import Avatar from '../components/Avatar.jsx';
import FeatureOff from '../components/FeatureOff.jsx';

export default function MemberDirectory() {
  const { club, member, session, canMemberWrite, isGuest } = useAuth();
  // Two flags split deliberately: member_directory controls whether
  // members can see the roster at all; dms controls whether the
  // per-row Message button shows. A club can show a browse-only
  // roster by enabling directory while keeping DMs off.
  const directoryOn = useFlag('member_directory');
  const dmsOn = useFlag('dms');
  const profilePhotosOn = useFlag('profile_photos');
  const { push } = useNav();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    // allow_dms pulled so the per-row Message button can hide for
    // members who've opted out (v0.6.3). user_id filter keeps
    // out members who haven't claimed their account yet.
    const load = async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, user_id, name, membership_number, tier, status, allow_dms, photo_url')
        .eq('club_id', club.id)
        .not('user_id', 'is', null)
        .neq('status', 'inactive')
        .order('name', { ascending: true });
      if (cancelled) return;
      if (!error) setMembers(data || []);
      setLoading(false);
    };
    setLoading(true);
    load();

    // v0.7.1: realtime subscription on members. Was missing despite
    // v0.5.7's audit claiming it was wired ("MemberDirectory (inline
    // in component)") — either the audit was wrong or a refactor
    // stripped it. Restored here so the directory updates live when
    // someone joins, uploads a photo, changes name, toggles DM opt-
    // out, or gets activated/deactivated. Same pattern used by every
    // other member-facing hook in useClubData.
    const channel = supabase
      .channel(`members_directory:${club.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `club_id=eq.${club.id}` },
        () => load(),
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id]);

  // v0.8.2: guest gate. Placed AFTER all hook calls (rules of hooks).
  // The data load above is a no-op for guests since RLS denies SELECT
  // on members for them, but the hooks still need to run.
  if (isGuest) return <FeatureOff label="Member Directory" body="The member directory is only available to club members." />;

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

  // Defensive — if a member somehow lands here while the directory
  // flag is off (deep link, stale tab, manager just disabled), show a
  // friendly message.
  if (!directoryOn) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
        <BackHeader title="Member Directory" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, margin: 0 }}>
            The member directory is currently turned off at this club.
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
            <Avatar photoUrl={profilePhotosOn ? m.photo_url : null} name={m.name} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.membership_number ? `#${m.membership_number} · ` : ''}{m.tier || 'Member'}
              </p>
            </div>
            {/* Message button only when:
                · DMs are enabled at the club level (dmsOn), AND
                · This target hasn't opted out (m.allow_dms !== false)
                The RPC server-side enforces the same two checks, so
                a hand-crafted call to get_or_create_dm against an
                opted-out member also fails. */}
            {dmsOn && m.allow_dms !== false && (
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
