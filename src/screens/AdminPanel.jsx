import { useState, useEffect, useMemo, useRef } from 'react';
import { G, gCfg } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase, isConfigured } from '../lib/supabase.js';
import { useClubStatus, usePaceOfPlay, usePinPlacements, effectiveState, useDusk, useDawn } from '../hooks/useClubData.jsx';
import { DEFAULT_TIMEZONE } from '../lib/timezone.js';
import { useCommsUnread } from '../lib/commsUnread.js';
import { GreenWithPin } from './PinMap.jsx';
import {
  MenuCategoriesAdmin, MenuItemsAdmin, ProShopItemsAdmin, LessonProsAdmin, HoleSponsorsAdmin, SponsorBannersAdmin,
  ScheduleOverridesAdmin, NotificationsAdmin, FoodOrdersAdmin,
  EventRegistrationsAdmin, EventsAdmin, LessonRequestsAdmin, ClubSettingsAdmin,
  ClubhouseInboxAdmin, NewsAdminFull, HolesAdmin, MemberGuideAdmin, MemberPostsAdmin,
  SuperAdminsAdmin, AllClubsAdmin, FeaturesAdmin, ProvisionLogAdmin, GuestManagementAdmin,
  SupportAdmin,
  GuestRegistrationsFeed, FacilitiesAdmin,
} from './admin/sections.jsx';
// v0.14.3 — AI usage dashboard lives in its own file (avoids
// bloating the 6KLOC sections.jsx).
import AIUsageAdmin from './admin/AIUsageAdmin.jsx';
// v0.15.1 — Phase 16 unified People view (Path A: stable
// per-person fields in people table; per-club relations stay
// in members/guests/user_roles).
import AllPeopleAdmin from './admin/AllPeopleAdmin.jsx';
import DepartmentsAdmin from './admin/DepartmentsAdmin.jsx';
import ClubhouseRoutingAdmin from './admin/ClubhouseRoutingAdmin.jsx';
// v0.14.9 — Floating Admin AI bubble for the MOBILE shell. Desktop
// gets its own mount inside AdminLayoutDesktop.
import AdminAIBubble from '../components/AdminAIBubble.jsx';
import AdminAIChatModal from '../components/AdminAIChatModal.jsx';
import { PERMISSION_KEYS, PERMISSION_GROUPS } from '../lib/permissions.js';
import Badge from '../components/Badge.jsx';
import * as LucideIcons from 'lucide-react';
import { useViewport } from '../hooks/useViewport.js';
import { useAdminPreference } from '../hooks/useAdminPreference.js';
import AdminLayoutDesktop from './admin/AdminLayoutDesktop.jsx';

// Two-level admin hub: area cards at the top, each opens a sub-hub of
// its sections. Section IDs are unique across the whole tree so the
// section-content router can stay flat.
//
// v0.7.13 reorg (per Marc-approved UI audit recommendations):
//   · Order: Communications → Events → Golf Course → Pro Shop →
//     Dining → People → Club Settings → Platform. Marketing /
//     content-heavy stuff up top, ops in the middle, setup at the
//     bottom, super-admin last. Matches the daily-touch frequency
//     for the average club manager.
//   · "Course" renamed to "Golf Course" (less ambiguous when a
//     manager is searching for "course" vs "discourse" vs etc.).
//   · Hole Sponsors moved Course → Comms (consolidates sponsorship
//     surfaces alongside Sponsor Banners).
//   · Clubhouse Inbox moved People → Comms (it's a staff↔member
//     comms surface, conceptually belongs with News/Notifications).
//   · Moderate Posts (renamed from "Member Posts") moved Comms →
//     People (the posts are FROM members; moderation is about
//     people, not staff-generated content).
//   · Club Settings moved People → new "Club Settings" area
//     (originally shipped as "Club Setup" in v0.7.13, renamed to
//     "Club Settings" in v0.9.0 — see CHANGELOG).
//   · Features (was its own 1-section area) folded into Club
//     Settings alongside Branding & Contact. Two-section area kills
//     the wasted-click problem from the v0.7.0 single-section design.
//   · Section relabels per audit: Schedule Overrides → Date
//     Overrides; Pace of Play → Pace; Pin Positions → Daily Pins;
//     Holes → Hole Details; Notifications → Push Broadcasts;
//     Club Guide → Member Guide; Lesson Requests → Lesson Queue.
//   · Section IDs preserved everywhere (routing is keyed by id, so
//     nothing breaks; only labels and parent areas change).
const AREAS = [
  // ──────────────────────────────────────────────────────────────────
  // Communications (v0.9.4) — unified incoming triage center. Sits
  // at the top of the area grid because it's the surface staff hit
  // first thing in the morning: what's waiting from members. Each
  // sub-queue has its own permKey (so a bartender only sees food
  // orders, the pro only sees lesson requests, the manager sees
  // everything). Unread badges on the parent card and on each
  // sub-queue header per Marc's spec.
  //
  // Sub-queues are scaffolded here and routed to existing components
  // in v0.9.4. v0.9.5 + v0.9.6 polish each in turn. v0.9.7 removes
  // the duplicates from the old locations (Food Orders from Dining,
  // Lesson Queue from Pro Shop) so this stays the single source of
  // truth.
  //
  // Demo Requests is deferred until the landing page contact form
  // exists (no data source yet — see CHANGELOG v0.9.4).
  // ──────────────────────────────────────────────────────────────────
  {
    id: 'inbox',
    l: 'Communications',
    d: 'Inbound: orders, lessons, inquiries, guests, messages, RSVPs',
    icon: IconBell,
    sections: [
      // v0.12.0 (Phase 13): 'inbox_food' moved → Dining area. Food
      // orders are an operational dining workflow, not an inbound
      // communications surface. The section ID stays `inbox_food`
      // for backward compatibility with useCommsUnread, workspaces,
      // dashboard tiles, and any saved layouts that reference it.
      { id: 'inbox_lessons',    permKey: 'can_manage_lessons',       l: 'Lesson Requests',     d: 'Lesson + inquiry requests',               icon: IconList },
      { id: 'inbox_proshop',    permKey: 'can_manage_lessons',       l: 'Pro Shop Inquiries',  d: 'General pro shop questions',              icon: IconBag },
      { id: 'inbox_guests',     permKey: 'can_manage_members',       l: 'Guest Registrations', d: 'Live feed as guests register',            icon: IconPeople },
      { id: 'inbox_clubhouse',  permKey: 'can_view_clubhouse_inbox', l: 'Clubhouse Messages',  d: 'Member messages grouped by topic',        icon: IconBell },
      { id: 'inbox_rsvps',      permKey: 'can_manage_events',        l: 'Event RSVPs',         d: 'Registrations + waitlist changes',        icon: IconCalendar },
    ],
  },
  // Broadcasts — outgoing/content surfaces. Renamed from
  // "Communications" in v0.9.4 because the new top-level
  // Communications area owns inbound triage. Old contents minus
  // Clubhouse Inbox (which is now Clubhouse Messages in Comms).
  {
    id: 'comms',
    l: 'Broadcasts',
    d: 'News, push, sponsors',
    icon: IconNews,
    sections: [
      { id: 'news',            permKey: 'can_post_news',            l: 'News',             d: 'List, edit, publish announcements',         icon: IconNews      },
      { id: 'notifs',          permKey: 'can_send_notifications',   l: 'Push Broadcasts',  d: 'Send push alerts to all members',           icon: IconBell      },
      { id: 'banners',         permKey: 'can_manage_sponsors',      l: 'Sponsor Banners',  d: 'Rotating sponsor banners',                  icon: IconBanner    },
      { id: 'holespons',       permKey: 'can_manage_sponsors',      l: 'Hole Sponsors',    d: 'Local sponsor per hole',                    icon: IconHandshake },
      // v0.9.4: 'clubhouseinbox' moved → Communications area as
      // 'inbox_clubhouse' (Clubhouse Messages sub-queue). Single
      // source of truth for all member→staff messages.
      // v0.9.1: 'clubguide' moved → Club Settings.
    ],
  },
  {
    id: 'events',
    l: 'Events',
    // v0.9.7: 'Event RSVPs' section removed — now the inbox_rsvps
    // sub-queue under Communications (single source of truth).
    d: 'Calendar + cancellations',
    icon: IconCalendar,
    sections: [
      { id: 'eventsadmin', permKey: 'can_manage_events', l: 'Events',      d: 'Add, edit, cancel events',     icon: IconCalendar },
    ],
  },
  {
    id: 'course',
    l: 'Golf Course',
    d: 'Status, pace, pins, hole details',
    icon: IconFlag,
    sections: [
      // v0.9.2: 'status' (daily operational toggle) stays here +
      // surfaces as a quick-access card on the admin home so the
      // morning opener can flip pills in 2 taps. Renamed Club Status
      // → Daily Status to reflect that hours config has moved.
      { id: 'status',    permKey: 'can_edit_course_status', l: 'Daily Status',    d: "Today's open/limited/closed + staff note",  icon: IconStatus   },
      { id: 'pace',      permKey: 'can_edit_course_status', l: 'Pace',            d: "Set today's pace indicator",                icon: IconClock    },
      { id: 'pins',      permKey: 'can_edit_pins',          l: 'Daily Pins',      d: "Place today's pin on each green",           icon: IconFlag     },
      { id: 'holes',     permKey: 'can_edit_pins',          l: 'Hole Details',    d: 'Par, yardage, names + descriptions',        icon: IconList     },
      // v0.9.2: 'overrides' moved → Club Settings (configuration, not
      // daily ops).
    ],
  },
  {
    id: 'proshop',
    l: 'Pro Shop',
    // v0.9.7: 'Lesson Queue' removed — split into Communications
    // inbox_lessons (lesson requests) + inbox_proshop (general
    // inquiries) for cleaner triage.
    d: 'Catalog + lesson pros',
    icon: IconBag,
    sections: [
      { id: 'proitems',   permKey: 'can_manage_proshop',  l: 'Pro Shop Items', d: 'Catalog of items for sale', icon: IconBag    },
      { id: 'lessonpros', permKey: 'can_manage_proshop',  l: 'Lesson Pros',    d: 'Roster shown when booking', icon: IconPeople },
    ],
  },
  {
    id: 'dining',
    l: 'Dining',
    // v0.12.0 (Phase 13): Food Orders returned here from the
    // Communications inbox, where it had lived since v0.9.4. Rationale:
    // the kitchen's morning sweep happens in a single dining-shaped
    // workflow (menu prep + open orders + ticket fulfillment), not by
    // bouncing between Communications and Dining. The section ID
    // stays `inbox_food` for backward compatibility with
    // useCommsUnread, workspace snapshots, the OpenWorkTile dashboard
    // tile, and any saved admin layouts.
    d: 'Orders + menu + items',
    icon: IconUtensils,
    sections: [
      { id: 'inbox_food', permKey: 'can_view_orders',  l: 'Food Orders',     d: 'Open orders queue (live)',                  icon: IconList },
      { id: 'menucats',   permKey: 'can_manage_menu',  l: 'Menu Categories', d: 'Lunch, Dinner, Bar — sort + active flags',  icon: IconList },
      { id: 'menuitems',  permKey: 'can_manage_menu',  l: 'Menu Items',      d: 'Add, edit, hide individual dishes',         icon: IconUtensils },
    ],
  },
  {
    id: 'people',
    l: 'People',
    d: 'Directory + member ops + guest settings + staff roles',
    icon: IconPeople,
    sections: [
      // v0.9.18: unified browse — every person at the club in one
      // list with role + status badges. Orphan signups (pending_auth
      // guests) surface here so nobody falls through the cracks.
      // v0.9.20: labels switched to action-verb pattern so each card
      // signals its purpose at a glance (browse vs. manage vs. settings).
      // v0.15.4 — Directory hidden; People (unified) is its full
      // replacement. Leaving the entry commented out here so the
      // old PeopleAdmin component code stays linked from
      // SectionContent without becoming orphaned — to fully retire
      // Directory, drop both this commented entry and the
      // PeopleAdmin import.
      // { id: 'people_all',  permKey: 'can_manage_members', l: 'Directory',         d: 'Find anyone: members, guests, staff',                  icon: IconPeople },
      { id: 'people_unified', permKey: 'can_manage_members', l: 'People',         d: 'Members, guests, staff in one view',                   icon: IconPeople },
      // v0.15.6 — Manage Members section retired. The People view now
      // owns all member CRUD (add, edit, CSV import) plus the same
      // workflows for guests and staff. No more dual UIs.
      { id: 'memberposts', permKey: 'can_manage_members', l: 'Moderate Posts',    d: 'Hide / delete bulletin + partner posts',               icon: IconList   },
      // v0.10.0 (Phase 10) — badges. Preview-only at first patch so
      // Marc can react to the shield visual; CRUD + assignment land
      // in this same section as the patch series continues.
      { id: 'badges',      permKey: 'can_manage_members', l: 'Badges',            d: 'Create club badges, assign to members',                icon: IconShield },
      // v0.8.4: guest management. Section renders an "off" state when
      // the guest_registration flag is off so the entry is still
      // discoverable; flipping the flag in Club Settings activates it.
      // v0.9.20: renamed to clarify this is settings + QR, not the
      // guest list (which now lives in the Directory card above).
      { id: 'guests',      permKey: 'can_manage_members', l: 'Guest Settings & QR', d: 'Access rules, expiration, clubhouse QR code',        icon: IconPeople, managerOnly: true },
      // v0.15.13 — Phase 17 (departments). Named departments per club
      // (Dining, Pro Shop, Course, Front Desk by default). Staff assign
      // to one or more; clubhouse pushes route via the topic→department
      // map under Club Settings. Manager-only.
      { id: 'departments', permKey: 'can_manage_staff',   l: 'Departments',       d: 'Name the staff groups that receive routed notifications', icon: IconShield, managerOnly: true },
      { id: 'staff',       permKey: 'can_manage_staff',   l: 'Manage Staff',      d: 'Roles + permissions (admin / manager / super)',        icon: IconShield, managerOnly: true },
    ],
  },
  // Club Settings — manager-only configuration. Replaces the v0.7.0
  // standalone "Features" area (which had the wasted-click problem
  // of being a single-section area). Renamed from "Club Setup" →
  // "Club Settings" in v0.9.0; the inner "Club Settings" section
  // (now "Branding & Contact") was renamed to avoid duplicate names
  // in the navigation breadcrumb. Subscription will land here when
  // we ship a read-only tier viewer.
  {
    id: 'clubsetup',
    l: 'Club Settings',
    d: 'Branding, hours, features, guide',
    icon: IconCog,
    sections: [
      { id: 'clubsettings',                              l: 'Branding & Contact', d: 'Logo, colors, contact, gating',                 icon: IconCog,      managerOnly: true },
      // v0.9.15: Facilities catalog. Renames + reorder + add/remove
      // facilities. Display names everywhere (pills, hours, overrides)
      // resolve from this list.
      { id: 'facilities',    permKey: 'can_edit_course_status', l: 'Facilities',        d: 'Rename, reorder, add/remove facilities',                 icon: IconCog,      managerOnly: true },
      { id: 'features',                                  l: 'Feature Toggles',    d: 'Member-facing features on/off',                 icon: IconCog,      managerOnly: true },
      // v0.15.13 — Phase 17 (departments). Each clubhouse topic routes
      // to one or more departments; staff in those depts get the push.
      // Lives under Club Settings because it's a per-club config decision,
      // not a per-person decision (those live under People).
      { id: 'clubhouseRouting',                          l: 'Clubhouse Topic Routing', d: 'Which departments get notified per topic',  icon: IconBell,    managerOnly: true },
      // v0.9.2: Facility configuration moved here from Golf Course.
      // Weekly hours / dawn / dusk / members_only / one-off date
      // overrides are setup decisions a manager makes once, not
      // operational toggles staff flip daily. Daily ops stays as
      // Daily Status in Golf Course (with a home-screen quick-access).
      { id: 'facilityhours', permKey: 'can_edit_course_status', l: 'Facility Hours',    d: 'Weekly base hours per facility (dawn/dusk, member-only)', icon: IconClock,    managerOnly: true },
      { id: 'overrides',     permKey: 'can_edit_course_status', l: 'Date Overrides',    d: 'One-off date closures / tournament hours',                icon: IconCalendar, managerOnly: true },
      // v0.9.1: Member Guide moved here from Communications. Pages are
      // configuration of how the club presents itself to new members,
      // not a comms surface. Reuses permKey 'can_post_news' (same role
      // that maintains other documentation surfaces).
      { id: 'clubguide',    permKey: 'can_post_news',  l: 'Member Guide',       d: 'Onboarding pages members read on first run',    icon: IconList,     managerOnly: true },
      // Future: { id: 'subscription', l: 'Subscription', d: 'Tier + active features summary', icon: IconList, managerOnly: true },
    ],
  },
  // Super-admin only — platform-wide controls
  {
    id: 'platform',
    l: 'Platform',
    d: 'Super admins + all clubs',
    icon: IconPlatform,
    superOnly: true,
    sections: [
      { id: 'superadmins',   l: 'Super Admins',   d: 'Promote / demote platform admins',  icon: IconShield  },
      { id: 'allclubs',      l: 'All Clubs',      d: 'Manage every club on the platform', icon: IconFlag    },
      // v0.7.7: audit log of every Cloudflare provision attempt.
      { id: 'provisionlog',  l: 'Provision Log',  d: 'Cloudflare DNS automation history', icon: IconList    },
      // v0.13.1: support inbox + team management (Phase 14).
      { id: 'support',       l: 'Support',        d: 'Support inbox + team destinations',  icon: IconList    },
      // v0.14.3: GroundsLive AI usage dashboard (Phase 15).
      { id: 'aiusage',       l: 'AI Usage',       d: 'GroundsLive AI cost + usage by club', icon: IconList    },
    ],
  },
];

