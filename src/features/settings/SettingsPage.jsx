import { useCallback, useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { ThemeControls } from '@/layout/ThemeSwitcher.jsx';
import { AiBadge, Avatar, Button, Card, Icon, Modal, ProgressBar } from '@/ui';
import { useServices } from '@/hooks/useServices.js';
import { useAsync } from '@/hooks/useAsync.js';
import { useTheme } from '@/hooks/useTheme.js';
import { useToast } from '@/hooks/useToast.js';
import { useT } from '@/hooks/useT.js';
import { logout } from '@/data/http/authToken.js';
import {
  DASHBOARD_WIDGET_KEYS,
  readDashboardHiddenWidgets,
  saveDashboardHiddenWidgets,
} from '@/features/today/dashboardPreferences.js';
import styles from './settings.module.css';

const LANG_LABELS = { uz: "O'zbekcha", ru: 'Русский', en: 'English' };

// localStorage key + static default toggle values, kept locale-independent so they
// can seed lazy state and be merged over persisted values (new keys still default).
const SETTINGS_KEY = 'sf-settings';
const TOGGLE_DEFAULTS = {
  notifPush: true,
  notifCards: true,
  notifMgmt: true,
  notifSurvey: false,
  shareProfile: true,
  anonSurvey: true,
  aiData: true,
  betaCalendar: false,
  betaVoice: false,
};

function Toggle({ on, onClick, label }) {
  return (
    <button
      type="button"
      className={`${styles.toggle} ${on ? styles.toggleOn : ''}`}
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
    >
      <span className={styles.knob} />
    </button>
  );
}

export function SettingsPage() {
  const toast = useToast();
  const { t, locale, locales, setLocale } = useT();
  const { ai, account } = useServices();
  const { palette, dark } = useTheme();
  const { data: usage } = useAsync(() => ai.getUsage(), []);

  // Bump keys give us a refetch handle over useAsync (which exposes none): a
  // successful write increments the key so the loader re-runs against the server.
  const [teacherKey, setTeacherKey] = useState(0);
  const [sessionsKey, setSessionsKey] = useState(0);
  const reloadTeacher = useCallback(() => setTeacherKey((k) => k + 1), []);
  const reloadSessions = useCallback(() => setSessionsKey((k) => k + 1), []);

  const { data: teacher } = useAsync(() => account.getTeacher(), [locale, teacherKey]);
  // Backend settings (toggles + theme + locale). Loaded once; localStorage is the
  // first-paint cache, the server is the source of truth we reconcile against.
  const { data: serverSettings } = useAsync(() => account.getSettings(), []);
  // Active device sessions for the Devices card (re-loaded after an eject).
  const { data: sessions } = useAsync(() => account.listSessions(), [sessionsKey]);

  // Editable profile overlay on top of the loaded teacher record. Cleared once a
  // save persists and the refetched teacher carries the new values.
  const [edits, setEdits] = useState(null);
  const profile = { ...teacher, ...edits };
  const [editOpen, setEditOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);
  // Optimistically removed session ids — hidden immediately, reconciled by refetch.
  const [ejected, setEjected] = useState([]);
  const devices = (sessions ?? []).filter((s) => !ejected.includes(s.id));
  // Map a server session to a display label, reusing the existing localized
  // strings for the known web/mobile platforms and falling back to the UA.
  const deviceLabel = (dvc) => {
    if (dvc.platform === 'web') return t('settings.deviceWeb');
    if (dvc.platform === 'mobile') return t('settings.deviceMobile');
    return dvc.userAgent || dvc.platform || t('settings.devices');
  };
  const [draft, setDraft] = useState({ name: '', username: '' });
  const usernameEditable = profile?.usernameEditable !== false;
  useEffect(() => {
    if (editOpen) setDraft({ name: profile.name ?? '', username: profile.username ?? '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen]);

  const ejectDevice = async (id) => {
    // Optimistic hide, then persist and reload; restore on failure.
    setEjected((list) => [...list, id]);
    toast(t('settings.sessionEnded'));
    try {
      await account.ejectSession(id);
      reloadSessions();
      setEjected((list) => list.filter((x) => x !== id));
    } catch {
      setEjected((list) => list.filter((x) => x !== id));
      toast(t('common.error'), 'error');
    }
  };
  const saveProfile = async (e) => {
    e.preventDefault();
    const next = {
      name: draft.name.trim() || profile.name,
      username: usernameEditable ? draft.username.trim() || profile.username : profile.username,
    };
    // Optimistic overlay so the card updates instantly.
    setEdits(next);
    setEditOpen(false);
    toast(t('settings.profileSaved'), 'success');
    try {
      await account.updateTeacher({
        name: next.name,
        ...(usernameEditable ? { username: next.username } : {}),
      });
      // Server truth now carries the change — refetch and drop the local overlay.
      reloadTeacher();
      setEdits(null);
    } catch {
      setEdits(null); // roll back the optimistic overlay
      toast(t('common.error'), 'error');
    }
  };
  const confirmLogout = async () => {
    setLogoutOpen(false);
    try {
      await logout();
      setLoggedOut(true);
      toast(t('settings.loggedOut'));
    } catch {
      toast(t('common.error'), 'error');
    }
  };

  const sections = [
    {
      title: t('settings.notifications'),
      items: [
        { key: 'notifPush', label: t('settings.notifPush') },
        { key: 'notifCards', label: t('settings.notifCards') },
        { key: 'notifMgmt', label: t('settings.notifMgmt') },
        { key: 'notifSurvey', label: t('settings.notifSurvey') },
      ],
    },
    {
      title: t('settings.privacy'),
      items: [
        { key: 'shareProfile', label: t('settings.shareProfile') },
        { key: 'anonSurvey', label: t('settings.anonSurvey') },
        { key: 'aiData', label: t('settings.aiData') },
      ],
    },
    {
      title: t('settings.beta'),
      items: [
        { key: 'betaCalendar', label: t('settings.betaCalendar') },
        { key: 'betaVoice', label: t('settings.betaVoice') },
      ],
    },
  ];

  // Seed from localStorage merged over TOGGLE_DEFAULTS so persisted choices
  // survive a reload while any newly added key still gets its default.
  const [toggles, setToggles] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return TOGGLE_DEFAULTS;
      const valid = {};
      for (const key of Object.keys(TOGGLE_DEFAULTS)) {
        if (typeof saved[key] === 'boolean') valid[key] = saved[key];
      }
      return { ...TOGGLE_DEFAULTS, ...valid };
    } catch {
      return TOGGLE_DEFAULTS;
    }
  });
  const [dashboardHidden, setDashboardHidden] = useState(readDashboardHiddenWidgets);

  useEffect(() => {
    saveDashboardHiddenWidgets(dashboardHidden);
  }, [dashboardHidden]);

  const flipDashboardWidget = (key) => {
    const visible = !dashboardHidden[key];
    setDashboardHidden((current) => ({ ...current, [key]: visible }));
    toast(`${t(`today.w_${key}`)}: ${visible ? t('settings.off') : t('settings.on')}`);
  };

  // When the backend settings arrive, reconcile the toggle keys over the cached
  // state — the server is the source of truth, localStorage only a first-paint cache.
  useEffect(() => {
    if (!serverSettings) return;
    setToggles((tg) => {
      const merged = { ...tg };
      for (const key of Object.keys(TOGGLE_DEFAULTS)) {
        if (typeof serverSettings[key] === 'boolean') merged[key] = serverSettings[key];
      }
      return merged;
    });
  }, [serverSettings]);

  // Persist on every change; ignore quota/serialization errors.
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(toggles));
    } catch {
      /* ignore quota/serialization errors */
    }
  }, [toggles]);
  const flip = (key, label) => {
    // Compute the next value from the current render's state, then update + toast
    // OUTSIDE the updater — calling toast() (a setState) inside it would fire a
    // "setState while rendering another component" warning.
    const next = !toggles[key];
    setToggles((tg) => ({ ...tg, [key]: next }));
    toast(`${label}: ${next ? t('settings.on') : t('settings.off')}`);
    // Field-level persist: send only the changed key. Roll back the optimistic
    // flip (and the cache effect follows) if the backend rejects it.
    account.patchSettings({ [key]: next }).catch(() => {
      setToggles((tg) => ({ ...tg, [key]: !next }));
      toast(t('common.error'), 'error');
    });
  };

  const changeLanguage = (next) => {
    if (next === locale) return;

    setLocale(next);
    toast(LANG_LABELS[next]);
    account.patchSettings({ locale: next }).catch(() => toast(t('common.error'), 'error'));
  };

  // Persist theme palette/dark changes. ThemeControls mutates the theme context
  // directly (we cannot edit it), so we observe palette/dark here and patch the
  // changed field, skipping the initial mount and the server-driven hydration.
  const themeHydrated = useRef(false);
  useEffect(() => {
    if (!serverSettings) return;
    // First time the server values arrive, treat as hydration (no write-back).
    themeHydrated.current = true;
  }, [serverSettings]);
  const prevPalette = useRef(palette);
  useEffect(() => {
    if (prevPalette.current === palette) return;
    prevPalette.current = palette;
    if (!themeHydrated.current) return;
    account.patchSettings({ palette }).catch(() => toast(t('common.error'), 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette]);
  const prevDark = useRef(dark);
  useEffect(() => {
    if (prevDark.current === dark) return;
    prevDark.current = dark;
    if (!themeHydrated.current) return;
    account.patchSettings({ dark }).catch(() => toast(t('common.error'), 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);

  if (loggedOut) {
    return (
      <div className={styles.loggedOut}>
        <Avatar name={profile.name ?? 'A'} size={72} color="var(--sf-primary)" />
        <div style={{ fontSize: 20, fontWeight: 800 }}>{t('settings.loggedOut')}</div>
        <Button variant="primary" icon="logout" onClick={() => setLoggedOut(false)}>
          {t('settings.logBackIn')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={t('settings.profile')}
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        right={
          <Button variant="soft" icon="logout" onClick={() => setLogoutOpen(true)}>
            {t('settings.logout')}
          </Button>
        }
      />

      <div className={styles.grid}>
        <div className={styles.col}>
          <Card title={t('settings.profile')}>
            <div className={styles.profile}>
              <Avatar name={teacher?.name ?? 'A'} size={64} color="var(--sf-primary)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{profile?.name ?? '—'}</div>
                <div style={{ fontSize: 13, color: 'var(--sf-muted)' }}>
                  {profile?.role} · {profile?.branch}
                </div>
                <div
                  className="sf-mono"
                  style={{ fontSize: 11, color: 'var(--sf-muted)', marginTop: 4 }}
                >
                  @{profile?.username}
                </div>
              </div>
              <Button variant="soft" icon="edit" onClick={() => setEditOpen(true)}>
                {t('settings.editProfile')}
              </Button>
            </div>
            <div className={styles.subjects}>
              {(teacher?.subjects ?? []).map((s) => (
                <span key={s} className={styles.subjectChip}>
                  {s}
                </span>
              ))}
            </div>
          </Card>

          {sections.map((section) => (
            <Card key={section.title} title={section.title} padded={false}>
              {section.items.map((item) => (
                <div key={item.key} className={styles.row}>
                  <span>{item.label}</span>
                  <Toggle
                    on={toggles[item.key]}
                    onClick={() => flip(item.key, item.label)}
                    label={item.label}
                  />
                </div>
              ))}
            </Card>
          ))}
        </div>

        <div className={styles.col}>
          <Card title={t('settings.theme')}>
            <ThemeControls />
          </Card>

          <Card title={t('settings.language')}>
            <div className={styles.langRow}>
              <span className={styles.langBadge} aria-hidden="true">
                <Icon name="globe" size={18} />
              </span>
              <div className={styles.languagePicker} role="group" aria-label={t('settings.language')}>
                {locales.map((next) => {
                  const active = locale === next;
                  return (
                    <button
                      key={next}
                      type="button"
                      className={`${styles.languageOption} ${active ? styles.languageOptionActive : ''}`}
                      aria-label={LANG_LABELS[next]}
                      aria-pressed={active}
                      onClick={() => changeLanguage(next)}
                    >
                      <span className={styles.languageCode}>{next.toUpperCase()}</span>
                      <span className={styles.languageName}>{LANG_LABELS[next]}</span>
                      {active && <Icon name="check" size={13} className={styles.languageCheck} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card title={t('settings.dashboardWidgets')} padded={false}>
            <div className={styles.cardHint}>{t('settings.dashboardWidgetsHint')}</div>
            {DASHBOARD_WIDGET_KEYS.map((key) => {
              const visible = !dashboardHidden[key];
              return (
                <div key={key} className={styles.row}>
                  <span>{t(`today.w_${key}`)}</span>
                  <Toggle
                    on={visible}
                    onClick={() => flipDashboardWidget(key)}
                    label={t(`today.w_${key}`)}
                  />
                </div>
              );
            })}
          </Card>

          <Card title={t('settings.aiLimit')}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <AiBadge compact>{t('ai.limit')}</AiBadge>
              <span className="sf-mono" style={{ fontSize: 12, color: 'var(--sf-muted)' }}>
                {usage?.used ?? 0} / {usage?.limit ?? 0}
              </span>
            </div>
            <ProgressBar value={usage?.percent ?? 0} color="var(--sf-ai)" />
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--sf-muted)' }}>
              {t('settings.limitManaged')} · {usage?.percent ?? 0}% {t('settings.used')}
            </div>
          </Card>

          <Card title={t('settings.devices')} padded={false}>
            {devices.map((dvc) => (
              <div key={dvc.id} className={styles.row}>
                <span>{deviceLabel(dvc)}</span>
                <Button variant="ghost" onClick={() => ejectDevice(dvc.id)}>
                  {t('settings.eject')}
                </Button>
              </div>
            ))}
            {devices.length === 0 && (
              <div className={styles.row} style={{ color: 'var(--sf-muted)' }}>
                {t('settings.noDevices')}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('settings.editProfile')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" icon="check" onClick={saveProfile}>
              {t('settings.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={saveProfile} className={styles.editForm}>
          <label className={styles.editField}>
            <span>{t('settings.fName')}</span>
            <input
              className={styles.editInput}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              autoFocus
            />
          </label>
          <label className={styles.editField}>
            <span>{t('settings.fUsername')}</span>
            <input
              className={styles.editInput}
              value={draft.username}
              onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
              disabled={!usernameEditable}
            />
            {!usernameEditable && (
              <small style={{ color: 'var(--sf-muted)', lineHeight: 1.35 }}>
                {t('settings.usernameManaged')}
              </small>
            )}
          </label>
        </form>
      </Modal>

      <Modal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title={t('settings.logout')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setLogoutOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" icon="logout" onClick={confirmLogout}>
              {t('settings.logout')}
            </Button>
          </>
        }
      >
        <div style={{ fontSize: 14, color: 'var(--sf-ink-2)' }}>{t('settings.logoutConfirm')}</div>
      </Modal>
    </>
  );
}
