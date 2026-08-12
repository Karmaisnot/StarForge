import { useNavigate } from 'react-router-dom';
import { Icon } from '@/ui';
import { SfAvatar, SfStar } from '@/ceo/components/primitives.jsx';
import { useT } from '@/hooks/useT.js';
import { useTheme } from '@/hooks/useTheme.js';
import { DATA_SOURCE } from '@/data/http/apiConfig.js';
import { canAccess } from '@/domain/access.js';
import { NotificationCenter } from './NotificationCenter.jsx';

function profileScope(teacher) {
  const names = [
    ...new Set(
      (teacher?.roleMemberships ?? [])
        .map((membership) => membership?.branch_name)
        .filter(Boolean),
    ),
  ];
  if (names.length > 1) return `${names.length} assigned branches`;
  return names[0] || teacher?.branch || 'Assigned scope';
}
/** CEO masthead geometry with staff-owned navigation, theme, alerts, and profile. */
export function TopBar({
  title,
  teacher,
  drawerOpen,
  onOpenDrawer,
  onOpenSearch,
}) {
  const navigate = useNavigate();
  const { t } = useT();
  const { dark, toggleDark } = useTheme();
  const showAi =
    DATA_SOURCE !== 'remote' ? teacher?.roleKey === 'teacher' : canAccess(teacher, 'ai_app');
  const showNotifications = DATA_SOURCE !== 'remote' || canAccess(teacher, 'notifications');
  const roleLabel = teacher?.role || (teacher?.accountKind === 'teacher' ? 'Teacher' : 'Staff');
  const accountPath = DATA_SOURCE === 'remote' ? '/account/profile' : '/settings';

  return (
    <header className="ad-masthead" data-layout="sidebar">
      <div className="ad-top">
        <button
          type="button"
          className="ad-masthead-brand"
          onClick={() => navigate('/today')}
          aria-label="StarForge EDU"
        >
          <span aria-hidden="true">
            <SfStar size={20} color="currentColor" />
          </span>
          <strong>
            StarForge <small>EDU</small>
          </strong>
        </button>

        <div className="ad-top-context">
          <span>
            {teacher?.accountKind === 'teacher' ? 'Teacher' : 'Staff'} · {profileScope(teacher)}
          </span>
          <strong>{title}</strong>
        </div>

        <div className="ad-command">
          <button
            type="button"
            className="ad-command-trigger"
            onClick={onOpenSearch}
            aria-label={t('shell.searchAll')}
          >
            <Icon name="search" size={16} />
            <span>{t('shell.searchAll')}</span>
            <kbd>Ctrl K</kbd>
          </button>
        </div>

        <div className="ad-top-actions">
          <button
            type="button"
            className="ad-top-ic"
            onClick={toggleDark}
            aria-label={dark ? t('auth.useLightTheme') : t('auth.useDarkTheme')}
            title={dark ? t('auth.useLightTheme') : t('auth.useDarkTheme')}
          >
            <Icon name={dark ? 'moon' : 'sun'} size={17} />
          </button>

          {showAi ? (
            <button
              type="button"
              className="ad-top-ic"
              title={t('nav.ai')}
              onClick={() => navigate('/ai')}
            >
              <Icon name="ai" size={17} />
            </button>
          ) : null}

          {showNotifications ? <NotificationCenter shell /> : null}

          <button
            type="button"
            className="ad-top-av"
            onClick={() => navigate(accountPath)}
            aria-label={`${teacher?.name ?? 'Staff member'} · ${t('settings.profile')}`}
          >
            <SfAvatar name={teacher?.name ?? 'A'} size={32} color="var(--sf-primary)" decorative />
            <span>
              <strong>{teacher?.name ?? 'Staff member'}</strong>
              <small>{roleLabel}</small>
            </span>
          </button>

          <button
            type="button"
            className="ad-mobile-navigator"
            onClick={onOpenDrawer}
            data-navigator-trigger
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            aria-controls="main-navigation"
            aria-label={t('shell.menu')}
          >
            <Icon name="filter" size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
