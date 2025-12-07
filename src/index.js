import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import errorTracker from './utils/errorTracker';
import logger from './utils/logger';

// Global error handlers
window.addEventListener('error', (event) => {
  errorTracker.trackError(event.error || event, {
    component: 'Global',
    action: 'unhandled',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorTracker.trackError(event.reason, {
    component: 'Global',
    action: 'unhandledRejection',
    promise: true
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 dakika cache
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Development mode: Log error tracker status
if (process.env.NODE_ENV === 'development') {
  logger.info('Error tracking initialized');
}
