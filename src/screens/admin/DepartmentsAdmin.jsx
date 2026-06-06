// DepartmentsAdmin — v0.15.14 (Phase 17 — department-based notification routing).
//
// Per-club catalog of named departments (Dining, Pro Shop, Course,
// Front Desk by default). Staff get assigned to one or more via the
// PersonEditModal Departments section. Clubhouse-thread pushes route
// from `clubs.clubhouse_topic_routing` (topic → department slug) to
// `user_departments` (department → people).
//
// v0.15.14 changes (Marc's feedback on v0.15.13):
//   1. Row click now opens a DETAIL modal that shows the actual staff
//      assigned to the department (the chevron's affordance promised
//      a drill-in; before it just popped a rename modal).
//   2. SLUG is hidden from the UI everywhere. Auto-generated from name,
//      auto-de-duped on collision (silent `-2`, `-3` suffix). Names must
//      be unique per club (case-insensitive) with a friendly inline
//      error. Slugs remain in the DB schema (the topic-routing map
//      references them) — they're just behind-the-scenes plumbing now.
//
// Manager-only — gated upstream in AdminPanel routing.

import { useEffect, useMemo, useState } from 'react';
import { G } from '../../theme.js';
import { supabase } from '../../lib/supabase.js';
import { useModalBackClose } from '../../hooks/useModalBackClose.js';

const labelStyle = { fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };
const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, backgroundColor: G.card, outline: 'none', boxSizing: 'border-box' };