// Flat lookup for the section content router
const ALL_SECTIONS = AREAS.flatMap(a => a.sections.map(s => ({ ...s, areaId: a.id })));

// v0.11.1 — SectionContent extracted as a standalone component so
// both AdminLayoutMobile (the existing Level-3 in AdminPanel) and
// AdminLayoutDesktop (the new sidebar-driven shell) can render the
// same section bodies without duplicating the long if-chain. The
// per-section permission gates stay inline here as defense in depth
// even though the sidebar / area cards already filter by them.
export function SectionContent({ sec, club, isManager, isSuperAdmin }) {
  return (
    <>
      {sec === 'status'         && <DailyStatusAdmin club={club} />}
      {sec === 'facilityhours'  && isManager && <FacilityHoursAdmin />}
      {sec === 'overrides'      && <ScheduleOverridesAdmin />}
      {sec === 'pace'           && <PaceAdmin club={club} />}
      {sec === 'pins'           && <PinsAdmin club={club} />}
      {sec === 'holes'          && <HolesAdmin />}
      {sec === 'holespons'      && <HoleSponsorsAdmin />}
      {sec === 'menucats'       && <MenuCategoriesAdmin />}
      {sec === 'menuitems'      && <MenuItemsAdmin />}
      {sec === 'eventsadmin'    && <EventsAdmin />}
      {sec === 'news'           && <NewsAdminFull />}
      {sec === 'notifs'         && <NotificationsAdmin />}
      {sec === 'banners'        && <SponsorBannersAdmin />}
      {sec === 'memberposts'    && <MemberPostsAdmin />}
      {sec === 'clubguide'      && <MemberGuideAdmin />}
      {sec === 'proitems'       && <ProShopItemsAdmin />}
      {sec === 'lessonpros'     && <LessonProsAdmin />}
      {sec === 'people_all'     && <PeopleAdmin club={club} />}
      {sec === 'people_unified' && <AllPeopleAdmin />}
      {sec === 'departments'    && isManager && <DepartmentsAdmin club={club} />}
      {sec === 'badges'         && <BadgesAdmin club={club} />}
      {sec === 'staff'          && isManager && <StaffAdmin club={club} />}
      {sec === 'clubhouseinbox' && <ClubhouseInboxAdmin />}
      {sec === 'inbox_food'      && <FoodOrdersAdmin />}
      {sec === 'inbox_lessons'   && <LessonRequestsAdmin mode="lessons" />}
      {sec === 'inbox_proshop'   && <LessonRequestsAdmin mode="inquiries" />}
      {sec === 'inbox_guests'    && <GuestRegistrationsFeed />}
      {sec === 'inbox_clubhouse' && <ClubhouseInboxAdmin />}
      {sec === 'inbox_rsvps'     && <EventRegistrationsAdmin mode="flat" />}
      {sec === 'clubsettings'   && isManager && <ClubSettingsAdmin />}
      {sec === 'facilities'     && isManager && <FacilitiesAdmin />}
      {sec === 'features'       && isManager && <FeaturesAdmin />}
      {sec === 'clubhouseRouting' && isManager && <ClubhouseRoutingAdmin club={club} />}
      {sec === 'guests'         && isManager && <GuestManagementAdmin />}
      {sec === 'superadmins'    && isSuperAdmin && <SuperAdminsAdmin />}
      {sec === 'allclubs'       && isSuperAdmin && <AllClubsAdmin />}
      {sec === 'provisionlog'   && isSuperAdmin && <ProvisionLogAdmin />}
      {sec === 'aiusage'        && isSuperAdmin && <AIUsageAdmin />}
      {sec === 'support'        && isSuperAdmin && <SupportAdmin />}
    </>
  );
}

// v0.11.1 — AREAS shape exported so the desktop sidebar (and any
// future shell variant) can render the tree without reaching into
// AdminPanel's render closure. The mobile drill-down inside
// AdminPanel still uses the same constant directly.
export { AREAS };

