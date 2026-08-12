import { describe, expect, it } from 'vitest';
import { canAccess, canPerform, canRead, canWrite, isStaffProfile } from './access.js';

const profile = (role) => ({ id: 1, roleKey: role, roles: [role], accountKind: role === 'teacher' ? 'teacher' : 'staff' });

describe('staff access matrix', () => {
  it('keeps teacher learning tools separate from finance', () => {
    const teacher = profile('teacher');
    expect(isStaffProfile(teacher)).toBe(true);
    expect(canAccess(teacher, 'cohorts')).toBe(true);
    expect(canAccess(teacher, 'assignments')).toBe(true);
    expect(canAccess(teacher, 'finance')).toBe(false);
  });

  it('gives cashiers only finance and payments workspaces', () => {
    const cashier = profile('cashier');
    expect(canAccess(cashier, 'finance')).toBe(true);
    expect(canAccess(cashier, 'payments')).toBe(true);
    expect(canWrite(cashier, 'payments')).toBe(true);
    expect(canAccess(cashier, 'cohorts')).toBe(false);
    expect(canAccess(cashier, 'students')).toBe(false);
  });

  it('supports registrar, assistant, and audit staff capabilities', () => {
    const registrar = profile('registrar');
    expect(canWrite(registrar, 'students')).toBe(true);
    expect(canAccess(registrar, 'users')).toBe(true);

    const assistant = profile('assistant');
    expect(canAccess(assistant, 'schedule')).toBe(true);
    expect(canAccess(assistant, 'finance')).toBe(false);

    const auditor = profile('auditor');
    expect(canAccess(auditor, 'audit')).toBe(true);
    expect(canAccess(auditor, 'reports')).toBe(true);
  });

  it('excludes management and non-staff profiles', () => {
    expect(isStaffProfile(profile('director'))).toBe(false);
    expect(isStaffProfile(profile('head_of_dept'))).toBe(false);
    expect(isStaffProfile(profile('ceo'))).toBe(false);
    expect(isStaffProfile({ roleKey: 'student', roles: ['student'], accountKind: 'student' })).toBe(false);
  });

  it('never widens an authoritative live permission set from a familiar role name', () => {
    const teacher = {
      ...profile('teacher'),
      permissionsAuthoritative: true,
      permissionCodes: [],
    };
    expect(canAccess(teacher, 'cohorts')).toBe(false);

    const scoped = { ...teacher, permissionCodes: ['cohorts:read'] };
    expect(canAccess(scoped, 'cohorts')).toBe(true);
    expect(canWrite(scoped, 'cohorts')).toBe(false);
  });

  it('suppresses every mutation control for a read-only session', () => {
    const cashier = { ...profile('cashier'), readOnlySession: true };
    expect(canAccess(cashier, 'payments')).toBe(true);
    expect(canWrite(cashier, 'payments')).toBe(false);
  });

  it('keeps workflow-only grants separate from collection reads', () => {
    const cashier = {
      ...profile('cashier'),
      permissionsAuthoritative: true,
      permissionCodes: ['payments:write'],
    };
    expect(canAccess(cashier, 'payments')).toBe(true);
    expect(canRead(cashier, 'payments')).toBe(false);
    expect(canWrite(cashier, 'payments')).toBe(true);
  });

  it('supports narrow action verbs without widening CRUD authority', () => {
    const approver = {
      ...profile('assistant'),
      permissionsAuthoritative: true,
      permissionCodes: ['approvals:approve'],
    };
    expect(canPerform(approver, 'approvals', 'approve')).toBe(true);
    expect(canRead(approver, 'approvals')).toBe(false);
    expect(canWrite(approver, 'approvals')).toBe(false);
  });
});
