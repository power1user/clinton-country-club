// AdminWorkspaceSwitcher — v0.11.11 (Phase 12).
//
// Named "workspaces" for the admin sidebar. A workspace is a snapshot
// of two pieces of UI state:
//   · `collapsed`    — which sidebar area groups are collapsed
//   · `lastSection`  — { areaId, sectionId } the workspace lands on
//
// Why: managers wear multiple hats. A pro-shop manager opening the
// admin at 7am wants Communications + Pro Shop expanded, landing on
// the food-order queue. The same person at 4pm doing schedule prep
// wants Events expanded, landing on the calendar. Workspaces let
// them pre-configure each "mode" once and flip between them.
//
// Storage (uses the v0.11.6 useAdminPreference foundation):
//   · `workspaces`        — cross-club array of { id, name, collapsed, lastSection }
//   · `active_workspace`  — per-club id of the currently-active workspace
//                            (per-club because the same admin may wear
//                            different hats at different clubs)
//
// Applying a workspace is a one-shot restore — the parent's
// collapsed/lastSection state hooks own the live values from then on.
// To capture changes back into a workspace, the user picks
// "Update '<name>'" from the menu.
//
// UI: small chip in the sidebar header. Click → popover with the
// workspace list, "Save current view as…", and "Manage workspaces"
// affordances. Inline rename + delete in manage mode.

import { useEffect, useRef, useState } from 'react';
import { G } from '../theme.js';
import { useAdminPreference } from '../hooks/useAdminPreference.js';