export default function AdminPanel() {
  const { club, member, isAdmin, isSuperAdmin, isManager, hasPerm } = useAuth();
  // v0.11.0 (Phase 12) — viewport detection wired but not yet
  // differentiated. Every viewport currently renders the mobile-
  // first AdminPanel UI we shipped in v0.7+. v0.11.1 introduces
  // an AdminLayoutDesktop shell (persistent left sidebar + top
  // bar + main content) which mounts only when isDesktop is true.
  // Reading the hook here keeps the dependency live (so future
  // dev tools / debug overlays can already inspect viewport
  // state) and documents the v0.11.x intent at the call site.
  // v0.11.10 — Tablet polish. AdminLayoutDesktop mounts at tablet
  // too (≥ 768 px) with a slimmer 200px sidebar, since iPad / split-
  // screen sessions benefit far more from sidebar nav than from
  // re-triggering the mobile drill-down inside a 1024px viewport.
  // Pure mobile phones (<768) still get the drill-down.
  const { isDesktop, isTabletUp, isTablet } = useViewport();
  // v0.11.7 — Last-section persistence. On desktop the manager
  // usually picks up where they left off; remembering area+sec
  // saves a click each session. Mobile drill-down resets on
  // navigation because the back stack is the natural place keeper.
  const [lastSection, setLastSection] = useAdminPreference(
    'last_section',
    { areaId: null, sectionId: null },
  );
  const [area, setArea] = useState(() => (isDesktop ? lastSection?.areaId : null) || null);
  const [sec, setSec] = useState(() => (isDesktop ? lastSection?.sectionId : null) || null);
  // v0.14.9 — AI modal state for the mobile shell. Desktop's AI
  // state lives inside AdminLayoutDesktop.
  const [aiOpen, setAiOpen] = useState(false);

  // v0.15.5 — Listen for admin-nav events. Section bodies can fire
  // these to jump elsewhere in the admin without prop drilling. The
  // desktop shell also subscribes; one of the two listeners wins
  // depending on viewport. Idempotent — both calling setArea/setSec
  // with the same value is a no-op after the first.
  useEffect(() => {
    const onNav = (e) => {
      const { area: a, section: s } = e.detail || {};
      if (a !== undefined) setArea(a);
      if (s !== undefined) setSec(s);
    };
    window.addEventListener('admin-nav', onNav);
    return () => window.removeEventListener('admin-nav', onNav);
  }, []);
  // Persist whenever desktop navigation lands on a section.
  useEffect(() => {
    if (!isDesktop) return;
    setLastSection({ areaId: area, sectionId: sec });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop, area, sec]);
  const [query, setQuery] = useState('');   // admin hub search
  const activeArea    = AREAS.find(a => a.id === area);
  const activeSection = ALL_SECTIONS.find(s => s.id === sec);

  // v0.9.4: Communications-area unread counts. Hook is club-scoped
  // and self-subscribes via realtime so badges stay current without
  // any explicit refresh. Used for the area-card aggregate badge on
  // the main hub AND per-sub-queue badges inside the Comms sub-hub.
  const commsUnread = useCommsUnread(club?.id);

  // Visibility filter — a section is visible if:
  //   - not superOnly (or user is super_admin)
  //   - not managerOnly (or user is manager+)
  //   - user has the section's permKey (manager+ has all perms implicitly)
  const sectionVisible = (s) =>
    (!s.superOnly   || isSuperAdmin) &&
    (!s.managerOnly || isManager)    &&
    (!s.permKey     || hasPerm(s.permKey));

  // An area is visible if it's not super-only (or user is super) AND has any
  // visible sections. Platform area is super-only entirely.
  const areaVisible = (a) =>
    (!a.superOnly || isSuperAdmin) && a.sections.some(sectionVisible);

  if (!isAdmin) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
        <BackHeader title="Staff Admin" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
          <h2 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 22, color: G.muted, margin: '0 0 8px' }}>Staff access only</h2>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.muted, lineHeight: 1.6 }}>Contact the pro shop if you need administrator access.</p>
        </div>
      </div>
    );
  }

  // v0.11.1 — Desktop shell. v0.11.10 expands the mount to tablet
  // too, with a slimmer sidebar so iPad / split-screen sessions
  // get the sidebar pattern instead of re-triggering the mobile
  // drill-down inside a 1024px viewport. Pure phones (<768) still
  // get the mobile shell below.
  if (isTabletUp) {
    return (
      <AdminLayoutDesktop
        area={area}
        sec={sec}
        setArea={setArea}
        setSec={setSec}
        areas={AREAS.filter(areaVisible)}
        sectionVisible={sectionVisible}
        member={member}
        club={club}
        isManager={isManager}
        isSuperAdmin={isSuperAdmin}
        commsUnread={commsUnread}
        compact={isTablet}
      />
    );
  }

  // Level 3 — section content view, back returns to its area sub-hub
  if (activeSection) {
    return (
      <>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
          <BackHeader
            title={activeSection.l}
            onBack={() => setSec(null)}
            right={<span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brassLt }}>{member?.name || 'Staff'}</span>}
          />
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 28px' }}>
            {/* v0.11.1 — section if-chain moved into the shared
                SectionContent component at the top of this file so
                the mobile + desktop layouts render identical
                section bodies without duplication. */}
            <SectionContent sec={sec} club={club} isManager={isManager} isSuperAdmin={isSuperAdmin} />
          </div>
        </div>
        {/* v0.14.9 — floating AI on mobile admin */}
        {!aiOpen && <AdminAIBubble onOpen={() => setAiOpen(true)} />}
        <AdminAIChatModal open={aiOpen} onClose={() => setAiOpen(false)} />
      </>
    );
  }

  // Level 2 — area sub-hub showing that area's sections
  if (activeArea) {
    const sectionsToShow = activeArea.sections.filter(sectionVisible);
    // v0.9.4: when this is the Communications area, surface per-
    // sub-queue badges from the unread hook. Tapping a sub-queue
    // also marks it viewed (clears the badge) before navigating.
    const isCommsArea = activeArea.id === 'inbox';
    const badgeOf = isCommsArea ? (id) => commsUnread.counts[id] || 0 : undefined;
    const handleSelect = (id) => {
      if (isCommsArea) commsUnread.markViewed(id);
      setSec(id);
    };
    return (
      <>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
          <BackHeader
            title={activeArea.l}
            onBack={() => setArea(null)}
            right={<span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brassLt }}>{member?.name || 'Staff'}</span>}
          />
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 18px 28px' }}>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 16px', textAlign: 'center' }}>
              {activeArea.d}
            </p>
            <CardGrid items={sectionsToShow} onSelect={handleSelect} badgeOf={badgeOf} />
          </div>
        </div>
        {!aiOpen && <AdminAIBubble onOpen={() => setAiOpen(true)} />}
        <AdminAIChatModal open={aiOpen} onClose={() => setAiOpen(false)} />
      </>
    );
  }

  // Level 1 — main hub with 6 area cards
  return (
    <>
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Staff Admin" right={<span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brassLt }}>{member?.name || 'Staff'}</span>} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 28px' }}>
        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search admin settings…"
            style={{ width: '100%', padding: '10px 14px 10px 36px', border: `1px solid ${G.border}`, borderRadius: 6, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' }}
          />
          {query && (
            <div onClick={() => setQuery('')} data-tap style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', padding: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </div>
          )}
        </div>

        {!query && (
          <>
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 14px', textAlign: 'center' }}>
              Welcome back{member?.name ? `, ${member.name.split(' ')[0]}` : ''}. Choose an area to manage.
            </p>
            {/* v0.9.2: Daily Status quick-access for the morning opener.
                Shows live state per facility + 1-tap into the form. Only
                renders for users with can_edit_course_status. */}
            {hasPerm('can_edit_course_status') && (
              <DailyStatusQuickAccess onOpen={() => setSec('status')} />
            )}
            <CardGrid
              items={AREAS.filter(areaVisible)}
              onSelect={setArea}
              /* v0.9.4: Communications area card shows aggregate
                 unread badge — sum of all sub-queues the user can
                 see. Other area cards have no badge. */
              badgeOf={(id) => id === 'inbox' ? commsUnread.total : 0}
            />
            {AREAS.filter(areaVisible).length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, margin: 0 }}>
                  You don't have any admin permissions yet. Ask your club manager to grant access.
                </p>
              </div>
            )}
          </>
        )}

        {query && (
          <SearchResults
            query={query}
            sectionVisible={sectionVisible}
            onSelect={(s) => { setQuery(''); setSec(s.id); }}
          />
        )}
      </div>
    </div>
    {/* v0.14.9 — floating Admin AI bubble on mobile Level-1 hub */}
    {!aiOpen && <AdminAIBubble onOpen={() => setAiOpen(true)} />}
    <AdminAIChatModal open={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}

// Flat search across area + section labels/descriptions. Jumps straight
// to the matching section, skipping the area sub-hub.
function SearchResults({ query, sectionVisible, onSelect }) {
  const q = query.toLowerCase().trim();
  const matches = AREAS.flatMap(a =>
    a.sections
      .filter(sectionVisible)
      .filter(s =>
        s.l.toLowerCase().includes(q) ||
        (s.d || '').toLowerCase().includes(q) ||
        a.l.toLowerCase().includes(q)
      )
      .map(s => ({ ...s, areaLabel: a.l }))
  );

  if (matches.length === 0) {
    return (
      <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted, padding: '40px 16px', textAlign: 'center', margin: 0 }}>
        Nothing matches "{query}".
      </p>
    );
  }

  return (
    <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
      {matches.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={s.id} onClick={() => onSelect(s)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 12, cursor: 'pointer' }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon color={G.brassLt} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text, margin: 0 }}>{s.l}</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>{s.areaLabel} · {s.d}</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </div>
        );
      })}
    </div>
  );
}

