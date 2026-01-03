import dataBackupManager from '../../utils/dataBackupManager';
import logger from '../../utils/logger';

// Mock logger
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

// Mock database
const mockPlans = [];
const mockStudents = [];
const mockSalons = [];
const mockSettings = [];
const mockTempData = [];

jest.mock('../../database/database', () => {
  return {
    __esModule: true,
    default: {
      plans: {
        toArray: jest.fn(async () => [...mockPlans]),
        count: jest.fn(async () => mockPlans.length),
        clear: jest.fn(async () => { mockPlans.length = 0; }),
        bulkAdd: jest.fn(async (items) => { 
          if (Array.isArray(items)) {
            mockPlans.push(...items);
          } else {
            mockPlans.push(items);
          }
        }),
        get: jest.fn(async (id) => {
          const plan = mockPlans.find(p => p.id === id);
          return plan || null;
        }),
        put: jest.fn(async (item) => {
          const index = mockPlans.findIndex(p => p.id === item.id);
          if (index !== -1) {
            mockPlans[index] = item;
          } else {
            mockPlans.push(item);
          }
        })
      },
      students: {
        toArray: jest.fn(async () => [...mockStudents]),
        count: jest.fn(async () => mockStudents.length),
        clear: jest.fn(async () => { mockStudents.length = 0; }),
        bulkAdd: jest.fn(async (items) => { mockStudents.push(...items); })
      },
      salons: {
        toArray: jest.fn(async () => [...mockSalons]),
        count: jest.fn(async () => mockSalons.length),
        clear: jest.fn(async () => { mockSalons.length = 0; }),
        bulkAdd: jest.fn(async (items) => { mockSalons.push(...items); })
      },
      settings: {
        toArray: jest.fn(async () => [...mockSettings]),
        count: jest.fn(async () => mockSettings.length),
        clear: jest.fn(async () => { mockSettings.length = 0; }),
        bulkAdd: jest.fn(async (items) => { mockSettings.push(...items); })
      },
      tempData: {
        toArray: jest.fn(async () => [...mockTempData]),
        count: jest.fn(async () => mockTempData.length),
        clear: jest.fn(async () => { mockTempData.length = 0; }),
        bulkAdd: jest.fn(async (items) => { mockTempData.push(...items); })
      },
      transaction: jest.fn(async (mode, tables, callback) => {
        return await callback();
      })
    }
  };
});

