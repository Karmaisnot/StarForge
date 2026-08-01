const L2 = { uz: 'Daraja II', ru: 'Уровень II', en: 'Level II' };
const L3 = { uz: 'Daraja III', ru: 'Уровень III', en: 'Level III' };

export const cohortsFixture = [
  {
    id: '9b-algebra',
    name: '9-B Algebra',
    level: L2,
    subject: { uz: 'Algebra', ru: 'Алгебра', en: 'Algebra' },
    studentCount: 24,
    attendance: 94,
    up: 18,
    down: 4,
    next: { uz: 'Bugun · 09:00', ru: 'Сегодня · 09:00', en: 'Today · 09:00' },
    color: 'var(--sf-primary)',
    room: { uz: 'Xona 304', ru: 'Каб. 304', en: 'Room 304' },
  },
  {
    id: 'algebra-mid',
    name: 'Algebra Mid',
    level: L2,
    subject: { uz: 'Algebra', ru: 'Алгебра', en: 'Algebra' },
    studentCount: 21,
    attendance: 96,
    up: 14,
    down: 0,
    next: { uz: 'Bugun · 10:00', ru: 'Сегодня · 10:00', en: 'Today · 10:00' },
    color: 'var(--sf-primary)',
    room: { uz: 'Xona 304', ru: 'Каб. 304', en: 'Room 304' },
  },
  {
    id: '10v-geometriya',
    name: '10-V Geometriya',
    level: L3,
    subject: { uz: 'Geometriya', ru: 'Геометрия', en: 'Geometry' },
    studentCount: 19,
    attendance: 88,
    up: 9,
    down: 3,
    next: { uz: 'Bugun · 11:30', ru: 'Сегодня · 11:30', en: 'Today · 11:30' },
    color: 'var(--sf-accent)',
    room: { uz: 'Xona 301', ru: 'Каб. 301', en: 'Room 301' },
  },
];

export const rosterFixture = {
  '9b-algebra': [
    {
      id: 's1',
      name: 'Akbarov Akmal',
      studentId: 'DEMO-2026-00042',
      up: 8,
      down: 0,
      attendance: 96,
      flag: 'top',
    },
    {
      id: 's2',
      name: 'Azizova Madina',
      studentId: 'DEMO-2026-00043',
      up: 6,
      down: 0,
      attendance: 98,
      flag: 'top',
    },
    {
      id: 's3',
      name: 'Bakirov Sherzod',
      studentId: 'DEMO-2026-00044',
      up: 2,
      down: 2,
      attendance: 88,
      flag: null,
    },
    {
      id: 's4',
      name: 'Davronova Sevinch',
      studentId: 'DEMO-2026-00045',
      up: 4,
      down: 0,
      attendance: 92,
      flag: null,
    },
    {
      id: 's5',
      name: 'Eshmatov Otabek',
      studentId: 'DEMO-2026-00046',
      up: 1,
      down: 4,
      attendance: 72,
      flag: 'warn',
    },
    {
      id: 's6',
      name: 'Halimova Zilola',
      studentId: 'DEMO-2026-00047',
      up: 7,
      down: 0,
      attendance: 95,
      flag: 'top',
    },
  ],
  'algebra-mid': [
    {
      id: 's7',
      name: 'Saidova Madina',
      studentId: 'DEMO-2026-00051',
      up: 7,
      down: 0,
      attendance: 97,
      flag: 'top',
    },
    {
      id: 's8',
      name: 'Rustamov Otabek',
      studentId: 'DEMO-2026-00052',
      up: 3,
      down: 2,
      attendance: 81,
      flag: 'warn',
    },
    {
      id: 's9',
      name: 'Tursunov Behruz',
      studentId: 'DEMO-2026-00053',
      up: 4,
      down: 0,
      attendance: 93,
      flag: null,
    },
    {
      id: 's10',
      name: 'Nazarova Laylo',
      studentId: 'DEMO-2026-00054',
      up: 8,
      down: 0,
      attendance: 99,
      flag: 'top',
    },
    {
      id: 's11',
      name: 'Ergashev Kamron',
      studentId: 'DEMO-2026-00055',
      up: 2,
      down: 1,
      attendance: 86,
      flag: null,
    },
    {
      id: 's12',
      name: 'Murodova Farida',
      studentId: 'DEMO-2026-00056',
      up: 5,
      down: 0,
      attendance: 95,
      flag: null,
    },
  ],
  '10v-geometriya': [
    {
      id: 's13',
      name: 'Karimov Diyor',
      studentId: 'DEMO-2026-00061',
      up: 6,
      down: 1,
      attendance: 89,
      flag: null,
    },
    {
      id: 's14',
      name: 'Rasulova Madina',
      studentId: 'DEMO-2026-00062',
      up: 7,
      down: 0,
      attendance: 94,
      flag: 'top',
    },
    {
      id: 's15',
      name: 'Ismailova Zarina',
      studentId: 'DEMO-2026-00063',
      up: 3,
      down: 0,
      attendance: 91,
      flag: null,
    },
    {
      id: 's16',
      name: 'Aliyev Sardor',
      studentId: 'DEMO-2026-00064',
      up: 2,
      down: 3,
      attendance: 74,
      flag: 'warn',
    },
    {
      id: 's17',
      name: 'Yusupov Miron',
      studentId: 'DEMO-2026-00065',
      up: 5,
      down: 0,
      attendance: 92,
      flag: null,
    },
    {
      id: 's18',
      name: 'Sobirova Aziza',
      studentId: 'DEMO-2026-00066',
      up: 9,
      down: 0,
      attendance: 98,
      flag: 'top',
    },
  ],
};

