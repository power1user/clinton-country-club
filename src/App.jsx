import { NavProvider, useNav } from './hooks/useNav.jsx';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import BottomNav from './components/BottomNav.jsx';
import { G } from './theme.js';

import Login from './screens/Login.jsx';
import Home from './screens/Home.jsx';
import NewsDetail from './screens/NewsDetail.jsx';
import Notifications from './screens/Notifications.jsx';
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
  'home/notifications': Notifications,
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

function Gate() {
  const { session, loading, isConfigured } = useAuth();

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: G.green }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: '#7AAC88' }}>Loading…</p>
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

  return (
    <NavProvider>
      <ScreenRenderer />
    </NavProvider>
  );
}

export default function App() {
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
