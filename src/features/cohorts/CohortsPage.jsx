import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import { Avatar, Button, Chip, Icon, Modal, ProgressBar, StarMark } from '@/ui';
import { attendanceTone } from '@/domain/models/cohort.js';
import { useCohorts } from '@/hooks/data.js';
import { useAsync } from '@/hooks/useAsync.js';
import { useServices } from '@/hooks/useServices.js';
import { useToast } from '@/hooks/useToast.js';
import { useT } from '@/hooks/useT.js';
import styles from './cohorts.module.css';

export function CohortsPage() {
  const { cohortId } = useParams();
  return cohortId ? <CohortDetail cohortId={cohortId} /> : <CohortDirectory />;
}

function CohortDirectory() {
  const state = useCohorts();
  const navigate = useNavigate();
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  return (
    <AsyncBoundary state={state}>
      {(loaded) => {
        const cohorts = Array.isArray(loaded) ? loaded : [];
        const levels = unique(cohorts.map((cohort) => cohort.level));
        const needle = query.trim().toLowerCase();
        const visible = cohorts.filter(
          (cohort) =>
            (level === 'all' || String(cohort.level) === level) &&
            (!needle ||
              `${cohort.name} ${cohort.subject} ${cohort.level}`.toLowerCase().includes(needle)),
        );
        const students = cohorts.reduce((sum, cohort) => sum + Number(cohort.studentCount ?? 0), 0);
        const averageAttendance = cohorts.length
          ? Math.round(
              cohorts.reduce((sum, cohort) => sum + Number(cohort.attendance ?? 0), 0) /
                cohorts.length,
            )
          : 0;
        return (
          <>
            <PageHeader
              title={t('cohorts.title')}
              subtitle={`${cohorts.length} ${t('cohorts.groupCount')} · ${students} ${t('cohorts.tStudents')}`}
            />

            <section className={styles.directoryHero}>
              <div>
                <span className={styles.eyebrow}>
                  <StarMark size={15} color="var(--sf-primary)" /> {t('cohorts.myTeachingSpace')}
                </span>
                <h2>{t('cohorts.directoryHero')}</h2>
                <p>{t('cohorts.directoryBody')}</p>
              </div>
              <div className={styles.heroMetrics}>
                <div>
                  <strong className="sf-mono">{cohorts.length}</strong>
                  <span>{t('cohorts.groupCount')}</span>
                </div>
                <div>
                  <strong className="sf-mono">{students}</strong>
                  <span>{t('cohorts.tStudents')}</span>
                </div>
                <div>
                  <strong className="sf-mono">{averageAttendance}%</strong>
                  <span>{t('cohorts.tAttendance')}</span>
                </div>
              </div>
            </section>

            <div className={styles.directoryTools}>
              <label>
                <Icon name="search" size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('cohorts.search')}
                />
              </label>
              <select
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                aria-label={t('cohorts.tLevel')}
              >
                <option value="all">{t('cohorts.allLevels')}</option>
                {levels.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <span>
                <strong className="sf-mono">{visible.length}</strong> {t('cohorts.results')}
              </span>
            </div>

            {visible.length ? (
              <section className={styles.groupGrid}>
                {visible.map((cohort) => (
                  <button
                    key={cohort.id}
                    type="button"
                    className={styles.groupCard}
                    onClick={() => navigate(`/cohorts/${cohort.id}`)}
                  >
                    <span className={styles.groupAccent} style={{ background: cohort.color }} />
                    <span className={styles.groupCardHead}>
                      <span className={styles.groupMark} style={{ color: cohort.color }}>
                        <StarMark size={22} color="currentColor" />
                      </span>
                      <span>
                        <small>{cohort.level}</small>
                        <strong>{cohort.name}</strong>
                        <em>
                          {cohort.subject} · {cohort.room}
                        </em>
                      </span>
                      <Icon name="arrowR" size={18} />
                    </span>
                    <span className={styles.groupStats}>
                      <span>
                        <small>{t('cohorts.tStudents')}</small>
                        <strong className="sf-mono">{cohort.studentCount}</strong>
                      </span>
                      <span>
                        <small>{t('cohorts.tAttendance')}</small>
                        <strong
                          className="sf-mono"
                          style={{ color: attendanceTone(cohort.attendance) }}
                        >
                          {cohort.attendance}%
                        </strong>
                      </span>
                      <span>
                        <small>{t('cohorts.tCards')}</small>
                        <strong className="sf-mono">
                          ↑{cohort.up} · ↓{cohort.down}
                        </strong>
                      </span>
                    </span>
                    <span className={styles.nextLine}>
                      <Icon name="cal" size={15} />
                      <span>
                        <small>{t('cohorts.nextLesson')}</small>
                        <strong>{cohort.next || '—'}</strong>
                      </span>
                    </span>
                  </button>
                ))}
              </section>
            ) : (
              <section className={styles.emptyState}>
                <Icon name="cohort" size={28} />
                <h2>{t('cohorts.emptyTitle')}</h2>
                <p>{t('cohorts.emptyBody')}</p>
              </section>
            )}
          </>
        );
      }}
    </AsyncBoundary>
  );
}

