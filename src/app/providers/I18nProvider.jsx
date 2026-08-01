import { useCallback, useEffect, useMemo, useState } from 'react';
import uz from '@/i18n/locales/uz.js';
import ru from '@/i18n/locales/ru.js';
import en from '@/i18n/locales/en.js';
import {
  DEFAULT_LOCALE,
  LOCALES,
  STORAGE_KEY,
  readStoredLocale,
  setLocaleHolder,
} from '@/i18n/locale.js';
import { I18nContext } from './contexts.js';

const DICTS = { uz, ru, en };

function lookup(dict, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), dict);
}

/** Owns the active locale, persists it, syncs the data-layer holder + <html lang>. */
export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(readStoredLocale);

  // Keep the non-React holder in sync immediately (before first data fetch).
  setLocaleHolder(locale);

  useEffect(() => {
    setLocaleHolder(locale);
    document.documentElement.setAttribute('lang', locale);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const setLocale = useCallback((next) => {
    if (LOCALES.includes(next)) setLocaleState(next);
  }, []);

  const t = useCallback(
    (key) => lookup(DICTS[locale], key) ?? lookup(DICTS[DEFAULT_LOCALE], key) ?? key,
    [locale],
  );

  const value = useMemo(() => ({ locale, locales: LOCALES, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
