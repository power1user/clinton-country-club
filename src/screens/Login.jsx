import { useState } from 'react';
import { G } from '../theme.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useBrand } from '../hooks/useBrand.jsx';
import { PLATFORM_NAME } from '../lib/version.js';
import InstallCard from '../components/InstallCard.jsx';

export default function Login() {
  const { signIn, signUp, isConfigured } = useAuth();
  const brand = useBrand();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);

  const submit = async (e) => {
    e?.preventDefault();
    setErr(null); setInfo(null); setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password);
        if (error) setErr(error.message);
      } else {
        const { error } = await signUp(email.trim(), password, name.trim());
        if (error) setErr(error.message);
        else setInfo('Account created. You can sign in now.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: G.green }}>
      {/* iOS status bar */}
      <div style={{ height: 44, flexShrink: 0 }} />

      {/* Brand */}
      <div style={{ flexShrink: 0, padding: '40px 32px 32px', textAlign: 'center' }}>
        <p style={{ fontFamily: '"Playfair Display",serif', fontSize: 10, color: '#A8D8B8', letterSpacing: '0.3em', textTransform: 'uppercase', margin: '0 0 6px' }}>{brand.prefix}</p>
        <h1 style={{ fontFamily: '"Playfair Display",serif', fontSize: 32, fontWeight: 700, color: '#F2EDE0', margin: 0, lineHeight: 1.1 }}>{brand.tagline || 'Country Club'}</h1>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 12, color: '#A8D8B8', margin: '10px 0 0' }}>Est. {brand.founded} · {brand.city}, {brand.state === 'IL' ? 'Illinois' : brand.state}</p>
      </div>

      {/* Card */}
      <div style={{ flex: 1, background: G.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '28px 24px 32px', overflowY: 'auto' }}>
        <h2 style={{ fontFamily: '"Playfair Display",serif', fontSize: 22, fontWeight: 700, color: G.text, margin: '0 0 6px' }}>
          {mode === 'signin' ? 'Member Sign-in' : 'Create Member Account'}
        </h2>
        <p style={{ fontFamily: '"Lora",serif', fontStyle: 'italic', fontSize: 13, color: G.muted, margin: '0 0 24px' }}>
          {mode === 'signin' ? 'Welcome back. Please sign in to continue.' : 'Use the email on file with the club office.'}
        </p>

        {!isConfigured && (
          <div style={{ padding: '10px 12px', marginBottom: 14, background: 'rgba(155,122,30,0.1)', border: `1px solid ${G.brass}`, borderRadius: 4 }}>
            <p style={{ fontFamily: '"Lora",serif', fontSize: 11, color: G.brass, margin: 0 }}>
              Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local and restart the dev server.
            </p>
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <Field label="Full Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                style={inputStyle}
              />
            </Field>
          )}
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              style={inputStyle}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              style={inputStyle}
            />
          </Field>

          {err && (
            <div style={{ padding: '10px 12px', background: 'rgba(107,32,32,0.08)', border: `1px solid ${G.clsDot}`, borderRadius: 4 }}>
              <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.clsDot, margin: 0 }}>{err}</p>
            </div>
          )}
          {info && (
            <>
              <div style={{ padding: '10px 12px', background: 'rgba(26,92,52,0.08)', border: `1px solid ${G.openDot}`, borderRadius: 4 }}>
                <p style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.openBg, margin: 0 }}>{info}</p>
              </div>
              {/* Right after sign-up, suggest installing as a PWA so the
                  new member's next visit is one tap from the home screen. */}
              <InstallCard variant="banner" />
            </>
          )}

          <button
            type="submit"
            disabled={busy || !isConfigured}
            style={{
              marginTop: 6, padding: '13px', background: G.green, borderRadius: 3, border: 'none',
              fontFamily: '"Lora",serif', fontSize: 14, color: '#F2EDE0', fontWeight: 500,
              cursor: busy ? 'wait' : 'pointer', opacity: busy || !isConfigured ? 0.6 : 1,
            }}
          >
            {busy ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <span style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.muted }}>
            {mode === 'signin' ? "First time here? " : 'Already a member? '}
          </span>
          <span
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErr(null); setInfo(null); }}
            data-tap
            style={{ fontFamily: '"Lora",serif', fontSize: 12, color: G.brass, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
          >
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </span>
        </div>

        {/* Parent-brand attribution — pre-auth footer */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <p style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
            Powered by {PLATFORM_NAME}
          </p>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '12px 14px', border: `1px solid ${G.border}`, borderRadius: 3,
  fontFamily: '"Lora",serif', fontSize: 14, color: G.text, background: G.card, outline: 'none', boxSizing: 'border-box',
};

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontFamily: '"Lora",serif', fontSize: 10, color: G.muted, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
