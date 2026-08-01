// Survey page fixtures. Display strings carry {uz,ru,en}; repos resolve to locale.
const text = (uz, ru, en) => ({ uz, ru, en });
export const activeSurveysFixture = [
  {
    id: 'sv1',
    title: {
      uz: 'Oylik o‘qituvchi qoniqishi',
      ru: 'Ежемесячная удовлетворённость учителя',
      en: 'Monthly teacher satisfaction',
    },
    issuer: {
      uz: 'Karimova R. · Direktor',
      ru: 'Каримова Р. · Директор',
      en: 'Karimova R. · Director',
    },
    deadline: '22.05 · 23:59',
    remaining: { uz: '2 kun 14 soat', ru: '2 дня 14 ч', en: '2 days 14 h' },
    questions: 12,
    estimate: { uz: '~4 daq', ru: '~4 мин', en: '~4 min' },
    progress: 33,
    urgent: true,
  },
  {
    id: 'sv2',
    title: {
      uz: 'Karta tizimi · taklif va e‘tirozlar',
      ru: 'Система карт · предложения и замечания',
      en: 'Card system · suggestions and objections',
    },
    issuer: {
      uz: 'Ahmedov B. · O‘quv ishlari',
      ru: 'Ахмедов Б. · Учебная часть',
      en: 'Ahmedov B. · Academic affairs',
    },
    deadline: '26.05 · 18:00',
    remaining: { uz: '6 kun', ru: '6 дней', en: '6 days' },
    questions: 8,
    estimate: { uz: '~3 daq', ru: '~3 мин', en: '~3 min' },
    progress: 0,
    urgent: false,
  },
];

export const surveyHistoryFixture = [
  {
    title: {
      uz: 'Aprel · iss-prosess',
      ru: 'Апрель · рабочий процесс',
      en: 'April · work process',
    },
    issuer: { uz: 'Direktor', ru: 'Директор', en: 'Director' },
    status: { uz: 'Topshirildi', ru: 'Сдано', en: 'Submitted' },
    skipped: false,
    date: '30.04',
  },
  {
    title: {
      uz: 'Yangi platforma qulayligi',
      ru: 'Удобство новой платформы',
      en: 'New platform usability',
    },
    issuer: { uz: 'Markaz', ru: 'Центр', en: 'Center' },
    status: { uz: 'Topshirildi', ru: 'Сдано', en: 'Submitted' },
    skipped: false,
    date: '15.04',
  },
  {
    title: {
      uz: 'AI tavsiyalarining sifati',
      ru: 'Качество рекомендаций AI',
      en: 'AI recommendation quality',
    },
    issuer: { uz: 'Metodist', ru: 'Методист', en: 'Methodist' },
    status: { uz: 'O‘tkazib yuborilgan', ru: 'Пропущено', en: 'Skipped' },
    skipped: true,
    date: '01.04',
  },
];

const workloadOptions = [
  { value: 'light', label: text('Yengil', 'Низкая', 'Light') },
  { value: 'balanced', label: text('Muvozanatli', 'Сбалансированная', 'Balanced') },
  { value: 'heavy', label: text('Yuqori', 'Высокая', 'Heavy') },
];
const resourceOptions = [
  { value: 'materials', label: text('Dars materiallari', 'Материалы уроков', 'Lesson materials') },
  {
    value: 'planning',
    label: text('Rejalashtirish vaqti', 'Время на планирование', 'Planning time'),
  },
  { value: 'technology', label: text('Texnologiya', 'Технологии', 'Technology') },
  { value: 'support', label: text('Metodik yordam', 'Методическая помощь', 'Methodical support') },
];

