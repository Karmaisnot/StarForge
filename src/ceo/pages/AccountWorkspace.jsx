import { cloneElement, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { httpRequest } from '../api/http.js';
import { queryClient } from '../api/queryClient.js';
import { Icons } from '../components/Icons.jsx';
import {
  ActionButton,
  DetailGrid,
  DetailSection,
  LinkButton,
  ProfileHero,
  SectionNav,
  StatusPill,
  WorkspaceHeader,
  WorkspaceLayout,
  WorkspaceState,
  WorkspaceTable,
} from '../components/WorkspacePrimitives.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  changePassword,
  hydrateSession,
  logout,
} from '@/data/http/authToken.js';
import { ThemeControls } from '@/layout/ThemeSwitcher.jsx';
import { useServices } from '@/hooks/useServices.js';
import { useT } from '@/hooks/useT.js';
import {
  DASHBOARD_WIDGET_KEYS,
  readDashboardHiddenWidgets,
  saveDashboardHiddenWidgets,
} from '@/features/today/dashboardPreferences.js';
import { useWorkspaceData, workspaceRoute } from '../hooks/useWorkspaceData.js';
import { formatGender, formatOrganizationDate } from '../lib/formatters.js';
import {
  PASSWORD_MAX_LENGTH,
  passwordChangeFailure,
  validatePasswordChange,
} from '../lib/passwordPolicy.js';
import { userFacingError } from '../lib/userFacingError.js';
import '../styles/account-v3.css';
import '../styles/focused-v3.css';

const SECTIONS = Object.freeze([
  { id: 'profile', label: 'Profile', description: 'Identity and contact', icon: Icons.user },
  { id: 'notifications', label: 'Notifications', description: 'Delivery preferences', icon: Icons.bell },
  { id: 'security', label: 'Security', description: 'Password and session', icon: Icons.shield },
  { id: 'devices', label: 'Devices', description: 'Recognized sign-ins', icon: Icons.globe },
  { id: 'access', label: 'My access', description: 'Roles and assigned staff scope', icon: Icons.check },
  { id: 'workspace', label: 'Workspace', description: 'Appearance and language', icon: Icons.settings },
]);

const PROFILE_FIELDS = Object.freeze(['first_name', 'last_name', 'middle_name', 'phone', 'email', 'birthdate', 'gender']);
const EMPTY_PROFILE = Object.freeze(Object.fromEntries(PROFILE_FIELDS.map((key) => [key, ''])));
const NOTIFICATION_EVENTS = Object.freeze([
  ['attendance.absent', 'Student marked absent', 'Attendance'],
  ['attendance.late', 'Student marked late', 'Attendance'],
  ['assignments.created', 'New assignments', 'Learning'],
  ['assignments.due_soon', 'Assignments due soon', 'Learning'],
  ['assignments.graded', 'Assignments graded', 'Learning'],
  ['task.assigned', 'A task is assigned to me', 'Tasks'],
  ['schedule.lesson_reminder', 'Upcoming lesson reminders', 'Schedule'],
  ['schedule.cycle_exam_reminder', 'Cycle exam reminders', 'Schedule'],
  ['cohorts.announcement', 'Group announcements', 'Groups'],
  ['students.enrollment_changed', 'Student enrollment changes', 'Students'],
  ['cover.requested', 'Cover requests', 'Cover'],
  ['report.ready', 'Prepared reports', 'Reports'],
  ['print.failed', 'Printing failures', 'Operations'],
  ['auth.new_device_login', 'New device sign-ins', 'Security'],
  ['message.received', 'New messages', 'Communication'],
]);
const CHANNELS = Object.freeze([
  ['in_app', 'Workspace'],
  ['push', 'Push'],
  ['email', 'Email'],
  ['sms', 'SMS'],
]);

