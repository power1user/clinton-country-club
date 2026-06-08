// AdminDashboard — v0.11.22 (Phase 12).
//
// The default landing for the desktop admin shell. Replaces the
// "Pick a section from the sidebar" empty state with a grid of
// dashboard tiles showing per-club operational + engagement metrics.
//
// Architecture:
//   · Tile catalog defined inline — each entry has an id, name,
//     description, role gate, and component reference.
//   · Each tile is self-contained — owns its own data fetching via
//     supabase-js (RPCs for aggregations, direct queries for
//     operational counts). RLS already scopes by club_id, so no
//     cross-tenant leakage risk.
//   · Show/hide persisted per (user, club) via
//     useAdminPreference('dashboard_hidden_tiles', []) — a flat
//     array of tile ids the manager has hidden.
//   · Layout is FIXED grid for v0.11.22. v0.11.23 layers drag-and-
//     drop via @dnd-kit (already installed) + per-workspace
//     persistence.
//   · Role gating: each tile declares the minimum role needed.
//     Currently all tiles are 'staff' (any admin); future tiles
//     can be 'manager' or 'super_admin' for sensitive metrics.
//
// Wired as the desktop landing in AdminLayoutDesktop when sec is
// null and the user has at least staff access.

import { useEffect, useState, useMemo } from 'react';
import { G } from '../theme.js';
import { supabase } from '../lib/supabase.js';
import { liftMembers, liftMembersRelation } from '../lib/peopleLift.js'; // v0.16.14 — Task #52 stage 1
import { formatMessageTimestamp } from '../lib/timeFormat.js';
import { useAuth } from '../hooks/useAuth.jsx';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ──────────────────────────────────────────────────────────────────
// Tile registry
// ──────────────────────────────────────────────────────────────────
const TILE_CATALOG = [
  {
    id: 'today_activity',
    name: "Today's Activity",
    description: 'Active users today, vs yesterday, with 7-day trend.',
    minRole: 'staff',
    component: TodayActivityTile,
    size: { col: 2, row: 1 },
  },
  {
    id: 'open_work',
    name: 'Open Work',
    description: 'Items waiting for action — food orders, lessons, pro shop.',
    minRole: 'staff',
    component: OpenWorkTile,
    size: { col: 2, row: 1 },
  },
  {
    id: 'top_screens',
    name: 'Top Screens Today',
    description: 'Most-viewed member-app screens since midnight (club local).',
    minRole: 'staff',
    component: TopScreensTile,
    size: { col: 2, row: 1 },
  },
  {
    id: 'community_pulse',
    name: 'Community Pulse',
    description: 'New bulletin posts, partner posts, and event RSVPs this week.',
    minRole: 'staff',
    component: CommunityPulseTile,
    size: { col: 2, row: 1 },
  },
  // v0.11.30 — Four additional tiles. Each is self-contained with its
  // own supabase query and renders independently.
  {
    id: 'upcoming_events',
    name: 'Upcoming Events',
    description: 'Next three events with RSVP counts.',
    minRole: 'staff',
    component: UpcomingEventsTile,
    size: { col: 2, row: 1 },
  },
  {
    id: 'new_members',
    name: 'New Members This Week',
    description: 'Members who joined in the last 7 days.',
    minRole: 'staff',
    component: NewMembersTile,
    size: { col: 2, row: 1 },
  },
  {
    id: 'badges_awarded',
    name: 'Badges Awarded Recently',
    description: 'The five most recent badge awards.',
    minRole: 'staff',
    component: RecentBadgesTile,
    size: { col: 2, row: 1 },
  },
  {
    id: 'recent_bulletin',
    name: 'Recent Bulletin Posts',
    description: 'Newest member posts on the bulletin board.',
    minRole: 'staff',
    component: RecentBulletinTile,
    size: { col: 2, row: 1 },
  },
  // ─── v0.11.32 — Operations / GM tiles ──────────────────────────
  {
    id: 'course_status_now',
    name: 'Course Status Now',
    description: 'Live open/limited/closed pills for every facility.',
    minRole: 'staff',
    component: CourseStatusTile,
    size: { col: 2, row: 1 },
  },
  {
    id: 'todays_events',
    name: "Today's Events",
    description: "Events on the calendar for today's date.",
    minRole: 'staff',
    component: TodaysEventsTile,
    size: { col: 2, row: 1 },
  },
  {
    id: 'order_velocity',
    name: 'Order Velocity',
    description: 'Food orders placed today, vs the club average.',
    minRole: 'staff',
    component: OrderVelocityTile,
    size: { col: 2, row: 1 },
  },
  {
    id: 'active_guests',
    name: 'Active Guests',
    description: 'Currently-valid guest passes + how many expire soon.',
    minRole: 'staff',
    component: ActiveGuestsTile,
    size: { col: 2, row: 1 },
  },
  // ─── v0.11.32 — Membership / Board tiles ────────────────────────
  {
    id: 'membership_snapshot',
    name: 'Membership Snapshot',
    description: 'Total members, status breakdown, 30-day growth.',
    minRole: 'manager',
    component: MembershipSnapshotTile,
    size: { col: 2, row: 1 },
  },
  {
    id: 'pending_approvals',
    name: 'Pending Approvals',
    description: 'Members awaiting approval, with sign-up date.',
    minRole: 'manager',
    component: PendingApprovalsTile,
    size: { col: 2, row: 1 },
  },
  {
    id: 'engagement_score',
    name: 'Engagement Score',
    description: '% of members active in the last 7 days.',
    minRole: 'manager',
    component: EngagementScoreTile,
    size: { col: 2, row: 1 },
  },
  {
    id: 'directory_completeness',
    name: 'Directory Completeness',
    description: 'Data-hygiene tile: % of members with photo + email.',
    minRole: 'manager',
    component: DirectoryCompletenessTile,
    size: { col: 2, row: 1 },
  },
  // ─── v0.11.32 — Communications / Marketing tiles ────────────────
  {
    id: 'push_today',
    name: 'Push Notifications Today',
    description: 'Broadcast pushes sent in the last 24 hours.',
    minRole: 'staff',
    component: PushTodayTile,
    size: { col: 2, row: 1 },
  },
  {
    id: 'recent_news',
    name: 'Recent News',
    description: 'Last 3 published news articles.',
    minRole: 'staff',
    component: RecentNewsTile,
    size: { col: 2, row: 1 },
  },
  {
    id: 'trending_posts',
    name: 'Top Trending Posts',
    description: 'Member posts with the most replies this week.',
    minRole: 'staff',
    component: TrendingPostsTile,
    size: { col: 2, row: 1 },
  },
];

