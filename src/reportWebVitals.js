/**
 * Web Vitals Performance Monitoring
 * Tracks Core Web Vitals and sends to analytics/logging
 */

import webVitalsTracker from './utils/webVitalsTracker';

const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  } else {
    // Default tracking with webVitalsTracker
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      const trackMetric = (metric) => {
        // Tracker'a kaydet
        webVitalsTracker.trackMetric(metric);
        
        // Development'ta console'a da yaz
        if (process.env.NODE_ENV === 'development') {
          console.log(`📊 Web Vitals: ${metric.name} = ${metric.value.toFixed(2)}`);
        }
      };
      
      getCLS(trackMetric);
      getFID(trackMetric);
      getFCP(trackMetric);
      getLCP(trackMetric);
      getTTFB(trackMetric);
    });
  }
};

export default reportWebVitals;
