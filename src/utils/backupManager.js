/**
 * ============================================================================
 * OTOMATIK BACKUP YÖNETİCİSİ
 * ============================================================================
 * 
 * Kayıtlı planları otomatik olarak yedekler
 * Silme işlemlerinde onay ister
 * Geri alma özelliği sağlar
 */

import logger from './logger';

class BackupManager {
  constructor() {
    this.backupKey = 'kayitli_planlar_backup';
    this.maxBackups = 5; // Son 5 backup'ı sakla
    this.autoBackupInterval = 30000; // 30 saniyede bir backup
    this.lastBackupTime = 0;
  }

  /**
   * Otomatik backup oluştur
   */
  createAutoBackup() {
    try {
      const currentTime = Date.now();
      
      // Çok sık backup yapma
      if (currentTime - this.lastBackupTime < this.autoBackupInterval) {
        return;
      }
      
      const currentPlans = this.getCurrentPlans();
      if (!currentPlans || currentPlans.length === 0) {
        return;
      }
      
      const backup = {
        timestamp: currentTime,
        plans: currentPlans,
        version: '2.0'
      };
      
      this.saveBackup(backup);
      this.lastBackupTime = currentTime;
      
      logger.debug('🔄 Otomatik backup oluşturuldu:', backup.timestamp);
      
    } catch (error) {
      logger.error('❌ Otomatik backup hatası:', error);
    }
  }

  /**
   * Manuel backup oluştur
   */
  createManualBackup(description = 'Manuel Backup') {
    try {
      const currentPlans = this.getCurrentPlans();
      if (!currentPlans || currentPlans.length === 0) {
        throw new Error('Kaydedilecek plan bulunamadı');
      }
      
      const backup = {
        timestamp: Date.now(),
        plans: currentPlans,
        description,
        version: '2.0',
        type: 'manual'
      };
      
      this.saveBackup(backup);
      
      logger.info('💾 Manuel backup oluşturuldu:', {
        timestamp: new Date(backup.timestamp).toLocaleString('tr-TR'),
        planCount: currentPlans && Array.isArray(currentPlans) ? currentPlans.length : 0,
        description
      });
      
      return backup;
      
    } catch (error) {
      logger.error('❌ Manuel backup hatası:', error);
      throw error;
    }
  }

  /**
   * Mevcut planları al
   */
  getCurrentPlans() {
    try {
      const stored = localStorage.getItem('kayitli_planlar');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('❌ Mevcut planlar alınamadı:', error);
      return [];
    }
  }

  /**
   * Backup kaydet
   */
  saveBackup(backup) {
    try {
      const backups = this.getAllBackups();
      
      // Yeni backup'ı ekle
      backups.push(backup);
      
      // En eski backup'ları sil (max 5 backup)
      if (backups.length > this.maxBackups) {
        backups.sort((a, b) => b.timestamp - a.timestamp);
        backups.splice(this.maxBackups);
      }
      
      localStorage.setItem(this.backupKey, JSON.stringify(backups));
      
    } catch (error) {
      logger.error('❌ Backup kaydetme hatası:', error);
    }
  }

  /**
   * Tüm backup'ları al
   */
  getAllBackups() {
    try {
      const stored = localStorage.getItem(this.backupKey);
      if (!stored) return [];
      
      const backups = JSON.parse(stored);
      
      // Backup verilerini doğrula ve düzelt
      if (!Array.isArray(backups)) {
        logger.warn('⚠️ Backup verisi array değil, düzeltiliyor...');
        return [];
      }
      
      // Her backup'ı doğrula
      const validBackups = backups.filter(backup => {
        if (!backup || typeof backup !== 'object') return false;
        if (!backup.timestamp || typeof backup.timestamp !== 'number') return false;
        if (!backup.plans) {
          backup.plans = []; // Plans eksikse boş array ekle
        }
        if (!Array.isArray(backup.plans)) {
          backup.plans = []; // Plans array değilse düzelt
        }
        return true;
      });
      
      return validBackups;
      
    } catch (error) {
      logger.error('❌ Backup\'lar alınamadı:', error);
      return [];
    }
  }

  /**
   * Backup listesini al (tarih sıralı)
   */
  getBackupList() {
    const backups = this.getAllBackups();
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Backup'tan geri yükle
   */
  restoreFromBackup(backupTimestamp) {
    try {
      const backups = this.getAllBackups();
      const backup = backups.find(b => b.timestamp === backupTimestamp);
      
      if (!backup) {
        throw new Error('Backup bulunamadı');
      }
      
      // Mevcut planları yedekle
      const currentBackup = this.createManualBackup('Geri yükleme öncesi yedek');
      
      // Backup'tan geri yükle
      localStorage.setItem('kayitli_planlar', JSON.stringify(backup.plans));
      
      logger.info('🔄 Backup\'tan geri yüklendi:', {
        backupTime: new Date(backup.timestamp).toLocaleString('tr-TR'),
        planCount: backup.plans && Array.isArray(backup.plans) ? backup.plans.length : 0,
        currentBackup: currentBackup.timestamp
      });
      
      return {
        success: true,
        restoredPlans: backup.plans && Array.isArray(backup.plans) ? backup.plans.length : 0,
        backupTime: backup.timestamp
      };
      
    } catch (error) {
      logger.error('❌ Backup geri yükleme hatası:', error);
      throw error;
    }
  }

  /**
   * Backup sil
   */
  deleteBackup(backupTimestamp) {
    try {
      const backups = this.getAllBackups();
      const filteredBackups = backups.filter(b => b.timestamp !== backupTimestamp);
      
      localStorage.setItem(this.backupKey, JSON.stringify(filteredBackups));
      
      logger.info('🗑️ Backup silindi:', backupTimestamp);
      
    } catch (error) {
      logger.error('❌ Backup silme hatası:', error);
    }
  }

  /**
   * Tüm backup'ları sil
   */
  clearAllBackups() {
    try {
      localStorage.removeItem(this.backupKey);
      logger.info('🗑️ Tüm backup\'lar silindi');
    } catch (error) {
      logger.error('❌ Backup temizleme hatası:', error);
    }
  }

  /**
   * Backup durumu raporu
   */
  getBackupReport() {
    const backups = this.getAllBackups();
    const currentPlans = this.getCurrentPlans();
    
    return {
      totalBackups: backups.length,
      currentPlans: currentPlans.length,
      lastBackup: backups.length > 0 ? Math.max(...backups.map(b => b.timestamp)) : null,
      storageUsed: this.calculateStorageUsage()
    };
  }

  /**
   * Storage kullanımını hesapla
   */
  calculateStorageUsage() {
    try {
      const backups = this.getAllBackups();
      const currentPlans = this.getCurrentPlans();
      
      const backupSize = JSON.stringify(backups).length;
      const currentSize = JSON.stringify(currentPlans).length;
      
      return {
        backupSize,
        currentSize,
        totalSize: backupSize + currentSize
      };
    } catch (error) {
      return { backupSize: 0, currentSize: 0, totalSize: 0 };
    }
  }
}

// Singleton instance
const backupManager = new BackupManager();

export default backupManager;
