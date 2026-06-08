// Trophy Case — v0.10.1 (Phase 10).
//
// Community-tab destination that feels like a physical clubhouse
// trophy wall. Two sections stacked:
//   · Club Honors — every badge the club has created, grouped by
//     category, rendered on a deep-green felt-board panel with
//     cream/gold typography. Tap a shield to see who holds it.
//   · My Badges — the current member's own awards. Tap one to see
//     when it was earned and by whom.
//
// Section name is configurable via clubs.trophy_case_name (migration
// 56). NULL → renders as "Trophy Case" everywhere. The same string
// is used for the screen header, the Community-tab card label, and
// any breadcrumbs.
//
// Feature flag: trophy_case (default on; min_tier basic). When the
// flag is off the route renders the standard FeatureOff component
// so deep links from old screenshots don't dead-end.
//
// Realtime: subscribes to badges + member_badges so a freshly-awarded
// badge appears in the trophy case within seconds (no refresh).

import { useEffect, useMemo, useState } from 'react';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { useScrollRestore } from '../hooks/useScrollRestore.js';
import { supabase, isConfigured } from '../lib/supabase.js';
import { liftMembers } from '../lib/peopleLift.js'; // v0.16.14 — Task #52 stage 1
import Badge from '../components/Badge.jsx';
import Avatar from '../components/Avatar.jsx';
import FeatureOff from '../components/FeatureOff.jsx';

const CATEGORY_LABEL = {
  championship: 'Championships',
  recognition:  'Recognition',
  membership:   'Membership',
};

// Category render order — championships at the top so the room's
// "headline" honors are front-and-center.
const CATEGORY_ORDER = ['championship', 'recognition', 'membership'];

