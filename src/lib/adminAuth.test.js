// adminAuth.test.js (v0.16.6, audit #8)
//
// `meetsRequirements` is the SINGLE predicate that decides who can see
// which admin section. Two layers depend on it agreeing with itself:
//
//   1. sectionVisible(s) → filters the menu / sidebar / area grid
//   2. SectionContent → renders <AdminAccessDenied> if requirements fail
//
// If THIS predicate disagrees between the two layers, defense in depth
// breaks. These tests pin down every combination of
// (super_admin, manager, admin, permKey, areaSuperOnly, managerOnly).

import { describe, it, expect } from 'vitest';
import { meetsRequirements } from './adminAuth.js';

// Build a ctx for each role + an optional hasPerm allowlist.
function ctxFor(role, allowedPerms = []) {
  const isSuperAdmin = role === 'super_admin';
  const isManager    = isSuperAdmin || role === 'club_manager';
  const isAdmin      = isSuperAdmin || isManager || role === 'club_admin';
  const allowed = new Set(allowedPerms);
  return {
    isSuperAdmin,
    isManager,
    isAdmin,
    // Mirror userHasPerm semantics: super_admin + manager pass all,
    // admin passes only allowedPerms, others never.
    hasPerm: (key) => {
      if (isSuperAdmin || isManager) return true;
      if (role === 'club_admin')     return allowed.has(key);
      return false;
    },
  };
}

describe('meetsRequirements — default (no constraints)', () => {
  const section = { id: 'news', l: 'News', d: 'whatever' };

  it('admin passes', () => {
    expect(meetsRequirements(section, ctxFor('club_admin'))).toBe(true);
    expect(meetsRequirements(section, ctxFor('club_manager'))).toBe(true);
    expect(meetsRequirements(section, ctxFor('super_admin'))).toBe(true);
  });

  it('member / guest / unknown does NOT pass', () => {
    expect(meetsRequirements(section, ctxFor('member'))).toBe(false);
    expect(meetsRequirements(section, ctxFor(null))).toBe(false);
    expect(meetsRequirements(section, ctxFor('guest'))).toBe(false);
  });

  it('null section returns false (defensive)', () => {
    expect(meetsRequirements(null, ctxFor('super_admin'))).toBe(false);
    expect(meetsRequirements(undefined, ctxFor('super_admin'))).toBe(false);
  });
});

describe('meetsRequirements — managerOnly sections', () => {
  const section = { id: 'staff', l: 'Manage Staff', managerOnly: true };

  it('manager + super_admin pass', () => {
    expect(meetsRequirements(section, ctxFor('club_manager'))).toBe(true);
    expect(meetsRequirements(section, ctxFor('super_admin'))).toBe(true);
  });

  it('club_admin does NOT pass even with permKey-style perms', () => {
    // managerOnly is independent of permKey — must be at least manager.
    expect(meetsRequirements(section, ctxFor('club_admin', ['can_manage_staff']))).toBe(false);
  });

  it('member / null does not pass', () => {
    expect(meetsRequirements(section, ctxFor('member'))).toBe(false);
    expect(meetsRequirements(section, ctxFor(null))).toBe(false);
  });
});

describe('meetsRequirements — permKey sections', () => {
  const section = { id: 'news', l: 'News', permKey: 'can_post_news' };

  it('super_admin + manager always pass (implicit-true)', () => {
    expect(meetsRequirements(section, ctxFor('super_admin'))).toBe(true);
    expect(meetsRequirements(section, ctxFor('club_manager'))).toBe(true);
  });

  it('club_admin passes only with the matching permission', () => {
    expect(meetsRequirements(section, ctxFor('club_admin', ['can_post_news']))).toBe(true);
    expect(meetsRequirements(section, ctxFor('club_admin', []))).toBe(false);
    expect(meetsRequirements(section, ctxFor('club_admin', ['can_manage_menu']))).toBe(false);
  });

  it('member never passes regardless of perms', () => {
    expect(meetsRequirements(section, ctxFor('member', ['can_post_news']))).toBe(false);
  });
});

describe('meetsRequirements — managerOnly + permKey combined', () => {
  // Section like Guest Settings: managerOnly AND requires can_manage_members
  const section = {
    id: 'guests', l: 'Guest Settings',
    managerOnly: true, permKey: 'can_manage_members',
  };

  it('manager + super_admin pass (manager implicit on permKey too)', () => {
    expect(meetsRequirements(section, ctxFor('club_manager'))).toBe(true);
    expect(meetsRequirements(section, ctxFor('super_admin'))).toBe(true);
  });

  it('club_admin with the perm does NOT pass (managerOnly trumps permKey)', () => {
    expect(meetsRequirements(section, ctxFor('club_admin', ['can_manage_members']))).toBe(false);
  });
});

describe('meetsRequirements — areaSuperOnly (Platform area)', () => {
  // Platform sections inherit superOnly from their area.
  const section = { id: 'allclubs', l: 'All Clubs', areaSuperOnly: true };

  it('super_admin passes', () => {
    expect(meetsRequirements(section, ctxFor('super_admin'))).toBe(true);
  });

  it('manager does NOT pass — areaSuperOnly is stricter than managerOnly', () => {
    // A non-super manager is still an admin, but Platform demands super.
    expect(meetsRequirements(section, ctxFor('club_manager'))).toBe(false);
  });

  it('club_admin + member do not pass', () => {
    expect(meetsRequirements(section, ctxFor('club_admin'))).toBe(false);
    expect(meetsRequirements(section, ctxFor('member'))).toBe(false);
  });
});

describe('meetsRequirements — interaction with hasPerm', () => {
  it('does NOT call hasPerm when permKey is absent (small perf win)', () => {
    let called = false;
    const ctx = {
      isSuperAdmin: false, isManager: false, isAdmin: true,
      hasPerm: () => { called = true; return false; },
    };
    meetsRequirements({ id: 'x' }, ctx);
    expect(called).toBe(false);
  });

  it('passes the exact permKey string to hasPerm', () => {
    let received = null;
    const ctx = {
      isSuperAdmin: false, isManager: false, isAdmin: true,
      hasPerm: (k) => { received = k; return true; },
    };
    meetsRequirements({ id: 'x', permKey: 'can_manage_events' }, ctx);
    expect(received).toBe('can_manage_events');
  });
});
