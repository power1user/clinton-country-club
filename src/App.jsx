import { useEffect } from 'react';
import { NavProvider, useNav } from './hooks/useNav.jsx';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
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
import EventDetail from './screens/EventDetail.jsx';
import BulletinBoard from './screens/BulletinBoard.jsx';
import MyClub from './screens/MyClub.jsx';
import MemberCard from './screens/MemberCard.jsx';
import ProShop from './screens/ProShop.jsx';
import LessonRequest from './screens/LessonRequest.jsx';
import OnboardingGuide from './screens/OnboardingGuide.jsx';
import AdminPanel from './screens/AdminPanel.jsx';

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
  'community/event': EventDetail,
  'community/bulletin': BulletinBoard,
  myclub: MyClub,
  'myclub/card': MemberCard,
  'myclub/proshop': ProShop,
  'myclub/lessons': LessonRequest,
  'myclub/onboarding': OnboardingGuide,
  'myclub/admin': AdminPanel,
};

const TAB_ROOTS = new Set(['home', 'golf', 'food', 'community', 'myclub']);

function ScreenRenderer() {
  const { current, animKey, dir } = useNav();
  const Comp = SCREENS[current.id];
  if (!Comp) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: G.bg }}>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', color: G.muted }}>Screen not found: {current.id}</p>
      </div>
    );
  }
  const isRoot = TAB_ROOTS.has(current.id);
  const animClass = dir === 'forward' ? 'screen-forward' : dir === 'back' ? 'screen-back' : 'screen-tab';

  return (
    <div key={animKey} className={animClass} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
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
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 11, color: '#7AAC88', letterSpacing: '0.3em', textTransform: 'uppercase', margin: '0 0 4px' }}>{club?.name || 'Your club'}</p>
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
  const { session, loading, isConfigured, isPendingLocked } = useAuth();

  if (loading) {
    // First-open splash with parent-brand attribution. Briefly visible
    // before the club row resolves; if that goes well users won't even
    // notice it.
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: G.green, padding: 32 }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 11, color: '#7AAC88', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0 }}>{PLATFORM_NAME}</p>
        <h1 style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 28, fontWeight: 700, color: '#F2EDE0', margin: '8px 0 6px', textAlign: 'center', lineHeight: 1.2 }}>
          {PLATFORM_TAGLINE}
        </h1>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: '#7AAC88', margin: 0 }}>Loading your club…</p>
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