export default function TrophyCase() {
  const { club, member, isGuest } = useAuth();
  const trophyCaseOn = useFlag('trophy_case');
  const profilePhotosOn = useFlag('profile_photos');
  const [scrollRef, onScroll] = useScrollRestore();

  const [badges, setBadges] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [members, setMembers] = useState([]);  // name + photo for holder list
  const [active, setActive] = useState(null);  // currently-open detail badge

  useEffect(() => {
    if (!isConfigured || !club?.id) return;
    let cancelled = false;
    const load = async () => {
      const [{ data: b }, { data: a }, { data: m }] = await Promise.all([
        supabase.from('badges')
          .select('id, name, icon_key, color, year, category, sort_order')
          .eq('club_id', club.id)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),
        supabase.from('member_badges')
          .select('id, badge_id, member_id, awarded_at, awarded_by, notes')
          .eq('club_id', club.id)
          .order('awarded_at', { ascending: false }),
        // v0.16.14 — Task #52 stage 1: name + photo_url via embedded people row.
        supabase.from('members')
          .select('id, people(name, photo_url)')
          .eq('club_id', club.id),
      ]);
      if (cancelled) return;
      setBadges(b || []);
      setAssignments(a || []);
      setMembers(liftMembers(m) || []);
    };
    load();

    const channels = [
      supabase.channel(`tc_badges:${club.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'badges',        filter: `club_id=eq.${club.id}` }, () => load())
        .subscribe(),
      supabase.channel(`tc_mb:${club.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'member_badges', filter: `club_id=eq.${club.id}` }, () => load())
        .subscribe(),
    ];
    return () => { cancelled = true; channels.forEach(c => supabase.removeChannel(c)); };
  }, [club?.id]);

  const sectionName = club?.trophy_case_name || 'Trophy Case';

  // Index members by id so holder lists can resolve quickly without
  // re-walking the array per badge.
  const memberById = useMemo(() => {
    const map = {};
    for (const m of members) map[m.id] = m;
    return map;
  }, [members]);

  // Index assignments by badge_id for the Club Honors grid (showing
  // how many people hold each badge) and the detail-view holder list.
  const assignmentsByBadge = useMemo(() => {
    const map = {};
    for (const a of assignments) {
      if (!map[a.badge_id]) map[a.badge_id] = [];
      map[a.badge_id].push(a);
    }
    return map;
  }, [assignments]);

  // Group badges by category for the Club Honors layout. Empty
  // categories don't render so a club using only "Championship"
  // doesn't get empty Recognition + Membership panels.
  const byCategory = useMemo(() => {
    const map = {};
    for (const b of badges) {
      if (!map[b.category]) map[b.category] = [];
      map[b.category].push(b);
    }
    return map;
  }, [badges]);

  // Current member's own awards. Members who aren't yet logged in
  // as a real member row (rare — typically only guests in the data_
  // only mode) get an empty My Badges section.
  const myAssignments = useMemo(
    () => member?.id ? assignments.filter(a => a.member_id === member.id) : [],
    [assignments, member?.id],
  );

  // Defensive — the route is reachable via the Community card or a
  // direct deep link; surface a clear empty state if the manager has
  // turned the feature off (or set it off via Platform lock).
  if (!trophyCaseOn) {
    return <FeatureOff label={sectionName} body={`The ${sectionName} feature is currently turned off at this club.`} />;
  }

  // Guests see Club Honors as a read-only display (no "My Badges"
  // — guests don't have member rows). The honor wall is part of
  // the club's identity; no reason to hide it from a paying guest.
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title={sectionName} />

      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 28px' }}>
        {/* ─── Club Honors ─── deep green panel, cream/gold typography */}
        <ClubHonorsPanel
          byCategory={byCategory}
          assignmentsByBadge={assignmentsByBadge}
          onTapBadge={setActive}
          sectionName={sectionName}
        />

        {/* ─── My Badges ─── only for actual members, hidden for guests */}
        {!isGuest && (
          <MyBadgesPanel
            myAssignments={myAssignments}
            badges={badges}
            onTapBadge={setActive}
          />
        )}
      </div>

      {/* Inline detail overlay — bottom sheet style, matches the
          BulletinBoard new-post sheet pattern. Closes on backdrop
          tap or the X. */}
      {active && (
        <BadgeDetailSheet
          badge={badges.find(b => b.id === active.id) || active}
          assignments={assignmentsByBadge[active.id] || []}
          memberById={memberById}
          currentMemberId={member?.id}
          profilePhotosOn={profilePhotosOn}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

// ─── Club Honors ─────────────────────────────────────────────────────────
function ClubHonorsPanel({ byCategory, assignmentsByBadge, onTapBadge, sectionName }) {
  // Determine which categories have any badges to render. Skips
  // empty sections so the panel reflects what the club actually has.
  const presentCats = CATEGORY_ORDER.filter(c => (byCategory[c] || []).length > 0);

  return (
    <div style={{
      background: G.greenDk,
      borderRadius: 10,
      padding: '18px 16px 22px',
      marginBottom: 18,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.16)',
      border: `1px solid rgba(155,122,30,0.30)`,
    }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 10, color: '#9B7A1E', letterSpacing: '0.22em', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>
          The {sectionName}
        </p>
        <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 22, fontWeight: 700, color: '#F2EDE0', margin: 0, letterSpacing: '0.01em' }}>
          Club Honors
        </h2>
      </div>

      {presentCats.length === 0 ? (
        <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: 'rgba(242,237,224,0.7)', margin: '6px 0', textAlign: 'center', padding: '20px 12px' }}>
          The trophy case is empty. Once your club creates badges in <strong>Admin → People → Badges</strong>, they'll appear here for every member to see.
        </p>
      ) : (
        presentCats.map((cat, i) => (
          <div key={cat} style={{ marginTop: i === 0 ? 0 : 18 }}>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: '#C4A040', letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 12px', fontWeight: 600 }}>
              {CATEGORY_LABEL[cat] || cat}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'flex-start' }}>
              {byCategory[cat].map(b => {
                const count = (assignmentsByBadge[b.id] || []).length;
                return (
                  <button
                    key={b.id}
                    onClick={() => onTapBadge(b)}
                    data-tap
                    type="button"
                    title={`${b.name}${b.year ? ` (${b.year})` : ''} — ${count} holder${count === 1 ? '' : 's'}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 4,
                      cursor: 'pointer',
                      display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                    }}
                  >
                    <Badge iconKey={b.icon_key} color={b.color} size="small" />
                    <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 11, fontWeight: 700, color: '#F2EDE0', margin: '5px 0 0', textAlign: 'center', maxWidth: 96, lineHeight: 1.2 }}>{b.name}</p>
                    {b.year && (
                      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10, color: '#C4A040', margin: '1px 0 0', letterSpacing: '0.04em' }}>{b.year}</p>
                    )}
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: 'rgba(242,237,224,0.6)', margin: '2px 0 0' }}>
                      {count} holder{count === 1 ? '' : 's'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── My Badges ──────────────────────────────────────────────────────────
function MyBadgesPanel({ myAssignments, badges, onTapBadge }) {
  // Lookup badges by id so we can hydrate the assignment list. This
  // is robust to a badge being edited (e.g. recolored) while the
  // member is viewing the screen — we always pull the live row.
  const badgeById = useMemo(() => {
    const map = {};
    for (const b of badges) map[b.id] = b;
    return map;
  }, [badges]);

  return (
    <div style={{
      background: G.card,
      borderRadius: 10,
      padding: '16px 16px 20px',
      border: `1px solid ${G.border}`,
    }}>
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 10, color: G.brass, letterSpacing: '0.22em', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>
          Yours
        </p>
        <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 20, fontWeight: 700, color: G.text, margin: 0 }}>
          My Badges
        </h2>
      </div>

      {myAssignments.length === 0 ? (
        <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0, textAlign: 'center', padding: '14px 8px', lineHeight: 1.5 }}>
          No badges yet — get out on the course.
        </p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
          {myAssignments.map(a => {
            const b = badgeById[a.badge_id];
            if (!b) return null;
            return (
              <button
                key={a.id}
                onClick={() => onTapBadge(b)}
                data-tap
                type="button"
                title={b.name}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                }}
              >
                <Badge iconKey={b.icon_key} color={b.color} name={b.name} year={b.year} size="small" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Detail sheet ───────────────────────────────────────────────────────
// Bottom-sheet style overlay matching the NewPostSheet pattern in
// BulletinBoard. Shows the large shield, name/category/year header,
// and a holder list (avatar + name for each member who currently
// holds this badge). The current member's own row is highlighted so
// they can immediately spot themselves on the list.
function BadgeDetailSheet({ badge, assignments, memberById, currentMemberId, profilePhotosOn, onClose }) {
  if (!badge) return null;

  // Holders sorted by most-recent award first, then by member name
  // as a stable tiebreaker so the list order doesn't jitter on
  // realtime updates.
  const holders = [...assignments].sort((a, b) => {
    if (a.awarded_at && b.awarded_at) return a.awarded_at < b.awarded_at ? 1 : -1;
    const na = memberById[a.member_id]?.name || '';
    const nb = memberById[b.member_id]?.name || '';
    return na.localeCompare(nb);
  });

  const myAward = holders.find(h => h.member_id === currentMemberId);

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.65)', display: 'flex', alignItems: 'flex-end', zIndex: 10 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '22px 22px 30px', width: '100%', maxHeight: '85%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
          <div onClick={onClose} data-tap style={{ cursor: 'pointer', padding: 6 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Badge iconKey={badge.icon_key} color={badge.color} size="large" />
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 19, fontWeight: 700, color: G.text, margin: '6px 0 0', textAlign: 'center' }}>{badge.name}</p>
          {badge.year && (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.brass, margin: 0, letterSpacing: '0.04em' }}>{badge.year}</p>
          )}
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0', textTransform: 'capitalize', letterSpacing: '0.08em' }}>{badge.category}</p>
        </div>

        {/* If the viewer holds this badge, show when they got it
            front-and-center so they don't have to scan the holder list. */}
        {myAward && (
          <div style={{
            marginTop: 16,
            background: G.green, color: '#F2EDE0',
            padding: '10px 14px', borderRadius: 5,
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: '#A8D8B8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              You earned this
            </p>
            <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 600, color: '#F2EDE0', margin: 0 }}>
              {myAward.awarded_at ? new Date(myAward.awarded_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
            </p>
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.10em' }}>
            {holders.length === 0 ? 'No holders yet' : `Holders (${holders.length})`}
          </p>

          {holders.length === 0 ? (
            <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0, padding: '8px 0' }}>
              This badge hasn't been awarded yet — be the first.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {holders.map(h => {
                const m = memberById[h.member_id];
                const isYou = h.member_id === currentMemberId;
                return (
                  <div key={h.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px',
                    background: isYou ? G.card : G.card,
                    border: `1px solid ${isYou ? G.brass : G.border}`,
                    borderRadius: 4,
                  }}>
                    <Avatar photoUrl={profilePhotosOn ? m?.photo_url : null} name={m?.name || 'Member'} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m?.name || 'Member'}{isYou ? ' (you)' : ''}
                      </p>
                      {h.awarded_at && (
                        <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: 0 }}>
                          {new Date(h.awarded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