// ──────────────────────────────────────────────────────────────────
// v0.11.33 — First-load defaults by role.
//
// Goal: a new admin opening the dashboard for the first time should
// see a curated, non-overwhelming starting point matched to their
// role — not all 15-19 tiles dumped on the screen at once. Once
// they customize (drag, hide/show via Manage tiles), their saved
// state takes over and never resets across logins.
//
// Used ONLY when both `tileOrder` (dashboard_tile_order) AND
// `hidden` (dashboard_hidden_tiles) are still at their default
// "no preference written" state. Any manual edit OR a workspace
// apply writes those keys and takes precedence forever after.
//
// Two profiles:
//   · `manager` — broader overview including board / membership tiles
//   · `staff`   — operations + community focus; the four manager-
//                 only tiles are role-gated out of the catalog for
//                 staff anyway, so listing them here is unnecessary.
// super_admin uses the manager profile (everything available).
// ──────────────────────────────────────────────────────────────────
const DEFAULT_LAYOUT_BY_ROLE = {
  manager: {
    order: [
      'today_activity',
      'open_work',
      'todays_events',
      'pending_approvals',
      'recent_news',
      'community_pulse',
    ],
    hidden: [
      'top_screens', 'upcoming_events', 'new_members', 'badges_awarded',
      'recent_bulletin', 'course_status_now', 'order_velocity',
      'active_guests', 'membership_snapshot', 'engagement_score',
      'directory_completeness', 'push_today', 'trending_posts',
    ],
  },
  staff: {
    order: [
      'today_activity',
      'open_work',
      'todays_events',
      'community_pulse',
      'recent_news',
    ],
    hidden: [
      'top_screens', 'upcoming_events', 'new_members', 'badges_awarded',
      'recent_bulletin', 'course_status_now', 'order_velocity',
      'active_guests', 'push_today', 'trending_posts',
    ],
  },
};

