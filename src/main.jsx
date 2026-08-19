import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope/wght.css';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/ceo/styles/foundation-v2.css';
import '@/styles/brand.css';
import { AppProviders } from '@/app/providers/AppProviders.jsx';
import { App } from '@/app/App.jsx';
import { isolatedDevelopmentUrl } from '@/lib/devOrigin.js';

const isolatedUrl = import.meta.env.DEV
  ? isolatedDevelopmentUrl(window.location, import.meta.env.VITE_DEV_APP_HOST || 'staff.localhost')
  : '';

if (isolatedUrl) {
  window.location.replace(isolatedUrl);
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  );
}
