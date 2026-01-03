import { detectExcelFormat, getFormatPatterns } from '../../utils/excelFormats';

describe('Excel Formats Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectExcelFormat', () => {
    it('should detect e-Okul format correctly', () => {
      const eOkulData = [
        ['T.C.', 'Öğrenci Listesi'],
        ['Sınıf:', '9-A'],
        ['', 'Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'],
        ['', '1001', 'Ahmet', 'Yılmaz', 'E'],
        ['', '1002', 'Ayşe', 'Kara', 'K']
      ];

      const format = detectExcelFormat(eOkulData);
      
      expect(format).toHaveProperty('key');
      expect(format).toHaveProperty('name');
      expect(format).toHaveProperty('headerRow');
      expect(format).toHaveProperty('dataStartRow');
      expect(format).toHaveProperty('columns');
    });

    it('should detect manual format correctly', () => {
      const manualData = [
        ['Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'],
        ['1001', 'Ahmet', 'Yılmaz', 'E'],
        ['1002', 'Ayşe', 'Kara', 'K']
      ];

      const format = detectExcelFormat(manualData);
      
      expect(format).toHaveProperty('key');
      expect(format).toHaveProperty('name');
      expect(format).toHaveProperty('headerRow');
      expect(format).toHaveProperty('dataStartRow');
    });

    it('should handle empty data', () => {
      const emptyData = [];
      
      const format = detectExcelFormat(emptyData);
      
      expect(format).toHaveProperty('key');
      expect(format.key).toBe('MANUAL_FORMAT'); // Default format
    });

    it('should handle null data', () => {
      const format = detectExcelFormat(null);
      
      expect(format).toHaveProperty('key');
      expect(format.key).toBe('MANUAL_FORMAT'); // Default format
    });

    it('should handle undefined data', () => {
      const format = detectExcelFormat(undefined);
      
      expect(format).toHaveProperty('key');
      expect(format.key).toBe('MANUAL_FORMAT'); // Default format
    });

    it('should detect class header patterns', () => {
      const classData = [
        ['T.C.', 'Öğrenci Listesi'],
        ['Sınıf:', '10-B'],
        ['', 'Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'],
        ['', '1001', 'Ahmet', 'Yılmaz', 'E']
      ];

      const format = detectExcelFormat(classData);
      
      expect(format).toHaveProperty('classHeaderPattern');
      expect(format).toHaveProperty('classExtractPattern');
    });

    it('should handle different class formats', () => {
      const classFormats = [
        ['Sınıf:', '9-A'],
        ['Sınıf:', '10-B'],
        ['Sınıf:', '11-C'],
        ['Sınıf:', '12-D']
      ];

      classFormats.forEach(classFormat => {
        const data = [
          ['T.C.', 'Öğrenci Listesi'],
          classFormat,
          ['', 'Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet']
        ];

        const format = detectExcelFormat(data);
        expect(format).toHaveProperty('key');
      });
    });
  });

  describe('getFormatPatterns', () => {
    it('should return format patterns for e-Okul', () => {
      const patterns = getFormatPatterns('E_OKUL_FORMAT');
      
      expect(patterns).toHaveProperty('headerPattern');
      expect(patterns).toHaveProperty('classHeaderPattern');
      expect(patterns).toHaveProperty('classExtractPattern');
    });

    it('should return format patterns for manual format', () => {
      const patterns = getFormatPatterns('MANUAL_FORMAT');
      
      expect(patterns).toHaveProperty('headerPattern');
      expect(patterns).toHaveProperty('flexibleColumns');
    });

    it('should return default patterns for unknown format', () => {
      const patterns = getFormatPatterns('UNKNOWN_FORMAT');
      
      expect(patterns).toHaveProperty('headerPattern');
      expect(patterns.flexibleColumns).toBe(true);
    });

    it('should handle null format key', () => {
      const patterns = getFormatPatterns(null);
      
      expect(patterns).toHaveProperty('headerPattern');
      expect(patterns.flexibleColumns).toBe(true);
    });

    it('should handle undefined format key', () => {
      const patterns = getFormatPatterns(undefined);
      
      expect(patterns).toHaveProperty('headerPattern');
      expect(patterns.flexibleColumns).toBe(true);
    });
  });

  describe('Format Detection Edge Cases', () => {
    it('should handle data with extra empty rows', () => {
      const dataWithEmptyRows = [
        [''],
        ['T.C.', 'Öğrenci Listesi'],
        ['Sınıf:', '9-A'],
        [''],
        ['', 'Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'],
        ['', '1001', 'Ahmet', 'Yılmaz', 'E']
      ];

      const format = detectExcelFormat(dataWithEmptyRows);
      
      expect(format).toHaveProperty('key');
      expect(format).toHaveProperty('headerRow');
      expect(format).toHaveProperty('dataStartRow');
    });

    it('should handle data with missing headers', () => {
      const incompleteData = [
        ['T.C.', 'Öğrenci Listesi'],
        ['Sınıf:', '9-A'],
        ['', '1001', 'Ahmet', 'Yılmaz', 'E']
      ];

      const format = detectExcelFormat(incompleteData);
      
      expect(format).toHaveProperty('key');
      expect(format).toHaveProperty('headerRow');
    });

    it('should handle data with irregular structure', () => {
      const irregularData = [
        ['Some', 'Random', 'Headers'],
        ['Data', 'Row', '1'],
        ['Data', 'Row', '2']
      ];

      const format = detectExcelFormat(irregularData);
      
      expect(format).toHaveProperty('key');
      expect(format).toHaveProperty('headerRow');
    });

    it('should handle single row data', () => {
      const singleRowData = [
        ['Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet']
      ];

      const format = detectExcelFormat(singleRowData);
      
      expect(format).toHaveProperty('key');
      expect(format).toHaveProperty('headerRow');
    });

    it('should handle data with special characters', () => {
      const specialCharData = [
        ['T.C.', 'Öğrenci Listesi'],
        ['Sınıf:', '9-A'],
        ['', 'Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'],
        ['', '1001', 'Ahmet', 'Yılmaz', 'E'],
        ['', '1002', 'Ayşe', 'Kara', 'K']
      ];

      const format = detectExcelFormat(specialCharData);
      
      expect(format).toHaveProperty('key');
      expect(format).toHaveProperty('headerRow');
    });
  });

  describe('Format Validation', () => {
    it('should validate e-Okul format structure', () => {
      const eOkulData = [
        ['T.C.', 'Öğrenci Listesi'],
        ['Sınıf:', '9-A'],
        ['', 'Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'],
        ['', '1001', 'Ahmet', 'Yılmaz', 'E']
      ];

      const format = detectExcelFormat(eOkulData);
      
      expect(format.headerRow).toBe(0);
      expect(format.dataStartRow).toBe(3);
      expect(format.columns).toHaveProperty('numara');
      expect(format.columns).toHaveProperty('adi');
    });

    it('should validate manual format structure', () => {
      const manualData = [
        ['Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'],
        ['1001', 'Ahmet', 'Yılmaz', 'E']
      ];

      const format = detectExcelFormat(manualData);
      
      expect(format.headerRow).toBe(0);
      expect(format.dataStartRow).toBe(1);
      expect(format.flexibleColumns).toBe(true);
    });
  });
});






































