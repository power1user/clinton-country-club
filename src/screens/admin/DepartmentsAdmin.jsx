// DepartmentsAdmin — v0.15.13 (Phase 17 — department-based notification routing).
//
// Per-club catalog of named departments (Dining, Pro Shop, Course,
// Front Desk by default). Staff get assigned to one or more via the
// PersonEditModal Actions section. Clubhouse-thread pushes route
// from `clubs.clubhouse_topic_routing` (topic → department slug) to
// `user_departments` (department → people).
//
// This screen lets the manager add / rename / delete / reorder
// departments. Manager-only (gated upstream in AdminPanel routing —
// the section sets `managerOnly: true`).
//
// Member-count column is informational. Click a row → edit modal.

import { useEffect, useMemo, useState } from 'react';
import { G } from '../../theme.js';
import { supabase } from '../../lib/supabase.js';

const labelStyle = { fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };
const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, backgroundColor: G.card, outline: 'none', boxSizing: 'border-box' };

// Auto-slug helper: kebab-case, alphanumeric only.
function slugify(s) {
  return (s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

export default function DepartmentsAdmin({ club }) {
  const [rows, setRows]       = useState([]);
  const [counts, setCounts]   = useState({}); // { department_id: number }
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // department row or { mode: 'add' }
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

  // v0.15.13 — Realtime so a manager editing in one tab sees changes
  // mirrored in another. Cheap subscription; we just reload on any
  // INSERT/UPDATE/DELETE in club_departments for this club.
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
    // Swap sort_order values
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

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 12px', lineHeight: 1.55 }}>
        Departments are the staff groups that receive routed clubhouse-message notifications.
        Map topics to departments under <strong>Club Settings &rarr; Clubhouse Topic Routing</strong>,
        and assign staff to departments from each person&rsquo;s Edit modal on the People screen.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <div
          onClick={() => setEditing({ mode: 'add' })}
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
                {/* Reorder controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <div onClick={() => move(dep, 'up')}   data-tap style={{ width: 22, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.3 : 1 }} title="Move up">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2.5"><polyline points="6 15 12 9 18 15" /></svg>
                  </div>
                  <div onClick={() => move(dep, 'down')} data-tap style={{ width: 22, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: i === rows.length - 1 ? 'not-allowed' : 'pointer', opacity: i === rows.length - 1 ? 0.3 : 1 }} title="Move down">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                </div>

                {/* Identity (clickable to edit) */}
                <div onClick={() => setEditing(dep)} data-tap style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: 0, fontWeight: 500 }}>
                    {dep.name}
                  </p>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '2px 0 0', letterSpacing: '0.06em' }}>
                    <code style={{ background: G.bg, padding: '1px 5px', borderRadius: 2 }}>{dep.slug}</code>
                  </p>
                </div>

                {/* Member count */}
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text }}>{count}</span>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>assigned</p>
                </div>

                {/* Edit chevron */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <DepartmentEditModal
          mode={editing.mode === 'add' ? 'add' : 'edit'}
          department={editing.mode === 'add' ? null : editing}
          club={club}
          existingSlugs={rows.filter(r => r.id !== editing?.id).map(r => r.slug)}
          memberCount={editing.id ? (counts[editing.id] || 0) : 0}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// DepartmentEditModal — bottom-sheet add/edit, mirrors PersonEditModal
// styling so the People area surfaces feel like a family.
// ───────────────────────────────────────────────────────────────
function DepartmentEditModal({ mode, department, club, existingSlugs, memberCount, onClose, onSaved }) {
  const isAdd = mode === 'add';
  const [name, setName] = useState(department?.name || '');
  const [slug, setSlug] = useState(department?.slug || '');
  const [slugTouched, setSlugTouched] = useState(!isAdd);  // edit mode: don't auto-overwrite an existing slug
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);

  const onName = (v) => {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  };
  const onSlug = (v) => {
    setSlug(slugify(v));
    setSlugTouched(true);
  };

  // Validation: name + slug required, slug must be unique within club,
  // slug must be non-trivial (>=2 chars), no whitespace.
  const trimmedName = name.trim();
  const slugClash = !!slug && existingSlugs.includes(slug);
  const slugTooShort = slug.length < 2;
  const isValid = !!trimmedName && !slugClash && !slugTooShort && !busy;

  const save = async () => {
    if (!isValid) return;
    setBusy(true); setErr(null);
    const row = {
      club_id: club.id,
      name: trimmedName,
      slug,
      sort_order: department?.sort_order ?? 1000, // new departments go to the bottom by default
    };
    const { error } = isAdd
      ? await supabase.from('club_departments').insert(row)
      : await supabase.from('club_departments').update({ name: row.name, slug: row.slug, updated_at: new Date().toISOString() }).eq('id', department.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
  };

  const remove = async () => {
    if (!department?.id) return;
    const confirmMsg = memberCount > 0
      ? `Delete the "${department.name}" department?\n\n${memberCount} person${memberCount === 1 ? ' is' : 's are'} currently assigned to it. Their assignment row${memberCount === 1 ? '' : 's'} will be removed automatically. The topic routing map will still reference the slug — re-route topics afterwards if needed.`
      : `Delete the "${department.name}" department?`;
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    const { error } = await supabase.from('club_departments').delete().eq('id', department.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
  };

  // Keyboard shortcuts — match PersonEditModal: ESC closes, Ctrl/⌘+Enter saves
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (isValid) save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, name, slug]);

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 25 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>
            {isAdd ? 'Add Department' : 'Edit Department'}
          </h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>
            Name
            <span style={{ color: G.clsDot, marginLeft: 3, fontWeight: 700 }}>*</span>
          </label>
          <input
            value={name}
            onChange={e => onName(e.target.value)}
            placeholder="e.g. Pro Shop, Course Maintenance, Tennis Pro"
            style={inputStyle}
          />
          {!trimmedName && name.length > 0 && (
            <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.clsDot, margin: '4px 0 0' }}>Required.</p>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            Slug
            <span style={{ color: G.clsDot, marginLeft: 3, fontWeight: 700 }}>*</span>
          </label>
          <input
            value={slug}
            onChange={e => onSlug(e.target.value)}
            placeholder="auto-generated from the name"
            style={inputStyle}
          />
          {slugClash && (
            <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.clsDot, margin: '4px 0 0' }}>
              This slug is already used by another department at this club.
            </p>
          )}
          {!slugClash && slugTooShort && slug.length > 0 && (
            <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.clsDot, margin: '4px 0 0' }}>
              At least 2 characters.
            </p>
          )}
          <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '4px 0 0', fontStyle: 'italic' }}>
            The slug is the stable identifier used in topic routing. Rename the department freely; changing the slug also re-routes anything pointing here.
          </p>
        </div>

        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <div onClick={isValid ? save : undefined} data-tap
            style={{
              flex: 1, padding: 12,
              background: isValid ? G.green : G.border,
              borderRadius: 3, textAlign: 'center',
              cursor: isValid ? 'pointer' : 'not-allowed',
              opacity: busy ? 0.6 : 1,
            }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: isValid ? '#F2EDE0' : G.muted, fontWeight: 500 }}>
              {busy ? 'Saving…' : (isAdd ? 'Add Department' : 'Save')}
            </span>
          </div>
        </div>

        {!isAdd && (
          <div onClick={remove} data-tap style={{ marginTop: 10, padding: 8, textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, textDecoration: 'underline', textUnderlineOffset: 2 }}>Delete department</span>
          </div>
        )}

        <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, margin: '8px 0 0', textAlign: 'right', letterSpacing: '0.06em' }}>
          ESC to close · Ctrl/⌘+Enter to save
        </p>
      </div>
    </div>
  );
}
