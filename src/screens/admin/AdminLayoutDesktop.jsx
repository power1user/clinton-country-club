// AdminLayoutDesktop — v0.11.1 (Phase 12).
//
// The persistent-sidebar shell for the admin section, rendered when
// useViewport().isDesktop is true (≥ 1024 CSS pixels). Replaces the
// mobile drill-down with the standard 3-column admin pattern:
//
//   ┌───────────┬────────────────────────────────────────────┐
//   │  Sidebar  │  Top bar (breadcrumb · BellChip · staff)   │
//   │  ─────────┤────────────────────────────────────────────│
//   │  Areas +  │                                            │
//   │  sections │  Main content                              │
//   │  tree     │  (renders SectionContent for active sec    │
//   │  with     │   OR a placeholder when nothing selected)  │
//   │  active   │                                            │
//   │  highlt   │                                            │
//   │           │                                            │
//   ├───────────┤                                            │
//   │  Member   │                                            │
//   │  + sign   │                                            │
//   │  out      │                                            │
//   └───────────┴────────────────────────────────────────────┘
//
// State source-of-truth stays in AdminPanel (area + sec). This
// component receives them + the setters so navigation via the
// sidebar is exactly equivalent to mobile area-card → section-card
// drill-down.
//
// v0.11.2 layers in breadcrumbs, collapsible sidebar groups (each
// area's sections expand/collapse), and richer active-state styling.
// v0.11.5 lands the global search input in the top bar's center.
// This v0.11.1 commit gets the shape on screen — clean and
// navigable — without the polish.

import { useEffect, useState } from 'react';
import { G, applyThemeMode } from '../../theme.js';
import { useNav } from '../../hooks/useNav.jsx';
import BellChip from '../../components/BellChip.jsx';
import AdminSearchPalette, { SearchTrigger } from '../../components/AdminSearchPalette.jsx';
import { useAdminPreference } from '../../hooks/useAdminPreference.js';
import { SectionContent } from '../AdminPanel.jsx';

// Hard width for the sidebar — chosen to fit the longest area
// label ("Communications") + a small icon at our base font sizes
// without wrap. Tuned for visual rhythm against the 1280px main
// content max-width.
const SIDEBAR_W = 260;
const TOPBAR_H  = 56;

