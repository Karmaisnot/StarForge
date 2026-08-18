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

  it('allows an authorized teacher to open a CEO-created survey responder link', () => {
    const responder = {
      ...teacher,
      permissionCodes: ['forms:read'],
    };

    expect(accessForPath('/surveys/2')).toMatchObject({ resourceId: 'forms' });
    expect(profileCanOpen(accessForPath('/surveys/2'), responder)).toBe(true);
  });

  it('keeps the staff schedule, meeting, and absence workspace reachable', () => {
    expect(accessForPath('/work')).toEqual({ access: 'staff' });
    expect(profileCanOpen(accessForPath('/work'), teacher)).toBe(true);
  });
});