// v0.15.14 — Slug helpers are internal now. Generate from name (kebab,
// alphanum only); given a pool of existing slugs to avoid, auto-suffix.
function slugify(s) {
  return (s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}
function uniqueSlug(name, existingSlugs) {
  const base = slugify(name) || 'dept';
  if (!existingSlugs.includes(base)) return base;
  let n = 2;
  while (existingSlugs.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export default function DepartmentsAdmin({ club }) {
  const [rows, setRows]       = useState([]);
  const [counts, setCounts]   = useState({}); // { department_id: number }
  const [loading, setLoading] = useState(true);
  const [adding, setAdding]   = useState(false); // controls the simple "Add" modal
  const [detail, setDetail]   = useState(null);  // row → detail modal
  const [err, setErr]         = useState(null);

  const load = async () => {
    if (!club?.id) return;
    setLoading(true); setErr(null);
    const [depRes, asgRes] = await Promise.all([
      supabase.from('club_departments')
        .select('id, club_id, name, slug, sort_order, created_at')
        .eq('club_id', club.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase.from('user_departments')
        .select('department_id')
        .eq('club_id', club.id),
    ]);
    if (depRes.error) setErr(depRes.error.message);
    setRows(depRes.data || []);
    const c = {};
    (asgRes.data || []).forEach(r => { c[r.department_id] = (c[r.department_id] || 0) + 1; });
    setCounts(c);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [club?.id]);

  // Realtime so a manager editing in one tab sees changes mirrored
  // in another. Also picks up user_departments changes (which drive
  // the member-count column).
  useEffect(() => {
    if (!club?.id) return;
    const ch = supabase
      .channel(`departments:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_departments', filter: `club_id=eq.${club.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_departments',  filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.id]);

  const move = async (dep, dir) => {
    const i = rows.findIndex(r => r.id === dep.id);
    if (i < 0) return;
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= rows.length) return;
    const a = rows[i], b = rows[j];
    await Promise.all([
      supabase.from('club_departments').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('club_departments').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    load();
  };

  const totalAssigned = useMemo(
    () => Object.values(counts).reduce((sum, n) => sum + n, 0),
    [counts]
  );

  // List of existing names + slugs for collision checks in the modals.
  const existingNames = rows.map(r => r.name.toLowerCase());
  const existingSlugs = rows.map(r => r.slug);

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 12px', lineHeight: 1.55 }}>
        Departments are the staff groups that receive routed clubhouse-message notifications.
        Tap any department to see who&rsquo;s in it. Map topics to departments under{' '}
        <strong>Club Settings &rarr; Clubhouse Topic Routing</strong>.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <div
          onClick={() => setAdding(true)}
          data-tap
          style={{ padding: '8px 14px', background: G.green, borderRadius: 4, cursor: 'pointer' }}
        >
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 600 }}>+ Add Department</span>
        </div>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted }}>
          {rows.length} department{rows.length === 1 ? '' : 's'} · {totalAssigned} total assignment{totalAssigned === 1 ? '' : 's'}
        </span>
      </div>

      {err && (
        <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: '0 0 10px' }}>{err}</p>
      )}

      {loading ? (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0' }}>Loading departments…</p>
      ) : rows.length === 0 ? (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
            No departments yet. Add one to start routing clubhouse pushes by topic.
          </p>
        </div>
      ) : (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {rows.map((dep, i) => {
            const count = counts[dep.id] || 0;
            return (
              <div key={dep.id} style={{
                display: 'flex', alignItems: 'center', padding: '12px 14px',
                borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
                gap: 10,
              }}>
                {/* Reorder controls — stop propagation so clicking these
                    doesn't also fire the row's "open detail" click. */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <div onClick={(e) => { e.stopPropagation(); move(dep, 'up');   }} data-tap style={{ width: 22, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.3 : 1 }} title="Move up">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2.5"><polyline points="6 15 12 9 18 15" /></svg>
                  </div>
                  <div onClick={(e) => { e.stopPropagation(); move(dep, 'down'); }} data-tap style={{ width: 22, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: i === rows.length - 1 ? 'not-allowed' : 'pointer', opacity: i === rows.length - 1 ? 0.3 : 1 }} title="Move down">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                </div>

                {/* The rest of the row — clicking anywhere on this surface opens detail. */}
                <div
                  onClick={() => setDetail(dep)}
                  data-tap
                  style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minWidth: 0 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: 0, fontWeight: 500 }}>
                      {dep.name}
                    </p>
                    {/* v0.15.14 — slug code chip removed; users no longer see it */}
                  </div>

                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text }}>{count}</span>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>assigned</p>
                  </div>

                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal — name only; slug auto-generated */}
      {adding && (
        <AddDepartmentModal
          club={club}
          existingNames={existingNames}
          existingSlugs={existingSlugs}
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); load(); }}
        />
      )}

      {/* Detail modal — drills into a department, shows members, allows rename + delete */}
      {detail && (
        <DepartmentDetailModal
          department={detail}
          club={club}
          memberCount={counts[detail.id] || 0}
          existingNames={existingNames.filter(n => n !== detail.name.toLowerCase())}
          existingSlugs={existingSlugs.filter(s => s !== detail.slug)}
          onClose={() => setDetail(null)}
          onSaved={() => { setDetail(null); load(); }}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// AddDepartmentModal — minimal add UI. Name only.
// ───────────────────────────────────────────────────────────────
function AddDepartmentModal({ club, existingNames, existingSlugs, onClose, onSaved }) {
  useModalBackClose(true, onClose);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);

  const trimmed = name.trim();
  const nameClash = !!trimmed && existingNames.includes(trimmed.toLowerCase());
  const isValid = !!trimmed && !nameClash && !busy;

  const save = async () => {
    if (!isValid) return;
    setBusy(true); setErr(null);
    const slug = uniqueSlug(trimmed, existingSlugs);
    const { error } = await supabase.from('club_departments').insert({
      club_id: club.id,
      name: trimmed,
      slug,
      sort_order: 1000,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (isValid) save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, name]);

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 25 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>Add Department</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>
            Name
            <span style={{ color: G.clsDot, marginLeft: 3, fontWeight: 700 }}>*</span>
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Pro Shop, Course Maintenance, Tennis Pro"
            autoFocus
            style={inputStyle}
          />
          {nameClash && (
            <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.clsDot, margin: '4px 0 0' }}>
              There&rsquo;s already a department named &ldquo;{trimmed}&rdquo;. Pick a different name.
            </p>
          )}
        </div>

        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}

        <div onClick={isValid ? save : undefined} data-tap
          style={{
            padding: 12,
            background: isValid ? G.green : G.border,
            borderRadius: 3, textAlign: 'center',
            cursor: isValid ? 'pointer' : 'not-allowed',
            opacity: busy ? 0.6 : 1,
          }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: isValid ? '#F2EDE0' : G.muted, fontWeight: 500 }}>
            {busy ? 'Adding…' : 'Add Department'}
          </span>
        </div>

        <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, margin: '8px 0 0', textAlign: 'right', letterSpacing: '0.06em' }}>
          ESC to close · Ctrl/⌘+Enter to save
        </p>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// DepartmentDetailModal — drill-in view from the row click. Shows
