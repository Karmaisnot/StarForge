import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isApiMode } from '@/data/http/apiConfig.js';
import { getToken, requiresPasswordChange, subscribeToSession } from '@/data/http/authToken.js';

function readSessionState() {
  return {
    hasSession: Boolean(getToken()),
    mustChangePassword: requiresPasswordChange(),
  };
}

/** Keeps live API routes behind a persisted session while mock mode stays frictionless. */
export function SessionGate() {
  const [session, setSession] = useState(readSessionState);
  const location = useLocation();

  useEffect(() => subscribeToSession(() => setSession(readSessionState())), []);

  if (!isApiMode()) return <Outlet />;
  if (!session.hasSession) return <Navigate to="/login" replace state={{ from: location }} />;
  if (session.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}
