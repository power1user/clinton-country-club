// AllPeopleAdmin — unified people view with full CRUD.
//
// One screen for every person with any relation to the club (member,
// guest, or staff). Toolbar gives you Add Person + Import CSV; click a
// row to edit; status + role pills in the edit card handle every
// lifecycle transition with a confirm + audited reason.
//
// Major design history lives in CHANGELOG.md (v0.15.6 introduced this
// view; v0.15.16 redesigned the edit card around clickable pills).

import { useState, useEffect } from 'react';
import { G } from '../../theme.js';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useModalBackClose } from '../../hooks/useModalBackClose.js';
import {
  inputStyle, selectStyle, FormRow, Field, SectionLabel,
} from '../../lib/formStyles.jsx';   // v0.15.18 — shared form primitives
import { resizeToBlob } from '../../lib/imageResize.js';   // v0.15.26
import BottomSheetModal from '../../components/BottomSheetModal.jsx';   // v0.15.26 — shared shell
import ToggleChip from '../../components/ToggleChip.jsx';   // v0.15.26
import { useConfirm } from '../../components/ConfirmModal.jsx';   // v0.16.8b
import DateInput from '../../components/DateInput.jsx';   // v0.19.10
import {
  StatusPill, RolePill, StatusChangeModal, RoleChangeModal,
  STATUS_COLOR, ROLE_COLOR,
} from './PersonPillModals.jsx';
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

// v0.15.28 — Server-side pagination + filter + search. Page size matches
// the RPC default (100). The RPC clamps to 500 max regardless, so even
// "Load all" requests stay bounded.
const PAGE_SIZE = 100;

