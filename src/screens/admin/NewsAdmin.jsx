// Extracted from sections.jsx — NewsAdminFull + helpers.
// Behavior unchanged; re-exported from sections.jsx for back-compat.
import { useEffect, useState } from 'react';
import { G } from '../../theme.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { supabase } from '../../lib/supabase.js';
import { useConfirm } from '../../components/ConfirmModal.jsx';

// ============================================================
// NewsAdminFull — replaces the old composer with full list + edit + delete
// ============================================================
// v0.9.10: custom component (was CrudSection) so we can wire the
// archive lifecycle UX:
//   · expires_at date picker with smart default = max(today + 14d,
//     event-date + 14d), prefilled so the no-thought case archives
//     sensibly
//   · "Never" button clears expires_at to NULL = evergreen
//   · Faded "ARCHIVED" tag on past-expired rows
//   · "Show archived" toggle (default OFF — matches the member feed
//     for a cleaner working view)
const NEWS_CATEGORIES = ['Events', 'Course', 'Dining', 'Club', 'General'];

// Smart default for expires_at: 14 days after the LATER of (today,
// parsed-date_label). Returns ISO datetime string.
function computeDefaultExpires(dateLabelStr) {
  const fourteenMs = 14 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  let baseline = now;
  // date_label may be ISO 'YYYY-MM-DD' (v0.6.0+ format) or free-text
  // legacy. Only parse the strict ISO shape; otherwise fall back to today.
  if (typeof dateLabelStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateLabelStr)) {
    const parsed = Date.parse(`${dateLabelStr}T12:00:00`);
    if (Number.isFinite(parsed) && parsed > baseline) baseline = parsed;
  }
  return new Date(baseline + fourteenMs).toISOString();
}