// who's assigned, lets the manager remove individuals from the dept,
// rename the department inline, or delete the whole thing.
// ───────────────────────────────────────────────────────────────
function DepartmentDetailModal({ department, club, memberCount, existingNames, existingSlugs, onClose, onSaved }) {
  useModalBackClose(true, onClose);
  // Embedded rename state — starts in display mode, "edit" toggles to input.
  const [renaming, setRenaming]   = useState(false);
  const [name, setName]           = useState(department.name);
  const [renaming_busy, setRBusy] = useState(false);
  // Member list
  const [members, setMembers]     = useState([]);  // [{user_id, name, ...}]
  const [loading, setLoading]     = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [err, setErr]             = useState(null);
  // v0.15.15 — Add-staff picker. Opens a sub-modal listing all staff
  // at this club who AREN'T already in this department.
  const [addingStaff, setAddingStaff] = useState(false);

  const trimmed = name.trim();
  const nameClash = !!trimmed && existingNames.includes(trimmed.toLowerCase());
  const renameDirty = trimmed && trimmed !== department.name;
  const canRename = renameDirty && !nameClash && !renaming_busy;

  const loadMembers = async () => {
    setLoading(true);
    // user_departments → resolve names via members table + user_roles
    const { data: assignments } = await supabase
      .from('user_departments')
      .select('user_id, created_at')
      .eq('department_id', department.id)
      .eq('club_id', club.id);
    const ids = (assignments || []).map(a => a.user_id);
    if (ids.length === 0) { setMembers([]); setLoading(false); return; }
    const [{ data: m }, { data: roles }] = await Promise.all([
      supabase.from('members').select('user_id, name, photo_url').eq('club_id', club.id).in('user_id', ids),
      supabase.from('user_roles').select('user_id, role, display_name').in('user_id', ids),
    ]);
    const nameMap = {};
    const roleLabel = {};
    (m || []).forEach(r => { nameMap[r.user_id] = r.name; });
    (roles || []).forEach(r => {
      if (!nameMap[r.user_id]) nameMap[r.user_id] = r.display_name;
      const lbl = r.role === 'club_manager' ? 'Manager' : r.role === 'club_admin' ? 'Admin' : r.role === 'super_admin' ? 'Super Admin' : null;
      if (lbl && !roleLabel[r.user_id]) roleLabel[r.user_id] = lbl;
    });
    setMembers(ids.map(uid => ({
      user_id: uid,
      name: nameMap[uid] || `(${uid.slice(0,8)}…)`,
      role: roleLabel[uid] || null,
    })));
    setLoading(false);
  };

  useEffect(() => { loadMembers(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [department.id, club?.id]);

  const saveRename = async () => {
    if (!canRename) return;
    setRBusy(true); setErr(null);
    // Slug strategy on rename: keep the existing slug stable so the
    // topic-routing map keeps working. Only re-slug if the existing
    // slug is no longer a sensible match for the new name AND the
    // generated new slug doesn't collide — but to keep this simple and
    // safe, we keep the slug as-is and only update the display name.
    // (If a manager really wants the slug rebuilt, they can delete +
    // re-add the department, which is a deliberate action.)
    const { error } = await supabase
      .from('club_departments')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', department.id);
    setRBusy(false);
    if (error) { setErr(error.message); return; }
    setRenaming(false);
    onSaved?.();
  };

  const removeMember = async (uid) => {
    if (removingId) return;
    setRemovingId(uid); setErr(null);
    const { error } = await supabase
      .from('user_departments')
      .delete()
      .eq('user_id', uid)
      .eq('club_id', club.id)
      .eq('department_id', department.id);
    setRemovingId(null);
    if (error) { setErr(error.message); return; }
    loadMembers();
  };

  const remove = async () => {
    const confirmMsg = memberCount > 0
      ? `Delete the "${department.name}" department?\n\n${memberCount} person${memberCount === 1 ? ' is' : 's are'} currently assigned to it. Their assignment row${memberCount === 1 ? '' : 's'} will be removed automatically. Any topic routing that points to this department will fall back to "all staff" until you re-route it.`
      : `Delete the "${department.name}" department?`;
    if (!window.confirm(confirmMsg)) return;
    const { error } = await supabase.from('club_departments').delete().eq('id', department.id);
    if (error) { setErr(error.message); return; }
    onSaved?.();
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (renaming) { setRenaming(false); setName(department.name); }
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renaming]);

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 25 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        {/* Header — name with inline rename pencil */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {renaming ? (
              <div>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  style={{ ...inputStyle, fontSize: 17, fontFamily: '"Playfair Display",serif', fontWeight: 700 }}
                />
                {nameClash && (
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.clsDot, margin: '4px 0 0' }}>
                    There&rsquo;s already a department named &ldquo;{trimmed}&rdquo;. Pick a different name.
                  </p>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <div onClick={canRename ? saveRename : undefined} data-tap
                    style={{ padding: '6px 12px', background: canRename ? G.green : G.border, borderRadius: 3, cursor: canRename ? 'pointer' : 'not-allowed', opacity: renaming_busy ? 0.6 : 1 }}>
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: canRename ? '#F2EDE0' : G.muted, fontWeight: 600 }}>
                      {renaming_busy ? 'Saving…' : 'Save'}
                    </span>
                  </div>
                  <div onClick={() => { setRenaming(false); setName(department.name); }} data-tap
                    style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer' }}>
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, fontWeight: 500 }}>Cancel</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>{department.name}</h3>
                <div onClick={() => setRenaming(true)} data-tap title="Rename"
                  style={{ padding: 4, cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </div>
              </div>
            )}
          </div>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}

        {/* Member list — header row with section label + Add Staff button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 0 8px' }}>
          <div style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
            Assigned · {members.length}
          </div>
          <div
            onClick={() => setAddingStaff(true)}
            data-tap
            style={{ padding: '6px 12px', background: G.green, borderRadius: 14, cursor: 'pointer' }}
          >
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#F2EDE0', fontWeight: 600 }}>+ Add Staff</span>
          </div>
        </div>

        {loading ? (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, padding: '14px 0' }}>Loading…</p>
        ) : members.length === 0 ? (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '14px' }}>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0, lineHeight: 1.55 }}>
              Nobody&rsquo;s assigned to this department yet. Open a staff person from <strong>People</strong> and toggle this department on in their <strong>Departments</strong> chip row.
            </p>
          </div>
        ) : (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
            {members.map((m, i) => (
              <div key={m.user_id} style={{
                display: 'flex', alignItems: 'center', padding: '12px 14px',
                borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
                gap: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: 0, fontWeight: 500 }}>{m.name}</p>
                  {m.role && (
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '2px 0 0', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{m.role}</p>
                  )}
                </div>
                <div
                  onClick={() => removeMember(m.user_id)}
                  data-tap
                  title="Remove from department"
                  style={{ padding: '6px 10px', border: `1px solid ${G.border}`, borderRadius: 14, cursor: removingId === m.user_id ? 'wait' : 'pointer', opacity: removingId === m.user_id ? 0.6 : 1, flexShrink: 0 }}
                >
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, fontWeight: 600 }}>
                    {removingId === m.user_id ? 'Removing…' : 'Remove'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer — delete department */}
        <div onClick={remove} data-tap style={{ marginTop: 18, padding: 8, textAlign: 'center', cursor: 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, textDecoration: 'underline', textUnderlineOffset: 2 }}>Delete department</span>
        </div>
      </div>

      {/* v0.15.15 — Add-staff picker, rendered as a sibling so it
          stacks on top of the detail modal without interfering with
          the back-button close on the parent. */}
      {addingStaff && (
        <AddStaffToDepartmentModal
          department={department}
          club={club}
          alreadyAssignedUserIds={members.map(m => m.user_id)}
          onClose={() => setAddingStaff(false)}
          onAdded={() => { setAddingStaff(false); loadMembers(); onSaved?.(); }}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// AddStaffToDepartmentModal — picker showing every staff person at
// the club who isn't already in this department. Click to add.
// Inclusive of: club_manager, club_admin, and super_admins (who can
// be assigned to a department even though their role is club-wide).
// ───────────────────────────────────────────────────────────────
function AddStaffToDepartmentModal({ department, club, alreadyAssignedUserIds, onClose, onAdded }) {
  useModalBackClose(true, onClose);
  const [candidates, setCandidates] = useState([]); // [{user_id, name, role}]
  const [loading, setLoading]       = useState(true);
  const [addingId, setAddingId]     = useState(null);
  const [err, setErr]               = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr(null);
      // Pool of staff user_ids: club-scoped + super_admins
      const [{ data: clubStaff }, { data: supers }] = await Promise.all([
        supabase.from('user_roles')
          .select('user_id, role, display_name')
          .eq('club_id', club.id)
          .in('role', ['club_manager', 'club_admin']),
        supabase.from('user_roles')
          .select('user_id, role, display_name')
          .eq('role', 'super_admin')
          .is('club_id', null),
      ]);
      if (cancelled) return;
      const assigned = new Set(alreadyAssignedUserIds);
      const seenUid  = new Set(); // dedupe across club + super
      const roleLabel = (r) => r === 'club_manager' ? 'Manager' : r === 'club_admin' ? 'Admin' : 'Super Admin';
      const pool = [];
      [...(clubStaff || []), ...(supers || [])].forEach(r => {
        if (!r.user_id || assigned.has(r.user_id) || seenUid.has(r.user_id)) return;
        seenUid.add(r.user_id);
        pool.push({ user_id: r.user_id, role: roleLabel(r.role), display_name: r.display_name });
      });
      // Resolve human names from members table at this club, fall back to display_name
      const ids = pool.map(p => p.user_id);
      let names = {};
      if (ids.length) {
        const { data: members } = await supabase
          .from('members').select('user_id, name').eq('club_id', club.id).in('user_id', ids);
        (members || []).forEach(m => { names[m.user_id] = m.name; });
      }
      if (cancelled) return;
      setCandidates(pool.map(p => ({
        ...p,
        name: names[p.user_id] || p.display_name || `(${p.user_id.slice(0, 8)}…)`,
      })).sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department.id, club?.id]);

  const add = async (cand) => {
    if (addingId) return;
    setAddingId(cand.user_id); setErr(null);
    const { error } = await supabase.from('user_departments').insert({
      user_id: cand.user_id,
      club_id: club.id,
      department_id: department.id,
    });
    setAddingId(null);
    if (error) { setErr(error.message); return; }
    onAdded?.();
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 30 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>
            Add staff to {department.name}
          </h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '0 0 14px' }}>
          Pick one or more people to add. They keep their existing role and any other department assignments.
        </p>

        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}

        {loading ? (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, padding: '14px 0' }}>Loading…</p>
        ) : candidates.length === 0 ? (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '14px' }}>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0, lineHeight: 1.55 }}>
              Everyone with staff access at this club is already in <strong>{department.name}</strong>. Promote
              more members to staff under <strong>People</strong> if you want more options here.
            </p>
          </div>
        ) : (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
            {candidates.map((c, i) => (
              <div key={c.user_id} style={{
                display: 'flex', alignItems: 'center', padding: '12px 14px',
                borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
                gap: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: 0, fontWeight: 500 }}>{c.name}</p>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '2px 0 0', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{c.role}</p>
                </div>
                <div
                  onClick={() => add(c)}
                  data-tap
                  style={{ padding: '6px 12px', background: addingId === c.user_id ? G.border : G.green, borderRadius: 14, cursor: addingId ? 'wait' : 'pointer', opacity: addingId && addingId !== c.user_id ? 0.4 : 1, flexShrink: 0 }}
                >
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: '#F2EDE0', fontWeight: 600 }}>
                    {addingId === c.user_id ? 'Adding…' : 'Add'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
