// Today-page aggregates. Display strings carry {uz,ru,en}; repos resolve to locale.
export const todayMetaFixture = {
  dateLabel: {
    uz: 'Seshanba · 19 May 2026',
    ru: 'Вторник · 19 мая 2026',
    en: 'Tuesday · 19 May 2026',
  },
  greetingName: { uz: 'Nigora opa', ru: 'Нигора', en: 'Nigora' },
  summary: {
    uz: '3 guruh · 5 ta dars · 8 ta Up karta berildi',
    ru: '3 группы · 5 уроков · выдано 8 Up карт',
    en: '3 groups · 5 lessons · 8 Up cards given',
  },
};

export const surveyBannerFixture = {
  remaining: { uz: '2 kun 14 soat qoldi', ru: 'осталось 2 дня 14 ч', en: '2 days 14 h left' },
  title: {
    uz: 'Oylik o‘qituvchi qoniqishi',
    ru: 'Ежемесячная удовлетворённость учителя',
    en: 'Monthly teacher satisfaction',
  },
  meta: { uz: '4/12 javob berildi', ru: '4/12 ответили', en: '4/12 answered' },
};

export const todayStatsFixture = [
  {
    value: '4',
    unit: '/ 5',
    label: { uz: 'Bugungi darslar', ru: 'Уроки сегодня', en: "Today's lessons" },
  },
  {
    value: '94',
    unit: '%',
    label: { uz: 'O‘rta davomat', ru: 'Ср. посещаемость', en: 'Avg attendance' },
    color: 'var(--sf-success)',
    trend: { up: true, value: '+2%' },
  },
  {
    value: '↑8',
    label: { uz: 'Up kartalar', ru: 'Up карты', en: 'Up cards' },
    color: '#7a4f0e',
    trend: { up: true, value: { uz: 'bugun', ru: 'сегодня', en: 'today' } },
  },
  {
    value: '↓2',
    label: { uz: 'Down kartalar', ru: 'Down карты', en: 'Down cards' },
    color: 'var(--sf-danger)',
  },
  {
    value: '3',
    label: { uz: 'Ochiq vazifalar', ru: 'Открытые задачи', en: 'Open tasks' },
    color: 'var(--sf-primary)',
  },
];

// Teacher-owned performance analytics shown on the Today command center.
// Ten observed teaching days keep the attendance trend honest and readable.
export const teacherPerformanceFixture = {
  rank: {
    position: 4,
    total: 28,
    score: 92,
    change: 2,
    percentile: { uz: 'Top 15%', ru: 'Топ 15%', en: 'Top 15%' },
    nextGap: 36,
  },
  attendanceTrend: [
    { label: '06', value: 90 },
    { label: '07', value: 92 },
    { label: '08', value: 91 },
    { label: '09', value: 93 },
    { label: '12', value: 92 },
    { label: '13', value: 94 },
    { label: '14', value: 95 },
    { label: '15', value: 93 },
    { label: '18', value: 94 },
    { label: '19', value: 94 },
  ],
  weeklyLoad: [
    { label: { uz: 'Du', ru: 'Пн', en: 'Mon' }, value: 4 },
    { label: { uz: 'Se', ru: 'Вт', en: 'Tue' }, value: 5 },
    { label: { uz: 'Ch', ru: 'Ср', en: 'Wed' }, value: 4 },
    { label: { uz: 'Pa', ru: 'Чт', en: 'Thu' }, value: 6 },
    { label: { uz: 'Ju', ru: 'Пт', en: 'Fri' }, value: 3 },
  ],
  scoreBreakdown: [
    { label: { uz: 'Davomat', ru: 'Посещаемость', en: 'Attendance' }, value: 94, target: 90 },
    {
      label: { uz: 'Dars yakuni', ru: 'Проведение уроков', en: 'Lesson completion' },
      value: 96,
      target: 95,
    },
    {
      label: { uz: 'Vazifalar vaqtida', ru: 'Задачи вовремя', en: 'Tasks on time' },
      value: 88,
      target: 90,
    },
    {
      label: { uz: 'O‘quvchi rivoji', ru: 'Прогресс учеников', en: 'Student progress' },
      value: 91,
      target: 90,
    },
  ],
  groupHealth: [
    { id: '9b-algebra', name: '9-B Algebra', attendance: 94, up: 18, down: 4 },
    { id: 'algebra-mid', name: 'Algebra Mid', attendance: 91, up: 12, down: 3 },
    { id: '10v-geometriya', name: '10-V Geometriya', attendance: 89, up: 9, down: 5 },
  ],
  updatedAt: { uz: 'Bugun · 09:48', ru: 'Сегодня · 09:48', en: 'Today · 09:48' },
};

