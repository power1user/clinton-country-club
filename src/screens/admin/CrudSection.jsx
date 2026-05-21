// Generic CRUD scaffold for admin sub-sections. Used by the simpler tables
// (menu_categories, pro_shop_items, hole_sponsors, sponsor_banners, etc).
// Specialized queue-style sections (food_orders, event_registrations,
// lesson_requests) get custom components instead.
//
// Pass:
//   table         — Supabase table name (string)
//   title         — header for empty state / labels (string)
//   emptyMsg      — message when zero rows (string)
//   columns       — array of columns to SELECT (string[])
//   order         — { column, ascending } for query ordering
//   primaryField  — key to display as the row title
//   secondaryFn   — optional (row) => string for the line below the title
//   defaultRow    — initial form values for "add"
//   fields        — [{ key, label, type, options?, placeholder?, span? }]
//                   type: 'text' | 'textarea' | 'number' | 'date' | 'time' |
//                         'datetime-local' | 'select' | 'checkbox' | 'url'
//   beforeSave    — optional (form) => form transform before insert/update
//   realtime      — true to subscribe to postgres_changes (default true)
import { useEffect, useState, useRef } from 'react';
import { G } from '../../theme.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { supabase, isConfigured } from '../../lib/supabase.js';

export default function CrudSection({
  table,
  title,
  emptyMsg,
  columns,
  order = { column: 'created_at', ascending: false },
  primaryField,
  secondaryFn,
  defaultRow,
  fields,
  beforeSave,
  realtime = true,
}) {
  const { club } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // row | 'new' | null
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!isConfigured || !club) { setRows([]); setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from(table)
        .select(columns.join(', '))
        .eq('club_id', club.id)
        .order(order.column, { ascending: order.ascending });
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    };
    load();
    if (!realtime) return () => { cancelled = true; };

    const channel = supabase
      .channel(`${table}:${club?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, version]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0, flex: 1 }}>
          {rows.length} {rows.length === 1 ? 'item' : 'items'}
        </p>
        <div onClick={() => setEditing('new')} data-tap style={{ padding: '8px 14px', background: G.green, borderRadius: 3, cursor: 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>+ Add</span>
        </div>
      </div>

      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>{emptyMsg}</p>
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {rows.map((row, i) => {
            const sub = secondaryFn ? secondaryFn(row) : null;
            return (
              <div key={row.id} onClick={() => setEditing(row)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, cursor: 'pointer', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[primaryField] || '(unnamed)'}</p>
                  {sub && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</p>}
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <CrudFormModal
          mode={editing === 'new' ? 'add' : 'edit'}
          club={club}
          table={table}
          title={title}
          row={editing === 'new' ? defaultRow : editing}
          fields={fields}
          beforeSave={beforeSave}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function CrudFormModal({ mode, club, table, title, row, fields, beforeSave, onClose, onSaved }) {
  const isAdd = mode === 'add';
  const [form, setForm] = useState(() => ({ ...row }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true); setErr(null);
    const payload = beforeSave ? beforeSave({ ...form }) : { ...form };
    payload.club_id = club.id;
    let error;
    if (isAdd) {
      ({ error } = await supabase.from(table).insert(payload));
    } else {
      ({ error } = await supabase.from(table).update(payload).eq('id', row.id));
    }
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
    onClose();
  };

  const remove = async () => {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    setBusy(true);
    const { error } = await supabase.from(table).delete().eq('id', row.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>{isAdd ? `Add ${title}` : `Edit ${title}`}</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        {fields.map(f => (
          <FieldInput key={f.key} field={f} value={form[f.key]} onChange={v => set(f.key, v)} />
        ))}

        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}

        <div onClick={save} data-tap style={{ marginTop: 8, padding: 12, background: busy ? G.muted : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Saving…' : (isAdd ? 'Save' : 'Save Changes')}</span>
        </div>
        {!isAdd && (
          <div onClick={remove} data-tap style={{ marginTop: 10, padding: 8, textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, textDecoration: 'underline', textUnderlineOffset: 2 }}>Delete</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  const { key, label, type = 'text', options, placeholder } = field;
  const wrap = { marginBottom: 10 };
  const labelEl = (
    <label style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>{label}</label>
  );
  const input = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' };

  if (type === 'textarea') {
    return (
      <div style={wrap}>
        {labelEl}
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...input, height: 100, resize: 'none', lineHeight: 1.5 }} />
      </div>
    );
  }
  if (type === 'select') {
    return (
      <div style={wrap}>
        {labelEl}
        <select value={value ?? ''} onChange={e => onChange(e.target.value)} style={input}>
          {options.map(o => (
            <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
              {typeof o === 'string' ? o : o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (type === 'checkbox') {
    return (
      <label style={{ ...wrap, fontFamily: '"Lora",serif', fontSize: 12, color: G.text, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
        {label}
      </label>
    );
  }
  if (type === 'number') {
    return (
      <div style={wrap}>
        {labelEl}
        <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))} placeholder={placeholder} style={input} />
      </div>
    );
  }
  return (
    <div style={wrap}>
      {labelEl}
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value || null)} placeholder={placeholder} style={input} />
    </div>
  );
}
