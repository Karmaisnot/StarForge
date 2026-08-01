import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import { Avatar, AiBadge, Button, Card, Chip, Icon, ProgressBar, StarMark } from '@/ui';
import { slotRailColor } from '@/domain/models/lesson.js';
import { priorityColor } from '@/domain/models/task.js';
import { useToday } from '@/hooks/data.js';
import { useToast } from '@/hooks/useToast.js';
import { useT } from '@/hooks/useT.js';
import { readDashboardHiddenWidgets } from './dashboardPreferences.js';
import styles from './today.module.css';

const METRIC_ICONS = ['cal', 'cohort', 'brand', 'flag', 'check'];

export function TodayPage() {
  const navigate = useNavigate();
  const { t, locale } = useT();
  const toast = useToast();
  const [range, setRange] = useState('7d');
  const state = useToday(range);
  const [hidden] = useState(readDashboardHiddenWidgets);
  const [doneTasks, setDoneTasks] = useState({});
  const show = (key) => !hidden[key];
  const toggleTask = (key) => {
    setDoneTasks((current) => ({ ...current, [key]: !current[key] }));
    toast(doneTasks[key] ? t('today.taskUndone') : t('today.taskDone'));
  };

  return (
    <AsyncBoundary state={state}>
      {(data) => {
        const performance = normalizePerformance(data.performance);
        const staffMode = data.workspaceMode === 'staff';

        return (
          <>
            <PageHeader
              eyebrow={`${t('today.commandCenter')} · ${data.meta.dateLabel}`}
              title={
                <>
                  {t('today.greeting')} <span className="sf-serif">{data.meta.greetingName}</span>
                </>
              }
              subtitle={data.meta.summary}
            />

            {data.surveyBanner && (
              <SurveyBanner data={data.surveyBanner} t={t} onOpen={() => navigate('/surveys')} />
            )}

            <div className={`${styles.commandGrid} ${staffMode ? styles.singleCommand : ''}`}>
              <NextLesson lesson={data.heroLesson} t={t} navigate={navigate} />
              {!staffMode && <RankCard rank={performance.rank} t={t} />}
            </div>

            <section className={styles.performanceSection} aria-labelledby="performance-heading">
              <SectionHeading
                id="performance-heading"
                eyebrow={t('today.performanceOverview')}
                title={t(staffMode ? 'today.staffOverview' : 'today.teacherPerformance')}
                meta={
                  performance.updatedAt
                    ? `${t('today.updated')} · ${performance.updatedAt}`
                    : undefined
                }
                action={
                  !staffMode && (
                    <div className={styles.rangeControl} aria-label={t('today.attendanceTrend')}>
                      {['7d', '30d', 'term'].map((value) => (
                        <button
                          key={value}
                          type="button"
                          data-active={range === value ? '1' : '0'}
                          onClick={() => setRange(value)}
                        >
                          {value === 'term' ? 'Term' : value.replace('d', 'D')}
                        </button>
                      ))}
                    </div>
                  )
                }
              />

              <div className={styles.metricGrid}>
                {data.stats.map((metric, index) => (
                  <MetricCard
                    key={`${metric.label}-${index}`}
                    metric={metric}
                    icon={METRIC_ICONS[index % METRIC_ICONS.length]}
                    index={index}
                    onOpen={() =>
                      navigate(
                        ['/work', '/cohorts', '/cohorts', '/surveys', '/tasks'][index] ?? '/today',
                      )
                    }
                  />
                ))}
              </div>

              {!staffMode && (
                <div className={styles.analyticsGrid}>
                  <DashboardPanel
                    className={styles.trendPanel}
                    title={t('today.attendanceTrend')}
                    subtitle={t('today.attendanceTrendSub')}
                  >
                    <AttendanceChart
                      points={performance.attendanceTrend}
                      emptyLabel={t('today.noPerformanceData')}
                      onSelect={(point) =>
                        navigate(`/academic?tab=insights&date=${encodeURIComponent(point.label)}`)
                      }
                    />
                  </DashboardPanel>

                  <DashboardPanel
                    title={t('today.teachingLoad')}
                    subtitle={t('today.teachingLoadSub')}
                  >
                    <TeachingLoadChart
                      points={performance.weeklyLoad}
                      unit={t('today.lessonsShort')}
                      emptyLabel={t('today.noPerformanceData')}
                      onSelect={(point) => navigate(`/work?day=${encodeURIComponent(point.label)}`)}
                    />
                  </DashboardPanel>

                  <DashboardPanel
                    title={t('today.scoreBreakdown')}
                    subtitle={t('today.scoreBreakdownSub')}
                  >
                    <ScoreBreakdown
                      rows={performance.scoreBreakdown}
                      targetLabel={t('today.target')}
                      emptyLabel={t('today.noPerformanceData')}
                      onSelect={(row) =>
                        navigate(`/academic?tab=insights&metric=${encodeURIComponent(row.label)}`)
                      }
                    />
                  </DashboardPanel>

                  <DashboardPanel
                    title={t('today.groupHealth')}
                    subtitle={t('today.groupHealthSub')}
                  >
                    <GroupHealth
                      groups={performance.groupHealth}
                      t={t}
                      onOpen={(group) => navigate(group.id ? `/cohorts/${group.id}` : '/cohorts')}
                    />
                  </DashboardPanel>
                </div>
              )}
            </section>

            <section className={styles.operationsSection} aria-labelledby="operations-heading">
              <SectionHeading
                id="operations-heading"
                eyebrow={data.meta.dateLabel}
                title={t('today.todayOperations')}
              />

              <div className={styles.operationsGrid}>
                <div className={styles.primaryFlow}>
                  {!staffMode && show('schedule') && (
                    <ScheduleCard rows={data.schedule} t={t} onOpen={() => navigate('/cohorts')} />
                  )}
                  {show('pendingTasks') && (
                    <TasksCard
                      tasks={data.pendingTasks}
                      doneTasks={doneTasks}
                      onToggle={toggleTask}
                      t={t}
                      onOpen={() => navigate('/tasks')}
                    />
                  )}
                </div>

                <aside className={styles.contextFlow}>
                  {!staffMode && data.aiInsight && (
                    <AiInsight insight={data.aiInsight} t={t} onOpen={() => navigate('/ai')} />
                  )}

                  {show('activity') && data.activity?.length > 0 && (
                    <ActivityCard items={data.activity} t={t} />
                  )}

                  {data.mgmtMention?.message && (
                    <ManagementCard
                      mention={data.mgmtMention}
                      onOpen={() => navigate('/messages?scope=management')}
                    />
                  )}

                  {!staffMode && show('spotlight') && data.spotlight && (
                    <SpotlightCard
                      spotlight={data.spotlight}
                      t={t}
                      onOpen={() => navigate('/cohorts')}
                    />
                  )}

                  {show('printQueue') && data.printQueue?.length > 0 && (
                    <PrintQueue jobs={data.printQueue} t={t} onOpen={() => navigate('/print')} />
                  )}
                </aside>
              </div>
            </section>

            {!staffMode && (
              <AiActionCenter
                data={data}
                performance={performance}
                locale={locale}
                navigate={navigate}
              />
            )}
          </>
        );
      }}
    </AsyncBoundary>
  );
}

