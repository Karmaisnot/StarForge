import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import { Button, Chip, Icon, Modal } from '@/ui';
import { useAsync } from '@/hooks/useAsync.js';
import { useServices } from '@/hooks/useServices.js';
import { useToast } from '@/hooks/useToast.js';
import { useT } from '@/hooks/useT.js';
import { httpClient } from '@/data/http/httpClient.js';
import styles from './teacherWorkflows.module.css';

const REQUEST_TYPES = [
  { id: 'loan', icon: '◈', amount: true },
  { id: 'salary_advance', icon: '↗', amount: true },
  { id: 'group_graduation', icon: '◇', group: true },
  { id: 'student_removal', icon: '−', group: true, student: true },
  { id: 'leave_request', icon: '○', dates: true },
  { id: 'schedule_change', icon: '↔', group: true },
  { id: 'procurement', icon: '□', amount: true },
  { id: 'other', icon: '·' },
];

function asRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(number);
}

function dateTime(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
}

function statusTone(status) {
  if (['approved', 'disbursed', 'done', 'active'].includes(status)) return 'success';
  if (['rejected', 'failed'].includes(status)) return 'danger';
  if (['pending', 'queued', 'running'].includes(status)) return 'primary';
  return 'neutral';
}

function groupIdOf(student) {
  return String(student.groupId ?? student.current_cohort ?? student.current_cohort_id ?? '');
}

export function TeacherRequestsPage() {
  const { mgmt } = useServices();
  const { t, locale } = useT();
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const state = useAsync(async () => {
    const [requests, cohorts, contacts] = await Promise.all([
      httpClient.get('approvals/requests/?page_size=100'),
      httpClient.get('cohorts/?page_size=100'),
      mgmt.getContacts().catch(() => []),
    ]);
    return {
      requests: asRows(requests),
      cohorts: asRows(cohorts),
      students: contacts.filter((contact) => contact.kind === 'student'),
    };
  }, [locale, reloadKey]);

  return <AsyncBoundary state={state}>{({ requests, cohorts, students }) => {
    const visible = filter === 'all' ? requests : requests.filter((item) => item.status === filter);
    const counts = requests.reduce((result, item) => ({ ...result, [item.status]: (result[item.status] || 0) + 1 }), {});
    return <>
      <PageHeader title={t('teacherWorkflows.requestsTitle')} subtitle={t('teacherWorkflows.requestsSubtitle')} right={<Button variant="primary" icon="plus" onClick={() => setOpen(true)}>{t('teacherWorkflows.newRequest')}</Button>} />
      <section className={styles.hero}><div><span>{t('teacherWorkflows.requestCenter')}</span><h2>{t('teacherWorkflows.requestHero')}</h2><p>{t('teacherWorkflows.requestHeroBody')}</p></div><div className={styles.heroNumbers}><article><strong>{counts.pending || 0}</strong><span>{t('teacherWorkflows.pending')}</span></article><article><strong>{counts.approved || 0}</strong><span>{t('teacherWorkflows.approved')}</span></article><article><strong>{requests.length}</strong><span>{t('teacherWorkflows.total')}</span></article></div></section>
      <nav className={styles.filters}>{['all', 'pending', 'approved', 'rejected', 'cancelled'].map((status) => <button type="button" data-active={filter === status} onClick={() => setFilter(status)} key={status}>{t(`teacherWorkflows.${status}`)}{status !== 'all' && <i>{counts[status] || 0}</i>}</button>)}</nav>
      <div className={styles.requestGrid}>{visible.map((request) => <article className={styles.requestCard} key={request.id}>
        <header><span className={styles.requestIcon}>{REQUEST_TYPES.find((type) => type.id === request.kind)?.icon || '·'}</span><div><small>{t(`teacherWorkflows.kind_${request.kind}`)}</small><h2>{request.title}</h2></div><Chip tone={statusTone(request.status)}>{t(`teacherWorkflows.${request.status}`)}</Chip></header>
        <p>{request.description || t('teacherWorkflows.noDescription')}</p>
        <dl><div><dt>{t('teacherWorkflows.created')}</dt><dd>{dateTime(request.created_at)}</dd></div><div><dt>{t('teacherWorkflows.amount')}</dt><dd>{request.amount_uzs ? `${money(request.amount_uzs)} UZS` : '—'}</dd></div></dl>
        {request.decision_note && <blockquote>{request.decision_note}</blockquote>}
        {request.status === 'pending' && <footer><Button variant="ghost" icon="x" onClick={async () => { try { await httpClient.post(`approvals/requests/${request.id}/cancel/`, {}); toast(t('teacherWorkflows.cancelled'), 'success'); setReloadKey((value) => value + 1); } catch { toast(t('common.error'), 'danger'); } }}>{t('teacherWorkflows.cancelRequest')}</Button></footer>}
      </article>)}{!visible.length && <Empty icon="check" title={t('teacherWorkflows.noRequests')} body={t('teacherWorkflows.noRequestsBody')} />}</div>
      <RequestModal open={open} cohorts={cohorts} students={students} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); setReloadKey((value) => value + 1); }} />
    </>;
  }}</AsyncBoundary>;
}

