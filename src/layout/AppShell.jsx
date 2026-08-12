import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFetching, useIsMutating, useQuery } from '@tanstack/react-query';
import { Outlet, useLocation } from 'react-router-dom';
import { useServices } from '@/hooks/useServices.js';
import { useTeacher } from '@/hooks/data.js';
import { useT } from '@/hooks/useT.js';
import { accessForPath, navItemForPath, profileCanOpen } from './navConfig.js';
import { isStaffProfile } from '@/domain/access.js';
import { Sidebar } from './Sidebar.jsx';
import { TopBar } from './TopBar.jsx';
import { CommandPalette } from './CommandPalette.jsx';
import { StaffOnlyPage } from '@/app/StaffOnlyPage.jsx';
import { RouteAccessPage } from '@/app/StaffOnlyPage.jsx';
import { PageError, PageLoading } from './PageState.jsx';
import styles from './AppShell.module.css';
import '@/ceo/styles/shell-v2.css';
import '@/styles/staff-shell.css';

function NetworkProgress() {
  const activeRequests = useIsFetching() + useIsMutating();
  return (
    <div className={`ad-network-progress${activeRequests > 0 ? ' is-active' : ''}`} aria-hidden="true">
      <i />
    </div>
  );
}

/** Responsive application chrome: sidebar / topbar / mobile tabs around the routed page. */
export function AppShell() {
  const [drawer, setDrawer] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  const { t, locale, setLocale } = useT();
  const { navigation } = useServices();

  const openDrawer = useCallback(() => setDrawer(true), []);
  const closeDrawer = useCallback(() => setDrawer(false), []);

  // Global ⌘K / Ctrl+K opens the command palette from anywhere in the app.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Prevent the page beneath the mobile drawer from scrolling while the
  // navigation is open.
  useEffect(() => {
    if (!drawer) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawer]);

  const teacherState = useTeacher();
  const teacher = teacherState.data;
  const languageHydrated = useRef(false);
  useEffect(() => {
    if (!teacher || languageHydrated.current) return;
    languageHydrated.current = true;
    if (teacher.preferredLanguage && teacher.preferredLanguage !== locale) {
      setLocale(teacher.preferredLanguage);
    }
  }, [teacher, locale, setLocale]);
  const { data: badges } = useQuery({
    queryKey: ['navigation', 'badges', teacher?.id],
    queryFn: () => navigation.getBadges(),
    enabled: Boolean(teacher),
  });
  const current = navItemForPath(pathname);
  const titleKey = current ? `nav.${current.id}` : '';
  const translatedTitle = current ? t(titleKey) : '';
  const title = current
    ? (translatedTitle === titleKey ? current.label : translatedTitle)
    : 'StarForge';

  // Fail closed while the authenticated identity is unknown. Otherwise a
  // transient /users/me/ failure would briefly expose every role-gated route.
  if (!teacher) {
    return (
      <main className={styles.gate}>
        {teacherState.loading ? <PageLoading /> : <PageError error={teacherState.error} />}
      </main>
    );
  }

  if (!isStaffProfile(teacher)) {
    return <StaffOnlyPage profile={teacher} />;
  }

  if (!profileCanOpen(accessForPath(pathname), teacher)) {
    return <RouteAccessPage profile={teacher} />;
  }

  return (
    <div className="ad-root ad-shell-v2" data-role="staff" data-navigation="sidebar">
      <NetworkProgress />
      <a className="ad-skip-link" href="#staff-workspace">
        Skip to main content
      </a>
      <Sidebar
        teacher={teacher}
        badges={badges ?? {}}
        open={drawer}
        onClose={closeDrawer}
      />

      <div className="ad-col" aria-hidden={drawer ? 'true' : undefined} inert={drawer ? '' : undefined}>
        <TopBar
          title={title}
          teacher={teacher}
          drawerOpen={drawer}
          onOpenDrawer={openDrawer}
          onOpenSearch={() => setPaletteOpen(true)}
        />
        <main id="staff-workspace" className="ad-main" tabIndex="-1">
          {teacher.readOnlySession ? (
            <div className="ad-session-policy-note" role="status" aria-label="View-only session">
              <span className="ad-session-policy-copy">
                <strong>View-only session</strong>
                <small>Your permitted staff data remains available while changes stay disabled.</small>
              </span>
              <span className="ad-session-policy-state">Protected</span>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>

      {drawer ? (
        <button type="button" className="ad-scrim" onClick={closeDrawer} aria-label="Close navigation" />
      ) : null}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} profile={teacher} />
    </div>
  );
}
