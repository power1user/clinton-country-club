// ClubhouseRoutingAdmin — v0.15.13 (Phase 17).
//
// Per-club config screen for: when a member starts a clubhouse thread
// on topic X, which departments receive the push?
//
// Data shape on clubs.clubhouse_topic_routing (jsonb):
//   { "Topic Name": ["dept-slug-1", "dept-slug-2"], ... }
// Missing topic or empty array → send-push falls back to "all staff
// at the club" so a misconfigured topic never silently drops messages.
//
// Topics are hardcoded in MessageClubhouse.jsx (the 5 topic buttons:
// Pro Shop / Restaurant / Tee Times / Course / General). If those ever
// become per-club configurable, this UI will need to read from that
// source instead of the hardcoded list below.
//
// Manager-only — gated upstream in AdminPanel routing.
//
// The "Preview routing" button per row is Marc's smoke-test affordance:
// it runs the same recipient-resolution that send-push will do, and
// shows the resulting list of users who would be pushed — without
// actually sending anything.

import { useEffect, useState } from 'react';
import { G } from '../../theme.js';
import { supabase } from '../../lib/supabase.js';
import { useModalBackClose } from '../../hooks/useModalBackClose.js';

// Match TOPICS in screens/MessageClubhouse.jsx. If those change there,
// also bump this list (or move topics into a shared module).
const TOPICS = [
  { id: 'Pro Shop',   hint: 'Lessons, equipment, fittings, tee-time requests' },
  { id: 'Restaurant', hint: 'Reservations, menu questions, dietary needs' },
  { id: 'Tee Times',  hint: 'Booking, changes, cancellations, foursomes' },
  { id: 'Course',     hint: 'Conditions, pace of play, pin placements' },
  { id: 'General',    hint: 'Anything else for the front office' },
];