function RequestModal({ open, cohorts, students, onClose, onCreated }) {
  const { t } = useT();
  const toast = useToast();
  const [draft, setDraft] = useState({ kind: 'loan', title: '', description: '', amount: '', cohort: '', student: '', from: '', to: '' });
  const [saving, setSaving] = useState(false);
  const type = REQUEST_TYPES.find((item) => item.id === draft.kind) || REQUEST_TYPES[0];
  const scopedStudents = draft.cohort ? students.filter((student) => groupIdOf(student) === String(draft.cohort)) : students;
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await httpClient.post('approvals/requests/', {
        kind: draft.kind,
        title: draft.title.trim(),
        description: draft.description.trim(),
        ...(type.amount && draft.amount ? { amount_uzs: draft.amount } : {}),
        payload: {
          ...(draft.cohort ? { cohort_id: Number(draft.cohort), cohort_name: cohorts.find((cohort) => String(cohort.id) === String(draft.cohort))?.name } : {}),
          ...(draft.student ? { student_id: Number(draft.student), student_name: students.find((student) => String(student.profileId) === String(draft.student))?.name } : {}),
          ...(draft.from ? { from: draft.from } : {}),
          ...(draft.to ? { to: draft.to } : {}),
        },
      });
      toast(t('teacherWorkflows.requestSubmitted'), 'success');
      setDraft({ kind: 'loan', title: '', description: '', amount: '', cohort: '', student: '', from: '', to: '' });
      onCreated();
    } catch { toast(t('common.error'), 'danger'); } finally { setSaving(false); }
  };
  return <Modal open={open} onClose={onClose} title={t('teacherWorkflows.newRequest')}><form className={styles.form} onSubmit={submit}>
    <label className={styles.full}><span>{t('teacherWorkflows.requestType')}</span><div className={styles.typePicker}>{REQUEST_TYPES.map((item) => <button type="button" data-active={draft.kind === item.id} onClick={() => setDraft({ ...draft, kind: item.id, cohort: '', student: '' })} key={item.id}><i>{item.icon}</i><span>{t(`teacherWorkflows.kind_${item.id}`)}</span></button>)}</div></label>
    <label className={styles.full}><span>{t('teacherWorkflows.title')}</span><input required maxLength={200} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder={t('teacherWorkflows.titlePlaceholder')} /></label>
    {type.amount && <label><span>{t('teacherWorkflows.amountUzs')}</span><input required type="number" min="1" step="1000" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /></label>}
    {type.group && <label><span>{t('teacherWorkflows.group')}</span><select required value={draft.cohort} onChange={(event) => setDraft({ ...draft, cohort: event.target.value, student: '' })}><option value="">{t('teacherWorkflows.chooseGroup')}</option>{cohorts.map((cohort) => <option value={cohort.id} key={cohort.id}>{cohort.name}</option>)}</select></label>}
    {type.student && <label><span>{t('teacherWorkflows.student')}</span><select required value={draft.student} onChange={(event) => setDraft({ ...draft, student: event.target.value })}><option value="">{t('teacherWorkflows.chooseStudent')}</option>{scopedStudents.map((student) => <option value={student.profileId} key={student.key}>{student.name}</option>)}</select></label>}
    {type.dates && <><label><span>{t('teacherWorkflows.from')}</span><input required type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /></label><label><span>{t('teacherWorkflows.to')}</span><input required type="date" min={draft.from} value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></label></>}
    <label className={styles.full}><span>{t('teacherWorkflows.description')}</span><textarea required rows={5} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder={t('teacherWorkflows.descriptionPlaceholder')} /></label>
    <footer className={styles.full}><Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" variant="primary" icon="send" disabled={saving}>{saving ? t('common.loading') : t('teacherWorkflows.submitRequest')}</Button></footer>
  </form></Modal>;
}

