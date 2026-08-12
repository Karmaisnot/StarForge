// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('password login API contract', () => {
  let auth;
  let fetchMock;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ token: 'test-session-token' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    auth = await import('./authToken.js');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('posts username and password to the production API login route', async () => {
    await auth.login({ username: 'nigora.karimova', password: 'demo1234' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe('https://starforge.78.111.91.113.nip.io/api/v1/auth/role-login/');
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body)).toMatchObject({
      username: 'nigora.karimova',
      password: 'demo1234',
    });
  });
});
