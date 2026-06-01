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
import SupportBellChip from '../../components/SupportBellChip.jsx';
import ContactSupportModal from '../../components/ContactSupportModal.jsx';
import AdminAIChatModal from '../../components/AdminAIChatModal.jsx';
import AdminAIBubble from '../../components/AdminAIBubble.jsx';
import AdminSearchPalette, { SearchTrigger } from '../../components/AdminSearchPalette.jsx';
import AdminWorkspaceSwitcher from '../../components/AdminWorkspaceSwitcher.jsx';
import AdminDashboard from '../../components/AdminDashboard.jsx';
import DashboardErrorBoundary from '../../components/DashboardErrorBoundary.jsx';
import Avatar from '../../components/Avatar.jsx';
import { useAdminPreference } from '../../hooks/useAdminPreference.js';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js';
import { VERSION, PLATFORM_NAME } from '../../lib/version.js';
import { SectionContent } from '../AdminPanel.jsx';

// Sidebar width + topbar height. v0.11.16 — bumped to accommodate
// the larger desktop-SaaS typography scale (section labels 15px,
// area headers 12px UPPER, breadcrumb title 22px). Section labels
// still ellipsis at 280px when a club's section name happens to be
// unusually long; that's expected modern admin UX.
const SIDEBAR_W_DESKTOP = 280;
const SIDEBAR_W_TABLET  = 220;
const TOPBAR_H  = 64;

