import type { AuthContext } from '../../http/plugins/auth';
import { loc, type Localized, type MaybeLocalized } from '../../shared/locale';
import type { AccountService } from '../account/account.service';
import type { CardsService } from '../cards/cards.service';
import type { CohortService } from '../cohorts/cohort.service';
import type { MgmtService } from '../mgmt/mgmt.service';
import type { PrintService } from '../print/print.service';
import type { SurveyService } from '../surveys/survey.service';
import type { TaskService } from '../tasks/task.service';
import type { ActivityEvent, AtRiskStudent, IncomingMgmtMessage } from './dashboard.repository';
import type { DashboardRepository } from './dashboard.repository';
import { dateLabel } from './dateLabel';

/** The set of domain services + repo the dashboard aggregator composes. */
export interface DashboardDeps {
  repo: DashboardRepository;
  cohorts: CohortService;
  cards: CardsService;
  tasks: TaskService;
  surveys: SurveyService;
  print: PrintService;
  mgmt: MgmtService;
  account: AccountService;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Survey-banner answered-count display is not derivable from one teacher's view; constant. */
const SURVEY_ANSWERED_LABEL = loc('javob berildi', 'ответили', 'answered');

/**
 * Today-page aggregator. It owns no persistence of its own beyond the raw
 * aggregates in `DashboardRepository`; everything else is composed from the
 * existing domain services (cards/tasks/surveys/print/mgmt/cohorts/account) so
 * there is a single source of truth per domain and no duplicated queries.
 *
 * Computed vs. constant: stats, meta.summary, the survey banner counts, the AI
 * insight quote, the mgmt mention, the spotlight and the activity feed are all
 * derived from rows. The schedule's non-lesson rows (lunch / prep) and a handful
 * of pure display labels (hero room copy, AI chips) have no row source and are
 * localized constants — see `realVsConstant` in the integration notes.
 */
export class DashboardService {
  constructor(
    private readonly deps: {
      repo: DashboardRepository;
      cohorts: CohortService;
      cards: CardsService;
      tasks: TaskService;
      surveys: SurveyService;
      print: PrintService;
      mgmt: MgmtService;
      account: AccountService;
    },
  ) {}

  async getToday(ctx: AuthContext) {
    if (ctx.roleKey !== 'teacher') return this.getStaffToday(ctx);

    const now = new Date();
    const dayStart = startOfDay(now);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const weekAgo = new Date(now.getTime() - WEEK_MS);

    const { repo } = this.deps;

    const [
      teacher,
      cohorts,
      recentCards,
      tasks,
      activeSurveys,
      printJobs,
      todayKinds,
      pendingCount,
      lessonsToday,
      avgAttendance,
      atRisk,
      incoming,
      activityEvents,
    ] = await Promise.all([
      this.deps.account.getTeacher(ctx),
      this.deps.cohorts.list(ctx),
      this.deps.cards.listRecent(ctx),
      this.deps.tasks.list(ctx),
      this.deps.surveys.listActive(ctx),
      this.deps.print.listJobs(ctx),
      repo.cardKindCountsBetween(ctx.academyId, ctx.teacherId, dayStart, dayEnd),
      repo.pendingTaskCount(ctx.academyId),
      repo.todaysLessonCount(ctx.teacherId, dayStart, dayEnd),
      repo.averageAttendance(ctx.teacherId),
      repo.topAtRiskStudent(ctx.academyId, weekAgo),
      repo.latestIncomingMessage(ctx.academyId, ctx.teacherId),
      repo.recentActivity(ctx.academyId, ctx.teacherId, 4),
    ]);

    const pendingTasks = this.buildPendingTasks(tasks);

    return {
      meta: this.buildMeta(teacher, cohorts, todayKinds, now),
      surveyBanner: this.buildSurveyBanner(activeSurveys),
      stats: this.buildStats({
        lessonsToday,
        cohortCount: cohorts.length,
        avgAttendance,
        todayKinds,
        pendingCount,
      }),
      heroLesson: this.buildHeroLesson(cohorts),
      schedule: this.buildSchedule(cohorts),
      recentCards,
      pendingTasks,
      aiInsight: this.buildAiInsight(atRisk),
      printQueue: this.buildPrintQueue(printJobs),
      mgmtMention: this.buildMgmtMention(incoming),
      spotlight: this.buildSpotlight(cohorts),
      activity: this.buildActivity(activityEvents),
    };
  }

