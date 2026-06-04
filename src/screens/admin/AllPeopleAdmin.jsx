// AllPeopleAdmin — v0.15.6 unified people view with full CRUD.
//
// One screen for every person with any relation to the club (member,
// guest, or staff). Toolbar gives you Add Person + Import CSV; click a
// row to edit; the kebab menu (⋮) covers status/role transitions.
//
// History:
//   v0.15.1 — Read-only list.
//   v0.15.2–4 — Per-row kebab actions (convert, promote, demote,
//               status, send magic link).
//   v0.15.5 — Filter pills + dropdown chevron styling + Member↔Guest
//               symmetry.
//   v0.15.6 — Real consolidation: edit modal + add-person picker +
//               CSV import live INSIDE this view. The old Manage
//               Members section is gone — this is the one place to
//               manage people now.

import { useState, useEffect, useMemo, useRef } from 'react';
import { G } from '../../theme.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../hooks/useAuth.jsx';

// ── Form helpers (kept inline so this file is self-contained
//    after we delete the old MembersAdmin in AdminPanel.jsx). ──
const labelStyle = { fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };
const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' };
const selectStyle = { ...inputStyle };
function FormRow({ children }) {
  return <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>{children}</div>;
}
// v0.15.7 — Field now renders a red asterisk for required props and
// surfaces a per-field error message right below the input so the
// user doesn't have to scroll to the bottom of the modal to see what
// went wrong.
function Field({ label, required, error, children }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: G.clsDot, marginLeft: 3, fontWeight: 700 }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.clsDot, margin: '4px 0 0' }}>
          {error}
        </p>
      )}
    </div>
  );
}
// v0.15.7 — Subtle section header used to group the member form
// into "Identity" and "Membership details" so the 8 fields don't
// read as one undifferentiated wall.
function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 8px' }}>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: G.border }} />
    </div>
  );
}
function formatLastSeen(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return null; }
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else cur += c;
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"') { inQuotes = true; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

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
  const { club, isManager, isSuperAdmin } = useAuth();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionFor, setActionFor] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionErr, setActionErr] = useState(null);

  // v0.15.6 — modal coordination
  const [editing, setEditing] = useState(null);   // { mode: 'edit'|'add-member'|'add-guest', person?: {...} }
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [showCsv, setShowCsv] = useState(false);

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

  // ── Kebab action handlers (unchanged from v0.15.5) ─────────────
  const runAction = async (rpcName, args, personId, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusyId(personId);
    setActionErr(null);
    const { error } = await supabase.rpc(rpcName, args);
    setBusyId(null);
    setActionFor(null);
    if (error) { setActionErr(error.message); return; }
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

  const demoteToGuest = (p) => runAction(
    'demote_member_to_guest',
    { p_auth_user_id: p.auth_user_id, p_club_id: club.id, p_access_level: 'read_only' },
    p.auth_user_id,
    `Demote ${p.name} from member to guest?\n\nTheir member row is marked inactive (kept for history). A guest row is created/reactivated with read_only access. Audited.`
  );

  const sendMagicLink = async (p) => {
    if (!p.email) {
      setActionErr('No email on file — open the person and add one first.');
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
    if (error) { setActionErr(`Couldn't send: ${error.message}`); return; }
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

  // v0.15.6 — choose which record to edit when a row is clicked.
  // Members win when a person is both (you'd typically be editing
  // their member profile). The modal exposes a "Edit as guest" link
  // if they have a guest row too.
  const openEdit = (p) => {
    setActionFor(null);
    setEditing({ mode: 'edit', person: p });
  };

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 14px', lineHeight: 1.55 }}>
        Every member, guest, and staff person at {club?.name || 'this club'} in one searchable list. Tap any row to edit. Use the kebab (⋮) for status / role transitions and magic-link sends.
      </p>

      {/* v0.15.6 — toolbar replaces the old "go to Manage Members" shortcut.
          Everything you need to add or import people lives here now. */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div
          onClick={() => setShowAddPicker(true)}
          data-tap
          style={{ padding: '8px 14px', background: G.green, borderRadius: 4, cursor: 'pointer' }}
        >
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 600 }}>+ Add Person</span>
        </div>
        <div
          onClick={() => setShowCsv(true)}
          data-tap
          style={{ padding: '8px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, cursor: 'pointer' }}
        >
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, fontWeight: 500 }}>Import CSV</span>
        </div>
      </div>

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
              {/* Avatar + identity + chips (the click target — opens edit) */}
              <div
                onClick={() => openEdit(p)}
                data-tap
                style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}
              >
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

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name || '(unnamed)'}
                  </p>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.email}{p.phone ? ` · ${p.phone}` : ''}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end', flexShrink: 0 }}>
                  {(p.relations || []).map((rel, j) => (
                    <RelationChip key={j} rel={rel} />
                  ))}
                </div>
              </div>

              {/* Kebab actions menu */}
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
                    <ActionItem onClick={() => { setActionFor(null); openEdit(p); }} busy={busyId === p.auth_user_id}>
                      Edit Person…
                    </ActionItem>
                    <ActionItem onClick={() => sendMagicLink(p)} busy={busyId === p.auth_user_id}>
                      Send Magic Link
                    </ActionItem>
                    <div style={{ height: 1, background: G.border, margin: '4px 0' }} />
                    {p.is_guest && !p.is_member && (
                      <ActionItem onClick={() => convertGuest(p)} busy={busyId === p.auth_user_id}>
                        Convert Guest → Member
                      </ActionItem>
                    )}
                    {p.is_member && p.member_status !== 'inactive' && (
                      <ActionItem onClick={() => demoteToGuest(p)} busy={busyId === p.auth_user_id}>
                        Demote Member → Guest
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

      {/* ── Modals ─────────────────────────────────────────────── */}
      {showAddPicker && (
        <AddPersonPicker
          onPickMember={() => { setShowAddPicker(false); setEditing({ mode: 'add-member' }); }}
          onPickGuest={()  => { setShowAddPicker(false); setEditing({ mode: 'add-guest' }); }}
          onClose={() => setShowAddPicker(false)}
        />
      )}
      {editing && (
        <PersonEditModal
          mode={editing.mode}
          person={editing.person || null}
          club={club}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
      {showCsv && (
        <PeopleCsvImportModal
          club={club}
          onClose={() => setShowCsv(false)}
          onSaved={() => { setShowCsv(false); refresh(); }}
        />
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

// ───────────────────────────────────────────────────────────────
// AddPersonPicker — quick chooser modal before the edit form.
// ───────────────────────────────────────────────────────────────
function AddPersonPicker({ onPickMember, onPickGuest, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, border: `1px solid ${G.border}`, borderRadius: 6, padding: 22, width: 'min(380px, 90%)' }}>
        <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700, color: G.text, margin: '0 0 6px' }}>Add a person</h3>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: '0 0 18px', lineHeight: 1.55 }}>
          Members are part of the club. Guests are temporary visitors with limited access.
        </p>
        <div onClick={onPickMember} data-tap style={{ padding: 14, background: G.green, borderRadius: 4, cursor: 'pointer', marginBottom: 8 }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: '#F2EDE0', fontWeight: 600, margin: 0 }}>Add a Member</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: 'rgba(242,237,224,0.78)', margin: '3px 0 0' }}>Full club roster — tier, member #, locker, handicap, etc.</p>
        </div>
        <div onClick={onPickGuest} data-tap style={{ padding: 14, background: G.brass, borderRadius: 4, cursor: 'pointer' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: '#F2E5C0', fontWeight: 600, margin: 0 }}>Add a Guest</p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: 'rgba(242,229,192,0.82)', margin: '3px 0 0' }}>One-time / temporary visitor — visit type, access level.</p>
        </div>
        <div onClick={onClose} data-tap style={{ marginTop: 14, textAlign: 'center', cursor: 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, textDecoration: 'underline' }}>Cancel</span>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// PersonEditModal — single form that covers add-member,