function CohortDetail({ cohortId }) {
  const { cohorts } = useServices();
  const { t, locale } = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [rangeMode, setRangeMode] = useState('month');
  const initialRange = currentMonthRange();
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const state = useAsync(async () => {
    const [cohort, roster, workspace] = await Promise.all([
      cohorts.getById(cohortId),
      cohorts.getRoster(cohortId),
      cohorts.getWorkspace(cohortId),
    ]);
    return { cohort, roster: roster ?? [], workspace: workspace ?? {} };
  }, [cohortId, locale, reloadKey]);

  return (
    <AsyncBoundary state={state}>
      {({ cohort, roster, workspace }) => {
        if (!cohort) return <NotFound onBack={() => navigate('/cohorts')} t={t} />;
        const instructors = workspace.instructors ?? [];
        const upcoming = workspace.upcomingLessons ?? [];
        const progression = workspace.progression ?? {};
        const history = workspace.attendanceHistory ?? [];
        const visibleHistory = history.filter(
          (entry) => (!from || entry.date >= from) && (!to || entry.date <= to),
        );
        const dates = unique(visibleHistory.map((entry) => entry.date)).sort();
        const byStudentDate = new Map(
          visibleHistory.map((entry) => [`${entry.studentId}:${entry.date}`, entry.status]),
        );

        const selectRangeMode = (mode) => {
          setRangeMode(mode);
          if (mode === 'month') {
            const range = currentMonthRange();
            setFrom(range.from);
            setTo(range.to);
          } else {
            setFrom(progression.startedAt || '');
            setTo(new Date().toISOString().slice(0, 10));
          }
        };

        const saveAttendance = async (entries) => {
          try {
            await cohorts.saveAttendance(cohort.id, entries);
            toast(t('cohorts.attendanceSaved'), 'success');
            setAttendanceOpen(false);
            setReloadKey((key) => key + 1);
          } catch {
            toast(t('common.error'), 'danger');
          }
        };

        const advance = async () => {
          setAdvancing(true);
          try {
            await cohorts.advance(cohort.id);
            toast(t('cohorts.advanced'), 'success');
            setAdvanceOpen(false);
            setReloadKey((key) => key + 1);
          } catch {
            toast(t('common.error'), 'danger');
          } finally {
            setAdvancing(false);
          }
        };

        return (
          <>
            <PageHeader
              title={cohort.name}
              subtitle={`${cohort.subject} · ${cohort.level} · ${cohort.room}`}
              right={
                <div className={styles.detailActions}>
                  <Button variant="outline" icon="arrowL" onClick={() => navigate('/cohorts')}>
                    {t('cohorts.back')}
                  </Button>
                  <Button variant="primary" icon="trend" onClick={() => setAdvanceOpen(true)}>
                    {t('cohorts.advanceGroup')}
                  </Button>
                </div>
              }
            />

            <section className={styles.detailHero}>
              <div className={styles.detailHeroCopy}>
                <span className={styles.eyebrow}>
                  <i style={{ background: cohort.color }} /> {t('cohorts.yourGroup')}
                </span>
                <h1>{cohort.name}</h1>
                <p>
                  {cohort.subject} · {cohort.level} · {cohort.room}
                </p>
                <div className={styles.detailStats}>
                  <span>
                    <strong className="sf-mono">{roster.length || cohort.studentCount}</strong>
                    <small>{t('cohorts.tStudents')}</small>
                  </span>
                  <span>
                    <strong
                      className="sf-mono"
                      style={{ color: attendanceTone(cohort.attendance) }}
                    >
                      {cohort.attendance}%
                    </strong>
                    <small>{t('cohorts.tAttendance')}</small>
                  </span>
                  <span>
                    <strong className="sf-mono">{progression.readiness ?? '—'}%</strong>
                    <small>{t('cohorts.readiness')}</small>
                  </span>
                </div>
              </div>
              <NextLesson lesson={workspace.nextLesson} locale={locale} t={t} />
            </section>

            <section className={styles.instructorsSection}>
              <header>
                <div>
                  <span>{t('cohorts.teachingTeam')}</span>
                  <h2>{t('cohorts.allInstructors')}</h2>
                </div>
                <small>
                  {instructors.length} {t('cohorts.instructors')}
                </small>
              </header>
              <div className={styles.instructors}>
                {instructors.map((instructor) => (
                  <article key={instructor.id} data-you={instructor.isYou ? '1' : '0'}>
                    <span className={styles.instructorAvatar}>
                      <Avatar name={instructor.name} size={48} />
                      <i data-online={instructor.online ? '1' : '0'} />
                    </span>
                    <div>
                      <strong>{instructor.name}</strong>
                      <small>{instructor.roleLabel}</small>
                    </div>
                    {instructor.isYou && <Chip tone="primary">{t('cohorts.you')}</Chip>}
                  </article>
                ))}
              </div>
            </section>

            <div className={styles.lessonGrid}>
              <LastLesson lesson={workspace.lastLesson} locale={locale} t={t} />
              <UpcomingLessons lessons={upcoming} locale={locale} t={t} />
            </div>

            <section className={styles.attendanceSection}>
              <header className={styles.attendanceHead}>
                <div>
                  <span>{t('cohorts.attendanceJournal')}</span>
                  <h2>
                    {t('cohorts.rosterTitle')} · {roster.length}
                  </h2>
                </div>
                <div className={styles.attendanceTools}>
                  <div className={styles.rangeTabs}>
                    {['month', 'level'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        data-on={rangeMode === mode ? '1' : '0'}
                        onClick={() => selectRangeMode(mode)}
                      >
                        {t(`cohorts.range.${mode}`)}
                      </button>
                    ))}
                  </div>
                  <label>
                    <span>{t('cohorts.from')}</span>
                    <input
                      type="date"
                      value={from}
                      onChange={(event) => {
                        setRangeMode('custom');
                        setFrom(event.target.value);
                      }}
                    />
                  </label>
                  <label>
                    <span>{t('cohorts.to')}</span>
                    <input
                      type="date"
                      value={to}
                      onChange={(event) => {
                        setRangeMode('custom');
                        setTo(event.target.value);
                      }}
                    />
                  </label>
                  <Button variant="primary" icon="check" onClick={() => setAttendanceOpen(true)}>
                    {t('cohorts.takeAttendance')}
                  </Button>
                </div>
              </header>
              <div className={styles.attendanceScroller}>
                <div
                  className={styles.attendanceMatrix}
                  style={{ '--date-count': Math.max(1, dates.length) }}
                >
                  <div className={styles.matrixCorner}>{t('cohorts.student')}</div>
                  {dates.map((date) => (
                    <div key={date} className={styles.dateCell}>
                      {formatShortDate(date, locale)}
                    </div>
                  ))}
                  <div className={styles.matrixSummary}>{t('cohorts.total')}</div>
                  {roster.map((student) => (
                    <AttendanceRow
                      key={student.id}
                      student={student}
                      dates={dates}
                      byStudentDate={byStudentDate}
                      t={t}
                    />
                  ))}
                </div>
                {!dates.length && (
                  <div className={styles.noAttendance}>{t('cohorts.noAttendanceRange')}</div>
                )}
              </div>
              <div className={styles.legend}>
                {['present', 'late', 'absent'].map((status) => (
                  <span key={status}>
                    <i data-status={status} />
                    {t(`cohorts.${status}`)}
                  </span>
                ))}
              </div>
            </section>

            <AttendanceModal
              open={attendanceOpen}
              onClose={() => setAttendanceOpen(false)}
              roster={roster}
              cohort={cohort}
              onSave={saveAttendance}
              t={t}
            />
            <Modal
              open={advanceOpen}
              onClose={() => setAdvanceOpen(false)}
              title={t('cohorts.advanceGroup')}
            >
              <div className={styles.advanceConfirm}>
                <span>
                  <Icon name="trend" size={24} />
                </span>
                <h3>
                  {t('cohorts.advanceTo')}{' '}
                  {displayProgression(progression.next, progression.mode, t)}
                </h3>
                <p>{t('cohorts.advanceWarning')}</p>
                <div className={styles.readinessBlock}>
                  <div>
                    <strong>{t('cohorts.readiness')}</strong>
                    <span className="sf-mono">{progression.readiness ?? 0}%</span>
                  </div>
                  <ProgressBar
                    value={progression.readiness ?? 0}
                    color={progression.eligible ? 'var(--sf-success)' : 'var(--sf-warn)'}
                  />
                </div>
                <div className={styles.modalActions}>
                  <Button variant="ghost" onClick={() => setAdvanceOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button variant="primary" icon="trend" onClick={advance} disabled={advancing}>
                    {t('cohorts.confirmAdvance')}
                  </Button>
                </div>
              </div>
            </Modal>
          </>
        );
      }}
    </AsyncBoundary>
  );
}