function defaultNotificationValue(eventType, channel) {
  if (channel === 'in_app' || channel === 'push') return true;
  if (channel === 'email') return eventType.startsWith('finance.') || eventType.startsWith('billing.');
  if (channel === 'sms') return ['attendance.absent', 'attendance.late', 'schedule.lesson_reminder', 'auth.new_device_login'].includes(eventType);
  return false;
}

function normalizedProfile(form) {
  return {
    first_name: String(form.first_name || '').trim(),
    last_name: String(form.last_name || '').trim(),
    middle_name: String(form.middle_name || '').trim(),
    phone: String(form.phone || '').trim(),
    email: String(form.email || '').trim(),
    birthdate: form.birthdate || null,
    gender: ['m', 'f'].includes(form.gender) ? form.gender : '',
  };
}

function ProfileSection({ profile, onNav, readOnly = false }) {
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  useEffect(() => {
    if (!profile.data) return;
    setForm(Object.fromEntries(PROFILE_FIELDS.map((key) => [key, profile.data[key] || ''])));
  }, [profile.data]);
  const mutation = useMutation({
    mutationFn: () => httpRequest('PATCH', '/api/v1/users/me/', { body: normalizedProfile(form) }),
    onSuccess: (next) => {
      queryClient.invalidateQueries({ queryKey: ['api'] });
      setEditing(false);
      setError('');
      toast.success('Your profile has been updated.');
      void hydrateSession();
      setForm(Object.fromEntries(PROFILE_FIELDS.map((key) => [key, next[key] || ''])));
    },
    onError: (failure) => {
      const message = userFacingError(failure, { fallback: 'Your profile could not be updated.' });
      setError(message);
      toast.danger(message);
    },
  });
  const data = profile.data;
  const responsibility = data?.role_memberships?.[0]?.account_type_name || 'Staff';
  const workspaceName = String(data?.organization_name || data?.tenant_slug || 'Organization')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <WorkspaceState state={profile} empty={!data}>{data && <>
    <ProfileHero
      eyebrow="Staff profile"
      name={data.full_name || data.username}
      meta={<><StatusPill value={data.is_active ? 'active' : 'inactive'} /><span>@{data.username}</span><span>{responsibility} account</span></>}
      actions={<>{readOnly
        ? <StatusPill value="View only" tone="warn" />
        : editing
          ? <ActionButton onClick={() => setEditing(false)}>Cancel</ActionButton>
          : <ActionButton tone="primary" icon={Icons.user} onClick={() => setEditing(true)}>Edit profile</ActionButton>}<LinkButton to="account/workspace" onNav={onNav} icon={Icons.settings}>Workspace preferences</LinkButton></>}
    />
    {editing && !readOnly ? <form className="account-profile-form" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
      <header><div><span>Personal details</span><h2>Keep your staff profile current</h2><p>These details are used for attribution, communication, teaching, and accountable actions.</p></div></header>
      {error && <div className="fw-form-error">{error}</div>}
      <div className="account-form-grid">
        <label>First name<input required autoComplete="given-name" maxLength="150" value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></label>
        <label>Last name<input required autoComplete="family-name" maxLength="150" value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></label>
        <label>Middle name<input autoComplete="additional-name" maxLength="150" value={form.middle_name} onChange={(event) => setForm({ ...form, middle_name: event.target.value })} /></label>
        <label>Phone<input type="tel" autoComplete="tel" maxLength="32" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
        <label>Email<input type="email" autoComplete="email" maxLength="254" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Date of birth<input type="date" value={form.birthdate} onChange={(event) => setForm({ ...form, birthdate: event.target.value })} /></label>
        <label>Gender<select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="">Prefer not to specify</option><option value="m">Male</option><option value="f">Female</option></select></label>
      </div>
      <footer><ActionButton type="submit" tone="primary" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save profile'}</ActionButton></footer>
    </form> : <>
      <DetailSection eyebrow="Identity" title="Profile information"><DetailGrid columns={3} fields={[
        { label: 'Full name', value: data.full_name }, { label: 'Username', value: data.username }, { label: 'Responsibility', value: responsibility },
        { label: 'Phone', value: data.phone }, { label: 'Email', value: data.email }, { label: 'Gender', value: formatGender(data.gender) },
        { label: 'Date of birth', value: formatOrganizationDate(data.birthdate, { dateOnly: true }) }, { label: 'Last sign-in', value: formatOrganizationDate(data.last_login_at) },
        { label: 'Workspace', value: workspaceName },
      ]} /></DetailSection>
      <DetailSection eyebrow="Account assurance" title="Sign-in readiness"><div className="account-assurance-grid"><div><span>{cloneElement(Icons.check, { size: 17 })}</span><strong>Active staff access</strong><p>Your account is enabled for its exact assigned responsibilities.</p></div><div><span>{cloneElement(Icons.shield, { size: 17 })}</span><strong>{data.must_change_password ? 'Password update required' : 'Password is up to date'}</strong><p>{data.must_change_password ? 'Choose a new password before continuing sensitive work.' : 'No password update is currently required.'}</p></div></div></DetailSection>
    </>}
  </>}</WorkspaceState>;
}

