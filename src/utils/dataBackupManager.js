/**
 * Veri Yedekleme Yöneticisi
 * Kritik veri kaybı durumlarında geri alma imkanı sağlar
 */
import db from '../database';
import logger from './logger';

class DataBackupManager {
  constructor() {
    this.backupPrefix = 'kelebek_backup_';
    this.maxBackups = 10; // Maksimum 10 yedek tut
  }

  /**
   * Tam veritabanı yedekleme oluştur
   */
  async createFullBackup(description = '') {
    try {
      console.log('🔄 Tam veritabanı yedekleme oluşturuluyor...');
      
      const backupData = {
        timestamp: new Date().toISOString(),
        description: description || 'Otomatik yedekleme',
        version: '1.0',
        data: {
          plans: await db.plans.toArray(),
          students: await db.students.toArray(),
          salons: await db.salons.toArray(),
          settings: await db.settings.toArray(),
          tempData: await db.tempData.toArray()
        },
        stats: {
          planCount: await db.plans.count(),
          studentCount: await db.students.count(),
          salonCount: await db.salons.count(),
          settingCount: await db.settings.count(),
          tempDataCount: await db.tempData.count()
        }
      };

      const backupKey = `${this.backupPrefix}${Date.now()}`;
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
    try {
      localStorage.removeItem(backupKey);
      console.log(`✅ Yedek silindi: ${backupKey}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Yedek silme hatası:', error);
      throw error;
    }
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
