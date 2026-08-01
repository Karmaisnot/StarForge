import { PrismaClient } from '@prisma/client';
import { loc } from '../../src/shared/locale';
import { SurveyResponseStatus } from '../../src/domain/enums';

type QuestionSeed = {
  kind: 'rating' | 'single' | 'multi' | 'boolean' | 'text' | 'longText';
  prompt: string;
  required?: boolean;
  description?: string;
  options?: Array<{ value: string; label: string }>;
};

const localized = (value: string) => loc(value, value, value);
const option = (value: string, label: string) => ({ value, label });

function buildQuestions(prefix: string, questions: QuestionSeed[]) {
  return questions.map((question, position) => ({
    id: `${prefix}-q${position + 1}`,
    kind: question.kind,
    prompt: localized(question.prompt),
    ...(question.description ? { description: localized(question.description) } : {}),
    ...(question.options
      ? {
          options: question.options.map((item) => ({
            value: item.value,
            label: localized(item.label),
          })),
        }
      : {}),
    required: question.required ?? false,
    position,
  }));
}

const satisfactionQuestions = buildQuestions('survey-satisfaction', [
  {
    kind: 'rating',
    prompt: 'Rate your work experience this month.',
    description: '1 is very difficult, 5 is excellent.',
    required: true,
  },
  {
    kind: 'single',
    prompt: 'How is your current workload?',
    required: true,
    options: [option('light', 'Light'), option('balanced', 'Balanced'), option('heavy', 'Heavy')],
  },
  { kind: 'rating', prompt: 'How manageable is your schedule?', required: true },
  {
    kind: 'boolean',
    prompt: 'Are you receiving enough support from management?',
    required: true,
  },
  {
    kind: 'multi',
    prompt: 'Which resources do you need more of?',
    options: [
      option('materials', 'Lesson materials'),
      option('planning', 'Planning time'),
      option('technology', 'Technology'),
      option('support', 'Methodical support'),
    ],
  },
  { kind: 'longText', prompt: 'What was your biggest obstacle this month?' },
  {
    kind: 'single',
    prompt: 'How is communication within the team?',
    required: true,
    options: [
      option('clear', 'Clear'),
      option('mixed', 'Mixed'),
      option('poor', 'Needs improvement'),
    ],
  },
  { kind: 'rating', prompt: 'Rate the tools available to you.', required: true },
  { kind: 'text', prompt: 'Suggest one quick improvement.' },
  {
    kind: 'boolean',
    prompt: 'Would you recommend working in this team next month?',
    required: true,
  },
  {
    kind: 'multi',
    prompt: 'Which development topics interest you?',
    options: [
      option('ai', 'AI'),
      option('classroom', 'Classroom management'),
      option('assessment', 'Assessment'),
      option('leadership', 'Leadership'),
    ],
  },
  { kind: 'longText', prompt: 'What else should management know?' },
]);

const cardSystemQuestions = buildQuestions('survey-cards', [
  { kind: 'rating', prompt: 'How clear is the card system?', required: true },
  { kind: 'boolean', prompt: 'Do cards motivate students?', required: true },
  {
    kind: 'multi',
    prompt: 'Which parts need improvement?',
    options: [
      option('rules', 'Rules'),
      option('types', 'Card types'),
      option('reporting', 'Reporting'),
      option('parents', 'Parent communication'),
    ],
  },
  {
    kind: 'single',
    prompt: 'How often do you use cards?',
    required: true,
    options: [option('daily', 'Daily'), option('weekly', 'Weekly'), option('rarely', 'Rarely')],
  },
  { kind: 'rating', prompt: 'Rate the mobile experience.', required: true },
  { kind: 'text', prompt: 'What new card type is missing?' },
  {
    kind: 'boolean',
    prompt: 'Do students understand why a card was issued?',
    required: true,
  },
  { kind: 'longText', prompt: 'Any other suggestions or objections.' },
]);