function NotificationSection({ readOnly = false }) {
  const preferences = useWorkspaceData('/api/v1/notifications/preferences/');
  const [savingKey, setSavingKey] = useState('');
  const toast = useToast();
  const preferenceMap = useMemo(() => new Map(preferences.rows.map((item) => [`${item.event_type}:${item.channel}`, item.enabled])), [preferences.rows]);
  const mutation = useMutation({
    mutationFn: ({ eventType, channel, enabled }) => httpRequest('PUT', '/api/v1/notifications/preferences/', { body: { preferences: [{ event_type: eventType, channel, enabled }] } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api'] });
      preferences.retry();
      toast.success('Notification preference saved.');
      setSavingKey('');
    },
    onError: (failure) => {
      toast.danger(userFacingError(failure, { fallback: 'The preference could not be saved.' }));
      setSavingKey('');
    },
  });
  const toggle = (eventType, channel) => {
    const key = `${eventType}:${channel}`;
    const current = preferenceMap.has(key) ? preferenceMap.get(key) : defaultNotificationValue(eventType, channel);
    setSavingKey(key);
    mutation.mutate({ eventType, channel, enabled: !current });
  };
  return <WorkspaceState state={preferences}><section className="account-notifications"><header><div><span>Personal delivery</span><h2>Choose what reaches you</h2><p>Workspace and push notices default on. Finance email and urgent finance SMS have focused defaults. Your choices override those defaults.</p></div><div className="account-channel-legend">{CHANNELS.map(([, label]) => <span key={label}>{label}</span>)}</div></header><div className="account-notification-matrix" role="table" aria-label="Notification preferences">
    {NOTIFICATION_EVENTS.map(([eventType, label, group]) => <div className="account-notification-row" role="row" key={eventType}><div role="rowheader"><span>{group}</span><strong>{label}</strong></div>{CHANNELS.map(([channel, channelLabel]) => {
      const key = `${eventType}:${channel}`;
      const explicit = preferenceMap.has(key);
      const enabled = explicit ? preferenceMap.get(key) : defaultNotificationValue(eventType, channel);
      return <button type="button" role="switch" aria-checked={enabled} aria-label={`${label}: ${channelLabel}`} className={enabled ? 'is-on' : ''} disabled={readOnly || savingKey === key} title={readOnly ? 'View-only session' : explicit ? 'Your saved preference' : 'Organization default'} onClick={() => toggle(eventType, channel)} key={channel}><span className="account-channel-mobile">{channelLabel}</span><i /><small>{explicit ? 'Custom' : 'Default'}</small></button>;
    })}</div>)}
  </div></section></WorkspaceState>;
}

function SecuritySection({ readOnly = false }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState(null);
  const toast = useToast();
  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    const issueField = key === 'confirm' ? 'confirmation' : key;
    if (issue?.field === issueField || issue?.field === 'form') setIssue(null);
  };
  const submit = async (event) => {
    event.preventDefault();
    const policyIssue = validatePasswordChange({
      currentPassword: form.current,
      newPassword: form.next,
      confirmation: form.confirm,
    });
    if (policyIssue) {
      setIssue(policyIssue);
      toast.warning(policyIssue.message, { title: 'Check the highlighted field' });
      return;
    }
    setBusy(true); setIssue(null);
    try {
      await changePassword({ currentPassword: form.current, newPassword: form.next });
      setForm({ current: '', next: '', confirm: '' });
      toast.success('Password changed. Other signed-in sessions have ended.');
    } catch (failure) {
      const nextIssue = passwordChangeFailure(failure);
      setIssue(nextIssue);
      toast.danger(nextIssue.message, { title: 'Password not changed' });
    } finally { setBusy(false); }
  };
  if (readOnly) return <div className="fw-safety-block">Password changes are unavailable in a view-only session. Sign in directly to manage account security.</div>;
  return <div className="account-security-grid"><form className="account-security-card" onSubmit={submit} noValidate><header><span>{cloneElement(Icons.shield, { size: 18 })}</span><div><strong>Change password</strong><p>Changing your password ends other sessions and keeps this browser signed in with a renewed credential.</p></div></header>{issue && <div className="fw-form-error" role="alert">{issue.message}</div>}<label>Current password<input id="account-current-password" type="password" autoComplete="current-password" maxLength={PASSWORD_MAX_LENGTH} required aria-invalid={issue?.field === 'current'} value={form.current} onChange={(event) => update('current', event.target.value)} /></label><label>New password<input id="account-new-password" type="password" autoComplete="new-password" minLength="10" maxLength={PASSWORD_MAX_LENGTH} required aria-invalid={issue?.field === 'new'} value={form.next} onChange={(event) => update('next', event.target.value)} /></label><label>Confirm new password<input id="account-confirm-password" type="password" autoComplete="new-password" minLength="10" maxLength={PASSWORD_MAX_LENGTH} required aria-invalid={issue?.field === 'confirmation'} value={form.confirm} onChange={(event) => update('confirm', event.target.value)} /></label><ActionButton type="submit" tone="primary" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</ActionButton></form><section className="account-security-card is-guidance"><header><span>{cloneElement(Icons.check, { size: 18 })}</span><div><strong>Password guidance</strong><p>Use a unique phrase with at least 10 characters. Avoid names, common phrases, and passwords reused elsewhere.</p></div></header><ul><li>Other sessions are automatically ended after a change.</li><li>Your password is never displayed in this workspace.</li><li>Account recovery uses your verified contact channel.</li></ul></section></div>;
}

