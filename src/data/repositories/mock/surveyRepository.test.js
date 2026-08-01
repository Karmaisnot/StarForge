import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockSurveyRepository } from './index.js';

async function resolveMock(promise) {
  await vi.advanceTimersByTimeAsync(250);
  return promise;
}

describe('MockSurveyRepository', () => {
  afterEach(() => vi.useRealTimers());

  it('resumes a draft, saves answers and moves a submission to history', async () => {
    vi.useFakeTimers();
    const repository = new MockSurveyRepository();

    const detail = await resolveMock(repository.getDetail('sv1'));
    expect(detail.questions).toHaveLength(12);
    expect(Object.keys(detail.draft.answers)).toHaveLength(4);
    expect(detail.draft.progress).toBe(33);

    const answers = { ...detail.draft.answers, 'sv1-q5': ['technology'] };
    await resolveMock(repository.saveDraft('sv1', { answers, progress: 42 }));
    const resumed = await resolveMock(repository.getDetail('sv1'));
    expect(resumed.draft).toEqual({ answers, progress: 42 });

    await resolveMock(repository.submit('sv1', { answers }));
    const active = await resolveMock(repository.listActive());
    const history = await resolveMock(repository.listHistory());
    expect(active.some((survey) => survey.id === 'sv1')).toBe(false);
    expect(history[0]).toMatchObject({ skipped: false, answers });
  });
});
