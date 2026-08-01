import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { SessionGate } from '@/app/SessionGate.jsx';
import { RouteErrorPage } from '@/app/RouteErrorPage.jsx';
import { AppShell } from '@/layout/AppShell.jsx';
import { PageLoading } from '@/layout/PageState.jsx';

const lazyNamed = (load, name) => lazy(() => load().then((module) => ({ default: module[name] })));
const LoginPage = lazyNamed(() => import('@/features/auth/LoginPage.jsx'), 'LoginPage');
const TodayPage = lazyNamed(() => import('@/features/today/TodayPage.jsx'), 'TodayPage');
const CohortsPage = lazyNamed(() => import('@/features/cohorts/CohortsPage.jsx'), 'CohortsPage');
const TasksPage = lazyNamed(() => import('@/features/tasks/TasksPage.jsx'), 'TasksPage');
const AiPage = lazyNamed(() => import('@/features/ai/AiPage.jsx'), 'AiPage');
const PrintPage = lazyNamed(() => import('@/features/print/PrintPage.jsx'), 'PrintPage');
const SurveysPage = lazyNamed(() => import('@/features/surveys/SurveysPage.jsx'), 'SurveysPage');
const MessagesPage = lazyNamed(
  () => import('@/features/messages/MessagesPage.jsx'),
  'MessagesPage',
);
const MaterialsPage = lazyNamed(
  () => import('@/features/materials/MaterialsPage.jsx'),
  'MaterialsPage',
);
const SettingsPage = lazyNamed(
  () => import('@/features/settings/SettingsPage.jsx'),
  'SettingsPage',
);
const WorkPage = lazyNamed(() => import('@/features/work/WorkPage.jsx'), 'WorkPage');
const FinancePage = lazyNamed(() => import('@/features/finance/FinancePage.jsx'), 'FinancePage');
const PeoplePage = lazyNamed(() => import('@/features/people/PeoplePage.jsx'), 'PeoplePage');
const AcademicPage = lazyNamed(
  () => import('@/features/academic/AcademicPage.jsx'),
  'AcademicPage',
);
const OperationsPage = lazyNamed(
  () => import('@/features/operations/OperationsPage.jsx'),
  'OperationsPage',
);

const page = (element) => <Suspense fallback={<PageLoading />}>{element}</Suspense>;

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
          { path: 'work', element: page(<WorkPage />) },
          { path: 'academic', element: page(<AcademicPage />) },
          { path: 'operations', element: page(<OperationsPage />) },
          { path: 'finance', element: page(<FinancePage />) },
          { path: 'people', element: page(<PeoplePage />) },
          { path: 'people/students/:personId', element: page(<PeoplePage />) },
          { path: 'people/parents/:personId', element: page(<PeoplePage />) },
          { path: 'cohorts', element: page(<CohortsPage />) },
          { path: 'cohorts/:cohortId', element: page(<CohortsPage />) },
          { path: 'tasks', element: page(<TasksPage />) },
          { path: 'ai', element: page(<AiPage />) },
          { path: 'print', element: page(<PrintPage />) },
          { path: 'surveys', element: page(<SurveysPage />) },
          { path: 'surveys/:surveyId', element: page(<SurveysPage />) },
          { path: 'messages', element: page(<MessagesPage />) },
          { path: 'mgmt', element: <Navigate to="/messages?scope=management" replace /> },
          { path: 'cards', element: <Navigate to="/cohorts" replace /> },
          { path: 'materials', element: page(<MaterialsPage />) },
          { path: 'notifications', element: <Navigate to="/today?notifications=open" replace /> },
          { path: 'settings', element: page(<SettingsPage />) },
          { path: '*', element: <Navigate to="/today" replace /> },
        ],
      },
    ],
  },
]);
