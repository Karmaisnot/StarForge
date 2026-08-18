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

  it('preserves an arbitrary valid two-decimal amount for approval requests', async () => {
    await createTeacherRequest({
      draft: {
        kind: 'procurement',
        title: 'Replacement cable',
        description: 'Purchase one classroom display cable.',
        amount: '232001.37',
        cohort: '',
        student: '',
        from: '',
        to: '',
      },
      type: { amount: true },
      cohorts: [],
      students: [],
    });

    expect(httpClient.post).toHaveBeenCalledWith('approvals/requests/', {
      kind: 'procurement',
      title: 'Replacement cable',
      description: 'Purchase one classroom display cable.',
      amount_uzs: '232001.37',
      payload: {},
    });
  });
});