function SurveyBanner({ data, t, onOpen }) {
  return (
    <button type="button" className={styles.surveyBanner} onClick={onOpen}>
      <span className={styles.surveySignal} aria-hidden="true" />
      <span className={styles.surveyCopy}>
        <span className={styles.surveyEyebrow}>
          {t('today.surveyWord')} · {data.remaining}
        </span>
        <strong>{data.title}</strong>
        <span>{data.meta}</span>
      </span>
      <span className={styles.surveyAction}>
        {t('common.continue')}
        <Icon name="arrowR" size={15} />
      </span>
    </button>
  );
}

function NextLesson({ lesson, t, navigate }) {
  const hasLesson = lesson?.available !== false && lesson?.start && lesson.start !== '—';
  const staffClear = lesson?.kind === 'staff';
  if (!hasLesson) {
    return (
      <section className={`${styles.lessonHero} ${styles.restHero}`}>
        <StarMark size={250} color="var(--sf-primary)" className={styles.lessonStar} />
        <div className={styles.lessonTopline}>
          <span>{t(staffClear ? 'today.dayClearStaff' : 'today.dayClear')}</span>
          <span className={styles.restBadge}>
            <Icon name="sun" size={13} /> {t('today.restStatus')}
          </span>
        </div>
        <div className={styles.restCopy}>
          <span className={styles.restMark}>
            <Icon name="check" size={22} />
          </span>
          <h2>{t(staffClear ? 'today.restTitleStaff' : 'today.restTitle')}</h2>
          <p>{t(staffClear ? 'today.restBodyStaff' : 'today.restBody')}</p>
        </div>
      </section>
    );
  }

  const isMeeting = lesson.kind === 'meeting';

  return (
    <section className={styles.lessonHero}>
      <StarMark size={250} color="#fffcf5" className={styles.lessonStar} />
      <div className={styles.lessonTopline}>
        <span>{lesson.eyebrow}</span>
        <span className={styles.liveBadge}>
          <span aria-hidden="true" /> {t(isMeeting ? 'today.upcoming' : 'today.now')}
        </span>
      </div>
      <div className={styles.lessonMain}>
        <div>
          <h2>
            {lesson.title} <span className="sf-serif">{lesson.titleAccent}</span>
          </h2>
          <p>{lesson.sub}</p>
        </div>
        <div className={styles.lessonTime}>
          <strong>{lesson.start}</strong>
          <span>{lesson.end}</span>
        </div>
      </div>
      <div className={styles.lessonActions}>
        {isMeeting ? (
          <>
            <Button variant="cream" icon="cal" onClick={() => navigate('/work')}>
              {t('today.viewWork')}
            </Button>
            <Button variant="cream-ghost" icon="chat" onClick={() => navigate('/messages')}>
              {t('nav.messages')}
            </Button>
          </>
        ) : (
          <>
            <Button variant="cream" icon="check" onClick={() => navigate('/cohorts')}>
              {t('today.takeAttendance')}
            </Button>
            <Button variant="cream-ghost" icon="book" onClick={() => navigate('/materials')}>
              {t('today.lessonPlan')}
            </Button>
            <Button variant="cream-ghost" icon="folder" onClick={() => navigate('/materials')}>
              {t('today.materials')}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

function RankCard({ rank, t }) {
  const hasRank = rank.position > 0 && rank.total > 0;
  return (
    <section className={styles.rankCard}>
      <div className={styles.rankHeader}>
        <div>
          <span className={styles.panelEyebrow}>{t('today.branchRank')}</span>
          <h2>{t('today.performanceScore')}</h2>
        </div>
        {rank.percentile && <Chip tone="accent">{rank.percentile}</Chip>}
      </div>

      {hasRank ? (
        <>
          <div className={styles.rankMain}>
            <ScoreRing value={rank.score} />
            <div className={styles.rankPosition}>
              <span className="sf-mono">#{rank.position}</span>
              <small>/ {rank.total}</small>
            </div>
          </div>
          <div className={styles.rankSignals}>
            <div>
              <Icon name="trend" size={14} />
              <strong>+{rank.change}</strong>
              <span>{t('today.placesThisMonth')}</span>
            </div>
            <div>
              <Icon name="flag" size={14} />
              <strong>{rank.nextGap}</strong>
              <span>{t('today.pointsToNext')}</span>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.emptyPerformance}>{t('today.noPerformanceData')}</div>
      )}
    </section>
  );
}

function ScoreRing({ value }) {
  const safeValue = clamp(value, 0, 100);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - safeValue / 100);
  return (
    <div className={styles.scoreRing}>
      <svg viewBox="0 0 100 100" role="img" aria-label={`${safeValue}%`}>
        <circle className={styles.scoreTrack} cx="50" cy="50" r={radius} />
        <circle
          className={styles.scoreValue}
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <strong className="sf-mono">{safeValue}</strong>
      <span>/ 100</span>
    </div>
  );
}

function SectionHeading({ id, eyebrow, title, meta, action }) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <span>{eyebrow}</span>
        <h2 id={id}>{title}</h2>
      </div>
      <div className={styles.sectionTools}>
        {meta && <small className="sf-mono">{meta}</small>}
        {action}
      </div>
    </div>
  );
}

