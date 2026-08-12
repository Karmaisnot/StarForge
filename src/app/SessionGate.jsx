import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isApiMode } from '@/data/http/apiConfig.js';
import {
  getSessionSnapshot,
  hydrateSession,
  subscribeToSession,
} from '@/data/http/authToken.js';
import { StaffOnlyPage } from '@/app/StaffOnlyPage.jsx';
import { PageError, PageLoading } from '@/layout/PageState.jsx';

function accessProfile(user) {
  const membership = user?.role_memberships?.[0] ?? {};
  return {
    name: user?.full_name || user?.username || 'StarForge user',
    role:
      membership.account_type_name ||
      membership.legacy_role ||
      membership.account_type_slug ||
      user?.principal_kind ||
      '',
  };
}

/** Hydrates the opaque browser session before any private route can render. */
export function SessionGate() {
  const [session, setSession] = useState(getSessionSnapshot);
  const location = useLocation();

  useEffect(() => subscribeToSession(setSession), []);
  useEffect(() => {
    if (isApiMode() && getSessionSnapshot().status === 'checking') void hydrateSession();
  }, []);

  if (!isApiMode()) return <Outlet />;
  if (session.status === 'checking') return <PageLoading />;
  if (session.status === 'error') return <PageError error={session.error} />;
  if (session.status === 'forbidden') return <StaffOnlyPage profile={accessProfile(session.user)} />;
  if (session.status === 'anonymous' || session.status === 'signout-unconfirmed') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location, sessionMessage: session.reason }}
      />
    );
  }
  if (session.status === 'password-change' && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  if (session.status === 'authenticated' && location.pathname === '/change-password') {
    return <Navigate to="/today" replace />;
  }
  return <Outlet />;
}
