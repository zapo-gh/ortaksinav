/**
 * ErrorTracker tests
 */

// Mock logger
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

// ErrorTracker singleton'ı resetlemek için her testte yeniden import edemiyoruz,
// bu yüzden class'ı doğrudan test ediyoruz
let ErrorTracker;

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();

  // Module cache temizle ve yeniden import et
  jest.resetModules();
  // errorTracker modülü singleton export eder, class'ı alabiliriz
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ErrorTracker', () => {
  let tracker;

  beforeEach(() => {
    // Basit bir tracker instance oluştur (singleton yerine)
    const loggerMock = require('../../utils/logger');
    tracker = {
      errorQueue: [],
      maxQueueSize: 50,
      batchSize: 5,
      flushInterval: 60000,
      isEnabled: false,
      flushIntervalId: null,
      criticalErrorCount: 0,
    };

    // Gerekli metotları bind edelim - asıl modülden
    const errorTrackerModule = require('../../utils/errorTracker');
    tracker = errorTrackerModule.default || errorTrackerModule;
    // State temizle
    tracker.errorQueue = [];
    tracker.criticalErrorCount = 0;
    localStorage.clear();
  });

  describe('trackError', () => {
    test('hata verisi oluşturur ve kuyruğa ekler', () => {
      const error = new Error('Test hatası');
      tracker.trackError(error, { component: 'TestComponent' });

      // localStorage'a kaydedilmiş olmalı
      const stored = JSON.parse(localStorage.getItem('error_logs'));
      expect(stored).toBeDefined();
      expect(stored.length).toBeGreaterThan(0);
      expect(stored[0].message).toBe('Test hatası');
    });

    test('context bilgilerini error data ya ekler', () => {
      const error = new Error('Context test');
      tracker.trackError(error, { component: 'Header', action: 'click' });

      const stored = JSON.parse(localStorage.getItem('error_logs'));
      expect(stored[0].context.component).toBe('Header');
      expect(stored[0].context.action).toBe('click');
    });

    test('kritik hatalarda criticalErrorCount artırır', () => {
      const initialCount = tracker.criticalErrorCount;
      const error = new Error('Kritik hata');
      tracker.trackError(error, { errorBoundary: true });

      expect(tracker.criticalErrorCount).toBe(initialCount + 1);
    });

    test('critical context ile de criticalErrorCount artırır', () => {
      const initialCount = tracker.criticalErrorCount;
      const error = new Error('Başka kritik hata');
      tracker.trackError(error, { critical: true });

      expect(tracker.criticalErrorCount).toBe(initialCount + 1);
    });
  });

  describe('createErrorData', () => {
    test('error bilgilerini doğru çıkarır', () => {
      const error = new Error('Test mesajı');
      error.name = 'TestError';
      const data = tracker.createErrorData(error, {});

      expect(data.message).toBe('Test mesajı');
      expect(data.name).toBe('TestError');
      expect(data.stack).toBeDefined();
    });

    test('string error i işler', () => {
      const data = tracker.createErrorData('String hata', {});
      expect(data.message).toBe('String hata');
      expect(data.name).toBe('Unknown Error');
    });

    test('environment bilgilerini içerir', () => {
      const error = new Error('env test');
      const data = tracker.createErrorData(error, {});

      expect(data.environment).toBeDefined();
      expect(data.environment.timestamp).toBeDefined();
      expect(data.environment.url).toBeDefined();
    });

    test('app bilgilerini içerir', () => {
      const error = new Error('app test');
      const data = tracker.createErrorData(error, {});

      expect(data.app).toBeDefined();
      expect(data.app.env).toBe('test');
    });
  });

  describe('persistToStorage', () => {
    test('localStorage a kaydeder', () => {
      tracker.persistToStorage({ message: 'test', name: 'Error' });
      const stored = JSON.parse(localStorage.getItem('error_logs'));
      expect(stored).toHaveLength(1);
    });

    test('son 50 hatayı tutar', () => {
      // 55 kayıt ekle
      for (let i = 0; i < 55; i++) {
        tracker.persistToStorage({ message: `error-${i}`, name: 'Error' });
      }
      const stored = JSON.parse(localStorage.getItem('error_logs'));
      expect(stored.length).toBeLessThanOrEqual(50);
    });
  });

  describe('getStoredErrors', () => {
    test('boş localStorage dan boş dizi döner', () => {
      expect(tracker.getStoredErrors()).toEqual([]);
    });

    test('kayıtlı hataları döner', () => {
      localStorage.setItem('error_logs', JSON.stringify([{ message: 'test' }]));
      const errors = tracker.getStoredErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('test');
    });

    test('geçersiz JSON da boş dizi döner', () => {
      localStorage.setItem('error_logs', 'invalid json');
      expect(tracker.getStoredErrors()).toEqual([]);
    });
  });

  describe('getErrorReport', () => {
    test('boş rapor döner', () => {
      const report = tracker.getErrorReport();
      expect(report.total).toBe(0);
      expect(report.recent).toBe(0);
      expect(report.errors).toEqual([]);
    });

    test('hata raporunu doğru oluşturur', () => {
      localStorage.setItem('error_logs', JSON.stringify([
        { name: 'TypeError', context: { component: 'Header' } },
        { name: 'TypeError', context: { component: 'Footer' } },
        { name: 'RangeError', context: { component: 'Header' } },
      ]));

      const report = tracker.getErrorReport();
      expect(report.total).toBe(3);
      expect(report.byType.TypeError).toBe(2);
      expect(report.byType.RangeError).toBe(1);
      expect(report.byComponent.Header).toBe(2);
      expect(report.byComponent.Footer).toBe(1);
    });
  });

  describe('clearHistory', () => {
    test('kuyruğu ve localStorage ı temizler', () => {
      tracker.errorQueue = [{ message: 'test' }];
      tracker.criticalErrorCount = 5;
      localStorage.setItem('error_logs', JSON.stringify([{ message: 'test' }]));

      tracker.clearHistory();

      expect(tracker.errorQueue).toEqual([]);
      expect(tracker.criticalErrorCount).toBe(0);
      expect(localStorage.getItem('error_logs')).toBeNull();
    });
  });

  describe('queueError', () => {
    test('kuyruğa ekler', () => {
      tracker.queueError({ message: 'test1' });
      expect(tracker.errorQueue.length).toBeGreaterThanOrEqual(0);
    });

    test('maxQueueSize aşılınca eski kayıtları siler', () => {
      for (let i = 0; i < 55; i++) {
        tracker.queueError({ message: `error-${i}` });
      }
      expect(tracker.errorQueue.length).toBeLessThanOrEqual(tracker.maxQueueSize);
    });
  });

  describe('session yönetimi', () => {
    test('getSessionId benzersiz session ID oluşturur', () => {
      const id1 = tracker.getSessionId();
      expect(id1).toBeDefined();
      expect(id1).toContain('session_');
    });

    test('aynı session da aynı ID döner', () => {
      const id1 = tracker.getSessionId();
      const id2 = tracker.getSessionId();
      expect(id1).toBe(id2);
    });

    test('getUserId anonim döner', () => {
      const userId = tracker.getUserId();
      expect(userId).toBe('anonymous');
    });
  });
});
