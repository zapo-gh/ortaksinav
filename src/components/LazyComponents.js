import React, { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';

// Lazy loading için fallback component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
    <CircularProgress />
  </Box>
);

// Lazy loaded components
export const LazyTestDashboard = lazy(() => import('./TestDashboard'));
export const LazyDatabaseTest = lazy(() => import('./DatabaseTest'));
export const LazyWelcomePage = lazy(() => import('./WelcomePage'));

// HOC for lazy loading with Suspense
export const withLazyLoading = (Component) => {
  return (props) => (
    <Suspense fallback={<LoadingFallback />}>
      <Component {...props} />
    </Suspense>
  );
};

// Lazy loaded components with Suspense
export const TestDashboardLazy = withLazyLoading(LazyTestDashboard);
export const DatabaseTestLazy = withLazyLoading(LazyDatabaseTest);
export const WelcomePageLazy = withLazyLoading(LazyWelcomePage);






