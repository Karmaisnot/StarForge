import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import { Button, Chip, Icon, MotivationalHero, ProgressBar } from '@/ui';
import { useAcademicPage } from '@/hooks/data.js';
import { useServices } from '@/hooks/useServices.js';
import { useT } from '@/hooks/useT.js';
import { useToast } from '@/hooks/useToast.js';
import styles from './academic.module.css';

const TABS = ['overview', 'coursework', 'insights', 'resources'];

export function AcademicPage() {
  const { academic } = useServices();
  const { t, locale } = useT();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const [tab, setTab] = useState(() => {
    const requested = searchParams.get('tab');
    return TABS.includes(requested) ? requested : 'overview';
  });
  const [revision, setRevision] = useState(0);
  const pending = useRef(new Set());
  const state = useAcademicPage(revision);

  useEffect(() => {
    const requested = searchParams.get('tab');
    if (TABS.includes(requested) && requested !== tab) setTab(requested);
  }, [searchParams, tab]);

  const selectTab = (next) => {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  const run = async (key, action, successKey) => {
    if (pending.current.has(key)) return;
    pending.current.add(key);
    try {
      await action();
      toast(t(successKey), 'success');
      setRevision((value) => value + 1);
    } catch (error) {
      toast(error?.message || t('common.errorBody'), 'error');
    } finally {
      pending.current.delete(key);
    }
  };

  return (
    <AsyncBoundary state={state}>
      {(data) => (
        <>
          <PageHeader title={t('academic.title')} subtitle={t('academic.subtitle')} />
          <AcademicHero data={data} t={t} locale={locale} refreshKey={revision} />
          <nav className={styles.tabs} aria-label={t('academic.title')} role="tablist">
            {TABS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                data-on={tab === key ? '1' : '0'}
                onClick={() => selectTab(key)}
              >
                <Icon name={tabIcon(key)} size={15} />
                {t(`academic.tabs.${key}`)}
              </button>
            ))}
          </nav>

          {tab === 'overview' && <Overview data={data} t={t} locale={locale} />}
          {tab === 'coursework' && (
            <Coursework
              data={data}
              t={t}
              locale={locale}
              onPublishAssignment={(id) =>
                run(
                  `assignment-${id}`,
                  () => academic.publishAssignment(id),
                  'academic.assignmentPublished',
                )
              }
              onPublishExam={(id) =>
                run(`exam-${id}`, () => academic.publishExam(id), 'academic.examPublished')
              }
            />
          )}
          {tab === 'insights' && <Insights data={data} t={t} locale={locale} />}
          {tab === 'resources' && (
            <Resources
              data={data}
              t={t}
              onRunReport={(report) =>
                run(
                  `report-${report.key}`,
                  () => academic.runReport(report.key, report.format),
                  'academic.reportQueued',
                )
              }
            />
          )}
        </>
      )}
    </AsyncBoundary>
  );
}

function AcademicHero({ data, t, locale, refreshKey }) {
  const upcoming = useMemo(
    () =>
      data.schedule
        .filter(
          (lesson) => new Date(lesson.startsAt) >= new Date() && lesson.status !== 'cancelled',
        )
        .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0],
    [data.schedule],
  );
  const marked = data.attendance.filter((record) => record.status !== 'excused');
  const attended = marked.filter((record) => ['present', 'late'].includes(record.status)).length;
  const attendanceRate = marked.length ? Math.round((attended / marked.length) * 100) : null;
  const openAssignments = data.assignments.filter(
    (assignment) => !['closed', 'archived'].includes(assignment.status),
  ).length;

  return (
    <MotivationalHero
      context="academic"
      className={styles.motivationalHero}
      eyebrow={t('academic.commandCenter')}
      title={upcoming ? t('academic.nextLessonReady') : t('academic.academicsClear')}
      refreshKey={refreshKey}
      meta={!upcoming ? t('academic.academicsClearBody') : undefined}
      actions={
        <div className={styles.heroStats}>
          <HeroStat value={data.schedule.length} label={t('academic.lessons')} />
          <HeroStat
            value={attendanceRate == null ? '—' : `${attendanceRate}%`}
            label={t('academic.attendance')}
          />
          <HeroStat value={openAssignments} label={t('academic.activeAssignments')} />
          <HeroStat value={data.risks.length} label={t('academic.studentsToReview')} tone="warn" />
        </div>
      }
    >
      {upcoming && (
        <div className={styles.nextLesson}>
          <time className="sf-mono">{formatTime(upcoming.startsAt, locale)}</time>
          <span />
          <div>
            <strong>{upcoming.title}</strong>
            <small>{[upcoming.cohort, upcoming.room].filter(Boolean).join(' · ')}</small>
          </div>
        </div>
      )}
    </MotivationalHero>
  );
}

