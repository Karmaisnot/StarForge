import { Prisma, type PrismaClient } from '@prisma/client';
import {
  createAcademicWorkspace,
  createFinanceWorkspace,
  createOperationsWorkspace,
  createPeopleWorkspace,
  createWorkWorkspace,
} from '../../src/modules/workspaces/workspace.defaults';

/** Seed the persisted workspace documents once. New staff get user-scoped docs lazily. */
export async function seedWorkspaces(db: PrismaClient): Promise<void> {
  await db.workspaceState.createMany({
    data: [
      {
        academyId: 'acad-demo',
        scope: 'teacher:teacher-nigora',
        feature: 'work',
        data: createWorkWorkspace() as unknown as Prisma.InputJsonValue,
      },
      {
        academyId: 'acad-demo',
        scope: 'academy',
        feature: 'finance',
        data: createFinanceWorkspace() as unknown as Prisma.InputJsonValue,
      },
      {
        academyId: 'acad-demo',
        scope: 'academy',
        feature: 'people',
        data: createPeopleWorkspace() as unknown as Prisma.InputJsonValue,
      },
      {
        academyId: 'acad-demo',
        scope: 'academy',
        feature: 'academic',
        data: createAcademicWorkspace() as unknown as Prisma.InputJsonValue,
      },
      {
        academyId: 'acad-demo',
        scope: 'teacher:teacher-nigora',
        feature: 'operations',
        data: createOperationsWorkspace() as unknown as Prisma.InputJsonValue,
      },
    ],
  });
}
