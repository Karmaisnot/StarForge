/**
 * Seed a coherent demo tenant. Unlike the old fixtures (whose counts were
 * mutually inconsistent), every metric the UI shows is COMPUTED from these rows,
 * so cohort up/down, roster, attendance %, stats and badges are all self-consistent.
 *
 * Idempotent: wipes the tenant's tables and re-inserts. Deterministic: no RNG,
 * so re-seeding yields identical data.
 *
 * Dev login:  username `nigora.karimova`  password `demo1234`
 */
import { PrismaClient } from '@prisma/client';
import { loc } from '../src/shared/locale';
import { hashPassword } from '../src/shared/password';
import { CardKind, StudentFlag, TaskColumnId } from '../src/domain/enums';
// Per-domain seed modules. Cards are seeded inline below because their totals
// are coupled to the cohort and student records created in this file.
import { seedTasks } from './seeds/tasks';
import { seedAi } from './seeds/ai';
import { seedPrint } from './seeds/print';
import { seedSurveys } from './seeds/surveys';
import { seedMgmt } from './seeds/mgmt';
import { seedNotifications } from './seeds/notifications';
import { seedMaterials } from './seeds/materials';
import { seedWorkspaces } from './seeds/workspaces';

const db = new PrismaClient();

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60_000);
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60_000);
const todayAt = (h: number, m: number) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

async function reset() {
  // Child-first deletion order to satisfy FKs.
  await db.accessScan.deleteMany();
  await db.workspaceState.deleteMany();
  await db.attendanceEntry.deleteMany();
  await db.attendanceRecord.deleteMany();
  await db.aiMessage.deleteMany();
  await db.aiConversation.deleteMany();
  await db.printJob.deleteMany();
  await db.libraryFile.deleteMany();
  await db.printer.deleteMany();
  await db.surveyResponse.deleteMany();
  await db.survey.deleteMany();
  await db.mgmtMessage.deleteMany();
  await db.mgmtThread.deleteMany();
  await db.notification.deleteMany();
  await db.material.deleteMany();
  await db.card.deleteMany();
  await db.cardType.deleteMany();
  await db.task.deleteMany();
  await db.project.deleteMany();
  await db.taskColumn.deleteMany();
  await db.student.deleteMany();
  await db.cohort.deleteMany();
  await db.teacherSubject.deleteMany();
  await db.aiUsage.deleteMany();
  await db.teacherPreferences.deleteMany();
  await db.authSession.deleteMany();
  await db.teacher.deleteMany();
  await db.subject.deleteMany();
  await db.branch.deleteMany();
  await db.academy.deleteMany();
}

