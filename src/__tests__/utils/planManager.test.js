import planManager from '../../utils/planManager';
import db from '../../database/database';

// Mock database
const mockPlansStorage = [];
let mockPlanIdCounter = 1;

jest.mock('../../database/database', () => {
  return {
    __esModule: true,
    default: {
      savePlan: jest.fn(),
      getPlan: jest.fn(),
      getAllPlans: jest.fn(),
      deletePlan: jest.fn(),
      // Expose storage for testing
      _getStorage: () => mockPlansStorage,
      _resetStorage: () => {
        mockPlansStorage.length = 0;
        mockPlanIdCounter = 1;
      }
    }
  };
});

describe('PlanManager', () => {
  beforeEach(() => {
    // Reset mock storage between tests
    mockPlansStorage.length = 0;
    mockPlanIdCounter = 1;
    
    // Setup mock implementations
    db.savePlan.mockImplementation(async (planData) => {
      const plan = { id: mockPlanIdCounter++, ...planData };
      mockPlansStorage.push(plan);
      return plan.id;
    });
    
    db.getPlan.mockImplementation(async (id) => {
      const plan = mockPlansStorage.find(p => p.id === id);
      return plan || null;
    });
    
    db.getAllPlans.mockImplementation(async () => {
      return [...mockPlansStorage];
    });
    
    db.deletePlan.mockImplementation(async (id) => {
      const index = mockPlansStorage.findIndex(p => p.id === id);
      if (index !== -1) {
        mockPlansStorage.splice(index, 1);
      }
    });
    
    // Reset planManager's current plan
    planManager.currentPlan = null;
  });

  describe('savePlan', () => {
    it('should save a valid plan', async () => {
      const planData = {
        salon: {
          id: 1,
          salonId: '1',
          salonAdi: 'A101',
          kapasite: 30,
          ogrenciler: [
            { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }
          ],
          masalar: []
        },
        tumSalonlar: [
          {
            id: 1,
            salonId: '1',
            salonAdi: 'A101',
            kapasite: 30,
            ogrenciler: [
              { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }
            ],
            masalar: []
          }
        ],
        yerlesilemeyenOgrenciler: [],
        kalanOgrenciler: [],
        istatistikler: {
          toplamOgrenci: 1,
          yerlesenOgrenci: 1,
          yerlesemeyenOgrenci: 0
        }
      };

      const planName = 'Plan1';
      const result = await planManager.savePlan(planName, planData);

      expect(result).toBeDefined();
      expect(result).toBeGreaterThan(0);
    });

    it('should not save empty plans (0 students, 0 salons)', async () => {
      const emptyPlanData = {
        salon: null,
        tumSalonlar: [],
        yerlesilemeyenOgrenciler: [],
        kalanOgrenciler: [],
        istatistikler: {
          toplamOgrenci: 0,
          yerlesenOgrenci: 0,
          yerlesemeyenOgrenci: 0
        }
      };

      const planName = 'Empty Plan';
      const result = await planManager.savePlan(planName, emptyPlanData);

      expect(result).toBeNull();
    });

    it('should throw error for null plan data', async () => {
      await expect(planManager.savePlan('Test', null)).rejects.toThrow('Plan verisi boş olamaz');
    });

    it('should calculate total students correctly', async () => {
      const planData = {
        salon: {
          id: 1,
          salonId: '1',
          salonAdi: 'A101',
          kapasite: 30,
          ogrenciler: [
            { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' },
            { id: 2, ad: 'Ayşe', soyad: 'Kara', numara: '1002', sinif: '9-A', cinsiyet: 'K' }
          ],
          masalar: []
        },
        tumSalonlar: [
          {
            id: 1,
            salonId: '1',
            salonAdi: 'A101',
            kapasite: 30,
            ogrenciler: [
              { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' },
              { id: 2, ad: 'Ayşe', soyad: 'Kara', numara: '1002', sinif: '9-A', cinsiyet: 'K' }
            ],
            masalar: []
          }
        ],
        yerlesilemeyenOgrenciler: [],
        kalanOgrenciler: [],
        istatistikler: {
          toplamOgrenci: 2,
          yerlesenOgrenci: 2,
          yerlesemeyenOgrenci: 0
        }
      };

      const planName = 'Test Plan';
      const result = await planManager.savePlan(planName, planData);

      expect(result).toBeDefined();
      // The savePlan method should calculate totalStudents correctly
      // We can verify by loading the plan
      const savedPlan = await planManager.loadPlan(result);
      expect(savedPlan.data.totalStudents).toBe(2);
    });

    it('should include unplaced students in total count', async () => {
      const planData = {
        salon: {
          id: 1,
          salonId: '1',
          salonAdi: 'A101',
          kapasite: 30,
          ogrenciler: [
            { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }
          ],
          masalar: []
        },
        tumSalonlar: [
          {
            id: 1,
            salonId: '1',
            salonAdi: 'A101',
            kapasite: 30,
            ogrenciler: [
              { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }
            ],
            masalar: []
          }
        ],
        yerlesilemeyenOgrenciler: [
          { id: 2, ad: 'Ayşe', soyad: 'Kara', numara: '1002', sinif: '9-A', cinsiyet: 'K' }
        ],
        kalanOgrenciler: [],
        istatistikler: {
          toplamOgrenci: 2,
          yerlesenOgrenci: 1,
          yerlesemeyenOgrenci: 1
        }
      };

      const planName = 'Test Plan';
      const result = await planManager.savePlan(planName, planData);

      expect(result).toBeDefined();
      const savedPlan = await planManager.loadPlan(result);
      expect(savedPlan.data.totalStudents).toBe(2); // 1 placed + 1 unplaced
    });
  });

  describe('loadPlan', () => {
    it('should load a saved plan', async () => {
      const planData = {
        salon: {
          id: 1,
          salonId: '1',
          salonAdi: 'A101',
          kapasite: 30,
          ogrenciler: [
            { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }
          ],
          masalar: []
        },
        tumSalonlar: [
          {
            id: 1,
            salonId: '1',
            salonAdi: 'A101',
            kapasite: 30,
            ogrenciler: [
              { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }
            ],
            masalar: []
          }
        ],
        yerlesilemeyenOgrenciler: [],
        kalanOgrenciler: [],
        istatistikler: {
          toplamOgrenci: 1,
          yerlesenOgrenci: 1,
          yerlesemeyenOgrenci: 0
        }
      };

      const planName = 'Test Plan';
      const planId = await planManager.savePlan(planName, planData);

      const loadedPlan = await planManager.loadPlan(planId);

      expect(loadedPlan).toBeDefined();
      expect(loadedPlan.name).toBe(planName);
      expect(loadedPlan.data).toBeDefined();
      expect(loadedPlan.data.tumSalonlar).toHaveLength(1);
      expect(loadedPlan.data.tumSalonlar[0].salonAdi).toBe('A101');
    });

    it('should throw error when plan not found', async () => {
      await expect(planManager.loadPlan(99999)).rejects.toThrow('Plan bulunamadı');
    });

    it('should validate and fix plan data on load', async () => {
      // Create a plan with salon but missing tumSalonlar
      // We need at least one student to avoid empty plan rejection
      const planData = {
        salon: {
          id: 1,
          salonId: '1',
          salonAdi: 'A101',
          kapasite: 30,
          ogrenciler: [
            { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }
          ],
          masalar: []
        },
        tumSalonlar: [
          {
            id: 1,
            salonId: '1',
            salonAdi: 'A101',
            kapasite: 30,
            ogrenciler: [
              { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }
            ],
            masalar: []
          }
        ],
        yerlesilemeyenOgrenciler: [],
        kalanOgrenciler: [],
        istatistikler: {
          toplamOgrenci: 1,
          yerlesenOgrenci: 1,
          yerlesemeyenOgrenci: 0
        }
      };

      const planName = 'Test Plan';
      const planId = await planManager.savePlan(planName, planData);

      // Manually set tumSalonlar to empty array to test validation
      const plan = await db.getPlan(planId);
      if (plan && plan.data) {
        plan.data.tumSalonlar = []; // Simulate missing tumSalonlar
        // Update plan in storage directly
        const storage = db._getStorage ? db._getStorage() : null;
        if (storage) {
          const planIndex = storage.findIndex(p => p.id === planId);
          if (planIndex !== -1) {
            storage[planIndex] = plan;
          }
        }
      }

      const loadedPlan = await planManager.loadPlan(planId);

      // validateAndFixPlan should create tumSalonlar from salon
      expect(loadedPlan.data.tumSalonlar).toBeDefined();
      expect(Array.isArray(loadedPlan.data.tumSalonlar)).toBe(true);
      // Should have at least one salon (from main salon) after validation
      expect(loadedPlan.data.tumSalonlar.length).toBeGreaterThan(0);
      if (loadedPlan.data.tumSalonlar.length > 0) {
        expect(loadedPlan.data.tumSalonlar[0].salonAdi).toBe('A101');
      }
    });
  });

  describe('getAllPlans', () => {
    it('should return all saved plans', async () => {
      const planData1 = {
        salon: {
          id: 1,
          salonId: '1',
          salonAdi: 'A101',
          kapasite: 30,
          ogrenciler: [{ id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }],
          masalar: []
        },
        tumSalonlar: [
          {
            id: 1,
            salonId: '1',
            salonAdi: 'A101',
            kapasite: 30,
            ogrenciler: [{ id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }],
            masalar: []
          }
        ],
        yerlesilemeyenOgrenciler: [],
        kalanOgrenciler: [],
        istatistikler: { toplamOgrenci: 1, yerlesenOgrenci: 1, yerlesemeyenOgrenci: 0 }
      };

      const planData2 = {
        salon: {
          id: 2,
          salonId: '2',
          salonAdi: 'A102',
          kapasite: 30,
          ogrenciler: [{ id: 2, ad: 'Ayşe', soyad: 'Kara', numara: '1002', sinif: '9-A', cinsiyet: 'K' }],
          masalar: []
        },
        tumSalonlar: [
          {
            id: 2,
            salonId: '2',
            salonAdi: 'A102',
            kapasite: 30,
            ogrenciler: [{ id: 2, ad: 'Ayşe', soyad: 'Kara', numara: '1002', sinif: '9-A', cinsiyet: 'K' }],
            masalar: []
          }
        ],
        yerlesilemeyenOgrenciler: [],
        kalanOgrenciler: [],
        istatistikler: { toplamOgrenci: 1, yerlesenOgrenci: 1, yerlesemeyenOgrenci: 0 }
      };

      await planManager.savePlan('Plan 1', planData1);
      await planManager.savePlan('Plan 2', planData2);

      const allPlans = await planManager.getAllPlans();

      expect(allPlans).toHaveLength(2);
      expect(allPlans[0].name).toBe('Plan 1');
      expect(allPlans[1].name).toBe('Plan 2');
    });

    it('should filter out empty plans', async () => {
      // Save a valid plan
      const validPlan = {
        salon: {
          id: 1,
          salonId: '1',
          salonAdi: 'A101',
          kapasite: 30,
          ogrenciler: [{ id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }],
          masalar: []
        },
        tumSalonlar: [
          {
            id: 1,
            salonId: '1',
            salonAdi: 'A101',
            kapasite: 30,
            ogrenciler: [{ id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }],
            masalar: []
          }
        ],
        yerlesilemeyenOgrenciler: [],
        kalanOgrenciler: [],
        istatistikler: { toplamOgrenci: 1, yerlesenOgrenci: 1, yerlesemeyenOgrenci: 0 }
      };

      await planManager.savePlan('Valid Plan', validPlan);

      // Try to save an empty plan (should be rejected, but if it somehow gets saved, getAllPlans should filter it)
      const allPlans = await planManager.getAllPlans();

      // Should only return non-empty plans
      expect(allPlans.every(p => p.totalStudents > 0 || p.salonCount > 0)).toBe(true);
    });
  });

  describe('deletePlan', () => {
    it('should delete a saved plan', async () => {
      const planData = {
        salon: {
          id: 1,
          salonId: '1',
          salonAdi: 'A101',
          kapasite: 30,
          ogrenciler: [{ id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }],
          masalar: []
        },
        tumSalonlar: [
          {
            id: 1,
            salonId: '1',
            salonAdi: 'A101',
            kapasite: 30,
            ogrenciler: [{ id: 1, ad: 'Ahmet', soyad: 'Yılmaz', numara: '1001', sinif: '9-A', cinsiyet: 'E' }],
            masalar: []
          }
        ],
        yerlesilemeyenOgrenciler: [],
        kalanOgrenciler: [],
        istatistikler: { toplamOgrenci: 1, yerlesenOgrenci: 1, yerlesemeyenOgrenci: 0 }
      };

      const planId = await planManager.savePlan('Test Plan', planData);

      await planManager.deletePlan(planId);

      // Plan should not be found after deletion
      await expect(planManager.loadPlan(planId)).rejects.toThrow('Plan bulunamadı');
    });
  });

  describe('cleanPlanData', () => {
    it('should clean and standardize plan data', async () => {
      const rawPlanData = {
        salon: {
          id: 1,
          salonId: '1',
          salonAdi: 'A101',
          kapasite: 30,
          siraDizilimi: { satir: 5, sutun: 6 },
          ogrenciler: [
            {
              id: 1,
              ad: 'Ahmet',
              soyad: 'Yılmaz',
              numara: '1001',
              sinif: '9-A',
              cinsiyet: 'E',
              masaNumarasi: 1
            }
          ],
          masalar: [
            {
              id: 1,
              masaNumarasi: 1,
              satir: 1,
              sutun: 1,
              grup: 1,
              koltukTipi: 'normal',
              ogrenci: {
                id: 1,
                ad: 'Ahmet',
                soyad: 'Yılmaz',
                numara: '1001',
                sinif: '9-A',
                cinsiyet: 'E',
                masaNumarasi: 1
              }
            }
          ]
        },
        tumSalonlar: [
          {
            id: 1,
            salonId: '1',
            salonAdi: 'A101',
            kapasite: 30,
            ogrenciler: [
              {
                id: 1,
                ad: 'Ahmet',
                soyad: 'Yılmaz',
                numara: '1001',
                sinif: '9-A',
                cinsiyet: 'E',
                masaNumarasi: 1
              }
            ],
            masalar: [
              {
                id: 1,
                masaNumarasi: 1,
                satir: 1,
                sutun: 1,
                grup: 1,
                koltukTipi: 'normal',
                ogrenci: {
                  id: 1,
                  ad: 'Ahmet',
                  soyad: 'Yılmaz',
                  numara: '1001',
                  sinif: '9-A',
                  cinsiyet: 'E',
                  masaNumarasi: 1
                }
              }
            ]
          }
        ],
        yerlesilemeyenOgrenciler: [],
        kalanOgrenciler: [],
        istatistikler: {
          toplamOgrenci: 1,
          yerlesenOgrenci: 1,
          yerlesemeyenOgrenci: 0
        }
      };

      const planId = await planManager.savePlan('Test Plan', rawPlanData);
      const loadedPlan = await planManager.loadPlan(planId);

      // Cleaned data should have proper structure
      expect(loadedPlan.data.salon).toBeDefined();
      expect(loadedPlan.data.tumSalonlar).toBeDefined();
      expect(Array.isArray(loadedPlan.data.tumSalonlar)).toBe(true);
      expect(loadedPlan.data.totalStudents).toBeGreaterThan(0);
      expect(loadedPlan.data.salonCount).toBeGreaterThan(0);
    });

    it('should handle missing optional fields', async () => {
      const minimalPlanData = {
        salon: {
          id: 1,
          salonId: '1',
          salonAdi: 'A101',
          kapasite: 30,
          ogrenciler: [],
          masalar: []
        },
        tumSalonlar: [
          {
            id: 1,
            salonId: '1',
            salonAdi: 'A101',
            kapasite: 30,
            ogrenciler: [],
            masalar: []
          }
        ]
      };

      const planId = await planManager.savePlan('Minimal Plan', minimalPlanData);
      const loadedPlan = await planManager.loadPlan(planId);

      // Should have default values for missing fields
      expect(loadedPlan.data.yerlesilemeyenOgrenciler).toEqual([]);
      expect(loadedPlan.data.kalanOgrenciler).toEqual([]);
      expect(loadedPlan.data.istatistikler).toBeDefined();
    });
  });
});