export default function AdminLayoutDesktop({
  area, sec, setArea, setSec,
  areas, sectionVisible,
  member, club,
  isManager, isSuperAdmin,
  commsUnread,
  compact = false,
}) {
  const SIDEBAR_W = compact ? SIDEBAR_W_TABLET : SIDEBAR_W_DESKTOP;
  // v0.11.10 — Sidebar internal padding tunes down at tablet so
  // section labels don't crowd the chevron column.
  const sidePad = compact ? 12 : 18;
  const mainPad = compact ? '20px 22px 32px' : '24px 32px 40px';
  const { goTab, pop } = useNav();
  // v0.11.5 — palette open state. The palette also opens on Cmd+K
  // globally; the SearchTrigger button is a discoverability hint.
  const [paletteOpen, setPaletteOpen] = useState(false);
  // v0.13.8 — Contact Support modal state, triggered from sidebar
  // footer + topbar ? icon.
  const [supportOpen, setSupportOpen] = useState(false);
  // v0.14.2 — Admin AI chat modal state, triggered from new topbar
  // chat-bubble icon. Separate from Contact Support so the human
  // escape hatch is always available alongside the AI.
  const [aiOpen, setAiOpen] = useState(false);

  // v0.11.13 — Escape the iPhone-shaped `.phone-frame` shell on
  // desktop/tablet. The phone-frame is a mobile-PWA preview affordance
  // for the MEMBER app on a desktop browser; for ADMIN work the
  // sidebar + topbar + main grid needs the full viewport. We tag the
  // body with `admin-fullscreen` while this shell is mounted; index.css
  // turns off the phone-frame width/height/radius/shadow under that
  // class. Reverted automatically on unmount so leaving the admin
  // section (Back to MyClub) drops the member UI back inside the phone.
  useEffect(() => {
    document.body.classList.add('admin-fullscreen');
    return () => document.body.classList.remove('admin-fullscreen');
  }, []);

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

  // v0.11.9 — Keyboard shortcuts.
  //   /     — focus search palette
  //   g h   — go home (clear area + sec)
  //   g i   — Communications inbox
  //   g p   — People
  //   g s   — Club Settings
  //   g f   — Features (within Club Settings)
  //   g b   — Broadcasts
  //   g e   — Events
  // Auto-skipped when typing into an input.
  useKeyboardShortcuts({
    '/':   () => setPaletteOpen(true),
    'g h': () => { setArea(null); setSec(null); },
    'g i': () => { setArea('inbox'); setSec(null); },
    'g p': () => { setArea('people'); setSec(null); },
    'g s': () => { setArea('clubset'); setSec(null); },
    'g b': () => { setArea('comms'); setSec(null); },
    'g e': () => { setArea('events'); setSec(null); },
  });
  // v0.11.19 — Accordion sidebar. AT MOST ONE area group expanded at
  // a time. Click an area to open it (collapses whatever was open
  // before); click the open area again to close it (back to all-
  // collapsed). This replaces the v0.11.x array-of-collapsed-ids
  // model — that one was hard to reason about (was [] = all open or
  // all closed?), and made it easy for "muddy" intermediate states
  // to persist across reloads.
  //
  // Stored as a SINGLE area id string in `sidebar_open_area`, or
  // null = nothing open (the default). New key on purpose — the old
  // `sidebar_collapsed` rows are harmlessly orphaned, and no manager
  // notices because the new default (everything collapsed) was what
  // we wanted anyway.
  const [openArea, setOpenArea] = useAdminPreference(
    'sidebar_open_area',
    null,
  );
  const toggleAreaOpen = (areaId) => {
    setOpenArea(prev => prev === areaId ? null : areaId);
  };

  // v0.11.29 — Dashboard tile order + hidden set lifted up here so
  // the workspace switcher can snapshot / restore them alongside
  // sidebar state. AdminDashboard reads + writes via props.
  const [dashboardTileOrder, setDashboardTileOrder] = useAdminPreference(
    'dashboard_tile_order', null,
  );
  const [dashboardHidden, setDashboardHidden] = useAdminPreference(
    'dashboard_hidden_tiles', [],
  );

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
      position: 'relative',
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
        {/* Sidebar header — Grounds platform mark at top, then the
            club identity (eyebrow + title), then the v0.11.11
            workspace switcher chip. Visual hierarchy from top
            establishes "this is The Grounds platform; you're
            administering Clinton CC inside it." */}
        <div style={{
          padding: '14px 18px',
          borderBottom: `1px solid rgba(168,216,184,0.18)`,
          flexShrink: 0,
        }}>
          {/* v0.11.36 — Grounds platform mark. Small icon + wordmark
              row; muted brass tint so it doesn't compete with the
              club identity below. */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            marginBottom: 14,
            paddingBottom: 12,
            borderBottom: '1px solid rgba(168,216,184,0.08)',
          }}>
            <img
              src="/grounds-icon.png"
              alt=""
              style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0 }}
            />
            <span style={{
              fontFamily: '"Playfair Display",serif',
              fontSize: 13,
              fontWeight: 700,
              color: '#C4A040',
              letterSpacing: '0.04em',
            }}>
              The Grounds
            </span>
          </div>

          <p style={{
            fontFamily: '"Playfair Display",serif',
            fontSize: 11,
            color: '#A8D8B8',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            margin: '0 0 4px',
            fontWeight: 600,
          }}>
            {club?.name?.replace(/\s+Country\s+Club\s*$/i, '') || 'Club'} · Admin
          </p>
          <p style={{
            fontFamily: '"Playfair Display",serif',
            fontSize: 19,
            color: '#F2EDE0',
            margin: 0,
            fontWeight: 700,
            lineHeight: 1.15,
          }}>
            Manage your club
          </p>

          {/* v0.11.11 — Workspace switcher. Named bundles of
              collapsed-area state + last section. Applying a
              workspace restores both via onRestore — the existing
              collapsed + last_section preference hooks then own
              the live values. */}
          <AdminWorkspaceSwitcher
            expanded={openArea}
            lastSection={{ areaId: area, sectionId: sec }}
            dashboardLayout={{
              order: dashboardTileOrder,
              hidden: dashboardHidden,
            }}
            onRestore={({ expanded: nextExpanded, lastSection, dashboardLayout }) => {
              setOpenArea(nextExpanded ?? null);
              setArea(lastSection?.areaId || null);
              setSec(lastSection?.sectionId || null);
              // v0.11.29 — Apply workspace's dashboard snapshot if
              // present. Workspaces saved before v0.11.29 won't have
              // this field; leave the user's current dashboard prefs
              // alone in that case.
              if (dashboardLayout) {
                setDashboardTileOrder(dashboardLayout.order ?? null);
                setDashboardHidden(dashboardLayout.hidden ?? []);
              }
            }}
          />
        </div>

        {/* Sidebar tree */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {/* v0.11.28 — Dashboard / Home link. Always visible at the
              top of the sidebar; one click returns to the root
              state (no area + no section), which renders the
              AdminDashboard. Selected styling mirrors a section
              row when we ARE at the root. Not an accordion — no
              children, single tap. */}
          <div
            onClick={() => { setArea(null); setSec(null); }}
            data-tap
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 22px 10px 18px',
              cursor: 'pointer',
              fontFamily: '"Lora",serif',
              fontSize: 15,
              color: (!area && !sec) ? '#F2EDE0' : 'rgba(242,237,224,0.78)',
              background: (!area && !sec) ? 'rgba(155,122,30,0.22)' : 'transparent',
              borderLeft: `3px solid ${(!area && !sec) ? G.brass : 'transparent'}`,
              fontWeight: (!area && !sec) ? 600 : 400,
              marginBottom: 4,
              transition: 'background 0.12s, color 0.12s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
            <span>Dashboard</span>
          </div>

          {areas.map(a => {
            const isAreaCollapsed = openArea !== a.id;
            const visibleSections = a.sections.filter(sectionVisible);
            if (visibleSections.length === 0) return null;
            // v0.12.0 — Generalized unread aggregation. Any area's
            // sections can carry a per-(section_id) count in
            // commsUnread.counts; the area card aggregates whatever
            // its visible sections contribute. This is what lets the
            // Food Orders badge follow `inbox_food` over to the
            // Dining area card after the Phase 13 reorg, without
            // hardcoding "the Comms area is special."
            const areaUnread = visibleSections.reduce(
              (s, sec) => s + (commsUnread?.counts?.[sec.id] || 0),
              0,
            );
            return (
              <div key={a.id} style={{ marginBottom: 4 }}>
                {/* Area header — accordion toggle */}
                <div
                  onClick={() => toggleAreaOpen(a.id)}
                  data-tap
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 18px',
                    cursor: 'pointer',
                    fontFamily: '"Lora",serif',
                    fontSize: 12,
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
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 9,
                      letterSpacing: '0.04em',
                    }}>{areaUnread}</span>
                  )}
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="2"
                    style={{ transform: isAreaCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}
                  ><path d="M6 9l6 6 6-6" /></svg>
                </div>
                {/* Sections */}
                {!isAreaCollapsed && visibleSections.map(s => {
                  const isActive = s.id === sec;
                  // v0.12.0 — Per-section badge is now derived from
                  // commsUnread.counts directly, regardless of which
                  // area the section lives under. Sections without a
                  // tracked count silently render 0.
                  const subUnread = commsUnread?.counts?.[s.id] || 0;
                  return (
                    <div
                      key={s.id}
                      onClick={() => onPickSection(a.id, s.id)}
                      data-tap
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 22px 10px 30px',
                        cursor: 'pointer',
                        fontFamily: '"Lora",serif',
                        fontSize: 15,
                        color: isActive ? '#F2EDE0' : 'rgba(242,237,224,0.78)',
                        background: isActive ? 'rgba(155,122,30,0.22)' : 'transparent',
                        borderLeft: `3px solid ${isActive ? G.brass : 'transparent'}`,
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
                          fontSize: 11,
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
          {/* v0.11.36 — Identity row: avatar + name + "Signed in as"
              eyebrow. Replaces the text-only footer block from
              v0.11.16. The photo (or initial fallback) makes it
              instantly clear which admin account is logged in —
              important when a manager + super_admin share a shift. */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 10,
          }}>
            <Avatar
              photoUrl={member?.photo_url}
              name={member?.name || 'Staff'}
              size={36}
              bgColor={G.greenDk}
              fgColor="#A8D8B8"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: '"Lora",serif',
                fontSize: 9,
                color: '#A8D8B8',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                margin: 0,
              }}>
                Signed in as
              </p>
              <p style={{
                fontFamily: '"Playfair Display",serif',
                fontSize: 14,
                color: '#F2EDE0',
                margin: '1px 0 0',
                fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {member?.name || 'Staff'}
              </p>
            </div>
          </div>
          <div
            onClick={pop}
            data-tap
            style={{
              fontFamily: '"Lora",serif',
              fontSize: 13,
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
              marginTop: 12,
              display: 'flex', alignItems: 'center', gap: 7,
              fontFamily: '"Lora",serif',
              fontSize: 12,
              color: '#A8D8B8',
              cursor: 'pointer',
              opacity: 0.78,
              userSelect: 'none',
            }}
          >
            {theme?.mode === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
            <span>{theme?.mode === 'dark' ? 'Switch to light' : 'Switch to dark'}</span>
          </div>

          {/* v0.13.8 — Contact Support link. Opens the modal. Admin
              users only (super_admin / club_manager / club_admin).
              Members get the existing v0.10.14 surface on MyClub. */}
          <div
            onClick={() => setSupportOpen(true)}
            data-tap
            style={{
              marginTop: 8,
              padding: '6px 4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: '"Lora",serif',
              fontSize: 12,
              color: '#A8D8B8',
              opacity: 0.78,
              userSelect: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
            <span>Need help? Contact Support</span>
          </div>

          {/* v0.11.18 — Version + platform attribution. Sits at the
              very bottom of the sidebar so managers can read it off
              the screen to support during a phone call ("we're on
              0.11.18"). Mirrors the MyClub footer pattern; muted
              styling so it doesn't compete with primary nav. */}
          <div style={{
            marginTop: 14,
            paddingTop: 10,
            borderTop: `1px solid rgba(168,216,184,0.10)`,
            fontFamily: '"Lora",serif',
            fontSize: 10,
            color: 'rgba(168,216,184,0.55)',
            letterSpacing: '0.04em',
            userSelect: 'text',
          }}>
            {PLATFORM_NAME} · v{VERSION}
          </div>
        </div>
      </aside>

      {/* ─── Top bar ─── breadcrumbs (v0.11.2) + bell. The center
          slot in the top bar is reserved for the global search
          input landing in v0.11.5; for now it stays empty so the
          spacing doesn't shift when search shows up. */}
      <header style={{
        gridArea: 'topbar',
        background: G.bg,
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
        {/* v0.13.5 — support inbox unread chip. Renders only for
            super_admins with pending tickets; otherwise self-hides. */}
        <SupportBellChip />
        {/* v0.14.2 — GroundsLive Admin AI chat. Brass-accented chat
            bubble icon to distinguish from the support ? icon next
            to it. Click opens AdminAIChatModal. */}
        <div
          onClick={() => setAiOpen(true)}
          data-tap
          title="Ask GroundsLive AI"
          aria-label="Ask GroundsLive AI"
          style={{
            cursor: 'pointer',
            width: 36, height: 36,
            borderRadius: '50%',
            border: `1.5px solid rgba(212,175,108,0.5)`,
            background: 'rgba(212,175,108,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#D4AF6C" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
        {/* v0.13.8 — help icon. Opens ContactSupportModal. */}
        <div
          onClick={() => setSupportOpen(true)}
          data-tap
          title="Contact Support"
          aria-label="Contact Support"
          style={{
            cursor: 'pointer',
            width: 36, height: 36,
            borderRadius: '50%',
            border: '1.5px solid rgba(122,172,136,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A8D8B8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <BellChip />
      </header>

      {/* v0.11.5 — global search palette. v0.11.18 — open state now
          controlled by AdminLayoutDesktop so the SearchTrigger button
          actually opens the palette (previously it relied on the
          palette's internal Cmd+K listener, which the button click
          couldn't reach). Cmd+K still works — it routes through the
          shared onOpenChange callback. */}
      <AdminSearchPalette
        areas={areas}
        sectionVisible={sectionVisible}
        onPick={(r) => { setArea(r.areaId); setSec(r.sectionId); setPaletteOpen(false); }}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />

      {/* v0.13.8 — Contact Support modal. Hidden until supportOpen flips true. */}
      <ContactSupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />

      {/* v0.14.2 — Admin AI chat modal. Hidden until aiOpen flips true. */}
      <AdminAIChatModal open={aiOpen} onClose={() => setAiOpen(false)} />

      {/* v0.14.9 — Floating "Ask AI" bubble (bottom-right). Much more
          prominent than the topbar icon — that one stays as a
          secondary entry point for users who already know it's there. */}
      {!aiOpen && <AdminAIBubble onOpen={() => setAiOpen(true)} />}

      {/* ─── Main content ─── */}
      <main style={{
        gridArea: 'main',
        overflowY: 'auto',
        padding: mainPad,
        position: 'relative',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          {sec ? (
            <SectionContent
              sec={sec}
              club={club}
              isManager={isManager}
              isSuperAdmin={isSuperAdmin}
            />
          ) : activeArea ? (
            // Area picked, no section yet — keep the existing
            // "Pick a section under <area>" hint.
            <DesktopEmptyState areaLabel={activeArea?.l} />
          ) : (
            // v0.11.26 — Root state lands on the dashboard, wrapped
            // in a class-based ErrorBoundary so a render-time bug in
            // any tile can never blank the whole admin again. On
            // crash, the boundary logs to console (`Dashboard
            // crashed:` + component stack) and falls back to a
            // stripped-down empty state. The v0.11.22 black-screen
            // bug was almost certainly the admin_preferences upsert
            // 400 (fixed in v0.11.25 by migration 64 adding the
            // missing UNIQUE constraint) — this remount tests the
            // theory while keeping a safety net under it.
            <DashboardErrorBoundary
              fallback={<DesktopEmptyState areaLabel="" />}
            >
              {/* v0.11.27 — pass commsUnread DOWN so the dashboard's
                  Open Work tile reads from the single subscription
                  AdminPanel already owns. v0.11.29 — also pass the
                  lifted tile order + hidden state and their setters
                  so the workspace switcher can snapshot / restore. */}
              <AdminDashboard
                commsUnread={commsUnread}
                tileOrder={dashboardTileOrder}
                setTileOrder={setDashboardTileOrder}
                hidden={dashboardHidden}
                setHidden={setDashboardHidden}
              />
            </DashboardErrorBoundary>
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
    fontSize: 13,
    color: G.muted,
    cursor: 'pointer',
    textDecoration: 'none',
    letterSpacing: '0.04em',
  };
  const sepStyle = {
    fontFamily: '"Lora",serif',
    fontSize: 13,
    color: G.border,
    margin: '0 7px',
  };
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
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
        fontSize: 22,
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
      minHeight: 360, textAlign: 'center', padding: '48px 24px',
    }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.2" style={{ marginBottom: 18 }}>
        <path d="M3 7h18M3 12h18M3 17h18" />
        <path d="M6 4h0.01M6 9h0.01M6 14h0.01M6 19h0.01" />
      </svg>
      <h2 style={{
        fontFamily: '"Playfair Display",serif',
        fontStyle: 'italic',
        fontSize: 24,
        color: G.muted,
        margin: '0 0 10px',
      }}>
        {areaLabel ? `Pick a section under ${areaLabel}` : 'Pick a section from the sidebar'}
      </h2>
      <p style={{
        fontFamily: '"Lora",serif',
        fontSize: 15,
        color: G.muted,
        lineHeight: 1.6,
        margin: 0,
        maxWidth: 420,
      }}>
        The left sidebar lists every admin area you have access to.
        Click any section to open it here.
      </p>
    </div>
  );
}
