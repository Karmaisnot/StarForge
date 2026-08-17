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
import { HttpSurveyRepository } from './index.js';

describe('HTTP survey response serialization', () => {
  beforeEach(() => {
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
});
