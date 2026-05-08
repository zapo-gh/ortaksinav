import { formatError, getErrorMessage } from '../../utils/errorMessages';

describe('Error Messages Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatError', () => {
    it('should format error with error code and message', () => {
      const error = formatError('EXCEL_PARSE_ERROR', 'Test error message');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('EXCEL_PARSE_ERROR');
      expect(error.message).toContain('Test error message');
    });

    it('should handle error without message', () => {
      const error = formatError('EXCEL_PARSE_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('EXCEL_PARSE_ERROR');
    });

    it('should handle unknown error codes', () => {
      const error = formatError('UNKNOWN_ERROR', 'Unknown error');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('UNKNOWN_ERROR');
    });

    it('should format Excel parse errors correctly', () => {
      const error = formatError('EXCEL_PARSE_ERROR', 'File could not be parsed');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('EXCEL_PARSE_ERROR');
      expect(error.message).toContain('File could not be parsed');
    });

    it('should format validation errors correctly', () => {
      const error = formatError('VALIDATION_ERROR', 'Invalid data format');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('VALIDATION_ERROR');
      expect(error.message).toContain('Invalid data format');
    });

    it('should format algorithm errors correctly', () => {
      const error = formatError('ALGORITHM_ERROR', 'Algorithm failed to execute');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('ALGORITHM_ERROR');
      expect(error.message).toContain('Algorithm failed to execute');
    });
  });

  describe('getErrorMessage', () => {
    it('should return error message for known error codes', () => {
      const message = getErrorMessage('EXCEL_PARSE_ERROR');
      
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should return default message for unknown error codes', () => {
      const message = getErrorMessage('UNKNOWN_ERROR_CODE');

      expect(typeof message).toBe('string');
      expect(message).toContain('Beklenmeyen Hata');
    });

    it('should handle null error code', () => {
      const message = getErrorMessage(null);

      expect(typeof message).toBe('string');
      expect(message).toContain('Beklenmeyen Hata');
    });

    it('should handle undefined error code', () => {
      const message = getErrorMessage(undefined);

      expect(typeof message).toBe('string');
      expect(message).toContain('Beklenmeyen Hata');
    });

    it('should return user-friendly messages', () => {
      const excelError = getErrorMessage('EXCEL_PARSE_ERROR');
      const validationError = getErrorMessage('VALIDATION_ERROR');
      const algorithmError = getErrorMessage('ALGORITHM_ERROR');
      
      expect(excelError).toContain('Excel');
      expect(validationError).toContain('veri');
      expect(algorithmError).toContain('algoritma');
    });
  });

  describe('Error Code Coverage', () => {
    const errorCodes = [
      'EXCEL_PARSE_ERROR',
      'VALIDATION_ERROR',
      'ALGORITHM_ERROR',
      'FILE_NOT_FOUND',
      'INVALID_FORMAT',
      'NETWORK_ERROR',
      'PERMISSION_ERROR',
      'TIMEOUT_ERROR'
    ];

    errorCodes.forEach(code => {
      it(`should handle ${code} error code`, () => {
        const error = formatError(code, 'Test message');
        const message = getErrorMessage(code);
        
        expect(error).toBeInstanceOf(Error);
        expect(typeof message).toBe('string');
      });
    });
  });

  describe('Error Message Consistency', () => {
    it('should maintain consistent error format', () => {
      const error1 = formatError('EXCEL_PARSE_ERROR', 'Message 1');
      const error2 = formatError('EXCEL_PARSE_ERROR', 'Message 2');

      const message1 = error1.message;
      const message2 = error2.message;

      // Both should contain the error code
      expect(message1).toContain('EXCEL_PARSE_ERROR');
      expect(message2).toContain('EXCEL_PARSE_ERROR');

      // Both should contain their respective messages
      expect(message1).toContain('Message 1');
      expect(message2).toContain('Message 2');
    });

    it('should handle special characters in error messages', () => {
      const specialMessage = 'Error with special chars: !@#$%^&*()';
      const error = formatError('EXCEL_PARSE_ERROR', specialMessage);

      expect(error.message).toContain(specialMessage);
    });

    it('should handle Turkish characters in error messages', () => {
      const turkishMessage = 'Türkçe karakterler: çğıöşü';
      const error = formatError('EXCEL_PARSE_ERROR', turkishMessage);

      expect(error.message).toContain(turkishMessage);
    });
  });
});






































