/**
 * Performance monitoring utilities
 * Production'da performans metriklerini takip eder
 */

export const performanceMonitor = {
  // Sayfa yükleme süresini ölç
  measurePageLoad: () => {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = window.performance.getEntriesByType('navigation')[0];
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        
        return {
          loadTime,
          domContentLoaded,
          totalTime: navigation.loadEventEnd - navigation.fetchStart
        };
      }
    }
    return null;
  },

  // Memory kullanımını ölç
  measureMemory: () => {
    if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
      return {
        used: window.performance.memory.usedJSHeapSize,
        total: window.performance.memory.totalJSHeapSize,
        limit: window.performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  },

  // Bundle boyutunu hesapla
  getBundleSize: () => {
    if (typeof window !== 'undefined') {
      const scripts = document.querySelectorAll('script[src]');
      let totalSize = 0;
      
      scripts.forEach(script => {
        if (script.src.includes('static/js/')) {
          // Bu gerçek boyutu ölçmez, sadece tahmin
          totalSize += 100; // KB cinsinden tahmin
        }
      });
      
      return totalSize;
    }
    return 0;
  },

  // Core Web Vitals ölçümü
  measureCoreWebVitals: () => {
    if (typeof window !== 'undefined' && window.performance) {
      const paintEntries = window.performance.getEntriesByType('paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      const lcp = paintEntries.find(entry => entry.name === 'largest-contentful-paint');
      
      return {
        fcp: fcp ? fcp.startTime : null,
        lcp: lcp ? lcp.startTime : null
      };
    }
    return null;
  }
};

export default performanceMonitor;

























