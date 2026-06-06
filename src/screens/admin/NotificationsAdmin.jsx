// Extracted from sections.jsx — NotificationsAdmin + helpers.
// Behavior unchanged; re-exported from sections.jsx for back-compat.
import { useEffect, useState } from 'react';
import { G } from '../../theme.js';
import { useAuth } from '../../hooks/useAuth.jsx';
import { supabase } from '../../lib/supabase.js';

// ============================================================
// notification_messages — admin composer + history
// ============================================================
export function NotificationsAdmin() {
  const { club, session, hasPerm } = useAuth();
  const canEdit = hasPerm('can_send_notifications');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('notification_messages')
        .select('id, title, body, urgency, published_at, created_at')
        .eq('club_id', club.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [club?.id, version]);

  return (
    <div>
      {/* v0.12.8 — typography pass round 2. Push Broadcasts history:
          title 14 → 16, body 12 → 14, timestamp 10 → 12, count
          12 → 13, compose button 12 → 13. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0, flex: 1 }}>
          {rows.length} message{rows.length === 1 ? '' : 's'}{!canEdit && ' · view only'}
        </p>
        {canEdit && (
          <div onClick={() => setComposing(true)} data-tap style={{ padding: '9px 14px', background: G.green, borderRadius: 3, cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>+ Compose</span>
          </div>
        )}
      </div>

      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && rows.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '18px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0 }}>No notifications sent yet.</p>
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <div key={r.id} style={{ padding: '14px 16px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}` }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: urgencyColor(r.urgency), padding: '2px 6px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{r.urgency}</span>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: 0 }}>
                  {r.published_at ? `Sent ${new Date(r.published_at).toLocaleString()}` : 'Draft'}
                </p>
              </div>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: '0 0 3px' }}>{r.title}</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, margin: 0, lineHeight: 1.5 }}>{r.body}</p>
            </div>
          ))}
        </div>
      )}

      {composing && (
        <ComposeNotificationModal
          club={club}
          authorId={session?.user?.id}
          onClose={() => setComposing(false)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function urgencyColor(u) {
  if (u === 'urgent') return G.clsBg;
  if (u === 'high') return G.limBg;
  if (u === 'low') return G.muted;
  return G.brass;
}

function ComposeNotificationModal({ club, authorId, onClose, onSaved }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [publishNow, setPublishNow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const save = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.from('notification_messages').insert({
      club_id: club.id,
      title: title.trim(),
      body: body.trim(),
      urgency,
      created_by: authorId,
      published_at: publishNow ? new Date().toISOString() : null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
    onClose();
  };

  const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>Compose Notification</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Course update, event reminder…" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="The message members will see…" style={{ ...inputStyle, height: 110, resize: 'none', lineHeight: 1.5 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Urgency</label>
          <select value={urgency} onChange={e => setUrgency(e.target.value)} style={inputStyle}>
            {['low', 'normal', 'high', 'urgent'].map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <label style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12 }}>
          <input type="checkbox" checked={publishNow} onChange={e => setPublishNow(e.target.checked)} />
          Publish now (uncheck to save as draft)
        </label>
        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}
        <div onClick={save} data-tap style={{ padding: 12, background: title && body && !busy ? G.green : G.border, borderRadius: 3, textAlign: 'center', cursor: title && body && !busy ? 'pointer' : 'not-allowed' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: title && body && !busy ? '#F2EDE0' : G.muted, fontWeight: 500 }}>{busy ? 'Sending…' : (publishNow ? 'Publish' : 'Save Draft')}</span>
        </div>
      </div>
    </div>
  );
}