function SessionsSection({ readOnly = false }) {
  const sessions = useWorkspaceData('/api/v1/users/sessions/', { page_size: 100 });
  const [pendingRevocation, setPendingRevocation] = useState(null);
  const toast = useToast();
  const revoke = useMutation({
    mutationFn: async (session) => {
      if (session.current_session) {
        await logout();
        return session;
      }
      await httpRequest('DELETE', `/api/v1/users/sessions/${session.id}/`);
      return session;
    },
    onSuccess: (session) => {
      setPendingRevocation(null);
      if (session.current_session) return;
      sessions.retry();
      toast.success('The other sign-in has been ended.');
    },
    onError: (failure) => {
      setPendingRevocation(null);
      toast.danger(userFacingError(failure, { fallback: 'The other sign-in could not be ended.' }));
    },
  });
  const description = readOnly
    ? 'Review coarse device and browser labels from the authenticated session register. Sign in directly to end another session.'
    : 'Review coarse device and browser labels from the authenticated session register. End an unfamiliar sign-in without exposing its credential.';
  return <WorkspaceState state={sessions} empty={!sessions.rows.length} emptyTitle="No active sign-ins" emptyBody="Your active browser and mobile sign-ins will appear here."><DetailSection className="account-sessions" eyebrow="Your devices" title="Active sign-ins" description={description}><WorkspaceTable label="Active sign-ins" rows={sessions.rows} rowClassName={(row) => row.current_session ? 'is-current-session' : ''} columns={[
    { key: 'device', label: 'Device' },
    { key: 'browser', label: 'Browser' },
    { key: 'platform', label: 'Platform', render: (row) => <StatusPill value={row.platform} /> },
    { key: 'last_activity_at', label: 'Last activity', render: (row) => formatOrganizationDate(row.last_activity_at) },
    { key: 'idle_expires_at', label: 'Idle expiry', render: (row) => formatOrganizationDate(row.idle_expires_at) },
    { key: 'policy', label: 'Policy', render: (row) => row.current_session
      ? <StatusPill value={row.read_only || readOnly ? 'Current · view only' : 'Current session'} tone={row.read_only || readOnly ? 'warn' : 'success'} />
      : row.read_only ? <StatusPill value="View only" tone="warn" /> : 'Standard' },
    { key: 'revoke', label: 'Actions', render: (row) => readOnly && !row.current_session
        ? 'View only'
        : String(pendingRevocation) === String(row.id)
          ? <span className="fw-row-actions"><ActionButton icon={Icons.x} tone="ghost" title="Keep sign-in" aria-label="Keep sign-in" disabled={revoke.isPending} onClick={() => setPendingRevocation(null)}><span className="fw-sr">Cancel</span></ActionButton><ActionButton icon={Icons.logout} tone="danger" title={row.current_session ? 'Confirm sign out' : 'Confirm end sign-in'} aria-label={row.current_session ? 'Confirm sign out of this device' : 'Confirm end sign-in'} disabled={revoke.isPending} onClick={() => revoke.mutate(row)}><span className="fw-sr">{revoke.isPending ? 'Signing out' : row.current_session ? 'Confirm sign out' : 'Confirm end sign-in'}</span></ActionButton></span>
          : <ActionButton icon={Icons.logout} tone={row.current_session ? 'danger' : 'ghost'} title={row.current_session ? 'Sign out this device' : 'End sign-in'} disabled={revoke.isPending} onClick={() => setPendingRevocation(row.id)} aria-label={row.current_session ? 'Sign out this current device' : `End ${row.device || 'other'} sign-in`}><span className="fw-sr">{row.current_session ? 'Sign out this device' : 'End sign-in'}</span></ActionButton> },
  ]} /></DetailSection></WorkspaceState>;
}

