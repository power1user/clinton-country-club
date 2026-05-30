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

export default function AdminWorkspaceSwitcher({
  collapsed,
  lastSection,
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

  const list = Array.isArray(workspaces) ? workspaces : [];
  const active = list.find(w => w.id === activeId) || null;

  // Apply a workspace — restore collapsed + lastSection and mark active.
  const applyWorkspace = (ws) => {
    if (!ws) return;
    onRestore?.({
      collapsed: Array.isArray(ws.collapsed) ? ws.collapsed : [],
      lastSection: ws.lastSection || { areaId: null, sectionId: null },
    });
    setActiveId(ws.id);
    setOpen(false);
    setManageMode(false);
  };

  // Save current collapsed + lastSection as a new workspace.
  const saveCurrentAs = () => {
    const name = creatingName.trim();
    if (!name) return;
    const id = uuid();
    const ws = {
      id,
      name,
      collapsed: Array.isArray(collapsed) ? collapsed : [],
      lastSection: lastSection || { areaId: null, sectionId: null },
    };
    setWorkspaces(prev => [...(prev || []), ws]);
    setActiveId(id);
    setCreatingName('');
    setOpen(false);
  };

  // Update active workspace with current state.
  const updateActive = () => {
    if (!active) return;
    setWorkspaces(prev => (prev || []).map(w => w.id === active.id ? {
      ...w,
      collapsed: Array.isArray(collapsed) ? collapsed : [],
      lastSection: lastSection || { areaId: null, sectionId: null },
    } : w));
    setOpen(false);
  };

  const renameWorkspace = (id, nextName) => {
    const name = (nextName || '').trim();
    if (!name) return;
    setWorkspaces(prev => (prev || []).map(w => w.id === id ? { ...w, name } : w));
  };

  const deleteWorkspace = (id) => {
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
          gap: 6,
          marginTop: 10,
          padding: '6px 10px',
          background: 'rgba(168,216,184,0.10)',
          border: '1px solid rgba(168,216,184,0.22)',
          borderRadius: 6,
          cursor: 'pointer',
          fontFamily: '"Lora",serif',
          fontSize: 11,
          color: '#F2EDE0',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {active ? active.name : 'Workspace'}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="2">
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
            padding: '8px 12px',
            borderBottom: `1px solid ${G.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{
              fontFamily: '"Lora",serif',
              fontSize: 10,
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
                fontSize: 10,
                color: G.brass,
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
              }}
            >
              {manageMode ? 'Done' : 'Manage'}
            </span>
          </div>

          {/* Workspace list */}
          {list.length === 0 && (
            <div style={{
              padding: '10px 12px',
              fontFamily: '"Lora",serif',
              fontSize: 11,
              color: G.muted,
              fontStyle: 'italic',
            }}>
              No workspaces yet. Save your current view to start.
            </div>
          )}
          {list.map(ws => (
            <WorkspaceRow
              key={ws.id}
              ws={ws}
              isActive={ws.id === activeId}
              manageMode={manageMode}
              onApply={() => applyWorkspace(ws)}
              onRename={(n) => renameWorkspace(ws.id, n)}
              onDelete={() => deleteWorkspace(ws.id)}
            />
          ))}

          {/* Update active */}
          {!manageMode && active && (
            <div
              onClick={updateActive}
              data-tap
              style={{
                padding: '8px 12px',
                borderTop: `1px solid ${G.border}`,
                fontFamily: '"Lora",serif',
                fontSize: 11,
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
              padding: '8px 12px',
              borderTop: `1px solid ${G.border}`,
              background: G.bg,
            }}>
              <p style={{
                fontFamily: '"Lora",serif',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: G.muted,
                margin: '0 0 6px',
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
                    padding: '6px 8px',
                    border: `1px solid ${G.border}`,
                    borderRadius: 4,
                    fontFamily: '"Lora",serif',
                    fontSize: 12,
                    color: G.text,
                    background: G.card,
                  }}
                />
                <button
                  onClick={saveCurrentAs}
                  disabled={!creatingName.trim()}
                  data-tap
                  style={{
                    padding: '6px 10px',
                    border: `1px solid ${G.brass}`,
                    background: creatingName.trim() ? G.brass : 'transparent',
                    color: creatingName.trim() ? '#FFFFFF' : G.muted,
                    fontFamily: '"Lora",serif',
                    fontSize: 11,
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
        padding: '6px 12px',
        borderBottom: `1px solid ${G.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
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
            padding: '4px 6px',
            border: `1px solid ${G.border}`,
            borderRadius: 4,
            fontFamily: '"Lora",serif',
            fontSize: 12,
            color: G.text,
            background: G.card,
          }}
        />
        <button
          onClick={onDelete}
          data-tap
          aria-label={`Delete workspace ${ws.name}`}
          style={{
            padding: '4px 6px',
            border: 'none',
            background: 'transparent',
            color: G.cls,
            cursor: 'pointer',
            fontFamily: '"Lora",serif',
            fontSize: 14,
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
        padding: '8px 12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: isActive ? 'rgba(155,122,30,0.10)' : 'transparent',
        borderLeft: `3px solid ${isActive ? G.brass : 'transparent'}`,
        fontFamily: '"Lora",serif',
        fontSize: 12,
        color: G.text,
      }}
    >
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {ws.name}
      </span>
      {isActive && (
        <span style={{
          fontFamily: '"Lora",serif',
          fontSize: 9,
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
