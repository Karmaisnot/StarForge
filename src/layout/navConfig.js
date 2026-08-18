// Navigation is derived from the backend resource contract, then filtered by
// the signed-in staff profile. A page that cannot be opened is never offered
// in the sidebar, mobile tabs, or command palette.
import { DATA_SOURCE } from '@/data/http/apiConfig.js';
import { canAccess, isStaffProfile } from '@/domain/access.js';
import { STAFF_RESOURCES, STAFF_RESOURCE_BY_ID, staffResourceForPath } from '@/domain/staffResources.js';

const ALL_STAFF = [
  'teacher',
  'assistant',
  'accountant',
  'cashier',
  'librarian',
  'security',
  'it',
  'registrar',
  'support',
  'auditor',
  'audit',
];
const LEARNING_STAFF = ['teacher', 'assistant', 'registrar', 'librarian'];

const LEGACY_PRIMARY_NAV = [
  { id: 'today', path: '/today', label: 'Bugun', icon: 'home', roles: ALL_STAFF },
  { id: 'work', path: '/work', label: 'Ish markazi', icon: 'cal', roles: ALL_STAFF },
  { id: 'academic', path: '/academic', label: "O'quv markazi", icon: 'book', roles: ['teacher', 'registrar'] },
  { id: 'finance', path: '/finance', label: 'Moliya', icon: 'pie', roles: ['accountant', 'cashier'] },
  { id: 'tasks', path: '/tasks', label: 'Vazifalar', icon: 'check', badge: 'tasks', roles: ALL_STAFF },
  { id: 'messages', path: '/messages', label: 'Xabarlar', icon: 'chat', badge: 'mgmt', roles: ALL_STAFF },
  { id: 'ai', path: '/ai', label: 'AI Suhbat', icon: 'ai', roles: ['teacher'] },
];

const LEGACY_SECONDARY_NAV = [
  { id: 'operations', path: '/operations', label: 'Operatsiyalar', icon: 'globe', roles: ALL_STAFF },
  { id: 'people', path: '/people', label: 'Odamlar', icon: 'users', roles: ALL_STAFF },
  { id: 'cohorts', path: '/cohorts', label: 'Guruhlar', icon: 'cohort', roles: LEARNING_STAFF },
  { id: 'print', path: '/print', label: 'Print', icon: 'print', badge: 'print', roles: ['teacher', 'registrar'] },
  { id: 'surveys', path: '/surveys', label: "So'rovnomalar", icon: 'flag', badge: 'surveys', urgent: true, roles: ['teacher', 'registrar'] },
  { id: 'materials', path: '/materials', label: 'Materiallar', icon: 'folder', roles: ['teacher', 'librarian'] },
];

function resourceNav(resource) {
  return {
    id: resource.nav,
    path: resource.path,
    label: resource.title,
    icon: resource.icon,
    access: resource.permission,
    permissions: resource.permissions,
    resourceId: resource.id,
  };
}

const remoteResources = STAFF_RESOURCES.filter((resource) => resource.id !== 'departments').map(resourceNav);
const remoteResource = (id) => remoteResources.find((item) => item.resourceId === id);
const compact = (items) => items.filter(Boolean);

// A teacher's product is deliberately smaller than the complete staff
// contract. Lesson planning, attendance, learning records, and awards are
// opened from a group/student so context can never drift to another cohort.
// Operational and leadership consoles remain available to the staff roles
// that own them, but are not teacher navigation merely because an endpoint is
// readable.
const TEACHER_PRIMARY_IDS = new Set([
  'today',
  'work',
  'tasks',
  'cohorts',
  'students',
  'messages',
  'content',
  'forms',
]);
const TEACHER_SECONDARY_IDS = new Set([
  'approvals',
  'recognition',
  'reports',
  'printing',
]);
export const TEACHER_HIDDEN_RESOURCES = new Set([
  'schedule',
  'attendance',
  'academics',
  'assignments',
  'placement',
  'ai',
  'organization',
  'operations',
  'intelligence',
  'meetings',
  'notifications',
  'compliance',
]);

export function isTeacherWorkspace(profile) {
  const kind = String(profile?.accountKind ?? '').toLowerCase();
  const role = String(profile?.roleKey ?? '').toLowerCase();
  return kind === 'teacher' || role === 'teacher';
}

