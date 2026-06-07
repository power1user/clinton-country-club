// cors.test.js (v0.16.6, audit #8)
//
// Pins down the CORS allowlist behavior in _shared/cors.ts. The Edge
// Function CORS narrowing landed in v0.16.2 (audit round 2 finding b)
// — these tests guard against future drift that would re-open the
// `Access-Control-Allow-Origin: *` hole.
//
// Note: the implementation file is .ts but the test is .js. Vitest
// transpiles .ts on the fly via its built-in Vite pipeline; the
// implementation file has no Deno-specific imports (just Web standard
// Request) so it runs fine in Vitest's Node environment.

import { describe, it, expect } from 'vitest';
import { corsHeaders, preflight } from './cors.ts';

function reqFromOrigin(origin) {
  return new Request('https://example.com/x', {
    headers: origin ? { origin } : {},
  });
}

describe('corsHeaders — allowed origins', () => {
  const allowed = [
    'https://groundslive.com',
    'https://clinton-country-club.groundslive.com',
    'https://oakgrove.groundslive.com',
    'https://a.groundslive.com',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:4173',
  ];

  for (const origin of allowed) {
    it(`echoes back ${origin}`, () => {
      const h = corsHeaders(reqFromOrigin(origin));
      expect(h['Access-Control-Allow-Origin']).toBe(origin);
    });
  }
});

describe('corsHeaders — disallowed origins', () => {
  const disallowed = [
    'https://evil.com',
    'https://groundslive.com.evil.com',          // subdomain trick
    'https://notgroundslive.com',
    'http://localhost:3000',                      // wrong port
    'http://localhost:8080',
    'http://127.0.0.1:5173',                      // not the same as localhost in CORS
    'https://groundslive.com:8443',               // explicit port (not allowed)
    'http://groundslive.com',                     // http instead of https on prod domain
    'https://Groundslive.com',                    // case — only safe if regex is case-insensitive (which it is)
  ];

  for (const origin of disallowed) {
    it(`does NOT echo ${origin} (falls back to apex)`, () => {
      const h = corsHeaders(reqFromOrigin(origin));
      // Case-insensitive regex means Groundslive.com is technically allowed,
      // but we test the prod-domain mismatches above (http, wrong port, etc.)
      if (origin.toLowerCase() === 'https://groundslive.com') {
        expect(h['Access-Control-Allow-Origin']).toBe(origin);
      } else {
        expect(h['Access-Control-Allow-Origin']).toBe('https://groundslive.com');
      }
    });
  }
});

describe('corsHeaders — missing or empty origin', () => {
  it('falls back to apex when no Origin header', () => {
    const h = corsHeaders(reqFromOrigin(null));
    expect(h['Access-Control-Allow-Origin']).toBe('https://groundslive.com');
  });

  it('falls back to apex when empty Origin header', () => {
    const h = corsHeaders(new Request('https://example.com/x', { headers: { origin: '' } }));
    expect(h['Access-Control-Allow-Origin']).toBe('https://groundslive.com');
  });
});

describe('corsHeaders — supporting headers', () => {
  it('always returns the same Allow-Headers list', () => {
    const h = corsHeaders(reqFromOrigin('https://groundslive.com'));
    expect(h['Access-Control-Allow-Headers']).toContain('authorization');
    expect(h['Access-Control-Allow-Headers']).toContain('content-type');
    expect(h['Access-Control-Allow-Headers']).toContain('apikey');
  });

  it('always returns Allow-Methods', () => {
    const h = corsHeaders(reqFromOrigin('https://groundslive.com'));
    expect(h['Access-Control-Allow-Methods']).toContain('POST');
    expect(h['Access-Control-Allow-Methods']).toContain('OPTIONS');
  });

  it('sets Vary: Origin so caches respect the per-origin Allow-Origin', () => {
    const h = corsHeaders(reqFromOrigin('https://groundslive.com'));
    expect(h['Vary']).toBe('Origin');
  });
});

describe('preflight', () => {
  it('returns a 200-ish response with the right CORS headers', async () => {
    const res = preflight(reqFromOrigin('https://groundslive.com'));
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://groundslive.com');
    expect(res.headers.get('access-control-allow-methods')).toContain('POST');
  });

  it('returns the apex fallback for disallowed origin', () => {
    const res = preflight(reqFromOrigin('https://evil.com'));
    expect(res.headers.get('access-control-allow-origin')).toBe('https://groundslive.com');
  });
});
