import { G } from '../theme.js';

export default function NavIcon({ id, active }) {
  const clr = active ? G.brass : '#446854';
  const icons = {
    home:      <path d="M7.5 2L1 8v7h5v-5h3v5h5V8L7.5 2z" strokeWidth="1.3" fill="none" />,
    golf:      <><circle cx="8" cy="12" r="3" strokeWidth="1.3" fill="none" /><path d="M8 9V3m0 0l4 2" strokeWidth="1.3" fill="none" /></>,
    food:      <><path d="M5 3v5a3 3 0 006 0V3" strokeWidth="1.3" fill="none" /><path d="M8 8v6m4-11v11" strokeWidth="1.3" fill="none" /></>,
    community: <><circle cx="6" cy="6" r="2.5" strokeWidth="1.3" fill="none" /><circle cx="11" cy="6" r="2.5" strokeWidth="1.3" fill="none" /><path d="M2 15c0-2.8 1.8-4.5 4-4.5h5c2.2 0 4 1.7 4 4.5" strokeWidth="1.3" fill="none" /></>,
    myclub:    <><rect x="3" y="4" width="11" height="8" rx="1.5" strokeWidth="1.3" fill="none" /><path d="M6 8h5M6 6h5" strokeWidth="1.3" fill="none" /></>,
  };
  return <svg width="20" height="20" viewBox="0 0 16 16" stroke={clr} fill="none">{icons[id] || icons.home}</svg>;
}
