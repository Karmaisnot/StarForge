// Print page fixtures. Display strings carry {uz,ru,en}; repos resolve to locale.
export const printersFixture = [
  { id: 'hp', name: 'HP LaserJet · M404n', location: { uz: 'Lobbi · 1-qavat', ru: 'Лобби · 1 этаж', en: 'Lobby · 1st floor' }, status: 'free', eta: { uz: 'Hozir tayyor', ru: 'Готов сейчас', en: 'Ready now' }, queue: 0, color: false, sizes: 'A4', accent: 'var(--sf-success)' },
  { id: 'xerox', name: 'Xerox WorkCentre · Pro', location: { uz: '2-qavat dahliz', ru: 'Коридор 2 этажа', en: '2nd floor hallway' }, status: 'busy', eta: { uz: '11:34 da bo‘shaydi', ru: 'Освободится в 11:34', en: 'Free at 11:34' }, queue: 2, color: true, sizes: 'A4 · A3 · color', accent: 'var(--sf-warn)' },
  { id: 'brother', name: 'Brother · DCP-L', location: { uz: 'Direktor xonasi', ru: 'Кабинет директора', en: "Director's office" }, status: 'locked', eta: { uz: 'Faqat ma‘muriyat', ru: 'Только администрация', en: 'Admin only' }, queue: 0, color: false, sizes: 'A4', accent: 'var(--sf-muted)' },
];

export const printJobsFixture = [
  { id: 'j1', doc: { uz: 'Kvadrat tenglamalar · slayd', ru: 'Квадратные уравнения · слайд', en: 'Quadratic equations · slide' }, icon: 'doc', copies: 24, size: { uz: 'A4 · B/W', ru: 'A4 · ч/б', en: 'A4 · B/W' }, printer: 'HP LaserJet', progress: 64, eta: { uz: 'Tugaydi · 11:24', ru: 'Закончит · 11:24', en: 'Done · 11:24' }, state: 'now' },
  { id: 'j2', doc: { uz: 'Yulduz karta · 6 nusxa', ru: 'Звёздная карта · 6 копий', en: 'Star card · 6 copies' }, icon: 'brand', copies: 6, size: { uz: 'A5 · rang', ru: 'A5 · цвет', en: 'A5 · color' }, printer: 'Xerox WorkCentre', progress: 0, eta: { uz: 'Boshlanadi · 11:38', ru: 'Начнёт · 11:38', en: 'Starts · 11:38' }, state: 'queued' },
];

export const printLibraryFixture = {
  fileCount: 84,
  files: [
    { id: 'lib-1', filename: 'Quadratic equations · practice.pdf', type: 'pdf', size: '1.8 MB', pages: 8, owner: 'Nigora Karimova', updatedAt: 'Today · 08:42' },
    { id: 'lib-2', filename: 'Geometry warm-up cards.pdf', type: 'pdf', size: '2.4 MB', pages: 12, owner: 'Nigora Karimova', updatedAt: 'Yesterday' },
    { id: 'lib-3', filename: 'Level II monthly review.docx', type: 'docx', size: '840 KB', pages: 6, owner: 'Academic office', updatedAt: '28 Jul' },
    { id: 'lib-4', filename: 'Parent meeting notes.docx', type: 'docx', size: '312 KB', pages: 3, owner: 'Nigora Karimova', updatedAt: '26 Jul' },
    { id: 'lib-5', filename: 'Algebra homework · week 6.pdf', type: 'pdf', size: '1.1 MB', pages: 5, owner: 'Nigora Karimova', updatedAt: '24 Jul' },
    { id: 'lib-6', filename: 'Attendance intervention plan.pdf', type: 'pdf', size: '620 KB', pages: 4, owner: 'Student support', updatedAt: '22 Jul' },
    { id: 'lib-7', filename: 'Trapezoids · visual worksheet.pptx', type: 'pptx', size: '4.7 MB', pages: 14, owner: 'Malika Abdullaeva', updatedAt: '18 Jul' },
    { id: 'lib-8', filename: 'Midterm answer sheets.pdf', type: 'pdf', size: '980 KB', pages: 10, owner: 'Academic office', updatedAt: '15 Jul' },
    { id: 'lib-9', filename: 'Student reflection form.pdf', type: 'pdf', size: '410 KB', pages: 2, owner: 'Student support', updatedAt: '12 Jul' },
    { id: 'lib-10', filename: 'Function graphs · examples.pdf', type: 'pdf', size: '2.1 MB', pages: 9, owner: 'Nigora Karimova', updatedAt: '10 Jul' },
    { id: 'lib-11', filename: 'Monthly progress template.xlsx', type: 'xlsx', size: '276 KB', pages: 3, owner: 'Academic office', updatedAt: '08 Jul' },
    { id: 'lib-12', filename: 'Lesson observation checklist.pdf', type: 'pdf', size: '530 KB', pages: 4, owner: 'Management', updatedAt: '05 Jul' },
  ],
};
