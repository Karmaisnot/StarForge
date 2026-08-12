// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PasswordChangePage } from './PasswordChangePage.jsx';

vi.mock('@/data/http/authToken.js', () => ({
  changePassword: vi.fn(),
  getToken: () => 'temporary-session',
  logout: vi.fn(),
  requiresPasswordChange: () => true,
}));

vi.mock('@/hooks/useT.js', () => ({
  useT: () => ({ t: (key) => key }),
}));

vi.mock('@/ui', () => ({ StarMark: () => null }));

describe('PasswordChangePage', () => {
  it('shows only the mandatory password-change form for a temporary session', () => {
    render(
      <MemoryRouter>
        <PasswordChangePage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('auth.currentPassword')).toHaveProperty('type', 'password');
    expect(screen.getByLabelText('auth.newPassword').getAttribute('minlength')).toBe('12');
    expect(screen.getByLabelText('auth.confirmPassword')).toHaveProperty('type', 'password');
    expect(screen.queryByText('auth.today')).toBeNull();
  });
});
