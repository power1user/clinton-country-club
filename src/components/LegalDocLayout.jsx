// LegalDocLayout — shared chrome for the public /terms and /privacy pages.
// Branded header, scrollable doc body, back-to-app footer. Public route —
// works without a session.
import { G } from '../theme.js';

export default function LegalDocLayout({ brand, title, versionLabel, children }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: G.bg,
      minHeight: '100vh',
    }}>
      {/* Status-bar strip */}
      <div style={{ height: 'env(safe-area-inset-top, 0px)', background: G.green, flexShrink: 0 }} />

      {/* Branded header */}
      <div style={{ background: G.green, padding: '18px 24px 20px', flexShrink: 0 }}>
        <p style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: 9,
          color: '#A8D8B8',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          margin: '0 0 4px',
        }}>
          {brand}
        </p>
        <h1 style={{
          fontFamily: '"Playfair Display",serif',
          fontSize: 26,
          fontWeight: 700,
          color: '#F2EDE0',
          margin: 0,
          lineHeight: 1.15,
        }}>
          {title}
        </h1>
        {versionLabel && (
          <p style={{
            fontFamily: '"Lora",serif',
            fontStyle: 'italic',
            fontSize: 12,
            color: '#A8D8B8',
            margin: '6px 0 0',
          }}>
            {versionLabel}
          </p>
        )}
      </div>

      {/* Scrollable body — max-width 720px keeps line length readable on
          desktop without forcing media queries. */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '20px 22px 32px',
        }}>
          {children}
        </div>
      </div>

      {/* Footer with back link */}
      <div style={{
        flexShrink: 0,
        padding: '12px 20px max(14px, calc(env(safe-area-inset-bottom) + 8px))',
        borderTop: `1px solid ${G.border}`,
        background: G.bg,
        textAlign: 'center',
      }}>
        <a
          href="/"
          style={{
            fontFamily: '"Lora",serif',
            fontSize: 13,
            color: G.green,
            textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          ← Back to {brand}
        </a>
      </div>
    </div>
  );
}