// ──────────────────────────────────────────────────────────────────
// AdminDashboard — orchestrator
//
// v0.11.27 — Accepts `commsUnread` as a prop instead of calling
// useCommsUnread() internally. The parent (AdminPanel via
// AdminLayoutDesktop) already creates one subscription for the
// sidebar badges; a second subscription with the same channel name
// would throw `cannot add postgres_changes callbacks after
// subscribe()` from inside a useEffect — uncatchable by the error
// boundary, which is exactly what blanked the admin at v0.11.26.
// ──────────────────────────────────────────────────────────────────
export default function AdminDashboard({
  commsUnread,
  // v0.11.29 — Dashboard state is now lifted to AdminLayoutDesktop
  // so the workspace switcher can snapshot / restore it alongside
  // sidebar state. The dashboard reads + writes via props; the
  // useAdminPreference hooks live in the parent.
  tileOrder,
  setTileOrder,
  hidden,
  setHidden,
}) {
  const { club, isManager, isSuperAdmin } = useAuth();
  const [manageOpen, setManageOpen] = useState(false);

  // PointerSensor requires the pointer to move 6px before drag
  // engages — prevents accidental drags when the manager just
  // clicks the grip handle.
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }));

  const hiddenSet = new Set(Array.isArray(hidden) ? hidden : []);

  // Role-gate the catalog. Currently all tiles are 'staff' = any
  // admin, but the gate is in place so future manager/super-only
  // tiles slot in cleanly.
  const roleVisible = (tile) => {
    if (tile.minRole === 'super_admin') return isSuperAdmin;
    if (tile.minRole === 'manager') return isManager || isSuperAdmin;
    return true; // staff
  };

  const visibleCatalog = useMemo(
    () => TILE_CATALOG.filter(roleVisible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isManager, isSuperAdmin]
  );

  // v0.11.33 — Role-appropriate first-load defaults. Used ONLY when
  // the user has no saved order AND no saved hidden set (truly fresh
  // visit). Any customization or workspace apply writes those keys
  // and takes precedence. super_admin gets the manager profile.
  const roleDefaultLayout = useMemo(() => {
    const profile = (isManager || isSuperAdmin) ? 'manager' : 'staff';
    return DEFAULT_LAYOUT_BY_ROLE[profile];
  }, [isManager, isSuperAdmin]);

  const isFreshFirstVisit = !Array.isArray(tileOrder) && (!Array.isArray(hidden) || hidden.length === 0);

  // v0.11.28 + v0.11.33 — Compute the rendered tile order:
  //   1. Pick an order list:
  //        · saved tileOrder if the user has customized, OR
  //        · role-default order if this is the user's first visit, OR
  //        · catalog order as ultimate fallback
  //   2. Pick a hidden set:
  //        · saved hidden if the user has touched the toggle, OR
  //        · role-default hidden if this is the first visit
  //   3. Drop tiles that aren't in the visible catalog (role-gated)
  //   4. Drop hidden tiles
  //   5. Append any role-visible-not-hidden tiles not already listed
  //      (covers brand-new tiles added in a future patch — they
  //      land at the end of the manager's existing layout)
  const renderedTiles = useMemo(() => {
    let orderList;
    let effectiveHidden;
    if (Array.isArray(tileOrder) && tileOrder.length > 0) {
      orderList = tileOrder;
      effectiveHidden = hiddenSet;
    } else if (isFreshFirstVisit) {
      orderList = roleDefaultLayout.order;
      effectiveHidden = new Set(roleDefaultLayout.hidden);
    } else {
      orderList = visibleCatalog.map(t => t.id);
      effectiveHidden = hiddenSet;
    }
    const out = [];
    const seen = new Set();
    for (const id of orderList) {
      if (effectiveHidden.has(id)) continue;
      const tile = visibleCatalog.find(t => t.id === id);
      if (!tile) continue;
      out.push(tile);
      seen.add(id);
    }
    for (const tile of visibleCatalog) {
      if (seen.has(tile.id) || effectiveHidden.has(tile.id)) continue;
      out.push(tile);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileOrder, hidden, visibleCatalog, isFreshFirstVisit, roleDefaultLayout]);

  // Drag-end handler — reorder the persisted tile order list.
  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const currentIds = renderedTiles.map(t => t.id);
    const oldIndex = currentIds.indexOf(active.id);
    const newIndex = currentIds.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setTileOrder(arrayMove(currentIds, oldIndex, newIndex));
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 18,
      }}>
        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: '"Lora",serif',
            fontSize: 12,
            color: G.muted,
            margin: 0,
            letterSpacing: '0.04em',
          }}>
            Live operational + engagement metrics for {club?.name || 'your club'}.
            All times in your club's local timezone.
          </p>
        </div>
        <div
          onClick={() => setManageOpen(o => !o)}
          data-tap
          style={{
            padding: '8px 14px',
            border: `1px solid ${G.border}`,
            borderRadius: 6,
            background: G.card,
            cursor: 'pointer',
            fontFamily: '"Lora",serif',
            fontSize: 13,
            color: G.text,
          }}
        >
          {manageOpen ? 'Done' : '⚙ Manage tiles'}
        </div>
      </div>

      {/* Manage panel — simple show/hide checklist */}
      {manageOpen && (
        <div style={{
          marginBottom: 18,
          padding: '14px 16px',
          background: G.card,
          border: `1px solid ${G.border}`,
          borderRadius: 6,
        }}>
          <p style={{
            fontFamily: '"Lora",serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: G.muted,
            margin: '0 0 10px',
          }}>
            Tiles
          </p>
          {visibleCatalog.map(t => {
            const isHidden = hiddenSet.has(t.id);
            return (
              <div
                key={t.id}
                onClick={() => {
                  setHidden(prev => {
                    const next = new Set(Array.isArray(prev) ? prev : []);
                    if (isHidden) next.delete(t.id);
                    else next.add(t.id);
                    return [...next];
                  });
                }}
                data-tap
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 4px',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 18, height: 18, flexShrink: 0,
                  border: `1.5px solid ${isHidden ? G.border : G.brass}`,
                  background: isHidden ? 'transparent' : G.brass,
                  borderRadius: 3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 2,
                }}>
                  {!isHidden && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: '"Playfair Display",serif',
                    fontSize: 14,
                    fontWeight: 700,
                    color: G.text,
                    margin: 0,
                  }}>
                    {t.name}
                  </p>
                  <p style={{
                    fontFamily: '"Lora",serif',
                    fontSize: 12,
                    color: G.muted,
                    margin: '2px 0 0',
                  }}>
                    {t.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid of tiles. v0.11.28 — wrapped in DndContext +
          SortableContext for drag-and-drop reorder. The grip icon
          in each tile's top-right is the drag handle; the rest of
          the tile remains click-interactive. */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={renderedTiles.map(t => t.id)} strategy={rectSortingStrategy}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 16,
          }}>
            {renderedTiles.length === 0 && (
              <div style={{
                gridColumn: '1 / -1',
                padding: '40px 24px',
                textAlign: 'center',
                background: G.card,
                border: `1px solid ${G.border}`,
                borderRadius: 8,
              }}>
                <p style={{
                  fontFamily: '"Playfair Display",serif',
                  fontStyle: 'italic',
                  fontSize: 16,
                  color: G.muted,
                  margin: 0,
                }}>
                  All tiles hidden. Use "Manage tiles" to bring some back.
                </p>
              </div>
            )}
            {renderedTiles.map(t => (
              <SortableTile
                key={t.id}
                tile={t}
                clubId={club?.id}
                commsUnread={commsUnread}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// SortableTile — wraps each tile in a draggable card with a grip
// handle (v0.11.28). The grip lives in the top-right; only its
// pointer events trigger the drag, so the rest of the tile (links,
// hover states, scroll inside) stays interactive.
// ──────────────────────────────────────────────────────────────────
function SortableTile({ tile, clubId, commsUnread }) {
  const TileComp = tile.component;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tile.id });
  const style = {
    gridColumn: `span ${tile.size?.col || 2}`,
    gridRow: `span ${tile.size?.row || 1}`,
    background: G.card,
    border: `1px solid ${isDragging ? G.brass : G.border}`,
    borderRadius: 8,
    padding: '16px 18px',
    minHeight: 180,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.25)' : 'none',
    cursor: isDragging ? 'grabbing' : 'default',
    zIndex: isDragging ? 10 : 'auto',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <p style={{
          flex: 1,
          fontFamily: '"Lora",serif',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: G.muted,
          margin: 0,
        }}>
          {tile.name}
        </p>
        {/* Grip — only this element registers as the drag activator.
            Subtle muted color until hovered; cursor flips to 'grab'. */}
        <div
          {...listeners}
          style={{
            cursor: 'grab',
            padding: 4,
            marginRight: -4,
            display: 'flex',
            alignItems: 'center',
            color: G.muted,
            opacity: 0.55,
          }}
          aria-label={`Drag ${tile.name} to reorder`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="6" r="1" />
            <circle cx="9" cy="12" r="1" />
            <circle cx="9" cy="18" r="1" />
            <circle cx="15" cy="6" r="1" />
            <circle cx="15" cy="12" r="1" />
            <circle cx="15" cy="18" r="1" />
          </svg>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <TileComp clubId={clubId} commsUnread={commsUnread} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Tile components
// ──────────────────────────────────────────────────────────────────

function TodayActivityTile({ clubId }) {
  const [today, setToday] = useState(null);
  const [yesterday, setYesterday] = useState(null);
  const [sparkline, setSparkline] = useState(null);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const [t, y, s] = await Promise.all([
        supabase.rpc('dashboard_dau_today', { p_club_id: clubId }),
        supabase.rpc('dashboard_dau_yesterday', { p_club_id: clubId }),
        supabase.rpc('dashboard_dau_7d', { p_club_id: clubId }),
      ]);
      if (cancelled) return;
      setToday(typeof t.data === 'number' ? t.data : Number(t.data) || 0);
      setYesterday(typeof y.data === 'number' ? y.data : Number(y.data) || 0);
      setSparkline(Array.isArray(s.data) ? s.data : []);
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  const delta = today != null && yesterday != null ? (today - yesterday) : null;
  const maxBar = sparkline ? Math.max(1, ...sparkline.map(r => Number(r.dau) || 0)) : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: 36,
          fontWeight: 700,
          color: G.text,
          lineHeight: 1,
        }}>
          {today == null ? '—' : today}
        </span>
        {delta != null && delta !== 0 && (
          <span style={{
            fontFamily: '"Lora",serif',
            fontSize: 13,
            fontWeight: 700,
            color: delta > 0 ? G.openDot : G.clsDot,
          }}>
            {delta > 0 ? '↑' : '↓'} {Math.abs(delta)} vs yesterday
          </span>
        )}
      </div>
      <p style={{
        fontFamily: '"Lora",serif',
        fontSize: 12,
        color: G.muted,
        margin: '0 0 14px',
      }}>
        active members today
      </p>
      {/* 7-day sparkline */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 50 }}>
        {(sparkline || []).map((row, i) => {
          const val = Number(row.dau) || 0;
          const h = Math.max(2, (val / maxBar) * 50);
          const isToday = i === (sparkline.length - 1);
          return (
            <div key={row.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%',
                height: h,
                background: isToday ? G.brass : G.greenMid,
                borderRadius: 2,
                opacity: isToday ? 1 : 0.55,
              }} />
              <span style={{
                fontFamily: 'monospace',
                fontSize: 9,
                color: G.muted,
              }}>
                {new Date(row.day).toLocaleDateString(undefined, { weekday: 'narrow' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OpenWorkTile({ commsUnread }) {
  // v0.11.27 — read from prop instead of calling useCommsUnread()
  // again. The parent (AdminPanel) already owns the one subscription
  // for the (club_id, comms-unread) channel; a second hook call here
  // tries to register postgres_changes callbacks on the same channel
  // after it's been subscribed, which throws from inside useEffect
  // (uncatchable by the surrounding error boundary).
  const food = commsUnread?.counts?.inbox_food || 0;
  const lessons = commsUnread?.counts?.inbox_lessons || 0;
  const proshop = commsUnread?.counts?.inbox_proshop || 0;
  const total = food + lessons + proshop;

  const row = (label, count, color) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0',
      borderBottom: `1px solid ${G.border}`,
    }}>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text }}>{label}</span>
      <span style={{
        fontFamily: '"Playfair Display",serif',
        fontSize: 18,
        fontWeight: 700,
        color: count > 0 ? color : G.muted,
      }}>
        {count}
      </span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <span style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: 36,
          fontWeight: 700,
          color: total > 0 ? G.brass : G.text,
          lineHeight: 1,
        }}>
          {total}
        </span>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>
          item{total === 1 ? '' : 's'} waiting
        </span>
      </div>
      {row('Food orders',         food,    G.brass)}
      {row('Lesson requests',     lessons, G.brass)}
      {row('Pro shop inquiries',  proshop, G.brass)}
    </div>
  );
}

function TopScreensTile({ clubId }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc('dashboard_top_screens_today', {
        p_club_id: clubId,
        p_limit: 5,
      });
      if (cancelled) return;
      setRows(Array.isArray(data) ? data : []);
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  if (rows == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  if (rows.length === 0) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No page views yet today.</p>;
  }
  const max = Math.max(1, ...rows.map(r => Number(r.views) || 0));
  return (
    <div>
      {rows.map((r, i) => {
        const v = Number(r.views) || 0;
        const pct = Math.max(2, (v / max) * 100);
        return (
          <div key={r.screen || i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text }}>{r.screen}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: G.muted }}>{v}</span>
            </div>
            <div style={{ height: 4, background: G.bg, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: G.greenMid }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// v0.11.30 additional tiles
// ──────────────────────────────────────────────────────────────────

function UpcomingEventsTile({ clubId }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      // Pull next 3 events with RSVP counts via the PostgREST
      // nested-aggregate shorthand. Filter to today-or-later in
      // UTC (good enough for a per-club admin — exact club-local
      // bucketing is overkill for "next 3 upcoming").
      const todayIso = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('events')
        .select('id, title, event_date, event_registrations(count)')
        .eq('club_id', clubId)
        .gte('event_date', todayIso)
        .order('event_date', { ascending: true })
        .limit(3);
      if (cancelled) return;
      setRows(Array.isArray(data) ? data : []);
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  if (rows == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  if (rows.length === 0) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No upcoming events on the calendar.</p>;
  }
  return (
    <div>
      {rows.map((r, i) => {
        const rsvpCount = r.event_registrations?.[0]?.count ?? 0;
        const d = new Date(r.event_date);
        return (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 0',
            borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
          }}>
            <div style={{ flexShrink: 0, width: 44, textAlign: 'center' }}>
              <p style={{
                fontFamily: '"Lora",serif',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: G.brass,
                margin: 0,
              }}>
                {d.toLocaleDateString(undefined, { month: 'short' })}
              </p>
              <p style={{
                fontFamily: '"Playfair Display",serif',
                fontSize: 20,
                fontWeight: 700,
                color: G.text,
                margin: 0,
                lineHeight: 1,
              }}>
                {d.getDate()}
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: '"Playfair Display",serif',
                fontSize: 14,
                fontWeight: 700,
                color: G.text,
                margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {r.title}
              </p>
              <p style={{
                fontFamily: '"Lora",serif',
                fontSize: 11,
                color: G.muted,
                margin: '2px 0 0',
              }}>
                {rsvpCount} RSVP{rsvpCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NewMembersTile({ clubId }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('members')
        .select('id, created_at, people(name)') // v0.16.14 — Task #52 stage 1
        .eq('club_id', clubId)
        .gt('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20);
      if (cancelled) return;
      setRows(Array.isArray(data) ? liftMembers(data) : []);
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  if (rows == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <span style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: 36,
          fontWeight: 700,
          color: rows.length > 0 ? G.green : G.text,
          lineHeight: 1,
        }}>
          {rows.length}
        </span>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>
          joined this week
        </span>
      </div>
      {rows.length === 0 && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
          No new members in the last 7 days.
        </p>
      )}
      {rows.slice(0, 5).map((m, i) => (
        <div key={m.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          padding: '6px 0',
          borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
        }}>
          <span style={{
            fontFamily: '"Lora",serif',
            fontSize: 13,
            color: G.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1, minWidth: 0,
          }}>
            {m.name || 'Member'}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: G.muted, marginLeft: 8 }}>
            {new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
      ))}
      {rows.length > 5 && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '6px 0 0' }}>
          + {rows.length - 5} more
        </p>
      )}
    </div>
  );
}

function RecentBadgesTile({ clubId }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      // member_badges joined via supabase relational shorthand to
      // members.name + badges.name/color. RLS on member_badges +
      // badges should both scope by club via their respective
      // policies.
      const { data: dRaw } = await supabase
        .from('member_badges')
        // v0.16.14 — Task #52 stage 1: name via embedded people row.
        .select('id, awarded_at, members(people(name)), badges(name, color, club_id)')
        .order('awarded_at', { ascending: false })
        .limit(15);
      const data = liftMembersRelation(dRaw, 'members');
      if (cancelled) return;
      // Client-side filter to this club's badges (member_badges has
      // no club_id directly; the join's badges.club_id is what
      // ties it to the club).
      const filtered = (Array.isArray(data) ? data : [])
        .filter(r => r.badges?.club_id === clubId)
        .slice(0, 5);
      setRows(filtered);
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  if (rows == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  if (rows.length === 0) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No badges awarded recently.</p>;
  }
  return (
    <div>
      {rows.map((r, i) => (
        <div key={r.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 0',
          borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
        }}>
          <div style={{
            flexShrink: 0,
            width: 20, height: 24,
            background: r.badges?.color || G.brass,
            clipPath: 'polygon(50% 0%, 100% 0%, 100% 65%, 50% 100%, 0% 65%, 0% 0%)',
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: '"Lora",serif',
              fontSize: 13,
              color: G.text,
              margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              <span style={{ fontWeight: 600 }}>{r.badges?.name || 'Badge'}</span>
              <span style={{ color: G.muted, fontWeight: 400 }}> · {r.members?.name || 'Member'}</span>
            </p>
            <p style={{
              fontFamily: 'monospace',
              fontSize: 10,
              color: G.muted,
              margin: '1px 0 0',
            }}>
              {new Date(r.awarded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentBulletinTile({ clubId }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const { data: dRaw } = await supabase
        .from('bulletin_posts')
        // v0.16.14 — Task #52 stage 1: name via embedded people row.
        .select('id, title, body, created_at, members(people(name))')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .limit(5);
      const data = liftMembersRelation(dRaw, 'members');
      if (cancelled) return;
      setRows(Array.isArray(data) ? data : []);
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  if (rows == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  if (rows.length === 0) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No bulletin posts yet.</p>;
  }
  return (
    <div>
      {rows.map((r, i) => (
        <div key={r.id} style={{
          padding: '8px 0',
          borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
        }}>
          <p style={{
            fontFamily: '"Playfair Display",serif',
            fontSize: 13,
            fontWeight: 700,
            color: G.text,
            margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {r.title || (r.body ? r.body.slice(0, 50) : 'Untitled')}
          </p>
          <p style={{
            fontFamily: '"Lora",serif',
            fontSize: 11,
            color: G.muted,
            margin: '2px 0 0',
          }}>
            {r.members?.name || 'Member'} · {new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
        </div>
      ))}
    </div>
  );
}

function CommunityPulseTile({ clubId }) {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [bulletin, partner, rsvps] = await Promise.all([
        supabase.from('bulletin_posts').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).gt('created_at', since),
        supabase.from('partner_posts').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).gt('created_at', since),
        supabase.from('event_registrations').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).gt('registered_at', since),
      ]);
      if (cancelled) return;
      setCounts({
        bulletin: bulletin.count || 0,
        partner: partner.count || 0,
        rsvps: rsvps.count || 0,
      });
    })();
    return () => { cancelled = true; };
  }, [clubId]);

  if (counts == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  const total = counts.bulletin + counts.partner + counts.rsvps;

  const row = (label, count) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0',
      borderBottom: `1px solid ${G.border}`,
    }}>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text }}>{label}</span>
      <span style={{
        fontFamily: '"Playfair Display",serif',
        fontSize: 18,
        fontWeight: 700,
        color: count > 0 ? G.green : G.muted,
      }}>
        {count}
      </span>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <span style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: 36,
          fontWeight: 700,
          color: G.text,
          lineHeight: 1,
        }}>
          {total}
        </span>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>
          interactions this week
        </span>
      </div>
      {row('Bulletin posts',  counts.bulletin)}
      {row('Partner posts',   counts.partner)}
      {row('Event RSVPs',     counts.rsvps)}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// v0.11.32 — Operations / GM tiles
// ──────────────────────────────────────────────────────────────────

function CourseStatusTile({ clubId }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      // Join club_status to club_facilities so we can show the
      // facility's display name. Order by sort_order for stable
      // top-to-bottom layout.
      const { data } = await supabase
        .from('club_status')
        .select('id, state, label, sort_order, club_facilities(display_name)')
        .eq('club_id', clubId)
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      setRows(Array.isArray(data) ? data : []);
    })();
    return () => { cancelled = true; };
  }, [clubId]);
  if (rows == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  if (rows.length === 0) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No facility status configured.</p>;
  }
  // Quick state → color/label mapping. Falls back to muted gray
  // for any unknown state value.
  const stateStyle = (state) => {
    if (state === 'open')    return { bg: G.openBg, dot: G.openDot, txt: G.openTxt, label: 'Open' };
    if (state === 'limited') return { bg: G.limBg,  dot: G.limDot,  txt: G.limTxt,  label: 'Limited' };
    if (state === 'closed')  return { bg: G.clsBg,  dot: G.clsDot,  txt: G.clsTxt,  label: 'Closed' };
    return { bg: G.muted, dot: G.muted, txt: '#F2EDE0', label: state || '—' };
  };
  return (
    <div>
      {rows.map((r, i) => {
        const s = stateStyle(r.state);
        return (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0',
            borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
          }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text }}>
              {r.club_facilities?.display_name || r.label || 'Facility'}
            </span>
            <span style={{
              fontFamily: '"Lora",serif',
              fontSize: 9, fontWeight: 700,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              color: s.txt, background: s.bg,
              padding: '3px 9px', borderRadius: 3,
            }}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TodaysEventsTile({ clubId }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('events')
        .select('id, title, event_time_start, event_registrations(count)')
        .eq('club_id', clubId)
        .eq('event_date', todayIso)
        .order('event_time_start', { ascending: true, nullsFirst: true });
      if (cancelled) return;
      setRows(Array.isArray(data) ? data : []);
    })();
    return () => { cancelled = true; };
  }, [clubId]);
  if (rows == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  if (rows.length === 0) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No events on the calendar for today.</p>;
  }
  return (
    <div>
      {rows.map((r, i) => {
        const rsvp = r.event_registrations?.[0]?.count ?? 0;
        return (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 0',
            borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
          }}>
            <span style={{
              flexShrink: 0,
              fontFamily: 'monospace', fontSize: 11,
              color: G.brass, fontWeight: 600,
              minWidth: 48,
            }}>
              {r.event_time_start || '—'}
            </span>
            <span style={{
              flex: 1, minWidth: 0,
              fontFamily: '"Playfair Display",serif',
              fontSize: 14, fontWeight: 700, color: G.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {r.title}
            </span>
            <span style={{
              flexShrink: 0,
              fontFamily: '"Lora",serif', fontSize: 11, color: G.muted,
            }}>
              {rsvp} RSVP{rsvp === 1 ? '' : 's'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OrderVelocityTile({ clubId }) {
  const [todayCount, setTodayCount] = useState(null);
  const [avg30, setAvg30] = useState(null);
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [today, last30] = await Promise.all([
        supabase.from('food_orders').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).gte('created_at', todayMidnight.toISOString()),
        supabase.from('food_orders').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).gte('created_at', thirtyDaysAgo.toISOString()),
      ]);
      if (cancelled) return;
      setTodayCount(today.count || 0);
      setAvg30(Math.round((last30.count || 0) / 30));
    })();
    return () => { cancelled = true; };
  }, [clubId]);
  const delta = todayCount != null && avg30 != null ? todayCount - avg30 : null;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: 36, fontWeight: 700, color: G.text, lineHeight: 1,
        }}>
          {todayCount == null ? '—' : todayCount}
        </span>
        {delta != null && delta !== 0 && (
          <span style={{
            fontFamily: '"Lora",serif', fontSize: 13, fontWeight: 700,
            color: delta > 0 ? G.openDot : G.clsDot,
          }}>
            {delta > 0 ? '↑' : '↓'} {Math.abs(delta)} vs 30-day avg
          </span>
        )}
      </div>
      <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: '0 0 14px' }}>
        orders today
      </p>
      <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>
        Club average: <span style={{ color: G.text, fontWeight: 600 }}>{avg30 == null ? '—' : avg30}</span> orders/day over the last 30 days.
      </p>
    </div>
  );
}