function NextLesson({ lesson, locale, t }) {
  if (!lesson)
    return (
      <article className={styles.nextLesson}>
        <span>{t('cohorts.nextLesson')}</span>
        <h2>{t('cohorts.noUpcoming')}</h2>
      </article>
    );
  return (
    <article className={styles.nextLesson}>
      <header>
        <span>{t('cohorts.nextLesson')}</span>
        <Chip tone="primary">{lesson.typeLabel}</Chip>
      </header>
      <h2>{lesson.title}</h2>
      <time>{formatDateTime(lesson.startsAt, locale)}</time>
      <div>
        <span>
          <Icon name="user" size={14} /> {lesson.teacherName}
        </span>
        <span>
          <Icon name="pin" size={14} /> {lesson.room}
        </span>
      </div>
    </article>
  );
}

function LastLesson({ lesson, locale, t }) {
  return (
    <article className={styles.lessonCard}>
      <header>
        <span>
          <Icon name="refresh" size={16} />
        </span>
        <div>
          <small>{t('cohorts.lastLesson')}</small>
          <h2>{lesson?.title || '—'}</h2>
        </div>
      </header>
      {lesson && (
        <>
          <div className={styles.lessonMeta}>
            <span>{formatDateTime(lesson.startsAt, locale)}</span>
            <Chip tone="neutral">{lesson.typeLabel}</Chip>
            <span>{lesson.teacherName}</span>
          </div>
          <div className={styles.homework}>
            <span>
              <Icon name="book" size={18} />
            </span>
            <div>
              <small>{t('cohorts.lastHomework')}</small>
              <strong>{lesson.homework?.title || t('cohorts.noHomework')}</strong>
              <em>
                {lesson.homework
                  ? `${lesson.homework.submitted}/${lesson.homework.total} ${t('cohorts.submitted')} · ${formatDateTime(lesson.homework.dueAt, locale)}`
                  : ''}
              </em>
            </div>
          </div>
        </>
      )}
    </article>
  );
}

