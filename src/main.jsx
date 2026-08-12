import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope/wght.css';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/ceo/styles/foundation-v2.css';
import { AppProviders } from '@/app/providers/AppProviders.jsx';
import { App } from '@/app/App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
