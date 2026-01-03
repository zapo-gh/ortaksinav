import React, { lazy, Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';

// Lazy loading için fallback component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
    <CircularProgress />
  </Box>
);

// Lazy loaded components - Test/Debug components
// DatabaseTest sadece development'ta kullanılabilir (production'da test planları oluşturma riski var)
export const LazyTestDashboard = lazy(() => import('./TestDashboard'));
export const LazyDatabaseTest = process.env.NODE_ENV === 'development'
  ? lazy(() => import('./DatabaseTest'))
  : lazy(() => Promise.resolve({ default: () => <div>Test paneli sadece development modunda kullanılabilir</div> }));
export const LazyWelcomePage = lazy(() => import('./WelcomePage'));

// Lazy loaded components - Main application components (Code splitting)
export const LazySalonPlani = lazy(() => import('./SalonPlani'));
export const LazyPlanlamaYap = lazy(() => import('./PlanlamaYap'));
export const LazySabitAtamalar = lazy(() => import('./SabitAtamalar'));
export const LazyKayitliPlanlar = lazy(() => import('./KayitliPlanlar'));


// HOC for lazy loading with Suspense
export const withLazyLoading = (Component) => {
  return (props) => (
    <Suspense fallback={<LoadingFallback />}>
      <Component {...props} />
    </Suspense>
  );
};

// Lazy loaded components with Suspense - Test/Debug
export const TestDashboardLazy = withLazyLoading(LazyTestDashboard);
export const DatabaseTestLazy = withLazyLoading(LazyDatabaseTest);
export const WelcomePageLazy = withLazyLoading(LazyWelcomePage);

// Lazy loaded components with Suspense - Main application
export const SalonPlaniLazy = withLazyLoading(LazySalonPlani);
export const PlanlamaYapLazy = withLazyLoading(LazyPlanlamaYap);
export const SabitAtamalarLazy = withLazyLoading(LazySabitAtamalar);
export const KayitliPlanlarLazy = withLazyLoading(LazyKayitliPlanlar);















