// Sponsor banner — paid add-on placement (v0.10.2).
//
// Renders a banner image with an optional tap-through to the
// sponsor's URL (opens in a new tab). A subtle "Sponsored" label
// in the corner makes the placement honest — members understand
// what they're looking at without it feeling like a billboard.
//
// Two real placements at launch:
//   · location='home_feed' — injected into the Home news feed
//     after the 2nd post (or the last post if fewer than 2)
//   · location='golf_tab'  — bottom of the Golf tab, above the
//     footer/page padding
//
// Gating is two-layer:
//   1. The sponsor_banners FEATURE FLAG must be on (manager
//      preference; the resolution in features.js already accounts
//      for tier, addon purchase, platform lock).
//   2. The club must have at least one ACTIVE banner for the
//      target location within the active_from/active_to window.
//
// If either gate is closed, the component renders nothing — no
// gap, no placeholder. Always-on realtime so a manager publishing
// a new banner sees it appear on members' devices within seconds.

import { useEffect, useState } from 'react';
import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useFlag } from '../hooks/useFlag.js';
import { supabase, isConfigured } from '../lib/supabase.js';

// Hook to load the active banner for a given location. Returns the
// first matching record (by sort_order, then most-recently created)
// or null. Realtime — re-resolves when sponsor_banners rows change.
export function useActiveSponsorBanner(location) {
  const { club } = useAuth();
  const flagOn = useFlag('sponsor_banners');
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    if (!isConfigured || !club?.id || !flagOn || !location) { setBanner(null); return; }
    let cancelled = false;
    const now = () => new Date().toISOString();
    const load = async () => {
      const { data } = await supabase
        .from('sponsor_banners')
        .select('id, sponsor_name, image_url, link_url, location, active, active_from, active_to, sort_order')
        .eq('club_id', club.id)
        .eq('location', location)
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (cancelled) return;
      // Apply the active_from / active_to window in JS — Postgres
      // would do it server-side via .or() / .and() too, but keeping
      // it client-side makes "currently active" vs "scheduled" easy
      // to debug and means a tab open across midnight transitions
      // doesn't need a refresh.
      const t = now();
      const within = (b) =>
        (!b.active_from || b.active_from <= t) &&
        (!b.active_to   || b.active_to   >= t);
      const live = (data || []).filter(within);
      setBanner(live[0] || null);
    };
    load();
    const channel = supabase
      .channel(`sponsor_banner:${club.id}:${location}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sponsor_banners', filter: `club_id=eq.${club.id}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [club?.id, flagOn, location]);

  return banner;
}

// SponsorBanner — renders an active banner for the given location,
// or nothing. Used by Home (location='home_feed') and GolfHub
// (location='golf_tab'). Drop-in: pass the location prop, the
// component handles loading + flag gating + render entirely.
export default function SponsorBanner({ location, style }) {
  const banner = useActiveSponsorBanner(location);
  if (!banner) return null;

  const openLink = (e) => {
    if (!banner.link_url) return;
    e.preventDefault();
    e.stopPropagation();
    // External tab so we don't lose the member's spot in the app.
    // noopener prevents the destination from messing with the
    // opener context (security defense for sponsor sites of
    // unknown quality).
    window.open(banner.link_url, '_blank', 'noopener,noreferrer');
  };

  const interactive = !!banner.link_url;

  return (
    <div
      onClick={interactive ? openLink : undefined}
      data-tap={interactive ? '' : undefined}
      role={interactive ? 'link' : undefined}
      aria-label={interactive ? `Sponsored: ${banner.sponsor_name}` : undefined}
      style={{
        position: 'relative',
        background: G.card,
        border: `1px solid ${G.border}`,
        borderRadius: 6,
        overflow: 'hidden',
        cursor: interactive ? 'pointer' : 'default',
        ...style,
      }}
    >
      {banner.image_url ? (
        <img
          src={banner.image_url}
          alt={banner.sponsor_name || 'Sponsor'}
          style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 180, objectFit: 'cover' }}
        />
      ) : (
        // Text-only fallback for sponsors who haven't uploaded an
        // image yet. Keeps the placement working while the
        // manager gets the asset together.
        <div style={{ padding: '20px 16px', textAlign: 'center' }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 16, fontWeight: 700, color: G.text, margin: 0 }}>
            {banner.sponsor_name}
          </p>
        </div>
      )}
      <span style={{
        position: 'absolute', top: 6, right: 6,
        background: 'rgba(26,24,15,0.65)',
        color: '#F2E5C0',
        fontFamily: '"Lora",serif', fontSize: 9,
        padding: '2px 7px', borderRadius: 10,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        fontWeight: 600,
      }}>
        Sponsored
      </span>
    </div>
  );
}
