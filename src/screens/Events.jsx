// Community tab root — v0.7.11 redesign.
//
// Was previously the calendar surface with a few section nav cards
// crammed at the top. Marc's feedback: "the calendar should be a
// selection card (like bulletin board and member directory)…
// calendar dominates a community page — not good. redesign that
// page and the cards too."
//
// New shape: pure hub of three large selection cards (Bulletin Board,
// Member Directory, Events Calendar), each rich enough to convey
// "what's in here right now" — not just a navigation label. The
// calendar moved to its own dedicated screen at community/calendar
// (EventsCalendar.jsx).
//
// Each card shows:
//   · An icon + title + always-visible description
//   · A live preview line (e.g. "Today: 2 events" / "12 members" /
//     "3 recent posts") pulled from existing realtime hooks
//   · Right-side chevron so the affordance is obvious
//
// Cards filter by feature flag — a club with bulletin_board off and
// member_directory off and events_calendar on will see exactly one
// card. Empty state copy if a club has somehow disabled all three.
//
// Naming note: this file is still Events.jsx because routing maps
// `community → Events`. Renaming would touch App.jsx routing,
// scroll-restore keys, and a few BottomNav assumptions for marginal
// benefit; staying for now.
import { useEffect, useState } from 'react';
import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import { useFlag } from '../hooks/useFlag.js';
import { useAuth } from '../hooks/useAuth.jsx';
import BellChip from '../components/BellChip.jsx';
import { useEvents, useBulletinPosts, useNow, formatClockTime } from '../hooks/useClubData.jsx';
import { useBrand } from '../hooks/useBrand.jsx';
import { supabase, isConfigured } from '../lib/supabase.js';

function isoToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Events() {
  const { push } = useNav();
  const [scrollRef, onScroll] = useScrollRestore();
  const { club } = useAuth();
  const brand = useBrand();
  const now = useNow();
  const bulletinOn = useFlag('bulletin_board');
  const directoryOn = useFlag('member_directory');
  const calendarOn = useFlag('events_calendar');

  // Live previews — these all use the same realtime hooks the
  // destination screens use, so the count on the card is exactly
  // what the member will see when they tap into the card.
  const { data: events } = useEvents();
  const { data: bulletinPosts } = useBulletinPosts();

  // Member count for the directory card. Lightweight count query —
  // refreshed when the members table changes (publication added in
  // v0.7.1). Filters match MemberDirectory's own filter (user_id
  // not null, status != inactive, exclude self via component logic).
  const [memberCount, setMemberCount] = useState(null);
  useEffect(() => {
    if (!isConfigured || !club || !directoryOn) return;
    let cancelled = false;
    const load = async () => {
      const { count } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', club.id)
        .not('user_id', 'is', null)
        .neq('status', 'inactive');
      if (!cancelled && typeof count === 'number') setMemberCount(count);
    };
    load();
    const channel = supabase
      .channel(`community_member_count:${club.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, directoryOn]);

  // Today's event count for the calendar card preview.
  const todayIso = isoToday();
  const todayCount = events.filter(e => String(e.eventDate || '').slice(0, 10) === todayIso).length;
  // Next upcoming event (today or later) for the "Next:" fallback.
  const nextEvent = events.find(e => e.eventDate && String(e.eventDate).slice(0, 10) >= todayIso);

  // Build the cards array conditional on flags so order and gaps are
  // consistent. Each entry: { id, route, label, desc, preview, icon }.
  const cards = [
    bulletinOn && {
      id: 'bulletin',
      route: 'community/bulletin',
      label: 'Bulletin Board',
      desc: 'Classifieds, wanted, general posts from members',
      preview: previewBulletin(bulletinPosts),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      ),
    },
    directoryOn && {
      id: 'directory',
      route: 'member-directory',
      label: 'Member Directory',
      desc: 'Browse the roster, message other members',
      preview: memberCount == null ? null : `${memberCount} active member${memberCount === 1 ? '' : 's'}`,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="9" r="3" />
          <path d="M3 19c0-3 3-5 6-5s6 2 6 5" />
          <circle cx="17" cy="8" r="2.5" />
          <path d="M15 14c2.5 0 5 1.5 5 4" />
        </svg>
      ),
    },
    calendarOn && {
      id: 'calendar',
      route: 'community/calendar',
      label: 'Events Calendar',
      desc: 'Month view + RSVP to club events',
      preview: previewCalendar(todayCount, nextEvent),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="16" rx="1.5" />
          <path d="M3 9h18M8 3v4M16 3v4" />
        </svg>
      ),
    },
  ].filter(Boolean);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: '0 20px 9px' }}>
        <span style={{ color: '#A8D8B8', fontSize: 11, fontFamily: '"Lora",serif' }}>{formatClockTime(now)}</span>
      </div>
      <div style={{ background: G.green, padding: '4px 20px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 9, color: '#A8D8B8', letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 1px' }}>{brand.prefix}</p>
            <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.1 }}>Community</h1>
          </div>
          <BellChip />
        </div>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: '#A8D8B8', margin: '6px 0 0' }}>Member channels &amp; the club calendar</p>
      </div>

      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 28px' }}>
        {cards.length === 0 && (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, padding: '24px 18px', textAlign: 'center' }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 15, color: G.muted, margin: '0 0 6px' }}>Nothing here yet</p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: 0, lineHeight: 1.5 }}>
              Your club hasn't enabled any community features yet. Bulletin Board, Member Directory, and Events Calendar can each be turned on from Admin → Features.
            </p>
          </div>
        )}

        {cards.map(c => (
          <div
            key={c.id}
            onClick={() => push(c.route)}
            data-tap
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '16px 16px',
              background: G.card,
              border: `1px solid ${G.border}`,
              borderRadius: 6,
              marginBottom: 12,
              cursor: 'pointer',
            }}
          >
            {/* Icon medallion — same shape Pro Shop's My Inquiries
                entry uses (green circle, brass-light stroke). */}
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {c.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: 0, lineHeight: 1.2 }}>{c.label}</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: '3px 0 0', lineHeight: 1.4 }}>{c.desc}</p>
              {c.preview && (
                <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.brass, margin: '6px 0 0', lineHeight: 1.4 }}>{c.preview}</p>
              )}
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" /></svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// Preview-text helpers — kept out-of-component so they're easy to
// adjust without touching the JSX. Each returns null when there's
// nothing meaningful to say (the card's preview line stays hidden).

function previewBulletin(posts) {
  if (!posts || posts.length === 0) return null;
  // Posts in last 7 days as a "recent" gauge — gives a real signal
  // about whether the board is active or stale.
  const sevenDaysAgo = Date.now() - 7 * 86400_000;
  const recent = posts.filter(p => {
    // posts have a relative-date string + the underlying created_at
    // is inside the raw data. We approximate using the date string —
    // 'Today', 'Yesterday', 'X days ago' — matching what useBulletinPosts
    // computes via relativeDate(). Cheap, no extra query.
    if (!p.date) return false;
    if (p.date === 'Today' || p.date === 'Yesterday') return true;
    const m = /^(\d+) days? ago$/.exec(p.date);
    return m && parseInt(m[1], 10) <= 7;
  }).length;
  if (recent === 0) return `${posts.length} post${posts.length === 1 ? '' : 's'} (none this week)`;
  return `${recent} recent post${recent === 1 ? '' : 's'} this week`;
}

function previewCalendar(todayCount, nextEvent) {
  if (todayCount > 0) return `Today: ${todayCount} event${todayCount === 1 ? '' : 's'}`;
  if (nextEvent?.eventDate) {
    const [y, m, d] = String(nextEvent.eventDate).slice(0, 10).split('-').map(Number);
    const dateStr = new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `Next: ${nextEvent.title} · ${dateStr}`;
  }
  return null;
}
