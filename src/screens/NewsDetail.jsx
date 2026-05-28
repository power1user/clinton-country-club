// News article detail (v0.10.4 — contextual action link rewrite).
//
// Replaces the v0.10.3 hardcoded "Related" card that had three
// category-specific lines with cursor:pointer but no onClick
// handlers — a real bug where tapping appeared to do nothing.
// Now uses the generic newsActionLinks mapping so:
//   · Adding a category-route mapping is one entry in
//     src/lib/newsActionLinks.js
//   · Categories without an entry render no action link (no
//     empty space, no orphaned "Related" header)
//   · The link actually navigates via useNav().push()

import { G } from '../theme.js';
import { BackHeader } from '../components/Headers.jsx';
import { useNav } from '../hooks/useNav.jsx';
import { getNewsActionLink } from '../lib/newsActionLinks.js';

export default function NewsDetail({ params }) {
  const news = params?.news;
  const { push } = useNav();

  if (!news) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
        <BackHeader title="Club News" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
          <p style={{ fontFamily: '"Playfair Display",serif', fontStyle: 'italic', fontSize: 14, color: G.muted }}>Article not found.</p>
        </div>
      </div>
    );
  }

  // useNews maps news.category → news.cat in the hook. Try both so
  // we're robust to either shape (in case a future caller passes
  // the raw row).
  const action = getNewsActionLink(news.cat || news.category);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 44, background: G.green, flexShrink: 0 }} />
      <BackHeader title="Club News" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: G.brass }}>{news.cat}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: G.border, display: 'inline-block' }} />
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>{news.date}</span>
        </div>
        <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 24, fontWeight: 700, color: G.text, margin: '0 0 16px', lineHeight: 1.25 }}>{news.head}</h1>
        <div style={{ height: 1, background: G.border, marginBottom: 16 }} />
        <p style={{ fontFamily: '"Lora",serif', fontSize: 14, color: G.text, lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>{news.body}</p>

        {/* Contextual action link — only renders for categories that
            have an entry in newsActionLinks.js. Categories like
            'Club' (general announcements) intentionally render
            nothing here so the article ends naturally. */}
        {action && (
          <button
            onClick={() => push(action.route)}
            data-tap
            type="button"
            style={{
              marginTop: 28,
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: `1px solid ${G.brass}`,
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: '"Playfair Display",serif',
              fontSize: 14,
              fontWeight: 600,
              color: G.brass,
              letterSpacing: '0.02em',
            }}
          >
            {action.label}
            <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>→</span>
          </button>
        )}
      </div>
    </div>
  );
}
