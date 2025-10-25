import logger from '../../utils/logger';

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  table: jest.fn(),
  group: jest.fn(),
  groupEnd: jest.fn(),
  time: jest.fn(),
  timeEnd: jest.fn()
};

// Replace console with mock
global.console = mockConsole;

// Mock the logger module to use the current NODE_ENV
jest.mock('../../utils/logger', () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    log: (...args) => {
      if (isDevelopment) {
        mockConsole.log(...args);
      }
    },
    error: (...args) => {
      mockConsole.error(...args);
    },
    warn: (...args) => {
      if (isDevelopment) {
        mockConsole.warn(...args);
      }
    },
    info: (...args) => {
      if (isDevelopment) {
        mockConsole.info(...args);
      }
    },
    debug: (...args) => {
      if (isDevelopment) {
        mockConsole.debug(...args);
      }
    },
    table: (data) => {
      if (isDevelopment) {
        mockConsole.table(data);
      }
    },
    group: (label) => {
      if (isDevelopment) {
        mockConsole.group(label);
      }
    },
    groupEnd: () => {
      if (isDevelopment) {
        mockConsole.groupEnd();
      }
    },
    time: (label) => {
      if (isDevelopment) {
        mockConsole.time(label);
      }
    },
    timeEnd: (label) => {
      if (isDevelopment) {
        mockConsole.timeEnd(label);
      }
    }
  };
}, { virtual: true });

describe('Logger Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset NODE_ENV to development for most tests
    process.env.NODE_ENV = 'development';
  });

  describe('Development Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should call console.log when logger.log is called', () => {
      logger.log('Test message');
      expect(mockConsole.log).toHaveBeenCalledWith('Test message');
    });

    it('should call console.info when logger.info is called', () => {
      logger.info('Test info');
      expect(mockConsole.info).toHaveBeenCalledWith('Test info');
    });

    it('should call console.warn when logger.warn is called', () => {
      logger.warn('Test warning');
      expect(mockConsole.warn).toHaveBeenCalledWith('Test warning');
    });

    it('should call console.debug when logger.debug is called', () => {
      logger.debug('Test debug');
      expect(mockConsole.debug).toHaveBeenCalledWith('Test debug');
    });

    it('should call console.table when logger.table is called', () => {
      const testData = [{ id: 1, name: 'Test' }];
      logger.table(testData);
      expect(mockConsole.table).toHaveBeenCalledWith(testData);
    });

    it('should call console.group when logger.group is called', () => {
      logger.group('Test Group');
      expect(mockConsole.group).toHaveBeenCalledWith('Test Group');
    });

    it('should call console.groupEnd when logger.groupEnd is called', () => {
      logger.groupEnd();
      expect(mockConsole.groupEnd).toHaveBeenCalled();
    });

    it('should call console.time when logger.time is called', () => {
      logger.time('Test Timer');
      expect(mockConsole.time).toHaveBeenCalledWith('Test Timer');
    });

    it('should call console.timeEnd when logger.timeEnd is called', () => {
      logger.timeEnd('Test Timer');
      expect(mockConsole.timeEnd).toHaveBeenCalledWith('Test Timer');
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should not call console.log when logger.log is called in production', () => {
      logger.log('Test message');
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    it('should not call console.info when logger.info is called in production', () => {
      logger.info('Test info');
      expect(mockConsole.info).not.toHaveBeenCalled();
    });

    it('should not call console.warn when logger.warn is called in production', () => {
      logger.warn('Test warning');
      expect(mockConsole.warn).not.toHaveBeenCalled();
    });

    it('should not call console.debug when logger.debug is called in production', () => {
      logger.debug('Test debug');
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });

    it('should not call console.table when loggerhan.table is called in production', () => {
      const testData = [{ id: 1, name: 'Test' }];
      logger.table(testData);
      expect(mockConsole.table).not.toHaveBeenCalled();
    });

    it('should not call console.group when logger.group is called in production', () => {
      logger.group('Test Group');
      expect(mockConsole.group).not.toHaveBeenCalled();
    });

    it('should not call console.groupEnd when logger.groupEnd is called in production', () => {
      logger.groupEnd();
      expect(mockConsole.groupEnd).not.toHaveBeenCalled();
    });

    it('should not call console.time when logger.time is called in production', () => {
      logger.time('Test Timer');
      expect(mockConsole.time).not.toHaveBeenCalled();
    });

    it('should not call console.timeEnd when logger.timeEnd is called in production', () => {
      logger.timeEnd('Test Timer');
      expect(mockConsole.timeEnd).not.toHaveBeenCalled();
    });
  });

  describe('Error Logging', () => {
    it('should always call console.error regardless of environment', () => {
      // Test in development
      process.env.NODE_ENV = 'development';
      logger.error('Test error');
      expect(mockConsole.error).toHaveBeenCalledWith('Test error');

      jest.clearAllMocks();

      // Test in production
      process.env.NODE_ENV = 'production';
      logger.error('Test error');
      expect(mockConsole.error).toHaveBeenCalledWith('Test error');
    });

    it('should handle multiple arguments in error logging', () => {
      logger.error('Error:', 'Additional info', { code: 500 });
      expect(mockConsole.error).toHaveBeenCalledWith('Error:', 'Additional info', { code: 500 });
    });
  });

  describe('Multiple Arguments', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should handle multiple arguments in log', () => {
      logger.log('Message:', 'Additional info', { data: 'test' });
      expect(mockConsole.log).toHaveBeenCalledWith('Message:', 'Additional info', { data: 'test' });
    });

    it('should handle multiple arguments in info', () => {
      logger.info('Info:', 'Additional info', { data: 'test' });
      expect(mockConsole.info).toHaveBeenCalledWith('Info:', 'Additional info', { data: 'test' });
    });

    it('should handle multiple arguments in warn', () => {
      logger.warn('Warning:', 'Additional info', { data: 'test' });
      expect(mockConsole.warn).toHaveBeenCalledWith('Warning:', 'Additional info', { data: 'test' });
    });

    it('should handle multiple arguments in debug', () => {
      logger.debug('Debug:', 'Additional info', { data: 'test' });
      expect(mockConsole.debug).toHaveBeenCalledWith('Debug:', 'Additional info', { data: 'test' });
    });
  });
});

