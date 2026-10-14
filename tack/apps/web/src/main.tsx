import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/hanken-grotesk';
import './index.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import { App } from './App';
import { meKey } from './features/auth/session';
import { onUnauthorized } from './lib/api';
import { queryClient } from './lib/queryClient';
import { ThemeProvider, useTheme } from './lib/theme';

// A 401 anywhere else means the session expired: dropping the user sends the router to /login.
onUnauthorized(() => queryClient.setQueryData(meKey, null));

function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster theme={resolved} position="bottom-right" closeButton />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <ThemedToaster />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
