import { I18nProvider } from './I18nProvider.jsx';
import { ThemeProvider } from './ThemeProvider.jsx';
import { ServicesProvider } from './ServicesProvider.jsx';
import { ToastProvider } from './ToastProvider.jsx';
import { QueryProvider } from './QueryProvider.jsx';

/** Composes the cross-cutting providers around the app tree. */
export function AppProviders({ children }) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ServicesProvider>
          <QueryProvider>
            <ToastProvider>{children}</ToastProvider>
          </QueryProvider>
        </ServicesProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
