// Phase 2 permission key definitions.
//
// Permissions are feature-keyed boolean flags stored in
// user_roles.permissions (jsonb). The 13 keys below cover every
// elevated admin action across the app.
//
// Role semantics:
//   super_admin   — platform-wide, all permissions implicit
//   club_manager  — all permissions implicit for their club; only super_admin
//                   can grant/remove this role
//   club_admin    — only the permission flags set on their row apply;
//                   manager or super_admin can grant/revoke
//   member        — implicit; no user_roles row required
//
// The has_permission() RLS helper in Postgres mirrors this same logic.

export const PERMISSION_KEYS = [
  'can_edit_course_status',
  'can_edit_pins',
  'can_post_news',
  'can_send_notifications',
  'can_manage_menu',
  'can_view_orders',
  'can_edit_orders',
  'can_manage_events',
  'can_manage_proshop',
  'can_manage_lessons',
  'can_manage_sponsors',
  'can_manage_members',
  'can_manage_staff',
  'can_view_clubhouse_inbox',
];

// Grouped for display in the permission editor modal.
export const PERMISSION_GROUPS = [
  {
    area: 'Course',
    keys: [
      { key: 'can_edit_course_status', label: 'Course Status', desc: 'Pills, weekly hours, schedule overrides, pace of play' },
      { key: 'can_edit_pins',          label: 'Pin Positions', desc: "Place today's pin on each green" },
    ],
  },
  {
    area: 'Dining',
    keys: [
      { key: 'can_manage_menu',  label: 'Menu',           desc: 'Categories + items + specials' },
      { key: 'can_view_orders',  label: 'View Orders',    desc: 'See the food-order queue' },
      { key: 'can_edit_orders',  label: 'Edit Orders',    desc: 'Change order status' },
    ],
  },
  {
    area: 'Events',
    keys: [
      { key: 'can_manage_events', label: 'Events', desc: 'Events + registrations' },
    ],
  },
  {
    area: 'Marketing',
    keys: [
      { key: 'can_post_news',          label: 'Post News',          desc: 'Publish announcements' },
      { key: 'can_send_notifications', label: 'Send Notifications', desc: 'Broadcast alerts to members' },
      { key: 'can_manage_sponsors',    label: 'Sponsors',           desc: 'Hole sponsors + sponsor banners' },
    ],
  },
  {
    area: 'Pro Shop',
    keys: [
      { key: 'can_manage_proshop',  label: 'Pro Shop Items',  desc: 'Catalog CRUD' },
      { key: 'can_manage_lessons',  label: 'Lesson Requests', desc: 'Manage the lesson queue' },
    ],
  },
  {
    area: 'People',
    keys: [
      { key: 'can_manage_members',       label: 'Members',          desc: 'Roster, CSV import, invites' },
      { key: 'can_manage_staff',         label: 'Staff',            desc: "Edit other club admins' permissions" },
      { key: 'can_view_clubhouse_inbox', label: 'Clubhouse Inbox',  desc: 'See + reply to member messages routed to the clubhouse' },
    ],
  },
];

// Compute the highest-privilege role from a list of user_roles rows.
// (A user can have multiple rows — e.g. super_admin + a club row.)
export function highestRole(rows) {
  const roles = (rows || []).map(r => r.role);
  if (roles.includes('super_admin')) return 'super_admin';
  if (roles.includes('club_manager')) return 'club_manager';
  if (roles.includes('club_admin')) return 'club_admin';
  return null;
}

// Permission check for a user's role + permissions.
// Returns true if super_admin / club_manager (all implicit) or club_admin
// with the flag explicitly set to true.
export function userHasPerm(role, permissions, key) {
  if (role === 'super_admin') return true;
  if (role === 'club_manager') return true;
  if (role === 'club_admin') return Boolean(permissions?.[key]);
  return false;
}