function ActiveGuestsTile({ clubId }) {
  const [counts, setCounts] = useState(null);
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const nowIso = new Date().toISOString();
      const threeDaysIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const [active, expiringSoon] = await Promise.all([
        // Active = status='active' AND (expires_at is null OR > now)
        supabase.from('guests').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).eq('status', 'active')
          .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
        // Expiring in next 3 days
        supabase.from('guests').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).eq('status', 'active')
          .not('expires_at', 'is', null)
          .gt('expires_at', nowIso)
          .lte('expires_at', threeDaysIso),
      ]);
      if (cancelled) return;
      setCounts({ active: active.count || 0, expiring: expiringSoon.count || 0 });
    })();
    return () => { cancelled = true; };
  }, [clubId]);
  if (counts == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: 36, fontWeight: 700, color: G.text, lineHeight: 1,
        }}>
          {counts.active}
        </span>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>
          active passes
        </span>
      </div>
      <div style={{ marginTop: 14, padding: '10px 12px', background: counts.expiring > 0 ? 'rgba(155,122,30,0.10)' : G.bg, border: `1px solid ${G.border}`, borderRadius: 4 }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 2px', letterSpacing: '0.04em' }}>
          Expiring in 3 days
        </p>
        <p style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: 18, fontWeight: 700,
          color: counts.expiring > 0 ? G.brass : G.text,
          margin: 0,
        }}>
          {counts.expiring}
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// v0.11.32 — Membership / Board tiles
// ──────────────────────────────────────────────────────────────────