// add-guest, and edit. In edit mode it auto-loads the underlying
// members/guests row. Save writes back to the right table.
// ───────────────────────────────────────────────────────────────
const TIER_OPTIONS = ['Full Member','Social Member','Junior Member','Honorary','Other'];
const MEMBER_STATUS_OPTIONS = ['active','pending','inactive'];
const VISIT_TYPE_OPTIONS = ['public_play','member_guest','tournament_guest','event_guest'];
const ACCESS_LEVEL_OPTIONS = ['data_only','read_only','full_temporary'];
const GUEST_STATUS_OPTIONS = ['active','pending_authentication','expired'];

function PersonEditModal({ mode, person, club, isSuperAdmin, onClose, onSaved }) {
  // v0.15.6 — when a person has both records, let the admin toggle
  // which side they're editing without leaving the modal.
  const initialKind = mode === 'add-guest' ? 'guest'
                    : mode === 'add-member' ? 'member'
                    : (person?.is_member ? 'member' : 'guest');
  const [kind, setKind] = useState(initialKind);
  const isAdd = mode.startsWith('add');

  const [memberRow, setMemberRow] = useState(null);
  const [guestRow,  setGuestRow]  = useState(null);
  const [memberId,  setMemberId]  = useState(null);
  const [guestId,   setGuestId]   = useState(null);

  const [form, setForm] = useState(initialFormFor(kind, null, person));
  const [initialForm, setInitialForm] = useState(null);   // null in add mode → always dirty-enough
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);
  const [notice, setNotice] = useState(null);
  const [loadingRow, setLoadingRow] = useState(!isAdd);
  const [fieldErrors, setFieldErrors] = useState({});     // v0.15.7 — per-field inline validation
  const firstInputRef = useRef(null);                     // v0.15.7 — auto-focus on open

  // Clearing the field's error as the user types kills the red text the
  // moment they fix it; otherwise it lingers until they hit Save again.
  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setFieldErrors(fe => fe[k] ? { ...fe, [k]: undefined } : fe);
  };

  // Load underlying row(s) in edit mode.
  useEffect(() => {
    if (isAdd || !person?.auth_user_id || !club?.id) { setLoadingRow(false); return; }
    let cancelled = false;
    const load = async () => {
      setLoadingRow(true);
      const memberQ = person.is_member
        ? supabase.from('members')
            .select('id, name, membership_number, email, tier, member_since, hcp, locker, cart, parking, status, photo_url')
            .eq('club_id', club.id).eq('user_id', person.auth_user_id).maybeSingle()
        : Promise.resolve({ data: null });
      const guestQ = person.is_guest
        ? supabase.from('guests')
            .select('id, name, email, phone, zip, visit_type, visit_date, access_level, status, expires_at')
            .eq('club_id', club.id).eq('user_id', person.auth_user_id)
            .order('created_at', { ascending: false }).limit(1)
        : Promise.resolve({ data: [] });
      const [mRes, gRes] = await Promise.all([memberQ, guestQ]);
      if (cancelled) return;
      const m = mRes.data || null;
      const g = (Array.isArray(gRes.data) ? gRes.data[0] : gRes.data) || null;
      setMemberRow(m); setMemberId(m?.id || null);
      setGuestRow(g);  setGuestId(g?.id || null);
      const f = initialFormFor(kind, kind === 'member' ? m : g, person);
      setForm(f);
      setInitialForm(f);   // freeze a copy so dirty detection compares against the loaded state
      setLoadingRow(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person?.auth_user_id, club?.id]);

  // v0.15.7 — auto-focus the first field once the form is rendered.
  // Slight delay lets the bottom-sheet animation finish so the focus
  // ring doesn't paint mid-slide.
  useEffect(() => {
    if (loadingRow) return;
    const t = setTimeout(() => firstInputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [loadingRow, kind]);

  // When user toggles kind on a dual-record person, repopulate form
  // from the cached row so we don't lose unsaved typing on the other.
  const switchKind = (next) => {
    if (next === kind) return;
    setKind(next);
    const f = initialFormFor(next, next === 'member' ? memberRow : guestRow, person);
    setForm(f);
    setInitialForm(f);
    setErr(null); setNotice(null); setFieldErrors({});
  };

  // v0.15.7 — validation is its own function so the Save button can
  // ask "is this valid?" on every keystroke without running the full
  // save flow.
  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = 'Required.';
    if (kind === 'member') {
      if (!form.membership_number?.trim()) e.membership_number = 'Required.';
    } else {
      if (!form.email?.trim()) e.email = 'Required.';
    }
    return e;
  };
  const isValid = Object.keys(validate()).length === 0;
  // Add mode: any time it's valid we let them save. Edit mode: must also
  // be dirty so we don't fire a no-op UPDATE that round-trips to Postgres.
  const dirty = initialForm ? JSON.stringify(form) !== JSON.stringify(initialForm) : true;
  const canSave = !busy && !loadingRow && isValid && (isAdd || dirty);

  const save = async () => {
    const v = validate();
    if (Object.keys(v).length > 0) { setFieldErrors(v); return; }
    setFieldErrors({});
    setBusy(true); setErr(null);
    if (kind === 'member') {
      const row = {
        club_id: club.id,
        name: form.name.trim(),
        membership_number: form.membership_number.trim(),
        email: form.email.trim() || null,
        tier: form.tier || null,
        member_since: form.member_since || null,
        hcp: form.hcp || null,
        locker: form.locker || null,
        cart: form.cart || null,
        parking: form.parking || null,
        status: form.status,
      };
      const { error } = isAdd
        ? await supabase.from('members').insert(row)
        : await supabase.from('members').update(row).eq('id', memberId);
      setBusy(false);
      if (error) { setErr(error.message); return; }
    } else {
      const row = {
        club_id: club.id,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        zip:   form.zip.trim()   || null,
        visit_type:   form.visit_type   || 'public_play',
        access_level: form.access_level || 'read_only',
        status:       form.status       || 'active',
        visit_date:   form.visit_date   || new Date().toISOString().slice(0, 10),
        expires_at:   form.expires_at   || null,
      };
      const { error } = isAdd
        ? await supabase.from('guests').insert(row)
        : await supabase.from('guests').update(row).eq('id', guestId);
      setBusy(false);
      if (error) { setErr(error.message); return; }
    }
    onSaved?.();
  };

  const sendInvite = async () => {
    if (!form.email) { setErr('Add an email first to send a magic link.'); return; }
    setBusy(true); setErr(null);
    const redirect = club?.slug ? `https://${club.slug}.groundslive.com/` : window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: form.email.trim(),
      options: { emailRedirectTo: redirect },
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setNotice(`✓ Magic link sent to ${form.email}.`);
  };

  // v0.15.7 — Keyboard shortcuts: ESC closes, Cmd/Ctrl+Enter saves.
  // The deps array intentionally includes `canSave` + the functions so
  // we don't fire a save against stale form state.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (canSave) save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSave, kind, form, memberId, guestId, isAdd]);

  const remove = async () => {
    if (!isSuperAdmin) return;
    const what = kind === 'member' ? 'member record' : 'guest record';
    if (!window.confirm(`Delete this ${what} for ${form.name}? Permanent — audit log keeps history.`)) return;
    setBusy(true);
    const { error } = kind === 'member'
      ? await supabase.from('members').delete().eq('id', memberId)
      : await supabase.from('guests').delete().eq('id', guestId);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
  };

  const title = isAdd
    ? (kind === 'member' ? 'Add Member' : 'Add Guest')
    : (kind === 'member' ? 'Edit Member' : 'Edit Guest');

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 25 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>{title}</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        {/* Dual-kind toggle when both records exist */}
        {!isAdd && person?.is_member && person?.is_guest && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, padding: 3, background: G.card, borderRadius: 4, border: `1px solid ${G.border}` }}>
            {['member','guest'].map(k => (
              <div key={k} onClick={() => switchKind(k)} data-tap
                style={{
                  flex: 1, padding: '6px 0', textAlign: 'center', cursor: 'pointer',
                  background: kind === k ? G.bg : 'transparent',
                  borderRadius: 3,
                }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: kind === k ? G.text : G.muted, fontWeight: kind === k ? 600 : 400 }}>
                  Edit as {k}
                </span>
              </div>
            ))}
          </div>
        )}

        {loadingRow ? (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0' }}>Loading…</p>
        ) : kind === 'member' ? (
          <>
            <SectionLabel>Identity</SectionLabel>
            <FormRow>
              <Field label="Full name" required error={fieldErrors.name}>
                <input ref={firstInputRef} value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} />
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Member #" required error={fieldErrors.membership_number}>
                <input value={form.membership_number} onChange={e => set('membership_number', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} placeholder="invite address" />
              </Field>
            </FormRow>

            <SectionLabel>Membership details</SectionLabel>
            <FormRow>
              <Field label="Tier">
                <select value={form.tier} onChange={e => set('tier', e.target.value)} style={selectStyle}>
                  {TIER_OPTIONS.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={e => set('status', e.target.value)} style={selectStyle}>
                  {MEMBER_STATUS_OPTIONS.map(s => <option key={s} value={s}>{cap(s)}</option>)}
                </select>
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Member since"><input value={form.member_since} onChange={e => set('member_since', e.target.value)} style={inputStyle} placeholder="Year" /></Field>
              <Field label="Handicap"><input value={form.hcp} onChange={e => set('hcp', e.target.value)} style={inputStyle} placeholder="14.2" /></Field>
            </FormRow>
            <FormRow>
              <Field label="Locker"><input value={form.locker} onChange={e => set('locker', e.target.value)} style={inputStyle} /></Field>
              <Field label="Cart"><input value={form.cart} onChange={e => set('cart', e.target.value)} style={inputStyle} /></Field>
            </FormRow>
            <FormRow>
              <Field label="Parking"><input value={form.parking} onChange={e => set('parking', e.target.value)} style={inputStyle} /></Field>
              {/* second column left blank so Parking aligns with the others
                  instead of stretching full width — matches the visual
                  rhythm of the rows above. */}
              <div style={{ flex: 1 }} />
            </FormRow>
          </>
        ) : (
          <>
            <SectionLabel>Identity</SectionLabel>
            <FormRow>
              <Field label="Full name" required error={fieldErrors.name}>
                <input ref={firstInputRef} value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} />
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Email" required error={fieldErrors.email}>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} />
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Phone"><input value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} /></Field>
              <Field label="ZIP"><input value={form.zip} onChange={e => set('zip', e.target.value)} style={inputStyle} /></Field>
            </FormRow>

            <SectionLabel>Visit details</SectionLabel>
            <FormRow>
              <Field label="Visit type">
                <select value={form.visit_type} onChange={e => set('visit_type', e.target.value)} style={selectStyle}>
                  {VISIT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </Field>
              <Field label="Access level">
                <select value={form.access_level} onChange={e => set('access_level', e.target.value)} style={selectStyle}>
                  {ACCESS_LEVEL_OPTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                </select>
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Visit date"><input type="date" value={form.visit_date} onChange={e => set('visit_date', e.target.value)} style={inputStyle} /></Field>
              <Field label="Expires at (optional)"><input type="date" value={form.expires_at || ''} onChange={e => set('expires_at', e.target.value)} style={inputStyle} /></Field>
            </FormRow>
            <FormRow>
              <Field label="Status">
                <select value={form.status} onChange={e => set('status', e.target.value)} style={selectStyle}>
                  {GUEST_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </Field>
              <div style={{ flex: 1 }} />
            </FormRow>
          </>
        )}

        {err    && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}
        {notice && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.openBg, marginBottom: 10 }}>{notice}</p>}

        {!loadingRow && (() => {
          // v0.15.7 — Verified users get a quieter "Re-send sign-in link"
          // outline button + a subline showing when they were last seen.
          // Unverified users keep the prominent brass CTA — the magic link
          // is the only path they have to access the app, so it deserves
          // the loud styling.
          const verified = !!person?.last_seen_at;
          const lastSeen = formatLastSeen(person?.last_seen_at);
          return (
            <>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <div onClick={canSave ? save : undefined} data-tap
                  style={{
                    flex: 1, padding: 12,
                    background: canSave ? G.green : G.border,
                    borderRadius: 3, textAlign: 'center',
                    cursor: canSave ? 'pointer' : 'not-allowed',
                    opacity: busy ? 0.6 : 1,
                  }}
                  title={!isAdd && !dirty ? 'No changes to save yet' : (!isValid ? 'Fill required fields first' : 'Save (Ctrl+Enter)')}
                >
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: canSave ? '#F2EDE0' : G.muted, fontWeight: 500 }}>
                    {busy ? 'Saving…' : (isAdd ? `Add ${kind === 'member' ? 'Member' : 'Guest'}` : 'Save')}
                  </span>
                </div>
                {form.email && (
                  verified ? (
                    <div onClick={busy ? undefined : sendInvite} data-tap
                      style={{
                        flex: 1, padding: 12, background: 'transparent',
                        border: `1px solid ${G.brass}`,
                        borderRadius: 3, textAlign: 'center',
                        cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1,
                      }}>
                      <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.brass, fontWeight: 500 }}>
                        Re-send sign-in link
                      </span>
                    </div>
                  ) : (
                    <div onClick={busy ? undefined : sendInvite} data-tap
                      style={{ flex: 1, padding: 12, background: G.brass, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                      <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2E5C0', fontWeight: 500 }}>
                        Send Magic Link
                      </span>
                    </div>
                  )
                )}
              </div>
              {verified && lastSeen && (
                <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '8px 0 0', textAlign: 'right' }}>
                  ✓ Verified · last seen {lastSeen}
                </p>
              )}
              <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, margin: '8px 0 0', textAlign: 'right', letterSpacing: '0.06em' }}>
                ESC to close · Ctrl/⌘+Enter to save
              </p>
            </>
          );
        })()}

        {!isAdd && isSuperAdmin && (kind === 'member' ? memberId : guestId) && (
          <div onClick={remove} data-tap style={{ marginTop: 10, padding: 8, textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, textDecoration: 'underline', textUnderlineOffset: 2 }}>Delete {kind} record</span>
          </div>
        )}
      </div>
    </div>
  );
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function initialFormFor(kind, row, person) {
  if (kind === 'member') {
    return {
      name:               row?.name              ?? person?.name  ?? '',
      membership_number:  row?.membership_number ?? '',
      email:              row?.email             ?? person?.email ?? '',
      tier:               row?.tier              ?? 'Full Member',
      member_since:       row?.member_since      ?? String(new Date().getFullYear()),
      hcp:                row?.hcp               ?? '',
      locker:             row?.locker            ?? '',
      cart:               row?.cart              ?? '',
      parking:            row?.parking           ?? '',
      status:             row?.status            ?? 'pending',
    };
  }
  return {
    name:         row?.name         ?? person?.name  ?? '',
    email:        row?.email        ?? person?.email ?? '',
    phone:        row?.phone        ?? person?.phone ?? '',
    zip:          row?.zip          ?? person?.zip   ?? '',
    visit_type:   row?.visit_type   ?? 'public_play',
    access_level: row?.access_level ?? 'read_only',
    status:       row?.status       ?? 'active',
    visit_date:   row?.visit_date   ?? new Date().toISOString().slice(0, 10),
    expires_at:   row?.expires_at   ?? '',
  };
}

