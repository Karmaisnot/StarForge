import { getActiveQueryClient } from '@/app/providers/queryClientBridge.js';

function normalizedParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, String(value)]),
  );
}

export function apiQueryKey(path, params, language = 'en') {
  return [
    'api',
    String(language || 'en').split('-')[0],
    String(path || ''),
    normalizedParams(params),
  ];
}

export const queryClient = {
  invalidateQueries(options) {
    return getActiveQueryClient()?.invalidateQueries(options) ?? Promise.resolve();
  },
  removeQueries(options) {
    return getActiveQueryClient()?.removeQueries(options);
  },
};