function MembershipSnapshotTile({ clubId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [active, pending, recentlyAdded] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).eq('status', 'active'),
        supabase.from('members').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).eq('status', 'pending'),
        supabase.from('members').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).gt('created_at', thirtyDaysAgo),
      ]);
      if (cancelled) return;
      const total = (active.count || 0) + (pending.count || 0);
      const growth30 = recentlyAdded.count || 0;
      const growthPct = total > 0 ? Math.round((growth30 / Math.max(1, total - growth30)) * 100) : 0;
      setData({
        active: active.count || 0,
        pending: pending.count || 0,
        total,
        growth30,
        growthPct,
      });
    })();
    return () => { cancelled = true; };
  }, [clubId]);
  if (data == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  const row = (label, count) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '6px 0', borderBottom: `1px solid ${G.border}`,
    }}>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>{label}</span>
      <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text }}>{count}</span>
    </div>
  );
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: 36, fontWeight: 700, color: G.text, lineHeight: 1,
        }}>
          {data.total}
        </span>
        {data.growth30 > 0 && (
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, fontWeight: 700, color: G.openDot }}>
            ↑ {data.growth30} (+{data.growthPct}%) past 30 days
          </span>
        )}
      </div>
      <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
        total members
      </p>
      {row('Active',  data.active)}
      {row('Pending', data.pending)}
    </div>
  );
}

