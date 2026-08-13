import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/data/http/httpClient.js';
import { createTeacherRequest } from './teacherRequestApi.js';

vi.mock('@/data/http/httpClient.js', () => ({
  httpClient: { post: vi.fn() },
}));

describe('createTeacherRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    httpClient.post.mockResolvedValue({ id: 41 });
  });

  it('uses the authenticated loan self-service endpoint', async () => {
    await createTeacherRequest({
      draft: {
        kind: 'loan',
        title: '  Salary bridge  ',
        description: '  August advance  ',
        amount: '750000',
        cohort: '',
        student: '',
        from: '',
        to: '',
      },
      type: { amount: true },
      cohorts: [],
      students: [],
    });

    expect(httpClient.post).toHaveBeenCalledWith('loans/', {
      title: 'Salary bridge',
      description: 'August advance',
      amount_uzs: '750000',
    });
    expect(httpClient.post.mock.calls[0][1]).not.toHaveProperty('borrower_id');
  });
});
