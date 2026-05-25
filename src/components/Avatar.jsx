// Avatar — single source of truth for "show this member's face."
// Used everywhere: membership card, directory, bulletin/partner
// posts, message bubbles. Falls back to an initials circle when no
// photo, or when the club has the profile_photos feature flag off.
//
// Props:
//   photoUrl  — full public URL from members.photo_url (may be null)
//   name      — display name; first letter used for the initial fallback
//   size      — pixel diameter of the avatar (default 32)
//   bgColor   — initials-circle background; defaults to G.green (club brand)
//   fgColor   — initials letter color; defaults to bright sage
//
// We honor the feature flag at the consumer level — Avatar itself
// just renders what it's told. That keeps it usable for staff icons,
// generic placeholders, etc. without knowing about the club flag.
import { G } from '../theme.js';

export default function Avatar({ photoUrl, name = '', size = 32, bgColor = G.green, fgColor = '#A8D8B8' }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const px = `${size}px`;
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        style={{
          width: px, height: px, borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          background: bgColor,        // shows while the image is decoding
        }}
        loading="lazy"
        onError={(e) => {
          // If the photo URL 404s (deleted from storage, stale cache,
          // etc.) hide the broken image and let the initials circle
          // show through the background.
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }
  // No photo → initials circle. Font size scales with diameter to
  // keep proportion consistent across all the usages (22px directory
  // row vs 60px membership card vs 22px chat bubble).
  return (
    <div
      style={{
        width: px, height: px, borderRadius: '50%',
        background: bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-label={name || 'Member'}
    >
      <span style={{
        fontFamily: '"Lora",serif',
        fontSize: Math.max(10, Math.round(size * 0.42)),
        color: fgColor,
        fontWeight: 700,
      }}>
        {initial}
      </span>
    </div>
  );
}
