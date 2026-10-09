import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { store, fetchMe } from './store';
import { ConfirmProvider } from './components/ui';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (count, err) => err?.status >= 500 && count < 2,
    },
  },
});

store.dispatch(fetchMe());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ConfirmProvider>
            <App />
            <Toaster
              position="top-center"
              containerStyle={{ top: 72 }}
              toastOptions={{
                className: '!bg-inverse-surface !text-inverse-on-surface !text-body-sm !rounded-full !px-4 !shadow-lift',
                success: { iconTheme: { primary: 'rgb(var(--c-accent))', secondary: 'rgb(var(--c-on-accent))' } },
                error: { iconTheme: { primary: 'rgb(var(--c-error))', secondary: 'rgb(var(--c-on-error))' } },
              }}
            />
          </ConfirmProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </StrictMode>
);

if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('SW registration error:', err);
    });
  });
}
