// Task board fixtures. Display strings carry {uz,ru,en}; repos resolve to locale.
const ASSIGNER_ME = { uz: 'Men', ru: 'Я', en: 'Me' };
const PROJ = {
  report: { uz: 'Hisobot', ru: 'Отчёт', en: 'Report' },
  materials: { uz: 'Materiallar', ru: 'Материалы', en: 'Materials' },
  survey: { uz: "So'rovnoma", ru: 'Опрос', en: 'Survey' },
  prep: { uz: 'Tayyorlov', ru: 'Подготовка', en: 'Prep' },
  center: { uz: 'Markaz', ru: 'Центр', en: 'Center' },
  students: { uz: "O'quvchilar", ru: 'Ученики', en: 'Students' },
  consult: { uz: 'Konsult.', ru: 'Консульт.', en: 'Consult.' },
};

const dueAt = (days, hour = 18) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const rawTasksFixture = [
  { id: 1, title: { uz: 'May oyi yakuniy hisobotini topshirish', ru: 'Сдать итоговый отчёт за май', en: 'Submit May final report' }, priority: 'P1', state: 'doing', project: PROJ.report, projectColor: 'var(--sf-primary)', deadline: { uz: 'Erta · 18:00', ru: 'Завтра · 18:00', en: 'Tomorrow · 18:00' }, urgent: true, fromMgmt: true, subtasks: { done: 2, total: 4 }, assigner: 'Karimova R.' },
  { id: 2, title: { uz: 'Slaydlarni yangilash · Kvadrat tenglamalar', ru: 'Обновить слайды · Квадратные уравнения', en: 'Update slides · Quadratic equations' }, priority: 'P2', state: 'todo', project: PROJ.materials, projectColor: 'var(--sf-accent)', deadline: { uz: 'Pen · 23:59', ru: 'Чт · 23:59', en: 'Thu · 23:59' }, urgent: false, fromMgmt: false, subtasks: { done: 0, total: 3 }, assigner: ASSIGNER_ME, mine: true },
  { id: 3, title: { uz: "So'rovnoma · AI sifat baholash", ru: 'Опрос · оценка качества AI', en: 'Survey · AI quality rating' }, priority: 'P2', state: 'doing', project: PROJ.survey, projectColor: 'var(--sf-ai)', deadline: '22.05', urgent: false, fromMgmt: true, subtasks: { done: 1, total: 1 }, assigner: { uz: 'Metodist', ru: 'Методист', en: 'Methodist' } },
  { id: 4, title: { uz: 'Olimpiada tayyorgarligi · 11-B', ru: 'Подготовка к олимпиаде · 11-B', en: 'Olympiad prep · 11-B' }, priority: 'P3', state: 'review', project: PROJ.prep, projectColor: 'var(--sf-ink-2)', deadline: '25.05', urgent: false, fromMgmt: true, subtasks: null, assigner: 'Yusupova N.' },
  { id: 5, title: { uz: "Yangi karta nomlarini ko'rib chiqish", ru: 'Рассмотреть новые названия карт', en: 'Review new card names' }, priority: 'P3', state: 'done', project: PROJ.center, projectColor: 'var(--sf-success)', deadline: '18.05', urgent: false, fromMgmt: true, subtasks: null, assigner: { uz: 'Direktor', ru: 'Директор', en: 'Director' } },
  { id: 6, title: { uz: 'Ota-onaga · Eshmatov O. holati', ru: 'Родителям · ситуация Эшматова О.', en: 'To parents · Eshmatov O. status' }, priority: 'P2', state: 'todo', project: PROJ.students, projectColor: 'var(--sf-danger)', deadline: { uz: 'Pen', ru: 'Чт', en: 'Thu' }, urgent: false, fromMgmt: false, subtasks: null, assigner: ASSIGNER_ME, mine: true },
  { id: 7, title: { uz: 'Dars rejasi · Logarifmlar', ru: 'План урока · Логарифмы', en: 'Lesson plan · Logarithms' }, priority: 'P3', state: 'doing', project: PROJ.materials, projectColor: 'var(--sf-accent)', deadline: '23.05', urgent: false, fromMgmt: false, subtasks: { done: 1, total: 5 }, assigner: ASSIGNER_ME, mine: true },
  { id: 8, title: { uz: '9-B uchun konsultatsiya rejasi', ru: 'План консультации для 9-B', en: 'Consultation plan for 9-B' }, priority: 'P3', state: 'review', project: PROJ.consult, projectColor: 'var(--sf-primary)', deadline: '24.05', urgent: false, fromMgmt: false, subtasks: null, assigner: ASSIGNER_ME, mine: true },
];

export const tasksFixture = rawTasksFixture.map((task, position) => ({
  ...task,
  position,
  deadlineAt: dueAt(position - 1, position % 2 ? 18 : 12),
}));

export const taskColumnsFixture = [
  { id: 'todo', label: { uz: 'Boshlanmagan', ru: 'Не начато', en: 'To do' }, color: 'var(--sf-muted)' },
  { id: 'doing', label: { uz: 'Bajarilmoqda', ru: 'В работе', en: 'In progress' }, color: 'var(--sf-primary)' },
  { id: 'review', label: { uz: 'Tekshirishda', ru: 'На проверке', en: 'In review' }, color: 'var(--sf-accent)' },
  { id: 'done', label: { uz: 'Tugatildi', ru: 'Завершено', en: 'Done' }, color: 'var(--sf-success)' },
];

export const taskFiltersFixture = [
  { label: { uz: 'Hammasi', ru: 'Все', en: 'All' }, count: 12, key: 'all' },
  { label: { uz: 'Mening', ru: 'Мои', en: 'Mine' }, count: 7, key: 'mine' },
  { label: { uz: 'Boshqaruvdan', ru: 'От руководства', en: 'From management' }, count: 5, key: 'mgmt' },
  { label: { uz: 'Shoshilinch', ru: 'Срочные', en: 'Urgent' }, count: 1, key: 'urgent' },
  { label: { uz: 'Tugatildi', ru: 'Завершённые', en: 'Done' }, count: 8, key: 'done' },
];