  /**
   * Non-teaching staff must not receive a teacher dashboard with fabricated
   * attendance and lesson data. Their landing page is a role-neutral work
   * overview assembled from the real task/account domains instead.
   */
  private async getStaffToday(ctx: AuthContext) {
    const now = new Date();
    const [teacher, tasks] = await Promise.all([
      this.deps.account.getTeacher(ctx),
      this.deps.tasks.list(ctx),
    ]);
    const pending = tasks.filter((task) => task.state !== 'done');
    const mine = pending.filter((task) => task.mine);
    const urgent = pending.filter((task) => task.urgent);
    const management = pending.filter((task) => task.fromMgmt);

    return {
      workspaceMode: 'staff',
      meta: {
        dateLabel: dateLabel(now),
        greetingName: teacher.name,
        summary: loc(
          `${pending.length} ochiq vazifa · ${mine.length} sizniki`,
          `${pending.length} открытых задач · ${mine.length} ваших`,
          `${pending.length} open tasks · ${mine.length} assigned to you`,
        ),
      },
      surveyBanner: null,
      stats: [
        {
          value: String(pending.length),
          label: loc('Ochiq vazifalar', 'Открытые задачи', 'Open tasks'),
          color: 'var(--sf-primary)',
        },
        {
          value: String(mine.length),
          label: loc('Mening vazifalarim', 'Мои задачи', 'My tasks'),
          color: 'var(--sf-accent)',
        },
        {
          value: String(urgent.length),
          label: loc('Shoshilinch', 'Срочные', 'Urgent'),
          color: 'var(--sf-danger)',
        },
        {
          value: String(management.length),
          label: loc('Boshqaruvdan', 'От руководства', 'From management'),
          color: 'var(--sf-success)',
        },
      ],
      performance: {},
      heroLesson: { available: false, kind: 'staff', start: '—' },
      schedule: [],
      recentCards: [],
      pendingTasks: this.buildPendingTasks(tasks),
      aiInsight: null,
      printQueue: [],
      mgmtMention: null,
      spotlight: null,
      activity: [],
    };
  }

  // -- meta -------------------------------------------------------------------

  private buildMeta(
    teacher: Awaited<ReturnType<AccountService['getTeacher']>>,
    cohorts: Awaited<ReturnType<CohortService['list']>>,
    todayKinds: { up: number; down: number },
    now: Date,
  ) {
    const groups = cohorts.length;
    const lessons = teacher.summary.lessonsPerWeek;
    return {
      dateLabel: dateLabel(now),
      // Teacher name is plain user text; the header renders it directly.
      greetingName: teacher.name,
      summary: loc(
        `${groups} guruh · ${lessons} ta dars · ${todayKinds.up} ta Up karta berildi`,
        `${groups} групп · ${lessons} уроков · выдано ${todayKinds.up} Up карт`,
        `${groups} groups · ${lessons} lessons · ${todayKinds.up} Up cards given`,
      ),
    };
  }

  // -- survey banner ----------------------------------------------------------

  private buildSurveyBanner(activeSurveys: Awaited<ReturnType<SurveyService['listActive']>>) {
    const survey = activeSurveys[0];
    if (!survey) return null; // no active survey -> frontend can hide the banner
    return {
      remaining: survey.remaining, // localized, computed by SurveyService
      title: survey.title, // localized
      // We can honestly surface this teacher's own progress; an academy-wide
      // "4/12 answered" tally is not visible from a single teacher's context.
      meta: loc(
        `${survey.progress}% ${SURVEY_ANSWERED_LABEL.uz}`,
        `${survey.progress}% ${SURVEY_ANSWERED_LABEL.ru}`,
        `${survey.progress}% ${SURVEY_ANSWERED_LABEL.en}`,
      ),
    };
  }

  // -- stats ------------------------------------------------------------------

