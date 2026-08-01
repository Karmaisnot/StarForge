const text = (uz, ru, en) => ({ uz, ru, en });

function shifted(days, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

export function buildAcademicFixture() {
  return {
    capabilities: {
      schedule: true,
      attendance: true,
      assignments: true,
      academics: true,
      intelligence: true,
      achievements: true,
      reports: true,
      placement: true,
    },
    schedule: [
      {
        id: 'lesson-a1',
        cohortId: '9b-algebra',
        title: text('Chiziqli funksiyalar', 'Линейные функции', 'Linear functions'),
        cohort: '9-B Algebra',
        room: '204',
        startsAt: shifted(0, 10),
        endsAt: shifted(0, 11),
        status: 'scheduled',
      },
      {
        id: 'lesson-a2',
        cohortId: '10v-geometriya',
        title: text('Geometriya amaliyoti', 'Практика по геометрии', 'Geometry workshop'),
        cohort: '10-V Geometry',
        room: '302',
        startsAt: shifted(1, 14),
        endsAt: shifted(1, 15),
        status: 'scheduled',
      },
    ],
    attendance: [
      {
        id: 'att-1',
        cohortId: '9b-algebra',
        student: 'Aziza Karimova',
        cohort: '9-B Algebra',
        lesson: text('Tenglamalar', 'Уравнения', 'Equations'),
        at: shifted(-1, 10),
        status: 'present',
      },
      {
        id: 'att-2',
        cohortId: '9b-algebra',
        student: 'Sardor Aliyev',
        cohort: '9-B Algebra',
        lesson: text('Tenglamalar', 'Уравнения', 'Equations'),
        at: shifted(-1, 10),
        status: 'late',
      },
      {
        id: 'att-3',
        cohortId: '10v-geometriya',
        student: 'Madina Rasulova',
        cohort: '10-V Geometry',
        lesson: text('Uchburchaklar', 'Треугольники', 'Triangles'),
        at: shifted(-2, 14),
        status: 'absent',
      },
    ],
    assignments: [
      {
        id: 'asg-1',
        cohortId: '9b-algebra',
        title: text('Funksiyalar grafigi', 'Графики функций', 'Function graphs'),
        cohort: '9-B Algebra',
        dueAt: shifted(3, 18),
        status: 'published',
        maxScore: 100,
      },
      {
        id: 'asg-2',
        cohortId: '10v-geometriya',
        title: text('Geometriya isboti', 'Доказательство по геометрии', 'Geometry proof'),
        cohort: '10-V Geometry',
        dueAt: shifted(5, 18),
        status: 'draft',
        maxScore: 100,
      },
    ],
    exams: [
      {
        id: 'exam-1',
        cohortId: '9b-algebra',
        title: text('Oraliq nazorat', 'Промежуточная работа', 'Midterm assessment'),
        subject: text('Algebra', 'Алгебра', 'Algebra'),
        cohort: '9-B Algebra',
        date: shifted(7, 9),
        maxScore: 100,
        published: false,
      },
    ],
    grades: [
      {
        id: 'grade-1',
        cohortId: '9b-algebra',
        student: 'Aziza Karimova',
        subject: 'Algebra',
        value: 92,
        display: 'A',
      },
      {
        id: 'grade-2',
        cohortId: '9b-algebra',
        student: 'Sardor Aliyev',
        subject: 'Algebra',
        value: 74,
        display: 'C',
      },
      {
        id: 'grade-3',
        cohortId: '10v-geometriya',
        student: 'Madina Rasulova',
        subject: 'Geometry',
        value: 86,
        display: 'B',
      },
    ],
    risks: [
      {
        id: 'risk-1',
        cohortId: '9b-algebra',
        status: 'open',
        at: shifted(-1, 10),
        student: 'Sardor Aliyev',
        cohort: '9-B Algebra',
        level: 'medium',
        score: 3,
        flags: ['attendance', 'grade'],
      },
      {
        id: 'risk-2',
        cohortId: '10v-geometriya',
        status: 'monitoring',
        at: shifted(-2, 14),
        student: 'Madina Rasulova',
        cohort: '10-V Geometry',
        level: 'low',
        score: 1,
        flags: ['attendance'],
      },
    ],
    achievements: [
      {
        id: 'ach-1',
        name: text('Hafta yulduzi', 'Звезда недели', 'Star of the week'),
        description: text('Barqaror o‘sish', 'Стабильный рост', 'Consistent progress'),
        emoji: '⭐',
        scope: 'cohort',
        status: 'active',
      },
      {
        id: 'ach-2',
        name: text('Mukammal davomat', 'Идеальная посещаемость', 'Perfect attendance'),
        description: text('Bir oy uzluksiz', 'Месяц без пропусков', 'One month without absence'),
        emoji: '🏅',
        scope: 'global',
        status: 'active',
      },
    ],
    reports: [
      {
        id: 'report-1',
        key: 'attendance',
        title: text('Davomat hisoboti', 'Отчёт по посещаемости', 'Attendance report'),
        description: text(
          'Guruhlar bo‘yicha davomat',
          'Посещаемость по группам',
          'Attendance by group',
        ),
        format: 'pdf',
      },
      {
        id: 'report-2',
        key: 'grades',
        title: text('Baholar hisoboti', 'Отчёт по оценкам', 'Grades report'),
        description: text(
          'Fanlar bo‘yicha natijalar',
          'Результаты по предметам',
          'Results by subject',
        ),
        format: 'xlsx',
      },
    ],
    placement: [
      {
        id: 'placement-1',
        title: text('Ingliz tili darajasi', 'Уровень английского', 'English level placement'),
        description: text('B1–C1 kirish testi', 'Вступительный тест B1–C1', 'B1–C1 entry test'),
        status: 'approved',
        questions: 32,
        minutes: 45,
      },
    ],
  };
}