const at = (days, hour) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const lessonType = {
  main: { uz: 'Asosiy dars', ru: 'Основной урок', en: 'Main lesson' },
  video: { uz: 'Video dars', ru: 'Видео-урок', en: 'Video lesson' },
  support: { uz: 'Yordam sessiyasi', ru: 'Сессия поддержки', en: 'Support session' },
};

export function buildCohortWorkspace(cohort, roster) {
  const progressionMode = cohort.id === 'algebra-mid' ? 'month' : 'level';
  const lessonDates = [-27, -24, -20, -17, -13, -10, -6, -3].map((days) =>
    at(days, 9).slice(0, 10),
  );
  return {
    revision: 1,
    instructors: [
      {
        id: 'teacher-you',
        name: 'Nigora Karimova',
        role: 'main',
        roleLabel: lessonType.main,
        isYou: true,
        online: true,
      },
      {
        id: 'teacher-video',
        name: 'Azizbek Umarov',
        role: 'video',
        roleLabel: lessonType.video,
        isYou: false,
        online: true,
      },
      {
        id: 'teacher-support',
        name: 'Malika Abdullaeva',
        role: 'support',
        roleLabel: lessonType.support,
        isYou: false,
        online: false,
      },
    ],
    nextLesson: {
      id: `${cohort.id}-next`,
      title: cohort.subject,
      startsAt: at(1, 9),
      endsAt: at(1, 10),
      type: 'video',
      typeLabel: lessonType.video,
      teacherName: 'Azizbek Umarov',
      room: cohort.room,
    },
    upcomingLessons: [
      {
        id: `${cohort.id}-l1`,
        title: cohort.subject,
        startsAt: at(1, 9),
        endsAt: at(1, 10),
        type: 'video',
        typeLabel: lessonType.video,
        teacherName: 'Azizbek Umarov',
        room: cohort.room,
      },
      {
        id: `${cohort.id}-l2`,
        title: cohort.subject,
        startsAt: at(3, 11),
        endsAt: at(3, 12),
        type: 'main',
        typeLabel: lessonType.main,
        teacherName: 'Nigora Karimova',
        room: cohort.room,
      },
      {
        id: `${cohort.id}-l3`,
        title: cohort.subject,
        startsAt: at(5, 15),
        endsAt: at(5, 16),
        type: 'support',
        typeLabel: lessonType.support,
        teacherName: 'Malika Abdullaeva',
        room: { uz: 'Onlayn', ru: 'Онлайн', en: 'Online' },
      },
    ],
    lastLesson: {
      id: `${cohort.id}-last`,
      title: { uz: 'Mavzuni mustahkamlash', ru: 'Закрепление темы', en: 'Topic consolidation' },
      startsAt: at(-3, 9),
      type: 'main',
      typeLabel: lessonType.main,
      teacherName: 'Nigora Karimova',
      attendance: cohort.attendance,
      homework: {
        title: { uz: '12–18 mashqlar', ru: 'Упражнения 12–18', en: 'Exercises 12–18' },
        dueAt: at(1, 18),
        submitted: Math.max(0, roster.length - 2),
        total: roster.length,
      },
    },
    attendanceHistory: roster.flatMap((student, studentIndex) =>
      lessonDates.map((date, dateIndex) => ({
        id: `${cohort.id}-${student.id}-${date}`,
        studentId: student.id,
        date,
        status:
          (studentIndex + dateIndex) % 11 === 0
            ? 'absent'
            : (studentIndex * 2 + dateIndex) % 13 === 0
              ? 'late'
              : 'present',
      })),
    ),
    progression: {
      mode: progressionMode,
      current: progressionMode === 'month' ? 4 : cohort.level,
      next:
        progressionMode === 'month' ? 5 : { uz: 'Daraja III', ru: 'Уровень III', en: 'Level III' },
      startedAt: at(-92, 9).slice(0, 10),
      eligible: cohort.attendance >= 85,
      readiness: Math.min(98, Math.max(68, cohort.attendance - 1)),
    },
  };
}
