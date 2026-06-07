// adminAuth.js (v0.16.6, audit #8)
//
// Extracted from AdminPanel.jsx so it's testable without loading the
// entire admin UI tree. This is the SINGLE predicate that decides:
//   - what shows up in the admin menus (sectionVisible)
//   - what SectionContent will actually render vs. <AdminAccessDenied>
//
// Mirrors the SECURITY DEFINER `has_permission()` RPC in the database.
// Drift here = a defense-in-depth crack between UI and RLS — both
// layers must agree. See:
//   - supabase/migrations/0001_phase18_baseline_helpers.sql
//   - src/lib/permissions.js
//
// section shape (from AREAS metadata in AdminPanel.jsx):
//   - section.permKey       — optional permission key (mirrors RLS has_permission)
//   - section.managerOnly   — true means club_manager required (super_admin passes)
//   - section.areaSuperOnly — true means super_admin required (propagated from area.superOnly)
//
// ctx must provide booleans isSuperAdmin, isManager, isAdmin and the
// hasPerm function from useAuth. `hasPerm` must agree with the DB
// has_permission() RPC.

export function meetsRequirements(section, ctx) {
  if (!section) return false;
  // Floor: any admin role. Members/guests never see admin sections.
  if (!ctx.isAdmin) return false;
  // Area-level: Platform sections are super_admin-only.
  if (section.areaSuperOnly && !ctx.isSuperAdmin) return false;
  // Section-level managerOnly: must be club_manager (super_admin passes
  // because isManager is true for super_admin per useAuth).
  if (section.managerOnly && !ctx.isManager) return false;
  // Section-level permKey: must hold the named permission.
  if (section.permKey && !ctx.hasPerm(section.permKey)) return false;
  return true;
}
