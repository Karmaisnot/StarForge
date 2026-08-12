// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('password login API contract', () => {
  let auth;
  let fetchMock;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    auth = await import('./authToken.js');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('records a temporary-password requirement from the login response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ token: 'test-session-token', mustChangePassword: true }),
    });

    await auth.login({ username: 'nigora.karimova', password: 'demo1234' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe('https://starforge.78.111.91.113.nip.io/api/v1/auth/role-login/');
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body)).toMatchObject({
      username: 'nigora.karimova',
      password: 'demo1234',
    });
    expect(auth.requiresPasswordChange()).toBe(true);
  });

  it('unlocks the session only after the password-change endpoint succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({ token: 'test-session-token', mustChangePassword: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({ ok: true, mustChangePassword: false }),
      });

    await auth.login({ username: 'nigora.karimova', password: 'demo1234' });
    await auth.changePassword({ currentPassword: 'demo1234', newPassword: 'new-password-2026' });

    const [url, request] = fetchMock.mock.calls[1];
    expect(url).toBe('https://starforge.78.111.91.113.nip.io/api/v1/auth/change-password/');
    expect(request.headers.Authorization).toBe('Bearer test-session-token');
    expect(JSON.parse(request.body)).toEqual({
      currentPassword: 'demo1234',
      newPassword: 'new-password-2026',
    });
    expect(auth.requiresPasswordChange()).toBe(false);
  });
});
