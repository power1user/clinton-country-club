import { useAuth } from './useAuth.jsx';

// Single source of truth for club branding. Every screen reads from here so
// the whole app rebrands by updating the `clubs` row.
export function useBrand() {
  const { club } = useAuth();
  const full = club?.name || 'Clinton Country Club';
  // "Clinton Country Club" → prefix = "Clinton", tagline = "Country Club"
  // Fallback for anything not in "<Word> Country Club" form: full name as prefix.
  const m = full.match(/^(.+?)\s+(Country\s+Club|Golf\s+Club|CC)\s*$/i);
  const prefix  = m ? m[1] : full;
  const tagline = m ? m[2] : '';
  return {
    full,
    prefix,
    tagline,
    founded:   club?.founded || 1921,
    city:      club?.city || 'Clinton',
    state:     club?.state || 'IL',
    cityState: club ? `${club.city}, ${club.state}` : 'Clinton, IL',
    holes:     club?.holes || 9,
    par:       club?.par || 35,
    yardage:   club?.yardage || 2900,
  };
}
