import { describe, expect, it } from 'vitest';
import { buildCohortWorkspace, cohortsFixture, rosterFixture } from './cohorts.js';

describe('buildCohortWorkspace', () => {
  it('builds a complete teacher, lesson and attendance workspace', () => {
    const cohort = cohortsFixture[0];
    const roster = rosterFixture[cohort.id];
    const workspace = buildCohortWorkspace(cohort, roster);

    expect(workspace.instructors.map((teacher) => teacher.role)).toEqual([
      'main',
      'video',
      'support',
    ]);
    expect(workspace.instructors.filter((teacher) => teacher.isYou)).toHaveLength(1);
    expect(workspace.upcomingLessons).toHaveLength(3);
    expect(workspace.lastLesson.homework.total).toBe(roster.length);
    expect(workspace.attendanceHistory).toHaveLength(roster.length * 8);
    expect(new Set(workspace.attendanceHistory.map((entry) => entry.id)).size).toBe(
      workspace.attendanceHistory.length,
    );
  });

  it('uses the configured progression unit', () => {
    const levelWorkspace = buildCohortWorkspace(cohortsFixture[0], rosterFixture['9b-algebra']);
    const monthWorkspace = buildCohortWorkspace(cohortsFixture[1], rosterFixture['algebra-mid']);

    expect(levelWorkspace.progression.mode).toBe('level');
    expect(monthWorkspace.progression).toMatchObject({ mode: 'month', current: 4, next: 5 });
  });
});
