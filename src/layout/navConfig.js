// Single source of truth for navigation — consumed by Sidebar, TopBar and MobileTabs.
// `badge` is the key into the nav-badges map; `urgent` drives the pulsing indicator.

const ALL_STAFF = [
  'teacher',
  'accountant',
  'cashier',
  'librarian',
  'security',
  'it',
  'registrar',
  'support',
];
const LEARNING_STAFF = ['teacher', 'registrar', 'librarian'];

export const PRIMARY_NAV = [
  { id: 'today', path: '/today', label: 'Bugun', icon: 'home', roles: ALL_STAFF },
  { id: 'work', path: '/work', label: 'Ish markazi', icon: 'cal', roles: ALL_STAFF },
  {
    id: 'academic',
    path: '/academic',
    label: "O'quv markazi",
    icon: 'book',
    roles: ['teacher', 'registrar'],
  },
  {
    id: 'finance',
    path: '/finance',
    label: 'Moliya',
    icon: 'pie',
    roles: ['accountant', 'cashier'],
  },
  {
    id: 'tasks',
    path: '/tasks',
    label: 'Vazifalar',
    icon: 'check',
    badge: 'tasks',
    roles: ALL_STAFF,
  },
  {
    id: 'messages',
    path: '/messages',
    label: 'Xabarlar',
    icon: 'chat',
    badge: 'mgmt',
    roles: ALL_STAFF,
  },
  { id: 'ai', path: '/ai', label: 'AI Suhbat', icon: 'ai', roles: ['teacher'] },
];

export const SECONDARY_NAV = [
  {
    id: 'operations',
    path: '/operations',
    label: 'Operatsiyalar',
    icon: 'globe',
    roles: ALL_STAFF,
  },
  { id: 'people', path: '/people', label: 'Odamlar', icon: 'users', roles: ALL_STAFF },
  { id: 'cohorts', path: '/cohorts', label: 'Guruhlar', icon: 'cohort', roles: LEARNING_STAFF },
  {
    id: 'print',
    path: '/print',
    label: 'Print',
    icon: 'print',
    badge: 'print',
    roles: ['teacher', 'registrar'],
  },
  {
    id: 'surveys',
    path: '/surveys',
    label: "So'rovnomalar",
    icon: 'flag',
    badge: 'surveys',
    urgent: true,
    roles: ['teacher', 'registrar'],
  },
  {
    id: 'materials',
    path: '/materials',
    label: 'Materiallar',
    icon: 'folder',
    roles: ['teacher', 'librarian'],
  },
];

export const SETTINGS_NAV = {
  id: 'settings',
  path: '/settings',
  label: 'Sozlamalar',
  icon: 'settings',
  roles: ALL_STAFF,
};

export const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV, SETTINGS_NAV];

export function visibleNav(items, profile) {
  const role = profile?.roleKey;
  if (!role) return items;
  return items.filter((item) => !item.roles || item.roles.includes(role));
}