function HeroStat({ value, label, tone }) {
  return (
    <div className={styles.heroStat} data-tone={tone || 'default'}>
      <strong className="sf-mono">{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Overview({ data, t, locale }) {
  return (
    <div className={styles.overviewGrid}>
      <Panel
        title={t('academic.scheduleTitle')}
        kicker={t('academic.upcomingLessons')}
        icon="cal"
        unavailable={!data.capabilities.schedule}
        t={t}
      >
        <div className={styles.timeline}>
          {data.schedule.slice(0, 7).map((lesson) => (
            <article className={styles.lesson} key={lesson.id}>
              <div className={styles.lessonDate}>
                <strong className="sf-mono">{formatDay(lesson.startsAt, locale)}</strong>
                <span>{formatTime(lesson.startsAt, locale)}</span>
              </div>
              <i />
              <div className={styles.lessonCopy}>
                <strong>{lesson.title}</strong>
                <small>{[lesson.cohort, lesson.room].filter(Boolean).join(' · ')}</small>
              </div>
              <Status status={lesson.status} t={t} />
            </article>
          ))}
          {!data.schedule.length && data.capabilities.schedule && (
            <Empty icon="cal" title={t('academic.noLessons')} body={t('academic.noLessonsBody')} />
          )}
        </div>
      </Panel>

      <Panel
        title={t('academic.attendanceTitle')}
        kicker={t('academic.recentMarks')}
        icon="check"
        unavailable={!data.capabilities.attendance}
        t={t}
      >
        <AttendanceBreakdown records={data.attendance} t={t} />
        <div className={styles.attendanceList}>
          {data.attendance.slice(0, 6).map((record) => (
            <article key={record.id}>
              <span className={styles.statusDot} data-status={record.status} />
              <div>
                <strong>{record.student}</strong>
                <small>{[record.cohort, record.lesson].filter(Boolean).join(' · ')}</small>
              </div>
              <div className={styles.recordTime}>
                <Status status={record.status} t={t} />
                <time>{formatDate(record.at, locale)}</time>
              </div>
            </article>
          ))}
          {!data.attendance.length && data.capabilities.attendance && (
            <Empty
              icon="check"
              title={t('academic.noAttendance')}
              body={t('academic.noAttendanceBody')}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}

function AttendanceBreakdown({ records, t }) {
  const total = records.length || 1;
  const pieces = ['present', 'late', 'absent', 'excused'].map((status) => ({
    status,
    count: records.filter((record) => record.status === status).length,
  }));
  return (
    <div className={styles.breakdown} aria-label={t('academic.attendanceBreakdown')}>
      <div className={styles.breakdownBar}>
        {pieces.map((piece) =>
          piece.count ? (
            <i
              key={piece.status}
              data-status={piece.status}
              style={{ width: `${(piece.count / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <div className={styles.breakdownLegend}>
        {pieces.map((piece) => (
          <span key={piece.status}>
            <i data-status={piece.status} />
            {t(`academic.status.${piece.status}`)} <b className="sf-mono">{piece.count}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function Coursework({ data, t, locale, onPublishAssignment, onPublishExam }) {
  return (
    <div className={styles.courseGrid}>
      <Panel
        title={t('academic.assignmentsTitle')}
        kicker={t('academic.courseworkPipeline')}
        icon="doc"
        unavailable={!data.capabilities.assignments}
        t={t}
      >
        <div className={styles.assignmentList}>
          {data.assignments.map((assignment) => (
            <article key={assignment.id}>
              <span className={styles.itemIcon}>
                <Icon name="doc" size={17} />
              </span>
              <div className={styles.itemCopy}>
                <div>
                  <strong>{assignment.title}</strong>
                  <Status status={assignment.status} t={t} />
                </div>
                <small>{assignment.cohort}</small>
                <p>
                  {t('academic.due')} {formatDateTime(assignment.dueAt, locale)} ·{' '}
                  {assignment.maxScore} {t('academic.points')}
                </p>
              </div>
              {assignment.status === 'draft' && (
                <Button variant="soft" onClick={() => onPublishAssignment(assignment.id)}>
                  {t('academic.publish')}
                </Button>
              )}
            </article>
          ))}
          {!data.assignments.length && data.capabilities.assignments && (
            <Empty
              icon="doc"
              title={t('academic.noAssignments')}
              body={t('academic.noAssignmentsBody')}
            />
          )}
        </div>
      </Panel>

      <div className={styles.stack}>
        <Panel
          title={t('academic.examsTitle')}
          kicker={t('academic.assessmentCalendar')}
          icon="flag"
          unavailable={!data.capabilities.academics}
          t={t}
        >
          <div className={styles.examList}>
            {data.exams.map((exam) => (
              <article key={exam.id}>
                <time>
                  <strong className="sf-mono">{formatDay(exam.date, locale)}</strong>
                  <small>{formatMonth(exam.date, locale)}</small>
                </time>
                <div>
                  <strong>{exam.title}</strong>
                  <small>{[exam.subject, exam.cohort].filter(Boolean).join(' · ')}</small>
                </div>
                {exam.published ? (
                  <Status status="published" t={t} />
                ) : (
                  <button type="button" onClick={() => onPublishExam(exam.id)}>
                    {t('academic.publish')}
                  </button>
                )}
              </article>
            ))}
            {!data.exams.length && data.capabilities.academics && (
              <Empty icon="flag" title={t('academic.noExams')} body={t('academic.noExamsBody')} />
            )}
          </div>
        </Panel>

        <Panel
          title={t('academic.gradesTitle')}
          kicker={t('academic.latestComputed')}
          icon="trend"
          unavailable={!data.capabilities.academics}
          t={t}
        >
          <div className={styles.gradeList}>
            {data.grades.slice(0, 6).map((grade) => (
              <article key={grade.id}>
                <div>
                  <strong>{grade.student}</strong>
                  <small>{grade.subject}</small>
                </div>
                <ProgressBar value={Math.min(100, grade.value)} />
                <b className="sf-mono">{grade.display}</b>
                <span className="sf-mono">{Math.round(grade.value)}%</span>
              </article>
            ))}
            {!data.grades.length && data.capabilities.academics && (
              <Empty
                icon="trend"
                title={t('academic.noGrades')}
                body={t('academic.noGradesBody')}
              />
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

const INSIGHT_FILTER_COPY = {
  en: {
    filters: 'Student insight filters',
    allGroups: 'All my groups',
    allRisk: 'All risk levels',
    allStatus: 'All statuses',
    from: 'From',
    to: 'To',
    reset: 'Reset',
    showing: 'signals shown',
    open: 'Open',
    monitoring: 'Monitoring',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  },
  ru: {
    filters: 'Фильтры аналитики учеников',
    allGroups: 'Все мои группы',
    allRisk: 'Все уровни риска',
    allStatus: 'Все статусы',
    from: 'С',
    to: 'По',
    reset: 'Сбросить',
    showing: 'сигналов показано',
    open: 'Открыт',
    monitoring: 'Наблюдение',
    high: 'Высокий',
    medium: 'Средний',
    low: 'Низкий',
  },
  uz: {
    filters: 'O‘quvchi tahlili filtrlari',
    allGroups: 'Barcha guruhlarim',
    allRisk: 'Barcha xavf darajalari',
    allStatus: 'Barcha holatlar',
    from: 'Dan',
    to: 'Gacha',
    reset: 'Tozalash',
    showing: 'signal ko‘rsatildi',
    open: 'Ochiq',
    monitoring: 'Kuzatuvda',
    high: 'Yuqori',
    medium: 'O‘rta',
    low: 'Past',
  },
};

function Insights({ data, t, locale }) {
  const [params, setParams] = useSearchParams();
  const copy = INSIGHT_FILTER_COPY[locale] ?? INSIGHT_FILTER_COPY.en;
  const cohort = params.get('cohort') ?? 'all';
  const riskLevel = params.get('risk') ?? 'all';
  const status = params.get('status') ?? 'all';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const cohorts = useMemo(() => {
    const map = new Map();
    for (const item of [...data.schedule, ...data.attendance, ...data.risks]) {
      if (!item.cohort) continue;
      const id = item.cohortId ?? item.cohort.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      map.set(id, item.cohort);
    }
    return [...map].map(([id, name]) => ({ id, name }));
  }, [data.attendance, data.risks, data.schedule]);
  const risks = data.risks.filter((item) => {
    const cohortId = item.cohortId ?? item.cohort.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const at = item.at ? new Date(item.at) : null;
    if (cohort !== 'all' && cohortId !== cohort) return false;
    if (riskLevel !== 'all' && item.level !== riskLevel) return false;
    if (status !== 'all' && (item.status ?? 'open') !== status) return false;
    if (from && at && at < new Date(`${from}T00:00:00`)) return false;
    if (to && at && at > new Date(`${to}T23:59:59`)) return false;
    return true;
  });
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    next.set('tab', 'insights');
    setParams(next, { replace: true });
  };

  return (
    <section className={styles.insightWorkspace}>
      <div className={styles.insightFilters} aria-label={copy.filters}>
        <label>
          <span>{copy.allGroups}</span>
          <select value={cohort} onChange={(event) => update('cohort', event.target.value)}>
            <option value="all">{copy.allGroups}</option>
            {cohorts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{copy.allRisk}</span>
          <select value={riskLevel} onChange={(event) => update('risk', event.target.value)}>
            <option value="all">{copy.allRisk}</option>
            {['high', 'medium', 'low'].map((key) => (
              <option key={key} value={key}>
                {copy[key]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{copy.allStatus}</span>
          <select value={status} onChange={(event) => update('status', event.target.value)}>
            <option value="all">{copy.allStatus}</option>
            {['open', 'monitoring'].map((key) => (
              <option key={key} value={key}>
                {copy[key]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{copy.from}</span>
          <input
            type="date"
            value={from}
            onChange={(event) => update('from', event.target.value)}
          />
        </label>
        <label>
          <span>{copy.to}</span>
          <input type="date" value={to} onChange={(event) => update('to', event.target.value)} />
        </label>
        <button
          type="button"
          className={styles.resetFilters}
          onClick={() => setParams({ tab: 'insights' }, { replace: true })}
        >
          <Icon name="refresh" size={13} /> {copy.reset}
        </button>
        <strong className={styles.filterCount}>
          {risks.length} {copy.showing}
        </strong>
      </div>
      <div className={styles.insightGrid}>
        <Panel
          title={t('academic.riskTitle')}
          kicker={t('academic.transparentSignals')}
          icon="shield"
          unavailable={!data.capabilities.intelligence}
          t={t}
        >
          <div className={styles.riskIntro}>
            <Icon name="shield" size={20} />
            <p>{t('academic.riskExplanation')}</p>
          </div>
          <div className={styles.riskList}>
            {risks.map((risk) => (
              <article key={risk.id} data-level={risk.level}>
                <span className={styles.riskScore}>
                  <b className="sf-mono">{risk.score}</b>
                  <small>{t('academic.signals')}</small>
                </span>
                <div>
                  <div>
                    <strong>{risk.student}</strong>
                    <Status status={risk.level} t={t} />
                  </div>
                  <small>{risk.cohort}</small>
                  <p>{risk.flags.map((flag) => t(`academic.flags.${flag}`)).join(' · ')}</p>
                </div>
              </article>
            ))}
            {!risks.length && data.capabilities.intelligence && (
              <Empty icon="shield" title={t('academic.noRisks')} body={t('academic.noRisksBody')} />
            )}
          </div>
        </Panel>

        <Panel
          title={t('academic.achievementsTitle')}
          kicker={t('academic.recognitionCatalog')}
          icon="brand"
          unavailable={!data.capabilities.achievements}
          t={t}
        >
          <div className={styles.achievementGrid}>
            {data.achievements.map((achievement) => (
              <article key={achievement.id}>
                <span>{achievement.emoji}</span>
                <div>
                  <strong>{achievement.name}</strong>
                  <p>{achievement.description}</p>
                  <div>
                    <Chip tone="neutral">{t(`academic.scope.${achievement.scope}`)}</Chip>
                    <Status status={achievement.status} t={t} />
                  </div>
                </div>
              </article>
            ))}
            {!data.achievements.length && data.capabilities.achievements && (
              <Empty
                icon="brand"
                title={t('academic.noAchievements')}
                body={t('academic.noAchievementsBody')}
              />
            )}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function Resources({ data, t, onRunReport }) {
  return (
    <div className={styles.resourceGrid}>
      <Panel
        title={t('academic.reportsTitle')}
        kicker={t('academic.reportLibrary')}
        icon="download"
        unavailable={!data.capabilities.reports}
        t={t}
      >
        <div className={styles.reportList}>
          {data.reports.map((report) => (
            <article key={report.id}>
              <span className={styles.itemIcon}>
                <Icon name="download" size={17} />
              </span>
              <div>
                <strong>{report.title}</strong>
                <p>{report.description}</p>
              </div>
              <Chip tone="neutral">{report.format.toUpperCase()}</Chip>
              <Button variant="soft" onClick={() => onRunReport(report)}>
                {t('academic.generate')}
              </Button>
            </article>
          ))}
          {!data.reports.length && data.capabilities.reports && (
            <Empty
              icon="download"
              title={t('academic.noReports')}
              body={t('academic.noReportsBody')}
            />
          )}
        </div>
      </Panel>

      <Panel
        title={t('academic.placementTitle')}
        kicker={t('academic.admissionsToolkit')}
        icon="cohort"
        unavailable={!data.capabilities.placement}
        t={t}
      >
        <div className={styles.placementList}>
          {data.placement.map((test) => (
            <article key={test.id}>
              <div className={styles.placementMark}>
                <Icon name="cohort" size={20} />
              </div>
              <div>
                <div>
                  <strong>{test.title}</strong>
                  <Status status={test.status} t={t} />
                </div>
                <p>{test.description}</p>
                <small>
                  {test.questions} {t('academic.questions')} · {test.minutes}{' '}
                  {t('academic.minutes')}
                </small>
              </div>
            </article>
          ))}
          {!data.placement.length && data.capabilities.placement && (
            <Empty
              icon="cohort"
              title={t('academic.noPlacement')}
              body={t('academic.noPlacementBody')}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}

function Panel({ title, kicker, icon, unavailable, t, children }) {
  return (
    <section className={styles.panel}>
      <header>
        <div>
          <span>{kicker}</span>
          <h2>{title}</h2>
        </div>
        <i>
          <Icon name={icon} size={17} />
        </i>
      </header>
      {unavailable ? (
        <div className={styles.unavailable}>
          <Icon name="shield" size={20} />
          <strong>{t('academic.notAvailable')}</strong>
          <p>{t('academic.notAvailableBody')}</p>
        </div>
      ) : (
        children
      )}
    </section>
  );
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

function Status({ status, t }) {
  const normalized = String(status || 'unknown').toLowerCase();
  return (
    <span className={styles.status} data-status={normalized}>
      {t(`academic.status.${normalized}`)}
    </span>
  );
}

function tabIcon(tab) {
  return { overview: 'pie', coursework: 'doc', insights: 'trend', resources: 'folder' }[tab];
}

function formatTime(value, locale) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatDate(value, locale) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(date);
}

function formatDateTime(value, locale) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
}

function formatDay(value, locale) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(locale, { day: '2-digit' }).format(date);
}

function formatMonth(value, locale) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);
}
