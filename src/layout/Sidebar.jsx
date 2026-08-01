import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Icon, StarMark, AiBadge } from '@/ui';
import { useT } from '@/hooks/useT.js';
import { PRIMARY_NAV, SECONDARY_NAV, visibleNav } from './navConfig.js';
import { NavItem } from './NavItem.jsx';
import styles from './AppShell.module.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * @param {{ teacher: object|null, badges: object, aiUsage: object|null,
 *           open: boolean, onClose: Function }} props
 */
export function Sidebar({ teacher, badges = {}, aiUsage, open, onClose }) {
  const navigate = useNavigate();
  const { t } = useT();
  const pct = aiUsage?.percent ?? 0;
  const drawerRef = useRef(null);
  const closeRef = useRef(null);
  const closeHandlerRef = useRef(onClose);
  const previouslyFocusedRef = useRef(null);
  closeHandlerRef.current = onClose;

  // The mobile sidebar is a modal drawer. Keep keyboard focus inside it,
  // support Escape, and return focus to the opener after it closes.
  useEffect(() => {
    if (!open) return undefined;
    const drawer = drawerRef.current;
    previouslyFocusedRef.current = document.activeElement;
    const focusables = () => (drawer ? [...drawer.querySelectorAll(FOCUSABLE)] : []);
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeHandlerRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) {
        event.preventDefault();
        drawer?.focus();
        return;
      }
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
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      const previouslyFocused = previouslyFocusedRef.current;
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  return (
    <aside
      ref={drawerRef}
      id="main-navigation"
      className={`${styles.side} ${open ? styles.open : ''}`}
      role={open ? 'dialog' : undefined}
      aria-modal={open ? true : undefined}
      aria-label={open ? t('shell.menu') : undefined}
      tabIndex={open ? -1 : undefined}
    >
      <div className={styles.sideInner}>
        <div className={styles.brand}>
          <button
            type="button"
            className={styles.brandLink}
            onClick={() => {
              navigate('/today');
              onClose();
            }}
          >
            <StarMark size={28} color="var(--sf-primary)" />
            <div className={styles.brandText}>
              <div className={styles.brandName}>
                StarForge<span style={{ color: 'var(--sf-muted)', fontWeight: 500 }}> · EDU</span>
              </div>
              <div className={styles.brandSub}>{teacher?.branch ?? t('cohorts.branch')}</div>
            </div>
          </button>
          <button
            ref={closeRef}
            type="button"
            className={styles.sideClose}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label={t('common.close')}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className={styles.sideSection}>{t('shell.primary')}</div>
        {visibleNav(PRIMARY_NAV, teacher).map((item) => (
          <NavItem key={item.id} item={item} badge={badges[item.badge]} onNavigate={onClose} />
        ))}

        <div className={styles.sideSection}>{t('shell.documents')}</div>
        {visibleNav(SECONDARY_NAV, teacher).map((item) => (
          <NavItem key={item.id} item={item} badge={badges[item.badge]} onNavigate={onClose} />
        ))}

        {visibleNav(PRIMARY_NAV, teacher).some((item) => item.id === 'ai') && (
          <div className={styles.sideAi}>
            <div className={styles.sideAiHead}>
              <AiBadge compact>{t('shell.limit')}</AiBadge>
              <span className="sf-mono" style={{ fontSize: 10, color: 'var(--sf-muted)' }}>
                {pct}%
              </span>
            </div>
            <div className={styles.sideAiBar}>
              <div style={{ width: `${pct}%` }} />
            </div>
            <div className={`sf-mono ${styles.sideAiMeta}`}>
              {(aiUsage?.used ?? 0).toLocaleString('ru-RU')} /{' '}
              {(aiUsage?.limit ?? 0).toLocaleString('ru-RU')} {t('shell.token')}
            </div>
          </div>
        )}

        <button
          className={styles.sideProfile}
          onClick={() => {
            navigate('/settings');
            onClose();
          }}
        >
          <Avatar name={teacher?.name ?? 'A'} size={36} color="var(--sf-primary)" />
          <div className={styles.profileText}>
            <div className={styles.profileName}>{teacher?.name ?? '—'}</div>
            <div className={styles.profileRole}>
              <span className={styles.shareDot} />
              {t('shell.profileShared')}
            </div>
          </div>
          <Icon name="settings" size={16} style={{ color: 'var(--sf-muted)' }} />
        </button>
      </div>
    </aside>
  );
}
