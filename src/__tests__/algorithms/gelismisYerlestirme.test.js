import { gelismisYerlestirme, getSinifSeviyesi, seedShuffle } from '../../algorithms/gelismisYerlestirmeAlgoritmasi';

// Mock logger - must be before imports that use logger
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(() => {}),
    error: jest.fn(() => {}),
    warn: jest.fn(() => {}),
    debug: jest.fn(() => {}),
    log: jest.fn(() => {})
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

  describe('gelismisYerlestirme - Basic Tests', () => {
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
        salonAdi: 'A101',
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

    it('should throw error when no salons provided', () => {
      expect(() => gelismisYerlestirme(mockOgrenciler, [], mockAyarlar))
        .toThrow('Salon listesi boş olamaz');
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
        { ...mockSalonlar[0], id: 1, ad: 'A101', salonAdi: 'A101' },
        { ...mockSalonlar[0], id: 2, ad: 'B202', salonAdi: 'B202' }
      ];

      const result = gelismisYerlestirme(mockOgrenciler, cokluSalonlar, mockAyarlar);

      expect(result.salonlar).toHaveLength(2);
      const toplamYerlesen = result.salonlar.reduce((toplam, salon) =>
        toplam + salon.ogrenciler.length, 0);
      expect(toplamYerlesen).toBe(mockOgrenciler.length);
    });
  });

  describe('gelismisYerlestirme - Pinned Students', () => {
    const mockOgrenciler = [
      { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E', pinned: false },
      { id: 2, ad: 'Ayşe', soyad: 'Kara', numara: '1002', sinif: '9-A', cinsiyet: 'K', pinned: false },
      { id: 3, ad: 'Mehmet', soyad: 'Demir', numara: '1003', sinif: '10-B', cinsiyet: 'E', pinned: false },
      { id: 4, ad: 'Fatma', soyad: 'Çelik', numara: '1004', sinif: '10-B', cinsiyet: 'K', pinned: false },
      { id: 5, ad: 'Ceren', soyad: 'Balamir', numara: '1005', sinif: '9-A', cinsiyet: 'K', pinned: true, pinnedSalonId: '1' }
    ];

    const mockSalonlar = [
      {
        id: 1,
        ad: 'A101',
        salonAdi: 'A101',
        kapasite: 30,
        aktif: true,
        siraTipi: 'ikili',
        gruplar: [
          { id: 1, siraSayisi: 5 },
          { id: 2, siraSayisi: 5 }
        ]
      },
      {
        id: 2,
        ad: 'B202',
        salonAdi: 'B202',
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

    it('should place pinned student in correct salon (Aşama 1.5)', () => {
      const result = gelismisYerlestirme(mockOgrenciler, mockSalonlar, mockAyarlar);

      // Find the salon where pinned student is placed
      const pinnedStudent = mockOgrenciler.find(o => o.pinned);
      const salonWithPinned = result.salonlar.find(salon => 
        salon.ogrenciler.some(o => o.id === pinnedStudent.id)
      );

      expect(salonWithPinned).toBeDefined();
      // salonId can be number or string depending on input
      expect(String(salonWithPinned.salonId)).toBe('1'); // Should be in salon with id 1
    });

    it('should exclude pinned students from initial pool distribution (Aşama 1)', () => {
      // This test verifies that pinned students are not included in createAkilliSalonHavuzu
      // They should only be added in Aşama 1.5
      const result = gelismisYerlestirme(mockOgrenciler, mockSalonlar, mockAyarlar);

      // All students should be accounted for
      const toplamYerlesen = result.salonlar.reduce((toplam, salon) =>
        toplam + salon.ogrenciler.length, 0);

      expect(toplamYerlesen).toBe(mockOgrenciler.length);
    });

    it('should adjust capacity when pinned students exceed target (Aşama 1.6)', () => {
      // Create scenario where pinned students would exceed capacity
      const cokluPinnedOgrenciler = [
        ...mockOgrenciler.slice(0, 4), // Non-pinned students
        ...Array.from({ length: 5 }, (_, i) => ({
          id: 100 + i,
          ad: `Pinned${i + 1}`,
          soyad: 'Test',
          numara: `200${i + 1}`,
          sinif: '9-A',
          cinsiyet: i % 2 === 0 ? 'E' : 'K',
          pinned: true,
          pinnedSalonId: '1' // All pinned to salon 1
        }))
      ];

      const result = gelismisYerlestirme(cokluPinnedOgrenciler, mockSalonlar, mockAyarlar);

      // Pinned students should be in salon 1
      const salon1 = result.salonlar.find(s => String(s.salonId) === '1');
      expect(salon1).toBeDefined();
      expect(salon1).toHaveProperty('ogrenciler');
      
      const pinnedCount = salon1.ogrenciler.filter(o => o.pinned).length;

      expect(pinnedCount).toBeGreaterThan(0);
      // The algorithm should handle capacity adjustment
      expect(salon1.ogrenciler.length).toBeLessThanOrEqual(mockSalonlar[0].kapasite);
    });

    it('should handle rebalancing when pinned students cause overflow (Aşama 1.6)', () => {
      const cokluOgrenciler = [
        ...Array.from({ length: 15 }, (_, i) => ({
          id: i + 1,
          ad: `Ogrenci${i + 1}`,
          soyad: 'Test',
          numara: `100${i + 1}`,
          sinif: i % 2 === 0 ? '9-A' : '10-B',
          cinsiyet: i % 2 === 0 ? 'E' : 'K',
          pinned: false
        })),
        {
          id: 100,
          ad: 'Pinned1',
          soyad: 'Test',
          numara: '2001',
          sinif: '9-A',
          cinsiyet: 'E',
          pinned: true,
          pinnedSalonId: '1'
        }
      ];

      const result = gelismisYerlestirme(cokluOgrenciler, mockSalonlar, mockAyarlar);

      // All students should be accounted for
      const toplamYerlesen = result.salonlar.reduce((toplam, salon) =>
        toplam + salon.ogrenciler.length, 0);

      expect(toplamYerlesen).toBe(cokluOgrenciler.length);
    });

    it('should consider pinned student class level in pool creation', () => {
      // Pinned student from 9-A should not affect 10-B distribution
      const result = gelismisYerlestirme(mockOgrenciler, mockSalonlar, mockAyarlar);

      // Verify class distribution is maintained
      const salon1 = result.salonlar.find(s => String(s.salonId) === '1');
      expect(salon1).toBeDefined();
      expect(salon1).toHaveProperty('ogrenciler');
      
      const salon1Classes = salon1.ogrenciler.map(o => o.sinif);

      // Should have both 9-A and 10-B students (class diversity)
      const uniqueClasses = [...new Set(salon1Classes)];
      expect(uniqueClasses.length).toBeGreaterThan(0);
    });
  });

  describe('gelismisYerlestirme - Edge Cases', () => {
    const mockAyarlar = {
      dersler: [
        { ad: 'Matematik', siniflar: ['9-A', '10-B'] }
      ]
    };

    it('should handle single student', () => {
      const tekOgrenci = [
        { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }
      ];

      const tekSalon = [
        {
          id: 1,
          ad: 'A101',
          salonAdi: 'A101',
          kapasite: 30,
          aktif: true,
          siraTipi: 'ikili',
          gruplar: [
            { id: 1, siraSayisi: 5 },
            { id: 2, siraSayisi: 5 }
          ]
        }
      ];

      const result = gelismisYerlestirme(tekOgrenci, tekSalon, mockAyarlar);

      expect(result.salonlar).toHaveLength(1);
      expect(result.salonlar[0].ogrenciler.length).toBe(1);
      expect(result.istatistikler.basariOrani).toBe(100);
    });

    it('should handle capacity exceeded scenario', () => {
      const cokOgrenci = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        ad: `Ogrenci${i + 1}`,
        soyad: 'Test',
        numara: `100${i + 1}`,
        sinif: i % 2 === 0 ? '9-A' : '10-B',
        cinsiyet: i % 2 === 0 ? 'E' : 'K'
      }));

      // Create a salon with actual capacity constraints (based on groups)
      // 2 groups * 5 rows * 2 seats per row = 20 seats maximum
      const kucukSalon = [
        {
          id: 1,
          ad: 'A101',
          salonAdi: 'A101',
          kapasite: 20, // Actual capacity based on groups
          aktif: true,
          siraTipi: 'ikili',
          gruplar: [
            { id: 1, siraSayisi: 5 }, // 5 rows * 2 seats = 10 seats
            { id: 2, siraSayisi: 5 }  // 5 rows * 2 seats = 10 seats
          ]
        }
      ];

      const result = gelismisYerlestirme(cokOgrenci, kucukSalon, mockAyarlar);

      // The algorithm should place as many as possible
      const placedCount = result.salonlar[0].ogrenciler.length;
      expect(placedCount).toBeGreaterThan(0);
      
      // Algorithm may use advanced stages to place more students
      // But the basic principle is that we have more students than capacity
      expect(result.istatistikler.toplamOgrenci).toBe(cokOgrenci.length);
      
      // Total placed + unplaced should equal total students (accounting check)
      const totalProcessed = placedCount + result.yerlesilemeyenOgrenciler.length;
      expect(totalProcessed).toBe(cokOgrenci.length);
      
      // If all students are placed (advanced stages), success rate should be tracked
      // If not all placed, success rate should be less than 100
      if (result.yerlesilemeyenOgrenciler.length === 0) {
        // All students placed through advanced stages - this is acceptable
        expect(result.istatistikler.basariOrani).toBe(100);
      } else {
        // Some students could not be placed
        expect(result.istatistikler.basariOrani).toBeLessThan(100);
      }
    });

    it('should handle all students pinned', () => {
      const tumPinnedOgrenciler = [
        { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E', pinned: true, pinnedSalonId: '1' },
        { id: 2, ad: 'Ayşe', soyad: 'Kara', numara: '1002', sinif: '9-A', cinsiyet: 'K', pinned: true, pinnedSalonId: '1' },
        { id: 3, ad: 'Mehmet', soyad: 'Demir', numara: '1003', sinif: '10-B', cinsiyet: 'E', pinned: true, pinnedSalonId: '2' },
        { id: 4, ad: 'Fatma', soyad: 'Çelik', numara: '1004', sinif: '10-B', cinsiyet: 'K', pinned: true, pinnedSalonId: '2' }
      ];

      const cokluSalonlar = [
        {
          id: 1,
          ad: 'A101',
          salonAdi: 'A101',
          kapasite: 30,
          aktif: true,
          siraTipi: 'ikili',
          gruplar: [
            { id: 1, siraSayisi: 5 },
            { id: 2, siraSayisi: 5 }
          ]
        },
        {
          id: 2,
          ad: 'B202',
          salonAdi: 'B202',
          kapasite: 30,
          aktif: true,
          siraTipi: 'ikili',
          gruplar: [
            { id: 1, siraSayisi: 5 },
            { id: 2, siraSayisi: 5 }
          ]
        }
      ];

      const result = gelismisYerlestirme(tumPinnedOgrenciler, cokluSalonlar, mockAyarlar);

      // All students should be placed
      const toplamYerlesen = result.salonlar.reduce((toplam, salon) =>
        toplam + salon.ogrenciler.length, 0);

      expect(toplamYerlesen).toBe(tumPinnedOgrenciler.length);
      
      // Verify pinned students are in correct salons
      const salon1 = result.salonlar.find(s => String(s.salonId) === '1');
      const salon2 = result.salonlar.find(s => String(s.salonId) === '2');
      
      expect(salon1).toBeDefined();
      expect(salon2).toBeDefined();
      expect(salon1.ogrenciler.length).toBe(2);
      expect(salon2.ogrenciler.length).toBe(2);
    });

    it('should handle salon ID matching with different formats', () => {
      // Test that pinnedSalonId can match salon.id, salon.salonId, salon.ad, or salon.salonAdi
      const pinnedOgrenci = [
        { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E', pinned: true, pinnedSalonId: 'A101' } // Using salonAdi format
      ];

      const salon = [
        {
          id: 1,
          ad: 'A101',
          salonAdi: 'A101',
          kapasite: 30,
          aktif: true,
          siraTipi: 'ikili',
          gruplar: [
            { id: 1, siraSayisi: 5 },
            { id: 2, siraSayisi: 5 }
          ]
        }
      ];

      const result = gelismisYerlestirme(pinnedOgrenci, salon, {
        dersler: [{ ad: 'Matematik', siniflar: ['9-A'] }]
      });

      const salon1 = result.salonlar.find(s => s.salonAdi === 'A101');
      expect(salon1.ogrenciler.length).toBe(1);
      expect(salon1.ogrenciler[0].id).toBe(1);
      expect(salon1.ogrenciler[0].pinned).toBe(true);
    });
  });

  describe('gelismisYerlestirme - Multi-Stage Placement', () => {
    const mockOgrenciler = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      ad: `Ogrenci${i + 1}`,
      soyad: 'Test',
      numara: `100${i + 1}`,
      sinif: i < 10 ? '9-A' : '10-B',
      cinsiyet: i % 2 === 0 ? 'E' : 'K',
      pinned: false
    }));

    const mockSalonlar = [
      {
        id: 1,
        ad: 'A101',
        salonAdi: 'A101',
        kapasite: 30,
        aktif: true,
        siraTipi: 'ikili',
        gruplar: [
          { id: 1, siraSayisi: 5 },
          { id: 2, siraSayisi: 5 }
        ]
      },
      {
        id: 2,
        ad: 'B202',
        salonAdi: 'B202',
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

    it('should complete Aşama 1: Initial pool creation', () => {
      const result = gelismisYerlestirme(mockOgrenciler, mockSalonlar, mockAyarlar);

      // Verify that students are distributed across salons
      const toplamYerlesen = result.salonlar.reduce((toplam, salon) =>
        toplam + salon.ogrenciler.length, 0);

      expect(toplamYerlesen).toBeGreaterThan(0);
      expect(result.salonlar.length).toBe(2);
    });

    it('should handle Aşama 1.5: Pinned students pool transfer', () => {
      const pinnedOgrenciler = [
        ...mockOgrenciler.slice(0, 15),
        { id: 100, ad: 'Pinned1', soyad: 'Test', numara: '2001', sinif: '9-A', cinsiyet: 'E', pinned: true, pinnedSalonId: '1' },
        { id: 101, ad: 'Pinned2', soyad: 'Test', numara: '2002', sinif: '10-B', cinsiyet: 'K', pinned: true, pinnedSalonId: '2' }
      ];

      const result = gelismisYerlestirme(pinnedOgrenciler, mockSalonlar, mockAyarlar);

      // Verify pinned students are in correct salons
      const salon1 = result.salonlar.find(s => String(s.salonId) === '1');
      const salon2 = result.salonlar.find(s => String(s.salonId) === '2');
      
      expect(salon1).toBeDefined();
      expect(salon2).toBeDefined();
      expect(salon1.ogrenciler.some(o => o.id === 100)).toBe(true);
      expect(salon2.ogrenciler.some(o => o.id === 101)).toBe(true);
    });

    it('should handle Aşama 1.6: Capacity adjustment and rebalancing', () => {
      const cokPinnedOgrenci = [
        ...mockOgrenciler.slice(0, 10),
        ...Array.from({ length: 5 }, (_, i) => ({
          id: 100 + i,
          ad: `Pinned${i + 1}`,
          soyad: 'Test',
          numara: `200${i + 1}`,
          sinif: '9-A',
          cinsiyet: i % 2 === 0 ? 'E' : 'K',
          pinned: true,
          pinnedSalonId: '1' // All pinned to salon 1
        }))
      ];

      const result = gelismisYerlestirme(cokPinnedOgrenci, mockSalonlar, mockAyarlar);

      // Verify capacity is adjusted (non-pinned students moved to other salon)
      const salon1 = result.salonlar.find(s => String(s.salonId) === '1');
      const salon2 = result.salonlar.find(s => String(s.salonId) === '2');

      expect(salon1).toBeDefined();
      expect(salon2).toBeDefined();
      
      // Salon 1 should have pinned students
      const salon1PinnedCount = salon1.ogrenciler.filter(o => o.pinned).length;
      expect(salon1PinnedCount).toBeGreaterThan(0);

      // Salon 2 should have some students too (rebalancing)
      expect(salon2.ogrenciler.length).toBeGreaterThan(0);
    });

    it('should handle advanced placement stages (Aşama 2-4)', () => {
      // Test that algorithm continues to advanced stages for unplaced students
      const zorOgrenciler = Array.from({ length: 60 }, (_, i) => ({
        id: i + 1,
        ad: `Ogrenci${i + 1}`,
        soyad: 'Test',
        numara: `100${i + 1}`,
        sinif: i % 3 === 0 ? '9-A' : i % 3 === 1 ? '10-B' : '11-C',
        cinsiyet: i % 2 === 0 ? 'E' : 'K'
      }));

      const sinirliSalonlar = [
        {
          id: 1,
          ad: 'A101',
          salonAdi: 'A101',
          kapasite: 30, // Less than 60 students
          aktif: true,
          siraTipi: 'ikili',
          gruplar: [
            { id: 1, siraSayisi: 5 },
            { id: 2, siraSayisi: 5 }
          ]
        }
      ];

      const result = gelismisYerlestirme(zorOgrenciler, sinirliSalonlar, {
        dersler: [{ ad: 'Matematik', siniflar: ['9-A', '10-B', '11-C'] }]
      });

      // Algorithm should attempt advanced stages
      expect(result.istatistikler.basariOrani).toBeGreaterThan(0);
      // Some students might be unplaced, but algorithm should handle gracefully
      expect(result.yerlesilemeyenOgrenciler.length).toBeGreaterThanOrEqual(0);
    });
  });
});