export function TeacherReportsPage() {
  const { mgmt } = useServices();
  const { t, locale } = useT();
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const state = useAsync(async () => {
    const [catalog, runs, cohorts, contacts] = await Promise.all([
      httpClient.get('reports/?page_size=100'),
      httpClient.get('reports/runs/?page_size=100'),
      httpClient.get('cohorts/?page_size=100'),
      mgmt.getContacts().catch(() => []),
    ]);
    return {
      catalog: asRows(catalog), runs: asRows(runs), cohorts: asRows(cohorts),
      recipients: contacts.filter((contact) => contact.kind === 'management'),
    };
  }, [locale, reloadKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setReloadKey((value) => value + 1), 12000);
    return () => window.clearInterval(timer);
  }, []);

  return <AsyncBoundary state={state}>{({ catalog, runs, cohorts, recipients }) => <>
    <PageHeader title={t('teacherWorkflows.reportsTitle')} subtitle={t('teacherWorkflows.reportsSubtitle')} right={<Button variant="outline" icon="refresh" onClick={() => setReloadKey((value) => value + 1)}>{t('teacherWorkflows.refresh')}</Button>} />
    <section className={`${styles.hero} ${styles.reportHero}`}><div><span>{t('teacherWorkflows.reporting')}</span><h2>{t('teacherWorkflows.reportHero')}</h2><p>{t('teacherWorkflows.reportHeroBody')}</p></div><div className={styles.heroNumbers}><article><strong>{catalog.length}</strong><span>{t('teacherWorkflows.availableReports')}</span></article><article><strong>{runs.filter((run) => run.status === 'done').length}</strong><span>{t('teacherWorkflows.ready')}</span></article><article><strong>{runs.filter((run) => ['queued', 'running'].includes(run.status)).length}</strong><span>{t('teacherWorkflows.preparing')}</span></article></div></section>
    <section className={styles.sectionTitle}><div><span>{t('teacherWorkflows.chooseReport')}</span><h2>{t('teacherWorkflows.reportLibrary')}</h2></div></section>
    <div className={styles.reportCatalog}>{catalog.map((report) => <article key={report.id}><span><Icon name={report.key === 'attendance' ? 'check' : report.key === 'grades' ? 'trend' : 'users'} size={19} /></span><div><small>{report.key.replaceAll('_', ' ')}</small><h2>{report.title}</h2><p>{report.description}</p></div><Button variant="outline" icon="arrowR" iconRight onClick={() => setSelectedReport(report)}>{t('teacherWorkflows.prepare')}</Button></article>)}</div>
    <section className={styles.sectionTitle}><div><span>{t('teacherWorkflows.history')}</span><h2>{t('teacherWorkflows.preparedReports')}</h2></div><strong>{runs.length}</strong></section>
    <div className={styles.runList}>{runs.map((run) => <article key={run.id}><span className={styles.runIcon}><Icon name={run.status === 'done' ? 'check' : run.status === 'failed' ? 'x' : 'clock'} size={17} /></span><div><strong>{catalog.find((report) => report.key === run.report_key)?.title || run.report_key}</strong><small>{dateTime(run.created_at)} · {String(run.format).toUpperCase()}</small></div><Chip tone={statusTone(run.status)}>{t(`teacherWorkflows.${run.status}`)}</Chip>{run.status === 'done' && run.download_url ? <a href={run.download_url} target="_blank" rel="noreferrer"><Icon name="download" size={15} /> {t('teacherWorkflows.download')}</a> : <span>{run.status === 'failed' ? t('teacherWorkflows.reportFailed') : t('teacherWorkflows.working')}</span>}</article>)}{!runs.length && <Empty icon="doc" title={t('teacherWorkflows.noReports')} body={t('teacherWorkflows.noReportsBody')} />}</div>
    <ReportModal report={selectedReport} cohorts={cohorts} recipients={recipients} onClose={() => setSelectedReport(null)} onCreated={() => { setSelectedReport(null); setReloadKey((value) => value + 1); toast(t('teacherWorkflows.reportQueued'), 'success'); }} />
  </>}</AsyncBoundary>;
}