export const heroLessonFixture = {
  available: true,
  eyebrow: {
    uz: 'Keyingi dars · 14 daqiqada boshlanadi',
    ru: 'Следующий урок · через 14 минут',
    en: 'Next lesson · starts in 14 min',
  },
  title: 'Algebra',
  titleAccent: { uz: 'Daraja II', ru: 'Уровень II', en: 'Level II' },
  sub: {
    uz: '9-B guruh · 24 o‘quvchi · Xona 304 · 2-qavat',
    ru: 'Группа 9-B · 24 ученика · Каб. 304 · 2 этаж',
    en: 'Group 9-B · 24 students · Room 304 · 2nd floor',
  },
  start: '09:00',
  end: '– 09:45',
};

export const scheduleFixture = [
  { time: '09:00', label: 'Algebra · 9-B', room: '304', state: 'now', mins: '14m' },
  { time: '10:00', label: 'Algebra · Mid', room: '304', state: 'next' },
  { time: '11:30', label: 'Geometriya · 10-V', room: '301' },
  {
    time: '14:00',
    label: { uz: 'Tushlik tanaffus', ru: 'Обеденный перерыв', en: 'Lunch break' },
    room: '',
    state: 'gap',
  },
  {
    time: '15:00',
    label: { uz: 'Tayyorlov · 11', ru: 'Подготовка · 11', en: 'Prep · 11' },
    room: '210',
  },
];

export const aiInsightFixture = {
  eyebrow: { uz: 'Bugungi tavsiya', ru: 'Совет на сегодня', en: "Today's tip" },
  count: { uz: '3 dona', ru: '3 шт', en: '3 items' },
  quote: {
    uz: '“Otabekka oxirgi haftada 2 ta Down karta berildi va davomati pasaymoqda. Ota bilan suhbat tavsiya etiladi.”',
    ru: '«Отабек за последнюю неделю получил 2 Down-карты, посещаемость падает. Рекомендуется беседа с отцом.»',
    en: '“Otabek received 2 Down cards this week and his attendance is dropping. A talk with the parent is recommended.”',
  },
  chips: [
    { uz: 'Ota-onaga xat tayyor', ru: 'Письмо родителю готово', en: 'Parent letter ready' },
    { uz: 'Konsultatsiya rejasi', ru: 'План консультации', en: 'Consultation plan' },
  ],
};

export const printQueueFixture = [
  {
    id: 'pq1',
    doc: { uz: 'Kvadrat tenglamalar', ru: 'Квадратные уравнения', en: 'Quadratic equations' },
    copies: 24,
    sub: 'HP LaserJet · A4 B/W',
    progress: 64,
    eta: { uz: 'Tugaydi · 11:24', ru: 'Закончит · 11:24', en: 'Done · 11:24' },
    icon: 'doc',
    tone: 'primary',
    label: { uz: 'Chop', ru: 'Печать', en: 'Print' },
  },
  {
    id: 'pq2',
    doc: {
      uz: 'Yulduz karta · 6 nusxa',
      ru: 'Звёздная карта · 6 копий',
      en: 'Star card · 6 copies',
    },
    copies: 6,
    sub: 'Xerox · A5',
    progress: null,
    eta: { uz: 'Boshlanadi · 11:38', ru: 'Начнёт · 11:38', en: 'Starts · 11:38' },
    icon: 'brand',
    tone: 'accent',
    label: { uz: 'Navbat', ru: 'Очередь', en: 'Queue' },
  },
];