function PendingApprovalsTile({ clubId }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('members')
        .select('id, created_at, people(name, email)') // v0.16.14 — Task #52 stage 1
        .eq('club_id', clubId).eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);
      if (cancelled) return;
      setRows(Array.isArray(data) ? liftMembers(data) : []);
    })();
    return () => { cancelled = true; };
  }, [clubId]);
  if (rows == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <span style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: 36, fontWeight: 700,
          color: rows.length > 0 ? G.brass : G.text,
          lineHeight: 1,
        }}>
          {rows.length}
        </span>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>
          awaiting approval
        </span>
      </div>
      {rows.length === 0 && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
          No pending member approvals.
        </p>
      )}
      {rows.slice(0, 5).map((m, i) => (
        <div key={m.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          padding: '6px 0',
          borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
        }}>
          <span style={{
            fontFamily: '"Lora",serif', fontSize: 13, color: G.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1, minWidth: 0,
          }}>
            {m.name || m.email || 'Member'}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 10, color: G.muted, marginLeft: 8 }}>
            {new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
      ))}
      {rows.length > 5 && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '6px 0 0' }}>
          + {rows.length - 5} more
        </p>
      )}
    </div>
  );
}

function EngagementScoreTile({ clubId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [totalActiveMembers, recentEvents] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).eq('status', 'active'),
        // Distinct member_ids in analytics_events the last 7 days.
        // We can't COUNT DISTINCT directly via PostgREST — pull
        // member_ids and dedupe in JS. Capped at 5000 rows; for a
        // club this is plenty (one row per event per active user).
        supabase.from('analytics_events').select('member_id')
          .eq('club_id', clubId).gt('ts', sevenDaysAgo)
          .not('member_id', 'is', null)
          .limit(5000),
      ]);
      if (cancelled) return;
      const totalMembers = totalActiveMembers.count || 0;
      const activeMemberIds = new Set();
      for (const row of recentEvents.data || []) {
        if (row.member_id) activeMemberIds.add(row.member_id);
      }
      const activeCount = activeMemberIds.size;
      const pct = totalMembers > 0 ? Math.round((activeCount / totalMembers) * 100) : 0;
      setData({ totalMembers, activeCount, pct });
    })();
    return () => { cancelled = true; };
  }, [clubId]);
  if (data == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  // Color thresholds: ≥60% green, 30-59% brass, <30% red.
  const color = data.pct >= 60 ? G.openDot : data.pct >= 30 ? G.brass : G.clsDot;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <span style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: 36, fontWeight: 700, color, lineHeight: 1,
        }}>
          {data.pct}%
        </span>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>
          active in last 7 days
        </span>
      </div>
      <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '14px 0 0' }}>
        {data.activeCount} of {data.totalMembers} active members opened the app this week.
      </p>
    </div>
  );
}

