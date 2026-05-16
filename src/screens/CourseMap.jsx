import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

// MapTiler key — set in .env.local as VITE_MAPTILER_KEY
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
// Style options: 'hybrid' (sat + labels), 'satellite' (pure sat), 'outdoor-v2', etc.
// Hybrid gives nearby road/place labels for orientation around the course.
const STYLE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`
  : null;

export default function CourseMap() {
  const { club } = useAuth();
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const [zoomed, setZoomed] = useState(false);

  const lat = club?.lat ?? 41.6032;
  const lng = club?.lng ?? -73.0877;

  useEffect(() => {
    if (!STYLE_URL || !mapEl.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: mapEl.current,
      style: STYLE_URL,
      center: [lng, lat],
      zoom: 15.5,
      pitch: 45,
      bearing: -17,
      attributionControl: false,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
    mapRef.current.addControl(new maplibregl.AttributionControl({ compact: true }));

    new maplibregl.Marker({ color: '#9B7A1E' })
      .setLngLat([lng, lat])
      .setPopup(new maplibregl.Popup({ offset: 24 }).setHTML(`<strong>${club?.name || 'Clubhouse'}</strong>`))
      .addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lng, lat]);

  const toggleZoom = () => {
    if (!mapRef.current) return;
    if (zoomed) mapRef.current.flyTo({ zoom: 15.5, pitch: 45, duration: 800 });
    else        mapRef.current.flyTo({ zoom: 17,   pitch: 60, duration: 800 });
    setZoomed(!zoomed);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Course Map" />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#2A4020' }}>
        {STYLE_URL ? (
          <>
            <div ref={mapEl} style={{ position: 'absolute', inset: 0 }} onClick={toggleZoom} />
            <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(27,58,45,0.85)', borderRadius: 3, padding: '6px 10px', pointerEvents: 'none' }}>
              <span style={{ fontFamily: '"Playfair Display",serif', fontSize: 11, fontStyle: 'italic', color: '#A8D8B8' }}>
                {club?.yardage ? `${club.yardage.toLocaleString()} yards` : '6,840 yards'} · Par {club?.par || 72}
              </span>
            </div>
            <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.55)', borderRadius: 3, padding: '6px 10px', pointerEvents: 'none' }}>
              <span style={{ fontFamily: '"Lora",serif', fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>Tap map to {zoomed ? 'zoom out' : 'zoom in'}</span>
            </div>
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
            <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 16, color: '#A8D8B8', margin: '0 0 8px' }}>Satellite map unavailable</p>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: '#7AAC88', lineHeight: 1.6 }}>Add VITE_MAPTILER_KEY to .env.local and restart the dev server.</p>
          </div>
        )}
      </div>
    </div>
  );
}