export const mgmtMentionFixture = {
  name: 'Karimova Rano',
  role: { uz: 'Direktor', ru: 'Директор', en: 'Director' },
  message: {
    uz: '"Ertangi yig‘ilish 14:00 da o‘tadi. Hisobotni ham olib keling."',
    ru: '«Завтрашнее собрание в 14:00. Принесите и отчёт.»',
    en: '"Tomorrow\'s meeting is at 14:00. Bring the report too."',
  },
  time: '14:08',
};

export const spotlightFixture = {
  name: '9-B Algebra',
  sub: {
    uz: '24 o‘quvchi · Daraja II',
    ru: '24 ученика · Уровень II',
    en: '24 students · Level II',
  },
  tone: 'success',
  toneLabel: { uz: 'Yaxshi', ru: 'Хорошо', en: 'Good' },
  stats: [
    {
      value: '94%',
      label: { uz: 'Davomat', ru: 'Посещ.', en: 'Attend.' },
      color: 'var(--sf-success)',
    },
    { value: '↑18', label: 'Up', color: '#7a4f0e' },
    { value: '↓4', label: 'Down', color: 'var(--sf-danger)' },
  ],
};

export const activityFixture = [
  {
    who: { uz: 'Siz', ru: 'Вы', en: 'You' },
    what: {
      uz: 'Akbarov A. ga Yulduz karta berdingiz',
      ru: 'выдали Звёздную карту Акбарову А.',
      en: 'gave a Star card to Akbarov A.',
    },
    time: '09:42',
    icon: 'brand',
    color: 'var(--sf-accent)',
  },
  {
    who: 'AI',
    what: {
      uz: 'haftalik xulosa tayyorladi · 9-B',
      ru: 'подготовил недельную сводку · 9-B',
      en: 'prepared a weekly summary · 9-B',
    },
    time: '08:50',
  },
  {
    who: { uz: 'Siz', ru: 'Вы', en: 'You' },
    what: {
      uz: '10-V uchun davomatni saqladingiz',
      ru: 'сохранили посещаемость для 10-V',
      en: 'saved attendance for 10-V',
    },
    time: '08:48',
    icon: 'check',
    color: 'var(--sf-success)',
  },
  {
    who: 'Karimova R.',
    what: {
      uz: 'yangi vazifa biriktirdi',
      ru: 'назначила новую задачу',
      en: 'assigned a new task',
    },
    time: 'Du',
    icon: 'flag',
    color: 'var(--sf-primary)',
  },
];

export const pendingTasksFixture = [
  {
    title: { uz: 'May oyi yakuniy hisoboti', ru: 'Итоговый отчёт за май', en: 'May final report' },
    priority: 'P1',
    deadline: { uz: 'Erta · 18:00', ru: 'Завтра · 18:00', en: 'Tomorrow · 18:00' },
    urgent: true,
    fromMgmt: true,
    project: { uz: 'Hisobot', ru: 'Отчёт', en: 'Report' },
    projectColor: 'var(--sf-primary)',
  },
  {
    title: {
      uz: 'Slaydlarni yangilash · Kvadrat tenglamalar',
      ru: 'Обновить слайды · Квадратные уравнения',
      en: 'Update slides · Quadratic equations',
    },
    priority: 'P2',
    deadline: { uz: 'Pen · 23:59', ru: 'Чт · 23:59', en: 'Thu · 23:59' },
    fromMgmt: false,
    project: { uz: 'Materiallar', ru: 'Материалы', en: 'Materials' },
    projectColor: 'var(--sf-accent)',
  },
  {
    title: {
      uz: 'So‘rovnoma · AI sifat baholash',
      ru: 'Опрос · оценка качества AI',
      en: 'Survey · AI quality rating',
    },
    priority: 'P2',
    deadline: '22.05',
    fromMgmt: true,
    project: { uz: 'So‘rovnoma', ru: 'Опрос', en: 'Survey' },
    projectColor: 'var(--sf-ai)',
  },
];
