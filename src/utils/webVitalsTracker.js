/**
 * Web Vitals Tracker
 * Comprehensive performance tracking with storage and analytics
 */

import logger from './logger';

class WebVitalsTracker {
  constructor() {
    this.metrics = [];
    this.maxMetrics = 100; // Son 100 metrik kaydını tut
  }

  /**
   * Web Vitals metriğini yakala ve kaydet
   */
  trackMetric(metric) {
    try {
      const metricData = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating || this.rateMetric(metric.name, metric.value),
        id: metric.id,
        navigationType: metric.navigationType,
        timestamp: Date.now()
      };

      // Memory'ye ekle
      this.metrics.push(metricData);
      if (this.metrics.length > this.maxMetrics) {
        this.metrics.shift(); // En eski metrikleri sil
      }

      // localStorage'a kaydet
      this.saveToStorage(metricData);

      // Logger'a yaz (development mode)
      if (process.env.NODE_ENV === 'development') {
        logger.info(`📊 Web Vitals: ${metric.name} = ${metric.value.toFixed(2)} (${metricData.rating})`);
      }

      // Performans uyarıları
      if (metricData.rating === 'poor') {
        this.handlePoorPerformance(metricData);
      }

      return metricData;
    } catch (error) {
      logger.error('Web Vitals tracking error:', error);
    }
  }

  /**
   * Metrik değerini değerlendir (good/average/poor)
   */
  rateMetric(name, value) {
    const thresholds = {
      // Largest Contentful Paint
      LCP: { good: 2500, poor: 4000 },
      // First Input Delay
      FID: { good: 100, poor: 300 },
      // Cumulative Layout Shift
      CLS: { good: 0.1, poor: 0.25 },
      // First Contentful Paint
      FCP: { good: 1800, poor: 3000 },
      // Time to First Byte
      TTFB: { good: 800, poor: 1800 }
    };

    const threshold = thresholds[name];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'average';
    return 'poor';
  }

  /**
   * Kötü performans durumunda uyar
   */
  handlePoorPerformance(metric) {
    logger.warn(`⚠️ Poor ${metric.name} performance: ${metric.value.toFixed(2)}`);
    
    // İlk kez uyarı veriliyorsa (tekrar spam önlemek için)
    const lastWarningKey = `vitals_warning_${metric.name}`;
    const lastWarning = localStorage.getItem(lastWarningKey);
    const now = Date.now();

    if (!lastWarning || now - parseInt(lastWarning) > 5 * 60 * 1000) { // 5 dakika
      localStorage.setItem(lastWarningKey, now.toString());
      
      // Production'da analytics servisine gönderilebilir
      if (process.env.NODE_ENV === 'production') {
        this.sendToAnalytics(metric);
      }
    }
  }

  /**
   * Metrikleri localStorage'a kaydet
   */
  saveToStorage(metric) {
    try {
      const storageKey = 'web_vitals_history';
      const history = this.getFromStorage();
      
      history.push(metric);
      
      // Son 100 metrik tut
      if (history.length > this.maxMetrics) {
        history.splice(0, history.length - this.maxMetrics);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (error) {
      logger.error('Failed to save Web Vitals to storage:', error);
    }
  }

  /**
   * Metrikleri localStorage'dan oku
   */
  getFromStorage() {
    try {
      const data = localStorage.getItem('web_vitals_history');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Failed to read Web Vitals from storage:', error);
      return [];
    }
  }

  /**
   * Analytics servisine gönder (Future: Firebase Analytics entegrasyonu)
   */
  sendToAnalytics(metric) {
    // TODO: Firebase Analytics, Google Analytics veya custom endpoint'e gönder
    // Şimdilik sadece localStorage'da tutuyoruz
    console.info('Analytics event:', {
      type: 'web_vital',
      metric: metric.name,
      value: metric.value,
      rating: metric.rating
    });
  }

  /**
   * Son N metrik raporunu al
   */
  getReport(limit = 10) {
    const history = this.getFromStorage();
    const recent = history.slice(-limit);
    
    // Metrik bazında özet
    const summary = recent.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = {
          count: 0,
          total: 0,
          min: Infinity,
          max: -Infinity,
          ratings: { good: 0, average: 0, poor: 0 }
        };
      }
      
      const stats = acc[metric.name];
      stats.count++;
      stats.total += metric.value;
      stats.min = Math.min(stats.min, metric.value);
      stats.max = Math.max(stats.max, metric.value);
      stats.ratings[metric.rating] = (stats.ratings[metric.rating] || 0) + 1;
      
      return acc;
    }, {});

    // Ortalamaları hesapla
    Object.keys(summary).forEach(key => {
      const stats = summary[key];
      stats.average = stats.total / stats.count;
    });

    return {
      summary,
      recent,
      timestamp: Date.now()
    };
  }

  /**
   * En son metrik değerlerini al
   */
  getLatestMetrics() {
    const history = this.getFromStorage();
    const latest = {};
    
    history.forEach(metric => {
      if (!latest[metric.name] || metric.timestamp > latest[metric.name].timestamp) {
        latest[metric.name] = metric;
      }
    });
    
    return latest;
  }

  /**
   * Tüm geçmişi temizle
   */
  clearHistory() {
    try {
      localStorage.removeItem('web_vitals_history');
      this.metrics = [];
      logger.info('Web Vitals history cleared');
    } catch (error) {
      logger.error('Failed to clear Web Vitals history:', error);
    }
  }

  /**
   * Performans skoru hesapla (0-100)
   */
  calculateScore() {
    const latest = this.getLatestMetrics();
    const weights = {
      LCP: 0.25,  // Largest Contentful Paint
      FID: 0.25,  // First Input Delay
      CLS: 0.25,  // Cumulative Layout Shift
      FCP: 0.15,  // First Contentful Paint
      TTFB: 0.10  // Time to First Byte
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.keys(weights).forEach(key => {
      if (latest[key]) {
        const rating = latest[key].rating;
        const weight = weights[key];
        
        let score = 0;
        if (rating === 'good') score = 100;
        else if (rating === 'average') score = 60;
        else if (rating === 'poor') score = 20;
        
        totalScore += score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }
}

export default new WebVitalsTracker();

