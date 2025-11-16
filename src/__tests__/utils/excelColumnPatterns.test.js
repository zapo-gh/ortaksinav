import { createColumnMapping, detectColumnPatterns, getColumnIndex } from '../../utils/excelColumnPatterns';

describe('Excel Column Patterns Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createColumnMapping', () => {
    it('should create correct column mapping for e-Okul format', () => {
      const headers = ['', 'Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'];
      const mapping = createColumnMapping(headers);
      
      expect(mapping).toHaveProperty('numara');
      expect(mapping).toHaveProperty('adi');
      expect(mapping).toHaveProperty('soyadi');
      expect(mapping).toHaveProperty('cinsiyet');
      
      expect(mapping.numara).toBe(1);
      expect(mapping.adi).toBe(2);
      expect(mapping.soyadi).toBe(3);
      expect(mapping.cinsiyet).toBe(4);
    });

    it('should create correct column mapping for manual format', () => {
      const headers = ['Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'];
      const mapping = createColumnMapping(headers);
      
      expect(mapping).toHaveProperty('numara');
      expect(mapping).toHaveProperty('adi');
      expect(mapping).toHaveProperty('soyadi');
      expect(mapping).toHaveProperty('cinsiyet');
      
      expect(mapping.numara).toBe(0);
      expect(mapping.adi).toBe(1);
      expect(mapping.soyadi).toBe(2);
      expect(mapping.cinsiyet).toBe(3);
    });

    it('should handle empty headers', () => {
      const headers = [];
      const mapping = createColumnMapping(headers);

      expect(mapping).toEqual({
        numara: undefined,
        adi: undefined,
        soyadi: undefined,
        cinsiyet: undefined
      });
    });

    it('should handle null headers', () => {
      const mapping = createColumnMapping(null);
      
      expect(mapping).toHaveProperty('numara');
      expect(mapping).toHaveProperty('adi');
      expect(mapping).toHaveProperty('soyadi');
      expect(mapping).toHaveProperty('cinsiyet');
      
      expect(mapping.numara).toBeUndefined();
      expect(mapping.adi).toBeUndefined();
      expect(mapping.soyadi).toBeUndefined();
      expect(mapping.cinsiyet).toBeUndefined();
    });

    it('should handle undefined headers', () => {
      const mapping = createColumnMapping(undefined);
      
      expect(mapping).toHaveProperty('numara');
      expect(mapping).toHaveProperty('adi');
      expect(mapping).toHaveProperty('soyadi');
      expect(mapping).toHaveProperty('cinsiyet');
      
      expect(mapping.numara).toBeUndefined();
      expect(mapping.adi).toBeUndefined();
      expect(mapping.soyadi).toBeUndefined();
      expect(mapping.cinsiyet).toBeUndefined();
    });

    it('should handle headers with extra columns', () => {
      const headers = ['Sınıf', 'Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet', 'Not'];
      const mapping = createColumnMapping(headers);

      expect(mapping).toHaveProperty('numara');
      expect(mapping).toHaveProperty('adi');
      expect(mapping).toHaveProperty('soyadi');
      expect(mapping).toHaveProperty('cinsiyet');

      expect(mapping.numara).toBe(1);
      expect(mapping.adi).toBe(2);
      expect(mapping.soyadi).toBe(3);
      expect(mapping.cinsiyet).toBe(4);
    });

    it('should handle headers with missing columns', () => {
      const headers = ['Öğrenci No', 'Adı'];
      const mapping = createColumnMapping(headers);

      expect(mapping).toHaveProperty('numara');
      expect(mapping).toHaveProperty('adi');
      expect(mapping).toHaveProperty('soyadi');
      expect(mapping).toHaveProperty('cinsiyet');

      expect(mapping.numara).toBe(0);
      expect(mapping.adi).toBe(1);
      expect(mapping.soyadi).toBeUndefined();
      expect(mapping.cinsiyet).toBeUndefined();
    });
  });

  describe('detectColumnPatterns', () => {
    it('should detect student number patterns', () => {
      const patterns = detectColumnPatterns('Öğrenci No');
      
      expect(patterns).toHaveProperty('numara');
      expect(patterns.numara).toBe(true);
    });

    it('should detect first name patterns', () => {
      const patterns = detectColumnPatterns('Adı');
      
      expect(patterns).toHaveProperty('adi');
      expect(patterns.adi).toBe(true);
    });

    it('should detect last name patterns', () => {
      const patterns = detectColumnPatterns('Soyadı');
      
      expect(patterns).toHaveProperty('soyadi');
      expect(patterns.soyadi).toBe(true);
    });

    it('should detect gender patterns', () => {
      const patterns = detectColumnPatterns('Cinsiyet');
      
      expect(patterns).toHaveProperty('cinsiyet');
      expect(patterns.cinsiyet).toBe(true);
    });

    it('should handle case insensitive patterns', () => {
      const patterns = detectColumnPatterns('ÖĞRENCİ NO');
      
      expect(patterns).toHaveProperty('numara');
      expect(patterns.numara).toBe(true);
    });

    it('should handle patterns with extra spaces', () => {
      const patterns = detectColumnPatterns('  Öğrenci No  ');
      
      expect(patterns).toHaveProperty('numara');
      expect(patterns.numara).toBe(true);
    });

    it('should handle unknown patterns', () => {
      const patterns = detectColumnPatterns('Unknown Column');
      
      expect(patterns).toHaveProperty('numara');
      expect(patterns).toHaveProperty('adi');
      expect(patterns).toHaveProperty('soyadi');
      expect(patterns).toHaveProperty('cinsiyet');
      
      expect(patterns.numara).toBe(false);
      expect(patterns.adi).toBe(false);
      expect(patterns.soyadi).toBe(false);
      expect(patterns.cinsiyet).toBe(false);
    });

    it('should handle null pattern', () => {
      const patterns = detectColumnPatterns(null);
      
      expect(patterns).toHaveProperty('numara');
      expect(patterns).toHaveProperty('adi');
      expect(patterns).toHaveProperty('soyadi');
      expect(patterns).toHaveProperty('cinsiyet');
      
      expect(patterns.numara).toBe(false);
      expect(patterns.adi).toBe(false);
      expect(patterns.soyadi).toBe(false);
      expect(patterns.cinsiyet).toBe(false);
    });

    it('should handle undefined pattern', () => {
      const patterns = detectColumnPatterns(undefined);
      
      expect(patterns).toHaveProperty('numara');
      expect(patterns).toHaveProperty('adi');
      expect(patterns).toHaveProperty('soyadi');
      expect(patterns).toHaveProperty('cinsiyet');
      
      expect(patterns.numara).toBe(false);
      expect(patterns.adi).toBe(false);
      expect(patterns.soyadi).toBe(false);
      expect(patterns.cinsiyet).toBe(false);
    });
  });

  describe('getColumnIndex', () => {
    it('should return correct column index', () => {
      const headers = ['Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'];
      const index = getColumnIndex(headers, 'Öğrenci No');
      
      expect(index).toBe(0);
    });

    it('should return -1 for non-existent column', () => {
      const headers = ['Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'];
      const index = getColumnIndex(headers, 'Non-existent Column');
      
      expect(index).toBe(-1);
    });

    it('should handle case insensitive search', () => {
      const headers = ['Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'];
      const index = getColumnIndex(headers, 'öğrenci no');

      expect(index).toBe(0);
    });

    it('should handle search with extra spaces', () => {
      const headers = ['Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'];
      const index = getColumnIndex(headers, '  Öğrenci No  ');
      
      expect(index).toBe(0);
    });

    it('should handle empty headers', () => {
      const headers = [];
      const index = getColumnIndex(headers, 'Öğrenci No');
      
      expect(index).toBe(-1);
    });

    it('should handle null headers', () => {
      const index = getColumnIndex(null, 'Öğrenci No');
      
      expect(index).toBe(-1);
    });

    it('should handle undefined headers', () => {
      const index = getColumnIndex(undefined, 'Öğrenci No');
      
      expect(index).toBe(-1);
    });

    it('should handle null search term', () => {
      const headers = ['Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'];
      const index = getColumnIndex(headers, null);
      
      expect(index).toBe(-1);
    });

    it('should handle undefined search term', () => {
      const headers = ['Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'];
      const index = getColumnIndex(headers, undefined);
      
      expect(index).toBe(-1);
    });
  });

  describe('Column Pattern Edge Cases', () => {
    it('should handle headers with special characters', () => {
      const headers = ['Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'];
      const mapping = createColumnMapping(headers);
      
      expect(mapping).toHaveProperty('numara');
      expect(mapping).toHaveProperty('adi');
      expect(mapping).toHaveProperty('soyadi');
      expect(mapping).toHaveProperty('cinsiyet');
    });

    it('should handle headers with numbers', () => {
      const headers = ['1. Öğrenci No', '2. Adı', '3. Soyadı', '4. Cinsiyet'];
      const mapping = createColumnMapping(headers);
      
      expect(mapping).toHaveProperty('numara');
      expect(mapping).toHaveProperty('adi');
      expect(mapping).toHaveProperty('soyadi');
      expect(mapping).toHaveProperty('cinsiyet');
    });

    it('should handle headers with Turkish characters', () => {
      const headers = ['Öğrenci No', 'Adı', 'Soyadı', 'Cinsiyet'];
      const mapping = createColumnMapping(headers);
      
      expect(mapping).toHaveProperty('numara');
      expect(mapping).toHaveProperty('adi');
      expect(mapping).toHaveProperty('soyadi');
      expect(mapping).toHaveProperty('cinsiyet');
    });

    it('should handle headers with extra whitespace', () => {
      const headers = ['  Öğrenci No  ', '  Adı  ', '  Soyadı  ', '  Cinsiyet  '];
      const mapping = createColumnMapping(headers);
      
      expect(mapping).toHaveProperty('numara');
      expect(mapping).toHaveProperty('adi');
      expect(mapping).toHaveProperty('soyadi');
      expect(mapping).toHaveProperty('cinsiyet');
      
      expect(mapping.numara).toBe(0);
      expect(mapping.adi).toBe(1);
      expect(mapping.soyadi).toBe(2);
      expect(mapping.cinsiyet).toBe(3);
    });
  });
});






































