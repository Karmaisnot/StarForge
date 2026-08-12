// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function response(data, status = 200) {
  return new Response(data == null ? null : JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function envelope(data) {
  return { success: true, data };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(String(key)) ?? null,
    setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: (key) => values.delete(String(key)),
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
}

function staffIdentity(overrides = {}) {
  return {
    id: 7,
    principal_kind: 'teacher',
    username: 'nigora.karimova',
    full_name: 'Nigora Karimova',
    must_change_password: false,
    read_only_session: false,
    role_memberships: [
      {
        account_kind: 'teacher',
        account_type_slug: 'teacher',
        account_type_name: 'Teacher',
      },
    ],
    effective_permissions: ['cohorts:read'],
    ...overrides,
  };
}

describe('opaque browser-session auth contract', () => {
  let auth;
  let fetchMock;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('localStorage', memoryStorage());
    vi.stubGlobal('sessionStorage', memoryStorage());
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = 'csrftoken=cookie-csrf; path=/';
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    auth = await import('./authToken.js');
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = 'csrftoken=; Max-Age=0; path=/';
    vi.unstubAllGlobals();
  });

  it('bootstraps CSRF, requests a cookie session, and never stores a bearer token', async () => {
    fetchMock
      .mockResolvedValueOnce(response(envelope({ csrf_token: 'bootstrap-csrf' })))
      .mockResolvedValueOnce(response(envelope({ must_change_password: false })))
      .mockResolvedValueOnce(response(envelope(staffIdentity())))
      .mockResolvedValueOnce(
        response(envelope({ features: [{ feature: 'attendance', status: 'available' }] })),
      );

    const session = await auth.login({
      username: 'nigora.karimova',
      password: 'demo1234',
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/auth/session/',
      '/api/v1/auth/role-login/',
      '/api/v1/users/me/',
      '/api/v1/org/app-status/',
    ]);
    const loginRequest = fetchMock.mock.calls[1][1];
    expect(loginRequest.credentials).toBe('same-origin');
    expect(loginRequest.headers.get('X-CSRFToken')).toBe('bootstrap-csrf');
    expect(loginRequest.headers.get('X-Session-Transport')).toBe('cookie');
    expect(loginRequest.headers.has('Authorization')).toBe(false);
    expect(JSON.parse(loginRequest.body)).toMatchObject({
      username: 'nigora.karimova',
      password: 'demo1234',
      platform: 'web',
    });
    expect(session.status).toBe('authenticated');
    expect(localStorage.getItem('sf-session-access')).toBeNull();
    expect(sessionStorage.getItem('sf-session-access')).toBeNull();
  });

  it('uses the exact password-change request and confirms the replacement session', async () => {
    fetchMock
      .mockResolvedValueOnce(response(envelope({ csrf_token: 'bootstrap-csrf' })))
      .mockResolvedValueOnce(response(envelope({ must_change_password: true })))
      .mockResolvedValueOnce(response(envelope(staffIdentity({ must_change_password: true }))))
      .mockResolvedValueOnce(response(envelope({ features: [] })))
      .mockResolvedValueOnce(response(envelope({ must_change_password: false })))
      .mockResolvedValueOnce(response(envelope(staffIdentity())))
      .mockResolvedValueOnce(response(envelope({ features: [] })));

    await auth.login({ username: 'nigora.karimova', password: 'demo1234' });
    expect(auth.requiresPasswordChange()).toBe(true);

    await auth.changePassword({
      currentPassword: 'demo1234',
      newPassword: 'new-password-2026',
    });

    const [url, request] = fetchMock.mock.calls[4];
    expect(url).toBe('/api/v1/auth/password/change/');
    expect(request.headers.get('X-CSRFToken')).toBe('cookie-csrf');
    expect(request.headers.has('Authorization')).toBe(false);
    expect(JSON.parse(request.body)).toEqual({
      old_password: 'demo1234',
      new_password: 'new-password-2026',
    });
    expect(auth.requiresPasswordChange()).toBe(false);
  });

  it('fails closed when the backend staff-app gate rejects a management account', async () => {
    fetchMock
      .mockResolvedValueOnce(response(envelope({ csrf_token: 'bootstrap-csrf' })))
      .mockResolvedValueOnce(response(envelope({ must_change_password: false })))
      .mockResolvedValueOnce(
        response(
          envelope(
            staffIdentity({
              principal_kind: 'staff',
              role_memberships: [
                {
                  account_kind: 'staff',
                  account_type_slug: 'director',
                  account_type_name: 'Director',
                },
              ],
            }),
          ),
        ),
      )
      .mockResolvedValueOnce(
        response(
          {
            success: false,
            code: 'staff_app_account_required',
            message: 'This role account uses a different application.',
          },
          403,
        ),
      );

    const session = await auth.login({ username: 'director', password: 'demo1234' });
    expect(session.status).toBe('forbidden');
    expect(session.user.principal_kind).toBe('staff');
  });

  it('clears the current browser session immediately while logout is still in flight', async () => {
    fetchMock
      .mockResolvedValueOnce(response(envelope({ csrf_token: 'bootstrap-csrf' })))
      .mockResolvedValueOnce(response(envelope({ must_change_password: false })))
      .mockResolvedValueOnce(response(envelope(staffIdentity())))
      .mockResolvedValueOnce(response(envelope({ features: [] })));
    await auth.login({ username: 'nigora.karimova', password: 'demo1234' });

    let finishLogout;
    fetchMock.mockImplementationOnce(
      () => new Promise((resolve) => { finishLogout = () => resolve(response(envelope({}))); }),
    );
    const pending = auth.logout();

    expect(auth.getSessionSnapshot().status).toBe('anonymous');
    finishLogout();
    await pending;
  });
});
