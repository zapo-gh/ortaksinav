/**
 * Veri Yedekleme Yöneticisi
 * Kritik veri kaybı durumlarında geri alma imkanı sağlar
 * NOT: Testler Dexie tabanlı lokal veritabanını ('../database/database') mock'lar.
 * Bu nedenle burada doğrudan Dexie instance'ını kullanıyoruz.
 */
import db from '../database/database';
import logger from './logger';

class DataBackupManager {
  constructor() {
    this.backupPrefix = 'kelebek_backup_';
    this.maxBackups = 10; // Maksimum 10 yedek tut
  }

  hasDexie() {
    return !!(db && typeof db === 'object' && typeof db.transaction === 'function');
  }

  hasTable(table) {
    return !!(table && typeof table.toArray === 'function' && typeof table.count === 'function');
  }

  hasGetTable(table) {
    return !!(table && typeof table.get === 'function');
  }

  /**
   * Tam veritabanı yedekleme oluştur
   */
  async createFullBackup(description = '') {
    try {
      console.log('🔄 Tam veritabanı yedekleme oluşturuluyor...');

      // Testlerin beklediği davranış: DB tamamen yoksa hata at; mevcutsa eksik tablolar için boş kabul et
      if (!db) {
        throw new Error('Database error');
      }

      const plansTable = this.hasTable(db?.plans) ? db.plans : null;
      const studentsTable = this.hasTable(db?.students) ? db.students : null;
      const salonsTable = this.hasTable(db?.salons) ? db.salons : null;
      const settingsTable = this.hasTable(db?.settings) ? db.settings : null;
      const tempDataTable = this.hasTable(db?.tempData) ? db.tempData : null;

      const backupData = {
        timestamp: new Date().toISOString(),
        description: description || 'Otomatik yedekleme',
        version: '1.0',
        data: {
          plans: plansTable ? await plansTable.toArray() : [],
          students: studentsTable ? await studentsTable.toArray() : [],
          salons: salonsTable ? await salonsTable.toArray() : [],
          settings: settingsTable ? await settingsTable.toArray() : [],
          tempData: tempDataTable ? await tempDataTable.toArray() : []
        },
        stats: {
          planCount: plansTable ? await plansTable.count() : 0,
          studentCount: studentsTable ? await studentsTable.count() : 0,
          salonCount: salonsTable ? await salonsTable.count() : 0,
          settingCount: settingsTable ? await settingsTable.count() : 0,
          tempDataCount: tempDataTable ? await tempDataTable.count() : 0
        }
      };

      const backupKey = `${this.backupPrefix}${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
      localStorage.setItem(backupKey, JSON.stringify(backupData));
      
      // Eski yedekleri temizle
      await this.cleanupOldBackups();
      
      console.log(`✅ Tam yedekleme oluşturuldu: ${backupKey}`);
      logger.info(`✅ Tam yedekleme oluşturuldu: ${backupKey}`);
      
      return {
        success: true,
        backupKey,
        stats: backupData.stats,
        timestamp: backupData.timestamp
      };
    } catch (error) {
      console.error('❌ Yedekleme hatası:', error);
      logger.error('❌ Yedekleme hatası:', error);
      throw error;
    }
  }

  /**
   * Plan yedekleme oluştur
   */
  async createPlanBackup(planId, description = '') {
    try {
      if (!this.hasGetTable(db?.plans)) {
        throw new Error('Veritabanı kullanılabilir değil');
      }

      const plan = await db.plans.get(planId);
      if (!plan) {
        throw new Error(`Plan bulunamadı: ${planId}`);
      }

      const backupData = {
        timestamp: new Date().toISOString(),
        description: description || `Plan yedekleme: ${plan.name}`,
        planId: planId,
        planName: plan.name,
        data: plan
      };

      const backupKey = `${this.backupPrefix}plan_${planId}_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backupData));
      
