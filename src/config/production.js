// Production configuration
export const PRODUCTION_CONFIG = {
  NODE_ENV: 'production',
  VERSION: '1.0.0',
  BUILD_DATE: '2025-01-21',
  ENVIRONMENT: 'production',
  ENABLE_LOGGING: false,
  ENABLE_DEBUG: false,
  ENABLE_PERFORMANCE_MONITORING: true,
  BUNDLE_ANALYZER: false
};

// Environment check
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';

// Performance monitoring
export const shouldEnablePerformanceMonitoring = () => {
  return isProduction && PRODUCTION_CONFIG.ENABLE_PERFORMANCE_MONITORING;
};

// Logging configuration
export const shouldEnableLogging = () => {
  return !isProduction || PRODUCTION_CONFIG.ENABLE_LOGGING;
};

