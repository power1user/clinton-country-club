import { createContext, useContext, useEffect, useRef, useState } from 'react';

// Tab-keyed stack navigation + browser-history integration + scroll restore.
//
// Each push() pushes a new entry onto the current tab's stack AND a new
// state into window.history. pop() delegates to history.back(); the
// popstate listener is what actually mutates the in-app stack. That
// means the browser back button, iOS Safari edge-swipe, and Android
// system back all behave identically to the in-app back arrow: each
// click pops one in-app screen until you're at a tab root, then the
// next click leaves the app.
//
// Tab switches (goTab) do NOT push to browser history — they're a
// sideways move, not a drill-down. Matches phone UX.
//
// _saveScroll / _restoreScroll are exposed for useScrollRestore so each
// screen's scroll position survives a back-and-forward round trip.
const NavCtx = createContext(null);

const TABS = ['home', 'golf', 'food', 'community', 'myclub'];

// v0.9.8: Safe price-to-number coercion. menus.price is nullable text;
// admins also enter free-form values like "Market" or "Half $15 / Full
// $25". Anything that doesn't parse cleanly becomes 0 so cart math
// can't crash the renderer. Exported so CourseOrder can use the same
// rules to display row totals.
export function priceToNumber(p) {
  if (p == null) return 0;
  const cleaned = String(p).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}
const ROOT_KEY = (tab) => `tab:${tab}`;

export function NavProvider({ children }) {
  const [tab, setTab] = useState('home');
  const [stacks, setStacks] = useState({ home: [], golf: [], food: [], community: [], myclub: [] });
  const [dir, setDir] = useState('forward');
  const [animKey, setAnimKey] = useState(0);
  const [cart, setCart] = useState([]);

  // Latest values in refs so the one-shot popstate listener can read them
  const tabRef = useRef(tab);
  const stacksRef = useRef(stacks);
  useEffect(() => { tabRef.current = tab; }, [tab]);
  useEffect(() => { stacksRef.current = stacks; }, [stacks]);

  // Monotonically increasing nav id stamped on every history entry. Lets
  // popstate distinguish back (state.navId < current) from forward
  // (state.navId > current) without depending on URL parsing.
  const navIdRef = useRef(0);

  // Scroll-position store keyed by entry.key (or ROOT_KEY(tab) for tab
  // roots). Lives in a ref so scroll events don't trigger re-renders.
  const scrollStoreRef = useRef({});

  // Anchor the initial history entry so the very first browser-back
  // exits the app cleanly instead of dropping us into a half-popped state.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.replaceState({ tag: 'app-root', navId: 0 }, '');
  }, []);

  // popstate: browser back / forward / system back gesture
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = (e) => {
      const incoming = e.state?.navId ?? 0;
      const direction = incoming < navIdRef.current ? 'back' : 'forward';
      navIdRef.current = incoming;
      if (direction === 'back') {
        // Pop one entry off the current tab's stack (no-op if empty;
        // the next browser-back will then leave the app).
        const t = tabRef.current;
        setDir('back');
        setAnimKey(k => k + 1);
        setStacks(p => ({ ...p, [t]: p[t].slice(0, -1) }));
      }
      // Forward navigation isn't fully restorable (we don't keep params
      // in the URL) — best to no-op rather than render a half-state.
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const current = (() => {
    const s = stacks[tab];
    return s.length > 0 ? s[s.length - 1] : { id: tab, params: {} };
  })();

  const push = (id, params = {}) => {
    const key = `e:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    setDir('forward');
    setAnimKey(k => k + 1);
    setStacks(p => ({ ...p, [tab]: [...p[tab], { id, params, key }] }));
    if (typeof window !== 'undefined') {
      navIdRef.current += 1;
      window.history.pushState({ tag: 'in-app', navId: navIdRef.current, tab, screen: id }, '');
    }
  };

  // Delegate to the browser; popstate handler does the in-app mutation.
  const pop = () => {
    if (typeof window !== 'undefined' && stacksRef.current[tabRef.current].length > 0) {
      window.history.back();
    }
  };

  const goTab = (t, opts = {}) => {
    // Pick a directional slide based on where the new tab sits in
    // TABS relative to the current. Right-ward (e.g. Home → Golf)
    // gets 'tab-forward' (slides in from the right, matching a
    // swipe-left gesture). Left-ward (Community → Home) gets
    // 'tab-back'. Same tab → generic fade.
    const fromIdx = TABS.indexOf(tab);
    const toIdx = TABS.indexOf(t);
    const tabDir = toIdx > fromIdx ? 'tab-forward' :
                   toIdx < fromIdx ? 'tab-back' :
                                     'tab';
    setDir(tabDir);
    setAnimKey(k => k + 1);
    if (opts.reset) {
      setStacks(p => ({ ...p, [t]: [] }));
    }
    setTab(t);
    // Intentionally no history push — tab switches are sideways moves.
  };

  const canPop = stacks[tab].length > 0;

  // ── Scroll restore plumbing (consumed by useScrollRestore) ──
  const _scrollKey = () => {
    const s = stacksRef.current[tabRef.current];
    return s.length > 0 ? s[s.length - 1].key : ROOT_KEY(tabRef.current);
  };
  const _saveScroll = (y) => {
    scrollStoreRef.current[_scrollKey()] = y;
  };
  const _restoreScroll = () => scrollStoreRef.current[_scrollKey()] || 0;

  // ── Cart (unchanged) ──
  const addToCart = (item) => setCart(p => {
    const ex = p.find(i => i.id === item.id);
    if (ex) return p.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
    return [...p, { ...item, qty: 1 }];
  });
  const removeFromCart = (id) => setCart(p => {
    const ex = p.find(i => i.id === id);
    if (ex && ex.qty > 1) return p.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i);
    return p.filter(i => i.id !== id);
  });
  const clearCart = () => setCart([]);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  // v0.9.8: defensive coercion. menus.price is nullable text and the
  // admin allows "Market"-style free-form strings. The old direct
  // `.replace('$','')` threw TypeError on null/undefined → React
  // unmounted the whole tree → black screen the moment a null-priced
  // item (e.g. any dessert) hit the cart. priceToNumber() returns 0
  // for any unparseable price so the cart math survives.
  const cartTotal = cart.reduce((s, i) => s + i.qty * priceToNumber(i.price), 0).toFixed(2);

  return (
    <NavCtx.Provider value={{
      tab, current, push, pop, goTab, canPop, dir, animKey,
      _saveScroll, _restoreScroll,
      cart, addToCart, removeFromCart, clearCart, cartCount, cartTotal,
    }}>
      {children}
    </NavCtx.Provider>
  );
}

export function useNav() {
  return useContext(NavCtx);
}
