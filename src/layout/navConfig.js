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
    resourceId: resource.id,
  };
}

const remoteResources = STAFF_RESOURCES.filter((resource) => resource.id !== 'departments').map(resourceNav);
const REMOTE_PRIMARY_NAV = [
  { id: 'today', path: '/today', label: 'Today', icon: 'home', access: 'staff' },
  ...remoteResources.filter((item) => ['students', 'cohorts', 'schedule', 'attendance', 'academics', 'assignments'].includes(item.resourceId)),
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
export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV, SETTINGS_NAV];

export function visibleNav(items, profile) {
  return items.filter((item) => {
    if (item.access === 'staff') return isStaffProfile(profile);
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
  };
  const normalized = String(pathname ?? '');
  const aliased = DATA_SOURCE === 'remote'
    ? Object.entries(aliasByPrefix).find(([prefix]) => normalized === prefix || normalized.startsWith(`${prefix}/`))?.[1]
    : null;
  const resource = DATA_SOURCE === 'remote'
    ? staffResourceForPath(pathname) ?? (aliased ? STAFF_RESOURCE_BY_ID[aliased] : null)
    : null;
  if (resource) return { access: resource.permission, resourceId: resource.id };
  if (String(pathname).startsWith('/today') || String(pathname).startsWith('/settings')) {
    return { access: 'staff' };
  }
  const nav = navItemForPath(pathname);
  if (nav) return nav;
  if (DATA_SOURCE === 'remote') return { denied: true };
  return null;
}

export function profileCanOpen(item, profile) {
  if (item?.denied) return false;
  if (item?.access === 'staff') return isStaffProfile(profile);
  if (item?.access) return canAccess(profile, item.access);
  if (item?.roles) return item.roles.includes(profile?.roleKey);
  return true;
}
