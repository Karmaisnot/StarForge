import { useContext } from 'react';
import { ThemeContext } from '@/app/providers/contexts.js';

/** Read/update palette + dark mode. */
export function useTheme() {
  return useContext(ThemeContext);
}
