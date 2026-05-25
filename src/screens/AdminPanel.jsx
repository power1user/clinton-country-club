import { useState, useEffect, useRef } from 'react';
import { G, gCfg } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';
import { supabase, isConfigured } from '../lib/supabase.js';
import { useClubStatus, usePaceOfPlay, usePinPlacements } from '../hooks/useClubData.jsx';
import { GreenWithPin } from './PinMap.jsx';
import {
  MenuCategoriesAdmin, MenuItemsAdmin, ProShopItemsAdmin, LessonProsAdmin, HoleSponsorsAdmin, SponsorBannersAdmin,
  ScheduleOverridesAdmin, NotificationsAdmin, FoodOrdersAdmin,
  EventRegistrationsAdmin, EventsAdmin, LessonRequestsAdmin, ClubSettingsAdmin,
  ClubhouseInboxAdmin, NewsAdminFull, HolesAdmin, ClubGuideAdmin, MemberPostsAdmin,
  SuperAdminsAdmin, AllClubsAdmin, FeaturesAdmin,
} from './admin/sections.jsx';
import { PERMISSION_KEYS, PERMISSION_GROUPS } from '../lib/permissions.js';

// Two-level admin hub: 6 area cards at the top, each opens a sub-hub of
// its sections. Section IDs are unique across the whole tree so the
// section-content router can stay flat.
const AREAS = [
  {
    id: 'course',
    l: 'Course',
    d: 'Status, pace, pins, holes, sponsors',
    icon: IconFlag,
    sections: [
      { id: 'status',    permKey: 'can_edit_course_status', l: 'Club Status',        d: 'Hours, open/closed, member-only days',      icon: IconStatus    },
      { id: 'overrides', permKey: 'can_edit_course_status', l: 'Schedule Overrides', d: 'One-off date closures / tournament hours',  icon: IconCalendar  },
      { id: 'pace',      permKey: 'can_edit_course_status', l: 'Pace of Play',       d: "Set today's pace indicator",                icon: IconClock     },
      { id: 'pins',      permKey: 'can_edit_pins',          l: 'Pin Positions',      d: "Place today's pin on each green",           icon: IconFlag      },
      { id: 'holes',     permKey: 'can_edit_pins',          l: 'Holes',              d: 'Par, yardage, names + descriptions',        icon: IconList      },
      { id: 'holespons', permKey: 'can_manage_sponsors',    l: 'Hole Sponsors',      d: 'Local sponsor per hole',                    icon: IconHandshake },
    ],
  },
  {
    id: 'dining',
    l: 'Dining',
    d: 'Menu, items, orders',
    icon: IconUtensils,
    sections: [
      { id: 'menucats',  permKey: 'can_manage_menu', l: 'Menu Categories', d: 'Lunch, Dinner, Bar — sort + active flags', icon: IconList },
      { id: 'menuitems', permKey: 'can_manage_menu', l: 'Menu Items',      d: 'Add, edit, hide individual dishes',        icon: IconUtensils },
      { id: 'foodord',   permKey: 'can_view_orders', l: 'Food Orders',     d: 'Queue + status updates',                   icon: IconList },
    ],
  },
  {
    id: 'events',
    l: 'Events',
    d: 'Calendar + RSVPs',
    icon: IconCalendar,
    sections: [
      { id: 'eventsadmin', permKey: 'can_manage_events', l: 'Events',      d: 'Add, edit, cancel events',     icon: IconCalendar },
      { id: 'events',      permKey: 'can_manage_events', l: 'Event RSVPs', d: 'View + manage registrations',  icon: IconList },
    ],
  },
  {
    id: 'comms',
    l: 'Communications',
    d: 'News, notifications, banners, member posts, club guide',
    icon: IconNews,
    sections: [
      { id: 'news',         permKey: 'can_post_news',          l: 'News',            d: 'List, edit, publish announcements',         icon: IconNews    },
      { id: 'notifs',       permKey: 'can_send_notifications', l: 'Notifications',   d: 'Push alerts to all members',                icon: IconBell    },
      { id: 'banners',      permKey: 'can_manage_sponsors',    l: 'Sponsor Banners', d: 'Rotating sponsor banners',                  icon: IconBanner  },
      { id: 'memberposts',  permKey: 'can_manage_members',     l: 'Member Posts',    d: 'Moderate bulletin + partner posts',         icon: IconList    },
      { id: 'clubguide',    permKey: 'can_post_news',          l: 'Club Guide',      d: 'Onboarding pages members read on first run',icon: IconList    },
    ],
  },
  {
    id: 'proshop',
    l: 'Pro Shop',
    d: 'Catalog + lesson queue',
    icon: IconBag,
    sections: [
      { id: 'proitems',  permKey: 'can_manage_proshop',  l: 'Pro Shop Items',  d: 'Catalog of items for sale',     icon: IconBag    },
      { id: 'lessonpros',permKey: 'can_manage_proshop',  l: 'Lesson Pros',     d: 'Roster shown when booking',     icon: IconPeople },
      { id: 'lessons',   permKey: 'can_manage_lessons',  l: 'Lesson Requests', d: 'Pro shop inquiries queue',      icon: IconList   },
    ],
  },
  {
    id: 'people',
    l: 'People',
    d: 'Members, staff, club settings',
    icon: IconPeople,
    sections: [
      { id: 'members',         permKey: 'can_manage_members',       l: 'Members',         d: 'Roster, CSV import, invites',          icon: IconPeople },
      { id: 'staff',           permKey: 'can_manage_staff',         l: 'Staff',           d: 'Manage admins + grant permissions',    icon: IconShield, managerOnly: true },
      { id: 'clubhouseinbox',  permKey: 'can_view_clubhouse_inbox', l: 'Clubhouse Inbox', d: 'Member messages routed to staff',      icon: IconBell },
      { id: 'clubsettings',                                          l: 'Club Settings',   d: 'Logo, colors, contact, gating',        icon: IconCog, managerOnly: true },
    ],
  },
  // Features — Phase 7 (v0.7.0). Master switchboard for everything
  // members can see. Manager-only because it controls member-facing
  // surfaces; super_admin sees the same area plus extra lock controls
  // when editing a specific club via Platform → All Clubs.
  {
    id: 'features',
    l: 'Features',
    d: 'Turn member-facing surfaces on/off',
    icon: IconCog,
    sections: [
      { id: 'features', l: 'Feature Toggles', d: 'Pro Shop, Bulletin, Calendar, Lockers, all of it', icon: IconCog, managerOnly: true },
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
      { id: 'superadmins', l: 'Super Admins', d: 'Promote / demote platform admins',  icon: IconShield  },
      { id: 'allclubs',    l: 'All Clubs',    d: 'Manage every club on the platform', icon: IconFlag    },
    ],
  },
];

