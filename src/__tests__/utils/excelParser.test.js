import { parseExcelFile } from '../../utils/excelParser';
import { logger } from '../../utils/logger';

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Excel Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseExcelFile', () => {
    it('should reject when no file is provided', async () => {
      await expect(parseExcelFile(null)).rejects.toThrow('Dosya seçilmedi');
    });

    it('should reject when file is not Excel format', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      await expect(parseExcelFile(mockFile)).rejects.toThrow('Desteklenmeyen dosya formatı');
    });

    it('should parse valid Excel file structure', async () => {
      // Mock XLSX.read to return our test data
      const XLSX = require('xlsx');
      jest.spyOn(XLSX, 'read').mockReturnValue({
        SheetNames: ['Sayfa1'],
        Sheets: {
          Sayfa1: {
            '!ref': 'A1:E6',
            A1: { v: '' },
            B1: { v: 'Öğrenci No' },
            C1: { v: 'Adı' },
            D1: { v: 'Soyadı' },
            E1: { v: 'Cinsiyet' },
            B2: { v: 1001 },
            C2: { v: 'Ahmet' },
            D2: { v: 'Yılmaz' },
            E2: { v: 'E' },
            B3: { v: 1002 },
            C3: { v: 'Ayşe' },
            D3: { v: 'Kara' },
            E3: { v: 'K' }
          }
        }
      });

      const mockFile = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const result = await parseExcelFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.students).toHaveLength(2);
      expect(result.students[0]).toMatchObject({
        ad: 'Ahmet',
        soyad: 'Yılmaz',
        numara: '1001',
        sinif: 'MANUAL_FORMAT',
        cinsiyet: 'E'
      });
    });

    it('should handle 12th grade students with confirmation', async () => {
      const mockData = [
        ['T.C.', 'Öğrenci Listesi'],
        ['Sınıf:', '12-A'],
        ['', 'Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'],
        ['', '12001', 'Mehmet', 'Demir', 'E']
      ];

      const XLSX = require('xlsx');
      jest.spyOn(XLSX, 'read').mockReturnValue({
        SheetNames: ['Sayfa1'],
        Sheets: {
          Sayfa1: {
            '!ref': 'A1:E5',
            A1: { v: 'T.C.' },
            B1: { v: 'Öğrenci Listesi' },
            A2: { v: 'Sınıf:' },
            B2: { v: '12-A' },
            B3: { v: 'Öğrenci No' },
            C3: { v: 'Adı' },
            D3: { v: 'Soyadı' },
            E3: { v: 'Cinsiyet' },
            B4: { v: 12001 },
            C4: { v: 'Mehmet' },
            D4: { v: 'Demir' },
            E4: { v: 'E' }
          }
        }
      });

      const mockFile = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const result = await parseExcelFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.hasTwelfthGrade).toBe(true);
      expect(result.twelfthGradeCount).toBe(1);
      expect(result.students).toHaveLength(1);
    });

    it('should handle validation errors', async () => {
      const mockData = [
        ['', 'Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'],
        ['', '', 'Ahmet', 'Yılmaz', 'E'], // Missing student number
        ['', '1002', '', 'Kara', 'K'], // Missing first name
        ['', '1003', 'Ayşe', 'Kara', 'X'] // Invalid gender
      ];

      const XLSX = require('xlsx');
      jest.spyOn(XLSX, 'read').mockReturnValue({
        SheetNames: ['Sayfa1'],
        Sheets: {
          Sayfa1: {
            '!ref': 'A1:E5',
            B1: { v: 'Öğrenci No' },
            C1: { v: 'Adı' },
            D1: { v: 'Soyadı' },
            E1: { v: 'Cinsiyet' },
            C2: { v: 'Ahmet' },
            D2: { v: 'Yılmaz' },
            E2: { v: 'E' },
            B3: { v: 1002 },
            D3: { v: 'Kara' },
            E3: { v: 'K' },
            B4: { v: 1003 },
            C4: { v: 'Ayşe' },
            D4: { v: 'Kara' },
            E4: { v: 'X' }
          }
        }
      });

      const mockFile = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const result = await parseExcelFile(mockFile);

      expect(result.success).toBe(true);
      expect(result.statistics.validStudents).toBeLessThan(result.statistics.parsedStudents);
      expect(result.statistics.invalidStudents).toBeGreaterThan(0);
    });

    it('should handle file read errors', async () => {
      const XLSX = require('xlsx');
      jest.spyOn(XLSX, 'read').mockImplementation(() => {
        throw new Error('File read error');
      });

      const mockFile = new File(['mock'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const result = await parseExcelFile(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Dosya okuma hatası');
    });
  });
});
