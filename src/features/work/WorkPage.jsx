import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import { Button, Chip, Icon, Modal, MotivationalHero } from '@/ui';
import { useAsync } from '@/hooks/useAsync.js';
import { useServices } from '@/hooks/useServices.js';
import { useT } from '@/hooks/useT.js';
import { useToast } from '@/hooks/useToast.js';
import styles from './work.module.css';

const TABS = ['calendar', 'requests', 'meetings'];
const REQUEST_KINDS = ['absence', 'other', 'expense', 'procurement', 'loan'];
const MEETING_AUDIENCE_MODES = ['people', 'departments', 'branches', 'organization'];

export function WorkPage() {
  const { work } = useServices();
  const { t, locale } = useT();
  const toast = useToast();
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState('calendar');
  const [weekOffset, setWeekOffset] = useState(0);
  const [requestOpen, setRequestOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const pendingActions = useRef(new Set());
  const state = useAsync(() => work.getWorkspace(), [locale, revision]);

  const refresh = () => setRevision((value) => value + 1);
  const run = async (action, successKey) => {
    if (pendingActions.current.has(successKey)) return false;
    pendingActions.current.add(successKey);
    try {
      await action();
      toast(t(successKey), 'success');
      refresh();
      return true;
    } catch (error) {
      toast(error?.message || t('common.error'), 'error');
      return false;
    } finally {
      pendingActions.current.delete(successKey);
    }
  };

  return (
    <AsyncBoundary state={state}>
      {(data) => {
        const openRequests = data.requests.filter((request) => request.status === 'pending').length;
        const pendingMeetings = data.meetings.filter(
          (meeting) => meeting.response === 'pending',
        ).length;
        const openCovers = data.coverage.filter((cover) => cover.status === 'open').length;
        const next = nextEvent(data);
        return (
          <>
            <PageHeader
              title={t('work.title')}
              subtitle={t('work.subtitle')}
              right={
                data.capabilities.requests ? (
                  <Button variant="primary" icon="plus" onClick={() => setRequestOpen(true)}>
                    {t('work.newRequest')}
                  </Button>
                ) : null
              }
            />

            <MotivationalHero
              context="work"
              className={styles.motivationalHero}
              eyebrow={t('work.staffWorkspace')}
              title={next ? t('work.nextUp') : t('work.clearWeek')}
              refreshKey={revision}
              meta={!next ? t('work.clearWeekBody') : undefined}
            >
              {next && (
                <div className={styles.nextEvent}>
                  <time className="sf-mono">{formatTime(next.startsAt, locale)}</time>
                  <span />
                  <div>
                    <strong>{next.title}</strong>
                    <small>{next.meta}</small>
                  </div>
                </div>
              )}
            </MotivationalHero>

            <section className={styles.metrics} aria-label={t('work.summary')}>
              <Metric
                icon="cal"
                value={data.lessons.length}
                label={t('work.events')}
                tone="primary"
                onClick={() => setTab('calendar')}
              />
              <Metric
                icon="doc"
                value={openRequests}
                label={t('work.openRequests')}
                tone="accent"
                onClick={() => setTab('requests')}
              />
              <Metric
                icon="users"
                value={pendingMeetings}
                label={t('work.awaitingRsvp')}
                tone="success"
                onClick={() => setTab('meetings')}
              />
              <Metric
                icon="refresh"
                value={openCovers}
                label={t('work.coverOpen')}
                tone="warn"
                onClick={() => setTab('meetings')}
              />
            </section>

            <div className={styles.tabBar} role="tablist" aria-label={t('work.title')}>
              {TABS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  data-on={tab === key ? '1' : '0'}
                  onClick={() => setTab(key)}
                >
                  <Icon
                    name={key === 'calendar' ? 'cal' : key === 'requests' ? 'doc' : 'users'}
                    size={15}
                  />
                  {t(`work.${key}`)}
                  {key === 'requests' && openRequests > 0 && <i>{openRequests}</i>}
                </button>
              ))}
            </div>

            {tab === 'calendar' && (
              <CalendarView
                data={data}
                locale={locale}
                t={t}
                weekOffset={weekOffset}
                setWeekOffset={setWeekOffset}
              />
            )}
            {tab === 'requests' && (
              <RequestsView
                data={data}
                locale={locale}
                t={t}
                onNew={() => setRequestOpen(true)}
                onCancel={(id) => run(() => work.cancelRequest(id), 'work.requestCancelled')}
              />
            )}
            {tab === 'meetings' && (
              <MeetingsView
                data={data}
                locale={locale}
                t={t}
                onRespond={(id, response) =>
                  run(() => work.respondMeeting(id, response), 'work.responseSaved')
                }
                onClaim={(id) => run(() => work.claimCover(id), 'work.coverClaimed')}
                onRequestCover={() => setCoverOpen(true)}
                onSchedule={data.capabilities.scheduleMeetings ? () => setMeetingOpen(true) : null}
              />
            )}

            <RequestModal
              open={requestOpen}
              onClose={() => setRequestOpen(false)}
              t={t}
              onSubmit={async (input) => {
                const saved = await run(() => work.createRequest(input), 'work.requestCreated');
                if (saved) setRequestOpen(false);
              }}
            />
            <CoverModal
              open={coverOpen}
              onClose={() => setCoverOpen(false)}
              lessons={data.lessons}
              locale={locale}
              t={t}
              onSubmit={async (input) => {
                const saved = await run(() => work.requestCover(input), 'work.coverRequested');
                if (saved) setCoverOpen(false);
              }}
            />
            <ScheduleMeetingModal
              open={meetingOpen}
              onClose={() => setMeetingOpen(false)}
              audience={data.meetingAudience}
              audienceComplete={data.meetingAudienceComplete}
              t={t}
              onSubmit={async (input) => {
                const saved = await run(() => work.scheduleMeeting(input), 'work.meetingScheduled');
                if (saved) setMeetingOpen(false);
              }}
            />
          </>
        );
      }}
    </AsyncBoundary>
  );
}