function DevicesSection({ readOnly = false }) {
  const devices = useWorkspaceData('/api/v1/users/devices/', { page_size: 100 });
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const toast = useToast();
  const revoke = useMutation({
    mutationFn: (deviceId) => httpRequest('DELETE', `/api/v1/users/devices/${deviceId}/`),
    onSuccess: () => { setPendingRemoval(null); devices.retry(); toast.success('The recognized device has been removed.'); },
    onError: (failure) => { setPendingRemoval(null); toast.danger(userFacingError(failure, { fallback: 'The device could not be removed.' })); },
  });
  return <WorkspaceState state={devices} empty={!devices.rows.length} emptyTitle="No notification devices" emptyBody="Devices appear here after secure notifications are enabled."><DetailSection eyebrow="Notifications" title="Notification devices" description="Choose which recognized devices may receive your secure notifications. Removing one here does not end its sign-in; active sign-ins are managed above."><WorkspaceTable label="Notification devices" rows={devices.rows} columns={[
    { key: 'platform', label: 'Platform', render: (row) => <StatusPill value={row.platform} /> }, { key: 'device_id', label: 'Device identifier' }, { key: 'user_agent', label: 'Browser' },
    { key: 'last_seen_at', label: 'Last seen', render: (row) => formatOrganizationDate(row.last_seen_at) }, { key: 'created_at', label: 'First recognized', render: (row) => formatOrganizationDate(row.created_at) },
    { key: 'remove', label: 'Actions', render: (row) => readOnly ? 'View only' : String(pendingRemoval) === String(row.id)
      ? <span className="fw-row-actions"><ActionButton icon={Icons.x} tone="ghost" title="Keep device" aria-label="Keep device" disabled={revoke.isPending} onClick={() => setPendingRemoval(null)}><span className="fw-sr">Cancel</span></ActionButton><ActionButton icon={Icons.logout} tone="danger" title="Confirm remove device" aria-label="Confirm remove device" disabled={revoke.isPending} onClick={() => revoke.mutate(row.id)}><span className="fw-sr">{revoke.isPending ? 'Removing device' : 'Confirm remove device'}</span></ActionButton></span>
      : <ActionButton icon={Icons.logout} tone="ghost" title="Remove device" disabled={revoke.isPending} onClick={() => setPendingRemoval(row.id)} aria-label={`Remove ${row.platform || 'recognized'} device`}><span className="fw-sr">Remove device</span></ActionButton> },
  ]} /></DetailSection></WorkspaceState>;
}