async function main() {
  await reset();

  // --- Tenant, branch, subjects, teacher -----------------------------------
  const academy = await db.academy.create({
    data: { id: 'acad-demo', name: loc('Demo Akademiya', 'Demo Академия', 'Demo Academy') },
  });

  const branch = await db.branch.create({
    data: {
      id: 'branch-yunusobod',
      academyId: academy.id,
      name: loc(
        'Demo Akademiya · Yunusobod',
        'Demo Академия · Юнусобод',
        'Demo Academy · Yunusobod',
      ),
    },
  });

  const algebra = await db.subject.create({
    data: { academyId: academy.id, name: loc('Algebra', 'Алгебра', 'Algebra') },
  });
  const geometry = await db.subject.create({
    data: { academyId: academy.id, name: loc('Geometriya', 'Геометрия', 'Geometry') },
  });

  const demoPasswordHash = await hashPassword('demo1234');
  const teacher = await db.teacher.create({
    data: {
      id: 'teacher-nigora',
      academyId: academy.id,
      branchId: branch.id,
      name: 'Nigora Karimova',
      username: 'nigora.karimova',
      roleKey: 'teacher',
      role: loc('Matematika ustozi', 'Учитель математики', 'Mathematics teacher'),
      passwordHash: demoPasswordHash,
      subjects: {
        create: [
          { subjectId: algebra.id, position: 0 },
          { subjectId: geometry.id, position: 1 },
        ],
      },
      preferences: { create: {} }, // defaults (locale uz, palette saroy, ...)
      aiUsage: { create: { used: 4320, limit: 50000 } },
    },
  });

  // Role-native demo accounts let every role-gated workspace be exercised
  // against the same real API. All use password `demo1234`.
  const staffAccounts = [
    {
      id: 'staff-sabrina',
      name: 'Sabrina Mamatova',
      username: 'sabrina.mamatova',
      roleKey: 'cashier',
      role: loc('Kassir', 'Cashier', 'Cashier'),
    },
    {
      id: 'staff-timur',
      name: 'Timur Usmanov',
      username: 'timur.usmanov',
      roleKey: 'security',
      role: loc('Xavfsizlik xodimi', 'Security officer', 'Security officer'),
    },
    {
      id: 'staff-nilufar',
      name: 'Nilufar Rakhimova',
      username: 'nilufar.rakhimova',
      roleKey: 'registrar',
      role: loc('Royxatga oluvchi', 'Registrar', 'Registrar'),
    },
    {
      id: 'staff-kamola',
      name: 'Kamola Yuldasheva',
      username: 'kamola.yuldasheva',
      roleKey: 'librarian',
      role: loc('Kutubxonachi', 'Librarian', 'Librarian'),
    },
    {
      id: 'staff-aziz',
      name: 'Azizbek Umarov',
      username: 'azizbek.umarov',
      roleKey: 'accountant',
      role: loc('Hisobchi', 'Accountant', 'Accountant'),
    },
  ];
  await Promise.all(
    staffAccounts.map((staff) =>
      db.teacher.create({
        data: {
          ...staff,
          academyId: academy.id,
          branchId: branch.id,
          passwordHash: demoPasswordHash,
          preferences: { create: {} },
        },
      }),
    ),
  );

  // --- Task columns (static, ordered) --------------------------------------
  await db.taskColumn.createMany({
    data: [
      {
        id: TaskColumnId.TODO,
        label: loc('Bajariladi', 'К выполнению', 'To do'),
        color: 'var(--sf-muted)',
        order: 0,
      },
      {
        id: TaskColumnId.DOING,
        label: loc('Jarayonda', 'В работе', 'Doing'),
        color: 'var(--sf-primary)',
        order: 1,
      },
      {
        id: TaskColumnId.REVIEW,
        label: loc('Tekshiruv', 'Проверка', 'Review'),
        color: 'var(--sf-accent)',
        order: 2,
      },
      {
        id: TaskColumnId.DONE,
        label: loc('Tayyor', 'Готово', 'Done'),
        color: 'var(--sf-success)',
        order: 3,
      },
    ],
  });

  // --- Card types ----------------------------------------------------------
  const ct = {
    star: await db.cardType.create({
      data: {
        academyId: academy.id,
        kind: CardKind.UP,
        position: 0,
        name: loc('Yulduz karta', 'Звёздная карта', 'Star card'),
        subtitle: loc('Asosiy +', 'Основной +', 'Primary +'),
      },
    }),
    activity: await db.cardType.create({
      data: {
        academyId: academy.id,
        kind: CardKind.UP,
        position: 1,
        name: loc('Aktivlik', 'Активность', 'Activity'),
        subtitle: loc('Darsda ishtirok', 'Участие в уроке', 'Class participation'),
      },
    }),
    helper: await db.cardType.create({
      data: {
        academyId: academy.id,
        kind: CardKind.UP,
        position: 2,
        name: loc('Yordamchi', 'Помощник', 'Helper'),
        subtitle: loc('Sinfdosh yordami', 'Помощь однокласснику', 'Helping a classmate'),
      },
    }),
    tidy: await db.cardType.create({
      data: {
        academyId: academy.id,
        kind: CardKind.UP,
        position: 3,
        name: loc('Toza ish', 'Аккуратность', 'Tidy work'),
        subtitle: loc('Daftar / vazifa', 'Тетрадь / задание', 'Notebook / task'),
      },
    }),
    warning: await db.cardType.create({
      data: {
        academyId: academy.id,
        kind: CardKind.DOWN,
        position: 4,
        name: loc('Ogohlantirish', 'Предупреждение', 'Warning'),
        subtitle: loc('Asosiy −', 'Основной −', 'Primary −'),
      },
    }),
    irresp: await db.cardType.create({
      data: {
        academyId: academy.id,
        kind: CardKind.DOWN,
        position: 5,
        name: loc("Mas'uliyatsizlik", 'Безответственность', 'Irresponsibility'),
        subtitle: loc('Uy ishi · kechikish', 'Домашка · опоздание', 'Homework · lateness'),
      },
    }),
  };

  // --- Cohorts -------------------------------------------------------------
  const L2 = loc('Daraja II', 'Уровень II', 'Level II');
  const L3 = loc('Daraja III', 'Уровень III', 'Level III');

  const cohort9b = await db.cohort.create({
    data: {
      id: '9b-algebra',
      academyId: academy.id,
      teacherId: teacher.id,
      subjectId: algebra.id,
      name: '9-B Algebra',
      level: L2,
      subjectLabel: loc('Algebra', 'Алгебра', 'Algebra'),
      room: loc('Xona 304', 'Каб. 304', 'Room 304'),
      color: 'var(--sf-primary)',
      nextLabel: loc('Bugun · 09:00', 'Сегодня · 09:00', 'Today · 09:00'),
      nextAt: todayAt(9, 0),
      lessonsPerWeek: 4,
    },
  });
  const cohortMid = await db.cohort.create({
    data: {
      id: 'algebra-mid',
      academyId: academy.id,
      teacherId: teacher.id,
      subjectId: algebra.id,
      name: 'Algebra Mid',
      level: L2,
      subjectLabel: loc('Algebra', 'Алгебра', 'Algebra'),
      room: loc('Xona 304', 'Каб. 304', 'Room 304'),
      color: 'var(--sf-primary)',
      nextLabel: loc('Bugun · 10:00', 'Сегодня · 10:00', 'Today · 10:00'),
      nextAt: todayAt(10, 0),
      lessonsPerWeek: 4,
      progressionMode: 'month',
      currentMonth: 5,
    },
  });
  const cohortGeo = await db.cohort.create({
    data: {
      id: '10v-geometriya',
      academyId: academy.id,
      teacherId: teacher.id,
      subjectId: geometry.id,
      name: '10-V Geometriya',
      level: L3,
      subjectLabel: loc('Geometriya', 'Геометрия', 'Geometry'),
      room: loc('Xona 301', 'Каб. 301', 'Room 301'),
      color: 'var(--sf-accent)',
      nextLabel: loc('Bugun · 11:30', 'Сегодня · 11:30', 'Today · 11:30'),
      nextAt: todayAt(11, 30),
      lessonsPerWeek: 4,
    },
  });

  // A group may have several teacher types. The signed-in teacher remains the
  // owner while video/support teachers are visible in the same workspace.
  await db.cohortInstructor.createMany({
    data: [
      { cohortId: cohort9b.id, teacherId: teacher.id, role: 'main', position: 0 },
      { cohortId: cohort9b.id, teacherId: 'staff-sabrina', role: 'video', position: 1 },
      { cohortId: cohort9b.id, teacherId: 'staff-nilufar', role: 'support', position: 2 },
      { cohortId: cohortMid.id, teacherId: teacher.id, role: 'main', position: 0 },
      { cohortId: cohortMid.id, teacherId: 'staff-kamola', role: 'video', position: 1 },
      { cohortId: cohortMid.id, teacherId: 'staff-nilufar', role: 'support', position: 2 },
      { cohortId: cohortGeo.id, teacherId: teacher.id, role: 'main', position: 0 },
      { cohortId: cohortGeo.id, teacherId: 'staff-sabrina', role: 'video', position: 1 },
      { cohortId: cohortGeo.id, teacherId: 'staff-kamola', role: 'support', position: 2 },
    ],
  });

  // --- Students ------------------------------------------------------------
  // 9-B: the six named students from the roster fixture, with target card tallies.
  const named: Array<{
    name: string;
    code: string;
    flag: string | null;
    up: number;
    down: number;
  }> = [
    { name: 'Akbarov Akmal', code: 'DEMO-2026-00042', flag: StudentFlag.TOP, up: 8, down: 0 },
    { name: 'Azizova Madina', code: 'DEMO-2026-00043', flag: StudentFlag.TOP, up: 6, down: 0 },
    { name: 'Bakirov Sherzod', code: 'DEMO-2026-00044', flag: null, up: 2, down: 2 },
    { name: 'Davronova Sevinch', code: 'DEMO-2026-00045', flag: null, up: 4, down: 0 },
    { name: 'Eshmatov Otabek', code: 'DEMO-2026-00046', flag: StudentFlag.WARN, up: 1, down: 4 },
    { name: 'Halimova Zilola', code: 'DEMO-2026-00047', flag: StudentFlag.TOP, up: 7, down: 0 },
  ];
  const s9b = [];
  for (let i = 0; i < named.length; i++) {
    const n = named[i]!;
    s9b.push(
      await db.student.create({
        data: {
          academyId: academy.id,
          cohortId: cohort9b.id,
          name: n.name,
          studentId: n.code,
          flag: n.flag,
        },
      }),
    );
  }

  // Two more cohorts populated with generated students.
  const genNames = [
    'Karimov',
    'Yusupova',
    'Rustamov',
    'Saidova',
    'Tojiboyev',
    'Umarova',
    'Qodirov',
  ];
  async function genStudents(cohortId: string, count: number, startCode: number) {
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push(
        await db.student.create({
          data: {
            academyId: academy.id,
            cohortId,
            name: `${genNames[i % genNames.length]} ${String.fromCharCode(65 + (i % 26))}.`,
            studentId: `DEMO-2026-${String(startCode + i).padStart(5, '0')}`,
            flag: i === 0 ? StudentFlag.TOP : null,
          },
        }),
      );
    }
    return out;
  }
  const sMid = await genStudents(cohortMid.id, 6, 100);
  const sGeo = await genStudents(cohortGeo.id, 6, 200);

  // --- Cards ---------------------------------------------------------------
  // Six explicit "recent" cards (drive the cards page recency), then top up each
  // named student's tally to its target with generic cards.
  const upTypes = [ct.star, ct.activity, ct.helper, ct.tidy];
  const downTypes = [ct.warning, ct.irresp];

  async function issueCard(opts: {
    typeId: string;
    kind: string;
    studentId: string;
    cohortId: string;
    reason?: ReturnType<typeof loc> | string;
    createdAt: Date;
  }) {
    await db.card.create({
      data: {
        academyId: academy.id,
        cardTypeId: opts.typeId,
        kind: opts.kind,
        studentId: opts.studentId,
        cohortId: opts.cohortId,
        issuerId: teacher.id,
        reason: opts.reason ?? undefined,
        createdAt: opts.createdAt,
      },
    });
  }

  // recipient -> student index in s9b
  const recent: Array<{
    si: number;
    type: string;
    kind: string;
    reason: ReturnType<typeof loc>;
    mins: number;
  }> = [
    {
      si: 0,
      type: ct.star.id,
      kind: 'up',
      reason: loc(
        'Mustaqil yechim · 3-misol',
        'Самостоятельное решение · пример 3',
        'Independent solution · problem 3',
      ),
      mins: 18,
    },
    {
      si: 5,
      type: ct.activity.id,
      kind: 'up',
      reason: loc('Sinfdoshlariga yordam berdi', 'Помогла одноклассникам', 'Helped classmates'),
      mins: 22,
    },
    {
      si: 4,
      type: ct.warning.id,
      kind: 'down',
      reason: loc(
        'Uy ishi tayyor emas (2-marta)',
        'Домашка не готова (2-й раз)',
        'Homework not ready (2nd time)',
      ),
      mins: 48,
    },
    {
      si: 3,
      type: ct.star.id,
      kind: 'up',
      reason: loc('Toza daftar', 'Аккуратная тетрадь', 'Tidy notebook'),
      mins: 70,
    },
    {
      si: 2,
      type: ct.warning.id,
      kind: 'down',
      reason: loc('Darsda telefon bilan', 'С телефоном на уроке', 'Phone during lesson'),
      mins: 95,
    },
    {
      si: 1,
      type: ct.star.id,
      kind: 'up',
      reason: loc('Olimpiada 2-bosqich', 'Олимпиада, 2-й этап', 'Olympiad, round 2'),
      mins: 140,
    },
  ];
  const issuedUp = [0, 0, 0, 0, 0, 0];
  const issuedDown = [0, 0, 0, 0, 0, 0];
  for (const r of recent) {
    await issueCard({
      typeId: r.type,
      kind: r.kind,
      studentId: s9b[r.si]!.id,
      cohortId: cohort9b.id,
      reason: r.reason,
      createdAt: minutesAgo(r.mins),
    });
    if (r.kind === 'up') issuedUp[r.si]!++;
    else issuedDown[r.si]!++;
  }
  // Top up to targets.
  for (let i = 0; i < named.length; i++) {
    const n = named[i]!;
    for (let k = issuedUp[i]!; k < n.up; k++) {
      await issueCard({
        typeId: upTypes[k % upTypes.length]!.id,
        kind: 'up',
        studentId: s9b[i]!.id,
        cohortId: cohort9b.id,
        createdAt: daysAgo(2 + (k % 6)),
      });
    }
    for (let k = issuedDown[i]!; k < n.down; k++) {
      await issueCard({
        typeId: downTypes[k % downTypes.length]!.id,
        kind: 'down',
        studentId: s9b[i]!.id,
        cohortId: cohort9b.id,
        createdAt: daysAgo(2 + (k % 6)),
      });
    }
  }
  // A handful of cards for the other cohorts so they're populated.
  for (let i = 0; i < sMid.length; i++) {
    const reps = (i % 3) + 1;
    for (let k = 0; k < reps; k++)
      await issueCard({
        typeId: ct.activity.id,
        kind: 'up',
        studentId: sMid[i]!.id,
        cohortId: cohortMid.id,
        createdAt: daysAgo(1 + k),
      });
  }
  for (let i = 0; i < sGeo.length; i++) {
    if (i % 4 === 0)
      await issueCard({
        typeId: ct.warning.id,
        kind: 'down',
        studentId: sGeo[i]!.id,
        cohortId: cohortGeo.id,
        createdAt: daysAgo(1 + i),
      });
    else
      await issueCard({
        typeId: ct.star.id,
        kind: 'up',
        studentId: sGeo[i]!.id,
        cohortId: cohortGeo.id,
        createdAt: daysAgo(1 + i),
      });
  }

  // --- Attendance ----------------------------------------------------------
  // 16 sessions per cohort; a student's presence pattern yields a real, varied %.
  const SESSIONS = 16;
  async function seedAttendance(cohortId: string, students: { id: string }[]) {
    for (let d = SESSIONS - 1; d >= 0; d--) {
      const presentFlags = students.map((_, idx) => (d + idx) % 7 !== 0); // ~85% with variation
      const present = presentFlags.filter(Boolean).length;
      const total = students.length;
      const record = await db.attendanceRecord.create({
        data: {
          academyId: academy.id,
          cohortId,
          takenById: teacher.id,
          takenAt: daysAgo(d * 2 + 1),
          present,
          total,
          percent: total ? Math.round((present / total) * 100) : 0,
        },
      });
      await db.attendanceEntry.createMany({
        data: students.map((s, idx) => ({
          recordId: record.id,
          studentId: s.id,
          present: presentFlags[idx]!,
        })),
      });
    }
  }
  await seedAttendance(cohort9b.id, s9b);
  await seedAttendance(cohortMid.id, sMid);
  await seedAttendance(cohortGeo.id, sGeo);

  // Rich lesson timelines power the dedicated group workspace: last lesson +
  // homework, next lesson type and a mixed-teacher upcoming schedule.
  async function seedLessonTimeline(
    cohortId: string,
    room: ReturnType<typeof loc>,
    studentCount: number,
    sequence: string,
  ) {
    await db.cohortLesson.create({
      data: {
        id: `${cohortId}-lesson-last`,
        cohortId,
        teacherId: teacher.id,
        title: loc(`${sequence}: takrorlash`, `${sequence}: повторение`, `${sequence}: review`),
        type: 'main',
        room,
        startsAt: hoursFromNow(-48),
        endsAt: hoursFromNow(-47),
        status: 'completed',
        homework: {
          create: {
            title: loc('Mashqlar 8–14', 'Упражнения 8–14', 'Exercises 8–14'),
            dueAt: hoursFromNow(18),
            submitted: Math.max(0, studentCount - 2),
            total: studentCount,
          },
        },
      },
    });
    await db.cohortLesson.createMany({
      data: [
        {
          id: `${cohortId}-lesson-next`,
          cohortId,
          teacherId: teacher.id,
          title: loc(
            `${sequence}: yangi mavzu`,
            `${sequence}: новая тема`,
            `${sequence}: new topic`,
          ),
          type: 'main',
          room,
          startsAt: hoursFromNow(20),
          endsAt: hoursFromNow(21),
        },
        {
          id: `${cohortId}-lesson-video`,
          cohortId,
          teacherId: 'staff-sabrina',
          title: loc('Video tahlil', 'Видеоразбор', 'Video walkthrough'),
          type: 'video',
          room,
          startsAt: hoursFromNow(44),
          endsAt: hoursFromNow(45),
        },
        {
          id: `${cohortId}-lesson-support`,
          cohortId,
          teacherId: 'staff-nilufar',
          title: loc('Savol-javob laboratoriyasi', 'Лаборатория вопросов', 'Question lab'),
          type: 'support',
          room,
          startsAt: hoursFromNow(68),
          endsAt: hoursFromNow(69),
        },
      ],
    });
  }
  await seedLessonTimeline(
    cohort9b.id,
    loc('Xona 304', 'Каб. 304', 'Room 304'),
    s9b.length,
    'Kvadrat tenglamalar',
  );
  await seedLessonTimeline(
    cohortMid.id,
    loc('Xona 304', 'Каб. 304', 'Room 304'),
    sMid.length,
    'Funksiyalar',
  );
  await seedLessonTimeline(
    cohortGeo.id,
    loc('Xona 301', 'Каб. 301', 'Room 301'),
    sGeo.length,
    'Uchburchaklar',
  );

  // --- Per-domain seed modules (tasks, ai, print, surveys, mgmt, notifications, materials) ---
  await seedTasks(db);
  await seedAi(db);
  await seedPrint(db);
  await seedSurveys(db);
  await seedMgmt(db);
  await seedNotifications(db);
  await seedMaterials(db);
  await seedWorkspaces(db);

  console.log('Seed complete:');
  console.log(`  academy=${academy.id} teacher=${teacher.username} (password: demo1234)`);
  console.log(
    '  staff logins: sabrina.mamatova (cashier), timur.usmanov (security), nilufar.rakhimova (registrar)',
  );
  console.log(`  cohorts=3 students=${s9b.length + sMid.length + sGeo.length} cardTypes=6`);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
