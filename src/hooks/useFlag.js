// useFlag('dms') → boolean
//
// Reads the current club from useAuth() and resolves the flag against
// the catalog in src/lib/features.js. Returns false while the club
// hasn't loaded yet (SSR-safe, login-screen-safe).
//
// Use this for branching in components:
//   const dmsOn = useFlag('dms');
//   if (!dmsOn) return null;
import { useAuth } from './useAuth.jsx';
import { isFeatureOn } from '../lib/features.js';

export function useFlag(flagKey) {
  const { club } = useAuth();
  return isFeatureOn(club, flagKey);
}
