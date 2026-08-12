import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '@/ceo/styles/foundation-v2.css';
import { StudentsPage } from '@/ceo/pages/StudentsWorkspace.jsx';
import { GroupsPage } from '@/ceo/pages/GroupsWorkspace.jsx';
import { PageLoader } from '@/ceo/components/feedback.jsx';
import { useTeacher } from '@/hooks/data.js';
import { PageError } from '@/layout/PageState.jsx';

function useCeoWorkspaceBridge({ publicSegment, ceoSegment } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const profileState = useTeacher();
  const publicRoute = `${location.pathname.replace(/^\/+/, '')}${location.search}`;
  const route = publicSegment && ceoSegment
    ? publicRoute.replace(new RegExp(`^${publicSegment}(?=/|\\?|$)`), ceoSegment)
    : publicRoute;
  const onNav = useCallback(
    (destination, options = {}) => {
      let raw = String(destination ?? '').trim();
      if (!raw) return;
      if (publicSegment && ceoSegment) {
        raw = raw.replace(new RegExp(`^/?${ceoSegment}(?=/|\\?|$)`), (match) =>
          match.startsWith('/') ? `/${publicSegment}` : publicSegment,
        );
      }
      const target = raw.startsWith('/') ? raw : `/${raw}`;
      navigate(target, { replace: Boolean(options.replace) });
      if (options.scroll !== false) window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [ceoSegment, navigate, publicSegment],
  );
  const user = useMemo(() => {
    const profile = profileState.data;
    if (!profile) return null;
    return {
      ...profile,
      effective_permissions: profile.permissionCodes ?? profile.effective_permissions ?? [],
      read_only_session: Boolean(profile.readOnlySession ?? profile.read_only_session),
      scopes: profile.scopes ?? [],
    };
  }, [profileState.data]);
  return { onNav, profileState, route, user };
}

export function StaffStudentsWorkspace() {
  const { onNav, profileState, route, user } = useCeoWorkspaceBridge();
  if (profileState.loading) return <PageLoader label="Loading student workspace…" />;
  if (profileState.error) return <PageError error={profileState.error} />;
  return <StudentsPage route={route} onNav={onNav} user={user} />;
}

export function StaffGroupsWorkspace() {
  const { onNav, profileState, route, user } = useCeoWorkspaceBridge({
    publicSegment: 'cohorts',
    ceoSegment: 'groups',
  });
  if (profileState.loading) return <PageLoader label="Loading groups workspace…" />;
  if (profileState.error) return <PageError error={profileState.error} />;
  return <GroupsPage route={route} onNav={onNav} user={user} />;
}
