import { AccountService } from './AccountService.js';
import { CohortService } from './CohortService.js';
import { CardService } from './CardService.js';
import { TaskService } from './TaskService.js';
import { DashboardService } from './DashboardService.js';
import { AiService } from './AiService.js';
import { PrintService } from './PrintService.js';
import { SurveyService } from './SurveyService.js';
import { MgmtService } from './MgmtService.js';
import { NotificationService } from './NotificationService.js';
import { MaterialService } from './MaterialService.js';
import { NavigationService } from './NavigationService.js';
import { WorkService } from './WorkService.js';
import { FinanceService } from './FinanceService.js';
import { PeopleService } from './PeopleService.js';
import { AcademicService } from './AcademicService.js';
import { OperationsService } from './OperationsService.js';

/** Compose UI services from one selected repository family. */
export function createServices(repositories) {
  return {
    account: new AccountService(repositories),
    cohorts: new CohortService(repositories),
    cards: new CardService(repositories),
    tasks: new TaskService(repositories),
    dashboard: new DashboardService(repositories),
    ai: new AiService(repositories),
    print: new PrintService(repositories),
    surveys: new SurveyService(repositories),
    mgmt: new MgmtService(repositories),
    notifications: new NotificationService(repositories),
    materials: new MaterialService(repositories),
    navigation: new NavigationService(repositories.navRepo),
    work: new WorkService(repositories),
    finance: new FinanceService(repositories),
    people: new PeopleService(repositories),
    academic: new AcademicService(repositories),
    operations: new OperationsService(repositories),
  };
}