/**
 * Seed surveys for the demo tenant + the demo teacher's responses.
 *
 *  - 2 active surveys (no final response from the teacher):
 *      sv1 — urgent, partially answered (a `draft` response carries progress 33);
 *      sv2 — untouched (progress 0).
 *  - 1 history survey with a `submitted` response (rating + comment).
 *
 * `remaining` / `progress` are NOT stored on these rows — the service derives
 * `remaining` from `deadlineAt` and `progress` from the draft response, so the
 * UI metrics stay computed (no stale literals). Deadlines are pinned relative to
 * "now" so the urgent / multi-day labels render exactly like the fixture.
 *
 * Assumes the survey tables are empty and that the demo academy + teacher rows
 * already exist (does NOT create them).
 */
export async function seedSurveys(db: PrismaClient): Promise<void> {
  const teacher = await db.teacher.findFirstOrThrow();
  const academyId = teacher.academyId;

  const now = Date.now();
  const hours = (h: number) => new Date(now + h * 3_600_000);
  const daysAgo = (d: number) => new Date(now - d * 24 * 3_600_000);

  // --- Active survey 1: urgent, in-progress -------------------------------
  const sv1 = await db.survey.create({
    data: {
      academyId,
      title: loc(
        'Oylik o‘qituvchi qoniqishi',
        'Ежемесячная удовлетворённость учителя',
        'Monthly teacher satisfaction',
      ),
      issuer: loc('Karimova R. · Direktor', 'Каримова Р. · Директор', 'Karimova R. · Director'),
      questions: satisfactionQuestions.length,
      estimateLabel: loc('~4 daq', '~4 мин', '~4 min'),
      deadlineAt: hours(2 * 24 + 14), // ~2 kun 14 soat
      urgent: true,
      anonymous: false,
      questionItems: { create: satisfactionQuestions },
    },
  });
  // A draft response keeps sv1 active (not final) while carrying progress 33.
  await db.surveyResponse.create({
    data: {
      surveyId: sv1.id,
      teacherId: teacher.id,
      status: 'draft',
      progress: 33,
      answers: {
        'survey-satisfaction-q1': 4,
        'survey-satisfaction-q2': 'balanced',
        'survey-satisfaction-q3': 4,
        'survey-satisfaction-q4': 'yes',
      },
    },
  });

  // --- Active survey 2: untouched -----------------------------------------
  await db.survey.create({
    data: {
      academyId,
      title: loc(
        'Karta tizimi · taklif va e‘tirozlar',
        'Система карт · предложения и замечания',
        'Card system · suggestions and objections',
      ),
      issuer: loc(
        'Ahmedov B. · O‘quv ishlari',
        'Ахмедов Б. · Учебная часть',
        'Ahmedov B. · Academic affairs',
      ),
      questions: cardSystemQuestions.length,
      estimateLabel: loc('~3 daq', '~3 мин', '~3 min'),
      deadlineAt: hours(6 * 24), // ~6 kun
      urgent: false,
      anonymous: false,
      questionItems: { create: cardSystemQuestions },
    },
  });

  // --- History survey: submitted ------------------------------------------
  const svHist = await db.survey.create({
    data: {
      academyId,
      title: loc('Aprel · iss-prosess', 'Апрель · рабочий процесс', 'April · work process'),
      issuer: loc('Direktor', 'Директор', 'Director'),
      questions: 10,
      estimateLabel: loc('~4 daq', '~4 мин', '~4 min'),
      deadlineAt: daysAgo(50),
      urgent: false,
      anonymous: false,
    },
  });
  await db.surveyResponse.create({
    data: {
      surveyId: svHist.id,
      teacherId: teacher.id,
      status: SurveyResponseStatus.SUBMITTED,
      rating: 5,
      comment: 'Jarayon ravon, platforma tezlashtirdi.',
      progress: 100,
      submittedAt: daysAgo(54), // -> date 30.04 relative to a late-June "now" window
    },
  });

  console.log(`  surveys: 2 active (1 in-progress) + 1 history for teacher=${teacher.username}`);
}
