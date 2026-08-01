// Composition root — the ONLY module that names concrete repositories.
// VITE_USE_MOCK=false selects the real Http* adapters (the Fastify backend);
// anything else keeps the in-memory mocks. Flipping is a one-flag change here.
import {
  MockAccountRepository,
  MockCohortRepository,
  MockCardRepository,
  MockTaskRepository,
  MockDashboardRepository,
  MockAiRepository,
  MockPrintRepository,
  MockSurveyRepository,
  MockMgmtRepository,
  MockNotificationRepository,
  MockMaterialRepository,
  MockWorkRepository,
  MockFinanceRepository,
  MockPeopleRepository,
  MockAcademicRepository,
  MockOperationsRepository,
} from '@/data/repositories/mock/index.js';
import {
  HttpAccountRepository,
  HttpCohortRepository,
  HttpCardRepository,
  HttpTaskRepository,
  HttpDashboardRepository,
  HttpAiRepository,
  HttpPrintRepository,
  HttpSurveyRepository,
  HttpMgmtRepository,
  HttpNotificationRepository,
  HttpMaterialRepository,
  HttpNavigationRepository,
  HttpWorkRepository,
  HttpFinanceRepository,
  HttpPeopleRepository,
  HttpAcademicRepository,
  HttpOperationsRepository,
} from '@/data/repositories/http/index.js';
import {
  LocalAccountRepository,
  LocalCohortRepository,
  LocalCardRepository,
  LocalTaskRepository,
  LocalDashboardRepository,
  LocalAiRepository,
  LocalPrintRepository,
  LocalSurveyRepository,
  LocalMgmtRepository,
  LocalNotificationRepository,
  LocalMaterialRepository,
  LocalNavigationRepository,
  LocalWorkRepository,
  LocalFinanceRepository,
  LocalPeopleRepository,
  LocalAcademicRepository,
  LocalOperationsRepository,
} from '@/data/repositories/local/index.js';
import { DATA_SOURCE } from '@/data/http/apiConfig.js';

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

function buildRepositories() {
  if (DATA_SOURCE === 'mock') {
    return {
      accountRepo: new MockAccountRepository(),
      cohortRepo: new MockCohortRepository(),
      cardRepo: new MockCardRepository(),
      taskRepo: new MockTaskRepository(),
      dashboardRepo: new MockDashboardRepository(),
      aiRepo: new MockAiRepository(),
      printRepo: new MockPrintRepository(),
      surveyRepo: new MockSurveyRepository(),
      mgmtRepo: new MockMgmtRepository(),
      notificationRepo: new MockNotificationRepository(),
      materialRepo: new MockMaterialRepository(),
      workRepo: new MockWorkRepository(),
      financeRepo: new MockFinanceRepository(),
      peopleRepo: new MockPeopleRepository(),
      academicRepo: new MockAcademicRepository(),
      operationsRepo: new MockOperationsRepository(),
      navRepo: null, // mock mode: NavigationService falls back to the fixture
    };
  }
  if (DATA_SOURCE === 'local') {
    return {
      accountRepo: new LocalAccountRepository(),
      cohortRepo: new LocalCohortRepository(),
      cardRepo: new LocalCardRepository(),
      taskRepo: new LocalTaskRepository(),
      dashboardRepo: new LocalDashboardRepository(),
      aiRepo: new LocalAiRepository(),
      printRepo: new LocalPrintRepository(),
      surveyRepo: new LocalSurveyRepository(),
      mgmtRepo: new LocalMgmtRepository(),
      notificationRepo: new LocalNotificationRepository(),
      materialRepo: new LocalMaterialRepository(),
      workRepo: new LocalWorkRepository(),
      financeRepo: new LocalFinanceRepository(),
      peopleRepo: new LocalPeopleRepository(),
      academicRepo: new LocalAcademicRepository(),
      operationsRepo: new LocalOperationsRepository(),
      navRepo: new LocalNavigationRepository(),
    };
  }
  return {
    accountRepo: new HttpAccountRepository(),
    cohortRepo: new HttpCohortRepository(),
    cardRepo: new HttpCardRepository(),
    taskRepo: new HttpTaskRepository(),
    dashboardRepo: new HttpDashboardRepository(),
    aiRepo: new HttpAiRepository(),
    printRepo: new HttpPrintRepository(),
    surveyRepo: new HttpSurveyRepository(),
    mgmtRepo: new HttpMgmtRepository(),
    notificationRepo: new HttpNotificationRepository(),
    materialRepo: new HttpMaterialRepository(),
    workRepo: new HttpWorkRepository(),
    financeRepo: new HttpFinanceRepository(),
    peopleRepo: new HttpPeopleRepository(),
    academicRepo: new HttpAcademicRepository(),
    operationsRepo: new HttpOperationsRepository(),
    navRepo: new HttpNavigationRepository(),
  };
}

/** Build the service registry. Exposed as a factory so tests can inject fakes. */
export function createContainer() {
  const repos = buildRepositories();
  return {
    account: new AccountService(repos),
    cohorts: new CohortService(repos),
    cards: new CardService(repos),
    tasks: new TaskService(repos),
    dashboard: new DashboardService(repos),
    ai: new AiService(repos),
    print: new PrintService(repos),
    surveys: new SurveyService(repos),
    mgmt: new MgmtService(repos),
    notifications: new NotificationService(repos),
    materials: new MaterialService(repos),
    navigation: new NavigationService(repos.navRepo),
    work: new WorkService(repos),
    finance: new FinanceService(repos),
    people: new PeopleService(repos),
    academic: new AcademicService(repos),
    operations: new OperationsService(repos),
  };
}

/** Default application-wide service container. */
export const services = createContainer();
