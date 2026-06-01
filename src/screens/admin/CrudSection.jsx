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
  canEdit = true,    // when false, hides Add and disables Save/Delete in the modal
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
          {!canEdit && ' · view only'}
        </p>
        {canEdit && (
          <div onClick={() => setEditing('new')} data-tap style={{ padding: '8px 14px', background: G.green, borderRadius: 3, cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>+ Add</span>
          </div>
        )}
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
            // v0.12.6 — typography pass. Primary 13 → 15, secondary
            // 11 → 13, row padding 10/14 → 13/16, chevron 14 → 16.
            // Affects every CrudSection-backed admin list (News,
            // Push Broadcasts, Sponsor Banners, Hole Sponsors,
            // Menu Items, Pro Shop Items, Lesson Pros, Holes,
            // Member Guide, Sponsor Banners, and more) so the
            // bump propagates everywhere managers do CRUD work.
            return (
              <div key={row.id} onClick={() => setEditing(row)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '13px 16px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, cursor: 'pointer', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 15, color: G.text, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[primaryField] || '(unnamed)'}</p>
                  {sub && <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</p>}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
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
          canEdit={canEdit}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function CrudFormModal({ mode, club, table, title, row, fields, beforeSave, canEdit = true, onClose, onSaved }) {
  const isAdd = mode === 'add';
  const [form, setForm] = useState(() => ({ ...row }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Translate the common Postgres error codes Supabase surfaces into
  // plain English. The default messages ("null value in column X
  // violates not-null constraint") are unreadable to a club manager.
  const friendlyError = (e) => {
    const raw = e?.message || 'Save failed.';
    if (e?.code === '23502' || /violates not-null constraint/i.test(raw)) {
      const m = raw.match(/column "([^"]+)"/);
      return m ? `Missing required value: ${m[1].replace(/_/g, ' ')}.` : 'A required field is empty.';
    }
    if (e?.code === '23505' || /duplicate key/i.test(raw)) return 'That entry already exists.';
    if (e?.code === '42501' || /row-level security/i.test(raw)) return "You don't have permission to make this change.";
    return raw;
  };

  const save = async () => {
    setErr(null);
    // Client-side required-field check — saves a server round-trip and
    // points at the actual empty field instead of a Postgres constraint
    // message. A field is required if its definition says so OR if the
    // option `required` is true.
    const missing = fields
      .filter(f => f.required && (form[f.key] == null || form[f.key] === ''))
      .map(f => f.label);
    if (missing.length) {
      setErr(`Please fill in: ${missing.join(', ')}.`);
      return;
    }
    setBusy(true);
    const payload = beforeSave ? beforeSave({ ...form }) : { ...form };
    payload.club_id = club.id;
    let error;
    if (isAdd) {
      ({ error } = await supabase.from(table).insert(payload));
    } else {
      ({ error } = await supabase.from(table).update(payload).eq('id', row.id));
    }
    setBusy(false);
    if (error) { setErr(friendlyError(error)); return; }
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

        {/* Bigger, harder-to-miss error banner — the old single-line
            grey-on-cream text was so subtle that schema errors looked
            like the form just "froze." */}
        {err && (
          <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', marginBottom: 10, background: 'rgba(224,84,84,0.10)', border: `1px solid ${G.clsDot}`, borderRadius: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.clsDot} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: 0, lineHeight: 1.45, flex: 1 }}>{err}</p>
          </div>
        )}

        {canEdit ? (
          <>
            <div onClick={save} data-tap style={{ marginTop: 8, padding: 12, background: busy ? G.muted : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Saving…' : (isAdd ? 'Save' : 'Save Changes')}</span>
            </div>
            {!isAdd && (
              <div onClick={remove} data-tap style={{ marginTop: 10, padding: 8, textAlign: 'center', cursor: 'pointer' }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, textDecoration: 'underline', textUnderlineOffset: 2 }}>Delete</span>
              </div>
            )}
          </>
        ) : (
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, textAlign: 'center', margin: '12px 0 0' }}>
            View only. Ask your club manager to grant edit permission.
          </p>
        )}
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }) {
  const { key, label, type = 'text', options, placeholder, required } = field;
  const wrap = { marginBottom: 10 };
  const labelEl = (
    <label style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
      {label}{required && <span style={{ color: G.clsDot, marginLeft: 4 }}>*</span>}
    </label>
  );
  const input = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' };

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
  // Money — strictly numeric prices. Renders an inline $ glyph in the
  // input gutter, blurs to a 2-decimal display, stores as a 2-decimal
  // STRING (e.g. "12.50") so it round-trips correctly through both
  // numeric and text columns. Pre-v0.11.35 stored as a JS Number,
  // which lost trailing zeros on text columns (12.50 → "12.5" on
  // save → "12.5" on display — Marc's "$12.5" instead of "$12.50"
  // bug on menu items).
  //
  // For free-form prices that need to support "Market" or "Half $15 /
  // Full $25", use type='text' instead.
  if (type === 'money') {
    // Display: parse incoming (could be number, "12.50", "$12.50",
    // or "Market" from legacy data) and show as 2-decimal. Falls
    // back to empty when unparseable so the input stays usable.
    const parseInput = (v) => {
      if (v == null || v === '') return null;
      if (typeof v === 'number') return Number.isFinite(v) ? v : null;
      const stripped = String(v).replace(/[^0-9.\-]/g, '');
      const n = Number(stripped);
      return Number.isFinite(n) ? n : null;
    };
    const numeric = parseInput(value);
    const display = numeric == null ? '' : numeric.toFixed(2);
    return (
      <div style={wrap}>
        {labelEl}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, pointerEvents: 'none' }}>$</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={display}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') return onChange(null);
              const n = Number(raw);
              // Defer normalization until blur — onChange just tracks
              // the raw numeric input. type=number already blocks $
              // and other non-digits at the browser level.
              if (Number.isFinite(n)) onChange(String(n));
            }}
            onBlur={(e) => {
              const raw = e.target.value;
              if (raw === '') return;
              const n = Number(raw);
              if (Number.isFinite(n)) onChange(n.toFixed(2)); // "12.50" always
            }}
            placeholder={placeholder || '0.00'}
            style={{ ...input, paddingLeft: 24 }}
          />
        </div>
      </div>
    );
  }
  // Text/url/date/etc. Keep empty string as empty string; only convert
  // to null when the field is explicitly nullable (i.e. NOT required).
  // Previously this always coerced '' → null, which crashed NOT NULL
  // text columns (news.headline, news.body, menus.item_name) if the
  // user typed-then-deleted before saving.
  return (
    <div style={wrap}>
      {labelEl}
      <input
        type={type}
        value={value ?? ''}
        onChange={e => {
          const v = e.target.value;
          onChange(v === '' && !required ? null : v);
        }}
        placeholder={placeholder}
        style={input}
      />
    </div>
  );
}
