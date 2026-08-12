import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AccountPage } from '@/ceo/pages/AccountWorkspace.jsx';
import { PageLoader } from '@/ceo/components/feedback.jsx';
import { useTeacher } from '@/hooks/data.js';
import { PageError } from '@/layout/PageState.jsx';

export function StaffAccountWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const profileState = useTeacher();
  const route = `${location.pathname.replace(/^\/+/, '')}${location.search}`;
  const onNav = useCallback((destination, options = {}) => {
    const raw = String(destination ?? '').trim();
    if (!raw) return;
    navigate(raw.startsWith('/') ? raw : `/${raw}`, { replace: Boolean(options.replace) });
    if (options.scroll !== false) window.scrollTo({ top: 0, behavior: 'auto' });
  }, [navigate]);
  const user = useMemo(() => {
    const profile = profileState.data;
    if (!profile) return null;
    return {
      ...profile,
      effective_permissions: profile.permissionCodes ?? profile.effective_permissions ?? [],
      read_only_session: Boolean(profile.readOnlySession ?? profile.read_only_session),
    };
  }, [profileState.data]);

  if (profileState.loading) return <PageLoader label="Loading your account…" />;
  if (profileState.error) return <PageError error={profileState.error} />;
  return <AccountPage route={route} onNav={onNav} user={user} />;
}
