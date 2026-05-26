import { G } from '../theme.js';
import { useNav } from '../hooks/useNav.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { useAuth } from '../hooks/useAuth.jsx';
import NavIcon from './NavIcon.jsx';

export default function BottomNav() {
  const { tab, goTab, cartCount } = useNav();
  const { isGuest, guestAccessLevel } = useAuth();
  // Phase 7 — when food_ordering is off the whole Food tab disappears
  // from the bottom nav (the screen itself also returns FeatureOff if
  // a member somehow navigates to it directly). Home / Golf / Community
  // / MyClub are always visible because they each carry mixed content
  // that's gated per-tile inside.
  const foodOn = useFlag('food_ordering');

  // v0.8.2: guests see a smaller tab set based on access level.
  //   data_only: never reaches here — see App.jsx Gate redirect.
  //   read_only: Home, Golf, Food, MyClub (Community has no readable
  //     content at this level — calendar is full_temp only, bulletin
  //     and directory are always hidden).
  //   full_temporary: above + Community (calendar visible).
  // Food tab stays visible to guests because the MENU is allowed
  // (per the spec); the cart/order CTAs hide inside the screen at
  // v0.8.5.
  const showCommunity = !isGuest || guestAccessLevel === 'full_temporary';

  const tabs = [
    { id: 'home',      l: 'Home' },
    { id: 'golf',      l: 'Golf' },
    foodOn && { id: 'food', l: 'Food & Drink' },
    showCommunity && { id: 'community', l: 'Community' },
    { id: 'myclub',    l: 'My Club' },
  ].filter(Boolean);
  return (
    <div style={{
      background: G.greenDk,
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexShrink: 0,
      // iOS standalone PWAs draw the home-indicator below the viewport.
      // env(safe-area-inset-bottom) gives the OS reserved space + a small
      // extra cushion so nav labels never touch the indicator.
      padding: '8px 4px max(20px, calc(env(safe-area-inset-bottom) + 8px))',
    }}>
      {tabs.map(t => (
        <div
          key={t.id}
          onClick={() => goTab(t.id)}
          data-tap
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', padding: '4px 0', position: 'relative' }}
        >
          <NavIcon id={t.id} active={tab === t.id} />
          {t.id === 'food' && cartCount > 0 && (
            <span style={{ position: 'absolute', top: 0, right: '18%', background: G.brass, color: '#fff', fontSize: 8, fontFamily: '"Lora",serif', fontWeight: 700, width: 14, height: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartCount}</span>
          )}
          <span style={{ fontFamily: '"Lora",serif', fontSize: 9, color: tab === t.id ? G.brass : '#A8D8B8', textAlign: 'center', lineHeight: 1.2 }}>{t.l}</span>
        </div>
      ))}
    </div>
  );
}
