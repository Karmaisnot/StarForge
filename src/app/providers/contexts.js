import { createContext } from 'react';
import { Palette } from '@/domain/enums.js';
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/locale.js';

export const I18nContext = createContext({
  locale: DEFAULT_LOCALE,
  locales: LOCALES,
  setLocale: () => {},
  t: (key) => key,
});

export const ServicesContext = createContext(null);

export const ThemeContext = createContext({
  palette: Palette.SAROY,
  dark: false,
  setPalette: () => {},
  toggleDark: () => {},
  setDark: () => {},
});

export const ToastContext = createContext({ toast: () => {} });
