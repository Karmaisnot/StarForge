import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockDashboardRepository } from './index.js';

async function resolveMock(promise) {
  await vi.advanceTimersByTimeAsync(250);
  return promise;
}

describe('MockDashboardRepository', () => {
  afterEach(() => vi.useRealTimers());

  it('returns visibly different chart windows for every range control', async () => {
    vi.useFakeTimers();
    const repository = new MockDashboardRepository();

    const sevenDays = await resolveMock(repository.getToday('7d'));
    const thirtyDays = await resolveMock(repository.getToday('30d'));
    const term = await resolveMock(repository.getToday('term'));

    expect(sevenDays.performance.attendanceTrend).toHaveLength(5);
    expect(thirtyDays.performance.attendanceTrend).toHaveLength(10);
    expect(term.performance.attendanceTrend.map((point) => point.label)).toEqual([
      'M1',
      'M2',
      'M3',
      'M4',
      'M5',
    ]);
  });
});