      console.log(`✅ Plan yedekleme oluşturuldu: ${backupKey}`);
      return {
        success: true,
        backupKey,
        planId,
        planName: plan.name
      };
    } catch (error) {
      console.error('❌ Plan yedekleme hatası:', error);
      throw error;
    }
  }

  /**
   * Yedekten geri yükleme
   */
  async restoreFromBackup(backupKey) {
    try {
      console.log(`🔄 Yedekten geri yükleniyor: ${backupKey}`);
      
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error(`Yedek bulunamadı: ${backupKey}`);
      }

      const backup = JSON.parse(backupData);
      
      // Tam veritabanı yedeklemesi mi?
      if (backup.data && backup.data.plans) {
        // Tam geri yükleme
        if (!this.hasDexie()) {
          throw new Error('Veritabanı kullanılabilir değil');
        }
        await db.transaction('rw', [db.plans, db.students, db.salons, db.settings, db.tempData], async () => {
          await db.plans.clear();
          await db.students.clear();
          await db.salons.clear();
          await db.settings.clear();
          await db.tempData.clear();

          if (backup.data.plans.length > 0) {
            await db.plans.bulkAdd(backup.data.plans);
          }
          if (backup.data.students.length > 0) {
            await db.students.bulkAdd(backup.data.students);
          }
          if (backup.data.salons.length > 0) {
            await db.salons.bulkAdd(backup.data.salons);
          }
          if (backup.data.settings.length > 0) {
            await db.settings.bulkAdd(backup.data.settings);
          }
          if (backup.data.tempData.length > 0) {
            await db.tempData.bulkAdd(backup.data.tempData);
          }
        });
        
        console.log('✅ Tam veritabanı geri yüklendi');
        return { success: true, type: 'full', stats: backup.stats };
      } else {
        // Tek plan geri yükleme
        if (!this.hasTable(db?.plans)) {
          throw new Error('Veritabanı kullanılabilir değil');
        }
        await db.plans.put(backup.data);
        console.log(`✅ Plan geri yüklendi: ${backup.planName}`);
        return { success: true, type: 'plan', planId: backup.planId, planName: backup.planName };
      }
    } catch (error) {
      console.error('❌ Geri yükleme hatası:', error);
      throw error;
    }
  }

  /**
   * Mevcut yedekleri listele
   */
  getAvailableBackups() {
    try {
      const backups = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.backupPrefix)) {
          try {
            const backupData = JSON.parse(localStorage.getItem(key));
            backups.push({
              key,
              timestamp: backupData.timestamp,
              description: backupData.description,
              type: backupData.data?.plans ? 'full' : 'plan',
              planId: backupData.planId,
              planName: backupData.planName,
              stats: backupData.stats
            });
          } catch (parseError) {
            console.warn(`Yedek parse hatası: ${key}`, parseError);
          }
        }
      }
      
      // Tarihe göre sırala (en yeni en üstte)
      return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('❌ Yedek listesi hatası:', error);
      return [];
    }
  }

  /**
   * Eski yedekleri temizle
   */
  async cleanupOldBackups() {
    try {
      const backups = this.getAvailableBackups();
      
      if (backups.length > this.maxBackups) {
        const backupsToDelete = backups.slice(this.maxBackups);
        
        for (const backup of backupsToDelete) {
          localStorage.removeItem(backup.key);
          console.log(`🗑️ Eski yedek silindi: ${backup.key}`);
        }
        
        console.log(`✅ ${backupsToDelete.length} eski yedek temizlendi`);
      }
    } catch (error) {
      console.error('❌ Yedek temizleme hatası:', error);
    }
  }

  /**
   * Yedek silme
   */
  deleteBackup(backupKey) {
    // removeItem hata fırlatırsa, hata doğrudan dışarı sızsın (testler böyle bekliyor)
    localStorage.removeItem(backupKey);
    console.log(`✅ Yedek silindi: ${backupKey}`);
    return { success: true };
  }

  /**
   * Kritik işlemlerden önce otomatik yedekleme
   */
  async createAutoBackup(operation = 'unknown') {
    try {
      const description = `Otomatik yedekleme - ${operation} işlemi öncesi`;
      return await this.createFullBackup(description);
    } catch (error) {
      console.warn('⚠️ Otomatik yedekleme hatası:', error);
      return { success: false, error: error.message };
    }
  }
}

// Singleton instance
const dataBackupManager = new DataBackupManager();

export default dataBackupManager;