export default function AllPeopleAdmin() {
  const { club, isManager, isSuperAdmin } = useAuth();
  const confirmAsync = useConfirm(); // v0.16.8b — shared confirm modal
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [total, setTotal] = useState(0);
  // v0.15.28 — debounced search so we don't fire a query on every keystroke
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);
  const [actionFor, setActionFor] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionErr, setActionErr] = useState(null);

  // v0.15.6 — modal coordination
  const [editing, setEditing] = useState(null);   // { mode: 'edit'|'add-member'|'add-guest', person?: {...} }
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [showCsv, setShowCsv] = useState(false);

  // v0.15.28 — `fetchPage(offset)` is the only fetch path. offset=0 replaces
  // the current list; offset>0 appends. Server filters + searches; the old
  // client-side useMemo is gone.
  const fetchPage = async (offset) => {
    if (!club?.id) return;
    const isAppend = offset > 0;
    if (isAppend) setLoadingMore(true); else setLoading(true);
    setErr(null);
    const { data, error } = await supabase.rpc('all_people_at_club', {
      p_club_id: club.id,
      p_limit:   PAGE_SIZE,
      p_offset:  offset,
      p_filter:  filter,
      p_search:  debouncedQuery.trim() || null,
    });
    if (error) {
      setErr(error.message);
    } else {
      const rows = data || [];
      setTotal(rows[0]?.total_count ?? rows.length);
      setPeople(prev => isAppend ? [...prev, ...rows] : rows);
    }
    if (isAppend) setLoadingMore(false); else setLoading(false);
  };

  // Refresh = fetch from offset 0 (used by parent callbacks after edits).
  const refresh = () => fetchPage(0);

  // Reset to page 0 whenever club / filter / search changes.
  useEffect(() => {
    fetchPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.id, filter, debouncedQuery]);

  // ── Kebab action handlers (unchanged from v0.15.5) ─────────────
  const runAction = async (rpcName, args, personId, confirmMsg) => {
    // v0.16.8b — shared confirm modal (was window.confirm)
    if (confirmMsg && !(await confirmAsync({ title: confirmMsg, confirmLabel: 'Confirm', danger: true }))) return;
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
    p.person_id, // v0.16.17 — busy-state key is person_id (auth_user_id may be NULL for pre-auth)
    `Convert ${p.name} from guest to member?\n\nA new member row is created. Their guest record stays as history.`
  );

  const changeStatus = (p, to) => runAction(
    'change_member_status',
    { p_auth_user_id: p.auth_user_id, p_club_id: club.id, p_to_status: to },
    p.person_id,
    null
  );

  const promote = (p, role) => runAction(
    'promote_member_to_staff',
    { p_auth_user_id: p.auth_user_id, p_club_id: club.id, p_role: role },
    p.person_id,
    `Promote ${p.name} to ${role === 'club_manager' ? 'Manager' : 'Admin'}?\n\nThey'll gain admin access. Audited in people_audit_log.`
  );

  const demote = (p) => runAction(
    'demote_staff_to_member',
    { p_auth_user_id: p.auth_user_id, p_club_id: club.id },
    p.person_id,
    `Demote ${p.name} back to member?\n\nThey lose all admin permissions at this club. Audited.`
  );

  const demoteToGuest = (p) => runAction(
    'demote_member_to_guest',
    { p_auth_user_id: p.auth_user_id, p_club_id: club.id, p_access_level: 'read_only' },
    p.person_id,
    `Demote ${p.name} from member to guest?\n\nTheir member row is marked inactive (kept for history). A guest row is created/reactivated with read_only access. Audited.`
  );

  const sendMagicLink = async (p) => {
    if (!p.email) {
      setActionErr('No email on file — open the person and add one first.');
      return;
    }
    setBusyId(p.person_id); // v0.16.17 — busy-state key
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

  // v0.15.28 — Server-side filter/search means `people` is already the
  // visible set. Just memoize identity so downstream renderers don't
  // see a new array reference each render.
  const filtered = people;

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

      {/* Filter pills — v0.15.28 dropped per-pill counts (server-side
          filter means `people` no longer contains the full club, so those
          counts would be wrong). Total is shown above the list instead. */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { id: 'all',    l: 'All' },
          { id: 'member', l: 'Members' },
          { id: 'guest',  l: 'Guests' },
          { id: 'staff',  l: 'Staff' },
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

      {/* v0.15.28 — Total count + page indicator above the list */}
      {!loading && !err && total > 0 && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '0 0 8px' }}>
          {filtered.length === total
            ? `${total} ${total === 1 ? 'person' : 'people'}`
            : `Showing ${filtered.length} of ${total}`}
        </p>
      )}

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
            <div key={p.person_id} style={{ /* v0.16.17 — person_id is always-non-null; auth_user_id was NULL for pre-auth */
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
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || '(unnamed)'}</span>
                    {/* v0.15.18 — Notes dot. Brass circle next to the
                        name when members.notes or guests.notes is
                        non-empty (computed server-side by
                        all_people_at_club). Tells the admin "there's
                        something written here" at a glance; clicking
                        the row opens the modal where the note lives. */}
                    {p.has_notes && (
                      <span
                        title="This person has staff notes"
                        style={{ width: 6, height: 6, borderRadius: '50%', background: G.brass, flexShrink: 0 }}
                      />
                    )}
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
                  onClick={() => setActionFor(actionFor === p.person_id ? null : p.person_id)}
                  data-tap
                  style={{
                    padding: '6px 8px', cursor: 'pointer',
                    background: actionFor === p.person_id ? G.card : 'transparent',
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
                {actionFor === p.person_id && (
                  <div style={{
                    position: 'absolute', right: 0, top: 30,
                    background: G.bg, border: `1px solid ${G.border}`, borderRadius: 4,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    minWidth: 220, zIndex: 50, padding: '4px 0',
                  }}>
                    {/* v0.15.10 — Kebab is now the "fast lane" only.
                        Full lifecycle (promote / demote / status / staff role)
                        lives inside the PersonEditModal's Actions section.
                        Reasons:
                          · The modal is where the audit history + full record
                            context already are, so big transitions belong there.
                          · The kebab is the right surface for one-tap actions
                            you fire from the list without opening anything:
                            magic links, guest-approval, snowbird reactivation. */}
                    <ActionItem onClick={() => { setActionFor(null); openEdit(p); }} busy={busyId === p.person_id}>
                      Edit Person…
                    </ActionItem>
                    <ActionItem onClick={() => sendMagicLink(p)} busy={busyId === p.person_id}>
                      Send Magic Link
                    </ActionItem>
                    {p.is_guest && !p.is_member && (
                      <>
                        <div style={{ height: 1, background: G.border, margin: '4px 0' }} />
                        <ActionItem onClick={() => convertGuest(p)} busy={busyId === p.person_id}>
                          Convert Guest → Member
                        </ActionItem>
                      </>
                    )}
                    {p.is_member && p.member_status !== 'active' && (
                      <>
                        <div style={{ height: 1, background: G.border, margin: '4px 0' }} />
                        <ActionItem onClick={() => changeStatus(p, 'active')} busy={busyId === p.person_id}>
                          Mark Active
                        </ActionItem>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* v0.15.28 — Load more. Visible when there are more rows on the
          server than we've fetched, and we're not currently loading. */}
      {!loading && !err && filtered.length > 0 && filtered.length < total && (
        <div
          onClick={loadingMore ? undefined : () => fetchPage(filtered.length)}
          data-tap
          style={{
            marginTop: 10, padding: '10px 14px',
            background: G.card, border: `1px solid ${G.border}`,
            borderRadius: 4, textAlign: 'center',
            cursor: loadingMore ? 'wait' : 'pointer',
            opacity: loadingMore ? 0.6 : 1,
          }}
        >
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, fontWeight: 500 }}>
            {loadingMore ? 'Loading…' : `Load more (${total - filtered.length} remaining)`}
          </span>
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
          isManager={isManager}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
          onActionComplete={refresh}
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
  useModalBackClose(true, onClose);
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
// v0.15.20 — Tier options moved to clubs.member_tiers (per-club jsonb).
// PersonEditModal fetches the club's list on mount. The constant
// below is the FALLBACK shown if the club's row is missing or
// member_tiers is empty (defensive — every club should have non-
// empty defaults from the v0.15.20 migration).
const DEFAULT_TIERS = ['Full Member','Social Member','Junior Member','Honorary','Other'];
const MEMBER_STATUS_OPTIONS = ['active','pending','inactive'];
const VISIT_TYPE_OPTIONS = ['public_play','member_guest','tournament_guest','event_guest'];
const ACCESS_LEVEL_OPTIONS = ['data_only','read_only','full_temporary'];
const GUEST_STATUS_OPTIONS = ['active','pending_authentication','expired'];

function PersonEditModal({ mode, person, club, isManager, isSuperAdmin, onClose, onSaved, onActionComplete }) {
  // v0.15.15 — phone back-button closes the modal instead of exiting admin.
  useModalBackClose(true, onClose);
  const confirmAsync = useConfirm(); // v0.16.8b — shared confirm modal

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

  // v0.15.9 — Activity history. Manager-only (per Marc — club_admins
  // don't see this even though their RLS may permit reading the rows;
  // UI gate is `isManager` which excludes club_admin and includes
  // super_admin).
  const [audit, setAudit] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const showAuditSection = isManager && !isAdd && !!person?.auth_user_id;

  // v0.15.10 — bumping `loadVersion` causes the load + audit useEffects
  // to re-fire, refreshing the modal's view after a lifecycle action.
  // Avoids unmounting/remounting (which would wipe unsaved form edits).
  const [loadVersion, setLoadVersion] = useState(0);
  // v0.15.18 — `actionBusy` was used by the retired v0.15.10 Actions
  // section IIFE. Pill modals manage their own busy state internally.

  // v0.15.16 — Status / Role pill sub-modals + the "More details"
  // collapsible (closed by default to declutter the form).
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRoleModal, setShowRoleModal]     = useState(false);
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  // v0.15.16 — Avatar photo upload. busy state lights up the avatar
  // ring while uploading; err surfaces below the strip on failure.
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoUrlOverride, setPhotoUrlOverride] = useState(null); // optimistic preview

  // v0.15.20 — Per-club tier list. Loaded once on mount; fallback to
  // DEFAULT_TIERS if the row is missing or the list is empty.
  const [tierOptions, setTierOptions] = useState(DEFAULT_TIERS);
  useEffect(() => {
    if (!club?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('clubs').select('member_tiers').eq('id', club.id).single();
      if (cancelled) return;
      const list = Array.isArray(data?.member_tiers) && data.member_tiers.length
        ? data.member_tiers
        : DEFAULT_TIERS;
      setTierOptions(list);
    })();
    return () => { cancelled = true; };
  }, [club?.id]);

  // v0.15.13 — Departments. Manager-only edit; visible only when the
  // person is staff at this club (departments are a staff-routing
  // concept). When the person isn't staff yet, the section is hidden
  // entirely — promote them via Actions first, then assign departments.
  const [allDepartments, setAllDepartments]         = useState([]);  // catalog at this club
  const [assignedDeptIds, setAssignedDeptIds]       = useState(new Set());
  const [deptBusy, setDeptBusy]                     = useState(false);
  const showDepartments = isManager && !isAdd && !!person?.auth_user_id && person?.is_staff;

  // Clearing the field's error as the user types kills the red text the
  // moment they fix it; otherwise it lingers until they hit Save again.
  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setFieldErrors(fe => fe[k] ? { ...fe, [k]: undefined } : fe);
  };

  // Load underlying row(s) in edit mode.
  // v0.16.17 — gate + lookups pivot to person_id. auth_user_id is
  // NULL for pre-auth admin-added members/guests; the old gate
  // hid them entirely.
  useEffect(() => {
    if (isAdd || !person?.person_id || !club?.id) { setLoadingRow(false); return; }
    let cancelled = false;
    const load = async () => {
      setLoadingRow(true);
      const memberQ = person.is_member
        ? supabase.from('members')
            .select('id, person_id, membership_number, tier, member_since, hcp, locker, cart, parking, status, notes, people(name, email, phone, photo_url)')
            .eq('club_id', club.id).eq('person_id', person.person_id).maybeSingle()
        : Promise.resolve({ data: null });
      const guestQ = person.is_guest
        ? supabase.from('guests')
            .select('id, person_id, visit_type, visit_date, access_level, status, expires_at, notes, people(name, email, phone, zip)')
            .eq('club_id', club.id).eq('person_id', person.person_id)
            .order('created_at', { ascending: false }).limit(1)
        : Promise.resolve({ data: [] });
      const [mRes, gRes] = await Promise.all([memberQ, guestQ]);
      if (cancelled) return;
      const mRaw = mRes.data || null;
      const m = mRaw ? {
        ...mRaw,
        name:      mRaw.people?.name      ?? mRaw.name,
        email:     mRaw.people?.email     ?? mRaw.email,
        phone:     mRaw.people?.phone     ?? mRaw.phone,
        photo_url: mRaw.people?.photo_url ?? mRaw.photo_url,
      } : null;
      const gRaw = (Array.isArray(gRes.data) ? gRes.data[0] : gRes.data) || null;
      const g = gRaw ? {
        ...gRaw,
        name:  gRaw.people?.name  ?? gRaw.name,
        email: gRaw.people?.email ?? gRaw.email,
        phone: gRaw.people?.phone ?? gRaw.phone,
        zip:   gRaw.people?.zip   ?? gRaw.zip,
      } : null;
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
  }, [person?.person_id, club?.id, loadVersion]);

  // v0.15.9 — fetch the per-person audit trail from people_audit_log.
  // Two-step: first the raw rows for the person+club, then resolve
  // performer names from the unified `people` table. Two queries
  // instead of an embedded relation because we can't assume PostgREST
  // has a declared FK from people_audit_log.performed_by_user_id to
  // people.auth_user_id (and if we got it wrong, the embed would
  // silently return null names instead of erroring loudly).
  useEffect(() => {
    if (!showAuditSection || !club?.id) { setAudit([]); return; }
    let cancelled = false;
    (async () => {
      setAuditLoading(true);
      const { data: rows, error } = await supabase
        .from('people_audit_log')
        .select('id, action, from_status, to_status, performed_by_user_id, metadata, created_at')
        .eq('club_id', club.id)
        .eq('auth_user_id', person.auth_user_id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error || !rows?.length) {
        setAudit(rows || []);
        setAuditLoading(false);
        return;
      }
      const ids = [...new Set(rows.map(r => r.performed_by_user_id).filter(Boolean))];
      let nameByAuthId = {};
      if (ids.length) {
        const { data: namers } = await supabase
          .from('people')
          .select('auth_user_id, name')
          .in('auth_user_id', ids);
        nameByAuthId = Object.fromEntries((namers || []).map(p => [p.auth_user_id, p.name]));
      }
      if (cancelled) return;
      setAudit(rows.map(r => ({ ...r, performed_by_name: nameByAuthId[r.performed_by_user_id] || null })));
      setAuditLoading(false);
    })();
    return () => { cancelled = true; };
  }, [showAuditSection, club?.id, person?.auth_user_id, loadVersion]);

  // v0.15.13 — Load department catalog + this person's assignments.
  // Two parallel queries, set both states atomically when ready.
  useEffect(() => {
    if (!showDepartments || !club?.id) {
      setAllDepartments([]);
      setAssignedDeptIds(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      const [allRes, mineRes] = await Promise.all([
        supabase.from('club_departments')
          .select('id, name, slug, sort_order')
          .eq('club_id', club.id)
          .order('sort_order', { ascending: true }),
        supabase.from('user_departments')
          .select('department_id')
          .eq('club_id', club.id)
          .eq('user_id', person.auth_user_id),
      ]);
      if (cancelled) return;
      setAllDepartments(allRes.data || []);
      setAssignedDeptIds(new Set((mineRes.data || []).map(r => r.department_id)));
    })();
    return () => { cancelled = true; };
  }, [showDepartments, club?.id, person?.auth_user_id, loadVersion]);

  // v0.15.13 — Toggle a department assignment with optimistic UI.
  // Avoids a full reload — we just patch the Set on success and roll
  // it back on error. Realtime listeners on the parent list will
  // pick up the change for downstream views.
  const toggleDepartment = async (dep) => {
    if (deptBusy) return;
    const has = assignedDeptIds.has(dep.id);
    setDeptBusy(true);
    // Optimistic
    setAssignedDeptIds(prev => {
      const next = new Set(prev);
      if (has) next.delete(dep.id); else next.add(dep.id);
      return next;
    });
    const { error } = has
      ? await supabase.from('user_departments').delete()
          .eq('user_id', person.auth_user_id)
          .eq('club_id', club.id)
          .eq('department_id', dep.id)
      : await supabase.from('user_departments').insert({
          user_id: person.auth_user_id,
          club_id: club.id,
          department_id: dep.id,
        });
    setDeptBusy(false);
    if (error) {
      // Roll back the optimistic update
      setAssignedDeptIds(prev => {
        const next = new Set(prev);
        if (has) next.add(dep.id); else next.delete(dep.id);
        return next;
      });
      setErr(`Couldn't ${has ? 'remove' : 'add'} department: ${error.message}`);
    }
  };

  // v0.15.8 — Removed the v0.15.7 auto-focus useEffect. On mobile the
  // soft keyboard slid up immediately when the editor opened, blocking
  // the record from view before the admin could read it. The admin
  // now has to tap into a field to start typing — that's the expected
  // behavior on a record-browsing form.
  // v0.15.18 — The retained `firstInputRef` was also deleted here;
  // bring it back behind a `(hover: hover)` media query if we ever
  // want auto-focus back on desktop only.

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
    // v0.16.16 — Task #52 stage 2c: write name/email/phone (+ photo_url
    // for members, zip for guests) directly to the `people` row.
    // Members/guests rows hold ONLY per-club fields. For new inserts:
    // create or reuse a `people` row first, then insert the
    // member/guest with `person_id` pointing at it.
    const personFields = {
      name:  form.name.trim(),
      email: form.email.trim() || null,
      phone: (form.phone || '').trim() || null,
    };
    if (kind === 'guest') {
      personFields.zip = (form.zip || '').trim() || null;
    }

    let personId = isAdd ? null : (memberRow?.person_id || guestRow?.person_id || null);

    if (isAdd) {
      // Try to reuse an existing pre-auth person row by email
      if (personFields.email) {
        const { data: existing } = await supabase.from('people')
          .select('id').is('auth_user_id', null).ilike('email', personFields.email).maybeSingle();
        if (existing) {
          personId = existing.id;
          await supabase.from('people').update(personFields).eq('id', personId);
        }
      }
      if (!personId) {
        const { data: newP, error: pErr } = await supabase.from('people')
          .insert(personFields).select('id').single();
        if (pErr) { setBusy(false); setErr(pErr.message); return; }
        personId = newP.id;
      }
    } else if (personId) {
      const { error: pErr } = await supabase.from('people')
        .update(personFields).eq('id', personId);
      if (pErr) { setBusy(false); setErr(pErr.message); return; }
    }

    if (kind === 'member') {
      const row = {
        club_id: club.id,
        person_id: personId,
        membership_number: form.membership_number.trim(),
        tier: form.tier || null,
        member_since: form.member_since || null,
        hcp: form.hcp || null,
        locker: form.locker || null,
        cart: form.cart || null,
        parking: form.parking || null,
        status: form.status,
        notes: (form.notes || '').trim() || null,
      };
      const { error } = isAdd
        ? await supabase.from('members').insert(row)
        // v0.16.9 — defense in depth: scope mutations by id AND club_id
        : await supabase.from('members').update(row).eq('id', memberId).eq('club_id', club.id);
      setBusy(false);
      if (error) { setErr(error.message); return; }
    } else {
      const row = {
        club_id: club.id,
        person_id: personId,
        visit_type:   form.visit_type   || 'public_play',
        access_level: form.access_level || 'read_only',
        status:       form.status       || 'active',
        visit_date:   form.visit_date   || new Date().toISOString().slice(0, 10),
        expires_at:   form.expires_at   || null,
        notes:        (form.notes || '').trim() || null,
      };
      const { error } = isAdd
        ? await supabase.from('guests').insert(row)
        // v0.16.9 — defense in depth: scope mutations by id AND club_id
        : await supabase.from('guests').update(row).eq('id', guestId).eq('club_id', club.id);
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
    // v0.16.8b — shared confirm modal (was window.confirm)
    if (!(await confirmAsync({
      title: `Delete this ${what}?`,
      body: `Permanent delete for ${form.name}. The people_audit_log keeps history.`,
      confirmLabel: 'Delete',
      danger: true,
    }))) return;
    setBusy(true);
    // v0.16.9 — defense in depth: scope deletes by id AND club_id even
    // though this is super_admin-only (RLS would gate cross-tenant anyway).
    const { error } = kind === 'member'
      ? await supabase.from('members').delete().eq('id', memberId).eq('club_id', club.id)
      : await supabase.from('guests').delete().eq('id', guestId).eq('club_id', club.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
  };

  // v0.15.18 — v0.15.10's lifecycle action handlers (actConvertGuestToMember,
  // actDemoteMemberToGuest, actChangeStatus, actPromote, actDemoteStaff)
  // plus their `runModalAction` helper were retired in v0.15.16 when the
  // identity-strip pill modals (StatusChangeModal + RoleChangeModal in
  // PersonPillModals.jsx) took over. They were deliberately left in v0.15.16
  // as dead code "for safety"; v0.15.18 removes them.

  // v0.15.16 — Photo upload from the avatar click. Mirrors the
  // ProfilePhotoCard pattern (resize + compress + upload to club-assets
  // + update members.photo_url). Storage RLS allows any club staff to
  // write under `{club_id}/...` so admins can upload photos for their
  // members. Only fires for member edit mode (not add, not guests).
  const handlePhotoUpload = async (file) => {
    if (!file || photoBusy || kind !== 'member' || !memberId || !person?.auth_user_id) return;
    setPhotoBusy(true); setErr(null);
    try {
      // v0.15.26 — Resize/compress moved to src/lib/imageResize.js so
      // this matches ProfilePhotoCard's defaults (800px max, q=0.85).
      const blob = await resizeToBlob(file);

      // Path uses the TARGET user's id (not auth.uid()) — storage RLS
      // `club_assets_staff_insert` permits any club staff to write
      // anywhere under their club's folder.
      const folder = `${club.id}/members/${person.auth_user_id}`;
      const path   = `${folder}/avatar-${Date.now()}.jpg`;

      // Best-effort cleanup of old files.
      try {
        const { data: existing } = await supabase.storage.from('club-assets').list(folder, { limit: 50 });
        if (existing?.length) {
          await supabase.storage.from('club-assets').remove(existing.map(f => `${folder}/${f.name}`));
        }
      } catch {/* non-fatal */}

      const { error: upErr } = await supabase.storage.from('club-assets')
        .upload(path, blob, { cacheControl: '3600', contentType: 'image/jpeg' });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('club-assets').getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      // v0.16.16 — Task #52 stage 2c: photo_url canonical home is people.
      const personId = memberRow?.person_id;
      if (!personId) throw new Error('No person_id on member — cannot save photo');
      const { error: dbErr } = await supabase.from('people')
        .update({ photo_url: url })
        .eq('id', personId);
      if (dbErr) throw dbErr;

      setPhotoUrlOverride(url);
      setMemberRow(prev => prev ? { ...prev, photo_url: url } : prev);
      if (onActionComplete) await onActionComplete();
    } catch (e) {
      setErr(e?.message || "Couldn't upload photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const title = isAdd
    ? (kind === 'member' ? 'Add Member' : 'Add Guest')
    : (kind === 'member' ? 'Edit Member' : 'Edit Guest');

  // v0.15.16 — Identity-strip values. Photo from memberRow or overridden
  // by an in-progress upload. Pills use the live form values (so they
  // update if a sub-modal applies a change and the parent reloads).
  const photoUrl = photoUrlOverride
                 ?? memberRow?.photo_url
                 ?? person?.photo_url
                 ?? null;
  const displayName  = (form.name || person?.name || '').trim() || 'Unnamed';
  const memberNumberStr = form.membership_number ? `#${form.membership_number}` : null;
  const joinedStr = (form.member_since && form.member_since.length === 4) ? `joined ${form.member_since}` : null;
  const lastSeenStr = formatLastSeen(person?.last_seen_at);
  const subline = [memberNumberStr, joinedStr, lastSeenStr && `last seen ${lastSeenStr}`].filter(Boolean).join(' · ');

  // Pill values:
  //   Status — only meaningful when we have a member record loaded
  //   Role — derived from staff_role / is_staff / is_guest
  const statusForPill = kind === 'member' ? (memberRow?.status || form.status) : (guestRow?.status || form.status);
  const roleForPill = person?.is_staff
    ? (person.staff_role === 'club_manager' ? 'club_manager' : 'club_admin')
    : person?.is_member ? 'member'
    : person?.is_guest  ? 'guest'
    : null;

  const initials = (displayName || '?').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  const canEditStatus = isManager && kind === 'member' && !isAdd && memberId;
  const canEditRole   = isManager && !isAdd && !!person?.auth_user_id;
  const canUploadPhoto = isManager && kind === 'member' && !isAdd && memberId && person?.auth_user_id;

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 25 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>

        {/* v0.15.16 — Identity strip. Replaces the v0.15.6 "Edit Member"
            title bar with an info-dense top section:
              avatar (clickable for photo upload, manager+member only)
              + name (big)
              + meta sub-line (member # · joined Y · last seen)
              + status pill (clickable → change)
              + role pill (clickable → change)
            On narrow widths the pills wrap below the name; on wider
            they sit inline with it. */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <PersonAvatarWithUpload
            photoUrl={photoUrl}
            initials={initials}
            busy={photoBusy}
            canUpload={canUploadPhoto}
            onUpload={handlePhotoUpload}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 19, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isAdd ? (kind === 'member' ? 'Add Member' : 'Add Guest') : displayName}
              </h3>
              <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </div>
            </div>
            {!isAdd && subline && (
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {subline}
              </p>
            )}
            {!isAdd && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {kind === 'member' && (
                  <StatusPill
                    status={statusForPill}
                    onClick={() => setShowStatusModal(true)}
                    disabled={!canEditStatus}
                  />
                )}
                {roleForPill && (
                  <RolePill
                    role={roleForPill}
                    onClick={() => setShowRoleModal(true)}
                    disabled={!canEditRole}
                  />
                )}
              </div>
            )}
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
                <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} />
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Member #" required error={fieldErrors.membership_number}>
                <input value={form.membership_number} onChange={e => set('membership_number', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Tier">
                <select value={form.tier} onChange={e => set('tier', e.target.value)} style={selectStyle}>
                  {tierOptions.map(t => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Email">
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} placeholder="invite address" />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inputStyle} />
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Member since"><input value={form.member_since} onChange={e => set('member_since', e.target.value)} style={inputStyle} placeholder="Year" /></Field>
              {/* Status was a dropdown here in v0.15.6–v0.15.15. v0.15.16
                  moved it to the clickable pill in the identity strip,
                  with a confirm sub-modal — too easy to misfire as a
                  bare dropdown. The slot is left empty for visual
                  rhythm with the row above. */}
              <div style={{ flex: 1 }} />
            </FormRow>

            {/* v0.15.16 — "More details" collapsed by default. Locker /
                cart / parking / handicap are rarely edited in a typical
                session; they shouldn't take up the visual real estate
                of the main edit body. */}
            <div
              onClick={() => setMoreDetailsOpen(o => !o)}
              data-tap
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: '14px 0 6px' }}
            >
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, fontWeight: 700, lineHeight: 1 }}>
                {moreDetailsOpen ? '▾' : '▸'}
              </span>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                More details
              </span>
            </div>
            {moreDetailsOpen && (
              <>
                <FormRow>
                  <Field label="Handicap"><input value={form.hcp} onChange={e => set('hcp', e.target.value)} style={inputStyle} placeholder="14.2" /></Field>
                  <Field label="Locker"><input value={form.locker} onChange={e => set('locker', e.target.value)} style={inputStyle} /></Field>
                </FormRow>
                <FormRow>
                  <Field label="Cart"><input value={form.cart} onChange={e => set('cart', e.target.value)} style={inputStyle} /></Field>
                  <Field label="Parking"><input value={form.parking} onChange={e => set('parking', e.target.value)} style={inputStyle} /></Field>
                </FormRow>
              </>
            )}

            {/* v0.15.16 — Free-form staff notes. NOT shown to the
                member; this is a private per-club working pad. RLS on
                members ensures only staff can write notes. */}
            <SectionLabel>Notes (staff-only)</SectionLabel>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder='e.g. "Snowbird, away Dec–Mar" · "Prefers afternoon tee times"'
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                border: `1px solid ${G.border}`, borderRadius: 3,
                fontFamily: '"Lora",serif', fontSize: 13, color: G.text,
                backgroundColor: G.card, outline: 'none', resize: 'vertical',
                marginBottom: 6,
              }}
            />
          </>
        ) : (
          <>
            <SectionLabel>Identity</SectionLabel>
            <FormRow>
              <Field label="Full name" required error={fieldErrors.name}>
                <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} />
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
              <Field label="Visit date"><DateInput value={form.visit_date} onChange={v => set('visit_date', v)} style={inputStyle} /></Field>
              <Field label="Expires at (optional)"><DateInput value={form.expires_at || ''} onChange={v => set('expires_at', v)} style={inputStyle} /></Field>
            </FormRow>
            <FormRow>
              <Field label="Status">
                <select value={form.status} onChange={e => set('status', e.target.value)} style={selectStyle}>
                  {GUEST_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </Field>
              <div style={{ flex: 1 }} />
            </FormRow>

            {/* v0.15.16 — Free-form staff notes for guests too. */}
            <SectionLabel>Notes (staff-only)</SectionLabel>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder='e.g. "Wedding guest — Saturday only" · "Drives a green cart"'
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                border: `1px solid ${G.border}`, borderRadius: 3,
                fontFamily: '"Lora",serif', fontSize: 13, color: G.text,
                backgroundColor: G.card, outline: 'none', resize: 'vertical',
                marginBottom: 6,
              }}
            />
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

        {/* v0.15.16 — Departments is the only sub-section in this slot
            now. v0.15.10's Actions list (Promote / Demote / Remove
            Staff Role / Status moves) was retired in favor of the
            clickable status + role pills in the identity strip above,
            each of which opens a sub-modal with confirm + reason. */}
        {showDepartments && (
          <>
            <SectionLabel>Departments</SectionLabel>
            {allDepartments.length === 0 ? (
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '12px 14px' }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: 0, lineHeight: 1.55 }}>
                  No departments defined yet at this club. Set them up under{' '}
                  <strong>People &rarr; Departments</strong> first; staff can then be assigned here.
                </p>
              </div>
            ) : (
              <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '10px 12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allDepartments.map(dep => (
                    <ToggleChip
                      key={dep.id}
                      on={assignedDeptIds.has(dep.id)}
                      label={dep.name}
                      onClick={() => toggleDepartment(dep)}
                      busy={deptBusy}
                    />
                  ))}
                </div>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '8px 0 0', fontStyle: 'italic' }}>
                  Clubhouse pushes are routed by topic &rarr; department. See{' '}
                  <strong>Club Settings &rarr; Clubhouse Topic Routing</strong>.
                </p>
              </div>
            )}
          </>
        )}

        {!isAdd && isSuperAdmin && (kind === 'member' ? memberId : guestId) && (
          <div onClick={remove} data-tap style={{ marginTop: 10, padding: 8, textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, textDecoration: 'underline', textUnderlineOffset: 2 }}>Delete {kind} record</span>
          </div>
        )}

        {/* v0.15.9 — Per-person audit history, collapsed by default.
            Manager-only (isManager excludes club_admin per Marc).
            Sits below the action area so it doesn't add visual
            weight on first open — you have to choose to look. */}
        {showAuditSection && (
          <div style={{ marginTop: 18, borderTop: `1px solid ${G.border}`, paddingTop: 14 }}>
            <div onClick={() => setAuditOpen(o => !o)} data-tap
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, fontWeight: 700, lineHeight: 1 }}>
                {auditOpen ? '▾' : '▸'}
              </span>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
                Activity history{audit.length > 0 ? ` (${audit.length})` : ''}
              </span>
            </div>
            {auditOpen && (
              <div style={{ marginTop: 8 }}>
                {auditLoading ? (
                  <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '8px 0 0' }}>Loading…</p>
                ) : audit.length === 0 ? (
                  <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '8px 0 0' }}>No recorded activity yet.</p>
                ) : (
                  audit.map(a => <AuditEventRow key={a.id} a={a} />)
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* v0.15.16 — Pill-driven sub-modals. Render as siblings of the
          main modal body so they stack on top via z-index. Each one
          handles its own back-button + body-click-to-dismiss. After
          a successful apply, we refresh the parent list AND bump
          loadVersion to re-fetch the modal's own underlying rows. */}
      {showStatusModal && (
        <StatusChangeModal
          person={person}
          club={club}
          currentStatus={memberRow?.status || form.status}
          onClose={() => setShowStatusModal(false)}
          onApplied={async () => {
            setShowStatusModal(false);
            if (onActionComplete) await onActionComplete();
            setLoadVersion(v => v + 1);
          }}
        />
      )}
      {showRoleModal && (
        <RoleChangeModal
          person={person}
          club={club}
          isManager={isManager}
          onClose={() => setShowRoleModal(false)}
          onApplied={async ({ postKind }) => {
            setShowRoleModal(false);
            if (postKind) setKind(postKind);
            if (onActionComplete) await onActionComplete();
            setLoadVersion(v => v + 1);
          }}
        />
      )}
    </div>
  );
}