// Shared 2-column card grid used by both hub levels
// v0.9.4: `badgeOf` is an optional (id) => number that, when > 0,
// renders a numeric unread badge in the card's top-right. Used by the
// Communications area + its sub-queues; transparent to every other
// area that doesn't pass the prop.
function CardGrid({ items, onSelect, badgeOf }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {items.map(s => {
        const Icon = s.icon;
        const badge = badgeOf ? badgeOf(s.id) : 0;
        return (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            data-tap
            style={{
              padding: '16px 14px 14px',
              background: G.card,
              border: `1px solid ${G.border}`,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 8,
              minHeight: 124,
              position: 'relative',
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 6, background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon color={G.brassLt} />
            </div>
            <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: '4px 0 0', lineHeight: 1.1 }}>{s.l}</h3>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, lineHeight: 1.4, margin: 0 }}>{s.d}</p>
            {badge > 0 && (
              <div style={{
                position: 'absolute',
                top: 10, right: 10,
                minWidth: 22, height: 22,
                padding: '0 6px',
                borderRadius: 11,
                background: G.clsDot,
                color: '#F2EDE0',
                fontFamily: '"Lora",serif', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              }} aria-label={`${badge} new`}>
                {badge > 99 ? '99+' : badge}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Hub card icons ────────────────────────────────────────────────────────
function IconStatus({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" fill={color} stroke="none" />
    </svg>
  );
}
function IconNews({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h13v14H4z" />
      <path d="M17 8h3v9a2 2 0 01-2 2h-1" />
      <path d="M7 9h7M7 12h7M7 15h4" />
    </svg>
  );
}
function IconClock({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconFlag({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21V4" />
      <path d="M6 4h11l-3 4 3 4H6" fill={color} fillOpacity="0.25" />
    </svg>
  );
}
function IconPeople({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="3" />
      <path d="M3 19c0-3 3-5 6-5s6 2 6 5" />
      <circle cx="17" cy="8" r="2.5" />
      <path d="M15 14c2.5 0 5 1.5 5 4" />
    </svg>
  );
}
function IconShield({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 4.5-3.5 8.5-8 9-4.5-.5-8-4.5-8-9V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function IconCalendar({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="1.5" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}
function IconBell({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9a6 6 0 0112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
      <path d="M10 21h4" />
    </svg>
  );
}
function IconList({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
function IconBag({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14l-1 12H6L5 8z" />
      <path d="M9 8a3 3 0 016 0" />
    </svg>
  );
}
function IconHandshake({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l4-4 5 5 4-4 5 5" />
      <path d="M12 13l2 2-3 3-2-2" />
    </svg>
  );
}
function IconBanner({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v8L12 16 4 12z" />
      <path d="M12 16v6" />
    </svg>
  );
}
function IconUtensils({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2v8a2 2 0 002 2v10M10 2v6a2 2 0 01-2 2" />
      <path d="M16 2c-2 0-3 2-3 5s1 5 3 5v10" />
    </svg>
  );
}
function IconPlatform({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </svg>
  );
}
function IconCog({ color = '#fff' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>
    </svg>
  );
}

// v0.9.8: re-render every 60 seconds so time-driven open/closed
// transitions (dawn, dusk, scheduled open/close) update without a
// manual refresh. Mirrors the pattern member-facing StatusPill uses.
function useMinuteTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
}

// ─── Daily Status quick-access (admin home banner) ─────────────────────────
// v0.9.2: prominent at-a-glance card on the admin home for users with
// can_edit_course_status. Shows current state per facility + 1-tap into
// the Daily Status form (the morning opener's most-frequent action).
// v0.9.8: uses effectiveState() + 60s tick so banner auto-flips when
// hours cross dawn/dusk/scheduled time. Previously displayed the raw
// DB state field, which stays "open" overnight even after dusk closes
// the facility.
function DailyStatusQuickAccess({ onOpen }) {
  const { data: pillsAll, loading } = useClubStatus();
  const { club } = useAuth();
  const dusk = useDusk();
  const dawn = useDawn();
  useMinuteTick();
  // v0.9.15: quick-access banner mirrors what members see — only
  // active facilities. Inactive ones surface in DailyStatusAdmin
  // with their OFF tag.
  const pills = (pillsAll || []).filter(p => p.active !== false);
  if (loading || !pills?.length) return null;
  const tz = club?.timezone || DEFAULT_TIMEZONE;
  const sun = { dusk, dawn };
  return (
    <div onClick={onOpen} data-tap style={{ padding: '12px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, marginBottom: 14, cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.green} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text, margin: 0, flex: 1 }}>Today's Status</p>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.brass, textDecoration: 'underline', textUnderlineOffset: 2 }}>Update</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {pills.map(p => {
          const effSt = effectiveState(p, new Date(), sun, tz);
          const cfg = gCfg(effSt);
          return (
            <div key={p.id} style={{ padding: '4px 8px', background: cfg.bg, borderRadius: 3 }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: '#F2EDE0', textTransform: 'capitalize' }}>{p.label}: {effSt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Daily Status (operational toggle, not config) ─────────────────────────
// v0.9.2: split out of the old StatusAdmin. Renders just the state buttons
// (open/limited/closed) + staff_note per pill. The hours-editing
// affordance moved to FacilityHoursAdmin under Club Settings — daily ops
// vs. config separation, so whoever opens the club each morning doesn't
// have to wade through schedule setup.
function DailyStatusAdmin({ club }) {
  const { data: pills, loading } = useClubStatus();
  const dusk = useDusk();
  const dawn = useDawn();
  useMinuteTick();                              // v0.9.8: live update at dawn/dusk
  const [draft, setDraft] = useState({});       // { category: { state, staff_note } }
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const dirty = useRef(false);
  const tz = club?.timezone || DEFAULT_TIMEZONE;
  const sun = { dusk, dawn };

  // Re-sync the draft whenever fresh data arrives — UNLESS the user has unsaved edits.
  useEffect(() => {
    if (dirty.current) return;
    const next = {};
    for (const p of pills) {
      next[p.id] = { state: p.st, staff_note: p.note };
    }
    setDraft(next);
  }, [pills]);

  const setField = (cat, k, v) => {
    dirty.current = true;
    setDraft(p => ({ ...p, [cat]: { ...p[cat], [k]: v } }));
  };

  const publish = async () => {
    if (!isConfigured || !club) return;
    setBusy(true);
    for (const p of pills) {
      const d = draft[p.id];
      if (!d) continue;
      await supabase
        .from('club_status')
        .update({ state: d.state ?? p.st, staff_note: d.staff_note ?? p.note })
        .eq('club_id', club.id)
        .eq('category', p.id);
    }
    dirty.current = false;
    setBusy(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
  };

  if (loading) return <Loading label="Loading current status…" />;

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 14px' }}>
        Pills auto-toggle Open ↔ Closed based on the weekly hours configured per facility.
        State buttons override (use "Limited" for partial service or "Closed" to force-close
        regardless of hours). Set the weekly schedule under <strong>Club Settings → Facility Hours</strong>.
      </p>
      {pills.map(item => {
        const d = draft[item.id] || { state: item.st, staff_note: item.note };
        const summary = summarizeWeek(item.hoursByDay);
        // v0.9.8: effective state = what members are actually seeing
        // RIGHT NOW (raw DB state + hours + dawn/dusk + manual override).
        // Surfaced as a live read-only chip so the morning opener can
        // sanity-check what the schedule has computed before flipping
        // a manual override.
        const effSt = effectiveState(item, new Date(), sun, tz);
        const effCfg = gCfg(effSt);
        return (
          <div key={item.id} style={{ padding: '13px 14px', background: G.card, borderRadius: 4, marginBottom: 9, border: `1px solid ${G.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0, flex: 1 }}>{item.label}</h4>
              {/* v0.9.15: "OFF" tag when the facility is inactive
                  in the catalog. Members don't see this facility,
                  but admin still does for transparency. */}
              {item.active === false && (
                <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.clsDot, background: 'rgba(107,32,32,0.12)', padding: '2px 6px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }} title="Inactive — hidden from members. Manage in Club Settings → Facilities.">OFF</span>
              )}
              <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2EDE0', background: effCfg.bg, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }} title="Live computed state (auto-updates at dawn/dusk)">Live: {effSt}</span>
            </div>
            {/* State buttons */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {['open', 'limited', 'closed'].map(st => (
                <div key={st} onClick={() => setField(item.id, 'state', st)} data-tap style={{ flex: 1, padding: '6px 0', textAlign: 'center', borderRadius: 3, cursor: 'pointer', background: d.state === st ? gCfg(st).bg : G.bg, border: `1px solid ${d.state === st ? 'transparent' : G.border}`, transition: 'all 0.15s' }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: d.state === st ? '#F2EDE0' : G.muted, textTransform: 'capitalize' }}>{st}</span>
                </div>
              ))}
            </div>
            {/* Read-only weekly summary so the daily opener can sanity-check the schedule */}
            <div style={{ padding: '6px 10px', background: G.bg, borderRadius: 3, border: `1px solid ${G.border}`, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, flex: 1 }}>{summary}</span>
            </div>
            <input
              value={d.staff_note}
              onChange={e => setField(item.id, 'staff_note', e.target.value)}
              placeholder="Staff note (optional) — shown to members in the pill popover"
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 11, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        );
      })}
      <div onClick={publish} data-tap style={{ marginTop: 14, padding: 12, background: savedAt ? G.openBg : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer', transition: 'background 0.3s' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>
          {busy ? 'Publishing…' : savedAt ? '✓ State + notes published' : 'Publish State + Notes'}
        </span>
      </div>
    </div>
  );
}

// ─── Facility Hours (configuration, manager-only) ──────────────────────────
// v0.9.2: lives under Club Settings. Lists each facility/pill with a
// summary of the weekly schedule + "Edit hours" → opens the existing
// WeeklyHoursModal. Decoupled from daily ops so morning staff don't
// accidentally rewrite the schedule while flipping today's state.
function FacilityHoursAdmin() {
  const { data: pills, loading } = useClubStatus();
  const [editingFor, setEditingFor] = useState(null);

  if (loading) return <Loading label="Loading facility schedules…" />;

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 14px' }}>
        Weekly base hours per facility. Auto-toggles the open/closed pills members see on the home screen.
        Use <strong>Date Overrides</strong> below for one-off closures or tournament hours.
      </p>
      {pills.map(item => {
        const summary = summarizeWeek(item.hoursByDay);
        return (
          <div key={item.id} onClick={() => setEditingFor(item)} data-tap style={{ padding: '13px 14px', background: G.card, borderRadius: 4, marginBottom: 9, border: `1px solid ${G.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, opacity: item.active === false ? 0.55 : 1 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0 }}>{item.label}</p>
                {/* v0.9.15: "OFF" tag for catalog-inactive facilities */}
                {item.active === false && (
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.clsDot, background: 'rgba(107,32,32,0.12)', padding: '2px 6px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }} title="Inactive — hidden from members.">OFF</span>
                )}
              </div>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, lineHeight: 1.4 }}>{summary}</p>
            </div>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brass, textDecoration: 'underline', textUnderlineOffset: 2, flexShrink: 0 }}>Edit hours</span>
          </div>
        );
      })}
      {editingFor && <WeeklyHoursModal pill={editingFor} onClose={() => setEditingFor(null)} />}
    </div>
  );
}

// One-line summary of the week
//   "Mon-Fri 11am-9pm · Sat-Sun 8am-Dusk · members"
// "members" is appended (gold-colored in the rendered version) when that
// chunk of days has the members_only flag set.
function summarizeWeek(hoursByDay) {
  if (!hoursByDay || Object.keys(hoursByDay).length === 0) return 'No schedule set';
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  // Group consecutive days that share an identical signature (hours + flags)
  const groups = [];
  for (let d = 0; d < 7; d++) {
    const h = hoursByDay[d];
    const sig = !h ? 'unset' :
      h.is_closed ? 'closed' :
      // v0.7.2: include opens_at_dawn in the signature so a "dawn" day
      // isn't grouped with a fixed-time day that happens to share its
      // close time.
      `${h.opens_at_dawn ? 'dawn' : (h.opens_at || '')}-${h.closes_at_dusk ? 'dusk' : (h.closes_at || '')}|m=${!!h.members_only}`;
    const last = groups[groups.length - 1];
    if (last && last.sig === sig) last.end = d;
    else groups.push({ sig, start: d, end: d, h });
  }
  return groups.map(g => {
    const days = g.start === g.end ? dayNames[g.start] : `${dayNames[g.start]}–${dayNames[g.end]}`;
    if (g.sig === 'unset')  return `${days} ?`;
    if (g.sig === 'closed') return `${days} closed`;
    const o = g.h.opens_at_dawn  ? 'Dawn' : fmt12(g.h.opens_at);
    const c = g.h.closes_at_dusk ? 'Dusk' : fmt12(g.h.closes_at);
    const mem = g.h.members_only ? ' · members' : '';
    return `${days} ${o}–${c}${mem}`;
  }).join(' · ');
}

// ─── Weekly hours modal ───────────────────────────────────────────────────
function WeeklyHoursModal({ pill, onClose }) {
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  // Initialize 7 days from pill's existing per-day data
  const [days, setDays] = useState(() => {
    const init = {};
    for (let d = 0; d < 7; d++) {
      const existing = pill.hoursByDay?.[d];
      init[d] = existing
        ? {
            opens_at:  trim5(existing.opens_at) || '',
            opens_at_dawn: !!existing.opens_at_dawn,
            closes_at: trim5(existing.closes_at) || '',
            closes_at_dusk: !!existing.closes_at_dusk,
            is_closed: !!existing.is_closed,
            members_only: !!existing.members_only,
          }
        : { opens_at: '', opens_at_dawn: false, closes_at: '', closes_at_dusk: false, is_closed: true, members_only: false };
    }
    return init;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const setDay = (d, k, v) => setDays(p => ({ ...p, [d]: { ...p[d], [k]: v } }));

  const copyToAll = (fromDay) => {
    const src = days[fromDay];
    const next = {};
    for (let d = 0; d < 7; d++) next[d] = { ...src };
    setDays(next);
  };

  const save = async () => {
    setBusy(true); setErr(null);
    // Upsert one row per day
    const rows = [];
    for (let d = 0; d < 7; d++) {
      const v = days[d];
      rows.push({
        status_id: pill.statusId,
        day_of_week: d,
        // v0.7.2: when opens_at_dawn is on, null out opens_at so we don't
        // store a stale clock-time hiding behind the dawn flag. Same
        // pattern closes_at follows for dusk.
        opens_at:  v.opens_at_dawn  ? null : blankToNull(v.opens_at),
        opens_at_dawn:  v.opens_at_dawn,
        closes_at: v.closes_at_dusk ? null : blankToNull(v.closes_at),
        closes_at_dusk: v.closes_at_dusk,
        is_closed: v.is_closed,
        members_only: !!v.members_only,
      });
    }
    const { error } = await supabase
      .from('club_status_hours')
      .upsert(rows, { onConflict: 'status_id,day_of_week' });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>{pill.label} — Weekly Hours</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        {dayNames.map((name, d) => {
          const v = days[d];
          return (
            <div key={d} style={{ padding: '10px 12px', background: G.card, borderRadius: 4, marginBottom: 8, border: `1px solid ${G.border}`, position: 'relative' }}>
              {/* Brass dot in the corner when this day is members-only */}
              {v.members_only && !v.is_closed && (
                <span
                  title="Members only"
                  style={{ position: 'absolute', top: 8, right: 10, width: 8, height: 8, borderRadius: '50%', background: G.brassLt, boxShadow: `0 0 0 2px ${G.card}` }}
                />
              )}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {name}
                  {v.members_only && !v.is_closed && (
                    <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#7A5A0A', background: 'rgba(196,160,64,0.25)', padding: '1px 6px', borderRadius: 2, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>Members</span>
                  )}
                </span>
                <span style={{ flex: 1 }} />
                <label style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginRight: 10 }}>
                  <input type="checkbox" checked={v.is_closed} onChange={e => setDay(d, 'is_closed', e.target.checked)} />
                  Closed all day
                </label>
                <span onClick={() => copyToAll(d)} data-tap style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.brass, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>Apply to all</span>
              </div>
              {!v.is_closed && (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <label style={smLabel}>Opens</label>
                      {v.opens_at_dawn ? (
                        // Mirror of the dusk display below — time inputs can't show "Dawn"
                        // so swap to a styled label that matches the input chrome.
                        <div style={{ ...smInput, display: 'flex', alignItems: 'center', gap: 6, color: G.muted, fontStyle: 'italic', background: '#EFE9DA' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.8">
                            <circle cx="12" cy="14" r="4"/>
                            <path d="M12 4v2M4 12h2M18 12h2M6.4 6.4L7.8 7.8M16.2 7.8L17.6 6.4"/>
                          </svg>
                          <span>Dawn</span>
                        </div>
                      ) : (
                        <input type="time" value={v.opens_at} onChange={e => setDay(d, 'opens_at', e.target.value)} style={smInput} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={smLabel}>Closes</label>
                      {v.closes_at_dusk ? (
                        // Time inputs can't display 'Dusk', so swap in a styled label that matches the input chrome.
                        <div style={{ ...smInput, display: 'flex', alignItems: 'center', gap: 6, color: G.muted, fontStyle: 'italic', background: '#EFE9DA' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.8">
                            <path d="M12 3v2M5.6 5.6l1.4 1.4M3 12h2M17 12h2M16.4 7L17.8 5.6M12 19a7 7 0 010-14"/>
                          </svg>
                          <span>Dusk</span>
                        </div>
                      ) : (
                        <input
                          type="time"
                          value={v.closes_at}
                          onChange={e => setDay(d, 'closes_at', e.target.value)}
                          style={smInput}
                        />
                      )}
                    </div>
                  </div>
                  <label style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                    <input type="checkbox" checked={v.opens_at_dawn} onChange={e => setDay(d, 'opens_at_dawn', e.target.checked)} />
                    Opens at dawn (auto-computed from the club's coordinates)
                  </label>
                  <label style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginTop: 4 }}>
                    <input type="checkbox" checked={v.closes_at_dusk} onChange={e => setDay(d, 'closes_at_dusk', e.target.checked)} />
                    Closes at dusk (auto-computed from the club's coordinates)
                  </label>
                  <label style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginTop: 4 }}>
                    <input type="checkbox" checked={!!v.members_only} onChange={e => setDay(d, 'members_only', e.target.checked)} />
                    Members only (shows "MEMBERS" badge in brass instead of "OPEN")
                  </label>
                </>
              )}
            </div>
          );
        })}

        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}

        <div onClick={save} data-tap style={{ padding: '13px', background: busy ? G.muted : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Saving…' : 'Save Weekly Hours'}</span>
        </div>
      </div>
    </div>
  );
}

const smLabel = { fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 3 };
const smInput = { width: '100%', padding: '6px 8px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' };

// ─── News composer ─────────────────────────────────────────────────────────
function NewsAdmin({ club }) {
  const [cat, setCat] = useState('Events');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [dateLabel, setDateLabel] = useState('Today');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const publish = async () => {
    if (!headline || !body || !club) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from('news').insert({
      club_id: club.id,
      category: cat,
      headline,
      body,
      date_label: dateLabel || 'Today',
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setHeadline(''); setBody('');
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>Publishes immediately to all member devices.</p>
      <div>
        <label style={labelStyle}>Category</label>
        <select value={cat} onChange={e => setCat(e.target.value)} style={selectStyle}>
          {['Events', 'Course', 'Dining', 'Club', 'General'].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Headline</label>
        <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Enter headline…" style={{ ...inputStyle, fontFamily: '"Playfair Display",serif', fontSize: 16 }} />
      </div>
      <div>
        <label style={labelStyle}>Body</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your announcement…" style={{ ...inputStyle, height: 110, lineHeight: 1.6, resize: 'none', fontSize: 12 }} />
      </div>
      <div>
        <label style={labelStyle}>Date label (what members see)</label>
        <input value={dateLabel} onChange={e => setDateLabel(e.target.value)} placeholder="Today, May 14, etc." style={inputStyle} />
      </div>
      {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, margin: 0 }}>{err}</p>}
      <div onClick={publish} data-tap style={{ padding: 12, background: done ? G.openBg : (headline && body && !busy ? G.green : G.border), borderRadius: 3, textAlign: 'center', cursor: headline && body && !busy ? 'pointer' : 'not-allowed' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Publishing…' : done ? '✓ Published' : 'Publish'}</span>
      </div>
    </div>
  );
}

// ─── Pace editor ───────────────────────────────────────────────────────────
function PaceAdmin({ club }) {
  const { data: pace, loading } = usePaceOfPlay();
  const [state, setState] = useState('open');
  const [timeLabel, setTimeLabel] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (dirty.current) return;
    if (pace) {
      setState(pace.state || 'open');
      setTimeLabel(pace.time_label || '');
      setMessage(pace.message || '');
    }
  }, [pace?.state, pace?.time_label, pace?.message]);

  const markDirty = (setter) => (v) => { dirty.current = true; setter(v); };

  const publish = async () => {
    if (!club) return;
    setBusy(true);
    await supabase
      .from('pace_of_play')
      .update({ state, time_label: timeLabel, message })
      .eq('club_id', club.id);
    dirty.current = false;
    setBusy(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
  };

  if (loading) return <Loading label="Loading current pace…" />;

  const options = [
    { state: 'open',    label: 'On pace' },
    { state: 'limited', label: 'Slightly slow' },
    { state: 'closed',  label: 'Significantly slow' },
  ];

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 14px' }}>Set the current pace of play indicator visible to all members.</p>
      {options.map(o => (
        <div key={o.state} onClick={() => markDirty(setState)(o.state)} data-tap style={{ padding: '12px 14px', background: state === o.state ? gCfg(o.state).bg : G.card, borderRadius: 4, marginBottom: 8, border: `1px solid ${state === o.state ? 'transparent' : G.border}`, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: gCfg(o.state).dot, flexShrink: 0 }} />
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: state === o.state ? '#F2EDE0' : G.text }}>{o.label}</span>
        </div>
      ))}
      <div style={{ marginTop: 10 }}>
        <label style={labelStyle}>Current time (e.g. 4h 12m)</label>
        <input value={timeLabel} onChange={e => markDirty(setTimeLabel)(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={labelStyle}>Message (optional)</label>
        <input value={message} onChange={e => markDirty(setMessage)(e.target.value)} placeholder="On pace, slowing on the back nine, etc." style={inputStyle} />
      </div>
      <div onClick={publish} data-tap style={{ marginTop: 14, padding: 12, background: savedAt ? G.openBg : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Updating…' : savedAt ? '✓ Updated' : 'Update Pace'}</span>
      </div>
    </div>
  );
}

// ─── Pin placements editor (tap on the green image to set today's pin) ────
function PinsAdmin({ club }) {
  const { data: holes, loading, refresh } = usePinPlacements();
  const [hole, setHole] = useState(1);
  const [draft, setDraft] = useState({ pin_x: 0.5, pin_y: 0.5, notes: '' });
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const dirty = useRef(false);
  const h = holes.find(x => x.n === hole) || holes[0];

  // Sync draft with the loaded data — unless the user has unsaved edits.
  useEffect(() => {
    if (dirty.current) return;
    if (h) setDraft({ pin_x: h.pinX ?? 0.5, pin_y: h.pinY ?? 0.5, notes: h.notes || '' });
  }, [hole, h?.n, h?.pinX, h?.pinY, h?.notes]);

  const selectHole = (n) => { dirty.current = false; setHole(n); };

  const onTap = (x, y) => {
    dirty.current = true;
    setDraft(d => ({ ...d, pin_x: x, pin_y: y }));
  };

  const setNotes = (v) => {
    dirty.current = true;
    setDraft(d => ({ ...d, notes: v }));
  };

  const recenter = () => {
    dirty.current = true;
    setDraft(d => ({ ...d, pin_x: 0.5, pin_y: 0.5 }));
  };

  const publish = async () => {
    if (!club || !h) return;
    setBusy(true);
    const today = new Date().toISOString().slice(0, 10);
    // Upsert in case there's no row for today yet (e.g. greenskeeper opens app
    // first thing in the morning before the daily-seed cron runs).
    await supabase
      .from('pin_placements')
      .upsert(
        {
          club_id: club.id,
          hole_number: h.n,
          par: h.par,
          yards: h.yds,
          pin_x: draft.pin_x,
          pin_y: draft.pin_y,
          notes: draft.notes,
          effective_date: today,
        },
        { onConflict: 'club_id,hole_number,effective_date' },
      );
    dirty.current = false;
    setBusy(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
    refresh?.();
  };

  if (loading) return <Loading label="Loading pin placements…" />;
  if (!h) return null;

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 14px' }}>Select a hole, tap on the green to place today's pin, add any notes, then publish.</p>

      {/* Hole picker */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {holes.map(hd => (
          <div key={hd.n} onClick={() => selectHole(hd.n)} data-tap style={{ width: 36, height: 36, borderRadius: 3, background: hole === hd.n ? G.brass : G.card, border: `1px solid ${hole === hd.n ? G.brass : G.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 12, fontWeight: hole === hd.n ? 700 : 500, color: hole === hd.n ? '#1B3A2D' : G.text }}>{hd.n}</span>
          </div>
        ))}
      </div>

      <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: '0 0 4px' }}>Hole {h.n} · Par {h.par} · {h.yds} yards</h4>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '0 0 10px' }}>Tap anywhere on the green to drop the pin there.</p>

      {/* Tap-to-place green image */}
      <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${G.border}`, marginBottom: 8 }}>
        <GreenWithPin src={h.greenImage} pinX={draft.pin_x} pinY={draft.pin_y} onTap={onTap} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, fontFamily: '"Lora",serif', fontSize: 11, color: G.muted }}>
        <span>x: {draft.pin_x.toFixed(2)}</span>
        <span>y: {draft.pin_y.toFixed(2)}</span>
        <span onClick={recenter} data-tap style={{ marginLeft: 'auto', color: G.brass, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>Reset to center</span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Notes (optional)</label>
        <input value={draft.notes} onChange={e => setNotes(e.target.value)} style={inputStyle} placeholder="e.g. firm, double cut, slight tier" />
      </div>

      <div onClick={publish} data-tap style={{ marginTop: 8, padding: 12, background: savedAt ? G.openBg : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Updating…' : savedAt ? `✓ Hole ${h.n} updated` : `Publish Hole ${h.n}`}</span>
      </div>
    </div>
  );
}

// ─── People admin — v0.9.18 unified browse of everyone at the club ─
// Members + Guests + Staff in one list. Role badges, status sub-
// badges, search by name/email, filter chips. Tap to expand for
// inline details. (Note: v0.15.6 retired MembersAdmin — the unified
// AllPeopleAdmin in screens/admin/ now owns full member CRUD.)
// This older PeopleAdmin component is now unreachable (its
// 'people_all' sidebar entry was hidden in v0.15.4); left in
// place pending final removal once we're confident nothing in
// the codebase still references it.
//
// Why: Marc's spec — "make that a Person section that has the
// delineation as to what group they are a part of." Surfaces
// orphan signups (Brian Jones at status='pending_authentication')
// that previously fell through the cracks.
function PeopleAdmin({ club }) {
  const [members, setMembers]   = useState([]);
  const [guests,  setGuests]    = useState([]);
  const [roles,   setRoles]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [query,   setQuery]     = useState('');
  const [filter,  setFilter]    = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [version, setVersion]   = useState(0);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    (async () => {
      const [{ data: m }, { data: g }, { data: r }] = await Promise.all([
        supabase.from('members')
          .select('id, name, membership_number, tier, status, email, user_id, photo_url, created_at')
          .eq('club_id', club.id),
        supabase.from('guests')
          .select('id, name, email, phone, visit_type, access_level, status, expires_at, created_at, referring_member_id, members:referring_member_id(name)')
          .eq('club_id', club.id),
        supabase.from('user_roles')
          .select('user_id, role, display_name')
          .eq('club_id', club.id),
      ]);
      if (cancelled) return;
      setMembers(m || []);
      setGuests(g || []);
      setRoles(r || []);
      setLoading(false);
    })();

    const channels = [
      supabase.channel(`people:m:${club.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `club_id=eq.${club.id}` }, () => setVersion(v => v + 1))
        .subscribe(),
      supabase.channel(`people:g:${club.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'guests', filter: `club_id=eq.${club.id}` }, () => setVersion(v => v + 1))
        .subscribe(),
      supabase.channel(`people:r:${club.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles', filter: `club_id=eq.${club.id}` }, () => setVersion(v => v + 1))
        .subscribe(),
    ];
    return () => { cancelled = true; channels.forEach(c => supabase.removeChannel(c)); };
  }, [club?.id, version]);

  // Merge members + guests + role grants into one unified list. Each
  // member's row carries any matching user_role as a staffRole field
  // so the "Staff" badge stacks alongside the Member badge.
  const rolesByUser = useMemo(() => {
    const map = new Map();
    for (const r of roles) if (r.user_id) map.set(r.user_id, r);
    return map;
  }, [roles]);

  const people = useMemo(() => {
    const all = [];
    for (const m of members) {
      const role = m.user_id ? rolesByUser.get(m.user_id) : null;
      all.push({
        kind: 'member',
        id: m.id,
        name: m.name || '(no name)',
        email: m.email,
        member: m,
        staffRole: role?.role || null,
      });
    }
    for (const g of guests) {
      all.push({
        kind: 'guest',
        id: g.id,
        name: g.name || '(no name)',
        email: g.email,
        guest: g,
      });
    }
    return all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [members, guests, rolesByUser]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter(p => {
      if (filter === 'members'      && p.kind !== 'member')   return false;
      if (filter === 'guests'       && p.kind !== 'guest')    return false;
      if (filter === 'staff'        && !p.staffRole)          return false;
      if (filter === 'pending_auth' && !(p.kind === 'guest' && p.guest.status === 'pending_authentication')) return false;
      if (!q) return true;
      return (p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q);
    });
  }, [people, query, filter]);

  // Counts for the filter chip labels
  const counts = useMemo(() => ({
    all:      people.length,
    members:  people.filter(p => p.kind === 'member').length,
    guests:   people.filter(p => p.kind === 'guest').length,
    staff:    people.filter(p => p.staffRole).length,
    pending_auth: people.filter(p => p.kind === 'guest' && p.guest.status === 'pending_authentication').length,
  }), [people]);

  const filterChips = [
    { id: 'all',          label: 'All',                  count: counts.all },
    { id: 'members',      label: 'Members',              count: counts.members },
    { id: 'guests',       label: 'Guests',               count: counts.guests },
    { id: 'staff',        label: 'Staff',                count: counts.staff },
    { id: 'pending_auth', label: 'Pending auth',         count: counts.pending_auth },
  ];

  // Color tokens for role + status badges
  const badge = (text, color, bg) => (
    <span style={{ fontFamily: '"Lora",serif', fontSize: 9, fontWeight: 700, color, background: bg, padding: '2px 7px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{text}</span>
  );

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px', lineHeight: 1.5 }}>
        Everyone at {club?.name || 'this club'} — members, guests, and staff in one list. Tap a row to see details. Use the chips to filter by group, or the search box to find someone by name or email.
      </p>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          style={{ width: '100%', padding: '8px 12px 8px 32px', border: `1px solid ${G.border}`, borderRadius: 4, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' }}
        />
        {query && (
          <div onClick={() => setQuery('')} data-tap style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', padding: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
        {filterChips.map(c => {
          const active = filter === c.id;
          // Hide pending_auth chip when there are none — keeps the
          // filter row uncluttered until there's actually something
          // urgent.
          if (c.id === 'pending_auth' && c.count === 0 && !active) return null;
          return (
            <div
              key={c.id}
              onClick={() => setFilter(c.id)}
              data-tap
              style={{
                padding: '5px 11px',
                background: active ? G.green : G.card,
                border: `1px solid ${active ? G.green : G.border}`,
                borderRadius: 12,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: active ? '#F2EDE0' : G.text, fontWeight: 500 }}>{c.label}</span>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: active ? '#A8D8B8' : G.muted }}>{c.count}</span>
            </div>
          );
        })}
      </div>

      {loading && <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, padding: '20px 0', textAlign: 'center' }}>Loading…</p>}
      {!loading && visible.length === 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
            {query ? `No matches for "${query}".` : 'No people in this filter.'}
          </p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
          {visible.map((p, i) => {
            const isOpen = expanded === `${p.kind}:${p.id}`;
            const badges = [];
            if (p.kind === 'member') {
              badges.push(badge('Member', '#F2EDE0', G.green));
              if (p.member.status === 'pending') badges.push(badge('pending', G.brass, 'rgba(155,122,30,0.12)'));
              if (p.member.status === 'inactive') badges.push(badge('inactive', G.cls || '#6B2020', 'rgba(107,32,32,0.12)'));
            }
            if (p.kind === 'guest') {
              badges.push(badge('Guest', G.brass, 'rgba(155,122,30,0.12)'));
              const s = p.guest.status;
              if (s === 'pending_authentication') badges.push(badge('pending auth', G.clsDot || '#B05151', 'rgba(176,81,81,0.14)'));
              else if (s === 'pending')            badges.push(badge('pending', G.brass, 'rgba(155,122,30,0.12)'));
              else if (s === 'active')             badges.push(badge('active', G.openTxt || '#54A36B', 'rgba(82,193,120,0.12)'));
              else if (s === 'revoked')            badges.push(badge('revoked', G.clsDot || '#B05151', 'rgba(176,81,81,0.14)'));
            }
            if (p.staffRole) {
              const isSuper = p.staffRole === 'super_admin';
              const isMgr   = p.staffRole === 'club_manager';
              const text = isSuper ? 'Super' : isMgr ? 'Manager' : 'Admin';
              badges.push(badge(text, '#F2EDE0', isSuper ? G.cls || '#6B2020' : G.greenMid || '#2D4D3E'));
            }
            return (
              <div key={`${p.kind}:${p.id}`} style={{ borderTop: i === 0 ? 'none' : `1px solid ${G.border}` }}>
                <div onClick={() => setExpanded(isOpen ? null : `${p.kind}:${p.id}`)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 8, cursor: 'pointer' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email || '—'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{badges}</div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}><path d="M6 9l6 6 6-6" /></svg>
                </div>
                {isOpen && (
                  <div style={{ padding: '12px 14px', background: G.bg, borderTop: `1px solid ${G.border}` }}>
                    {p.kind === 'member' && <MemberDetailPanel m={p.member} staffRole={p.staffRole} />}
                    {p.kind === 'guest'  && <GuestDetailPanel  g={p.guest} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Inline detail panels — read-only summary. Deep edit ops still live
// in the dedicated sections (Manage Members, Guest Settings & QR, Manage Staff).
function MemberDetailPanel({ m, staffRole }) {
  const { club } = useAuth();
  const Row = ({ label, value }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, padding: '3px 0', fontFamily: '"Lora",serif', fontSize: 12 }}>
      <span style={{ color: G.muted }}>{label}</span>
      <span style={{ color: G.text }}>{value || '—'}</span>
    </div>
  );
  return (
    <div>
      <Row label="Membership #" value={m.membership_number} />
      <Row label="Tier"          value={m.tier} />
      <Row label="Status"        value={m.status} />
      <Row label="Email"         value={m.email} />
      <Row label="Joined"        value={m.created_at ? new Date(m.created_at).toLocaleDateString() : null} />
      {staffRole && <Row label="Staff role" value={staffRole.replace(/_/g, ' ')} />}
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '10px 0 0' }}>
        For edits, CSV import, or magic-link invites: <strong>Manage Members</strong> section.
      </p>
      {/* v0.9.23 — badge assignment row. Reads/writes member_badges
          inline; recipients see their awards realtime on every surface
          (membership card, directory, profile) once those land in
          v0.10.0. */}
      <MemberBadgesRow memberId={m.id} clubId={club?.id} />
    </div>
  );
}

// Inline badge assignment row used by MemberDetailPanel. Shows the
// member's current badges (with a remove × on each) and an "Assign
// badge" button that opens a picker of the remaining library entries
// the member doesn't already hold. Writes go straight to
// member_badges with awarded_by set to the current admin's member.id
// when available, falling back to NULL (covers super_admins who
// don't have a member row in the assigning club).
function MemberBadgesRow({ memberId, clubId }) {
  const { member: currentAdmin } = useAuth();
  const [held,      setHeld]      = useState([]);   // member_badges rows w/ embedded badge
  const [library,   setLibrary]   = useState([]);   // all badges in the club
  const [picking,   setPicking]   = useState(false);
  const [err,       setErr]       = useState('');
  const [version,   setVersion]   = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!memberId || !clubId) return;
    let cancelled = false;
    (async () => {
      const [{ data: mb, error: me }, { data: lib, error: le }] = await Promise.all([
        supabase.from('member_badges')
          .select('id, badge_id, awarded_at, badges ( id, name, icon_key, color, year, category )')
          .eq('member_id', memberId)
          .eq('club_id', clubId)
          .order('awarded_at', { ascending: false }),
        supabase.from('badges')
          .select('id, name, icon_key, color, year, category, sort_order')
          .eq('club_id', clubId)
          .order('category', { ascending: true })
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),
      ]);
      if (cancelled) return;
      if (me) setErr(me.message);
      if (le) setErr(le.message);
      setHeld(mb || []);
      setLibrary(lib || []);
    })();

    // Two channels — the assignments for this member, and the library
    // (so if a manager edits a badge in another tab the embedded data
    // here refreshes too).
    const channels = [
      supabase.channel(`mb_row:${memberId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'member_badges', filter: `member_id=eq.${memberId}` }, () => refresh())
        .subscribe(),
      supabase.channel(`mb_lib:${clubId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'badges', filter: `club_id=eq.${clubId}` }, () => refresh())
        .subscribe(),
    ];
    return () => { cancelled = true; channels.forEach(c => supabase.removeChannel(c)); };
  }, [memberId, clubId, version]);

  const heldIds   = new Set(held.map(h => h.badge_id));
  const available = library.filter(b => !heldIds.has(b.id));

  const assign = async (badge) => {
    setErr('');
    const { error } = await supabase.from('member_badges').insert({
      club_id: clubId,
      member_id: memberId,
      badge_id: badge.id,
      awarded_by: currentAdmin?.id || null,
    });
    if (error) { setErr(error.message); return; }
    setPicking(false);
    refresh();
  };

  const removeAssignment = async (row) => {
    const name = row.badges?.name || 'this badge';
    if (!confirm(`Remove "${name}" from this member?`)) return;
    setErr('');
    const { error } = await supabase.from('member_badges').delete().eq('id', row.id);
    if (error) { setErr(error.message); return; }
    refresh();
  };

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px dashed ${G.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Badges{held.length > 0 ? ` (${held.length})` : ''}
        </p>
        <button
          onClick={() => setPicking(p => !p)}
          data-tap
          type="button"
          style={{
            background: picking ? 'transparent' : G.green,
            color: picking ? G.text : '#F2EDE0',
            border: picking ? `1px solid ${G.border}` : 'none',
            borderRadius: 3,
            padding: '5px 11px',
            cursor: 'pointer',
            fontFamily: '"Lora",serif', fontSize: 11,
          }}
        >
          {picking ? 'Cancel' : '+ Assign badge'}
        </button>
      </div>

      {err && (
        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsBg, margin: '0 0 8px' }}>{err}</p>
      )}

      {held.length === 0 && !picking && (
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: 0 }}>
          No badges yet.
        </p>
      )}

      {held.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {held.map(row => row.badges && (
            <div key={row.id} style={{ position: 'relative' }}>
              <Badge
                iconKey={row.badges.icon_key}
                color={row.badges.color}
                name={row.badges.name}
                year={row.badges.year}
                size="small"
              />
              <button
                onClick={() => removeAssignment(row)}
                aria-label={`Remove ${row.badges.name}`}
                title="Remove"
                type="button"
                style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 20, height: 20, borderRadius: '50%',
                  background: G.clsBg, color: '#fff',
                  border: '2px solid #F2EDE0', cursor: 'pointer',
                  fontSize: 12, lineHeight: 1, padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {picking && (
        <div style={{
          marginTop: 12, padding: '12px 14px',
          background: G.card, border: `1px solid ${G.border}`, borderRadius: 5,
        }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Choose a badge to assign
          </p>
          {library.length === 0 ? (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
              No badges in the club library yet. Create one in <strong>People → Badges</strong>.
            </p>
          ) : available.length === 0 ? (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>
              This member already holds every badge in the library.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {available.map(b => (
                <button
                  key={b.id}
                  onClick={() => assign(b)}
                  data-tap
                  type="button"
                  title={b.name}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${G.border}`,
                    borderRadius: 5,
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  <Badge
                    iconKey={b.icon_key}
                    color={b.color}
                    name={b.name}
                    year={b.year}
                    size="small"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function GuestDetailPanel({ g }) {
  const Row = ({ label, value }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, padding: '3px 0', fontFamily: '"Lora",serif', fontSize: 12 }}>
      <span style={{ color: G.muted }}>{label}</span>
      <span style={{ color: G.text }}>{value || '—'}</span>
    </div>
  );
  const ref = g.members?.name;
  return (
    <div>
      <Row label="Email"         value={g.email} />
      <Row label="Phone"         value={g.phone} />
      <Row label="Visit type"    value={g.visit_type ? String(g.visit_type).replace(/_/g, ' ') : null} />
      <Row label="Access level"  value={g.access_level ? String(g.access_level).replace(/_/g, ' ') : null} />
      <Row label="Status"        value={g.status ? g.status.replace(/_/g, ' ') : null} />
      <Row label="Registered"    value={g.created_at ? new Date(g.created_at).toLocaleString() : null} />
      <Row label="Expires"       value={g.expires_at ? new Date(g.expires_at).toLocaleString() : 'no expiry'} />
      <Row label="Invited by"    value={ref} />
      {g.status === 'pending_authentication' && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(176,81,81,0.10)', border: `1px solid ${G.clsDot || '#B05151'}`, borderRadius: 3 }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, margin: 0, lineHeight: 1.5 }}>
            <strong style={{ color: G.clsDot || '#B05151' }}>This guest hasn't verified their email yet.</strong> They submitted the registration form but never clicked the magic link. Status will auto-flip to active/pending once they verify. Reach out at the email above if they need a nudge.
          </p>
        </div>
      )}
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 11, color: G.muted, margin: '10px 0 0' }}>
        For QR codes + per-club guest settings: <strong>Guest Settings &amp; QR</strong> section.
      </p>
    </div>
  );
}

// v0.15.6 — MembersAdmin / MemberEditModal / CsvImportModal /
// StatusChip / parseCsvLine were retired here. All of their
// capabilities now live inside AllPeopleAdmin (the "People"
// section) — add / edit / CSV import for members, guests, and
// staff in one unified view. See AllPeopleAdmin.jsx.
// ─── Badges admin (v0.9.22) — full CRUD on the v0.10.0 badges schema ─────
//
// Library + creation form for shield-shaped badges. Manager picks name,
// category, color (8 club-themed swatches + native picker), icon
// (curated 24-icon Lucide grid), and optional year. Live large-shield
// preview updates as fields change. Quick-add row at the top pre-fills
// the form with six common templates so managers can spin up the
// "standard set" in seconds rather than typing six things from
// scratch.
//
// Reads + writes go straight against public.badges (migration 55).
// Realtime channels on badges and member_badges keep the holder
// counts live as members get assigned in the next patch (v0.9.23).
//
// Delete protection: the confirm dialog surfaces how many members
// currently hold the badge so the manager knows the blast radius
// before nuking it. The DB-level FK cascade removes the member_badges
// rows for them.

// Pre-defined templates — common country-club achievement badges.
// Each one click-pre-fills the form so the manager can tweak +
// save in seconds. Picked to match the most-requested honors:
// Club Champion, Member-Guest, Hole In One, Senior Champion, Most
// Improved, 25-Year Member. Year is left blank intentionally; the
// manager fills it on the form (we don't presume the current year).
const BADGE_TEMPLATES = [
  { name: 'Club Champion',   iconKey: 'Trophy', color: '#9B7A1E', category: 'championship' },
  { name: 'Member-Guest',    iconKey: 'Flag',   color: '#1B3A2D', category: 'championship' },
  { name: 'Hole In One',     iconKey: 'Star',   color: '#7B2C3B', category: 'recognition' },
  { name: 'Senior Champion', iconKey: 'Crown',  color: '#234D6B', category: 'championship' },
  { name: 'Most Improved',   iconKey: 'Award',  color: '#2C5530', category: 'recognition' },
  { name: '25-Year Member',  iconKey: 'Medal',  color: '#6B4A10', category: 'membership'  },
];

// Curated 24-icon Lucide grid — relevant to country-club achievements
// (trophies, flags, stars, leaves, etc.). Lucide ships ~1500 icons;
// the manager almost never needs the full set, and an unbounded
// picker overwhelms more than it enables. If a club asks for an icon
// not on this list we add it in a patch.
const BADGE_ICON_CHOICES = [
  'Trophy', 'Award', 'Medal', 'Crown', 'Star', 'Sparkles',
  'Flag', 'Target', 'Crosshair', 'Compass', 'Zap', 'Sun',
  'TreePine', 'Leaf', 'Mountain', 'Users', 'User', 'UserCheck',
  'Calendar', 'Heart', 'ThumbsUp', 'Coffee', 'Wine', 'Gem',
];

// Eight club-themed color swatches. Native HTML color picker handles
// everything else — these are just the fast-pick defaults.
const BADGE_COLOR_SWATCHES = [
  '#9B7A1E', '#1B3A2D', '#7B2C3B', '#234D6B',
  '#2C5530', '#6B4A10', '#8B5A2B', '#3F4A5C',
];

const BADGE_CATEGORY_CHOICES = [
  { value: 'championship', label: 'Championship' },
  { value: 'recognition',  label: 'Recognition'  },
  { value: 'membership',   label: 'Membership'   },
];

function BadgesAdmin({ club }) {
  const [badges,  setBadges]  = useState([]);
  const [counts,  setCounts]  = useState({}); // badge_id → number of members holding it
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | <badge_id>
  const [draft,   setDraft]   = useState(null); // { name, icon_key, color, year, category }
  const [err,     setErr]     = useState('');
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: b, error: be }, { data: mb, error: me }] = await Promise.all([
        supabase.from('badges')
          .select('id, name, icon_key, color, year, category, sort_order, created_at')
          .eq('club_id', club.id)
          .order('category', { ascending: true })
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),
        supabase.from('member_badges')
          .select('badge_id')
          .eq('club_id', club.id),
      ]);
      if (cancelled) return;
      if (be) setErr(be.message);
      if (me) setErr(me.message);
      setBadges(b || []);
      const c = {};
      for (const row of (mb || [])) c[row.badge_id] = (c[row.badge_id] || 0) + 1;
      setCounts(c);
      setLoading(false);
    })();

    const channels = [
      supabase.channel(`badges:${club.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'badges',         filter: `club_id=eq.${club.id}` }, () => refresh())
        .subscribe(),
      supabase.channel(`mb_count:${club.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'member_badges',  filter: `club_id=eq.${club.id}` }, () => refresh())
        .subscribe(),
    ];
    return () => { cancelled = true; channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [club?.id, version]);

  const startNew = (template) => {
    setErr('');
    setEditing('new');
    setDraft(template ? {
      name: template.name,
      icon_key: template.iconKey,
      color: template.color,
      year: '',
      category: template.category,
    } : {
      name: '',
      icon_key: 'Award',
      color: '#9B7A1E',
      year: '',
      category: 'recognition',
    });
  };

  const startEdit = (badge) => {
    setErr('');
    setEditing(badge.id);
    setDraft({
      name: badge.name,
      icon_key: badge.icon_key,
      color: badge.color,
      year: badge.year ?? '',
      category: badge.category,
    });
  };

  const cancel = () => { setEditing(null); setDraft(null); setErr(''); };

  const save = async () => {
    if (!draft || !draft.name.trim()) return;
    setErr('');
    const payload = {
      club_id: club.id,
      name: draft.name.trim(),
      icon_key: draft.icon_key,
      color: draft.color,
      year: draft.year === '' || draft.year == null ? null : parseInt(draft.year, 10),
      category: draft.category,
    };
    if (editing === 'new') {
      const { error } = await supabase.from('badges').insert(payload);
      if (error) { setErr(error.message); return; }
    } else {
      const { error } = await supabase.from('badges').update(payload).eq('id', editing);
      if (error) { setErr(error.message); return; }
    }
    cancel();
    refresh();
  };

  const remove = async (badge) => {
    const c = counts[badge.id] || 0;
    const msg = c > 0
      ? `Delete "${badge.name}"? ${c} member${c === 1 ? '' : 's'} currently hold this badge. Their assignment will be removed too.`
      : `Delete "${badge.name}"?`;
    if (!confirm(msg)) return;
    setErr('');
    const { error } = await supabase.from('badges').delete().eq('id', badge.id);
    if (error) { setErr(error.message); return; }
    refresh();
  };

  if (loading) {
    return <p style={{ fontFamily: '"Lora",serif', color: G.muted }}>Loading…</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {err && (
        <div style={{ background: '#FCE8E8', border: `1px solid ${G.clsBg}`, borderRadius: 4, padding: '8px 12px' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsBg, margin: 0 }}>{err}</p>
        </div>
      )}

      {/* Quick add row — six pre-defined templates. Click any chip to
          pre-fill the form. Hidden while a form is open so the focus
          stays on the in-progress edit. */}
      {!editing && (
        <div>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Quick add — common club badges
          </p>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, margin: '0 0 10px', lineHeight: 1.5 }}>
            Click a template to start. You can edit name, color, icon, and year before saving.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {BADGE_TEMPLATES.map(t => (
              <button
                key={t.name}
                onClick={() => startNew(t)}
                data-tap
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: G.card, border: `1px solid ${G.border}`, borderRadius: 4,
                  padding: '6px 12px 6px 8px', cursor: 'pointer',
                  fontFamily: '"Lora",serif', fontSize: 12, color: G.text,
                }}
              >
                <Badge iconKey={t.iconKey} color={t.color} size="mini" />
                {t.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => startNew(null)}
            data-tap
            style={{
              marginTop: 14,
              background: G.green, color: '#F2EDE0',
              border: 'none', borderRadius: 4,
              padding: '10px 18px', cursor: 'pointer',
              fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 600,
            }}
          >
            + Add custom badge
          </button>
        </div>
      )}

      {/* Inline form — shown for both new + edit. Live preview lives
          inside the form so the manager sees the shield update as
          they type. */}
      {editing && draft && (
        <BadgeForm
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={cancel}
          isEdit={editing !== 'new'}
        />
      )}

      {/* Existing badge library — collapsed while a form is open. */}
      {!editing && (
        <div>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {badges.length === 0 ? 'Badge library' : `Badge library (${badges.length})`}
          </p>
          {badges.length === 0 ? (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: 0 }}>
              No badges yet. Use a Quick add template above or create one from scratch.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {badges.map(b => (
                <div key={b.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: G.card, border: `1px solid ${G.border}`, borderRadius: 6,
                  padding: '12px 14px',
                }}>
                  <Badge iconKey={b.icon_key} color={b.color} size="mini" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0 }}>
                      {b.name}{b.year ? ` · ${b.year}` : ''}
                    </p>
                    <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: '2px 0 0', textTransform: 'capitalize' }}>
                      {b.category} · {counts[b.id] || 0} holder{(counts[b.id] || 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button onClick={() => startEdit(b)} data-tap style={{
                    background: 'transparent', border: `1px solid ${G.border}`,
                    borderRadius: 3, padding: '6px 12px', cursor: 'pointer',
                    fontFamily: '"Lora",serif', fontSize: 12, color: G.text,
                  }}>Edit</button>
                  <button onClick={() => remove(b)} data-tap style={{
                    background: 'transparent', border: `1px solid ${G.clsBg}`,
                    borderRadius: 3, padding: '6px 10px', cursor: 'pointer',
                    fontFamily: '"Lora",serif', fontSize: 12, color: G.clsBg,
                  }}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Inline form — used for both new + edit. Live shield preview on the
// right so the manager can judge the visual as they tweak fields.
function BadgeForm({ draft, setDraft, onSave, onCancel, isEdit }) {
  const setField = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const yearNum = draft.year === '' || draft.year == null ? null : parseInt(draft.year, 10);
  const previewYear = yearNum && !Number.isNaN(yearNum) && yearNum > 0 ? yearNum : null;

  return (
    <div style={{
      background: G.card, border: `1px solid ${G.border}`, borderRadius: 6,
      padding: '16px 18px',
    }}>
      <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: '0 0 14px' }}>
        {isEdit ? 'Edit badge' : 'New badge'}
      </p>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Form fields */}
        <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <BadgeField label="Name">
            <input
              value={draft.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="e.g. Club Champion"
              style={badgeInputStyle}
              autoFocus
            />
          </BadgeField>
          <BadgeField label="Category">
            <select
              value={draft.category}
              onChange={e => setField('category', e.target.value)}
              style={badgeInputStyle}
            >
              {BADGE_CATEGORY_CHOICES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </BadgeField>
          <BadgeField label="Year (optional)">
            <input
              type="number"
              value={draft.year}
              onChange={e => setField('year', e.target.value)}
              placeholder="e.g. 2025"
              style={badgeInputStyle}
            />
          </BadgeField>
          <BadgeField label="Color">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {BADGE_COLOR_SWATCHES.map(c => (
                <button
                  key={c}
                  onClick={() => setField('color', c)}
                  aria-label={c}
                  type="button"
                  style={{
                    width: 26, height: 26, borderRadius: 4,
                    background: c, cursor: 'pointer', padding: 0,
                    border: c.toLowerCase() === (draft.color || '').toLowerCase()
                      ? `2px solid ${G.text}`
                      : `1px solid ${G.border}`,
                  }}
                />
              ))}
              <input
                type="color"
                value={draft.color}
                onChange={e => setField('color', e.target.value)}
                title="Custom color"
                style={{ width: 26, height: 26, padding: 0, border: `1px solid ${G.border}`, borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
              />
            </div>
          </BadgeField>
          <BadgeField label="Icon">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
              {BADGE_ICON_CHOICES.map(name => {
                const I = LucideIcons[name];
                if (!I) return null;
                const selected = name === draft.icon_key;
                return (
                  <button
                    key={name}
                    onClick={() => setField('icon_key', name)}
                    aria-label={name}
                    title={name}
                    type="button"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      height: 34, borderRadius: 4,
                      background: selected ? G.green : G.bg,
                      color: selected ? '#F2EDE0' : G.text,
                      border: selected ? `1.5px solid ${G.brass}` : `1px solid ${G.border}`,
                      cursor: 'pointer', padding: 0,
                    }}
                  >
                    <I size={16} />
                  </button>
                );
              })}
            </div>
          </BadgeField>
        </div>

        {/* Live large-shield preview. Sticks to the right so the
            manager can judge the visual as they edit on the left. */}
        <div style={{
          flex: '0 0 auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 10, padding: '14px 18px',
          background: G.bg, border: `1px solid ${G.border}`, borderRadius: 6,
          minWidth: 150,
        }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Preview
          </p>
          <Badge
            iconKey={draft.icon_key}
            color={draft.color}
            name={draft.name || 'Badge name'}
            year={previewYear}
            size="large"
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button onClick={onCancel} data-tap type="button" style={{
          background: 'transparent', border: `1px solid ${G.border}`,
          borderRadius: 4, padding: '8px 16px', cursor: 'pointer',
          fontFamily: '"Lora",serif', fontSize: 13, color: G.text,
        }}>Cancel</button>
        <button
          onClick={onSave}
          disabled={!draft.name.trim()}
          data-tap
          type="button"
          style={{
            background: draft.name.trim() ? G.green : G.muted, color: '#F2EDE0',
            border: 'none', borderRadius: 4,
            padding: '8px 18px',
            cursor: draft.name.trim() ? 'pointer' : 'not-allowed',
            fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 600,
          }}
        >
          {isEdit ? 'Save changes' : 'Create badge'}
        </button>
      </div>
    </div>
  );
}

const badgeInputStyle = {
  fontFamily: '"Lora",serif',
  fontSize: 13,
  padding: '8px 10px',
  borderRadius: 4,
  border: `1px solid ${G.border}`,
  background: G.card,
  width: '100%',
  boxSizing: 'border-box',
};

function BadgeField({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      {children}
    </label>
  );
}

// ─── Staff admin — user_roles editor with per-staff permission modal ──────
function StaffAdmin({ club }) {
  const { session, isSuperAdmin } = useAuth();
  const [staff, setStaff] = useState([]);
  const [memberPool, setMemberPool] = useState([]);  // members not yet on staff
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);      // user_roles row being edited
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: roles }, { data: m }] = await Promise.all([
        supabase
          .from('user_roles')
          .select('id, user_id, role, permissions, display_name, created_at')
          .eq('club_id', club.id)
          .in('role', ['club_manager', 'club_admin'])
          .order('created_at', { ascending: true }),
        supabase
          .from('members')
          .select('id, user_id, name, membership_number, email')
          .eq('club_id', club.id)
          .not('user_id', 'is', null),
      ]);
      if (cancelled) return;
      setStaff(roles || []);
      const staffUserIds = new Set((roles || []).map(r => r.user_id));
      setMemberPool((m || []).filter(x => !staffUserIds.has(x.user_id)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [club?.id, version]);

  const remove = async (id) => {
    if (!confirm('Remove this person from staff?')) return;
    await supabase.from('user_roles').delete().eq('id', id);
    refresh();
  };

  const addMember = async (m) => {
    // Everyone starts as club_admin with no permissions. Super_admin can
    // promote to club_manager from the edit modal afterwards.
    await supabase.from('user_roles').insert({
      club_id: club.id,
      user_id: m.user_id,
      display_name: m.name,
      role: 'club_admin',
      permissions: {},
      created_by: session?.user?.id,
    });
    setAdding(false);
    refresh();
  };

  if (loading) return <Loading label="Loading staff…" />;

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
        Club managers can do anything in this club. Club admins only have the specific permissions you grant them.
        {isSuperAdmin ? ' As super_admin, you can also promote anyone to manager.' : ' Only the super_admin can promote a club admin to manager.'}
      </p>

      <div style={{ background: G.card, borderRadius: 4, border: `1px solid ${G.border}`, overflow: 'hidden', marginBottom: 12 }}>
        {staff.map((s, i) => (
          <div key={s.id} onClick={() => setEditing(s)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, gap: 8, cursor: 'pointer' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: 0, fontWeight: 500 }}>{s.display_name || '(unnamed)'}</p>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>
                {s.role === 'club_manager' ? 'Manager · all permissions' :
                  `Admin · ${countPerms(s.permissions)} permission${countPerms(s.permissions) === 1 ? '' : 's'}`}
                {s.user_id === session?.user?.id && ' · You'}
              </p>
            </div>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: '#F2E5C0', background: s.role === 'club_manager' ? G.brass : G.greenMid, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
              {s.role === 'club_manager' ? 'Manager' : 'Admin'}
            </span>
          </div>
        ))}
      </div>

      <div onClick={() => setAdding(!adding)} data-tap style={{ padding: 12, background: adding ? G.card : G.green, border: `1px solid ${adding ? G.border : G.green}`, borderRadius: 3, textAlign: 'center', cursor: 'pointer' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: adding ? G.text : '#F2EDE0', fontWeight: 500 }}>{adding ? 'Cancel' : '+ Add Staff'}</span>
      </div>

      {adding && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 8px' }}>
            Pick a member to add as a club admin. They'll start with no permissions — tap their row after adding to grant access.
          </p>
          {memberPool.length === 0 && (
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, padding: 12, textAlign: 'center', background: G.card, borderRadius: 4 }}>No eligible members. They need a signed-in account first.</p>
          )}
          {memberPool.map(m => (
            <div key={m.id} onClick={() => addMember(m)} data-tap style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, marginBottom: 6, cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: 0, fontWeight: 500 }}>{m.name}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>#{m.membership_number} · {m.email || 'no email'}</p>
              </div>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brass, textDecoration: 'underline', textUnderlineOffset: 2 }}>Add as Admin →</span>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <StaffEditModal
          staff={editing}
          canPromoteToManager={isSuperAdmin}
          isSelf={editing.user_id === session?.user?.id}
          onClose={() => setEditing(null)}
          onSaved={refresh}
          onRemove={() => { remove(editing.id); setEditing(null); }}
        />
      )}
    </div>
  );
}

function countPerms(perms) {
  if (!perms) return 0;
  return Object.values(perms).filter(Boolean).length;
}

// Staff role + permissions editor modal
function StaffEditModal({ staff, canPromoteToManager, isSelf, onClose, onSaved, onRemove }) {
  const [role, setRole] = useState(staff.role);
  const [perms, setPerms] = useState(staff.permissions || {});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const togglePerm = (key) => setPerms(p => ({ ...p, [key]: !p[key] }));
  const allOn  = () => setPerms(Object.fromEntries(PERMISSION_KEYS.map(k => [k, true])));
  const allOff = () => setPerms({});

  const save = async () => {
    setBusy(true); setErr(null);
    // Manager has all perms implicitly; clear the jsonb to avoid stale flags
    const payload = role === 'club_manager' ? { role, permissions: {} } : { role, permissions: perms };
    const { error } = await supabase.from('user_roles').update(payload).eq('id', staff.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>{staff.display_name || 'Staff'}</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        <Field label="Role">
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            disabled={!canPromoteToManager}
            style={{ ...selectStyle, opacity: canPromoteToManager ? 1 : 0.6 }}
          >
            <option value="club_admin">Admin (specific permissions)</option>
            <option value="club_manager">Manager (all permissions)</option>
          </select>
          {!canPromoteToManager && (
            <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 10, color: G.muted, margin: '4px 0 0' }}>Only super_admin can change between Manager and Admin.</p>
          )}
        </Field>

        {role === 'club_admin' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 8px' }}>
              <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: 0, flex: 1 }}>Permissions</h4>
              <span onClick={allOn}  data-tap style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.brass, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2, marginRight: 12 }}>All on</span>
              <span onClick={allOff} data-tap style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>All off</span>
            </div>
            {PERMISSION_GROUPS.map(group => (
              <div key={group.area} style={{ marginBottom: 12 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 4px' }}>{group.area}</p>
                <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, overflow: 'hidden' }}>
                  {group.keys.map((p, i) => (
                    <label key={p.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!perms[p.key]} onChange={() => togglePerm(p.key)} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, fontWeight: 500, margin: 0 }}>{p.label}</p>
                        <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0 }}>{p.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}

        <div onClick={save} data-tap style={{ marginTop: 8, padding: 12, background: busy ? G.muted : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Saving…' : 'Save Changes'}</span>
        </div>
        {!isSelf && (
          <div onClick={onRemove} data-tap style={{ marginTop: 10, padding: 8, textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, textDecoration: 'underline', textUnderlineOffset: 2 }}>Remove from staff</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tiny form layout helpers ─────────────────────────────────────────────
function Row({ children }) {
  return <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>{Array.isArray(children) ? children : [children]}</div>;
}
function Field({ label, children }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

// ─── Loading state ─────────────────────────────────────────────────────────
function Loading({ label }) {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted }}>{label}</p>
    </div>
  );
}

// ─── Time helpers (used by StatusAdmin hours pickers) ─────────────────────
// Postgres TIME values come back as "HH:MM:SS"; <input type="time"> expects "HH:MM".
function trim5(t) {
  if (!t) return '';
  return typeof t === 'string' ? t.slice(0, 5) : t;
}
function blankToNull(v) { return v && v.length ? v : null; }
function fmt12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2,'0')}${period}`;
}

// ─── Shared form styles ────────────────────────────────────────────────────
const labelStyle = { fontFamily: '"Lora",serif', fontSize: 9, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };
const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box' };
const selectStyle = { ...inputStyle };