/**
 * Error Tracking Utility
 * Basit ve ücretsiz error tracking çözümü
 * Seçenek B: Basit logging endpoint
 */

import logger from './logger';

class ErrorTracker {
  constructor() {
    this.errorQueue = [];
    this.maxQueueSize = 50; // Maksimum kuyruk boyutu
    this.batchSize = 5; // Toplu gönderim boyutu
    this.flushInterval = 60000; // 1 dakika
    this.isEnabled = process.env.NODE_ENV === 'production';
    
    // Otomatik flush
    if (this.isEnabled) {
      this.startAutoFlush();
    }
  }

  /**
   * Hata track et
   */
  trackError(error, context = {}) {
    try {
      const errorData = this.createErrorData(error, context);
      
      // Development'ta console'a yaz
      if (process.env.NODE_ENV === 'development') {
        logger.error('Error tracked:', errorData);
      }

      // Production'da localStorage'a kaydet
      if (this.isEnabled) {
        this.queueError(errorData);
        this.persistToStorage(errorData);
      }
    } catch (e) {
      logger.error('Error tracking failed:', e);
    }
  }

  /**
   * Error data objesi oluştur
   */
  createErrorData(error, context) {
    return {
      // Error bilgileri
      message: error?.message || String(error),
      name: error?.name || 'Unknown Error',
      stack: error?.stack || null,
      
      // Context bilgileri
      context: {
        component: context.component || 'Unknown',
        action: context.action || 'Unknown',
        userId: this.getUserId(),
        sessionId: this.getSessionId(),
        ...context
      },
      
      // Environment bilgileri
      environment: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        timestamp: new Date().toISOString(),
        timestampMs: Date.now()
      },
      
      // Uygulama bilgileri
      app: {
        version: process.env.REACT_APP_VERSION || '2.0',
        env: process.env.NODE_ENV,
        buildDate: process.env.REACT_APP_BUILD_DATE || null
      }
    };
  }

  /**
   * Error'u kuyruğa ekle
   */
  queueError(errorData) {
    this.errorQueue.push(errorData);
    
    // Kuyruk dolmuşsa eski kayıtları sil
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }
    
    // Toplu gönderim boyutuna ulaşırsa gönder
    if (this.errorQueue.length >= this.batchSize) {
      this.flushErrors();
    }
  }

  /**
   * localStorage'a kaydet
   */
  persistToStorage(errorData) {
    try {
      const errorLogs = this.getStoredErrors();
      errorLogs.push(errorData);
      
      // Son 50 error'u tut
      const recentLogs = errorLogs.slice(-50);
      localStorage.setItem('error_logs', JSON.stringify(recentLogs));
    } catch (e) {
      logger.debug('Failed to store error:', e);
    }
  }

  /**
   * localStorage'dan error'ları al
   */
  getStoredErrors() {
    try {
      const data = localStorage.getItem('error_logs');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      logger.debug('Failed to read stored errors:', e);
      return [];
    }
  }

  /**
   * Error'ları toplu gönder (flush)
   */
  async flushErrors() {
    if (this.errorQueue.length === 0) return;
    
    const errorsToSend = [...this.errorQueue];
    this.errorQueue = [];
    
    try {
      // Şimdilik sadece localStorage'a kaydet
      // Future: Custom endpoint'e gönder
      const existingErrors = this.getStoredErrors();
      const updatedErrors = [...existingErrors, ...errorsToSend].slice(-50);
      localStorage.setItem('error_logs', JSON.stringify(updatedErrors));
      
      logger.debug(`Flushed ${errorsToSend.length} errors to storage`);
    } catch (e) {
      logger.error('Failed to flush errors:', e);
      // Başarısız olursa kuyruğa geri ekle
      this.errorQueue.unshift(...errorsToSend);
    }
  }

  /**
   * Otomatik flush başlat
   */
  startAutoFlush() {
    setInterval(() => {
      if (this.errorQueue.length > 0) {
        this.flushErrors();
      }
    }, this.flushInterval);
  }

  /**
   * User ID al (localStorage'dan)
   */
  getUserId() {
    try {
      return localStorage.getItem('user_id') || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  /**
   * Session ID al/generate et
   */
  getSessionId() {
    try {
      let sessionId = sessionStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('session_id', sessionId);
      }
      return sessionId;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Error summary raporu al
   */
  getErrorReport(limit = 20) {
    const storedErrors = this.getStoredErrors();
    const recentErrors = storedErrors.slice(-limit);
    
    // Error tipine göre grupla
    const groupedByType = recentErrors.reduce((acc, error) => {
      const key = error.name || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    // Component'e göre grupla
    const groupedByComponent = recentErrors.reduce((acc, error) => {
      const component = error.context?.component || 'Unknown';
      acc[component] = (acc[component] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total: storedErrors.length,
      recent: recentErrors.length,
      byType: groupedByType,
      byComponent: groupedByComponent,
      errors: recentErrors,
      lastError: recentErrors[recentErrors.length - 1] || null
    };
  }

  /**
   * Error geçmişini temizle
   */
  clearHistory() {
    try {
      this.errorQueue = [];
      localStorage.removeItem('error_logs');
      logger.info('Error history cleared');
    } catch (e) {
      logger.error('Failed to clear error history:', e);
    }
  }

  /**
   * Custom endpoint'e gönder (Future implementation)
   */
  async sendToEndpoint(errors) {
    // Future: Custom error logging endpoint'e gönder
    // Örnek:
    // try {
    //   const response = await fetch('/api/errors', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ errors })
    //   });
    //   return response.ok;
    // } catch (e) {
    //   logger.error('Failed to send errors to endpoint:', e);
    //   return false;
    // }
    
    logger.debug('Custom endpoint not configured, using localStorage only');
    return false;
  }
}

export default new ErrorTracker();