function ReportModal({ report, cohorts, recipients, onClose, onCreated }) {
  const { t } = useT();
  const toast = useToast();
  const [draft, setDraft] = useState({ cohort: '', from: '', to: '', format: 'pdf', recipients: [] });
  const [saving, setSaving] = useState(false);
  if (!report) return null;
  const supportsGroup = ['attendance', 'enrollment'].includes(report.key);
  const supportsDates = report.key === 'attendance';
  const toggleRecipient = (id) => setDraft((current) => ({ ...current, recipients: current.recipients.includes(id) ? current.recipients.filter((value) => value !== id) : [...current.recipients, id] }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      await httpClient.post('reports/runs/', {
        report_key: report.key, format: draft.format,
        params: { ...(supportsGroup && draft.cohort ? { cohort_id: Number(draft.cohort) } : {}), ...(supportsDates && draft.from ? { date_from: draft.from } : {}), ...(supportsDates && draft.to ? { date_to: draft.to } : {}) },
        recipient_ids: draft.recipients,
      });
      setDraft({ cohort: '', from: '', to: '', format: 'pdf', recipients: [] }); onCreated();
    } catch { toast(t('common.error'), 'danger'); } finally { setSaving(false); }
  };
  return <Modal open onClose={onClose} title={t('teacherWorkflows.prepareReport')}><form className={styles.form} onSubmit={submit}>
    <section className={`${styles.selectedReport} ${styles.full}`}><span><Icon name="doc" size={20} /></span><div><small>{report.key.replaceAll('_', ' ')}</small><strong>{report.title}</strong><p>{report.description}</p></div></section>
    {supportsGroup && <label><span>{t('teacherWorkflows.groupScope')}</span><select value={draft.cohort} onChange={(event) => setDraft({ ...draft, cohort: event.target.value })}><option value="">{t('teacherWorkflows.allMyGroups')}</option>{cohorts.map((cohort) => <option value={cohort.id} key={cohort.id}>{cohort.name}</option>)}</select></label>}
    <label><span>{t('teacherWorkflows.format')}</span><select value={draft.format} onChange={(event) => setDraft({ ...draft, format: event.target.value })}><option value="pdf">PDF</option><option value="xlsx">Excel</option></select></label>
    {supportsDates && <><label><span>{t('teacherWorkflows.from')}</span><input type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /></label><label><span>{t('teacherWorkflows.to')}</span><input type="date" min={draft.from} value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></label></>}
    <fieldset className={styles.full}><legend>{t('teacherWorkflows.sendTo')}</legend><p>{t('teacherWorkflows.sendToHint')}</p><div className={styles.recipientPicker}>{recipients.map((recipient) => <label key={recipient.key}><input type="checkbox" checked={draft.recipients.includes(Number(recipient.userId))} onChange={() => toggleRecipient(Number(recipient.userId))} /><span><strong>{recipient.name}</strong><small>{recipient.role}</small></span></label>)}{!recipients.length && <small>{t('teacherWorkflows.noRecipients')}</small>}</div></fieldset>
    <footer className={styles.full}><Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" variant="primary" icon="send" disabled={saving}>{saving ? t('common.loading') : t('teacherWorkflows.prepareAndSend')}</Button></footer>
  </form></Modal>;
}

export function TeacherRecognitionPage() {
  const { mgmt } = useServices();
  const { t, locale } = useT();
  const toast = useToast();
  const [reloadKey, setReloadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [granting, setGranting] = useState(null);
  const state = useAsync(async () => {
    const [achievements, cohorts, contacts] = await Promise.all([
      httpClient.get('achievements/?page_size=100'), httpClient.get('cohorts/?page_size=100'), mgmt.getContacts().catch(() => []),
    ]);
    return { achievements: asRows(achievements), cohorts: asRows(cohorts), students: contacts.filter((contact) => contact.kind === 'student') };
  }, [locale, reloadKey]);
  return <AsyncBoundary state={state}>{({ achievements, cohorts, students }) => <>
    <PageHeader title={t('teacherWorkflows.recognitionTitle')} subtitle={t('teacherWorkflows.recognitionSubtitle')} right={<Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>{t('teacherWorkflows.createAchievement')}</Button>} />
    <section className={`${styles.hero} ${styles.recognitionHero}`}><div><span>{t('teacherWorkflows.positiveCulture')}</span><h2>{t('teacherWorkflows.recognitionHero')}</h2><p>{t('teacherWorkflows.recognitionHeroBody')}</p></div><div className={styles.heroNumbers}><article><strong>{achievements.filter((item) => item.scope === 'group').length}</strong><span>{t('teacherWorkflows.groupAchievements')}</span></article><article><strong>{achievements.filter((item) => item.status === 'active').length}</strong><span>{t('teacherWorkflows.active')}</span></article></div></section>
    <div className={styles.achievementGrid}>{achievements.map((achievement) => <article key={achievement.id}><header><span>{achievement.emoji || '✦'}</span><div><Chip tone={statusTone(achievement.status)}>{t(`teacherWorkflows.${achievement.status}`)}</Chip><small>{achievement.scope === 'group' ? cohorts.find((cohort) => String(cohort.id) === String(achievement.cohort))?.name || t('teacherWorkflows.myGroup') : t('teacherWorkflows.centerWide')}</small></div></header><h2>{achievement.name}</h2><p>{achievement.description || t('teacherWorkflows.noDescription')}</p>{achievement.status === 'active' && <footer><Button variant="primary" icon="plus" onClick={() => setGranting(achievement)}>{t('teacherWorkflows.giveAchievement')}</Button></footer>}</article>)}{!achievements.length && <Empty icon="brand" title={t('teacherWorkflows.noAchievements')} body={t('teacherWorkflows.noAchievementsBody')} />}</div>
    <AchievementCreateModal open={createOpen} cohorts={cohorts} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); setReloadKey((value) => value + 1); }} />
    <AchievementGrantModal achievement={granting} students={students} onClose={() => setGranting(null)} onGranted={() => { setGranting(null); toast(t('teacherWorkflows.achievementGiven'), 'success'); }} />
  </>}</AsyncBoundary>;
}