  private buildStats(input: {
    lessonsToday: number;
    cohortCount: number;
    avgAttendance: number;
    todayKinds: { up: number; down: number };
    pendingCount: number;
  }) {
    const { lessonsToday, cohortCount, avgAttendance, todayKinds, pendingCount } = input;
    return [
      {
        value: String(lessonsToday),
        unit: `/ ${cohortCount}`,
        label: loc('Bugungi darslar', 'Уроки сегодня', "Today's lessons"),
      },
      {
        value: String(avgAttendance),
        unit: '%',
        label: loc('O‘rta davomat', 'Ср. посещаемость', 'Avg attendance'),
        color: 'var(--sf-success)',
      },
      {
        value: `↑${todayKinds.up}`,
        label: loc('Up kartalar', 'Up карты', 'Up cards'),
        color: '#7a4f0e',
        trend: { up: true, value: loc('bugun', 'сегодня', 'today') },
      },
      {
        value: `↓${todayKinds.down}`,
        label: loc('Down kartalar', 'Down карты', 'Down cards'),
        color: 'var(--sf-danger)',
      },
      {
        value: String(input.pendingCount),
        label: loc('Vazifa kutmoqda', 'Ожидают задачи', 'Tasks pending'),
        color: 'var(--sf-primary)',
      },
    ];
  }

  // -- hero lesson ------------------------------------------------------------

  private buildHeroLesson(cohorts: Awaited<ReturnType<CohortService['list']>>) {
    // The "next lesson" is the cohort with the soonest upcoming `next` label.
    // Cohorts already carry the localized `next`/`room`/`level` leaves; we pick
    // the first one as the hero subject (the seed orders them by lesson time).
    const hero = cohorts[0];
    return {
      eyebrow: loc('Keyingi dars', 'Следующий урок', 'Next lesson'),
      title: hero?.name ?? '', // plain cohort name, e.g. "9-B Algebra"
      titleAccent: hero?.level ?? loc('—', '—', '—'), // localized level
      sub: hero?.room ?? loc('—', '—', '—'), // localized room/location line
      // The next-lesson label is localized + computed by CohortService.
      start: hero?.next ?? loc('—', '—', '—'),
      end: '',
    };
  }

  // -- schedule ---------------------------------------------------------------

  private buildSchedule(cohorts: Awaited<ReturnType<CohortService['list']>>) {
    // One schedule row per cohort with a known next-lesson label (computed), plus
    // a constant lunch break that has no row source. `state` marks the first row
    // as "now" for the rail styling.
    const rows: Array<{
      time: unknown;
      label: unknown;
      room: unknown;
      state?: string;
    }> = cohorts.map((c, i) => ({
      time: c.next ?? loc('—', '—', '—'),
      label: c.name,
      room: c.room,
      ...(i === 0 ? { state: 'now' } : i === 1 ? { state: 'next' } : {}),
    }));
    rows.push({
      time: '14:00',
      label: loc('Tushlik tanaffus', 'Обеденный перерыв', 'Lunch break'),
      room: '',
      state: 'gap',
    });
    return rows;
  }

  // -- pending tasks ----------------------------------------------------------

  private buildPendingTasks(tasks: Awaited<ReturnType<TaskService['list']>>) {
    return tasks
      .filter((t) => t.state !== 'done')
      .map((t) => ({
        id: t.id, // REAL task id so the dashboard checkbox can target it
        title: t.title, // localized
        priority: t.priority,
        deadline: t.deadline, // localized OR plain string
        urgent: t.urgent,
        fromMgmt: t.fromMgmt,
        project: t.project, // localized OR null
        projectColor: t.projectColor,
      }));
  }

  // -- AI insight -------------------------------------------------------------

  private buildAiInsight(atRisk: AtRiskStudent | null) {
    const quote = atRisk ? riskQuote(atRisk) : noRiskQuote();
    return {
      eyebrow: loc('Bugungi tavsiya', 'Совет на сегодня', "Today's tip"),
      count: loc('1 dona', '1 шт', '1 item'),
      quote,
      // No per-teacher data source for these action chips — localized constants.
      chips: [
        loc('Ota-onaga xat tayyor', 'Письмо родителю готово', 'Parent letter ready'),
        loc('Konsultatsiya rejasi', 'План консультации', 'Consultation plan'),
      ],
    };
  }

  // -- print queue ------------------------------------------------------------

