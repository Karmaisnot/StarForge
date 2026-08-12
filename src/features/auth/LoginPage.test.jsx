// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage.jsx';

vi.mock('@/data/http/authToken.js', () => ({
  getToken: () => null,
  login: vi.fn(),
}));

vi.mock('@/hooks/useT.js', () => ({
  useT: () => ({ t: (key) => key }),
}));

vi.mock('@/ui', () => ({ StarMark: () => null }));

describe('LoginPage', () => {
  it('permanently presents username and password credentials', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('auth.username').getAttribute('autocomplete')).toBe('username');
    expect(screen.getByLabelText('auth.password').getAttribute('type')).toBe('password');
    expect(screen.queryByLabelText(/code/i)).toBeNull();
  });
});