function uuid() {
  // Lightweight id — workspaces are user-created and rare; no need
  // for crypto.randomUUID polyfill noise.
  return 'ws_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// v0.11.19 — Seeded default workspaces. Every club ships with these
// five out of the box so a fresh manager has useful presets the
// moment they open the admin. Each workspace is a snapshot of:
//   · `expanded`     — the single area id that should be expanded
//                       in the accordion sidebar (or null = none)
//   · `lastSection`  — where to land
//   · `readonly: true` — marks them as un-renamable / un-deletable;
//                        the manager can apply them and create their
//                        own customs, but the seeds always stay.
//
// Schema simplified from v0.11.17 (which stored a `collapsed` array
// of every-area-except-target). With the v0.11.19 accordion model
// the sidebar can only have one area open at a time, so a single
// `expanded` field is all the data we need. Legacy custom workspaces
// with `collapsed` arrays are still applied — the apply path derives
// `expanded` from `collapsed` as a fallback.
//
// Area ids come from AdminPanel.jsx AREAS: inbox, comms, events,
// course, proshop, dining, people, clubsetup, platform.
// v0.11.29 + v0.11.33 — seeded workspaces carry a `dashboardLayout`
// snapshot that switches the dashboard tile order + hidden set to
// match the role / focus of that workspace. v0.11.33 expanded each
// workspace to cover the full 19-tile catalog meaningfully:
//
//   · Daily Ops      → ops + status + queues; board/membership hidden
//   · Member Services→ membership + community; ops minimized
//   · Events         → event surfaces + community; ops/board hidden
//   · Broadcasts     → comms surfaces; ops/board hidden
//   · Setup          → minimal: engagement + directory health only
//
// The `hidden` list is comprehensive — every tile NOT in the visible
// `order` is explicitly hidden so applying a workspace yields a
// focused dashboard (5-6 tiles), not 19. The manager can still
// "Manage tiles" to unhide anything they want for that workspace.
//
// Tile ids (alphabetical) — kept here as a quick reference:
//   active_guests, badges_awarded, community_pulse,
//   course_status_now, directory_completeness, engagement_score,
//   membership_snapshot, new_members, open_work, order_velocity,
//   pending_approvals, push_today, recent_bulletin, recent_news,
//   today_activity, todays_events, top_screens, trending_posts,
//   upcoming_events

const DEFAULT_WORKSPACES = [
  {
    id: 'default_daily',
    name: 'Daily Ops',
    // v0.12.0 — Daily Ops now lands on Dining → Food Orders (food
    // moved out of Communications into Dining for Phase 13).
    expanded: 'dining',
    lastSection: { areaId: 'dining', sectionId: 'inbox_food' },
    dashboardLayout: {
      order: [
        'open_work',
        'course_status_now',
        'todays_events',
        'order_velocity',
        'active_guests',
        'today_activity',
      ],
      hidden: [
        'top_screens', 'community_pulse', 'upcoming_events', 'new_members',
        'badges_awarded', 'recent_bulletin', 'membership_snapshot',
        'pending_approvals', 'engagement_score', 'directory_completeness',
        'push_today', 'recent_news', 'trending_posts',
      ],
    },
    readonly: true,
  },
  {
    id: 'default_member_services',
    name: 'Member Services',
    expanded: 'people',
    lastSection: { areaId: 'people', sectionId: 'people_all' },
    dashboardLayout: {
      order: [
        'pending_approvals',
        'new_members',
        'community_pulse',
        'directory_completeness',
        'recent_bulletin',
        'today_activity',
      ],
      hidden: [
        'open_work', 'top_screens', 'upcoming_events', 'badges_awarded',
        'course_status_now', 'todays_events', 'order_velocity',
        'active_guests', 'membership_snapshot', 'engagement_score',
        'push_today', 'recent_news', 'trending_posts',
      ],
    },
    readonly: true,
  },
  {
    id: 'default_events',
    name: 'Events',
    expanded: 'events',
    lastSection: { areaId: 'events', sectionId: 'eventsadmin' },
    dashboardLayout: {
      order: [
        'upcoming_events',
        'todays_events',
        'community_pulse',
        'top_screens',
        'today_activity',
        'badges_awarded',
      ],
      hidden: [
        'open_work', 'new_members', 'recent_bulletin', 'course_status_now',
        'order_velocity', 'active_guests', 'membership_snapshot',
        'pending_approvals', 'engagement_score', 'directory_completeness',
        'push_today', 'recent_news', 'trending_posts',
      ],
    },
    readonly: true,
  },
  {
    id: 'default_broadcasts',
    name: 'Broadcasts',
    expanded: 'comms',
    lastSection: { areaId: 'comms', sectionId: 'news' },
    dashboardLayout: {
      order: [
        'push_today',
        'recent_news',
        'trending_posts',
        'top_screens',
        'today_activity',
        'community_pulse',
      ],
      hidden: [
        'open_work', 'upcoming_events', 'new_members', 'badges_awarded',
        'recent_bulletin', 'course_status_now', 'todays_events',
        'order_velocity', 'active_guests', 'membership_snapshot',
        'pending_approvals', 'engagement_score', 'directory_completeness',
      ],
    },
    readonly: true,
  },
  {
    id: 'default_setup',
    name: 'Setup',
    expanded: 'clubsetup',
    lastSection: { areaId: 'clubsetup', sectionId: 'clubsettings' },
    dashboardLayout: {
      order: [
        'today_activity',
        'engagement_score',
        'directory_completeness',
        'top_screens',
      ],
      hidden: [
        'open_work', 'community_pulse', 'upcoming_events', 'new_members',
        'badges_awarded', 'recent_bulletin', 'course_status_now',
        'todays_events', 'order_velocity', 'active_guests',
        'membership_snapshot', 'pending_approvals', 'push_today',
        'recent_news', 'trending_posts',
      ],
    },
    readonly: true,
  },
];

export default function AdminWorkspaceSwitcher({
  // v0.11.19 — Accordion sidebar: single area expanded at a time.
  // Prop renamed from `collapsed` (array of closed area IDs) to
  // `expanded` (single open area ID or null). Workspaces likewise
  // store a single `expanded` field instead of an array.
  expanded,
  lastSection,
  // v0.11.29 — Dashboard tile order + hidden set, lifted up from
  // AdminDashboard. The switcher snapshots both fields when the
  // manager saves a workspace ("Save current view as" / "Update
  // <name> with current view") and pushes them back via onRestore
  // when a workspace is applied. Optional — if undefined, the
  // switcher silently skips the dashboard parts.
  dashboardLayout,
  onRestore,
}) {
  // Cross-club workspaces — the list itself follows the admin.
  const [workspaces, setWorkspaces] = useAdminPreference(
    'workspaces',
    [],
    { clubScoped: false },
  );
  // Active workspace is per-club — the same admin may have a
  // different "current hat" at each club they administer.
  const [activeId, setActiveId] = useAdminPreference(
    'active_workspace',
    null,
  );

  const [open, setOpen] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [creatingName, setCreatingName] = useState('');
  const wrapRef = useRef(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setManageMode(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // v0.11.17 — Merge seeded defaults with the manager's custom list.
  // `customList` is what useAdminPreference returned (writable).
  // `displayList` is what the popover renders in normal mode (defaults
  // first, then customs). `active` resolves from displayList so a
  // default workspace can be active even though it's not in
  // admin_preferences.
  const customList = Array.isArray(workspaces) ? workspaces : [];
  const displayList = [...DEFAULT_WORKSPACES, ...customList];
  const active = displayList.find(w => w.id === activeId) || null;

  // Apply a workspace — restore expanded area + lastSection +
  // dashboard layout and mark active.
  // v0.11.19 — Falls back to deriving `expanded` from a legacy
  // `collapsed` array if the workspace pre-dates v0.11.19.
  // v0.11.29 — Pushes `dashboardLayout` back via onRestore if the
  // workspace has one; legacy workspaces without it leave the
  // user's current dashboard prefs alone.
  const applyWorkspace = (ws) => {
    if (!ws) return;
    const nextExpanded = ws.expanded !== undefined
      ? ws.expanded
      : (ws.lastSection?.areaId ?? null);
    onRestore?.({
      expanded: nextExpanded,
      lastSection: ws.lastSection || { areaId: null, sectionId: null },
      dashboardLayout: ws.dashboardLayout, // may be undefined → no-op in parent
    });
    setActiveId(ws.id);
    setOpen(false);
    setManageMode(false);
  };

  // Helper — snapshot current dashboard state into a workspace shape.
  // Returns `undefined` (NOT included) if no dashboardLayout prop is
  // wired, so old test paths that don't provide one keep working.
  const snapshotDashboard = () => {
    if (!dashboardLayout) return undefined;
    return {
      order: dashboardLayout.order ?? null,
      hidden: Array.isArray(dashboardLayout.hidden) ? dashboardLayout.hidden : [],
    };
  };

  // Save current state as a new workspace.
  const saveCurrentAs = () => {
    const name = creatingName.trim();
    if (!name) return;
    const id = uuid();
    const snap = snapshotDashboard();
    const ws = {
      id,
      name,
      expanded: typeof expanded === 'string' ? expanded : null,
      lastSection: lastSection || { areaId: null, sectionId: null },
      ...(snap ? { dashboardLayout: snap } : {}),
    };
    setWorkspaces(prev => [...(prev || []), ws]);
    setActiveId(id);
    setCreatingName('');
    setOpen(false);
  };

  // Update active workspace with current state.
  const updateActive = () => {
    if (!active) return;
    const snap = snapshotDashboard();
    setWorkspaces(prev => (prev || []).map(w => w.id === active.id ? {
      ...w,
      expanded: typeof expanded === 'string' ? expanded : null,
      lastSection: lastSection || { areaId: null, sectionId: null },
      ...(snap ? { dashboardLayout: snap } : {}),
    } : w));
    setOpen(false);
  };

  const renameWorkspace = (id, nextName) => {
    if (DEFAULT_WORKSPACES.some(w => w.id === id)) return;  // readonly guard
    const name = (nextName || '').trim();
    if (!name) return;
    setWorkspaces(prev => (prev || []).map(w => w.id === id ? { ...w, name } : w));
  };

  const deleteWorkspace = (id) => {
    if (DEFAULT_WORKSPACES.some(w => w.id === id)) return;  // readonly guard
    setWorkspaces(prev => (prev || []).filter(w => w.id !== id));
    if (activeId === id) setActiveId(null);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Trigger chip — shows active workspace name or "Workspace" placeholder. */}
      <div
        onClick={() => setOpen(o => !o)}
        data-tap
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 12,
          padding: '8px 12px',
          background: 'rgba(168,216,184,0.10)',
          border: '1px solid rgba(168,216,184,0.22)',
          borderRadius: 6,
          cursor: 'pointer',
          fontFamily: '"Lora",serif',
          fontSize: 13,
          color: '#F2EDE0',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {active ? active.name : 'Workspace'}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Popover — anchored below the chip, opens upward to keep
          itself inside the sidebar even when the chip is near the
          top of the sidebar header. */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 6,
          background: G.card,
          color: G.text,
          border: `1px solid ${G.border}`,
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          zIndex: 50,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 14px',
            borderBottom: `1px solid ${G.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{
              fontFamily: '"Lora",serif',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: G.muted,
            }}>
              {manageMode ? 'Manage workspaces' : 'Workspaces'}
            </span>
            <span
              onClick={() => setManageMode(m => !m)}
              data-tap
              style={{
                fontFamily: '"Lora",serif',
                fontSize: 12,
                color: G.brass,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
            >
              {manageMode ? 'Done' : 'Manage'}
            </span>
          </div>

          {/* Workspace list. In manage mode, we render only the
              manager's CUSTOM workspaces (defaults are protected;
              the manage UI is for their personal organization).
              In normal mode, defaults are shown first with a small
              "Seeded" tag, then the manager's customs. */}
          {!manageMode && displayList.map(ws => (
            <WorkspaceRow
              key={ws.id}
              ws={ws}
              isActive={ws.id === activeId}
              manageMode={false}
              onApply={() => applyWorkspace(ws)}
              onRename={() => {}}
              onDelete={() => {}}
            />
          ))}
          {manageMode && customList.length === 0 && (
            <div style={{
              padding: '12px 14px',
              fontFamily: '"Lora",serif',
              fontSize: 13,
              color: G.muted,
              fontStyle: 'italic',
            }}>
              No custom workspaces yet. The five seeded workspaces are
              always available and can't be renamed or removed.
            </div>
          )}
          {manageMode && customList.map(ws => (
            <WorkspaceRow
              key={ws.id}
              ws={ws}
              isActive={ws.id === activeId}
              manageMode={true}
              onApply={() => applyWorkspace(ws)}
              onRename={(n) => renameWorkspace(ws.id, n)}
              onDelete={() => deleteWorkspace(ws.id)}
            />
          ))}

          {/* Update active — only for non-readonly (custom) workspaces.
              Seeded defaults are static; applying them and then
              tinkering doesn't write back into the seed. */}
          {!manageMode && active && !active.readonly && (
            <div
              onClick={updateActive}
              data-tap
              style={{
                padding: '10px 14px',
                borderTop: `1px solid ${G.border}`,
                fontFamily: '"Lora",serif',
                fontSize: 13,
                color: G.brass,
                cursor: 'pointer',
              }}
            >
              ↑ Update “{active.name}” with current view
            </div>
          )}

          {/* Save current as new */}
          {!manageMode && (
            <div style={{
              padding: '10px 14px',
              borderTop: `1px solid ${G.border}`,
              background: G.bg,
            }}>
              <p style={{
                fontFamily: '"Lora",serif',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: G.muted,
                margin: '0 0 8px',
              }}>
                Save current view as
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={creatingName}
                  onChange={(e) => setCreatingName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveCurrentAs(); }}
                  placeholder="e.g. Daily ops"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '8px 10px',
                    border: `1px solid ${G.border}`,
                    borderRadius: 4,
                    fontFamily: '"Lora",serif',
                    fontSize: 14,
                    color: G.text,
                    background: G.card,
                  }}
                />
                <button
                  onClick={saveCurrentAs}
                  disabled={!creatingName.trim()}
                  data-tap
                  style={{
                    padding: '8px 12px',
                    border: `1px solid ${G.brass}`,
                    background: creatingName.trim() ? G.brass : 'transparent',
                    color: creatingName.trim() ? '#FFFFFF' : G.muted,
                    fontFamily: '"Lora",serif',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 4,
                    cursor: creatingName.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Single row in the workspace popover. In normal mode: click to
// apply. In manage mode: rename input + delete button.
function WorkspaceRow({ ws, isActive, manageMode, onApply, onRename, onDelete }) {
  const [editName, setEditName] = useState(ws.name);
  useEffect(() => { setEditName(ws.name); }, [ws.name]);

  if (manageMode) {
    return (
      <div style={{
        padding: '8px 14px',
        borderBottom: `1px solid ${G.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => { if (editName.trim() && editName !== ws.name) onRename(editName); }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '6px 8px',
            border: `1px solid ${G.border}`,
            borderRadius: 4,
            fontFamily: '"Lora",serif',
            fontSize: 14,
            color: G.text,
            background: G.card,
          }}
        />
        <button
          onClick={onDelete}
          data-tap
          aria-label={`Delete workspace ${ws.name}`}
          style={{
            padding: '4px 8px',
            border: 'none',
            background: 'transparent',
            color: G.cls,
            cursor: 'pointer',
            fontFamily: '"Lora",serif',
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={onApply}
      data-tap
      style={{
        padding: '10px 14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: isActive ? 'rgba(155,122,30,0.10)' : 'transparent',
        borderLeft: `3px solid ${isActive ? G.brass : 'transparent'}`,
        fontFamily: '"Lora",serif',
        fontSize: 14,
        color: G.text,
      }}
    >
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {ws.name}
      </span>
      {/* v0.11.17 — Small "Seeded" tag on default workspaces so the
          manager understands why they can't be renamed/deleted in
          Manage mode. Shown alongside (or instead of) the Active tag. */}
      {ws.readonly && (
        <span style={{
          fontFamily: '"Lora",serif',
          fontSize: 10,
          color: G.muted,
          fontStyle: 'italic',
          letterSpacing: '0.04em',
        }}>
          seeded
        </span>
      )}
      {isActive && (
        <span style={{
          fontFamily: '"Lora",serif',
          fontSize: 11,
          color: G.brass,
          fontWeight: 700,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
        }}>
          Active
        </span>
      )}
    </div>
  );
}