  private buildPrintQueue(jobs: Awaited<ReturnType<PrintService['listJobs']>>) {
    return jobs.map((j) => ({
      id: j.id,
      doc: j.doc, // localized OR plain
      copies: j.copies,
      // `sub` = "<printer> · <size>" line; printer is plain, size may be localized.
      sub: j.printer,
      progress: j.progress,
      eta: j.eta, // localized, computed by PrintService
      icon: j.icon,
      tone: j.state === 'now' ? 'primary' : 'accent',
      label: j.state === 'now' ? loc('Chop', 'Печать', 'Print') : loc('Navbat', 'Очередь', 'Queue'),
    }));
  }

  // -- mgmt mention -----------------------------------------------------------

  private buildMgmtMention(incoming: IncomingMgmtMessage | null) {
    if (!incoming) return null;
    return {
      name: incoming.thread.name, // mixed (plain name for people threads)
      role: incoming.thread.role ?? loc('—', '—', '—'), // localized
      message: (incoming.text as MaybeLocalized | null) ?? '', // mixed
      time: hhmm(incoming.createdAt),
    };
  }

  // -- spotlight --------------------------------------------------------------

  private buildSpotlight(cohorts: Awaited<ReturnType<CohortService['list']>>) {
    // Pick the strongest cohort (highest attendance) to spotlight; all figures
    // come straight from CohortService's computed metrics.
    const cohort = [...cohorts].sort((a, b) => b.attendance - a.attendance)[0];
    if (!cohort) return null;
    const tone =
      cohort.attendance >= 90 ? 'success' : cohort.attendance >= 75 ? 'accent' : 'danger';
    const toneLabel =
      tone === 'success'
        ? loc('Yaxshi', 'Хорошо', 'Good')
        : tone === 'accent'
          ? loc('O‘rtacha', 'Средне', 'Average')
          : loc('Diqqat', 'Внимание', 'Attention');
    return {
      name: cohort.name, // plain
      sub: cohort.level, // localized
      tone,
      toneLabel,
      stats: [
        {
          value: `${cohort.attendance}%`,
          label: loc('Davomat', 'Посещ.', 'Attend.'),
          color: 'var(--sf-success)',
        },
        { value: `↑${cohort.up}`, label: 'Up', color: '#7a4f0e' },
        { value: `↓${cohort.down}`, label: 'Down', color: 'var(--sf-danger)' },
      ],
    };
  }

  // -- activity ---------------------------------------------------------------

  private buildActivity(events: ActivityEvent[]) {
    const you = loc('Siz', 'Вы', 'You');
    return events.map((e) => {
      if (e.kind === 'card') {
        const recipient = e.card.student?.name ?? '';
        const typeName = e.card.cardType.name as Localized;
        return {
          who: you,
          what: loc(
            `${recipient} ga ${typeName.uz} berdingiz`,
            `выдали ${typeName.ru} ${recipient}`,
            `gave ${typeName.en} to ${recipient}`,
          ),
          time: hhmm(e.at),
          icon: 'brand',
          color: 'var(--sf-accent)',
        };
      }
      return {
        who: you,
        what: loc('davomatni saqladingiz', 'сохранили посещаемость', 'saved attendance'),
        time: hhmm(e.at),
        icon: 'check',
        color: 'var(--sf-success)',
      };
    });
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function startOfDay(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Localized AI quote naming the at-risk student and their down-card tally. */
function riskQuote(r: AtRiskStudent): Localized {
  const name = r.student.name;
  return loc(
    `“${name}ga oxirgi haftada ${r.down} ta Down karta berildi. Ota-ona bilan suhbat tavsiya etiladi.”`,
    `«${name} за последнюю неделю получил ${r.down} Down-карт. Рекомендуется беседа с родителем.»`,
    `“${name} received ${r.down} Down cards this week. A talk with the parent is recommended.”`,
  );
}

/** Fallback quote when no student is at risk this week. */
function noRiskQuote(): Localized {
  return loc(
    '“Bu hafta xavf ostidagi o‘quvchilar yo‘q. Ajoyib natija!”',
    '«На этой неделе учеников в зоне риска нет. Отличный результат!»',
    '“No at-risk students this week. Great work!”',
  );
}
