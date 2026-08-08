import { useNavigate } from 'react-router-dom';
import { Avatar, Icon, StarMark } from '@/ui';
import { useT } from '@/hooks/useT.js';
import { DATA_SOURCE } from '@/data/http/apiConfig.js';
import { canAccess } from '@/domain/access.js';
import styles from './AppShell.module.css';
import { NotificationCenter } from './NotificationCenter.jsx';

/**
 * @param {{ title: string, teacher: object|null, drawerOpen: boolean, onOpenDrawer: Function,
 *           onOpenSearch: Function }} props
 */
export function TopBar({ title, teacher, drawerOpen, onOpenDrawer, onOpenSearch }) {
  const navigate = useNavigate();
  const { t } = useT();
  const showAi = DATA_SOURCE !== 'remote' ? teacher?.roleKey === 'teacher' : canAccess(teacher, 'ai_app');
  const showNotifications = DATA_SOURCE !== 'remote' || canAccess(teacher, 'notifications');
  return (
    <header className={styles.top}>
      <button
        className={styles.hamburger}
        onClick={onOpenDrawer}
        aria-label={t('shell.menu')}
        aria-controls="main-navigation"
        aria-expanded={drawerOpen}
      >
        <Icon name="filter" size={20} />
      </button>
      <div className={styles.crumb}>
        <StarMark size={18} color="var(--sf-primary)" />
        <Icon name="chevR" size={12} style={{ color: 'var(--sf-muted)' }} />
        <span className={styles.crumbLabel}>{title}</span>
      </div>
      <button
        type="button"
        className={styles.search}
        onClick={onOpenSearch}
        aria-label={t('shell.searchAll')}
      >
        <Icon name="search" size={16} style={{ color: 'var(--sf-muted)' }} />
        <span>{t('shell.searchAll')}</span>
        <span className={styles.searchKbd}>⌘K</span>
      </button>
      <div className={styles.topActions}>
        {showAi && (
          <button className={styles.topBtn} title={t('nav.ai')} onClick={() => navigate('/ai')}>
            <Icon name="ai" size={18} />
          </button>
        )}
        {showNotifications && <NotificationCenter />}
        <button
          className={styles.topAvatar}
          onClick={() => navigate('/settings')}
          aria-label={t('settings.profile')}
        >
          <Avatar name={teacher?.name ?? 'A'} size={32} color="var(--sf-primary)" />
        </button>
      </div>
    </header>
  );
}