function Metric({ icon, value, label, tone, onClick }) {
  return (
    <button type="button" className={styles.metric} data-tone={tone} onClick={onClick}>
      <span>
        <Icon name={icon} size={17} />
      </span>
      <div>
        <strong className="sf-mono">{value}</strong>
        <small>{label}</small>
      </div>
      <Icon name="arrowR" size={13} />
    </button>
  );
}

function CalendarView({ data, locale, t, weekOffset, setWeekOffset }) {
  const days = useMemo(() => weekDays(weekOffset), [weekOffset]);
  const events = [
    ...data.lessons.map((lesson) => ({
      ...lesson,
      kind: 'lesson',
      meta: [lesson.cohort, lesson.room && `${t('work.room')} ${lesson.room}`]
        .filter(Boolean)
        .join(' · '),
    })),
    ...data.meetings.map((meeting) => ({
      ...meeting,
      kind: 'meeting',
      color: 'var(--sf-accent)',
      meta: meeting.location,
    })),
  ];
  return (
    <section className={styles.calendarPanel}>
      <header className={styles.panelHead}>
        <div>
          <span>{t('work.weekView')}</span>
          <h2>{formatWeek(days, locale)}</h2>
        </div>
        <div className={styles.weekControls}>
          <button
            type="button"
            onClick={() => setWeekOffset((value) => value - 1)}
            aria-label={t('work.previousWeek')}
          >
            <Icon name="arrowL" size={15} />
          </button>
          <button type="button" className={styles.todayButton} onClick={() => setWeekOffset(0)}>
            {t('work.today')}
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset((value) => value + 1)}
            aria-label={t('work.nextWeek')}
          >
            <Icon name="arrowR" size={15} />
          </button>
        </div>
      </header>
      <div className={styles.calendarViewport}>
        <div className={styles.weekGrid}>
          {days.map((day) => {
            const dayEvents = events
              .filter((event) => sameDay(new Date(event.startsAt), day))
              .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
            return (
              <article
                className={styles.day}
                key={day.toISOString()}
                data-today={sameDay(day, new Date()) ? '1' : '0'}
              >
                <header>
                  <span>{formatDayName(day, locale)}</span>
                  <strong>{day.getDate()}</strong>
                </header>
                <div className={styles.dayEvents}>
                  {dayEvents.map((event) => (
                    <div
                      className={styles.event}
                      key={`${event.kind}-${event.id}`}
                      style={{ '--event-color': event.color }}
                    >
                      <time className="sf-mono">{formatTime(event.startsAt, locale)}</time>
                      <strong>{event.title}</strong>
                      <small>{event.meta}</small>
                      <Chip tone={event.kind === 'meeting' ? 'accent' : 'neutral'}>
                        {t(`work.${event.kind}`)}
                      </Chip>
                    </div>
                  ))}
                  {!dayEvents.length && (
                    <span className={styles.freeSlot}>{t('work.noEvents')}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <span className={styles.calendarScrollCue} aria-hidden="true">
        <Icon name="arrowR" size={15} />
      </span>
    </section>
  );
}

function RequestsView({ data, locale, t, onNew, onCancel }) {
  if (!data.capabilities.requests && !data.capabilities.loans) return <Unavailable t={t} />;
  return (
    <section className={styles.requestLayout}>
      <div className={styles.requestMain}>
        <header className={styles.sectionHead}>
          <div>
            <span>{t('work.myRequests')}</span>
            <h2>{t('work.requestHistory')}</h2>
          </div>
          <Button variant="soft" icon="plus" onClick={onNew}>
            {t('work.newRequest')}
          </Button>
        </header>
        <div className={styles.requestList}>
          {data.requests.map((request) => (
            <article className={styles.request} key={request.id}>
              <span className={styles.requestIcon}>
                <Icon name={request.kind === 'loan' ? 'trend' : 'doc'} size={18} />
              </span>
              <div className={styles.requestCopy}>
                <div className={styles.requestTitle}>
                  <strong>{request.title}</strong>
                  <StatusChip status={request.status} t={t} />
                </div>
                <p>{request.description}</p>
                <div className={styles.requestMeta}>
                  <span>{t(`work.kind.${request.kind}`)}</span>
                  <span>{formatDate(request.createdAt, locale)}</span>
                  {request.kind === 'absence' && request.payload?.starts_on && <span>{formatDate(request.payload.starts_on, locale)}–{formatDate(request.payload.ends_on || request.payload.starts_on, locale)}</span>}
                  {request.amount != null && (
                    <strong className="sf-mono">{money(request.amount, locale)}</strong>
                  )}
                </div>
              </div>
              {request.status === 'pending' && (
                <button
                  className={styles.cancelRequest}
                  type="button"
                  onClick={() => onCancel(request.id)}
                >
                  {t('work.cancel')}
                </button>
              )}
            </article>
          ))}
          {!data.requests.length && (
            <Empty icon="doc" title={t('work.noRequests')} body={t('work.noRequestsBody')} />
          )}
        </div>
      </div>
      <aside className={styles.processCard}>
        <span className={styles.eyebrow}>
          <i /> {t('work.transparentProcess')}
        </span>
        <h2>{t('work.processTitle')}</h2>
        <p>{t('work.processBody')}</p>
        {['submitted', 'reviewed', 'resolved'].map((step, index) => (
          <div className={styles.processStep} key={step}>
            <span className="sf-mono">0{index + 1}</span>
            <div>
              <strong>{t(`work.${step}`)}</strong>
              <small>{t(`work.${step}Body`)}</small>
            </div>
          </div>
        ))}
      </aside>
    </section>
  );
}

function MeetingsView({ data, locale, t, onRespond, onClaim, onRequestCover, onSchedule }) {
  return (
    <section className={styles.meetingLayout}>
      <div className={styles.meetingColumn}>
        <header className={styles.sectionHead}>
          <div>
            <span>{t('work.invited')}</span>
            <h2>{t('work.upcomingMeetings')}</h2>
          </div>
          {onSchedule && <button type="button" onClick={onSchedule}>{t('work.scheduleMeeting')}</button>}
        </header>
        <div className={styles.meetingList}>
          {data.meetings.map((meeting) => (
            <article className={styles.meeting} key={meeting.id}>
              <div className={styles.meetingDate}>
                <span>{formatMonth(meeting.startsAt, locale)}</span>
                <strong className="sf-mono">{new Date(meeting.startsAt).getDate()}</strong>
              </div>
              <div className={styles.meetingCopy}>
                <div>
                  <strong>{meeting.title}</strong>
                  <StatusChip status={meeting.response} t={t} />
                </div>
                <p>{meeting.agenda}</p>
                <small>
                  <Icon name="clock" size={13} /> {formatTimeRange(meeting, locale)} ·{' '}
                  {meeting.location}
                </small>
                <div className={styles.rsvp}>
                  <button
                    type="button"
                    data-on={meeting.response === 'accepted' ? '1' : '0'}
                    onClick={() => onRespond(meeting.id, 'accepted')}
                  >
                    <Icon name="check" size={13} />
                    {t('work.accept')}
                  </button>
                  <button
                    type="button"
                    data-on={meeting.response === 'declined' ? '1' : '0'}
                    onClick={() => onRespond(meeting.id, 'declined')}
                  >
                    <Icon name="x" size={12} />
                    {t('work.decline')}
                  </button>
                </div>
              </div>
            </article>
          ))}
          {!data.meetings.length && (
            <Empty icon="users" title={t('work.noMeetings')} body={t('work.noMeetingsBody')} />
          )}
        </div>
      </div>

      {data.capabilities.cover && (
        <div className={styles.coverColumn}>
          <header className={styles.sectionHead}>
            <div>
              <span>{t('work.teamSupport')}</span>
              <h2>{t('work.lessonCover')}</h2>
            </div>
            <button type="button" onClick={onRequestCover}>
              {t('work.needCover')}
            </button>
          </header>
          <div className={styles.coverList}>
            {data.coverage.map((cover) => (
              <article className={styles.cover} key={cover.id}>
                <div className={styles.coverTop}>
                  <span>
                    <Icon name="refresh" size={16} />
                  </span>
                  <StatusChip status={cover.status} t={t} />
                </div>
                <strong>{cover.lessonTitle}</strong>
                <small>
                  <Icon name="clock" size={12} /> {formatDateTime(cover.time, locale)}
                </small>
                <p>{cover.reason}</p>
                {cover.status === 'open' && (
                  <Button variant="ink" block onClick={() => onClaim(cover.id)}>
                    {t('work.claimCover')}
                  </Button>
                )}
              </article>
            ))}
            {!data.coverage.length && (
              <Empty icon="refresh" title={t('work.noCover')} body={t('work.noCoverBody')} />
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function resolveAudience(mode, targets, people, branch) {
  const selected = new Set(targets);
  const scoped = branch ? people.filter((person) => person.branchIds.includes(String(branch))) : people;
  if (mode === 'organization') return scoped;
  if (mode === 'branches') return scoped.filter((person) => person.branchIds.some((id) => selected.has(id)));
  if (mode === 'departments') return scoped.filter((person) => person.departmentIds.some((id) => selected.has(id)));
  return scoped.filter((person) => selected.has(person.key));
}

function ScheduleMeetingModal({ open, onClose, onSubmit, audience, audienceComplete, t }) {
  const people = audience?.people || [];
  const branches = audience?.branches || [];
  const departments = audience?.departments || [];
  const [form, setForm] = useState({ title: '', agenda: '', location: '', startsAt: '', endsAt: '', branch: '', mode: 'people', targets: [], search: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setForm({ title: '', agenda: '', location: '', startsAt: '', endsAt: '', branch: '', mode: 'people', targets: [], search: '' });
    setSaving(false);
  }, [open]);
  const scopedPeople = form.branch ? people.filter((person) => person.branchIds.includes(String(form.branch))) : people;
  const resolved = resolveAudience(form.mode, form.targets, people, form.branch);
  const options = form.mode === 'people'
    ? scopedPeople.map((person) => ({ id: person.key, name: person.name, detail: person.role }))
    : form.mode === 'departments'
      ? departments.map((item) => ({ ...item, count: scopedPeople.filter((person) => person.departmentIds.includes(String(item.id))).length })).filter((item) => item.count)
      : form.mode === 'branches'
        ? branches.map((item) => ({ ...item, count: scopedPeople.filter((person) => person.branchIds.includes(String(item.id))).length })).filter((item) => item.count)
        : [];
  const visible = options.filter((option) => `${option.name} ${option.detail || ''}`.toLowerCase().includes(form.search.trim().toLowerCase()));
  const setStart = (value) => {
    const start = new Date(value);
    const suggested = Number.isNaN(start.getTime()) ? '' : localInputDate(new Date(start.getTime() + 60 * 60 * 1000));
    setForm((current) => ({ ...current, startsAt: value, endsAt: current.endsAt || suggested }));
  };
  const toggle = (id) => setForm((current) => ({ ...current, targets: current.targets.includes(id) ? current.targets.filter((item) => item !== id) : [...current.targets, id] }));
  const valid = form.title.trim() && form.startsAt && form.endsAt && new Date(form.endsAt) > new Date(form.startsAt) && resolved.length > 0 && resolved.length <= 200 && (form.mode === 'people' || audienceComplete);
  const submit = async (event) => {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    await onSubmit({
      title: form.title.trim(),
      agenda: form.agenda.trim(),
      location: form.location.trim(),
      starts_at: new Date(form.startsAt).toISOString(),
      ends_at: new Date(form.endsAt).toISOString(),
      branch: form.branch ? Number(form.branch) : null,
      invitees: resolved.map(({ kind, id }) => ({ kind, id })),
    });
    setSaving(false);
  };
  return <Modal open={open} onClose={onClose} title={t('work.scheduleMeeting')} size="wide"><form className={`${styles.form} ${styles.meetingForm}`} onSubmit={submit}><p className={styles.formIntro}>{t('work.scheduleMeetingIntro')}</p><label><span>{t('work.meetingTitle')}</span><input autoFocus required maxLength="200" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={t('work.meetingTitlePlaceholder')} /></label><div className={styles.dateGrid}><label><span>{t('work.starts')}</span><input required type="datetime-local" value={form.startsAt} onChange={(event) => setStart(event.target.value)} /></label><label><span>{t('work.ends')}</span><input required type="datetime-local" min={form.startsAt} value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label></div><div className={styles.dateGrid}><label><span>{t('work.meetingScope')}</span><select value={form.branch} onChange={(event) => setForm({ ...form, branch: event.target.value, targets: [] })}><option value="">{t('work.entireOrganization')}</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label><span>{t('work.location')}</span><input maxLength="200" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder={t('work.locationPlaceholder')} /></label></div><label><span>{t('work.agenda')}</span><textarea rows="3" maxLength="20000" value={form.agenda} onChange={(event) => setForm({ ...form, agenda: event.target.value })} placeholder={t('work.agendaPlaceholder')} /></label><section className={styles.meetingAudience}><header><div><span>{t('work.audience')}</span><strong>{t('work.whoShouldAttend')}</strong></div><b>{resolved.length} {t('work.invitees')}</b></header><div className={styles.audienceModes}>{MEETING_AUDIENCE_MODES.map((mode) => <button key={mode} type="button" data-on={form.mode === mode ? '1' : '0'} disabled={mode !== 'people' && !audienceComplete} onClick={() => setForm({ ...form, mode, targets: [], search: '' })}><Icon name={mode === 'people' ? 'users' : mode === 'departments' ? 'folder' : mode === 'branches' ? 'globe' : 'brand'} size={16} /><span><strong>{t(`work.audienceMode.${mode}`)}</strong><small>{t(`work.audienceModeBody.${mode}`)}</small></span></button>)}</div>{form.mode === 'organization' ? <div className={styles.audienceSummary}><Icon name="brand" size={18} /><div><strong>{form.branch ? t('work.entireBranch') : t('work.entireOrganization')}</strong><small>{resolved.length} {t('work.colleaguesInvited')}</small></div></div> : <><label className={styles.audienceSearch}><Icon name="search" size={14} /><input value={form.search} onChange={(event) => setForm({ ...form, search: event.target.value })} placeholder={t('work.searchAudience')} /></label><div className={styles.audienceOptions}>{visible.map((option) => <button key={option.id} type="button" data-on={form.targets.includes(option.id) ? '1' : '0'} onClick={() => toggle(option.id)}><span>{option.name.slice(0, 2).toUpperCase()}</span><div><strong>{option.name}</strong><small>{option.detail || `${option.count} ${t('work.colleagues')}`}</small></div><Icon name={form.targets.includes(option.id) ? 'check' : 'plus'} size={14} /></button>)}</div></>}{!audienceComplete && <p className={styles.audienceWarning}>{t('work.incompleteAudience')}</p>}{resolved.length > 200 && <p className={styles.audienceWarning}>{t('work.audienceLimit')}</p>}</section><div className={styles.formActions}><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button variant="primary" type="submit" disabled={!valid || saving}>{saving ? t('common.loading') : t('work.scheduleMeeting')}</Button></div></form></Modal>;
}

function RequestModal({ open, onClose, onSubmit, t }) {
  const [kind, setKind] = useState('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [saving, setSaving] = useState(false);
  const needsAmount = ['expense', 'procurement', 'loan'].includes(kind);
  useEffect(() => {
    if (!open) return;
    setKind('other');
    setTitle('');
    setDescription('');
    setAmount('');
    setStartsOn('');
    setEndsOn('');
    setSaving(false);
  }, [open]);
  const isAbsence = kind === 'absence';
  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim() || (needsAmount && !(Number(amount) > 0)) || (isAbsence && (!startsOn || !endsOn || endsOn < startsOn || !description.trim()))) return;
    setSaving(true);
    await onSubmit({
      kind,
      title: title.trim(),
      description: description.trim(),
      amount: amount ? Number(amount) : null,
      payload: isAbsence ? { starts_on: startsOn, ends_on: endsOn, reason: description.trim() } : {},
    });
    setSaving(false);
  };
  return (
    <Modal open={open} onClose={onClose} title={t('work.newRequest')}>
      <form className={styles.form} onSubmit={submit}>
        <p className={styles.formIntro}>{t('work.requestIntro')}</p>
        <div className={styles.kindGrid}>
          {REQUEST_KINDS.map((key) => (
            <button
              key={key}
              type="button"
              data-on={kind === key ? '1' : '0'}
              onClick={() => setKind(key)}
            >
              <Icon
                name={
                  key === 'absence'
                    ? 'cal'
                    : key === 'loan'
                    ? 'trend'
                    : key === 'expense'
                      ? 'doc'
                      : key === 'procurement'
                        ? 'folder'
                        : 'flag'
                }
                size={16}
              />
              <span>
                <strong>{t(`work.kind.${key}`)}</strong>
                <small>{t(`work.kindBody.${key}`)}</small>
              </span>
            </button>
          ))}
        </div>
        <label>
          <span>{t('work.requestTitle')}</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('work.requestTitlePlaceholder')}
            required
          />
        </label>
        {isAbsence && <div className={styles.dateGrid}><label><span>{t('work.absenceStarts')}</span><input type="date" value={startsOn} onChange={(event) => { setStartsOn(event.target.value); if (!endsOn || endsOn < event.target.value) setEndsOn(event.target.value); }} required /></label><label><span>{t('work.absenceEnds')}</span><input type="date" min={startsOn} value={endsOn} onChange={(event) => setEndsOn(event.target.value)} required /></label></div>}
        <label>
          <span>{isAbsence ? t('work.absenceReason') : t('work.details')}</span>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={isAbsence ? t('work.absenceReasonPlaceholder') : t('work.detailsPlaceholder')}
            required={isAbsence}
          />
        </label>
        {(needsAmount || amount) && (
          <label>
            <span>{t('work.amount')}</span>
            <div className={styles.moneyInput}>
              <input
                type="number"
                min="0.01"
                step="any"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required={needsAmount}
              />
              <b>UZS</b>
            </div>
          </label>
        )}
        <div className={styles.formActions}>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? t('common.loading') : t('work.submitRequest')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CoverModal({ open, onClose, onSubmit, lessons, locale, t }) {
  const [lessonId, setLessonId] = useState('');
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (!open) return;
    setLessonId('');
    setReason('');
  }, [open]);
  const submit = (event) => {
    event.preventDefault();
    if (lessonId) onSubmit({ lessonId, reason });
  };
  return (
    <Modal open={open} onClose={onClose} title={t('work.needCover')}>
      <form className={styles.form} onSubmit={submit}>
        <p className={styles.formIntro}>{t('work.coverIntro')}</p>
        <label>
          <span>{t('work.lesson')}</span>
          <select value={lessonId} onChange={(event) => setLessonId(event.target.value)} required>
            <option value="">{t('work.chooseLesson')}</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {formatDateTime(lesson.startsAt, locale)} · {lesson.cohort}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('work.reason')}</span>
          <textarea
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('work.reasonPlaceholder')}
          />
        </label>
        <div className={styles.formActions}>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit">
            {t('work.sendCoverRequest')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function StatusChip({ status, t }) {
  const tones = {
    approved: 'success',
    accepted: 'success',
    disbursed: 'primary',
    assigned: 'primary',
    pending: 'warn',
    open: 'accent',
    declined: 'danger',
    rejected: 'danger',
    cancelled: 'neutral',
  };
  return <Chip tone={tones[status] || 'neutral'}>{t(`work.status.${status}`)}</Chip>;
}

function Empty({ icon, title, body }) {
  return (
    <div className={styles.empty}>
      <span>
        <Icon name={icon} size={20} />
      </span>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function Unavailable({ t }) {
  return <Empty icon="shield" title={t('work.unavailable')} body={t('work.unavailableBody')} />;
}

function weekDays(offset) {
  const monday = new Date();
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1 + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function nextEvent(data) {
  const now = Date.now();
  const events = [
    ...data.lessons.map((lesson) => ({ ...lesson, meta: lesson.cohort })),
    ...data.meetings.map((meeting) => ({ ...meeting, meta: meeting.location })),
  ];
  return (
    events
      .filter((event) => new Date(event.startsAt).getTime() >= now)
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0] ?? null
  );
}

function localeCode(locale) {
  return locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US';
}
function localInputDate(value) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function formatTime(value, locale) {
  return new Intl.DateTimeFormat(localeCode(locale), { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  );
}
function formatDate(value, locale) {
  return new Intl.DateTimeFormat(localeCode(locale), { day: 'numeric', month: 'short' }).format(
    new Date(value),
  );
}
function formatMonth(value, locale) {
  return new Intl.DateTimeFormat(localeCode(locale), { month: 'short' })
    .format(new Date(value))
    .toUpperCase();
}
function formatDayName(value, locale) {
  return new Intl.DateTimeFormat(localeCode(locale), { weekday: 'short' }).format(value);
}
function formatDateTime(value, locale) {
  return new Intl.DateTimeFormat(localeCode(locale), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
function formatTimeRange(item, locale) {
  return `${formatTime(item.startsAt, locale)}–${formatTime(item.endsAt, locale)}`;
}
function formatWeek(days, locale) {
  return `${formatDate(days[0], locale)} — ${formatDate(days[days.length - 1], locale)}`;
}
function money(value, locale) {
  return `${new Intl.NumberFormat(localeCode(locale), { maximumFractionDigits: 0 }).format(value)} UZS`;
}
