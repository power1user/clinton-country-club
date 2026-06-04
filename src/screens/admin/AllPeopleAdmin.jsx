// AllPeopleAdmin — v0.15.1 unified people view.
//
// Shows every person with ANY relation to the current club (member,
// guest, or staff) merged into one row. Calls all_people_at_club()
// RPC (migration 77).
//
// Read-only this patch. v0.15.2+ adds conversion/promote/demote
// actions per row.

import { useState, useEffect, useMemo } from 'react';
import { G } from '../../theme.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../hooks/useAuth.jsx';

function RelationChip({ rel }) {
  let label;
  let bg;
  if (rel.kind === 'member') {
    label = `Member${rel.status === 'pending' ? ' (pending)' : ''}`;
    bg = rel.status === 'pending' ? G.brass : G.green;
  } else if (rel.kind === 'guest') {
    label = `Guest${rel.status === 'pending_authentication' ? ' (unverified)' : ''}`;
    bg = rel.status === 'pending_authentication' ? G.brass : G.greenMid;
  } else if (rel.kind === 'staff') {
    label = rel.role === 'club_manager' ? 'Manager' : 'Admin';
    bg = G.brass;
  } else {
    label = rel.kind;
    bg = G.muted;
  }
  return (
    <span style={{
      fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0',
      background: bg, padding: '2px 8px', borderRadius: 2,
      textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700,
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

export default function AllPeopleAdmin() {
  const { club, isManager } = useAuth();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all | member | guest | staff
  // v0.15.2-4 — per-row action state
  const [actionFor, setActionFor] = useState(null);   // auth_user_id whose menu is open
  const [busyId, setBusyId] = useState(null);
  const [actionErr, setActionErr] = useState(null);

  const refresh = async () => {
    if (!club?.id) return;
    setLoading(true); setErr(null);
    const { data, error } = await supabase.rpc('all_people_at_club', { p_club_id: club.id });
    if (error) setErr(error.message);
    else setPeople(data || []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.id]);

  // ── Action handlers ─────────────────────────────────────────────
  const runAction = async (rpcName, args, personId, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusyId(personId);
    setActionErr(null);
    const { error } = await supabase.rpc(rpcName, args);
    setBusyId(null);
    setActionFor(null);
    if (error) {
      setActionErr(error.message);
      return;
    }
    await refresh();
  };

  const convertGuest = (p) => runAction(
    'convert_guest_to_member',
    { p_auth_user_id: p.auth_user_id, p_club_id: club.id, p_tier: 'standard', p_status: 'active' },
    p.auth_user_id,
    `Convert ${p.name} from guest to member?\n\nA new member row is created. Their guest record stays as history.`
  );

  const changeStatus = (p, to) => runAction(
    'change_member_status',
    { p_auth_user_id: p.auth_user_id, p_club_id: club.id, p_to_status: to },
    p.auth_user_id,
    null
  );

  const promote = (p, role) => runAction(
    'promote_member_to_staff',
    { p_auth_user_id: p.auth_user_id, p_club_id: club.id, p_role: role },
    p.auth_user_id,
    `Promote ${p.name} to ${role === 'club_manager' ? 'Manager' : 'Admin'}?\n\nThey'll gain admin access. Audited in people_audit_log.`
  );

  const demote = (p) => runAction(
    'demote_staff_to_member',
    { p_auth_user_id: p.auth_user_id, p_club_id: club.id },
    p.auth_user_id,
    `Demote ${p.name} back to member?\n\nThey lose all admin permissions at this club. Audited.`
  );

  // v0.15.4 — send a fresh magic link to the person's email.
  // Works for any user (members, guests, staff) — Supabase issues a
  // new OTP on every call regardless of previous state. The email
  // lands at the canonical {slug}.groundslive.com URL.
  const sendMagicLink = async (p) => {
    if (!p.email) {
      setActionErr('No email on file — add one in Manage Members first.');
      return;
    }
    setBusyId(p.auth_user_id);
    setActionErr(null);
    setActionFor(null);
    const redirect = club?.slug ? `https://${club.slug}.groundslive.com/` : window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: p.email,
      options: { emailRedirectTo: redirect },
    });
    setBusyId(null);
    if (error) {
      setActionErr(`Couldn't send: ${error.message}`);
      return;
    }
    setActionErr(`✓ Magic link sent to ${p.email}`);
    setTimeout(() => setActionErr(null), 4000);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (people || []).filter(p => {
      if (filter === 'member' && !p.is_member) return false;
      if (filter === 'guest'  && !p.is_guest)  return false;
      if (filter === 'staff'  && !p.is_staff)  return false;
      if (!q) return true;
      return (p.name || '').toLowerCase().includes(q)
          || (p.email || '').toLowerCase().includes(q)
          || (p.phone || '').includes(q);
    });
  }, [people, query, filter]);

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 12px', lineHeight: 1.55 }}>
        Every member, guest, and staff person at {club?.name || 'this club'} in one searchable list. Use the kebab menu (⋮) on any row to send a magic link, change status, promote, demote, or convert a guest to a member. <strong style={{ color: G.text, fontStyle: 'normal' }}>To add a new member from scratch or bulk-import a CSV roster, use Manage Members.</strong>
      </p>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { id: 'all',    l: `All (${people.length})` },
          { id: 'member', l: `Members (${people.filter(p => p.is_member).length})` },
          { id: 'guest',  l: `Guests (${people.filter(p => p.is_guest).length})`   },
          { id: 'staff',  l: `Staff (${people.filter(p => p.is_staff).length})`    },
        ].map(f => (
          <div key={f.id} onClick={() => setFilter(f.id)} data-tap
            style={{
              padding: '6px 14px', borderRadius: 14,
              background: filter === f.id ? G.brass : G.card,
              border: `1px solid ${filter === f.id ? G.brass : G.border}`,
              cursor: 'pointer',
            }}>
            <span style={{
              fontFamily: '"Lora",serif', fontSize: 12,
              color: filter === f.id ? '#F2E5C0' : G.muted,
              fontWeight: filter === f.id ? 600 : 400,
            }}>{f.l}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search name, email, phone…"
        style={{
          width: '100%', boxSizing: 'border-box', padding: '10px 12px',
          border: `1px solid ${G.border}`, borderRadius: 4,
          fontFamily: '"Lora",serif', fontSize: 13, color: G.text,
          background: G.card, outline: 'none', marginBottom: 14,
        }}
      />

      {loading ? (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0' }}>
          Loading people…
        </p>
      ) : err ? (
        <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, padding: '10px 0' }}>
          {err}
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, padding: '20px 0' }}>
          No people match.
        </p>
      ) : (
        <div style={{ background: G.card, borderRadius: 4, border: `1px solid ${G.border}` }}>
          {filtered.map((p, i) => (
            <div key={p.auth_user_id} style={{
              display: 'flex', alignItems: 'center', padding: '12px 14px',
              borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 10,
            }}>
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: p.photo_url ? `center/cover url(${p.photo_url})` : G.green,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {!p.photo_url && (
                  <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 700 }}>
                    {(p.name || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Name + email + phone */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name || '(unnamed)'}
                </p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.email}{p.phone ? ` · ${p.phone}` : ''}
                </p>
              </div>

              {/* Relation chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end', flexShrink: 0 }}>
                {(p.relations || []).map((rel, j) => (
                  <RelationChip key={j} rel={rel} />
                ))}
              </div>

              {/* Actions menu (v0.15.2-4) */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div
                  onClick={() => setActionFor(actionFor === p.auth_user_id ? null : p.auth_user_id)}
                  data-tap
                  style={{
                    padding: '6px 8px', cursor: 'pointer',
                    background: actionFor === p.auth_user_id ? G.card : 'transparent',
                    borderRadius: 4,
                  }}
                  title="Actions"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2.2">
                    <circle cx="12" cy="5"  r="1.2" />
                    <circle cx="12" cy="12" r="1.2" />
                    <circle cx="12" cy="19" r="1.2" />
                  </svg>
                </div>
                {actionFor === p.auth_user_id && (
                  <div style={{
                    position: 'absolute', right: 0, top: 30,
                    background: G.bg, border: `1px solid ${G.border}`, borderRadius: 4,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    minWidth: 220, zIndex: 50, padding: '4px 0',
                  }}>
                    {/* v0.15.4 — always-available action */}
                    <ActionItem onClick={() => sendMagicLink(p)} busy={busyId === p.auth_user_id}>
                      Send Magic Link
                    </ActionItem>
                    <div style={{ height: 1, background: G.border, margin: '4px 0' }} />
                    {p.is_guest && !p.is_member && (
                      <ActionItem onClick={() => convertGuest(p)} busy={busyId === p.auth_user_id}>
                        Convert to Member
                      </ActionItem>
                    )}
                    {p.is_member && p.member_status !== 'active' && (
                      <ActionItem onClick={() => changeStatus(p, 'active')} busy={busyId === p.auth_user_id}>
                        Mark Active
                      </ActionItem>
                    )}
                    {p.is_member && p.member_status !== 'pending' && (
                      <ActionItem onClick={() => changeStatus(p, 'pending')} busy={busyId === p.auth_user_id}>
                        Mark Pending
                      </ActionItem>
                    )}
                    {p.is_member && p.member_status !== 'inactive' && (
                      <ActionItem onClick={() => changeStatus(p, 'inactive')} busy={busyId === p.auth_user_id}>
                        Mark Inactive
                      </ActionItem>
                    )}
                    {p.is_member && !p.is_staff && (
                      <>
                        <ActionItem onClick={() => promote(p, 'club_admin')} busy={busyId === p.auth_user_id}>
                          Promote to Admin
                        </ActionItem>
                        {isManager && (
                          <ActionItem onClick={() => promote(p, 'club_manager')} busy={busyId === p.auth_user_id}>
                            Promote to Manager
                          </ActionItem>
                        )}
                      </>
                    )}
                    {p.is_staff && p.staff_role === 'club_admin' && isManager && (
                      <ActionItem onClick={() => promote(p, 'club_manager')} busy={busyId === p.auth_user_id}>
                        Promote Admin → Manager
                      </ActionItem>
                    )}
                    {p.is_staff && p.staff_role === 'club_manager' && isManager && (
                      <ActionItem onClick={() => promote(p, 'club_admin')} busy={busyId === p.auth_user_id}>
                        Demote Manager → Admin
                      </ActionItem>
                    )}
                    {p.is_staff && (
                      <ActionItem onClick={() => demote(p)} busy={busyId === p.auth_user_id} danger>
                        Remove Staff Role
                      </ActionItem>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {actionErr && (
        <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(107,32,32,0.08)', border: `1px solid ${G.clsDot}`, borderRadius: 4 }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: 0 }}>{actionErr}</p>
        </div>
      )}
    </div>
  );
}

function ActionItem({ onClick, busy, danger, children }) {
  return (
    <div onClick={busy ? undefined : onClick} data-tap
      style={{
        padding: '8px 14px',
        cursor: busy ? 'wait' : 'pointer',
        fontFamily: '"Lora",serif', fontSize: 13,
        color: danger ? G.clsDot : G.text,
        opacity: busy ? 0.5 : 1,
      }}>
      {children}
    </div>
  );
}
