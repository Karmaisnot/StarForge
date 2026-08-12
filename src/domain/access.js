// Client-side reflection of the tenant backend's public role matrix.
//
// The API remains the authority for every request. This module has one job:
// keep unavailable workspaces out of navigation and block deep links before a
// restricted screen can start loading data. Keeping the matrix here also makes
// a newly-issued staff account predictable while the backend is the source of
// the final authorization decision.

const MANAGEMENT_ROLE_TOKENS = new Set([
  'director',
  'manager',
  'ceo',
  'owner',
  'administrator',
  'admin',
]);
const MANAGEMENT_ROLE_PHRASES = ['chief_executive', 'head_of_department', 'head_of_dept'];

const NON_STAFF_ROLES = new Set(['student', 'parent']);

export const ROLE_PERMISSION_MATRIX = {
  teacher: [
    'students:read',
    'cohorts:read',
    'attendance:*',
    'academics:write',
    'assignments:*',
    'schedule:read',
    'content:*',
  ],
  accountant: ['finance:*', 'payments:*', 'reports:read'],
  cashier: ['finance:read', 'payments:write'],
  librarian: ['content:*', 'students:read', 'cohorts:read'],
  security: ['attendance:write', 'users:read'],
  it: ['users:read', 'audit:read'],
  registrar: ['students:*', 'users:write', 'cohorts:*'],
  support: ['users:read', 'audit:read'],
  // These aliases are deliberately narrow. They make new staff account types
  // useful without accidentally granting a manager's workspace to a staff app.
  assistant: ['students:read', 'cohorts:read', 'schedule:read', 'attendance:read'],
  auditor: ['audit:read', 'reports:read'],
  audit: ['audit:read', 'reports:read'],
};

export function normalizeRole(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function profileRoles(profile) {
  const explicit = Array.isArray(profile?.roles) ? profile.roles : [];
  const memberships = Array.isArray(profile?.roleMemberships) ? profile.roleMemberships : [];
  const inferred = [
    profile?.roleKey,
    ...memberships.flatMap((membership) => [
      membership?.role,
      membership?.legacy_role,
      membership?.account_type_slug,
      membership?.account_type_name,
    ]),
  ];
  return [...new Set([...explicit, ...inferred].map(normalizeRole).filter(Boolean))];
}

export function isManagementProfile(profile) {
  return profileRoles(profile).some((role) => {
    const tokens = role.split('_').filter(Boolean);
    return (
      tokens.some((token) => MANAGEMENT_ROLE_TOKENS.has(token)) ||
      MANAGEMENT_ROLE_PHRASES.some((phrase) => role.includes(phrase))
    );
  });
}

export function isStaffProfile(profile) {
  const kind = normalizeRole(profile?.accountKind);
  const roles = profileRoles(profile);
  if (isManagementProfile(profile) || roles.some((role) => NON_STAFF_ROLES.has(role))) return false;
  if (['staff', 'teacher', 'employee'].includes(kind)) return true;
  return roles.some((role) => Object.hasOwn(ROLE_PERMISSION_MATRIX, role));
}

export function profilePermissions(profile) {
  const explicit = [
    ...(Array.isArray(profile?.permissionCodes) ? profile.permissionCodes : []),
    ...(Array.isArray(profile?.effective_permissions) ? profile.effective_permissions : []),
  ].map((code) => String(code));
  // /users/me returns an authoritative array even when it is empty. Role-name
  // fallbacks exist only for the isolated mock/local adapters and must never
  // widen a live account beyond the backend's effective grants.
  if (profile?.permissionsAuthoritative) return [...new Set(explicit)];
  const derived = profileRoles(profile).flatMap((role) => ROLE_PERMISSION_MATRIX[role] ?? []);
  return [...new Set([...explicit, ...derived])];
}

/** Whether a profile holds one exact resource grant (or a matching wildcard). */
export function canAccess(profile, resource, verb = null) {
  if (!isStaffProfile(profile)) return false;
  const target = String(resource ?? '').trim();
  if (!target) return false;
  const permissions = profilePermissions(profile);
  return permissions.some((permission) => {
    const [permissionResource, permissionVerb = ''] = permission.split(':');
    if (permission === '*:*' || permissionResource === '*') return true;
    if (permissionResource !== target) return false;
    if (!verb) return true;
    return permissionVerb === '*' || permissionVerb === verb;
  });
}

export function canRead(profile, resource) {
  return canAccess(profile, resource, 'read');
}

export function canWrite(profile, resource) {
  if (!isStaffProfile(profile)) return false;
  if (profile?.readOnlySession || profile?.read_only_session) return false;
  return canAccess(profile, resource, 'write');
}

/** Mutating workflow verbs can be narrower than write (approve, run, disburse…). */
export function canPerform(profile, resource, verb = 'write') {
  if (profile?.readOnlySession || profile?.read_only_session) return false;
  return canAccess(profile, resource, verb);
}
