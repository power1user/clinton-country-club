import { useEffect, useRef, useMemo } from 'react';
import { NavProvider, useNav } from './hooks/useNav.jsx';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import { useFlag } from './hooks/useFlag.js';
import BottomNav from './components/BottomNav.jsx';
import { G } from './theme.js';
import { PLATFORM_NAME, PLATFORM_TAGLINE } from './lib/version.js';
import { registerServiceWorker, isPushSupported } from './lib/push.js';

import Login from './screens/Login.jsx';
import Home from './screens/Home.jsx';
import NewsDetail from './screens/NewsDetail.jsx';
import Inbox from './screens/Inbox.jsx';
import Thread from './screens/Thread.jsx';
import MessageClubhouse from './screens/MessageClubhouse.jsx';
import MemberDirectory from './screens/MemberDirectory.jsx';
import GolfHub from './screens/GolfHub.jsx';
import PinMap from './screens/PinMap.jsx';
import CourseMap from './screens/CourseMap.jsx';
import TeeTime from './screens/TeeTime.jsx';
import PartnerBoard from './screens/PartnerBoard.jsx';
import FoodMenu from './screens/FoodMenu.jsx';
import CourseOrder from './screens/CourseOrder.jsx';
import OrderConfirm from './screens/OrderConfirm.jsx';
import Events from './screens/Events.jsx';
import EventsCalendar from './screens/EventsCalendar.jsx';
import EventDetail from './screens/EventDetail.jsx';
import BulletinBoard from './screens/BulletinBoard.jsx';
import MyClub from './screens/MyClub.jsx';
import MemberCard from './screens/MemberCard.jsx';
import ProShop from './screens/ProShop.jsx';
import MyInquiries from './screens/MyInquiries.jsx';
import LessonRequest from './screens/LessonRequest.jsx';
import OnboardingGuide from './screens/OnboardingGuide.jsx';
import AdminPanel from './screens/AdminPanel.jsx';
import Settings from './screens/Settings.jsx';
import TermsGate from './screens/TermsGate.jsx';

const SCREENS = {
  home: Home,
  'home/news': NewsDetail,
  inbox: Inbox,
  thread: Thread,
  'message-clubhouse': MessageClubhouse,
  'member-directory': MemberDirectory,
  golf: GolfHub,
  'golf/pin': PinMap,
  'golf/map': CourseMap,
  'golf/tee': TeeTime,
  'golf/partners': PartnerBoard,
  food: FoodMenu,
  'food/order': CourseOrder,
  'food/confirm': OrderConfirm,
  community: Events,
  'community/calendar': EventsCalendar,
  'community/event': EventDetail,
  'community/bulletin': BulletinBoard,
  myclub: MyClub,
  'myclub/card': MemberCard,
  'myclub/proshop': ProShop,
  'myclub/proshop/inquiries': MyInquiries,
  'myclub/lessons': LessonRequest,
  'myclub/onboarding': OnboardingGuide,
  'myclub/admin': AdminPanel,
  'myclub/settings': Settings,
};

// Full tab list — used for the "is this a tab root?" check (membership in
// this set turns horizontal swipe ON). Stays static; food remains a tab
// root whether or not the flag is on, because direct navigation to /food
// should still render its FeatureOff screen + allow swiping off it.
const ALL_TABS = ['home', 'golf', 'food', 'community', 'myclub'];
const TAB_ROOTS = new Set(ALL_TABS);

// Swipe thresholds tuned by feel on iPhone:
//   · 60px or more of horizontal travel, OR a fast flick (>0.4 px/ms)
//   · horizontal movement must dominate (locked once Math.abs(dx) > dy)
//   · start point must be 30+ px from each edge so we don't fight iOS
//     Safari's edge-swipe-back gesture
const SWIPE_MIN_PX = 60;
const SWIPE_MIN_VELOCITY = 0.4;   // px / ms
const SWIPE_EDGE_GUARD = 30;
const SWIPE_AXIS_LOCK_PX = 8;     // delta before we decide horizontal vs vertical