function DirectoryCompletenessTile({ clubId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const [total, withPhoto, withEmail] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).eq('status', 'active'),
        supabase.from('members').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).eq('status', 'active')
          .not('photo_url', 'is', null),
        supabase.from('members').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).eq('status', 'active')
          .not('email', 'is', null),
      ]);
      if (cancelled) return;
      const t = total.count || 0;
      setData({
        total: t,
        photoPct: t > 0 ? Math.round(((withPhoto.count || 0) / t) * 100) : 0,
        emailPct: t > 0 ? Math.round(((withEmail.count || 0) / t) * 100) : 0,
        missingPhoto: t - (withPhoto.count || 0),
        missingEmail: t - (withEmail.count || 0),
      });
    })();
    return () => { cancelled = true; };
  }, [clubId]);
  if (data == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  const bar = (label, pct, missing) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text }}>{label}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: G.muted }}>
          {pct}%{missing > 0 ? ` · ${missing} missing` : ''}
        </span>
      </div>
      <div style={{ height: 6, background: G.bg, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct >= 80 ? G.openDot : pct >= 50 ? G.brass : G.clsDot }} />
      </div>
    </div>
  );
  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 12px' }}>
        Out of {data.total} active members:
      </p>
      {bar('Profile photo on file', data.photoPct, data.missingPhoto)}
      {bar('Email on file',         data.emailPct, data.missingEmail)}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// v0.11.32 — Communications / Marketing tiles
