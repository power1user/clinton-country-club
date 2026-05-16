import { createContext, useContext, useState } from 'react';

// Tab-keyed stack navigation + cart. Ported from tg-core.jsx NavProvider.
const NavCtx = createContext(null);

export function NavProvider({ children }) {
  const [tab, setTab] = useState('home');
  const [stacks, setStacks] = useState({ home: [], golf: [], food: [], community: [], myclub: [] });
  const [dir, setDir] = useState('forward');
  const [animKey, setAnimKey] = useState(0);
  const [cart, setCart] = useState([]);

  const current = (() => {
    const s = stacks[tab];
    return s.length > 0 ? s[s.length - 1] : { id: tab, params: {} };
  })();

  const push = (id, params = {}) => {
    setDir('forward');
    setAnimKey(k => k + 1);
    setStacks(p => ({ ...p, [tab]: [...p[tab], { id, params }] }));
  };
  const pop = () => {
    setDir('back');
    setAnimKey(k => k + 1);
    setStacks(p => ({ ...p, [tab]: p[tab].slice(0, -1) }));
  };
  const goTab = (t) => {
    setDir('tab');
    setAnimKey(k => k + 1);
    setTab(t);
  };
  const canPop = stacks[tab].length > 0;

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
  const cartTotal = cart.reduce((s, i) => s + i.qty * parseFloat(i.price.replace('$', '')), 0).toFixed(2);

  return (
    <NavCtx.Provider value={{ tab, current, push, pop, goTab, canPop, dir, animKey, cart, addToCart, removeFromCart, clearCart, cartCount, cartTotal }}>
      {children}
    </NavCtx.Provider>
  );
}

export function useNav() {
  return useContext(NavCtx);
}