export default function ClubhouseRoutingAdmin({ club }) {
  const [departments, setDepartments] = useState([]);    // [{id, name, slug, ...}]
  const [routing, setRouting]         = useState({});    // mirrors clubs.clubhouse_topic_routing
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [err, setErr]                 = useState(null);
  const [previewFor, setPreviewFor]   = useState(null);  // topic id we're previewing
  const [preview, setPreview]         = useState(null);  // { count, names: [...], fallback: bool }

  // v0.15.15 — phone back-button closes the preview modal.
  useModalBackClose(!!previewFor, () => { setPreviewFor(null); setPreview(null); });

  const load = async () => {
    if (!club?.id) return;
    setLoading(true); setErr(null);
    const [depRes, clubRes] = await Promise.all([
      supabase.from('club_departments')
        .select('id, name, slug, sort_order')
        .eq('club_id', club.id)
        .order('sort_order', { ascending: true }),
      supabase.from('clubs').select('clubhouse_topic_routing').eq('id', club.id).single(),
    ]);
    setDepartments(depRes.data || []);
    setRouting(clubRes.data?.clubhouse_topic_routing || {});
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [club?.id]);

  // Realtime — pick up department renames or new departments
  // without a manual refresh.
  useEffect(() => {
    if (!club?.id) return;
    const ch = supabase
      .channel(`routing:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_departments', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.id]);

  const slugsForTopic = (topic) => Array.isArray(routing[topic]) ? routing[topic] : [];

  const toggleSlug = async (topic, slug) => {
    if (saving) return;
    const current = slugsForTopic(topic);
    const next = current.includes(slug) ? current.filter(s => s !== slug) : [...current, slug];
    const nextRouting = { ...routing, [topic]: next };
    setRouting(nextRouting);   // optimistic
    setSaving(true); setErr(null);
    const { error } = await supabase
      .from('clubs')
      .update({ clubhouse_topic_routing: nextRouting })
      .eq('id', club.id);
    setSaving(false);
    if (error) {
      setErr(error.message);
      setRouting(routing);     // roll back
    }
  };

  // Preview = compute who would be pushed for this topic *right now*,
  // without sending. Mirrors the resolution send-push v20 will do:
  //   recipients = union(department-members, super_admins),
  //              minus the would-be sender
  // We don't have a sender in a "preview" — show the whole pool so
  // the manager can spot misconfigurations (e.g. "Restaurant routes
  // to Dining but nobody's assigned to Dining yet").
  const runPreview = async (topic) => {
    setPreviewFor(topic); setPreview(null);
    const slugs = slugsForTopic(topic);
    if (slugs.length === 0) {
      // Fallback path
      const { data: staff } = await supabase
        .from('user_roles')
        .select('user_id, display_name')
        .eq('club_id', club.id)
        .in('role', ['club_manager', 'club_admin']);
      const { data: supers } = await supabase
        .from('user_roles')
        .select('user_id, display_name')
        .eq('role', 'super_admin')
        .is('club_id', null);
      const ids = new Set();
      const labels = [];
      [...(staff || []), ...(supers || [])].forEach(r => {
        if (!ids.has(r.user_id)) {
          ids.add(r.user_id);
          labels.push(r.display_name || r.user_id.slice(0, 8));
        }
      });
      setPreview({ count: ids.size, names: labels, fallback: true });
      return;
    }
    // Department-based path
    const deptIds = departments.filter(d => slugs.includes(d.slug)).map(d => d.id);
    if (deptIds.length === 0) {
      setPreview({ count: 0, names: [], fallback: false, warn: 'Routing references slugs that no longer exist as departments.' });
      return;
    }
    const { data: assigned } = await supabase
      .from('user_departments')
      .select('user_id')
      .eq('club_id', club.id)
      .in('department_id', deptIds);
    const { data: supers } = await supabase
      .from('user_roles')
      .select('user_id, display_name')
      .eq('role', 'super_admin')
      .is('club_id', null);
    const ids = new Set();
    (assigned || []).forEach(a => ids.add(a.user_id));
    (supers || []).forEach(s => ids.add(s.user_id));
    // Resolve display names from members table + user_roles fallback
    const idsArr = Array.from(ids);
    const [{ data: members }, { data: roles }] = await Promise.all([
      supabase.from('members').select('user_id, name').eq('club_id', club.id).in('user_id', idsArr),
      supabase.from('user_roles').select('user_id, display_name').in('user_id', idsArr),
    ]);
    const nameMap = {};
    (members || []).forEach(m => { nameMap[m.user_id] = m.name; });
    (roles || []).forEach(r => { if (!nameMap[r.user_id]) nameMap[r.user_id] = r.display_name; });
    const names = idsArr.map(id => nameMap[id] || `(${id.slice(0, 8)}…)`).sort();
    setPreview({ count: idsArr.length, names, fallback: false });
  };

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 14px', lineHeight: 1.55 }}>
        When a member starts a clubhouse thread on a topic, push notifications go to staff in the
        departments mapped here. Define the staff groups under <strong>People &rarr; Departments</strong>,
        then assign people to departments via each person's Edit modal. Super-admins always
        receive a copy regardless.
      </p>

      {err && (
        <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: '0 0 10px' }}>{err}</p>
      )}

      {loading ? (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0' }}>Loading…</p>
      ) : departments.length === 0 ? (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0, lineHeight: 1.55 }}>
            No departments defined yet at this club. Add some under <strong>People &rarr; Departments</strong> first
            (defaults: Dining, Pro Shop, Course, Front Desk).
          </p>
        </div>
      ) : (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {TOPICS.map((t, i) => {
            const selected = slugsForTopic(t.id);
            return (
              <div key={t.id} style={{
                padding: '14px 14px 12px',
                borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                  <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: 0 }}>
                    {t.id}
                  </h4>
                  <div
                    onClick={() => runPreview(t.id)}
                    data-tap
                    style={{ padding: '4px 10px', border: `1px solid ${G.border}`, borderRadius: 14, cursor: 'pointer' }}
                  >
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
                      Preview routing
                    </span>
                  </div>
                </div>
                <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '0 0 8px' }}>
                  {t.hint}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {departments.map(dep => {
                    const on = selected.includes(dep.slug);
                    return (
                      <div
                        key={dep.id}
                        onClick={() => toggleSlug(t.id, dep.slug)}
                        data-tap
                        title={dep.slug}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 14,
                          background: on ? G.brass : 'transparent',
                          border: `1px solid ${on ? G.brass : G.border}`,
                          cursor: saving ? 'wait' : 'pointer',
                          opacity: saving ? 0.6 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {on && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#F2E5C0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        <span style={{
                          fontFamily: '"Lora",serif',
                          fontSize: 12,
                          color: on ? '#F2E5C0' : G.text,
                          fontWeight: on ? 600 : 400,
                        }}>
                          {dep.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {selected.length === 0 && (
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '8px 0 0', fontStyle: 'italic' }}>
                    No departments mapped — falls back to all staff at the club.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewFor && (
        <div
          onClick={() => { setPreviewFor(null); setPreview(null); }}
          style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: G.bg, border: `1px solid ${G.border}`, borderRadius: 6, padding: 22, width: 'min(420px, 92%)', maxHeight: '80%', overflowY: 'auto' }}
          >
            <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: '0 0 4px' }}>
              Preview · {previewFor}
            </h3>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '0 0 14px' }}>
              These are the people who would receive a push if a member messaged on this topic right now.
            </p>
            {!preview ? (
              <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted }}>Computing…</p>
            ) : (
              <>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: '0 0 10px' }}>
                  <strong>{preview.count}</strong> recipient{preview.count === 1 ? '' : 's'}
                  {preview.fallback && <span style={{ color: G.brass }}> · fallback to all staff</span>}
                </p>
                {preview.warn && (
                  <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, margin: '0 0 10px' }}>{preview.warn}</p>
                )}
                {preview.count === 0 ? (
                  <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.clsDot, margin: 0 }}>
                    Nobody would receive a push for this topic. Assign at least one staff person to the mapped department(s),
                    or leave the mapping empty to fall back to all staff.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {preview.names.map((n, i) => (
                      <li key={i} style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, padding: '4px 0', borderTop: i === 0 ? 'none' : `1px solid ${G.border}` }}>
                        {n}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            <div
              onClick={() => { setPreviewFor(null); setPreview(null); }}
              data-tap
              style={{ marginTop: 14, padding: '8px 14px', background: G.green, borderRadius: 4, textAlign: 'center', cursor: 'pointer' }}
            >
              <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 600 }}>Close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