export const surveyQuestionsFixture = {
  sv1: [
    {
      id: 'sv1-q1',
      kind: 'rating',
      required: true,
      prompt: text(
        'Bu oy ish tajribangizni baholang.',
        'Оцените ваш рабочий опыт в этом месяце.',
        'Rate your work experience this month.',
      ),
      description: text(
        '1 — juda qiyin, 5 — a’lo',
        '1 — очень сложно, 5 — отлично',
        '1 is very difficult, 5 is excellent',
      ),
    },
    {
      id: 'sv1-q2',
      kind: 'single',
      required: true,
      prompt: text(
        'Hozirgi ish yuklamangiz qanday?',
        'Какая у вас сейчас нагрузка?',
        'How is your current workload?',
      ),
      options: workloadOptions,
    },
    {
      id: 'sv1-q3',
      kind: 'rating',
      required: true,
      prompt: text(
        'Jadvalingiz qanchalik qulay?',
        'Насколько удобно ваше расписание?',
        'How manageable is your schedule?',
      ),
    },
    {
      id: 'sv1-q4',
      kind: 'boolean',
      required: true,
      prompt: text(
        'Rahbariyatdan yetarli yordam olyapsizmi?',
        'Получаете ли вы достаточно поддержки от руководства?',
        'Are you receiving enough support from management?',
      ),
    },
    {
      id: 'sv1-q5',
      kind: 'multi',
      required: false,
      prompt: text(
        'Qaysi resurslar sizga ko‘proq kerak?',
        'Какие ресурсы вам нужны больше всего?',
        'Which resources do you need more of?',
      ),
      options: resourceOptions,
    },
    {
      id: 'sv1-q6',
      kind: 'longText',
      required: false,
      prompt: text(
        'Bu oy eng katta to‘siq nima bo‘ldi?',
        'Что было главным препятствием в этом месяце?',
        'What was your biggest obstacle this month?',
      ),
    },
    {
      id: 'sv1-q7',
      kind: 'single',
      required: true,
      prompt: text(
        'Jamoa ichidagi aloqa qanday?',
        'Как вы оцениваете коммуникацию в команде?',
        'How is communication within the team?',
      ),
      options: [
        { value: 'clear', label: text('Aniq', 'Понятная', 'Clear') },
        { value: 'mixed', label: text('Har xil', 'Неравномерная', 'Mixed') },
        { value: 'poor', label: text('Yaxshilash kerak', 'Нужно улучшить', 'Needs improvement') },
      ],
    },
    {
      id: 'sv1-q8',
      kind: 'rating',
      required: true,
      prompt: text(
        'Mavjud vositalarni baholang.',
        'Оцените доступные рабочие инструменты.',
        'Rate the tools available to you.',
      ),
    },
    {
      id: 'sv1-q9',
      kind: 'text',
      required: false,
      prompt: text(
        'Bitta tezkor yaxshilanishni taklif qiling.',
        'Предложите одно быстрое улучшение.',
        'Suggest one quick improvement.',
      ),
    },
    {
      id: 'sv1-q10',
      kind: 'boolean',
      required: true,
      prompt: text(
        'Kelasi oy shu jamoada ishlashni tavsiya qilasizmi?',
        'Порекомендуете ли вы работу в этой команде в следующем месяце?',
        'Would you recommend working in this team next month?',
      ),
    },
    {
      id: 'sv1-q11',
      kind: 'multi',
      required: false,
      prompt: text(
        'Qaysi rivojlanish mavzulari qiziq?',
        'Какие темы развития вам интересны?',
        'Which development topics interest you?',
      ),
      options: [
        { value: 'ai', label: 'AI' },
        {
          value: 'classroom',
          label: text('Sinf boshqaruvi', 'Управление классом', 'Classroom management'),
        },
        { value: 'assessment', label: text('Baholash', 'Оценивание', 'Assessment') },
        { value: 'leadership', label: text('Yetakchilik', 'Лидерство', 'Leadership') },
      ],
    },
    {
      id: 'sv1-q12',
      kind: 'longText',
      required: false,
      prompt: text(
        'Rahbariyat bilishi kerak bo‘lgan yana nima bor?',
        'Что ещё важно знать руководству?',
        'What else should management know?',
      ),
    },
  ],
  sv2: [
    {
      id: 'sv2-q1',
      kind: 'rating',
      required: true,
      prompt: text(
        'Karta tizimi qanchalik tushunarli?',
        'Насколько понятна система карт?',
        'How clear is the card system?',
      ),
    },
    {
      id: 'sv2-q2',
      kind: 'boolean',
      required: true,
      prompt: text(
        'Kartalar o‘quvchilarni rag‘batlantiradimi?',
        'Мотивируют ли карты учеников?',
        'Do cards motivate students?',
      ),
    },
    {
      id: 'sv2-q3',
      kind: 'multi',
      required: false,
      prompt: text(
        'Qaysi qismlarni yaxshilash kerak?',
        'Какие части нужно улучшить?',
        'Which parts need improvement?',
      ),
      options: [
        { value: 'rules', label: text('Qoidalar', 'Правила', 'Rules') },
        { value: 'types', label: text('Karta turlari', 'Типы карт', 'Card types') },
        { value: 'reporting', label: text('Hisobotlar', 'Отчётность', 'Reporting') },
        {
          value: 'parents',
          label: text('Ota-onaga aloqa', 'Связь с родителями', 'Parent communication'),
        },
      ],
    },
    {
      id: 'sv2-q4',
      kind: 'single',
      required: true,
      prompt: text(
        'Kartalarni qanchalik tez-tez ishlatasiz?',
        'Как часто вы используете карты?',
        'How often do you use cards?',
      ),
      options: [
        { value: 'daily', label: text('Har kuni', 'Ежедневно', 'Daily') },
        { value: 'weekly', label: text('Haftalik', 'Еженедельно', 'Weekly') },
        { value: 'rarely', label: text('Kamdan-kam', 'Редко', 'Rarely') },
      ],
    },
    {
      id: 'sv2-q5',
      kind: 'rating',
      required: true,
      prompt: text(
        'Mobil foydalanish qulayligini baholang.',
        'Оцените удобство на мобильном.',
        'Rate the mobile experience.',
      ),
    },
    {
      id: 'sv2-q6',
      kind: 'text',
      required: false,
      prompt: text(
        'Qaysi yangi karta turi kerak?',
        'Какого нового типа карт не хватает?',
        'What new card type is missing?',
      ),
    },
    {
      id: 'sv2-q7',
      kind: 'boolean',
      required: true,
      prompt: text(
        'O‘quvchilar karta sababini tushunadimi?',
        'Понимают ли ученики причину выдачи карты?',
        'Do students understand why a card was issued?',
      ),
    },
    {
      id: 'sv2-q8',
      kind: 'longText',
      required: false,
      prompt: text(
        'Boshqa taklif yoki e’tirozlaringiz.',
        'Другие предложения или замечания.',
        'Any other suggestions or objections.',
      ),
    },
  ],
};

export const surveyDraftsFixture = {
  sv1: {
    answers: {
      'sv1-q1': 4,
      'sv1-q2': 'balanced',
      'sv1-q3': 4,
      'sv1-q4': 'yes',
    },
    progress: 33,
  },
};