function ScreenRenderer() {
  const { current, animKey, dir, tab, goTab } = useNav();
  const touchRef = useRef(null);
  // Phase 7: swipe order respects the food_ordering flag so swiping
  // from Golf goes to Community (not the FeatureOff for Food). The
  // BottomNav already hides the Food tab when off, so this just keeps
  // the gesture aligned with what the bottom nav shows.
  const foodOn = useFlag('food_ordering');
  const TAB_ORDER = useMemo(
    () => ALL_TABS.filter(t => t !== 'food' || foodOn),
    [foodOn]
  );

  const Comp = SCREENS[current.id];
  const isRoot = TAB_ROOTS.has(current.id);

  // Touch handlers — only activate at tab roots. Drilled-down screens
  // (Thread, EventDetail, OrderConfirm, etc.) shouldn't horizontal-swipe
  // because they often contain horizontally-scrollable content of their
  // own (chat bubbles, image carousels in future) and the gesture would
  // feel like a back navigation, not a tab change.
  const onTouchStart = (e) => {
    if (!isRoot) { touchRef.current = null; return; }
    const t = e.touches[0];
    if (!t) return;
    const w = (typeof window !== 'undefined' ? window.innerWidth : 0) ||
              document.documentElement.clientWidth;
    // Edge guard — leave iOS Safari's edge-swipe-back gesture alone
    if (t.clientX < SWIPE_EDGE_GUARD || t.clientX > w - SWIPE_EDGE_GUARD) {
      touchRef.current = null; return;
    }
    touchRef.current = { x0: t.clientX, y0: t.clientY, t0: Date.now(), axis: null };
  };

  const onTouchMove = (e) => {
    const s = touchRef.current;
    if (!s) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - s.x0;
    const dy = t.clientY - s.y0;
    if (s.axis === null && (Math.abs(dx) > SWIPE_AXIS_LOCK_PX || Math.abs(dy) > SWIPE_AXIS_LOCK_PX)) {
      s.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
  };

  const onTouchEnd = (e) => {
    const s = touchRef.current;
    touchRef.current = null;
    if (!s || s.axis !== 'h') return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - s.x0;
    const elapsed = Math.max(1, Date.now() - s.t0);
    const passed = Math.abs(dx) >= SWIPE_MIN_PX ||
                   (Math.abs(dx) / elapsed) >= SWIPE_MIN_VELOCITY;
    if (!passed) return;
    const idx = TAB_ORDER.indexOf(tab);
    if (idx === -1) return;
    // Swipe left  (dx < 0) → reveal next tab (idx + 1)
    // Swipe right (dx > 0) → reveal previous tab (idx - 1)
    const next = idx + (dx < 0 ? 1 : -1);
    if (next < 0 || next >= TAB_ORDER.length) return;       // stop at edges
    goTab(TAB_ORDER[next]);
  };

  if (!Comp) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: G.bg }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', color: G.muted }}>Screen not found: {current.id}</p>
      </div>
    );
  }
  // 'tab-forward' / 'tab-back' get a lighter, shorter slide than full
  // forward/back drill-downs — keeps the lateral move feeling sideways
  // rather than nested. Plain 'tab' (same tab) falls back to fade.
  const animClass =
    dir === 'forward'     ? 'screen-forward' :
    dir === 'back'        ? 'screen-back' :
    dir === 'tab-forward' ? 'screen-tab-forward' :
    dir === 'tab-back'    ? 'screen-tab-back' :
                            'screen-tab';

  return (
    <div
      key={animKey}
      className={animClass}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}
    >
      <Comp params={current.params} />
      {isRoot && <BottomNav />}
    </div>
  );
}

function PendingLockedSplash() {
  const { club, signOut } = useAuth();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: G.bg }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <div style={{ background: G.green, padding: '20px 24px 28px', flexShrink: 0, textAlign: 'center' }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 11, color: '#A8D8B8', letterSpacing: '0.3em', textTransform: 'uppercase', margin: '0 0 4px' }}>{club?.name || 'Your club'}</p>
        <h1 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 24, fontWeight: 700, color: '#F2EDE0', margin: 0 }}>Awaiting Approval</h1>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={G.brass} strokeWidth="1.5" style={{ marginBottom: 16 }}>
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, lineHeight: 1.6, margin: '0 0 18px', maxWidth: 320 }}>
          Thanks for signing up. Your membership is pending approval from the {club?.name || 'club'} office. They'll review your information and unlock your account.
        </p>
        {(club?.contact_phone || club?.contact_email) && (
          <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, padding: '14px 18px', width: '100%', maxWidth: 340 }}>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>Need to follow up?</p>
            {club.contact_phone && (
              <a href={`tel:${club.contact_phone.replace(/[^+\d]/g, '')}`} style={{ display: 'block', fontFamily: '"Lora",serif', fontSize: 14, color: G.text, textDecoration: 'none', margin: '4px 0' }}>{club.contact_phone}</a>
            )}
            {club.contact_email && (
              <a href={`mailto:${club.contact_email}`} style={{ display: 'block', fontFamily: '"Lora",serif', fontSize: 14, color: G.text, textDecoration: 'none', margin: '4px 0' }}>{club.contact_email}</a>
            )}
          </div>
        )}
        <div onClick={signOut} data-tap style={{ marginTop: 28, padding: '10px 16px', cursor: 'pointer' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted, textDecoration: 'underline', textUnderlineOffset: 2 }}>Sign out</span>
        </div>
      </div>
    </div>
  );
}

function Gate() {
  const { session, loading, isConfigured, isPendingLocked, needsTermsAcceptance } = useAuth();

  if (loading) {
    // First-open splash with parent-brand attribution. Briefly visible
    // before the club row resolves; if that goes well users won't even
    // notice it.
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: G.green, padding: 32 }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 11, color: '#A8D8B8', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>{PLATFORM_NAME}</p>
        <h1 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 28, fontWeight: 700, color: '#F2EDE0', margin: '8px 0 6px', textAlign: 'center', lineHeight: 1.2 }}>
          {PLATFORM_TAGLINE}
        </h1>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: '#A8D8B8', margin: 0 }}>Loading your club…</p>
      </div>
    );
  }

  // If supabase isn't configured (no env vars), let the prototype run with mock data.
  if (!isConfigured) {
    return (
      <NavProvider>
        <ScreenRenderer />
      </NavProvider>
    );
  }

  if (!session) {
    return <Login />;
  }

  // Manager has set this club to 'locked' for pending members and this
  // user is still pending — show the splash + nothing else.
  if (isPendingLocked) {
    return <PendingLockedSplash />;
  }

  // Member hasn't accepted the current ToU version. Gate every screen
  // behind acceptance — this fires both on first login and after a
  // version bump. (Comes AFTER pending-locked so unapproved members
  // don't see terms before they're approved.)
  if (needsTermsAcceptance) {
    return <TermsGate />;
  }

  return (
    <NavProvider>
      <ScreenRenderer />
    </NavProvider>
  );
}

export default function App() {
  // Register the service worker once on first mount. Push subscription
  // itself is opt-in (via the banner on the Inbox screen) — this just
  // makes the SW available so the subscribe() call works later.
  useEffect(() => {
    if (isPushSupported()) {
      registerServiceWorker().catch(() => { /* logged inside */ });
    }
  }, []);

  return (
    <div className="phone-frame">
      <div className="app-root">
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </div>
    </div>
  );
}
