/**
 * Responsive design utilities
 * Mobile ve tablet uyumluluğunu test eder
 */

export const responsiveUtils = {
  // Ekran boyutunu algıla
  getScreenSize: () => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      return {
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        orientation: width > height ? 'landscape' : 'portrait'
      };
    }
    return null;
  },

  // Touch desteği kontrolü
  isTouchDevice: () => {
    if (typeof window !== 'undefined') {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
    return false;
  },

  // Browser bilgileri
  getBrowserInfo: () => {
    if (typeof window !== 'undefined' && navigator) {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      };
    }
    return null;
  },

  // Viewport meta tag kontrolü
  checkViewport: () => {
    if (typeof document !== 'undefined') {
      const viewport = document.querySelector('meta[name="viewport"]');
      return viewport ? viewport.content : null;
    }
    return null;
  }
};

export default responsiveUtils;

