// ───────────────────────────────────────────────────────────────
// PeopleCsvImportModal — bulk member import (ported from the
// retired MembersAdmin.CsvImportModal). Only handles members for
// now; guests come in via the public self-register form or
// individually via "+ Add Person → Guest".
// ───────────────────────────────────────────────────────────────
function PeopleCsvImportModal({ club, onClose, onSaved }) {
  const [csvText, setCsvText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setBusy(true); setResult(null);
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) { setBusy(false); setResult({ error: 'No rows.' }); return; }
    const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(l => {
      const cells = parseCsvLine(l);
      const obj = {};
      header.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim(); });
      return obj;
    });
    const out = rows.map(r => ({
      club_id: club.id,
      name: r.name || `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      membership_number: r.membership_number || r.member_number || r.member || r.number || '',
      email: r.email || null,
      tier: r.tier || 'Full Member',
      member_since: r.member_since || r.since || null,
      hcp: r.hcp || r.handicap || null,
      locker: r.locker || null,
      cart: r.cart || null,
      parking: r.parking || null,
      status: 'pending',
    })).filter(r => r.name && r.membership_number);
    if (!out.length) {
      setBusy(false);
      setResult({ error: 'No valid rows. CSV needs at least name + membership_number columns.' });
      return;
    }
    const { data, error } = await supabase.from('members').upsert(out, { onConflict: 'club_id,membership_number' }).select('id');
    setBusy(false);
    if (error) { setResult({ error: error.message }); return; }
    setResult({ ok: data?.length || 0 });
    onSaved?.();
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 25 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>Bulk Import Members</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, lineHeight: 1.6, margin: '0 0 10px' }}>
          Paste a CSV below. First row = column headers. Required: <code>name</code>, <code>membership_number</code>.
          Optional: <code>email</code>, <code>tier</code>, <code>member_since</code>, <code>hcp</code>, <code>locker</code>, <code>cart</code>, <code>parking</code>.
          New members are added with <strong>Pending</strong> status; they activate when they sign in with the matching email.
          Existing membership numbers are updated.
        </p>

        <textarea
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          placeholder={'name,membership_number,email,tier\nMarc Abla,0001,marc@example.com,Full Member\nMatt Bohlmann,0002,matt@example.com,Full Member'}
          style={{ width: '100%', height: 200, padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: 'monospace', fontSize: 11, color: G.text, background: G.card, resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
        />

        {result?.error && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{result.error}</p>}
        {result?.ok    && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.openBg, marginBottom: 10 }}>✓ Imported / updated {result.ok} member{result.ok === 1 ? '' : 's'}.</p>}

        <div onClick={csvText && !busy ? run : undefined} data-tap
          style={{ padding: 12, background: csvText && !busy ? G.green : G.border, borderRadius: 3, textAlign: 'center', cursor: csvText && !busy ? 'pointer' : 'not-allowed' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: csvText && !busy ? '#F2EDE0' : G.muted, fontWeight: 500 }}>{busy ? 'Importing…' : 'Import'}</span>
        </div>
      </div>
    </div>
  );
}