// Convert ISO timestamp to YYYY-MM-DD for <input type="date">.
function isoToDateInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function NewsAdminFull() {
  const { club, hasPerm } = useAuth();
  const canEdit = hasPerm('can_post_news');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);     // row | 'new' | null
  const [showArchived, setShowArchived] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('news')
        .select('id, category, headline, body, date_label, published_at, expires_at')
        .eq('club_id', club.id)
        .order('published_at', { ascending: false })
        .limit(200);
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    })();
    const channel = supabase
      .channel(`news_admin:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news', filter: `club_id=eq.${club.id}` }, () => setVersion(v => v + 1))
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, version]);

  const isArchived = (r) => r.expires_at && new Date(r.expires_at).getTime() <= Date.now();
  const visibleRows = showArchived ? rows : rows.filter(r => !isArchived(r));
  const hiddenCount = rows.length - visibleRows.length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0, flex: 1 }}>
          {rows.length} item{rows.length === 1 ? '' : 's'}
          {hiddenCount > 0 && !showArchived && ` · ${hiddenCount} archived hidden`}
          {!canEdit && ' · view only'}
        </p>
        {hiddenCount > 0 && !showArchived && (
          <div onClick={() => setShowArchived(true)} data-tap style={{ padding: '5px 10px', background: G.bg, border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.brass }}>Show archived</span>
          </div>
        )}
        {showArchived && (
          <div onClick={() => setShowArchived(false)} data-tap style={{ padding: '5px 10px', background: G.bg, border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.brass }}>Hide archived</span>
          </div>
        )}
        {canEdit && (
          <div onClick={() => setEditing('new')} data-tap style={{ padding: '8px 14px', background: G.green, borderRadius: 3, cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>+ Add</span>
          </div>
        )}
      </div>

      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && visibleRows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
            {rows.length === 0 ? 'No news posts yet.' : 'No current news — toggle "Show archived" to see older items.'}
          </p>
        </div>
      )}
      {!loading && visibleRows.length > 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {visibleRows.map((r, i) => {
            const archived = isArchived(r);
            return (
              <div key={r.id} onClick={() => setEditing(r)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, cursor: 'pointer', gap: 8, opacity: archived ? 0.55 : 1 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.headline || '(no headline)'}</p>
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.category || 'General'}
                    {' · '}
                    {r.date_label || (r.published_at ? new Date(r.published_at).toLocaleDateString() : '')}
                    {archived && <span style={{ color: G.clsDot, fontWeight: 700 }}> · ARCHIVED</span>}
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <NewsEditor
          club={club}
          canEdit={canEdit}
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => setVersion(v => v + 1)}
        />
      )}
    </div>
  );
}

function NewsEditor({ club, canEdit, row, onClose, onSaved }) {
  const isAdd = !row;
  const confirmAsync = useConfirm(); // v0.16.8 — shared confirm modal
  const [form, setForm] = useState(() => row
    ? {
        category: row.category || 'General',
        headline: row.headline || '',
        body:     row.body || '',
        date_label: row.date_label || '',
        // Existing rows: keep whatever expires_at was saved (null =
        // evergreen). Suggest a default only on add.
        expires_at: row.expires_at || null,
      }
    : {
        category: 'Events',
        headline: '',
        body:     '',
        date_label: '',
        expires_at: computeDefaultExpires(null),
      });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  // When the event date changes on a NEW item, re-suggest expires_at
  // UNLESS the user already manually tweaked it. On edit, treat the
  // expires_at as user-touched (don't auto-overwrite their saved value).
  const [expiresTouched, setExpiresTouched] = useState(() => !isAdd);

  const setDateLabel = (v) => {
    setForm(prev => ({
      ...prev,
      date_label: v,
      expires_at: expiresTouched ? prev.expires_at : computeDefaultExpires(v),
    }));
  };
  const setExpiresAt = (v) => {
    setExpiresTouched(true);
    // <input type="date"> returns YYYY-MM-DD; store the END of the
    // chosen day so news stays visible THROUGH that day, not until
    // midnight at its start.
    setForm(prev => ({
      ...prev,
      expires_at: v ? new Date(`${v}T23:59:59`).toISOString() : null,
    }));
  };
  const setNever = () => {
    setExpiresTouched(true);
    setForm(prev => ({ ...prev, expires_at: null }));
  };

  const save = async () => {
    setErr(null);
    if (!form.headline?.trim()) { setErr('Headline is required.'); return; }
    if (!form.body?.trim()) { setErr('Body is required.'); return; }
    setBusy(true);
    const payload = {
      club_id: club.id,
      category: form.category,
      headline: form.headline.trim(),
      body: form.body,
      date_label: form.date_label || null,
      expires_at: form.expires_at || null,
    };
    const { error } = isAdd
      ? await supabase.from('news').insert(payload)
      : await supabase.from('news').update(payload).eq('id', row.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
    onClose();
  };

  const remove = async () => {
    if (!(await confirmAsync({
      title: `Delete "${row.headline}"?`,
      body: 'This cannot be undone. The post will disappear from member feeds.',
      confirmLabel: 'Delete',
      danger: true,
    }))) return;
    setBusy(true);
    // v0.16.9 — defense in depth: scope by id AND club_id
    const { error } = await supabase.from('news').delete().eq('id', row.id).eq('club_id', club.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
    onClose();
  };

  const input = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' };
  const label = { fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>{isAdd ? 'Add News Article' : 'Edit News Article'}</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={label}>Category <span style={{ color: G.clsDot }}>*</span></label>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={input}>
            {NEWS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={label}>Headline <span style={{ color: G.clsDot }}>*</span></label>
          <input value={form.headline} onChange={e => setForm(p => ({ ...p, headline: e.target.value }))} placeholder="What members see at a glance" style={input} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={label}>Body <span style={{ color: G.clsDot }}>*</span></label>
          <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Full article — supports newlines for paragraphs." style={{ ...input, height: 160, resize: 'none', lineHeight: 1.5 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={label}>Event / display date · optional</label>
          <input type="date" value={form.date_label || ''} onChange={e => setDateLabel(e.target.value)} style={input} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={label}>Archive on · default 14 days after event date (or today, whichever is later)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="date"
              value={isoToDateInput(form.expires_at)}
              onChange={e => setExpiresAt(e.target.value)}
              style={{ ...input, flex: 1 }}
            />
            <div onClick={setNever} data-tap style={{ padding: '0 14px', display: 'flex', alignItems: 'center', background: form.expires_at == null ? G.green : G.card, border: `1px solid ${form.expires_at == null ? G.green : G.border}`, borderRadius: 3, cursor: 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: form.expires_at == null ? '#F2EDE0' : G.muted, fontWeight: 500 }}>Never</span>
            </div>
          </div>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '4px 0 0' }}>
            {form.expires_at == null
              ? 'Evergreen — stays on the member feed forever.'
              : `Hidden from the member feed on ${new Date(form.expires_at).toLocaleDateString()}.`}
          </p>
        </div>

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
            <div onClick={busy ? undefined : save} data-tap style={{ marginTop: 8, padding: 12, background: busy ? G.muted : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Saving…' : (isAdd ? 'Publish' : 'Save Changes')}</span>
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
