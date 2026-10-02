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
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
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
                className: '!bg-inverse-surface !text-inverse-on-surface !text-body-sm !rounded-xl !shadow-lift',
                success: { iconTheme: { primary: '#65dac4', secondary: '#141b2c' } },
              }}
            />
          </ConfirmProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </StrictMode>
);
