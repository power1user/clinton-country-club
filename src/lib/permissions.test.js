// permissions.test.js (v0.16.6, audit #8)
//
// The permission helpers in `src/lib/permissions.js` are the
// client-side enforcement layer that MUST stay in lockstep with the
// `has_permission` SECURITY DEFINER RPC in the database (see
// supabase/migrations/0001_phase18_baseline_helpers.sql).
//
// These tests pin down the matrix: every role × permission key
// combination, plus the role-hierarchy quirks (super_admin implicit-
// true, club_manager implicit-true at club scope, club_admin explicit
// flags only, members never).
//
// If these break, either the function changed (intentional — update the
// test) OR the DB-side `has_permission` is now mismatched (BAD — that's
// a defense-in-depth crack and the audit will catch it).

import { describe, it, expect } from 'vitest';
import { highestRole, userHasPerm, PERMISSION_KEYS } from './permissions.js';

describe('highestRole', () => {
  it('returns null for empty input', () => {
    expect(highestRole([])).toBeNull();
    expect(highestRole(null)).toBeNull();
    expect(highestRole(undefined)).toBeNull();
  });

  it('returns super_admin when any row has that role', () => {
    expect(highestRole([{ role: 'super_admin' }])).toBe('super_admin');
    expect(highestRole([{ role: 'club_admin' }, { role: 'super_admin' }])).toBe('super_admin');
    expect(highestRole([{ role: 'club_manager' }, { role: 'super_admin' }])).toBe('super_admin');
  });

  it('returns club_manager when present and no super_admin', () => {
    expect(highestRole([{ role: 'club_manager' }])).toBe('club_manager');
    expect(highestRole([{ role: 'club_admin' }, { role: 'club_manager' }])).toBe('club_manager');
  });

  it('returns club_admin when only that role is present', () => {
    expect(highestRole([{ role: 'club_admin' }])).toBe('club_admin');
  });

  it('returns null for unknown roles', () => {
    expect(highestRole([{ role: 'member' }])).toBeNull();
    expect(highestRole([{ role: 'random_string' }])).toBeNull();
  });

  it('handles multi-row users (Marc-style super_admin + member at a club)', () => {
    // A super_admin can also have a regular member row at one or more
    // clubs. highestRole sees super_admin first.
    expect(highestRole([
      { role: 'super_admin', club_id: null },
      { role: 'club_admin', club_id: 'club-1' },
      { role: 'club_manager', club_id: 'club-2' },
    ])).toBe('super_admin');
  });
});

describe('userHasPerm — role hierarchy', () => {
  it('super_admin passes EVERY permission key implicitly', () => {
    for (const k of PERMISSION_KEYS) {
      expect(userHasPerm('super_admin', {}, k)).toBe(true);
      expect(userHasPerm('super_admin', null, k)).toBe(true);
      expect(userHasPerm('super_admin', undefined, k)).toBe(true);
    }
  });

  it('club_manager passes EVERY permission key implicitly', () => {
    for (const k of PERMISSION_KEYS) {
      expect(userHasPerm('club_manager', {}, k)).toBe(true);
      expect(userHasPerm('club_manager', null, k)).toBe(true);
    }
  });

  it('club_admin only passes keys explicitly set to true', () => {
    const perms = { can_post_news: true, can_manage_events: false };
    expect(userHasPerm('club_admin', perms, 'can_post_news')).toBe(true);
    expect(userHasPerm('club_admin', perms, 'can_manage_events')).toBe(false);
    expect(userHasPerm('club_admin', perms, 'can_manage_staff')).toBe(false);  // unset = false
  });

  it('club_admin treats missing permissions as false', () => {
    expect(userHasPerm('club_admin', {}, 'can_post_news')).toBe(false);
    expect(userHasPerm('club_admin', null, 'can_post_news')).toBe(false);
    expect(userHasPerm('club_admin', undefined, 'can_post_news')).toBe(false);
  });

  it('club_admin treats falsy values (0, "", null) as false', () => {
    expect(userHasPerm('club_admin', { can_post_news: 0 }, 'can_post_news')).toBe(false);
    expect(userHasPerm('club_admin', { can_post_news: '' }, 'can_post_news')).toBe(false);
    expect(userHasPerm('club_admin', { can_post_news: null }, 'can_post_news')).toBe(false);
  });

  it('members (no role) never pass', () => {
    expect(userHasPerm(null, { can_post_news: true }, 'can_post_news')).toBe(false);
    expect(userHasPerm(undefined, {}, 'can_post_news')).toBe(false);
    expect(userHasPerm('member', { can_post_news: true }, 'can_post_news')).toBe(false);
  });

  it('unknown roles never pass', () => {
    expect(userHasPerm('random', { can_post_news: true }, 'can_post_news')).toBe(false);
    expect(userHasPerm('guest', {}, 'can_post_news')).toBe(false);
  });
});

describe('PERMISSION_KEYS coverage', () => {
  it('every key is a non-empty string', () => {
    for (const k of PERMISSION_KEYS) {
      expect(typeof k).toBe('string');
      expect(k.length).toBeGreaterThan(0);
    }
  });

  it('every key starts with can_ (consistent naming)', () => {
    for (const k of PERMISSION_KEYS) {
      expect(k.startsWith('can_')).toBe(true);
    }
  });

  it('no duplicate keys', () => {
    const set = new Set(PERMISSION_KEYS);
    expect(set.size).toBe(PERMISSION_KEYS.length);
  });
});
