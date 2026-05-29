import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { init as initAnalytics } from './lib/analytics.js';

// v0.10.16 — bootstrap GA4 once at app start. If the env var isn't
// set (local dev, or production before the property is created),
// init() silently no-ops and every later trackEvent is a cheap
// no-op too. Safe to ship without an ID; nothing leaks until Marc
// fills in VITE_GA4_MEMBER_ID.
initAnalytics(import.meta.env.VITE_GA4_MEMBER_ID);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