// ──────────────────────────────────────────────────────────────────

function PushTodayTile({ clubId }) {
  const [count, setCount] = useState(null);
  const [recent, setRecent] = useState(null);
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
      const [cnt, rec] = await Promise.all([
        supabase.from('notification_messages').select('id', { count: 'exact', head: true })
          .eq('club_id', clubId).gte('created_at', todayMidnight.toISOString()),
        supabase.from('notification_messages')
          .select('id, title, created_at')
          .eq('club_id', clubId).gte('created_at', todayMidnight.toISOString())
          .order('created_at', { ascending: false }).limit(3),
      ]);
      if (cancelled) return;
      setCount(cnt.count || 0);
      setRecent(Array.isArray(rec.data) ? rec.data : []);
    })();
    return () => { cancelled = true; };
  }, [clubId]);
  if (count == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <span style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: 36, fontWeight: 700, color: G.text, lineHeight: 1,
        }}>
          {count}
        </span>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>
          sent today
        </span>
      </div>
      {recent && recent.length === 0 && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
          No pushes sent today.
        </p>
      )}
      {(recent || []).map((n, i) => (
        <div key={n.id} style={{
          padding: '6px 0',
          borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
        }}>
          <p style={{
            fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {n.title || '(no title)'}
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: 10, color: G.muted, margin: '1px 0 0' }}>
            {/* v0.15.32 — smart relative timestamp (was time-only). */}
            {formatMessageTimestamp(n.created_at)}
          </p>
        </div>
      ))}
    </div>
  );
}

function RecentNewsTile({ clubId }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('news')
        .select('id, headline, category, published_at, created_at')
        .eq('club_id', clubId)
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(3);
      if (cancelled) return;
      setRows(Array.isArray(data) ? data : []);
    })();
    return () => { cancelled = true; };
  }, [clubId]);
  if (rows == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  if (rows.length === 0) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No news articles published.</p>;
  }
  return (
    <div>
      {rows.map((r, i) => (
        <div key={r.id} style={{
          padding: '8px 0',
          borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
        }}>
          <p style={{
            fontFamily: '"Playfair Display",serif',
            fontSize: 13, fontWeight: 700, color: G.text, margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {r.headline || '(no headline)'}
          </p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0' }}>
            {r.category || 'News'} · {new Date(r.published_at || r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
        </div>
      ))}
    </div>
  );
}

function TrendingPostsTile({ clubId }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    if (!clubId) return;
    let cancelled = false;
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      // Pull replies in the window, group by post in JS, then fetch
      // the corresponding post titles. Keeps this tile self-contained
      // without a server-side RPC.
      const { data: replies } = await supabase
        .from('post_replies')
        .select('post_table, post_id')
        .eq('club_id', clubId)
        .gt('created_at', sevenDaysAgo)
        .eq('hidden', false)
        .limit(2000);
      const counts = new Map();
      for (const r of replies || []) {
        const k = `${r.post_table}:${r.post_id}`;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
      const top = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k, n]) => {
          const [table, id] = k.split(':');
          return { table, id, replyCount: n };
        });
      // Fetch titles in parallel — one query per distinct table
      const byTable = {};
      for (const t of top) (byTable[t.table] ||= []).push(t.id);
      const fetched = await Promise.all(
        Object.entries(byTable).map(async ([table, ids]) => {
          if (table === 'bulletin_posts') {
            const { data } = await supabase.from('bulletin_posts').select('id, title, body').in('id', ids);
            return [table, data || []];
          }
          if (table === 'partner_posts') {
            const { data } = await supabase.from('partner_posts').select('id, game_type').in('id', ids);
            return [table, (data || []).map(r => ({ id: r.id, title: r.game_type ? `Partner: ${r.game_type}` : 'Partner post' }))];
          }
          if (table === 'events') {
            const { data } = await supabase.from('events').select('id, title').in('id', ids);
            return [table, data || []];
          }
          return [table, []];
        })
      );
      const titleMap = {};
      for (const [table, items] of fetched) {
        for (const it of items) {
          titleMap[`${table}:${it.id}`] = it.title || (it.body ? it.body.slice(0, 50) : 'Post');
        }
      }
      const out = top.map(t => ({
        ...t,
        title: titleMap[`${t.table}:${t.id}`] || `${t.table} #${String(t.id).slice(0, 6)}`,
      }));
      if (cancelled) return;
      setRows(out);
    })();
    return () => { cancelled = true; };
  }, [clubId]);
  if (rows == null) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Loading…</p>;
  }
  if (rows.length === 0) {
    return <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No replies in the last 7 days.</p>;
  }
  const surfaceLabel = (table) => {
    if (table === 'bulletin_posts') return 'Bulletin';
    if (table === 'partner_posts')  return 'Partners';
    if (table === 'events')         return 'Event';
    return table;
  };
  return (
    <div>
      {rows.map((r, i) => (
        <div key={`${r.table}:${r.id}`} style={{
          display: 'flex', alignItems: 'baseline', gap: 12,
          padding: '8px 0',
          borderTop: i === 0 ? 'none' : `1px solid ${G.border}`,
        }}>
          <span style={{
            flexShrink: 0,
            fontFamily: '"Playfair Display",serif', fontSize: 18, fontWeight: 700,
            color: G.brass, minWidth: 24,
          }}>
            {r.replyCount}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {r.title}
            </p>
            <p style={{
              fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: '1px 0 0',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {surfaceLabel(r.table)} · {r.replyCount} repl{r.replyCount === 1 ? 'y' : 'ies'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
