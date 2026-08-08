import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { SessionGate } from '@/app/SessionGate.jsx';
import { RouteErrorPage } from '@/app/RouteErrorPage.jsx';
import { AppShell } from '@/layout/AppShell.jsx';
import { PageLoading } from '@/layout/PageState.jsx';
import { DATA_SOURCE } from '@/data/http/apiConfig.js';

const lazyNamed = (load, name) => lazy(() => load().then((module) => ({ default: module[name] })));
const LoginPage = lazyNamed(() => import('@/features/auth/LoginPage.jsx'), 'LoginPage');
const TodayPage = lazyNamed(() => import('@/features/today/TodayPage.jsx'), 'TodayPage');
const CohortsPage = lazyNamed(() => import('@/features/cohorts/CohortsPage.jsx'), 'CohortsPage');
const TasksPage = lazyNamed(() => import('@/features/tasks/TasksPage.jsx'), 'TasksPage');
const AiPage = lazyNamed(() => import('@/features/ai/AiPage.jsx'), 'AiPage');
const PrintPage = lazyNamed(() => import('@/features/print/PrintPage.jsx'), 'PrintPage');
const SurveysPage = lazyNamed(() => import('@/features/surveys/SurveysPage.jsx'), 'SurveysPage');
const MessagesPage = lazyNamed(() => import('@/features/messages/MessagesPage.jsx'), 'MessagesPage');
const MaterialsPage = lazyNamed(() => import('@/features/materials/MaterialsPage.jsx'), 'MaterialsPage');
const SettingsPage = lazyNamed(() => import('@/features/settings/SettingsPage.jsx'), 'SettingsPage');
const WorkPage = lazyNamed(() => import('@/features/work/WorkPage.jsx'), 'WorkPage');
const FinancePage = lazyNamed(() => import('@/features/finance/FinancePage.jsx'), 'FinancePage');
const PeoplePage = lazyNamed(() => import('@/features/people/PeoplePage.jsx'), 'PeoplePage');
const AcademicPage = lazyNamed(() => import('@/features/academic/AcademicPage.jsx'), 'AcademicPage');
const OperationsPage = lazyNamed(() => import('@/features/operations/OperationsPage.jsx'), 'OperationsPage');
const ResourceWorkspacePage = lazyNamed(
  () => import('@/features/resources/ResourceWorkspacePage.jsx'),
  'ResourceWorkspacePage',
);

const page = (element) => <Suspense fallback={<PageLoading />}>{element}</Suspense>;
const remote = DATA_SOURCE === 'remote';
const resourcePage = () => (remote ? page(<ResourceWorkspacePage />) : <Navigate to="/today" replace />);
const legacyOrResource = (legacy) => (remote ? page(<ResourceWorkspacePage />) : page(legacy));
const legacyOrToday = (legacy) => (remote ? <Navigate to="/today" replace /> : page(legacy));
const legacyOrPath = (legacy, path) => (remote ? <Navigate to={path} replace /> : page(legacy));

export const router = createBrowserRouter([
  {
    path: 'login',
    element: page(<LoginPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    element: <SessionGate />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/today" replace /> },
          { path: 'today', element: page(<TodayPage />) },

          // Production resource workspaces: every route below maps directly to
          // an endpoint in the supplied Django tenant backend.
          { path: 'students', element: resourcePage() },
          { path: 'staff', element: resourcePage() },
          { path: 'teachers', element: resourcePage() },
          { path: 'parents', element: resourcePage() },
          { path: 'schedule', element: resourcePage() },
          { path: 'attendance', element: resourcePage() },
          { path: 'academics', element: resourcePage() },
          { path: 'assignments', element: resourcePage() },
          { path: 'content', element: resourcePage() },
          { path: 'payments', element: resourcePage() },
          { path: 'printing', element: resourcePage() },
          { path: 'reports', element: resourcePage() },
          { path: 'audit', element: resourcePage() },
          { path: 'organization/branches', element: resourcePage() },
          { path: 'organization/departments', element: resourcePage() },

          // Existing routes remain usable for the local development server and
          // isolated visual mode; their remote counterparts use the real API
          // resource workspace instead of the previous mock contracts.
          { path: 'cohorts', element: legacyOrResource(<CohortsPage />) },
          { path: 'cohorts/:cohortId', element: legacyOrResource(<CohortsPage />) },
          { path: 'finance', element: legacyOrResource(<FinancePage />) },
          { path: 'ai', element: legacyOrResource(<AiPage />) },
          { path: 'notifications', element: legacyOrResource(<TodayPage />) },
          { path: 'academic', element: legacyOrPath(<AcademicPage />, '/academics') },
          { path: 'materials', element: legacyOrPath(<MaterialsPage />, '/content') },
          { path: 'print', element: legacyOrPath(<PrintPage />, '/printing') },
          { path: 'people', element: legacyOrPath(<PeoplePage />, '/students') },
          { path: 'people/students/:personId', element: legacyOrPath(<PeoplePage />, '/students') },
          { path: 'people/parents/:personId', element: legacyOrPath(<PeoplePage />, '/parents') },
          { path: 'operations', element: legacyOrToday(<OperationsPage />) },
          { path: 'work', element: legacyOrToday(<WorkPage />) },
          { path: 'tasks', element: legacyOrToday(<TasksPage />) },
          { path: 'surveys', element: legacyOrToday(<SurveysPage />) },
          { path: 'surveys/:surveyId', element: legacyOrToday(<SurveysPage />) },
          { path: 'messages', element: legacyOrToday(<MessagesPage />) },
          { path: 'mgmt', element: legacyOrPath(<Navigate to="/messages?scope=management" replace />, '/today') },
          { path: 'cards', element: legacyOrPath(<Navigate to="/cohorts" replace />, '/today') },
          { path: 'settings', element: page(<SettingsPage />) },
          { path: '*', element: <Navigate to="/today" replace /> },
        ],
      },
    ],
  },
]);