function MetricCard({ metric, icon, index, onOpen }) {
  return (
    <button
      type="button"
      className={styles.metricCard}
      style={{ '--metric-index': index }}
      onClick={onOpen}
    >
      <div className={styles.metricTop}>
        <span className={styles.metricIcon}>
          <Icon name={icon} size={15} />
        </span>
        {metric.trend && (
          <span className={metric.trend.up ? styles.metricUp : styles.metricDown}>
            {metric.trend.value}
          </span>
        )}
      </div>
      <div className={styles.metricValue} style={{ color: metric.color }}>
        <strong className="sf-mono">{metric.value}</strong>
        {metric.unit && <span>{metric.unit}</span>}
      </div>
      <p>{metric.label}</p>
      <span className={styles.metricAction}>
        <Icon name="arrowR" size={13} />
      </span>
    </button>
  );
}

function DashboardPanel({ title, subtitle, className = '', children }) {
  return (
    <section className={`${styles.dashboardPanel} ${className}`}>
      <header className={styles.panelHeader}>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function AttendanceChart({ points, emptyLabel, onSelect }) {
  const [active, setActive] = useState(Math.max(0, points.length - 1));
  if (points.length < 2) return <div className={styles.emptyPerformance}>{emptyLabel}</div>;

  const width = 680;
  const height = 230;
  const left = 38;
  const right = 16;
  const top = 18;
  const bottom = 36;
  const min = 80;
  const max = 100;
  const xStep = (width - left - right) / (points.length - 1);
  const y = (value) =>
    top + ((max - clamp(value, min, max)) / (max - min)) * (height - top - bottom);
  const coords = points.map((point, index) => [left + index * xStep, y(point.value)]);
  const path = coords
    .map(([x, pointY], index) => `${index === 0 ? 'M' : 'L'} ${x} ${pointY}`)
    .join(' ');
  const latest = points.at(-1);
  const selected = points[active] ?? latest;

  return (
    <div className={styles.lineChart}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${latest.value}%`}>
        {[80, 90, 100].map((tick) => {
          const tickY = y(tick);
          return (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={tickY} y2={tickY} />
              <text x="0" y={tickY + 4}>
                {tick}%
              </text>
            </g>
          );
        })}
        <path className={styles.trendLine} d={path} />
        {coords.map(([x, pointY], index) => (
          <g
            key={`${points[index].label}-${index}`}
            className={styles.chartPoint}
            role="button"
            tabIndex="0"
            aria-label={`${points[index].label}: ${points[index].value}%`}
            onMouseEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onClick={() => onSelect?.(points[index])}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect?.(points[index]);
              }
            }}
          >
            <circle
              className={index === active ? styles.currentPoint : ''}
              cx={x}
              cy={pointY}
              r={index === active ? 6 : 4}
            />
            {(index % 2 === 0 || index === coords.length - 1) && (
              <text className={styles.axisLabel} x={x} y={height - 10} textAnchor="middle">
                {points[index].label}
              </text>
            )}
          </g>
        ))}
      </svg>
      <button type="button" className={styles.chartCurrent} onClick={() => onSelect?.(selected)}>
        <span>{selected.label}</span>
        <strong className="sf-mono">{selected.value}%</strong>
        <Icon name="arrowR" size={12} />
      </button>
    </div>
  );
}

function TeachingLoadChart({ points, unit, emptyLabel, onSelect }) {
  if (!points.length) return <div className={styles.emptyPerformance}>{emptyLabel}</div>;
  const max = Math.max(1, ...points.map((point) => point.value));
  const total = points.reduce((sum, point) => sum + point.value, 0);
  return (
    <div className={styles.loadChart}>
      <div className={styles.loadTotal}>
        <strong className="sf-mono">{total}</strong>
        <span>{unit}</span>
      </div>
      <div className={styles.loadBars}>
        {points.map((point, index) => (
          <button
            key={`${point.label}-${index}`}
            type="button"
            className={styles.loadColumn}
            aria-label={`${point.label}: ${point.value} ${unit}`}
            onClick={() => onSelect?.(point)}
          >
            <span className="sf-mono">{point.value}</span>
            <div className={styles.loadTrack}>
              <div style={{ height: `${(point.value / max) * 100}%` }} />
            </div>
            <small>{point.label}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreBreakdown({ rows, targetLabel, emptyLabel, onSelect }) {
  if (!rows.length) return <div className={styles.emptyPerformance}>{emptyLabel}</div>;
  return (
    <div className={styles.scoreRows}>
      {rows.map((row, index) => (
        <button
          key={`${row.label}-${index}`}
          type="button"
          className={styles.scoreRow}
          onClick={() => onSelect?.(row)}
        >
          <div className={styles.scoreRowTop}>
            <span>{row.label}</span>
            <strong className="sf-mono">{row.value}%</strong>
          </div>
          <div className={styles.scoreBar}>
            <div style={{ width: `${clamp(row.value, 0, 100)}%` }} />
            <span
              style={{ left: `${clamp(row.target, 0, 100)}%` }}
              title={`${targetLabel}: ${row.target}%`}
            />
          </div>
          <small>
            {targetLabel} · {row.target}%
          </small>
        </button>
      ))}
    </div>
  );
}

function GroupHealth({ groups, t, onOpen }) {
  if (!groups.length)
    return <div className={styles.emptyPerformance}>{t('today.noPerformanceData')}</div>;
  return (
    <div className={styles.groupRows}>
      {groups.map((group) => {
        const healthy = group.attendance >= 90 && group.down <= 4;
        return (
          <button
            key={group.id ?? group.name}
            type="button"
            className={styles.groupRow}
            onClick={() => onOpen(group)}
          >
            <div className={styles.groupIdentity}>
              <span className={styles.groupMark}>
                <StarMark size={16} color="#fffcf5" />
              </span>
              <div>
                <strong>{group.name}</strong>
                <span>{healthy ? t('today.onTrack') : t('today.needsAttention')}</span>
              </div>
            </div>
            <div className={styles.groupAttendance}>
              <div>
                <span style={{ width: `${clamp(group.attendance, 0, 100)}%` }} />
              </div>
              <strong className="sf-mono">{group.attendance}%</strong>
            </div>
            <div className={styles.groupCards}>
              <span>↑{group.up}</span>
              <span>↓{group.down}</span>
            </div>
            <Icon name="chevR" size={14} />
          </button>
        );
      })}
    </div>
  );
}

function ScheduleCard({ rows, t, onOpen }) {
  return (
    <Card
      className={styles.operationCard}
      title={t('today.scheduleTitle')}
      padded={false}
      action={
        <TextLink onClick={onOpen}>
          {rows.length} {t('today.lessonsLink')}
        </TextLink>
      }
    >
      <div className={styles.scheduleTimeline}>
        {rows.map((row, index) => (
          <button
            key={`${row.time}-${index}`}
            type="button"
            className={styles.scheduleRow}
            onClick={onOpen}
          >
            <span className={`sf-mono ${styles.scheduleTime}`}>{row.time}</span>
            <span
              className={styles.scheduleNode}
              style={{ '--rail-color': slotRailColor(row.state) }}
            />
            <span className={styles.scheduleLabel}>
              <strong>{row.label}</strong>
              <small>{row.room}</small>
            </span>
            {row.state === 'now' && (
              <Chip tone="primary">
                {t('today.now')} · {row.mins}
              </Chip>
            )}
            {row.state === 'next' && <Chip tone="accent">{t('today.next')}</Chip>}
          </button>
        ))}
      </div>
    </Card>
  );
}

function TasksCard({ tasks, doneTasks, onToggle, t, onOpen }) {
  return (
    <Card
      className={styles.operationCard}
      title={`${t('today.pendingTitle')} · ${tasks.length}`}
      padded={false}
      action={<TextLink onClick={onOpen}>{t('today.allLink')}</TextLink>}
    >
      {tasks.map((task, index) => (
        <div key={`${task.title}-${index}`} className={styles.taskRow}>
          <span
            className={styles.taskRail}
            style={{ background: task.urgent ? 'var(--sf-danger)' : task.projectColor }}
          />
          <button
            type="button"
            className={styles.taskCheck}
            aria-label={t('tasks.toggleState')}
            aria-pressed={Boolean(doneTasks[index])}
            onClick={() => onToggle(index)}
            data-done={doneTasks[index] ? '1' : '0'}
          >
            {doneTasks[index] && <Icon name="check" size={11} stroke={3} />}
          </button>
          <div className={styles.taskBody}>
            <div className={styles.taskMeta}>
              {task.fromMgmt && <Chip tone="ink">{t('common.mgmtFull')}</Chip>}
              <span>
                <i style={{ background: task.projectColor }} />
                {task.project}
              </span>
            </div>
            <strong className={doneTasks[index] ? styles.taskDone : ''}>{task.title}</strong>
          </div>
          <span className="sf-mono" style={{ color: priorityColor(task.priority) }}>
            {task.priority}
          </span>
          <span className={`sf-mono ${task.urgent ? styles.taskUrgent : ''}`}>{task.deadline}</span>
        </div>
      ))}
    </Card>
  );
}

function AiInsight({ insight, t, onOpen }) {
  return (
    <button type="button" className={styles.aiCard} onClick={onOpen}>
      <div className={styles.aiHeader}>
        <AiBadge>{insight.eyebrow}</AiBadge>
        <span>{insight.count}</span>
      </div>
      <blockquote>{insight.quote}</blockquote>
      <div className={styles.aiChips}>
        {insight.chips.map((chip) => (
          <Chip key={chip} tone="ai">
            {chip}
          </Chip>
        ))}
      </div>
      <span className={styles.aiAction}>
        {t('today.goToChat')} <Icon name="arrowR" size={14} />
      </span>
    </button>
  );
}

const AI_CENTER_COPY = {
  en: {
    eyebrow: 'StarForge Intelligence',
    title: 'Your AI action center',
    subtitle: 'Signals grounded in today’s attendance, workload, and student activity.',
    confidence: 'confidence',
    evidence: 'Evidence',
    health: 'Support the group that needs attention',
    healthBody: 'Review attendance and plan the next intervention from the group workspace.',
    tasks: 'Clear the highest-impact tasks',
    tasksBody: 'AI grouped urgent work so you can protect teaching time.',
    insight: 'Act on the strongest student signal',
    openAi: 'Open AI Chat',
  },
  ru: {
    eyebrow: 'StarForge Intelligence',
    title: 'Центр действий AI',
    subtitle: 'Сигналы основаны на посещаемости, нагрузке и активности учеников.',
    confidence: 'уверенность',
    evidence: 'Основание',
    health: 'Поддержите группу, которой нужно внимание',
    healthBody: 'Проверьте посещаемость и запланируйте следующий шаг в группе.',
    tasks: 'Закройте самые важные задачи',
    tasksBody: 'AI собрал срочную работу, чтобы сохранить время на преподавание.',
    insight: 'Отреагируйте на самый сильный сигнал ученика',
    openAi: 'Открыть AI-чат',
  },
  uz: {
    eyebrow: 'StarForge Intelligence',
    title: 'AI amallar markazi',
    subtitle: 'Davomat, yuklama va o‘quvchi faolligiga asoslangan signallar.',
    confidence: 'ishonch',
    evidence: 'Asos',
    health: 'E’tibor kerak bo‘lgan guruhni qo‘llab-quvvatlang',
    healthBody: 'Guruhda davomatni tekshiring va keyingi yordamni rejalang.',
    tasks: 'Eng muhim vazifalarni yoping',
    tasksBody: 'AI o‘qitish vaqtini asrash uchun shoshilinch ishlarni jamladi.',
    insight: 'Eng kuchli o‘quvchi signaliga javob bering',
    openAi: 'AI chatni ochish',
  },
};

function AiActionCenter({ data, performance, locale, navigate }) {
  const copy = AI_CENTER_COPY[locale] ?? AI_CENTER_COPY.en;
  const weakest = [...performance.groupHealth].sort((a, b) => a.attendance - b.attendance)[0];
  const urgent = data.pendingTasks?.filter((task) => task.urgent).length ?? 0;
  const recommendations = [
    {
      title: copy.insight,
      body: data.aiInsight?.quote,
      evidence: data.aiInsight?.chips?.join(' · '),
      confidence: 94,
      path: '/ai',
      icon: 'ai',
    },
    {
      title: copy.health,
      body: copy.healthBody,
      evidence: weakest ? `${weakest.name} · ${weakest.attendance}%` : 'Attendance trend',
      confidence: 91,
      path: weakest?.id ? `/cohorts/${weakest.id}` : '/cohorts',
      icon: 'cohort',
    },
    {
      title: copy.tasks,
      body: copy.tasksBody,
      evidence: `${urgent} urgent · ${data.pendingTasks?.length ?? 0} total`,
      confidence: 87,
      path: '/tasks',
      icon: 'check',
    },
  ];

  return (
    <section className={styles.aiCenter} aria-labelledby="ai-action-center">
      <header className={styles.aiCenterHeader}>
        <div>
          <AiBadge>{copy.eyebrow}</AiBadge>
          <h2 id="ai-action-center">{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <Button variant="primary" icon="ai" onClick={() => navigate('/ai')}>
          {copy.openAi}
        </Button>
      </header>
      <div className={styles.aiActionsGrid}>
        {recommendations.map((item) => (
          <button
            key={item.title}
            type="button"
            className={styles.aiActionCard}
            onClick={() => navigate(item.path)}
          >
            <span className={styles.aiActionIcon}>
              <Icon name={item.icon} size={18} />
            </span>
            <span className={styles.aiActionCopy}>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
              <small>
                <b>{copy.evidence}:</b> {item.evidence}
              </small>
            </span>
            <span className={styles.confidence}>
              <b>{item.confidence}%</b>
              {copy.confidence}
            </span>
            <Icon name="arrowR" size={15} />
          </button>
        ))}
      </div>
    </section>
  );
}

function ActivityCard({ items, t }) {
  return (
    <Card className={styles.contextCard} title={t('today.activity')}>
      {items.map((item, index) => (
        <div key={`${item.who}-${index}`} className={styles.activityRow}>
          {item.who === 'AI' ? (
            <span className={styles.aiMini}>AI</span>
          ) : (
            <span
              className={styles.activityIcon}
              style={{ background: `${item.color}22`, color: item.color }}
            >
              {item.icon && <Icon name={item.icon} size={12} />}
            </span>
          )}
          <p>
            <strong>{item.who}</strong> {item.what}
          </p>
          <time className="sf-mono">{item.time}</time>
        </div>
      ))}
    </Card>
  );
}

function ManagementCard({ mention, onOpen }) {
  return (
    <button type="button" className={styles.managementCard} onClick={onOpen}>
      <Avatar name={mention.name} size={42} color="var(--sf-primary)" />
      <span className={styles.managementCopy}>
        <span>
          <strong>{mention.name}</strong>
          <Chip tone="primary">{mention.role}</Chip>
        </span>
        <small>{mention.message}</small>
      </span>
      <time className="sf-mono">{mention.time}</time>
      <span className={styles.unreadDot} aria-hidden="true" />
    </button>
  );
}

function SpotlightCard({ spotlight, t, onOpen }) {
  return (
    <Card
      className={styles.contextCard}
      title={t('today.spotlight')}
      action={<TextLink onClick={onOpen}>{t('today.change')}</TextLink>}
    >
      <button type="button" className={styles.spotlightBody} onClick={onOpen}>
        <div className={styles.spotlightHead}>
          <span className={styles.spotlightMark}>
            <StarMark size={20} color="#fffcf5" />
          </span>
          <span>
            <strong>{spotlight.name}</strong>
            <small>{spotlight.sub}</small>
          </span>
          <Chip tone={spotlight.tone}>{spotlight.toneLabel}</Chip>
        </div>
        <div className={styles.spotlightStats}>
          {spotlight.stats.map((stat, index) => (
            <span key={`${stat.label}-${index}`}>
              <strong className="sf-mono" style={{ color: stat.color }}>
                {stat.value}
              </strong>
              <small>{stat.label}</small>
            </span>
          ))}
        </div>
      </button>
    </Card>
  );
}

function PrintQueue({ jobs, t, onOpen }) {
  return (
    <Card
      className={styles.contextCard}
      title={t('today.printQueue')}
      padded={false}
      action={
        <TextLink onClick={onOpen}>
          {jobs.length} {t('today.twoLink')}
        </TextLink>
      }
    >
      {jobs.map((job) => (
        <button key={job.id} type="button" className={styles.printRow} onClick={onOpen}>
          <span className={styles.docThumb}>
            <Icon name={job.icon} size={17} />
            <i>×{job.copies}</i>
          </span>
          <span className={styles.printCopy}>
            <strong>{job.doc}</strong>
            <small>{job.sub}</small>
            {job.progress != null && <ProgressBar value={job.progress} color="var(--sf-primary)" />}
            <em>{job.eta}</em>
          </span>
          <Chip tone={job.tone}>{job.label}</Chip>
        </button>
      ))}
    </Card>
  );
}

function TextLink({ onClick, children }) {
  return (
    <button type="button" className={styles.link} onClick={onClick}>
      {children}
    </button>
  );
}

function normalizePerformance(input) {
  return {
    rank: {
      position: 0,
      total: 0,
      score: 0,
      change: 0,
      percentile: '',
      nextGap: 0,
      ...(input?.rank ?? {}),
    },
    attendanceTrend: Array.isArray(input?.attendanceTrend) ? input.attendanceTrend : [],
    weeklyLoad: Array.isArray(input?.weeklyLoad) ? input.weeklyLoad : [],
    scoreBreakdown: Array.isArray(input?.scoreBreakdown) ? input.scoreBreakdown : [],
    groupHealth: Array.isArray(input?.groupHealth) ? input.groupHealth : [],
    updatedAt: input?.updatedAt ?? '',
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}