const REMOTE_PRIMARY_NAV = [
  { id: 'today', path: '/today', label: 'Today', icon: 'home', access: 'staff' },
  { id: 'work', path: '/work', label: 'Schedule & requests', icon: 'cal', access: 'staff' },
  ...compact([
    remoteResource('tasks'),
    remoteResource('cohorts'),
    remoteResource('students'),
    remoteResource('messaging'),
    remoteResource('content'),
    remoteResource('forms'),
    remoteResource('schedule'),
    remoteResource('attendance'),
    remoteResource('academics'),
    remoteResource('assignments'),
  ]),
];
const REMOTE_SECONDARY_NAV = [
  ...remoteResources.filter((item) => !REMOTE_PRIMARY_NAV.some((primary) => primary.resourceId === item.resourceId)),
];

export const PRIMARY_NAV = DATA_SOURCE === 'remote' ? REMOTE_PRIMARY_NAV : LEGACY_PRIMARY_NAV;
export const SECONDARY_NAV = DATA_SOURCE === 'remote' ? REMOTE_SECONDARY_NAV : LEGACY_SECONDARY_NAV;
export const SETTINGS_NAV = {
  id: 'settings',
  path: '/settings',
  label: 'Settings',
  icon: 'settings',
  access: 'staff',
  roles: ALL_STAFF,
};
export const ACCOUNT_NAV = {
  id: 'account',
  path: '/account',
  label: 'My profile',
  icon: 'user',
  access: 'staff',
  roles: ALL_STAFF,
};
export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV, ACCOUNT_NAV, SETTINGS_NAV];

export function visibleNav(items, profile) {
  return items.filter((item) => {
    if (DATA_SOURCE === 'remote' && isTeacherWorkspace(profile)) {
      const allowed = TEACHER_PRIMARY_IDS.has(item.id) || TEACHER_SECONDARY_IDS.has(item.id);
      if (!allowed) return false;
    }
    if (item.access === 'staff') return isStaffProfile(profile);
    if (item.permissions) {
      return item.permissions.some((permission) => canAccess(profile, permission));
    }
    if (item.access) return canAccess(profile, item.access);
    const role = profile?.roleKey;
    return !role || !item.roles || item.roles.includes(role);
  });
}

export function navItemForPath(pathname) {
  const normalized = String(pathname ?? '').replace(/\/+$/, '') || '/';
  const resource = DATA_SOURCE === 'remote' ? staffResourceForPath(normalized) : null;
  if (resource) return resourceNav(resource);
  return [...ALL_NAV]
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => normalized === item.path || normalized.startsWith(`${item.path}/`));
}

/** Direct-route guard data, including paths omitted from a role's navigation. */
export function accessForPath(pathname) {
  const aliasByPrefix = {
    '/academic': 'academics',
    '/materials': 'content',
    '/print': 'printing',
    '/people': 'students',
    // Survey cards retain the short responder URL while the navigation entry
    // lives at /forms. Treat both paths as the same permission-scoped product.
    '/surveys': 'forms',
  };
  const normalized = String(pathname ?? '');
  // The router's authenticated index route redirects `/` to `/today` from
  // inside AppShell. Let that neutral entry route reach the Outlet; treating it
  // as an unknown deep link blocks the redirect and strands valid staff users
  // on the role-denied screen.
  if (normalized === '/' || normalized === '') return { access: 'staff' };
  const aliased = DATA_SOURCE === 'remote'
    ? Object.entries(aliasByPrefix).find(([prefix]) => normalized === prefix || normalized.startsWith(`${prefix}/`))?.[1]
    : null;
  const resource = DATA_SOURCE === 'remote'
    ? staffResourceForPath(pathname) ?? (aliased ? STAFF_RESOURCE_BY_ID[aliased] : null)
    : null;
  if (resource) {
    return {
      access: resource.permission,
      permissions: resource.permissions,
      resourceId: resource.id,
    };
  }
  if (String(pathname).startsWith('/today') || String(pathname).startsWith('/work') || String(pathname).startsWith('/settings') || String(pathname).startsWith('/account')) {
    return { access: 'staff' };
  }
  const nav = navItemForPath(pathname);
  if (nav) return nav;
  if (DATA_SOURCE === 'remote') return { denied: true };
  return null;
}

export function profileCanOpen(item, profile) {
  if (item?.denied) return false;
  if (
    DATA_SOURCE === 'remote' &&
    isTeacherWorkspace(profile) &&
    TEACHER_HIDDEN_RESOURCES.has(item?.resourceId)
  ) {
    return false;
  }
  if (item?.access === 'staff') return isStaffProfile(profile);
  if (item?.permissions) {
    return item.permissions.some((permission) => canAccess(profile, permission));
  }
  if (item?.access) return canAccess(profile, item.access);
  if (item?.roles) return item.roles.includes(profile?.roleKey);
  return true;
}
