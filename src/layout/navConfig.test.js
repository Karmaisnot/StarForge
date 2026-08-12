import { describe, expect, it } from 'vitest';
import { accessForPath, profileCanOpen } from './navConfig.js';

const teacher = {
  id: 65,
  roleKey: 'teacher',
  roles: ['teacher'],
  accountKind: 'teacher',
  permissionsAuthoritative: true,
  permissionCodes: ['teachers:read'],
};

describe('staff navigation route guard', () => {
  it('allows the authenticated root route to reach its dashboard redirect', () => {
    const rootAccess = accessForPath('/');

    expect(rootAccess).toEqual({ access: 'staff' });
    expect(profileCanOpen(rootAccess, teacher)).toBe(true);
  });

  it('continues to reject unknown remote deep links', () => {
    expect(accessForPath('/not-a-staff-page')).toEqual({ denied: true });
    expect(profileCanOpen(accessForPath('/not-a-staff-page'), teacher)).toBe(false);
  });
});
