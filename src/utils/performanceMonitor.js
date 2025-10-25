import { shouldEnablePerformanceMonitoring } from '../config/production';

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.isEnabled = shouldEnablePerformanceMonitoring();
  }

  // Component render time tracking
  trackRenderTime(componentName, startTime) {
    if (!this.isEnabled) return;
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    this.metrics[componentName] = {
      renderTime,
      timestamp: Date.now()
    };
    
    // Log slow renders (>100ms)
    if (renderTime > 100) {
      console.warn(`🐌 Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  // Memory usage tracking
  trackMemoryUsage() {
    if (!this.isEnabled || !performance.memory) return;
    
    const memory = performance.memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
    };
  }

  // Bundle size tracking
  trackBundleSize() {
    if (!this.isEnabled) return;
    
    const scripts = document.querySelectorAll('script[src]');
    let totalSize = 0;
    
    scripts.forEach(script => {
      const size = script.getAttribute('data-size');
      if (size) totalSize += parseInt(size);
    });
    
    return {
      totalSize: Math.round(totalSize / 1024), // KB
      scriptCount: scripts.length
    };
  }

  // Get performance report
  getReport() {
    if (!this.isEnabled) return null;
    
    return {
      renderMetrics: this.metrics,
      memoryUsage: this.trackMemoryUsage(),
      bundleSize: this.trackBundleSize(),
      timestamp: Date.now()
    };
  }

  // Clear metrics
  clear() {
    this.metrics = {};
  }
}

export default new PerformanceMonitor();