function UpcomingLessons({ lessons, locale, t }) {
  return (
    <article className={styles.lessonCard}>
      <header>
        <span>
          <Icon name="cal" size={16} />
        </span>
        <div>
          <small>{t('cohorts.schedule')}</small>
          <h2>{t('cohorts.upcomingLessons')}</h2>
        </div>
      </header>
      <div className={styles.lessonTimeline}>
        {lessons.map((lesson, index) => (
          <div key={lesson.id}>
            <span className="sf-mono">{String(index + 1).padStart(2, '0')}</span>
            <i />
            <div>
              <strong>{lesson.title}</strong>
              <small>
                {formatDateTime(lesson.startsAt, locale)} · {lesson.typeLabel}
              </small>
              <em>{lesson.teacherName}</em>
            </div>
          </div>
        ))}
        {!lessons.length && <p>{t('cohorts.noUpcoming')}</p>}
      </div>
    </article>
  );
}

function AttendanceRow({ student, dates, byStudentDate, t }) {
  const presentCount = dates.filter(
    (date) => byStudentDate.get(`${student.id}:${date}`) === 'present',
  ).length;
  const markedCount = dates.filter((date) => byStudentDate.has(`${student.id}:${date}`)).length;
  const percent = markedCount ? Math.round((presentCount / markedCount) * 100) : student.attendance;
  return (
    <>
      <div className={styles.matrixStudent}>
        <Avatar name={student.name} size={34} />
        <span>
          <strong>{student.name}</strong>
          <small>{student.studentId}</small>
        </span>
      </div>
      {dates.map((date) => {
        const status = byStudentDate.get(`${student.id}:${date}`);
        return (
          <div key={date} className={styles.statusCell}>
            <span data-status={status || 'none'} aria-label={status ? t(`cohorts.${status}`) : '—'}>
              {status === 'present'
                ? 'P'
                : status === 'late'
                  ? 'L'
                  : status === 'absent'
                    ? 'A'
                    : '—'}
            </span>
          </div>
        );
      })}
      <div className={styles.matrixPercent} style={{ color: attendanceTone(percent) }}>
        {percent}%
      </div>
    </>
  );
}