function AchievementCreateModal({ open, cohorts, onClose, onCreated }) {
  const { t } = useT(); const toast = useToast();
  const [draft, setDraft] = useState({ name: '', description: '', emoji: '✦', cohort: '' }); const [saving, setSaving] = useState(false);
  const submit = async (event) => { event.preventDefault(); setSaving(true); try { await httpClient.post('achievements/', { name: draft.name.trim(), description: draft.description.trim(), emoji: draft.emoji.trim(), scope: 'group', cohort: Number(draft.cohort) }); setDraft({ name: '', description: '', emoji: '✦', cohort: '' }); toast(t('teacherWorkflows.achievementCreated'), 'success'); onCreated(); } catch { toast(t('common.error'), 'danger'); } finally { setSaving(false); } };
  return <Modal open={open} onClose={onClose} title={t('teacherWorkflows.createAchievement')}><form className={styles.form} onSubmit={submit}><label><span>{t('teacherWorkflows.symbol')}</span><input required maxLength={32} value={draft.emoji} onChange={(event) => setDraft({ ...draft, emoji: event.target.value })} /></label><label><span>{t('teacherWorkflows.group')}</span><select required value={draft.cohort} onChange={(event) => setDraft({ ...draft, cohort: event.target.value })}><option value="">{t('teacherWorkflows.chooseGroup')}</option>{cohorts.map((cohort) => <option value={cohort.id} key={cohort.id}>{cohort.name}</option>)}</select></label><label className={styles.full}><span>{t('teacherWorkflows.achievementName')}</span><input required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder={t('teacherWorkflows.achievementNamePlaceholder')} /></label><label className={styles.full}><span>{t('teacherWorkflows.description')}</span><textarea rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label><footer className={styles.full}><Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" variant="primary" disabled={saving}>{saving ? t('common.loading') : t('teacherWorkflows.createAchievement')}</Button></footer></form></Modal>;
}

function AchievementGrantModal({ achievement, students, onClose, onGranted }) {
  const { t } = useT(); const toast = useToast(); const [student, setStudent] = useState(''); const [note, setNote] = useState(''); const [saving, setSaving] = useState(false);
  const eligible = useMemo(() => achievement?.scope === 'group' ? students.filter((item) => groupIdOf(item) === String(achievement.cohort)) : students, [achievement, students]);
  if (!achievement) return null;
  const submit = async (event) => { event.preventDefault(); setSaving(true); try { await httpClient.post(`achievements/${achievement.id}/grant/`, { student: Number(student), note: note.trim() }); setStudent(''); setNote(''); onGranted(); } catch { toast(t('common.error'), 'danger'); } finally { setSaving(false); } };
  return <Modal open onClose={onClose} title={t('teacherWorkflows.giveAchievement')}><form className={styles.form} onSubmit={submit}><section className={`${styles.selectedAchievement} ${styles.full}`}><span>{achievement.emoji || '✦'}</span><div><strong>{achievement.name}</strong><p>{achievement.description}</p></div></section><label className={styles.full}><span>{t('teacherWorkflows.student')}</span><select required value={student} onChange={(event) => setStudent(event.target.value)}><option value="">{t('teacherWorkflows.chooseStudent')}</option>{eligible.map((item) => <option value={item.profileId} key={item.key}>{item.name}</option>)}</select></label><label className={styles.full}><span>{t('teacherWorkflows.personalNote')}</span><textarea rows={3} maxLength={255} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('teacherWorkflows.personalNotePlaceholder')} /></label><footer className={styles.full}><Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button type="submit" variant="primary" disabled={saving}>{saving ? t('common.loading') : t('teacherWorkflows.giveAchievement')}</Button></footer></form></Modal>;
}

function Empty({ icon, title, body }) {
  return <div className={styles.empty}><Icon name={icon} size={27} /><strong>{title}</strong><span>{body}</span></div>;
}
