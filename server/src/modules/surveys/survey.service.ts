import type { AuthContext } from '../../http/plugins/auth';
import { BusinessRuleError, NotFoundError } from '../../shared/errors';
import type { SurveyRepository } from './survey.repository';
import { mapActiveSurvey, mapHistorySurvey } from './survey.mapper';
import type { SaveSurveyDraftInput, SubmitSurveyInput } from './survey.schemas';

/**
 * Survey read use-cases. Active vs. history is decided per-teacher: a survey is
 * history once this teacher has a *final* (submitted | skipped) response, else
 * it is active (progress sourced from any in-progress draft). Both lists are
 * built from two set-based queries — no per-survey round-trips.
 */
export class SurveyService {
  constructor(private readonly repo: SurveyRepository) {}

  /** Surveys this teacher has not yet finalised. `remaining`/`progress` derived. */
  async listActive(ctx: AuthContext) {
    const [surveys, finalResponses, drafts] = await Promise.all([
      this.repo.listSurveys(ctx.academyId),
      this.repo.finalResponsesByTeacher(ctx.academyId, ctx.teacherId),
      this.repo.draftProgressByTeacher(ctx.academyId, ctx.teacherId),
    ]);
    const now = new Date();
    return surveys
      .filter((s) => !finalResponses.has(s.id))
      .map((s) => mapActiveSurvey(s, drafts.get(s.id) ?? 0, now));
  }

  /** Surveys this teacher has finalised, newest finalisation first. */
  async listHistory(ctx: AuthContext) {
    const [surveys, finalResponses] = await Promise.all([
      this.repo.listSurveys(ctx.academyId),
      this.repo.finalResponsesByTeacher(ctx.academyId, ctx.teacherId),
    ]);
    const byId = new Map(surveys.map((s) => [s.id, s]));
    // finalResponses is already ordered newest-first; preserve that order.
    const out = [];
    for (const [surveyId, response] of finalResponses) {
      const survey = byId.get(surveyId);
      if (survey) out.push(mapHistorySurvey(survey, response));
    }
    return out;
  }

  async getDetail(ctx: AuthContext, surveyId: string) {
    const [survey, response] = await Promise.all([
      this.repo.getSurveyDetail(surveyId, ctx.academyId),
      this.repo.getResponse(surveyId, ctx.teacherId),
    ]);
    if (!survey || (response && response.status !== 'draft')) return null;
    const summary = mapActiveSurvey(
      survey,
      response?.status === 'draft' ? response.progress : 0,
      new Date(),
    );
    return {
      ...summary,
      questions: survey.questionItems.map((question) => ({
        id: question.id,
        kind: question.kind,
        prompt: question.prompt,
        description: question.description,
        options: question.options,
        required: question.required,
      })),
      draft: {
        answers:
          response?.status === 'draft' && response.answers && typeof response.answers === 'object'
            ? response.answers
            : {},
        progress: response?.status === 'draft' ? response.progress : 0,
      },
    };
  }

  async saveDraft(ctx: AuthContext, surveyId: string, input: SaveSurveyDraftInput) {
    const survey = await this.repo.getSurveyDetail(surveyId, ctx.academyId);
    if (!survey) throw new NotFoundError('Survey');
    validateAnswers(survey.questionItems, input.answers);
    const answered = survey.questionItems.filter((question) =>
      answerPresent(input.answers[question.id]),
    ).length;
    const progress = survey.questionItems.length
      ? Math.round((answered / survey.questionItems.length) * 100)
      : input.progress;
    await this.repo.upsertDraft(survey.id, ctx.teacherId, {
      answers: input.answers,
      progress,
    });
    return { id: survey.id, answers: input.answers, progress };
  }

  /**
   * Finalise a survey for this teacher as *submitted*. Idempotent: re-submitting
   * overwrites the same (surveyId, teacherId) row, never duplicating. The survey
   * must belong to the tenant (404 otherwise). Returns the history DTO so the
   * frontend can move the survey from the active list into history in one step.
   */
  async submit(ctx: AuthContext, surveyId: string, input: SubmitSurveyInput) {
    const survey = await this.repo.getSurveyDetail(surveyId, ctx.academyId);
    if (!survey) throw new NotFoundError('Survey');
    validateAnswers(survey.questionItems, input.answers);
    const missingRequired = survey.questionItems.some(
      (question) => question.required && !answerPresent(input.answers[question.id]),
    );
    if (missingRequired) throw new BusinessRuleError('Complete every required survey question');
    const values = Object.values(input.answers);
    const inferredRating = values.find(
      (value): value is number => typeof value === 'number' && value >= 1 && value <= 5,
    );
    const inferredComment = values.find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );
    const response = await this.repo.upsertResponse(surveyId, ctx.teacherId, {
      status: 'submitted',
      rating: input.rating ?? inferredRating ?? null,
      comment: input.comment ?? inferredComment ?? null,
      answers: input.answers,
    });
    return mapHistorySurvey(survey, response);
  }

  /**
   * Finalise a survey for this teacher as *skipped*. Idempotent and tenant-scoped
   * exactly like {@link submit}; carries no rating/comment.
   */
  async skip(ctx: AuthContext, surveyId: string) {
    const survey = await this.repo.getSurvey(surveyId, ctx.academyId);
    if (!survey) throw new NotFoundError('Survey');
    const response = await this.repo.upsertResponse(surveyId, ctx.teacherId, {
      status: 'skipped',
      rating: null,
      comment: null,
      answers: {},
    });
    return mapHistorySurvey(survey, response);
  }
}

function answerPresent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== undefined && value !== null;
}

function validateAnswers(
  questions: Array<{ id: string; kind: string; options: unknown }>,
  answers: Record<string, unknown>,
): void {
  const byId = new Map(questions.map((question) => [question.id, question]));
  for (const [questionId, answer] of Object.entries(answers)) {
    const question = byId.get(questionId);
    if (!question || !validAnswer(question, answer)) {
      throw new BusinessRuleError('Survey contains an invalid answer');
    }
  }
}

function validAnswer(question: { kind: string; options: unknown }, answer: unknown): boolean {
  if (!answerPresent(answer)) return true;
  if (question.kind === 'rating') {
    return typeof answer === 'number' && Number.isInteger(answer) && answer >= 1 && answer <= 5;
  }
  if (question.kind === 'boolean') return answer === 'yes' || answer === 'no';
  if (question.kind === 'text' || question.kind === 'longText') return typeof answer === 'string';

  const values = new Set(
    Array.isArray(question.options)
      ? question.options.flatMap((option) => {
          if (!option || typeof option !== 'object' || Array.isArray(option)) return [];
          const value = (option as Record<string, unknown>).value;
          return typeof value === 'string' ? [value] : [];
        })
      : [],
  );
  if (question.kind === 'single') return typeof answer === 'string' && values.has(answer);
  if (question.kind === 'multi') {
    return (
      Array.isArray(answer) &&
      answer.every((value) => typeof value === 'string' && values.has(value))
    );
  }
  return false;
}
