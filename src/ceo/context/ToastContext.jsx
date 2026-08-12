import { useMemo } from 'react';
import { useToast as useStaffToast } from '@/hooks/useToast.js';

function message(value, options) {
  const body = typeof value === 'string' ? value : value?.message ?? '';
  const title = options?.title ?? (typeof value === 'object' ? value?.title : '');
  return title && body ? `${title} — ${body}` : title || body;
}

function useToastAdapter() {
  const notify = useStaffToast();
  return useMemo(
    () => ({
      success: (value, options) => notify(message(value, options), 'success'),
      warning: (value, options) => notify(message(value, options), 'default'),
      danger: (value, options) => notify(message(value, options), 'danger'),
      info: (value, options) => notify(message(value, options), 'default'),
    }),
    [notify],
  );
}

export function useToast() {
  return useToastAdapter();
}

export function useOptionalToast() {
  return useToastAdapter();
}