function AttendanceModal({ open, onClose, roster, cohort, onSave, t }) {
  const [present, setPresent] = useState({});
  useEffect(() => {
    if (open) setPresent({});
  }, [open, cohort?.id]);
  const presentCount = roster.filter((student) => present[student.id] !== false).length;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${cohort.name} · ${t('cohorts.takeAttendance')}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            icon="check"
            onClick={() =>
              onSave(
                roster.map((student) => ({
                  studentId: student.id,
                  present: present[student.id] !== false,
                })),
              )
            }
          >
            {presentCount}/{roster.length}
          </Button>
        </>
      }
    >
      <div className={styles.attendanceModalList}>
        {roster.map((student) => {
          const isPresent = present[student.id] !== false;
          return (
            <button
              key={student.id}
              type="button"
              data-present={isPresent ? '1' : '0'}
              onClick={() => setPresent((current) => ({ ...current, [student.id]: !isPresent }))}
            >
              <span>
                <Icon name={isPresent ? 'check' : 'x'} size={13} />
              </span>
              <Avatar name={student.name} size={36} />
              <strong>{student.name}</strong>
              <small>{t(isPresent ? 'cohorts.present' : 'cohorts.absent')}</small>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function NotFound({ onBack, t }) {
  return (
    <section className={styles.emptyState}>
      <Icon name="cohort" size={28} />
      <h2>{t('cohorts.emptyTitle')}</h2>
      <Button variant="outline" icon="arrowL" onClick={onBack}>
        {t('cohorts.back')}
      </Button>
    </section>
  );
}

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const local = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { from: local(from), to: local(to) };
}

function formatShortDate(value, locale) {
  return new Intl.DateTimeFormat(localeCode(locale), { day: '2-digit', month: 'short' }).format(
    new Date(`${value}T12:00:00`),
  );
}

function formatDateTime(value, locale) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(localeCode(locale), {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function localeCode(locale) {
  return locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US';
}

function displayProgression(value, mode, t) {
  return mode === 'month' ? `${t('cohorts.month')} ${value}` : value || '—';
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}
