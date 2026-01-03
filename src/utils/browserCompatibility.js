/**
 * Browser compatibility utilities
 * Farklı tarayıcılarda uyumluluğu test eder
 */

export const browserCompatibility = {
  // Modern JavaScript özelliklerini kontrol et
  checkModernFeatures: () => {
    const features = {
      // ES6+ features
      arrowFunctions: typeof (() => {}) === 'function',
      templateLiterals: typeof `template` === 'string',
      destructuring: (() => { try { const {a} = {}; void a; return true; } catch(e) { return false; } })(),
      asyncAwait: typeof async function() {} === 'function',
      
      // Web APIs
      fetch: typeof fetch === 'function',
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      indexedDB: typeof indexedDB !== 'undefined',
      
      // CSS Grid & Flexbox
      cssGrid: CSS.supports('display', 'grid'),
      flexbox: CSS.supports('display', 'flex'),
      
      // Drag & Drop
      dragDrop: 'draggable' in document.createElement('div'),
      
      // File API
      fileAPI: typeof FileReader !== 'undefined',
      
      // Canvas
      canvas: typeof HTMLCanvasElement !== 'undefined',
      
      // Web Workers
      webWorkers: typeof Worker !== 'undefined'
    };
    
    return features;
  },

  // Browser engine bilgisi
  getBrowserEngine: () => {
    if (typeof navigator !== 'undefined') {
      const userAgent = navigator.userAgent;
      
      if (userAgent.includes('Chrome')) return 'Blink';
      if (userAgent.includes('Firefox')) return 'Gecko';
      if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'WebKit';
      if (userAgent.includes('Edge')) return 'EdgeHTML';
      if (userAgent.includes('Trident')) return 'Trident';
      
      return 'Unknown';
    }
    return 'Unknown';
  },

  // CSS özellik desteği
  checkCSSSupport: () => {
    if (typeof CSS !== 'undefined' && CSS.supports) {
      return {
        grid: CSS.supports('display', 'grid'),
        flexbox: CSS.supports('display', 'flex'),
        customProperties: CSS.supports('--custom', 'value'),
        backdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
        clipPath: CSS.supports('clip-path', 'circle(50%)'),
        objectFit: CSS.supports('object-fit', 'cover')
      };
    }
    return null;
  },

  // Performance API desteği
  checkPerformanceAPI: () => {
    if (typeof window !== 'undefined' && window.performance) {
      return {
        timing: 'timing' in window.performance,
        navigation: 'navigation' in window.performance,
        memory: 'memory' in window.performance,
        observer: typeof PerformanceObserver !== 'undefined'
      };
    }
    return null;
  }
};

export default browserCompatibility;

