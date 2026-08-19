import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '@/ui';
import { BrandLogo } from '@/ui/BrandLogo.jsx';
import { SfAvatar } from '@/ceo/components/primitives.jsx';
import { logout } from '@/data/http/authToken.js';
import { DATA_SOURCE } from '@/data/http/apiConfig.js';
import { useT } from '@/hooks/useT.js';
import { PRIMARY_NAV, SECONDARY_NAV, visibleNav } from './navConfig.js';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function activePath(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

function navLabel(item, t) {
  const translated = t(`nav.${item.id}`);
  return translated === `nav.${item.id}` ? item.label : translated;
}

function scopeLabel(teacher) {
  const names = [
    ...new Set(
      (teacher?.roleMemberships ?? [])
        .map((membership) => membership?.branch_name)
        .filter(Boolean),
    ),
  ];
  if (names.length > 1) return `${names.length} assigned branches`;
  return names[0] || teacher?.branch || 'Assigned staff scope';
}

function RailGroup({ title, items, pathname, badges, onNavigate, t }) {
  if (!items.length) return null;
  return (
    <section className="ad-rail-group">
      <h2>{title}</h2>
      {items.map((item) => {
        const selected = activePath(pathname, item.path);
        const badge = Number(badges[item.badge] ?? 0);
        return (
          <Link
            key={item.id}
            className={`ad-rail-link${selected ? ' is-current' : ''}`}
            to={item.path}
            onClick={onNavigate}
            aria-current={selected ? 'page' : undefined}
          >
            <span>
              <Icon name={item.icon} size={16} />
            </span>
            <strong>{navLabel(item, t)}</strong>
            {selected ? <i aria-hidden="true" /> : badge > 0 ? <em>{badge > 99 ? '99+' : badge}</em> : null}
          </Link>
        );
      })}
    </section>
  );
}

/** CEO-shell navigation rail adapted to the signed-in staff permission graph. */
export function Sidebar({ teacher, badges = {}, open, onClose }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useT();
  const drawerRef = useRef(null);
  const closeRef = useRef(null);
  const [signingOut, setSigningOut] = useState(false);
  const primary = visibleNav(PRIMARY_NAV, teacher);
  const secondary = visibleNav(SECONDARY_NAV, teacher);

  useEffect(() => {
    if (!open) return undefined;
    const drawer = drawerRef.current;
    const previous = document.activeElement;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = drawer ? [...drawer.querySelectorAll(FOCUSABLE)] : [];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown, true);
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus();
    };
  }, [onClose, open]);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } catch {
      // The local session is still abandoned when the server is unreachable.
    } finally {
      navigate('/login', { replace: true });
      onClose();
      setSigningOut(false);
    }
  };

  return (
    <aside
      ref={drawerRef}
      id="main-navigation"
      className={`ad-sidebar-rail${open ? ' is-open' : ''}`}
      role={open ? 'dialog' : undefined}
      aria-modal={open ? 'true' : undefined}
      aria-label={t('shell.menu')}
      tabIndex={open ? -1 : undefined}
    >
      <header className="ad-rail-head">
        <button
          type="button"
          className="ad-rail-brand"
          onClick={() => {
            navigate('/today');
            onClose();
          }}
        >
          <BrandLogo decorative />
        </button>
        <button
          ref={closeRef}
          type="button"
          className="ad-rail-close"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <Icon name="x" size={17} />
        </button>
      </header>

      <div className="ad-rail-scope">
        <span aria-hidden="true">
          <Icon name="globe" size={16} />
        </span>
        <span>
          <small>{teacher?.accountKind === 'teacher' ? 'Teaching scope' : 'Staff scope'}</small>
          <strong>{scopeLabel(teacher)}</strong>
        </span>
      </div>

      <nav className="ad-rail-nav" aria-label={t('shell.menu')}>
        <RailGroup
          title={t('shell.primary')}
          items={primary}
          pathname={pathname}
          badges={badges}
          onNavigate={onClose}
          t={t}
        />
        <RailGroup
          title={t('shell.documents')}
          items={secondary}
          pathname={pathname}
          badges={badges}
          onNavigate={onClose}
          t={t}
        />
      </nav>

      <footer className="ad-rail-footer">
        <button
          type="button"
          className="ad-rail-profile"
          onClick={() => {
            navigate(DATA_SOURCE === 'remote' ? '/account/profile' : '/settings');
            onClose();
          }}
        >
          <SfAvatar name={teacher?.name ?? 'A'} size={36} color="var(--sf-primary)" decorative />
          <span>
            <strong>{teacher?.name ?? 'Staff member'}</strong>
            <small>{teacher?.role || (teacher?.accountKind === 'teacher' ? 'Teacher' : 'Staff')}</small>
          </span>
        </button>
        <button
          type="button"
          className="ad-rail-logout"
          onClick={signOut}
          disabled={signingOut}
          aria-label={t('auth.signOut')}
          title={t('auth.signOut')}
        >
          <Icon name="logout" size={16} />
        </button>
      </footer>
    </aside>
  );
}