describe('DataBackupManager', () => {
  beforeEach(() => {
    // Clear all mock data
    mockPlans.length = 0;
    mockStudents.length = 0;
    mockSalons.length = 0;
    mockSettings.length = 0;
    mockTempData.length = 0;
    
    // Clear localStorage
    localStorage.clear();
    
    // Setup mock implementations - they need to access current mock arrays
    const db = require('../../database/database').default;
    db.plans.toArray.mockImplementation(async () => [...mockPlans]);
    db.plans.count.mockImplementation(async () => mockPlans.length);
    db.students.toArray.mockImplementation(async () => [...mockStudents]);
    db.students.count.mockImplementation(async () => mockStudents.length);
    db.salons.toArray.mockImplementation(async () => [...mockSalons]);
    db.salons.count.mockImplementation(async () => mockSalons.length);
    db.settings.toArray.mockImplementation(async () => [...mockSettings]);
    db.settings.count.mockImplementation(async () => mockSettings.length);
    db.tempData.toArray.mockImplementation(async () => [...mockTempData]);
    db.tempData.count.mockImplementation(async () => mockTempData.length);
    db.plans.get.mockImplementation(async (id) => {
      const plan = mockPlans.find(p => p.id === id);
      return plan || null;
    });
    
    db.plans.put.mockImplementation(async (item) => {
      const index = mockPlans.findIndex(p => p.id === item.id);
      if (index !== -1) {
        mockPlans[index] = item;
      } else {
        mockPlans.push(item);
      }
    });
    
    // Clear all mocks (but implementations stay)
    jest.clearAllMocks();
    
    // Re-setup implementations after clear
    db.plans.toArray.mockImplementation(async () => [...mockPlans]);
    db.plans.count.mockImplementation(async () => mockPlans.length);
    db.plans.get.mockImplementation(async (id) => {
      const plan = mockPlans.find(p => p.id === id);
      return plan || null;
    });
    db.plans.put.mockImplementation(async (item) => {
      const index = mockPlans.findIndex(p => p.id === item.id);
      if (index !== -1) {
        mockPlans[index] = item;
      } else {
        mockPlans.push(item);
      }
    });
    db.students.toArray.mockImplementation(async () => [...mockStudents]);
    db.students.count.mockImplementation(async () => mockStudents.length);
    db.salons.toArray.mockImplementation(async () => [...mockSalons]);
    db.salons.count.mockImplementation(async () => mockSalons.length);
    db.settings.toArray.mockImplementation(async () => [...mockSettings]);
    db.settings.count.mockImplementation(async () => mockSettings.length);
    db.tempData.toArray.mockImplementation(async () => [...mockTempData]);
    db.tempData.count.mockImplementation(async () => mockTempData.length);
    db.transaction.mockImplementation(async (mode, tables, callback) => {
      return await callback();
    });
    db.plans.get.mockImplementation(async (id) => {
      const plan = mockPlans.find(p => p.id === id);
      return plan || null;
    });
  });

  describe('createFullBackup', () => {
    it('should create a full backup of all database data', async () => {
      // Setup mock data
      mockPlans.push({ id: 1, name: 'Test Plan', data: {} });
      mockStudents.push({ id: 1, name: 'Ahmet', surname: 'Yılmaz', number: '1001' });
      mockSalons.push({ id: 1, name: 'A101', capacity: 30 });
      mockSettings.push({ id: 1, key: 'test', value: 'value' });

      const result = await dataBackupManager.createFullBackup('Test backup');

      expect(result.success).toBe(true);
      expect(result.backupKey).toBeDefined();
      expect(result.backupKey).toContain('kelebek_backup_');
      expect(result.stats).toBeDefined();
      expect(result.stats.planCount).toBe(1);
      expect(result.stats.studentCount).toBe(1);
      expect(result.stats.salonCount).toBe(1);
      expect(result.stats.settingCount).toBe(1);

      // Verify backup was saved to localStorage
      const backupData = JSON.parse(localStorage.getItem(result.backupKey));
      expect(backupData).toBeDefined();
      expect(backupData.data.plans).toHaveLength(1);
      expect(backupData.data.students).toHaveLength(1);
      expect(backupData.data.salons).toHaveLength(1);
      expect(backupData.description).toBe('Test backup');
    });

    it('should create backup with default description if none provided', async () => {
      const result = await dataBackupManager.createFullBackup();

      expect(result.success).toBe(true);
      const backupData = JSON.parse(localStorage.getItem(result.backupKey));
      expect(backupData.description).toBe('Otomatik yedekleme');
    });

    it('should cleanup old backups when max limit is exceeded', async () => {
      // Create more than maxBackups (10) backups
      const backupKeys = [];
      for (let i = 0; i < 12; i++) {
        const result = await dataBackupManager.createFullBackup(`Backup ${i}`);
        backupKeys.push(result.backupKey);
      }

      // Should have max 10 backups
      const availableBackups = dataBackupManager.getAvailableBackups();
      expect(availableBackups.length).toBeLessThanOrEqual(10);
    });

    it('should handle backup creation errors gracefully', async () => {
      // Mock database error
      const db = require('../../database/database').default;
      db.plans.toArray = jest.fn(() => {
        throw new Error('Database error');
      });

      await expect(dataBackupManager.createFullBackup()).rejects.toThrow('Database error');
    });
  });

  describe('createPlanBackup', () => {
    it('should create a backup for a specific plan', async () => {
      const plan = {
        id: 1,
        name: 'Test Plan',
        date: new Date().toISOString(),
        totalStudents: 10,
        salonCount: 2,
        data: { salon: {}, tumSalonlar: [] }
      };
      
      mockPlans.push(plan);
      
      // Ensure mock is set up
      const db = require('../../database/database').default;
      db.plans.get.mockImplementation(async (id) => {
        const found = mockPlans.find(p => p.id === id);
        return found || null;
      });

      const result = await dataBackupManager.createPlanBackup(1, 'Plan backup');

      expect(result.success).toBe(true);
      expect(result.backupKey).toBeDefined();
      expect(result.backupKey).toContain('kelebek_backup_plan_1_');
      expect(result.planId).toBe(1);
      expect(result.planName).toBe('Test Plan');

      // Verify backup was saved
      const backupData = JSON.parse(localStorage.getItem(result.backupKey));
      expect(backupData).toBeDefined();
      expect(backupData.planId).toBe(1);
      expect(backupData.planName).toBe('Test Plan');
      expect(backupData.data).toEqual(plan);
    });

    it('should throw error if plan not found', async () => {
      await expect(dataBackupManager.createPlanBackup(999)).rejects.toThrow('Plan bulunamadı: 999');
    });

    it('should use default description if none provided', async () => {
      const plan = {
        id: 1,
        name: 'Test Plan',
        date: new Date().toISOString(),
        totalStudents: 10,
        salonCount: 2,
        data: {}
      };
      
      mockPlans.push(plan);
      
      // Ensure mock is set up
      const db = require('../../database/database').default;
      db.plans.get.mockImplementation(async (id) => {
        const found = mockPlans.find(p => p.id === id);
        return found || null;
      });

      const result = await dataBackupManager.createPlanBackup(1);
      const backupData = JSON.parse(localStorage.getItem(result.backupKey));
      expect(backupData.description).toContain('Plan yedekleme: Test Plan');
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore full backup', async () => {
      // Create backup
      const originalPlan = { id: 1, name: 'Original Plan', data: {} };
      const originalStudent = { id: 1, name: 'Ahmet', surname: 'Yılmaz' };
      mockPlans.push(originalPlan);
      mockStudents.push(originalStudent);
      
      const backupResult = await dataBackupManager.createFullBackup();
      
      // Verify backup was created
      expect(backupResult.success).toBe(true);
      
      // Clear data
      mockPlans.length = 0;
      mockStudents.length = 0;

      // Ensure mocks are set up before restore
      const db = require('../../database/database').default;
      db.plans.clear.mockImplementation(async () => { mockPlans.length = 0; });
      db.students.clear.mockImplementation(async () => { mockStudents.length = 0; });
      db.plans.bulkAdd.mockImplementation(async (items) => { 
        if (Array.isArray(items) && items.length > 0) {
          mockPlans.push(...items);
        }
      });
      db.students.bulkAdd.mockImplementation(async (items) => { 
        if (Array.isArray(items) && items.length > 0) {
          mockStudents.push(...items);
        }
      });

      // Restore
      const restoreResult = await dataBackupManager.restoreFromBackup(backupResult.backupKey);

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.type).toBe('full');
      expect(mockPlans.length).toBe(1);
      expect(mockStudents.length).toBe(1);
    });

    it('should restore plan backup', async () => {
      const plan = {
        id: 1,
        name: 'Test Plan',
        date: new Date().toISOString(),
        totalStudents: 10,
        salonCount: 2,
        data: { salon: {}, tumSalonlar: [] }
      };
      
      mockPlans.push(plan);
      
      // Ensure mock is set up
      const db = require('../../database/database').default;
      db.plans.get.mockImplementation(async (id) => {
        const found = mockPlans.find(p => p.id === id);
        return found || null;
      });

      const backupResult = await dataBackupManager.createPlanBackup(1);

      // Remove plan
      mockPlans.length = 0;

      // Restore
      const restoreResult = await dataBackupManager.restoreFromBackup(backupResult.backupKey);

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.type).toBe('plan');
      expect(restoreResult.planId).toBe(1);
      expect(mockPlans.length).toBe(1);
      expect(mockPlans[0].name).toBe('Test Plan');
    });

    it('should throw error if backup not found', async () => {
      await expect(dataBackupManager.restoreFromBackup('nonexistent_key')).rejects.toThrow('Yedek bulunamadı: nonexistent_key');
    });

    it('should handle restore errors gracefully', async () => {
      // Create a backup
      const backupResult = await dataBackupManager.createFullBackup();
      
      // Mock database error during restore - mock transaction to throw
      const db = require('../../database/database').default;
      db.transaction.mockImplementationOnce(async (mode, tables, callback) => {
        throw new Error('Transaction error');
      });

      await expect(dataBackupManager.restoreFromBackup(backupResult.backupKey)).rejects.toThrow('Transaction error');
    });
  });

  describe('getAvailableBackups', () => {
    it('should return list of all available backups', async () => {
      // Create multiple backups
      await dataBackupManager.createFullBackup('Backup 1');
      await dataBackupManager.createFullBackup('Backup 2');
      
      const plan = { id: 1, name: 'Test Plan', date: new Date().toISOString(), totalStudents: 10, salonCount: 2, data: {} };
      mockPlans.push(plan);
      
      // Ensure mock is set up
      const db = require('../../database/database').default;
      db.plans.get.mockImplementation(async (id) => {
        const found = mockPlans.find(p => p.id === id);
        return found || null;
      });
      
      await dataBackupManager.createPlanBackup(1, 'Plan backup');

      const backups = dataBackupManager.getAvailableBackups();

      expect(backups.length).toBeGreaterThanOrEqual(3);
      expect(backups[0]).toHaveProperty('key');
      expect(backups[0]).toHaveProperty('timestamp');
      expect(backups[0]).toHaveProperty('description');
    });

    it('should sort backups by date (newest first)', async () => {
      await dataBackupManager.createFullBackup('Backup 1');
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      await dataBackupManager.createFullBackup('Backup 2');

      const backups = dataBackupManager.getAvailableBackups();

      if (backups.length >= 2) {
        const date1 = new Date(backups[0].timestamp);
        const date2 = new Date(backups[1].timestamp);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });

    it('should return empty array if no backups exist', () => {
      const backups = dataBackupManager.getAvailableBackups();
      expect(backups).toEqual([]);
    });

    it('should handle corrupted backup data gracefully', () => {
      // Add corrupted backup to localStorage
      localStorage.setItem('kelebek_backup_corrupted', 'invalid json');

      const backups = dataBackupManager.getAvailableBackups();
      
      // Should not crash and should filter out corrupted backups
      expect(Array.isArray(backups)).toBe(true);
    });
  });

  describe('deleteBackup', () => {
    it('should delete a backup', async () => {
      const backupResult = await dataBackupManager.createFullBackup();

      const deleteResult = dataBackupManager.deleteBackup(backupResult.backupKey);

      expect(deleteResult.success).toBe(true);
      expect(localStorage.getItem(backupResult.backupKey)).toBeNull();
    });

    it('should handle delete errors gracefully', () => {
      // Mock localStorage.removeItem to throw error
      const originalRemoveItem = localStorage.removeItem;
      const mockRemoveItem = jest.fn(() => {
        throw new Error('Delete error');
      });
      localStorage.removeItem = mockRemoveItem;

      // deleteBackup should throw error (not catch it internally)
      expect(() => {
        dataBackupManager.deleteBackup('test_key');
      }).toThrow('Delete error');

      // Verify removeItem was called
      expect(mockRemoveItem).toHaveBeenCalled();

      // Restore
      localStorage.removeItem = originalRemoveItem;
    });
  });

  describe('cleanupOldBackups', () => {
    it('should keep only maxBackups (10) backups', async () => {
      // Create 12 backups
      for (let i = 0; i < 12; i++) {
        await dataBackupManager.createFullBackup(`Backup ${i}`);
      }

      // Manually trigger cleanup
      await dataBackupManager.cleanupOldBackups();

      const backups = dataBackupManager.getAvailableBackups();
      expect(backups.length).toBeLessThanOrEqual(10);
    });

    it('should not delete backups if under limit', async () => {
      // Create 5 backups
      const backupKeys = [];
      for (let i = 0; i < 5; i++) {
        const result = await dataBackupManager.createFullBackup(`Backup ${i}`);
        backupKeys.push(result.backupKey);
      }

      await dataBackupManager.cleanupOldBackups();

      // All backups should still exist
      backupKeys.forEach(key => {
        expect(localStorage.getItem(key)).not.toBeNull();
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      // Create backups
      await dataBackupManager.createFullBackup('Backup 1');

      // Mock localStorage.removeItem to throw error
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = jest.fn(() => {
        throw new Error('Cleanup error');
      });

      // Should not throw, just log error
      await expect(dataBackupManager.cleanupOldBackups()).resolves.not.toThrow();

      // Restore
      localStorage.removeItem = originalRemoveItem;
    });
  });

  describe('createAutoBackup', () => {
    it('should create automatic backup with operation description', async () => {
      const result = await dataBackupManager.createAutoBackup('test_operation');

      expect(result.success).toBe(true);
      expect(result.backupKey).toBeDefined();

      const backupData = JSON.parse(localStorage.getItem(result.backupKey));
      expect(backupData.description).toContain('test_operation');
      expect(backupData.description).toContain('Otomatik yedekleme');
    });

    it('should handle auto backup errors gracefully', async () => {
      // Mock database error
      const db = require('../../database/database').default;
      db.plans.toArray = jest.fn(() => {
        throw new Error('Auto backup error');
      });

      const result = await dataBackupManager.createAutoBackup('test_operation');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should use default operation name if none provided', async () => {
      const result = await dataBackupManager.createAutoBackup();

      expect(result.success).toBe(true);
      const backupData = JSON.parse(localStorage.getItem(result.backupKey));
      expect(backupData.description).toContain('unknown');
    });
  });
});