// v0.15.16 — Avatar with optional click-to-upload affordance. When
// canUpload is true, the entire avatar becomes a tap target that
// opens the file picker. Loading state during upload shows a faint
// overlay so the manager sees something is happening on a slow
// connection. Fallback initials + accent ring when no photo.
function PersonAvatarWithUpload({ photoUrl, initials, busy, canUpload, onUpload }) {
  const inputId = `person-avatar-upload-${Math.random().toString(36).slice(2, 9)}`;
  const baseStyle = {
    position: 'relative',
    width: 72, height: 72, borderRadius: '50%',
    background: photoUrl ? `center/cover url(${photoUrl})` : G.green,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    border: `2px solid ${G.border}`,
    overflow: 'hidden',
  };
  const inner = !photoUrl && (
    <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 26, color: '#F2EDE0', fontWeight: 700 }}>
      {initials}
    </span>
  );
  const overlay = busy && (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2EDE0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Uploading…</span>
    </div>
  );
  if (!canUpload) {
    return <div style={baseStyle}>{inner}</div>;
  }
  return (
    <label htmlFor={inputId} style={{ ...baseStyle, cursor: busy ? 'wait' : 'pointer' }} title="Upload a photo for this member">
      {inner}
      {overlay}
      {/* Subtle camera badge in the lower-right of the avatar */}
      {!busy && (
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 22, height: 22, borderRadius: '50%',
          background: G.brass, border: `2px solid ${G.bg}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F2E5C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        disabled={busy}
        onChange={e => onUpload?.(e.target.files?.[0])}
        style={{ display: 'none' }}
      />
    </label>
  );
}

// v0.15.9 — Friendly labels for the action enum stored in
// people_audit_log. Anything not on this list falls back to the raw
// value with underscores → spaces, so a new action introduced in a
// future migration still renders something readable without a code
// change.
const AUDIT_ACTION_LABEL = {
  guest_converted_to_member: 'Converted from guest to member',
  member_status_changed:     'Member status changed',
  member_promoted_to_staff:  'Promoted to staff',
  staff_role_changed:        'Staff role changed',
  staff_demoted_to_member:   'Demoted from staff to member',
  member_demoted_to_guest:   'Demoted from member to guest',
  person_created:            'Person record created',
  person_updated:            'Person record updated',
};

function formatAuditTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return ''; }
}

// v0.15.18 — PersonActionRow (the iOS-settings-row component used by
// v0.15.10's flat Actions section) deleted along with the rest of the
// retired Actions code. Pill modals replaced this surface.

function AuditEventRow({ a }) {
  const label = AUDIT_ACTION_LABEL[a.action] || a.action?.replace(/_/g, ' ') || 'Event';
  const ts = formatAuditTime(a.created_at);
  const hasDiff = a.from_status && a.to_status && a.from_status !== a.to_status;
  return (
    <div style={{ padding: '8px 0', borderTop: `1px solid ${G.border}` }}>
      <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: 0, fontWeight: 500 }}>
        {label}
        {hasDiff && (
          <span style={{ marginLeft: 6, color: G.muted, fontSize: 11, fontWeight: 400 }}>
            {a.from_status.replace(/_/g, ' ')} → {a.to_status.replace(/_/g, ' ')}
          </span>
        )}
      </p>
      <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '3px 0 0' }}>
        {ts}{a.performed_by_name ? ` · by ${a.performed_by_name}` : ''}
      </p>
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
      phone:              row?.phone             ?? person?.phone ?? '',  // v0.15.16 — phone surfaced on Identity row now
      tier:               row?.tier              ?? 'Full Member',
      member_since:       row?.member_since      ?? String(new Date().getFullYear()),
      hcp:                row?.hcp               ?? '',
      locker:             row?.locker            ?? '',
      cart:               row?.cart              ?? '',
      parking:            row?.parking           ?? '',
      status:             row?.status            ?? 'pending',
      notes:              row?.notes             ?? '',                   // v0.15.16
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
    notes:        row?.notes        ?? '',                                // v0.15.16
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
    const parsed = rows.map(r => ({
      name: r.name || `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      membership_number: r.membership_number || r.member_number || r.member || r.number || '',
      email: r.email || null,
      phone: r.phone || null,
      tier: r.tier || 'Full Member',
      member_since: r.member_since || r.since || null,
      hcp: r.hcp || r.handicap || null,
      locker: r.locker || null,
      cart: r.cart || null,
      parking: r.parking || null,
    })).filter(r => r.name && r.membership_number);
    if (!parsed.length) {
      setBusy(false);
      setResult({ error: 'No valid rows. CSV needs at least name + membership_number columns.' });
      return;
    }

    // v0.16.16 — Task #52 stage 2c: people-canonical write. For each
    // row, upsert a `people` row (reusing an existing pre-auth row
    // matched by email, case-insensitive), then upsert the `members`
    // row with `person_id` set. N round trips — CSV import is rare
    // and admin-triggered; tradeoff is OK for correctness.
    let okCount = 0;
    let firstError = null;
    for (const r of parsed) {
      try {
        let personId = null;
        if (r.email) {
          const { data: existing } = await supabase.from('people')
            .select('id').is('auth_user_id', null).ilike('email', r.email).maybeSingle();
          if (existing) personId = existing.id;
        }
        if (personId) {
          await supabase.from('people')
            .update({ name: r.name, phone: r.phone })
            .eq('id', personId);
        } else {
          const { data: newP, error: pErr } = await supabase.from('people')
            .insert({ name: r.name, email: r.email, phone: r.phone })
            .select('id').single();
          if (pErr) throw pErr;
          personId = newP.id;
        }
        const memberRow = {
          club_id: club.id,
          person_id: personId,
          membership_number: r.membership_number,
          tier: r.tier,
          member_since: r.member_since,
          hcp: r.hcp,
          locker: r.locker,
          cart: r.cart,
          parking: r.parking,
          status: 'pending',
        };
        const { error: mErr } = await supabase.from('members')
          .upsert(memberRow, { onConflict: 'club_id,membership_number' });
        if (mErr) throw mErr;
        okCount++;
      } catch (e) {
        if (!firstError) firstError = e?.message || String(e);
      }
    }
    setBusy(false);
    if (firstError && okCount === 0) { setResult({ error: firstError }); return; }
    setResult({ ok: okCount, partialErr: firstError });
    onSaved?.();
  };

  return (
    <BottomSheetModal title="Bulk Import Members" onClose={onClose}>
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
    </BottomSheetModal>
  );
}