// Flat lookup for the section content router
const ALL_SECTIONS = AREAS.flatMap(a => a.sections.map(s => ({ ...s, areaId: a.id })));

export default function AdminPanel() {
  const { club, member, isAdmin, isSuperAdmin, isManager, hasPerm } = useAuth();
  const [area, setArea] = useState(null);   // top-level area, null = main hub
  const [sec, setSec] = useState(null);     // section within area, null = area sub-hub
  const [query, setQuery] = useState('');   // admin hub search
  const activeArea    = AREAS.find(a => a.id === area);
  const activeSection = ALL_SECTIONS.find(s => s.id === sec);

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

  // Level 3 — section content view, back returns to its area sub-hub
  if (activeSection) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
        <BackHeader
          title={activeSection.l}
          onBack={() => setSec(null)}
          right={<span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brassLt }}>{member?.name || 'Staff'}</span>}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 28px' }}>
          {sec === 'status'         && <StatusAdmin club={club} />}
          {sec === 'overrides'      && <ScheduleOverridesAdmin />}
          {sec === 'pace'           && <PaceAdmin club={club} />}
          {sec === 'pins'           && <PinsAdmin club={club} />}
          {sec === 'holes'          && <HolesAdmin />}
          {sec === 'holespons'      && <HoleSponsorsAdmin />}
          {sec === 'menucats'       && <MenuCategoriesAdmin />}
          {sec === 'menuitems'      && <MenuItemsAdmin />}
          {sec === 'foodord'        && <FoodOrdersAdmin />}
          {sec === 'eventsadmin'    && <EventsAdmin />}
          {sec === 'events'         && <EventRegistrationsAdmin />}
          {sec === 'news'           && <NewsAdminFull />}
          {sec === 'notifs'         && <NotificationsAdmin />}
          {sec === 'banners'        && <SponsorBannersAdmin />}
          {sec === 'memberposts'    && <MemberPostsAdmin />}
          {sec === 'clubguide'      && <ClubGuideAdmin />}
          {sec === 'proitems'       && <ProShopItemsAdmin />}
          {sec === 'lessonpros'     && <LessonProsAdmin />}
          {sec === 'lessons'        && <LessonRequestsAdmin />}
          {sec === 'members'        && <MembersAdmin club={club} />}
          {sec === 'staff'          && isManager && <StaffAdmin club={club} />}
          {sec === 'clubhouseinbox' && <ClubhouseInboxAdmin />}
          {sec === 'clubsettings'   && isManager && <ClubSettingsAdmin />}
          {sec === 'features'       && isManager && <FeaturesAdmin />}
          {sec === 'superadmins'    && isSuperAdmin && <SuperAdminsAdmin />}
          {sec === 'allclubs'       && isSuperAdmin && <AllClubsAdmin />}
        </div>
      </div>
    );
  }

  // Level 2 — area sub-hub showing that area's sections
  if (activeArea) {
    const sectionsToShow = activeArea.sections.filter(sectionVisible);
    return (
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
          <CardGrid items={sectionsToShow} onSelect={setSec} />
        </div>
      </div>
    );
  }

  // Level 1 — main hub with 6 area cards
  return (
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
            style={{ width: '100%', padding: '10px 14px 10px 36px', border: `1px solid ${G.border}`, borderRadius: 6, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' }}
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
            <CardGrid items={AREAS.filter(areaVisible)} onSelect={setArea} />
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
function CardGrid({ items, onSelect }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {items.map(s => {
        const Icon = s.icon;
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
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 6, background: G.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon color={G.brassLt} />
            </div>
            <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 15, fontWeight: 700, color: G.text, margin: '4px 0 0', lineHeight: 1.1 }}>{s.l}</h3>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, lineHeight: 1.4, margin: 0 }}>{s.d}</p>
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

// ─── Status pills editor ───────────────────────────────────────────────────
function StatusAdmin({ club }) {
  const { data: pills, loading } = useClubStatus();
  const [draft, setDraft] = useState({});       // { category: { state, staff_note } }
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [editingHoursFor, setEditingHoursFor] = useState(null);  // status object or null
  const dirty = useRef(false);

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
        Pills auto-toggle Open ↔ Closed based on the weekly hours you set per facility.
        State buttons override (use "Limited" for partial service or "Closed" to force-close
        regardless of hours).
      </p>
      {pills.map(item => {
        const d = draft[item.id] || { state: item.st, staff_note: item.note };
        const summary = summarizeWeek(item.hoursByDay);
        return (
          <div key={item.id} style={{ padding: '13px 14px', background: G.card, borderRadius: 4, marginBottom: 9, border: `1px solid ${G.border}` }}>
            <h4 style={{ fontFamily: '"Playfair Display",serif', fontSize: 14, fontWeight: 700, color: G.text, margin: '0 0 10px' }}>{item.label}</h4>
            {/* State buttons */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {['open', 'limited', 'closed'].map(st => (
                <div key={st} onClick={() => setField(item.id, 'state', st)} data-tap style={{ flex: 1, padding: '6px 0', textAlign: 'center', borderRadius: 3, cursor: 'pointer', background: d.state === st ? gCfg(st).bg : G.bg, border: `1px solid ${d.state === st ? 'transparent' : G.border}`, transition: 'all 0.15s' }}>
                  <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: d.state === st ? '#F2EDE0' : G.muted, textTransform: 'capitalize' }}>{st}</span>
                </div>
              ))}
            </div>
            {/* Weekly hours summary + edit */}
            <div onClick={() => setEditingHoursFor(item)} data-tap style={{ padding: '8px 10px', background: G.bg, borderRadius: 3, border: `1px solid ${G.border}`, cursor: 'pointer', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.text, flex: 1 }}>{summary}</span>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.brass, textDecoration: 'underline', textUnderlineOffset: 2 }}>Edit hours</span>
            </div>
            <input
              value={d.staff_note}
              onChange={e => setField(item.id, 'staff_note', e.target.value)}
              placeholder="Staff note (optional) — shown to members in the pill popover"
              style={{ width: '100%', padding: '8px 10px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 11, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        );
      })}
      <div onClick={publish} data-tap style={{ marginTop: 14, padding: 12, background: savedAt ? G.openBg : G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer', transition: 'background 0.3s' }}>
        <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>
          {busy ? 'Publishing…' : savedAt ? '✓ State + notes published' : 'Publish State + Notes'}
        </span>
      </div>

      {editingHoursFor && (
        <WeeklyHoursModal
          pill={editingHoursFor}
          onClose={() => setEditingHoursFor(null)}
        />
      )}
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
const smInput = { width: '100%', padding: '6px 8px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 12, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' };

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

// ─── Members admin (list, search, add, edit, deactivate, bulk CSV import) ─
function MembersAdmin({ club }) {
  const { isSuperAdmin } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);     // member row or null
  const [showImport, setShowImport] = useState(false);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    if (!club) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('members')
        .select('id, name, membership_number, tier, email, status, user_id, member_since, hcp, locker, cart, parking')
        .eq('club_id', club.id)
        .order('membership_number', { ascending: true });
      if (cancelled) return;
      setRows(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [club?.id, version]);

  const filtered = q
    ? rows.filter(r =>
        (r.name || '').toLowerCase().includes(q.toLowerCase()) ||
        (r.email || '').toLowerCase().includes(q.toLowerCase()) ||
        (r.membership_number || '').toLowerCase().includes(q.toLowerCase())
      )
    : rows;

  return (
    <div>
      <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: '0 0 12px' }}>
        {rows.length} member{rows.length === 1 ? '' : 's'} on the roster.
        Add individuals or import a CSV. Pending members are activated automatically when they sign up with the matching email.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, email, or member #"
          style={{ flex: 1, padding: '9px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' }}
        />
        <div onClick={() => setShowAdd(true)} data-tap style={{ padding: '9px 14px', background: G.green, borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#F2EDE0', fontWeight: 500 }}>+ Add</span>
        </div>
        <div onClick={() => setShowImport(true)} data-tap style={{ padding: '9px 14px', background: G.card, border: `1px solid ${G.border}`, borderRadius: 3, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.text, fontWeight: 500 }}>Import CSV</span>
        </div>
      </div>

      {loading ? <Loading label="Loading members…" /> : (
        <div style={{ background: G.card, borderRadius: 4, border: `1px solid ${G.border}`, overflow: 'hidden' }}>
          {filtered.length === 0 && (
            <p style={{ padding: 16, fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.muted, margin: 0 }}>No members match.</p>
          )}
          {filtered.map((m, i) => (
            <div
              key={m.id}
              onClick={() => setEditing(m)}
              data-tap
              style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${G.border}`, cursor: 'pointer', gap: 8 }}
            >
              <span style={{ width: 36, fontFamily: '"Playfair Display",serif', fontSize: 13, fontWeight: 700, color: G.text }}>#{m.membership_number}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 13, color: G.text, margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email || '— no email —'} · {m.tier || 'Member'}</p>
              </div>
              <StatusChip status={m.status} hasAccount={!!m.user_id} />
            </div>
          ))}
        </div>
      )}

      {showAdd && <MemberEditModal mode="add" club={club} onClose={() => setShowAdd(false)} onSaved={refresh} />}
      {editing && <MemberEditModal mode="edit" club={club} member={editing} canDelete={isSuperAdmin} onClose={() => setEditing(null)} onSaved={refresh} />}
      {showImport && <CsvImportModal club={club} onClose={() => setShowImport(false)} onSaved={refresh} />}
    </div>
  );
}

function StatusChip({ status, hasAccount }) {
  let bg = G.openBg, txt = '#A8D8B8', lbl = 'Active';
  if (status === 'pending' || !hasAccount) { bg = G.limBg; txt = G.limTxt; lbl = 'Pending'; }
  if (status === 'inactive')                { bg = G.muted;  txt = '#F2EDE0'; lbl = 'Inactive'; }
  return (
    <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: txt, background: bg, padding: '2px 8px', borderRadius: 10, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>{lbl}</span>
  );
}

function MemberEditModal({ mode, club, member, canDelete, onClose, onSaved }) {
  const isAdd = mode === 'add';
  const [form, setForm] = useState(() => ({
    name:               member?.name || '',
    membership_number:  member?.membership_number || '',
    email:              member?.email || '',
    tier:               member?.tier || 'Full Member',
    member_since:       member?.member_since || String(new Date().getFullYear()),
    hcp:                member?.hcp || '',
    locker:             member?.locker || '',
    cart:               member?.cart || '',
    parking:            member?.parking || '',
    status:             member?.status || 'pending',
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [invited, setInvited] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true); setErr(null);
    const row = {
      club_id: club.id,
      name: form.name.trim(),
      membership_number: form.membership_number.trim(),
      email: form.email.trim() || null,
      tier: form.tier || null,
      member_since: form.member_since || null,
      hcp: form.hcp || null,
      locker: form.locker || null,
      cart: form.cart || null,
      parking: form.parking || null,
      status: form.status,
    };
    let error;
    if (isAdd) {
      ({ error } = await supabase.from('members').insert(row));
    } else {
      ({ error } = await supabase.from('members').update(row).eq('id', member.id));
    }
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
    onClose();
  };

  const sendInvite = async () => {
    if (!form.email) { setErr('Email is required to send an invite.'); return; }
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: form.email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setInvited(true);
  };

  const remove = async () => {
    if (!confirm(`Delete ${form.name}? This is permanent.`)) return;
    setBusy(true);
    const { error } = await supabase.from('members').delete().eq('id', member.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved?.();
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>{isAdd ? 'Add Member' : 'Edit Member'}</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        <Row>
          <Field label="Full name *"><input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} /></Field>
        </Row>
        <Row>
          <Field label="Member # *"><input value={form.membership_number} onChange={e => set('membership_number', e.target.value)} style={inputStyle} /></Field>
          <Field label="Tier">
            <select value={form.tier} onChange={e => set('tier', e.target.value)} style={selectStyle}>
              {['Full Member','Social Member','Junior Member','Honorary','Other'].map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </Row>
        <Row>
          <Field label="Email"><input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inputStyle} placeholder="invite address" /></Field>
        </Row>
        <Row>
          <Field label="Member since"><input value={form.member_since} onChange={e => set('member_since', e.target.value)} style={inputStyle} placeholder="Year" /></Field>
          <Field label="Handicap"><input value={form.hcp} onChange={e => set('hcp', e.target.value)} style={inputStyle} placeholder="14.2" /></Field>
        </Row>
        <Row>
          <Field label="Locker"><input value={form.locker} onChange={e => set('locker', e.target.value)} style={inputStyle} /></Field>
          <Field label="Cart"><input value={form.cart} onChange={e => set('cart', e.target.value)} style={inputStyle} /></Field>
        </Row>
        <Row>
          <Field label="Parking"><input value={form.parking} onChange={e => set('parking', e.target.value)} style={inputStyle} /></Field>
          <Field label="Status">
            <select value={form.status} onChange={e => set('status', e.target.value)} style={selectStyle}>
              {['active','pending','inactive'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </Field>
        </Row>

        {err && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{err}</p>}
        {invited && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.openBg, marginBottom: 10 }}>✓ Magic-link invite sent to {form.email}. They'll be auto-linked to this record on sign-in.</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <div onClick={save} data-tap style={{ flex: 1, padding: 12, background: G.green, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>{busy ? 'Saving…' : (isAdd ? 'Add Member' : 'Save')}</span>
          </div>
          {form.email && !member?.user_id && (
            <div onClick={sendInvite} data-tap style={{ flex: 1, padding: 12, background: G.brass, borderRadius: 3, textAlign: 'center', cursor: busy ? 'wait' : 'pointer' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: '#F2EDE0', fontWeight: 500 }}>Send Invite</span>
            </div>
          )}
        </div>
        {!isAdd && canDelete && (
          <div onClick={remove} data-tap style={{ marginTop: 10, padding: 8, textAlign: 'center', cursor: 'pointer' }}>
            <span style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, textDecoration: 'underline', textUnderlineOffset: 2 }}>Delete member</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CsvImportModal({ club, onClose, onSaved }) {
  const [csvText, setCsvText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setBusy(true); setResult(null);
    const lines = csvText.split(/\r?\n/).filter(l => l.trim());
    if (!lines.length) { setBusy(false); setResult({ error: 'No rows.' }); return; }
    const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(l => {
      const cells = parseCsvLine(l);
      const obj = {};
      header.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim(); });
      return obj;
    });
    // Required: name + membership_number (or 'member' / 'member_number')
    const out = rows.map(r => ({
      club_id: club.id,
      name: r.name || `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      membership_number: r.membership_number || r.member_number || r.member || r.number || '',
      email: r.email || null,
      tier: r.tier || 'Full Member',
      member_since: r.member_since || r.since || null,
      hcp: r.hcp || r.handicap || null,
      locker: r.locker || null,
      cart: r.cart || null,
      parking: r.parking || null,
      status: 'pending',
    })).filter(r => r.name && r.membership_number);

    if (!out.length) { setBusy(false); setResult({ error: 'No valid rows found. CSV needs at least name + membership_number columns.' }); return; }

    const { data, error } = await supabase.from('members').upsert(out, { onConflict: 'club_id,membership_number' }).select('id');
    setBusy(false);
    if (error) { setResult({ error: error.message }); return; }
    setResult({ ok: data?.length || 0 });
    onSaved?.();
  };

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(26,24,15,0.7)', display: 'flex', alignItems: 'flex-end', zIndex: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.bg, borderRadius: '12px 12px 0 0', padding: '20px 18px 32px', width: '100%', maxHeight: '92%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontFamily: '"Playfair Display",serif', fontSize: 17, fontWeight: 700, color: G.text, margin: 0 }}>Bulk Import Members</h3>
          <div onClick={onClose} data-tap style={{ padding: 4, cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={G.muted} strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </div>
        </div>

        <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, lineHeight: 1.6, margin: '0 0 10px' }}>
          Paste a CSV below. First row = column headers. Required: <code>name</code>, <code>membership_number</code>.
          Optional: <code>email</code>, <code>tier</code>, <code>member_since</code>, <code>hcp</code>, <code>locker</code>, <code>cart</code>, <code>parking</code>.
          New members are added with <strong>Pending</strong> status; they activate when they sign up with the matching email.
          Existing membership numbers are updated.
        </p>

        <textarea
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          placeholder={'name,membership_number,email,tier\nMarc Abla,0001,marc@example.com,Full Member\nMatt Bohlmann,0002,matt@example.com,Full Member'}
          style={{ width: '100%', height: 200, padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: 'monospace', fontSize: 11, color: G.text, background: '#F8F4EC', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
        />

        {result?.error && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.clsDot, marginBottom: 10 }}>{result.error}</p>}
        {result?.ok && <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.openBg, marginBottom: 10 }}>✓ Imported / updated {result.ok} member{result.ok === 1 ? '' : 's'}.</p>}

        <div onClick={run} data-tap style={{ padding: 12, background: csvText && !busy ? G.green : G.border, borderRadius: 3, textAlign: 'center', cursor: csvText && !busy ? 'pointer' : 'not-allowed' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 13, color: csvText && !busy ? '#F2EDE0' : G.muted, fontWeight: 500 }}>{busy ? 'Importing…' : 'Import'}</span>
        </div>
      </div>
    </div>
  );
}

// Minimal CSV row parser — handles quoted fields with commas.
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
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
const inputStyle = { width: '100%', padding: '10px 12px', border: `1px solid ${G.border}`, borderRadius: 3, fontFamily: '"Lora",serif', fontSize: 13, color: G.text, background: '#F8F4EC', outline: 'none', boxSizing: 'border-box' };
const selectStyle = { ...inputStyle };
