import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useOutletContext } from 'react-router-dom';
import { SessionGate } from '@/app/SessionGate.jsx';
import { RouteErrorPage } from '@/app/RouteErrorPage.jsx';
import { PageLoading } from '@/layout/PageState.jsx';
import { DATA_SOURCE } from '@/data/http/apiConfig.js';
import { isTeacherWorkspace } from '@/layout/navConfig.js';

const lazyNamed = (load, name) => lazy(() => load().then((module) => ({ default: module[name] })));
const LoginPage = lazyNamed(() => import('@/features/auth/LoginPage.jsx'), 'LoginPage');
const PasswordChangePage = lazyNamed(
  () => import('@/features/auth/PasswordChangePage.jsx'),
  'PasswordChangePage',
);
const AppShell = lazyNamed(() => import('@/layout/AppShell.jsx'), 'AppShell');
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
const StaffStudentsWorkspace = lazyNamed(
  () => import('@/features/ceo/CeoPeopleWorkspaces.jsx'),
  'StaffStudentsWorkspace',
);
const StaffGroupsWorkspace = lazyNamed(
  () => import('@/features/ceo/CeoPeopleWorkspaces.jsx'),
  'StaffGroupsWorkspace',
);
const StaffAccountWorkspace = lazyNamed(
  () => import('@/features/ceo/CeoAccountWorkspace.jsx'),
  'StaffAccountWorkspace',
);
const TeacherRequestsPage = lazyNamed(
  () => import('@/features/workflows/TeacherWorkflowPages.jsx'),
  'TeacherRequestsPage',
);
const TeacherReportsPage = lazyNamed(
  () => import('@/features/workflows/TeacherWorkflowPages.jsx'),
  'TeacherReportsPage',
);
const TeacherRecognitionPage = lazyNamed(
  () => import('@/features/workflows/TeacherWorkflowPages.jsx'),
  'TeacherRecognitionPage',
);

const page = (element) => <Suspense fallback={<PageLoading />}>{element}</Suspense>;
const remote = DATA_SOURCE === 'remote';
const resourcePage = () => page(<ResourceWorkspacePage />);

function TeacherWorkflowRoute({ component: Component }) {
  const { profile } = useOutletContext() ?? {};
  return isTeacherWorkspace(profile) ? <Component /> : <ResourceWorkspacePage />;
}

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
      { path: 'change-password', element: page(<PasswordChangePage />) },
      {
        element: page(<AppShell />),
        children: [
          { index: true, element: <Navigate to="/today" replace /> },
          { path: 'today', element: page(<TodayPage />) },

          // Production workspaces are generated from the contract-backed
          // catalogue so new role domains cannot silently miss a route.
          // Existing routes remain usable for the local development server and
          // isolated visual mode; their remote counterparts use the real API
          // resource workspace instead of the previous mock contracts.
          ...(remote
            ? [
                { path: 'students/*', element: page(<StaffStudentsWorkspace />) },
                { path: 'cohorts/*', element: page(<StaffGroupsWorkspace />) },
                { path: 'tasks/*', element: page(<TasksPage />) },
                { path: 'messages/*', element: page(<MessagesPage />) },
                { path: 'content/*', element: page(<MaterialsPage />) },
                { path: 'forms', element: page(<SurveysPage />) },
                { path: 'forms/:surveyId', element: page(<SurveysPage />) },
                { path: 'approvals/*', element: page(<TeacherWorkflowRoute component={TeacherRequestsPage} />) },
                { path: 'reports/*', element: page(<TeacherWorkflowRoute component={TeacherReportsPage} />) },
                { path: 'recognition/*', element: page(<TeacherWorkflowRoute component={TeacherRecognitionPage} />) },
                { path: 'printing/*', element: page(<PrintPage />) },
                { path: 'academic', element: <Navigate to="/academics" replace /> },
                { path: 'materials', element: <Navigate to="/content" replace /> },
                { path: 'print', element: <Navigate to="/printing" replace /> },
                { path: 'people/*', element: <Navigate to="/students" replace /> },
                { path: 'work', element: page(<WorkPage />) },
                { path: 'surveys', element: <Navigate to="/forms" replace /> },
                { path: 'surveys/:surveyId', element: page(<SurveysPage />) },
                { path: 'mgmt', element: <Navigate to="/messages?scope=management" replace /> },
              ]
            : [
                { path: 'cohorts', element: page(<CohortsPage />) },
                { path: 'cohorts/:cohortId', element: page(<CohortsPage />) },
                { path: 'finance', element: page(<FinancePage />) },
                { path: 'ai', element: page(<AiPage />) },
                { path: 'notifications', element: page(<TodayPage />) },
                { path: 'academic', element: page(<AcademicPage />) },
                { path: 'materials', element: page(<MaterialsPage />) },
                { path: 'print', element: page(<PrintPage />) },
                { path: 'people', element: page(<PeoplePage />) },
                { path: 'people/students/:personId', element: page(<PeoplePage />) },
                { path: 'people/parents/:personId', element: page(<PeoplePage />) },
                { path: 'operations', element: page(<OperationsPage />) },
                { path: 'work', element: page(<WorkPage />) },
                { path: 'tasks', element: page(<TasksPage />) },
                { path: 'surveys', element: page(<SurveysPage />) },
                { path: 'surveys/:surveyId', element: page(<SurveysPage />) },
                { path: 'messages', element: page(<MessagesPage />) },
                {
                  path: 'mgmt',
                  element: <Navigate to="/messages?scope=management" replace />,
                },
                { path: 'cards', element: <Navigate to="/cohorts" replace /> },
              ]),
          {
            path: 'settings',
            element: remote
              ? <Navigate to="/account/workspace" replace />
              : page(<SettingsPage />),
          },
          {
            path: 'account/*',
            element: remote
              ? page(<StaffAccountWorkspace />)
              : <Navigate to="/settings" replace />,
          },
          {
            path: '*',
            element: remote ? resourcePage() : <Navigate to="/today" replace />,
          },
        ],
      },
    ],
  },
]);
