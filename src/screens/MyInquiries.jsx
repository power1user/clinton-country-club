// MyInquiries — member-facing read-only view of their own pro shop
// inquiries (lesson requests + general inquiries). v0.7.6 (Phase 7).
//
// Accessed via a button at the top of the ProShop screen. Members see
// everything they've submitted via LessonRequest (kind='lesson') or
// any future general-inquiry flow, sorted newest first, with each
// row expandable to show the full detail (focus areas, notes, etc.).
//
// Pure read-only. Staff continue to update status from the admin Pro
// Shop area (Admin → Pro Shop → Lesson Queue / Lesson Requests); the
// realtime subscription here means the member sees the new status
// without refreshing.
//
// No new tables — queries `pro_shop_inquiries` filtered by the
// member's id and club_id. RLS already restricts members to their
// own rows; the .eq filters are a defense-in-depth.
//
// Gated by either pro_shop or lesson_booking flag — if BOTH are off
// the screen has nothing to show, so we render FeatureOff. If at
// least one is on, the screen renders (a member could have legacy
// lesson requests even if lesson_booking later got turned off).
import { useEffect, useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useNav } from '../hooks/useNav.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { supabase, isConfigured } from '../lib/supabase.js';
import FeatureOff from '../components/FeatureOff.jsx';

// Same status palette the admin Lesson Queue uses, so a member
// glancing at their inquiry and a staffer glancing at the queue see
// the same colors and read the same urgency.
const STATUS_COLORS = {
  pending:   G.brass,
  contacted: G.limBg,
  scheduled: G.openBg,
  done:      G.muted,
  cancelled: G.clsBg,
};

const STATUS_DESC = {
  pending:   "Submitted — the pro shop will reach out soon.",
  contacted: "The pro shop has reached out via email or phone.",
  scheduled: "A time has been set. Check your email for the details.",
  done:      "Completed. Hope it went well!",
  cancelled: "This inquiry was cancelled.",
};

function relativeDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7)   return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDate(iso) {
  if (!iso) return '';
  // ISO date like "2026-05-24" — render in local timezone but parsed
  // at noon to dodge the off-by-one timezone display bug.
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function MyInquiries() {
  const { club, member } = useAuth();
  const proShopOn = useFlag('pro_shop');
  const lessonsOn = useFlag('lesson_booking');
  const { push } = useNav();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null); // inquiry id

  useEffect(() => {
    if (!isConfigured || !club || !member?.id) { setRows([]); setLoading(false); return; }
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from('pro_shop_inquiries')
        .select('id, kind, pro, preferred_date, preferred_time, skill_level, focus_areas, notes, status, created_at')
        .eq('club_id', club.id)
        .eq('member_id', member.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (!error) setRows(data || []);
      setLoading(false);
    };
    setLoading(true);
    load();

    // Realtime — when admin staff flip status from pending → contacted
    // → scheduled, the member sees the change without a refresh.
    // Filter scoped to this member's rows (RLS would block others
    // anyway, but the filter keeps the channel quiet).
    const channel = supabase
      .channel(`my_inquiries:${member.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pro_shop_inquiries', filter: `member_id=eq.${member.id}` },
        () => load(),
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, member?.id]);

  // Render FeatureOff only when BOTH flags are off — if the club has
  // disabled BOTH pro shop and lesson booking, this screen has no
  // legitimate path to it and nothing to show.
  if (!proShopOn && !lessonsOn) return <FeatureOff label="My Inquiries" />;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="My Inquiries" />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 28px' }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
          Lesson requests and pro shop inquiries you've submitted. Tap a row to see the full detail. Status updates live as the pro shop processes each request.
        </p>

        {loading && (
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '32px 0', textAlign: 'center', margin: 0 }}>Loading your inquiries…</p>
        )}

        {!loading && rows.length === 0 && (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, padding: '24px 18px', textAlign: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.3" style={{ marginBottom: 10 }}>
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
            <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 15, color: G.muted, margin: '0 0 6px' }}>No inquiries yet</p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
              When you book a lesson or submit a pro shop inquiry, it'll show up here so you can track the status.
            </p>
            {/* v0.9.14: empty-state CTAs per Marc's spec — wire members
                to the next action so this screen doesn't dead-end on a
                first visit. Lesson booking shown when the flag is on;
                the Pro Shop catalog link is always shown (entry to ask
                staff about anything else). */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {lessonsOn && (
                <div onClick={() => push('myclub/lessons')} data-tap style={{ padding: '9px 16px', background: G.green, borderRadius: 3, cursor: 'pointer' }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>Book a lesson →</span>
                </div>
              )}
              {proShopOn && (
                <div onClick={() => push('myclub/proshop')} data-tap style={{ padding: '9px 16px', background: G.card, border: `1px solid ${G.green}`, borderRadius: 3, cursor: 'pointer' }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.green, fontWeight: 500 }}>Browse Pro Shop →</span>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && rows.map(r => {
          const isOpen = expanded === r.id;
          const statusColor = STATUS_COLORS[r.status] || G.muted;
          const kindLabel = r.kind === 'lesson' ? 'Lesson Request' : 'Pro Shop Inquiry';
          // Brief one-line summary used in collapsed view. Prefers pro
          // name then focus areas then notes excerpt — whatever's most
          // descriptive at-a-glance.
          const summary =
            r.pro                                              ? `With ${r.pro}` :
            (r.focus_areas && r.focus_areas.length)            ? r.focus_areas.join(', ') :
            r.notes                                            ? r.notes.slice(0, 60) + (r.notes.length > 60 ? '…' : '') :
            '—';

          return (
            <div
              key={r.id}
              style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 10, overflow: 'hidden' }}
            >
              {/* Collapsed row — tap to expand */}
              <div onClick={() => setExpanded(isOpen ? null : r.id)} data-tap style={{ padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: statusColor, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{r.status}</span>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, marginLeft: 'auto' }}>{relativeDate(r.created_at)}</span>
                </div>
                <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 2px' }}>{kindLabel}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: 0, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</p>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ borderTop: `1px solid ${G.border}`, padding: '12px 14px', background: G.bg }}>
                  {/* Status caption — gives context for what the badge means */}
                  <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.text, margin: '0 0 10px', lineHeight: 1.5 }}>
                    {STATUS_DESC[r.status] || ''}
                  </p>
                  <DetailRow label="Submitted" value={new Date(r.created_at).toLocaleString()} />
                  {r.pro              && <DetailRow label="Pro"            value={r.pro} />}
                  {r.preferred_date   && <DetailRow label="Preferred date" value={fmtDate(r.preferred_date)} />}
                  {r.preferred_time   && <DetailRow label="Preferred time" value={r.preferred_time} />}
                  {r.skill_level      && <DetailRow label="Skill level"    value={r.skill_level} />}
                  {r.focus_areas && r.focus_areas.length > 0 && (
                    <DetailRow label="Focus areas" value={r.focus_areas.join(', ')} />
                  )}
                  {r.notes && (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 700 }}>Notes</p>
                      <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{r.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: `1px solid ${G.border}`, gap: 12 }}>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, textAlign: 'right', maxWidth: '65%' }}>{value}</span>
    </div>
  );
}
