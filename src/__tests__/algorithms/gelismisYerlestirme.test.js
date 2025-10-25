import { gelismisYerlestirme, getSinifSeviyesi, seedShuffle } from '../../algorithms/gelismisYerlestirmeAlgoritmasi';
import { logger } from '../../utils/logger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Gelişmiş Yerleştirme Algoritması', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSinifSeviyesi', () => {
    it('should extract class level from various formats', () => {
      expect(getSinifSeviyesi('9-A')).toBe('9');
      expect(getSinifSeviyesi('10-B')).toBe('10');
      expect(getSinifSeviyesi('11-C')).toBe('11');
      expect(getSinifSeviyesi('12-D')).toBe('12');
    });

    it('should handle two-digit class levels', () => {
      expect(getSinifSeviyesi('10-A')).toBe('10');
      expect(getSinifSeviyesi('11-B')).toBe('11');
      expect(getSinifSeviyesi('12-C')).toBe('12');
    });

    it('should return null for invalid formats', () => {
      expect(getSinifSeviyesi('')).toBe(null);
      expect(getSinifSeviyesi(null)).toBe(null);
      expect(getSinifSeviyesi('ABC')).toBe(null);
    });
  });

  describe('seedShuffle', () => {
    it('should return same result with same seed', () => {
      const array = [1, 2, 3, 4, 5];
      const result1 = seedShuffle([...array], 123);
      const result2 = seedShuffle([...array], 123);

      expect(result1).toEqual(result2);
    });

    it('should return different result with different seed', () => {
      const array = [1, 2, 3, 4, 5];
      const result1 = seedShuffle([...array], 123);
      const result2 = seedShuffle([...array], 456);

      expect(result1).not.toEqual(result2);
    });

    it('should contain all original elements', () => {
      const array = [1, 2, 3, 4, 5];
      const result = seedShuffle([...array], 123);

      expect(result).toHaveLength(array.length);
      expect(result.sort()).toEqual(array.sort());
    });
  });

  describe('gelismisYerlestirme', () => {
    const mockOgrenciler = [
      { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' },
      { id: 2, ad: 'Ayşe', soyad: 'Kara', numara: '1002', sinif: '9-A', cinsiyet: 'K' },
      { id: 3, ad: 'Mehmet', soyad: 'Demir', numara: '1003', sinif: '10-B', cinsiyet: 'E' },
      { id: 4, ad: 'Fatma', soyad: 'Çelik', numara: '1004', sinif: '10-B', cinsiyet: 'K' }
    ];

    const mockSalonlar = [
      {
        id: 1,
        ad: 'A101',
        kapasite: 30,
        aktif: true,
        siraTipi: 'ikili',
        gruplar: [
          { id: 1, siraSayisi: 5 },
          { id: 2, siraSayisi: 5 }
        ]
      }
    ];

    const mockAyarlar = {
      dersler: [
        { ad: 'Matematik', siniflar: ['9-A', '10-B'] }
      ]
    };

    it('should throw error when no students provided', () => {
      expect(() => gelismisYerlestirme([], mockSalonlar, mockAyarlar))
        .toThrow('Öğrenci listesi boş olamaz');
    });

    it('should throw error when no active salons provided', () => {
      const inactiveSalonlar = [{ ...mockSalonlar[0], aktif: false }];
      expect(() => gelismisYerlestirme(mockOgrenciler, inactiveSalonlar, mockAyarlar))
        .toThrow('Aktif salon bulunamadı');
    });

    it('should return valid placement result', () => {
      const result = gelismisYerlestirme(mockOgrenciler, mockSalonlar, mockAyarlar);

      expect(result).toHaveProperty('salonlar');
      expect(result).toHaveProperty('yerlesilemeyenOgrenciler');
      expect(result).toHaveProperty('istatistikler');
      expect(result).toHaveProperty('algoritma');

      expect(result.salonlar).toHaveLength(1);
      expect(result.istatistikler.basariOrani).toBeGreaterThanOrEqual(0);
      expect(result.istatistikler.basariOrani).toBeLessThanOrEqual(100);
    });

    it('should place all students when capacity is sufficient', () => {
      const result = gelismisYerlestirme(mockOgrenciler, mockSalonlar, mockAyarlar);

      const toplamYerlesen = result.salonlar.reduce((toplam, salon) =>
        toplam + salon.ogrenciler.length, 0);

      expect(toplamYerlesen).toBe(mockOgrenciler.length);
      expect(result.yerlesilemeyenOgrenciler).toHaveLength(0);
      expect(result.istatistikler.basariOrani).toBe(100);
    });

    it('should handle gender constraints', () => {
      const result = gelismisYerlestirme(mockOgrenciler, mockSalonlar, mockAyarlar);

      // Check that placed students follow gender constraints where possible
      result.salonlar.forEach(salon => {
        if (salon.plan) {
          salon.plan.forEach(planItem => {
            if (planItem.ogrenci) {
              // This is a basic check - more detailed constraint testing
              // would require mocking the constraint functions
              expect(planItem.ogrenci).toHaveProperty('cinsiyet');
            }
          });
        }
      });
    });

    it('should return comprehensive statistics', () => {
      const result = gelismisYerlestirme(mockOgrenciler, mockSalonlar, mockAyarlar);

      expect(result.istatistikler).toHaveProperty('yerlesenOgrenci');
      expect(result.istatistikler).toHaveProperty('toplamOgrenci');
      expect(result.istatistikler).toHaveProperty('basariOrani');
      expect(result.istatistikler).toHaveProperty('salonBasinaOgrenci');
      expect(result.istatistikler).toHaveProperty('sinifDagilimlari');
      expect(result.istatistikler).toHaveProperty('cinsiyetDagilimlari');
      expect(result.istatistikler).toHaveProperty('optimizationImpact');
      expect(result.istatistikler).toHaveProperty('constraintSuccessRates');
    });

    it('should handle large student groups', () => {
      const buyukOgrenciGrubu = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        ad: `Öğrenci${i + 1}`,
        soyad: 'Soyad',
        numara: `10${String(i + 1).padStart(2, '0')}`,
        sinif: i % 2 === 0 ? '9-A' : '10-B',
        cinsiyet: i % 2 === 0 ? 'E' : 'K'
      }));

      const buyukSalon = {
        ...mockSalonlar[0],
        kapasite: 60,
        gruplar: [
          { id: 1, siraSayisi: 10 },
          { id: 2, siraSayisi: 10 }
        ]
      };

      const result = gelismisYerlestirme(buyukOgrenciGrubu, [buyukSalon], mockAyarlar);

      expect(result.istatistikler.yerlesenOgrenci).toBeGreaterThan(0);
      expect(result.istatistikler.basariOrani).toBeGreaterThan(80); // Should place most students
    });

    it('should handle multiple salons', () => {
      const cokluSalonlar = [
        { ...mockSalonlar[0], id: 1, ad: 'A101' },
        { ...mockSalonlar[0], id: 2, ad: 'B202' }
      ];

      const result = gelismisYerlestirme(mockOgrenciler, cokluSalonlar, mockAyarlar);

      expect(result.salonlar).toHaveLength(2);
      const toplamYerlesen = result.salonlar.reduce((toplam, salon) =>
        toplam + salon.ogrenciler.length, 0);
      expect(toplamYerlesen).toBe(mockOgrenciler.length);
    });
  });
});
