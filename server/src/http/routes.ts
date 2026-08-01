import type { FastifyInstance } from 'fastify';
import type { Container } from '../container';
import { authRoutes } from '../modules/auth/auth.routes';
import { accountRoutes } from '../modules/account/account.routes';
import { cohortRoutes } from '../modules/cohorts/cohort.routes';
import { cardsRoutes } from '../modules/cards/cards.routes';
import { taskRoutes } from '../modules/tasks/task.routes';
import { aiRoutes } from '../modules/ai/ai.routes';
import { printRoutes } from '../modules/print/print.routes';
import { surveyRoutes } from '../modules/surveys/survey.routes';
import { mgmtRoutes } from '../modules/mgmt/mgmt.routes';
import { notificationRoutes } from '../modules/notifications/notification.routes';
import { materialRoutes } from '../modules/materials/material.routes';
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes';
import { navigationRoutes } from '../modules/navigation/navigation.routes';
import { workspaceRoutes } from '../modules/workspaces/workspace.routes';

/**
 * Mount every domain's routes under the /api prefix. Each domain exposes a
 * plugin factory that closes over its injected service — routes never reach for
 * a global. New domains are added here as one line each.
 */
export async function registerRoutes(app: FastifyInstance, container: Container): Promise<void> {
  const { services } = container;
  await app.register(
    async (api) => {
      await api.register(authRoutes(services.auth));
      await api.register(accountRoutes(services.account));
      await api.register(cohortRoutes(services.cohorts));
      await api.register(cardsRoutes(services.cards));
      await api.register(taskRoutes(services.tasks));
      await api.register(aiRoutes(services.ai));
      await api.register(printRoutes(services.print));
      await api.register(surveyRoutes(services.surveys));
      await api.register(mgmtRoutes(services.mgmt));
      await api.register(notificationRoutes(services.notifications));
      await api.register(materialRoutes(services.materials));
      await api.register(dashboardRoutes(services.dashboard));
      await api.register(navigationRoutes(services.navigation));
      await api.register(workspaceRoutes(services.workspaces));
    },
    { prefix: '/api' },
  );
}
