import { describe, expect, it } from 'vitest';
import { isolatedDevelopmentUrl } from './devOrigin.js';

describe('isolatedDevelopmentUrl', () => {
  it('preserves the port and route while isolating the staff session', () => {
    const location = new URL('http://127.0.0.1:5175/forms/9?from=today');

    expect(isolatedDevelopmentUrl(location, 'staff.localhost')).toBe(
      'http://staff.localhost:5175/forms/9?from=today',
    );
  });

  it('leaves non-loopback hosts alone', () => {
    expect(isolatedDevelopmentUrl(new URL('https://staff.example.com/forms'), 'staff.localhost')).toBe('');
  });
});
