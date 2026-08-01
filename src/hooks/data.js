// Explicit TanStack Query keys keep data cached across route transitions and
// prevent unrelated workspaces from invalidating one another.
import { useQuery } from '@tanstack/react-query';
import { useServices } from './useServices.js';
import { useT } from './useT.js';

export const queryKeys = {
  teacher: (locale) => ['account', 'teacher', locale],
  badges: () => ['navigation', 'badges'],
  today: (locale, range = '7d') => ['dashboard', 'today', locale, range],
  cohorts: (locale) => ['cohorts', locale],
  cohort: (locale, id) => ['cohorts', locale, id],
  roster: (locale, id) => ['cohorts', locale, id, 'roster'],
  notifications: (locale) => ['notifications', locale],
};

function state(query) {
  return {
    ...query,
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error ?? null,
  };
}

export function useTeacher() {
  const { account } = useServices();
  const { locale } = useT();
  return state(
    useQuery({ queryKey: queryKeys.teacher(locale), queryFn: () => account.getTeacher() }),
  );
}

export function useNavBadges() {
  const { navigation } = useServices();
  return state(useQuery({ queryKey: queryKeys.badges(), queryFn: () => navigation.getBadges() }));
}

export function useToday(range = '7d') {
  const { dashboard } = useServices();
  const { locale } = useT();
  return state(
    useQuery({
      queryKey: queryKeys.today(locale, range),
      queryFn: () => dashboard.getToday(range),
    }),
  );
}

export function useCohorts() {
  const { cohorts } = useServices();
  const { locale } = useT();
  return state(useQuery({ queryKey: queryKeys.cohorts(locale), queryFn: () => cohorts.list() }));
}

export function useCohort(cohortId) {
  const { cohorts } = useServices();
  const { locale } = useT();
  return state(
    useQuery({
      queryKey: queryKeys.cohort(locale, cohortId),
      queryFn: () => cohorts.getById(cohortId),
      enabled: Boolean(cohortId),
    }),
  );
}

export function useRoster(cohortId) {
  const { cohorts } = useServices();
  const { locale } = useT();
  const query = useQuery({
    queryKey: queryKeys.roster(locale, cohortId),
    queryFn: () => cohorts.getRoster(cohortId),
    enabled: Boolean(cohortId),
  });
  return { ...state(query), data: query.data ?? [] };
}

export function useAiPage() {
  const { ai } = useServices();
  const { locale } = useT();
  return state(
    useQuery({
      queryKey: ['ai', 'workspace', locale],
      queryFn: () =>
        Promise.all([
          ai.getConversations(),
          ai.getUsage(),
          ai.getWorkspace(),
          ai.getActiveConversation(),
        ]).then(([conversations, usage, workspace, active]) => ({
          conversations,
          usage,
          workspace,
          active,
        })),
    }),
  );
}

export function usePrintPage() {
  const { print } = useServices();
  const { locale } = useT();
  return state(
    useQuery({
      queryKey: ['print', locale],
      queryFn: () =>
        Promise.all([print.getPrinters(), print.getJobs(), print.getLibrary()]).then(
          ([printers, jobs, library]) => ({ printers, jobs, library }),
        ),
    }),
  );
}

export function useSurveysPage() {
  const { surveys } = useServices();
  const { locale } = useT();
  return state(
    useQuery({
      queryKey: ['surveys', locale],
      queryFn: () =>
        Promise.all([surveys.getActive(), surveys.getHistory()]).then(([active, history]) => ({
          active,
          history,
        })),
    }),
  );
}

export function useMgmtThreads() {
  const { mgmt } = useServices();
  const { locale } = useT();
  return state(
    useQuery({ queryKey: ['messages', 'threads', locale], queryFn: () => mgmt.getThreads() }),
  );
}

export function useMgmtTranscript(threadId) {
  const { mgmt } = useServices();
  const { locale } = useT();
  return state(
    useQuery({
      queryKey: ['messages', 'thread', threadId, locale],
      queryFn: () => mgmt.getTranscript(threadId),
      enabled: threadId != null,
    }),
  );
}

export function useNotificationsPage() {
  const { notifications } = useServices();
  const { locale } = useT();
  return state(
    useQuery({
      queryKey: queryKeys.notifications(locale),
      queryFn: () =>
        Promise.all([notifications.getGroups(), notifications.getFilters()]).then(
          ([groups, filters]) => ({ groups, filters }),
        ),
    }),
  );
}

export function useMaterialsPage() {
  const { materials } = useServices();
  const { locale } = useT();
  return state(
    useQuery({
      queryKey: ['materials', locale],
      queryFn: () =>
        Promise.all([materials.getList(), materials.getStats(), materials.getStorage()]).then(
          ([list, stats, storage]) => ({ list, stats, storage }),
        ),
    }),
  );
}

export function useAcademicPage(revision = 0) {
  const { academic } = useServices();
  const { locale } = useT();
  return state(
    useQuery({
      queryKey: ['academic', locale, revision],
      queryFn: () => academic.getWorkspace(),
    }),
  );
}

export function useOperationsPage(revision = 0) {
  const { operations } = useServices();
  const { locale } = useT();
  return state(
    useQuery({
      queryKey: ['operations', locale, revision],
      queryFn: () => operations.getWorkspace(),
    }),
  );
}