function AccessSection({ profile }) {
  const memberships = profile.data?.role_memberships || [];
  const workspaceName = String(profile.data?.organization_name || profile.data?.tenant_slug || 'Organization')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return <WorkspaceState state={profile} empty={!profile.data}>{profile.data && <><DetailSection eyebrow="Effective responsibility" title="Staff memberships" description="This is the branch, department, and role scope attached to your signed-in identity. Every action is still checked against its exact permission."><WorkspaceTable label="Staff memberships" rows={memberships} rowKey="id" columns={[
    { key: 'account_type_name', label: 'Responsibility' }, { key: 'branch_name', label: 'Branch', render: (row) => row.branch_name || (row.branch ? `Branch ${row.branch}` : 'Organization-wide') }, { key: 'department_name', label: 'Department', render: (row) => row.department_name || (row.department ? `Department ${row.department}` : 'All departments') }, { key: 'account_kind', label: 'Account kind' },
  ]} /></DetailSection><DetailSection eyebrow="Identity" title="Account status"><DetailGrid columns={3} fields={[{ label: 'Username', value: profile.data.username }, { label: 'Account active', value: <StatusPill value={profile.data.is_active ? 'active' : 'inactive'} /> }, { label: 'Workspace', value: workspaceName }, { label: 'Account type', value: memberships[0]?.account_type_name || 'Staff' }, { label: 'Last sign-in', value: formatOrganizationDate(profile.data.last_login_at) }, { label: 'Memberships', value: memberships.length }]} /></DetailSection></>}</WorkspaceState>;
}

const DENSITY_STORAGE_KEY = 'sf-density';
const LANGUAGE_LABELS = Object.freeze({ uz: "O‘zbekcha", ru: 'Русский', en: 'English' });

function readDensity() {
  try {
    return localStorage.getItem(DENSITY_STORAGE_KEY) === 'dense' ? 'dense' : 'comfortable';
  } catch {
    return 'comfortable';
  }
}

