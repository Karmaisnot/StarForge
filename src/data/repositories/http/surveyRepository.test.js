import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/data/http/httpClient.js', () => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { httpClient } from '@/data/http/httpClient.js';
import { HttpSurveyRepository, HttpWorkRepository } from './index.js';

describe('HTTP survey response serialization', () => {
  beforeEach(() => {
    httpClient.get.mockReset();
    httpClient.post.mockReset().mockResolvedValue({ id: 91 });
  });

  it('sends yes and no answers as JSON booleans', async () => {
    const repository = new HttpSurveyRepository();

    await repository.submit(42, {
      answers: { 17: true, 18: false },
    });

    expect(httpClient.post).toHaveBeenCalledWith('forms/42/submit/', {
      answers: [
        { field: 17, value: true },
        { field: 18, value: false },
      ],
    });
  });

  it('submits the actual option text instead of its visual position', async () => {
    httpClient.get.mockResolvedValue({
      id: 42,
      title: 'Availability',
      form_fields: [
        { id: 17, label: 'Days', field_type: 'multi_choice', options: ['Monday', 'Tuesday'] },
      ],
    });
    const repository = new HttpSurveyRepository();
    const form = await repository.getDetail(42);

    expect(form.questions[0].options).toEqual([
      { value: 'Monday', label: 'Monday' },
      { value: 'Tuesday', label: 'Tuesday' },
    ]);

    await repository.submit(42, { answers: { 17: ['Tuesday'] } });
    expect(httpClient.post).toHaveBeenLastCalledWith('forms/42/submit/', {
      answers: [{ field: 17, value: ['Tuesday'] }],
    });
  });
});

describe('HTTP work workspace pagination', () => {
  beforeEach(() => {
    httpClient.get.mockReset().mockImplementation((path) => {
      if (path === 'users/me/') {
        return Promise.resolve({ id: 7, account_kind: 'staff', role: 'assistant' });
      }
      return Promise.resolve({ count: 0, results: [] });
    });
  });

  it('never asks the production API for more than its 100-record limit', async () => {
    await new HttpWorkRepository().getWorkspace();

    const requestedPaths = httpClient.get.mock.calls.map(([path]) => path);
    expect(requestedPaths.some((path) => path.includes('schedule/lessons/') && path.includes('page_size=100'))).toBe(true);
    expect(requestedPaths).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/page_size=(?:10[1-9]|1[1-9]\d|[2-9]\d{2,})/)]),
    );
  });
});