export default function AdminLayoutDesktop({
  area, sec, setArea, setSec,
  areas, sectionVisible,
  member, club,
  isManager, isSuperAdmin,
  commsUnread,
}) {
  const { goTab } = useNav();
  // v0.11.5 — palette open state. The palette also opens on Cmd+K
  // globally; the SearchTrigger button is a discoverability hint.
  const [paletteOpen, setPaletteOpen] = useState(false);
  // v0.11.8 — Dark mode toggle. Cross-club preference (clubScoped:
  // false) — managing multiple clubs shouldn't flip the theme on
  // you when you switch between them. applyThemeMode sets CSS
  // custom properties on documentElement so the theme propagates
  // through the existing G.* var() fallbacks without per-component
  // wiring.
  const [theme, setTheme] = useAdminPreference(
    'theme',
    { mode: 'light' },
    { clubScoped: false },
  );
  useEffect(() => {
    applyThemeMode(theme?.mode || 'light');
  }, [theme?.mode]);
  // v0.11.7 — Sidebar collapse state persisted via admin_preferences.
  // Default ALL expanded; manager toggles persist per (user, club)
  // so it doesn't reset on reload or when switching browsers. Stored
  // as a plain array of area ids in jsonb.
  const [collapsedArray, setCollapsedArray] = useAdminPreference(
    'sidebar_collapsed',
    [],
  );
  const collapsed = new Set(collapsedArray || []);
  const toggleCollapse = (areaId) => {
    setCollapsedArray(prev => {
      const next = new Set(prev || []);
      if (next.has(areaId)) next.delete(areaId);
      else next.add(areaId);
      return [...next];
    });
  };

  // The currently-displayed section's label, used by the top bar.
  // Falls back to the area name when nothing is selected so the
  // top bar always shows where the manager is.
  const activeArea    = areas.find(a => a.id === area);
  const activeSection = activeArea?.sections.find(s => s.id === sec);
  const topTitle = activeSection?.l || activeArea?.l || 'Admin';

  // Sidebar click handler. Updates area + sec together so the
  // active highlight (which depends on both) stays consistent.
  const onPickSection = (areaId, sectionId) => {
    setArea(areaId);
    setSec(sectionId);
  };

  return (
    <div style={{
      flex: 1,
      display: 'grid',
      gridTemplateColumns: `${SIDEBAR_W}px 1fr`,
      gridTemplateRows: `${TOPBAR_H}px 1fr`,
      gridTemplateAreas: `"sidebar topbar" "sidebar main"`,
      background: G.bg,
      overflow: 'hidden',
    }}>
      {/* ─── Sidebar (spans both rows) ─── */}
      <aside style={{
        gridArea: 'sidebar',
        background: G.green,
        color: '#F2EDE0',
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${G.greenDk}`,
        overflow: 'hidden',
      }}>
        {/* Sidebar header — club name + small "Admin" chip */}
        <div style={{
          padding: '14px 18px',
          borderBottom: `1px solid rgba(168,216,184,0.18)`,
          flexShrink: 0,
        }}>
          <p style={{
            fontFamily: '"Playfair Display",serif',
            fontSize: 9,
            color: '#A8D8B8',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            margin: '0 0 2px',
            fontWeight: 600,
          }}>
            {club?.name?.replace(/\s+Country\s+Club\s*$/i, '') || 'Club'} · Admin
          </p>
          <p style={{
            fontFamily: '"Playfair Display",serif',
            fontSize: 16,
            color: '#F2EDE0',
            margin: 0,
            fontWeight: 700,
            lineHeight: 1.15,
          }}>
            Manage your club
          </p>
        </div>

        {/* Sidebar tree */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {areas.map(a => {
            const isAreaCollapsed = collapsed.has(a.id);
            const visibleSections = a.sections.filter(sectionVisible);
            if (visibleSections.length === 0) return null;
            const isCommsArea = a.id === 'inbox';
            const areaUnread = isCommsArea
              ? Object.values(commsUnread?.counts || {}).reduce((s, n) => s + (n || 0), 0)
              : 0;
            return (
              <div key={a.id} style={{ marginBottom: 4 }}>
                {/* Area header — expandable */}
                <div
                  onClick={() => toggleCollapse(a.id)}
                  data-tap
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 18px',
                    cursor: 'pointer',
                    fontFamily: '"Lora",serif',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#A8D8B8',
                  }}
                >
                  <span style={{ flex: 1 }}>{a.l}</span>
                  {areaUnread > 0 && (
                    <span style={{
                      background: G.clsBg,
                      color: '#F2E5C0',
                      fontFamily: '"Lora",serif',
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 8,
                      letterSpacing: '0.04em',
                    }}>{areaUnread}</span>
                  )}
                  <svg
                    width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="2"
                    style={{ transform: isAreaCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}
                  ><path d="M6 9l6 6 6-6" /></svg>
                </div>
                {/* Sections */}
                {!isAreaCollapsed && visibleSections.map(s => {
                  const isActive = s.id === sec;
                  const subUnread = isCommsArea ? (commsUnread?.counts?.[s.id] || 0) : 0;
                  return (
                    <div
                      key={s.id}
                      onClick={() => onPickSection(a.id, s.id)}
                      data-tap
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 22px 8px 28px',
                        cursor: 'pointer',
                        fontFamily: '"Lora",serif',
                        fontSize: 13,
                        color: isActive ? '#F2EDE0' : 'rgba(242,237,224,0.78)',
                        background: isActive ? 'rgba(155,122,30,0.22)' : 'transparent',
                        borderLeft: `2px solid ${isActive ? G.brass : 'transparent'}`,
                        fontWeight: isActive ? 600 : 400,
                        transition: 'background 0.12s, color 0.12s',
                      }}
                    >
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.l}
                      </span>
                      {subUnread > 0 && (
                        <span style={{
                          background: G.clsBg,
                          color: '#F2E5C0',
                          fontFamily: '"Lora",serif',
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 8,
                          flexShrink: 0,
                        }}>{subUnread}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar footer — current admin + "leave admin" return */}
        <div style={{
          padding: '10px 18px 14px',
          borderTop: `1px solid rgba(168,216,184,0.18)`,
          flexShrink: 0,
        }}>
          <p style={{
            fontFamily: '"Lora",serif',
            fontSize: 9,
            color: '#A8D8B8',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            margin: '0 0 2px',
          }}>
            Signed in as
          </p>
          <p style={{
            fontFamily: '"Playfair Display",serif',
            fontSize: 13,
            color: '#F2EDE0',
            margin: '0 0 8px',
            fontWeight: 600,
          }}>
            {member?.name || 'Staff'}
          </p>
          <div
            onClick={() => goTab('myclub')}
            data-tap
            style={{
              fontFamily: '"Lora",serif',
              fontSize: 11,
              color: '#A8D8B8',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            ← Back to MyClub
          </div>

          {/* v0.11.8 — Dark mode toggle. Cross-club preference,
              small affordance tucked under the back-to-myclub link
              so power users discover it but the default UI stays
              clean. */}
          <div
            onClick={() => setTheme({ mode: theme?.mode === 'dark' ? 'light' : 'dark' })}
            data-tap
            style={{
              marginTop: 10,
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: '"Lora",serif',
              fontSize: 10,
              color: '#A8D8B8',
              cursor: 'pointer',
              opacity: 0.78,
              userSelect: 'none',
            }}
          >
            {theme?.mode === 'dark' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            <span>{theme?.mode === 'dark' ? 'Switch to light' : 'Switch to dark'}</span>
          </div>
        </div>
      </aside>

      {/* ─── Top bar ─── breadcrumbs (v0.11.2) + bell. The center
          slot in the top bar is reserved for the global search
          input landing in v0.11.5; for now it stays empty so the
          spacing doesn't shift when search shows up. */}
      <header style={{
        gridArea: 'topbar',
        background: '#FFFFFF',
        borderBottom: `1px solid ${G.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
      }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {/* Breadcrumb row — Admin › Area › Section. Each
              ancestor crumb is clickable and walks the state back
              to that level. The current crumb is non-interactive
              and styled with the heavier title weight. */}
          <Breadcrumbs
            area={activeArea}
            section={activeSection}
            onHome={() => { setArea(null); setSec(null); }}
            onArea={() => { setSec(null); }}
          />
        </div>
        {/* v0.11.5 — global search trigger. Cmd+K opens the palette
            globally too; this button is the discoverability hint. */}
        <SearchTrigger onClick={() => setPaletteOpen(true)} />
        <BellChip />
      </header>

      {/* v0.11.5 — global search palette. Mounts hidden; opens via
          Cmd+K or the SearchTrigger button. */}
      <AdminSearchPalette
        areas={areas}
        sectionVisible={sectionVisible}
        onPick={(r) => { setArea(r.areaId); setSec(r.sectionId); }}
      />

      {/* ─── Main content ─── */}
      <main style={{
        gridArea: 'main',
        overflowY: 'auto',
        padding: '24px 32px 40px',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          {sec ? (
            <SectionContent
              sec={sec}
              club={club}
              isManager={isManager}
              isSuperAdmin={isSuperAdmin}
            />
          ) : (
            <DesktopEmptyState areaLabel={activeArea?.l} />
          )}
        </div>
      </main>
    </div>
  );
}

// v0.11.2 — Breadcrumb component. Two ancestor crumbs ("Admin"
// + the active area) link back; the current section is rendered
// as the title. When nothing is selected, only "Admin" shows
// and the row is still informative ("you're at the root").
function Breadcrumbs({ area, section, onHome, onArea }) {
  const crumbStyle = {
    fontFamily: '"Lora",serif',
    fontSize: 11,
    color: G.muted,
    cursor: 'pointer',
    textDecoration: 'none',
    letterSpacing: '0.04em',
  };
  const sepStyle = {
    fontFamily: '"Lora",serif',
    fontSize: 11,
    color: G.border,
    margin: '0 6px',
  };
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
        <span onClick={onHome} data-tap style={crumbStyle}>Admin</span>
        {area && (
          <>
            <span style={sepStyle}>›</span>
            <span onClick={onArea} data-tap style={crumbStyle}>{area.l}</span>
          </>
        )}
      </div>
      <p style={{
        fontFamily: '"Playfair Display",serif',
        fontSize: 18,
        fontWeight: 700,
        color: G.text,
        margin: 0,
        lineHeight: 1.15,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {section?.l || area?.l || 'Manage your club'}
      </p>
    </>
  );
}

// Friendly "pick something on the left" placeholder when no
// section is selected. Renders both when the admin first opens
// the panel (no area selected) and when an area is selected but
// no section yet.
function DesktopEmptyState({ areaLabel }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 360, textAlign: 'center', padding: '40px 24px',
    }}>
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.2" style={{ marginBottom: 16 }}>
        <path d="M3 7h18M3 12h18M3 17h18" />
        <path d="M6 4h0.01M6 9h0.01M6 14h0.01M6 19h0.01" />
      </svg>
      <h2 style={{
        fontFamily: '"Playfair Display",serif',
        fontStyle: 'italic',
        fontSize: 20,
        color: G.muted,
        margin: '0 0 8px',
      }}>
        {areaLabel ? `Pick a section under ${areaLabel}` : 'Pick a section from the sidebar'}
      </h2>
      <p style={{
        fontFamily: '"Lora",serif',
        fontSize: 13,
        color: G.muted,
        lineHeight: 1.6,
        margin: 0,
        maxWidth: 360,
      }}>
        The left sidebar lists every admin area you have access to.
        Click any section to open it here.
      </p>
    </div>
  );
}
