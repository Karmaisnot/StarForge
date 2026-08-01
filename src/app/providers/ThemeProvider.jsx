import { useCallback, useEffect, useMemo, useState } from 'react';
import { Palette } from '@/domain/enums.js';
import { ThemeContext } from './contexts.js';

const STORAGE_KEY = 'sf-theme';
const DEFAULT = { palette: Palette.SAROY, dark: false };

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const saved = JSON.parse(raw);
    const palettes = Object.values(Palette);
    return {
      palette: palettes.includes(saved?.palette) ? saved.palette : DEFAULT.palette,
      dark: typeof saved?.dark === 'boolean' ? saved.dark : DEFAULT.dark,
    };
  } catch {
    return DEFAULT;
  }
}

/** Owns palette + dark-mode, persists them, and reflects them onto <html>. */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStored);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-palette', theme.palette);
    root.setAttribute('data-theme', theme.dark ? 'dark' : 'light');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch {
      /* ignore quota / privacy-mode failures */
    }
  }, [theme]);

  const setPalette = useCallback((palette) => setTheme((t) => ({ ...t, palette })), []);
  const setDark = useCallback((dark) => setTheme((t) => ({ ...t, dark })), []);
  const toggleDark = useCallback(() => setTheme((t) => ({ ...t, dark: !t.dark })), []);

  const value = useMemo(
    () => ({ ...theme, setPalette, setDark, toggleDark }),
    [theme, setPalette, setDark, toggleDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