function WorkspaceSection() {
  const { account } = useServices();
  const { t, locale, locales, setLocale } = useT();
  const toast = useToast();
  const [density, setDensity] = useState(readDensity);
  const [hiddenWidgets, setHiddenWidgets] = useState(readDashboardHiddenWidgets);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density === 'dense' ? 'dense' : 'comfortable');
    try { localStorage.setItem(DENSITY_STORAGE_KEY, density); } catch { /* Local preferences remain in memory. */ }
  }, [density]);

  useEffect(() => {
    saveDashboardHiddenWidgets(hiddenWidgets);
  }, [hiddenWidgets]);

  const changeLanguage = (next) => {
    if (next === locale) return;
    setLocale(next);
    account.patchSettings({ locale: next }).catch(() => toast.danger(t('common.error')));
  };

  return <div className="account-preferences">
    <section className="account-preference-hero">
      <span>{cloneElement(Icons.settings, { size: 23 })}</span>
      <div><small>{t('settings.workspaceEyebrow')}</small><h2>{t('settings.workspaceTitle')}</h2><p>{t('settings.workspaceBody')}</p></div>
    </section>
    <div className="account-preference-grid">
      <section className="account-preference-card"><header><span>{cloneElement(Icons.sun, { size: 18 })}</span><div><strong>{t('settings.appearance')}</strong><p>{t('settings.appearanceHint')}</p></div></header><ThemeControls /></section>
      <section className="account-preference-card"><header><span>{cloneElement(Icons.globe, { size: 18 })}</span><div><strong>{t('settings.language')}</strong><p>{t('settings.languageHint')}</p></div></header><div className="account-choice-list">{locales.map((language) => <button type="button" data-active={locale === language} onClick={() => changeLanguage(language)} key={language}><span>{LANGUAGE_LABELS[language] || language}</span>{locale === language && cloneElement(Icons.check, { size: 16 })}</button>)}</div></section>
      <section className="account-preference-card"><header><span>{cloneElement(Icons.doc, { size: 18 })}</span><div><strong>{t('settings.density')}</strong><p>{t('settings.densityHint')}</p></div></header><div className="account-density-options"><button type="button" data-active={density === 'comfortable'} onClick={() => setDensity('comfortable')}><i><b /><b /><b /></i><span><strong>{t('settings.comfortable')}</strong><small>{t('settings.comfortableHint')}</small></span></button><button type="button" data-active={density === 'dense'} onClick={() => setDensity('dense')}><i className="is-dense"><b /><b /><b /><b /></i><span><strong>{t('settings.compact')}</strong><small>{t('settings.compactHint')}</small></span></button></div></section>
      <section className="account-preference-card is-wide"><header><span>{cloneElement(Icons.home, { size: 18 })}</span><div><strong>{t('settings.dashboardWidgets')}</strong><p>{t('settings.dashboardWidgetsHint')}</p></div></header><div className="account-widget-options">{DASHBOARD_WIDGET_KEYS.map((key) => {
        const visible = !hiddenWidgets[key];
        return <button type="button" role="switch" aria-checked={visible} data-active={visible} onClick={() => setHiddenWidgets((current) => ({ ...current, [key]: visible }))} key={key}><span>{t(`today.w_${key}`)}</span><i /></button>;
      })}</div></section>
    </div>
  </div>;
}

export function AccountPage({ route = 'account/profile', onNav, user }) {
  const profile = useWorkspaceData('/api/v1/users/me/');
  const readOnly = user?.read_only_session === true || profile.data?.read_only_session === true;
  const section = workspaceRoute(route).segments[1] || 'profile';
  const active = SECTIONS.some((item) => item.id === section) ? section : 'profile';
  const current = SECTIONS.find((item) => item.id === active);
  const navigation = <SectionNav label="My account" items={SECTIONS} active={active} basePath="account" onNav={onNav} />;
  return <WorkspaceLayout navigation={navigation}><div className="fw-page account-workspace">{active !== 'profile' && <WorkspaceHeader eyebrow="My account" title={current.label} description={current.description} />}{active === 'profile' && <ProfileSection profile={profile} onNav={onNav} readOnly={readOnly} />}{active === 'notifications' && <NotificationSection readOnly={readOnly} />}{active === 'security' && <SecuritySection readOnly={readOnly} />}{active === 'devices' && <><SessionsSection readOnly={readOnly} /><DevicesSection readOnly={readOnly} /></>}{active === 'access' && <AccessSection profile={profile} />}{active === 'workspace' && <WorkspaceSection />}</div></WorkspaceLayout>;
}
