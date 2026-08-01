import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Outlet, useLocation } from 'react-router-dom';
import { useServices } from '@/hooks/useServices.js';
import { useTeacher } from '@/hooks/data.js';
import { useT } from '@/hooks/useT.js';
import { ALL_NAV } from './navConfig.js';
import { Sidebar } from './Sidebar.jsx';
import { TopBar } from './TopBar.jsx';
import { MobileTabs } from './MobileTabs.jsx';
import { CommandPalette } from './CommandPalette.jsx';
import { StaffOnlyPage } from '@/app/StaffOnlyPage.jsx';
import { RouteAccessPage } from '@/app/StaffOnlyPage.jsx';
import { PageError, PageLoading } from './PageState.jsx';
import styles from './AppShell.module.css';

/** Responsive application chrome: sidebar / topbar / mobile tabs around the routed page. */
export function AppShell() {
  const [drawer, setDrawer] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  const { t, locale, setLocale } = useT();
  const { ai, navigation } = useServices();

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
  const { data: aiUsage } = useQuery({
    queryKey: ['ai', 'usage', teacher?.id],
    queryFn: () => ai.getUsage(),
    enabled: teacher?.roleKey === 'teacher',
  });

  const current = ALL_NAV.find((n) => pathname.startsWith(n.path));
  const title = current ? t(`nav.${current.id}`) : 'StarForge';

  // Fail closed while the authenticated identity is unknown. Otherwise a
  // transient /users/me/ failure would briefly expose every role-gated route.
  if (!teacher) {
    return (
      <main className={styles.gate}>
        {teacherState.loading ? <PageLoading /> : <PageError error={teacherState.error} />}
      </main>
    );
  }

  if (['director', 'head_of_dept'].includes(teacher?.roleKey)) {
    return <StaffOnlyPage profile={teacher} />;
  }

  if (current?.roles && !current.roles.includes(teacher.roleKey)) {
    return <RouteAccessPage profile={teacher} />;
  }

  return (
    <div className={styles.root}>
      <Sidebar
        teacher={teacher}
        badges={badges ?? {}}
        aiUsage={aiUsage}
        open={drawer}
        onClose={closeDrawer}
      />
      {drawer && <div className={styles.scrim} aria-hidden="true" onClick={closeDrawer} />}

      <div className={styles.col}>
        <TopBar
          title={title}
          teacher={teacher}
          drawerOpen={drawer}
          onOpenDrawer={openDrawer}
          onOpenSearch={() => setPaletteOpen(true)}
        />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>

      <MobileTabs badges={badges ?? {}} profile={teacher} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} profile={teacher} />
    </div>
  );
}
