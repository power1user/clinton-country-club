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
];

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

  // v0.11.28 — Compute the rendered tile order:
  //   1. Start with the persisted order (or fall back to catalog order)
  //   2. Drop tiles that aren't in the visible catalog (role-gated out)
  //   3. Drop hidden tiles
  //   4. Append any role-visible-not-hidden tiles that aren't already
  //      listed (covers brand-new tiles added in a future patch — they
  //      land at the end of the manager's existing layout)
  const renderedTiles = useMemo(() => {
    const orderList = Array.isArray(tileOrder) && tileOrder.length > 0
      ? tileOrder
      : visibleCatalog.map(t => t.id);
    const out = [];
    const seen = new Set();
    for (const id of orderList) {
      if (hiddenSet.has(id)) continue;
      const tile = visibleCatalog.find(t => t.id === id);
      if (!tile) continue;
      out.push(tile);
      seen.add(id);
    }
    for (const tile of visibleCatalog) {
      if (seen.has(tile.id) || hiddenSet.has(tile.id)) continue;
      out.push(tile);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileOrder, hidden, visibleCatalog]);

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
            color: delta > 0 ? G.openDot : G.cls,
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
        .select('id, name, created_at')
        .eq('club_id', clubId)
        .gt('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20);
      if (cancelled) return;
      setRows(Array.isArray(data) ? data : []);
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
      const { data } = await supabase
        .from('member_badges')
        .select('id, awarded_at, members(name), badges(name, color, club_id)')
        .order('awarded_at', { ascending: false })
        .limit(15);
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
      const { data } = await supabase
        .from('bulletin_posts')
        .select('id, title, body, created_at, members(name)')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .limit(5);
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
