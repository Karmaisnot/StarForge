import { useContext } from 'react';
import { I18nContext } from '@/app/providers/contexts.js';

/** Translation access: `const { t, locale, setLocale } = useT();`. */
export function useT() {
  return useContext(I18nContext);
}
