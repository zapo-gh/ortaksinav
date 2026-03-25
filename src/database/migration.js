import db from './database';

/**
 * localStorage'dan IndexedDB'ye veri migration utility
 */
class DatabaseMigration {
  constructor() {
    this.isMigrated = false;
  }
  
  /**
   * Migration işlemini başlat
   */
  async migrate() {
    if (this.isMigrated) {
      logger.info('✅ Migration zaten tamamlanmış');
      return;
    }
    
    try {
      logger.info('🔄 localStorage -> IndexedDB migration başlatılıyor...');
      
      // 1. Kayıtlı planları migrate et
      await this.migratePlans();
      
      // 2. Ayarları migrate et
      await this.migrateSettings();
      
      // 3. Geçici verileri migrate et
      await this.migrateTempData();
      
      this.isMigrated = true;
      logger.info('✅ Migration tamamlandı!');
      
      // Migration tamamlandığını işaretle
      await db.saveSetting('migration_completed', true, 'boolean');
      
    } catch (error) {
      logger.error('❌ Migration hatası:', error);
      throw error;
    }
  }
  
  /**
   * Kayıtlı planları migrate et
   */
  async migratePlans() {
    try {
      const storedPlans = localStorage.getItem('kayitli_planlar');
      if (!storedPlans) {
        logger.info('📝 Kayıtlı plan bulunamadı');
        return;
      }
      
      const plans = JSON.parse(storedPlans);
      if (!Array.isArray(plans)) {
        logger.info('⚠️ Kayıtlı planlar array değil');
        return;
      }
      
      logger.info(`📦 ${plans.length} plan migrate ediliyor...`);
      
      for (const plan of plans) {
        try {
          // Plan verisini IndexedDB formatına dönüştür
          const planData = {
            name: plan.ad || plan.name || 'İsimsiz Plan',
            date: plan.tarih || plan.date || new Date().toISOString(),
            totalStudents: plan.toplamOgrenci || plan.totalStudents || 0,
            salonCount: plan.salonSayisi || plan.salonCount || 0,
            data: plan.veri || plan.data || null
          };
          
          // IndexedDB'ye kaydet
          await db.savePlan(planData);
          logger.info(`✅ Plan migrate edildi: ${planData.name}`);
          
        } catch (planError) {
          logger.error(`❌ Plan migrate hatası (${plan.ad}):`, planError);
          // Hatalı planı atla, devam et
        }
      }
      
      logger.info('✅ Plan migration tamamlandı');
      
    } catch (error) {
      logger.error('❌ Plan migration hatası:', error);
      throw error;
    }
  }
  
  /**
   * Ayarları migrate et
   */
  async migrateSettings() {
    try {
      const settingsKeys = [
        'exam_ogrenciler',
        'exam_salonlar', 
        'exam_ayarlar',
        'exam_yerlestirme',
        'exam_aktif_tab',
        'ogrenciListesi',
        'salonAyarlari',
        'sinavAyarlari'
      ];
      
      logger.info('⚙️ Ayarlar migrate ediliyor...');
      
      for (const key of settingsKeys) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsedValue = JSON.parse(value);
            await db.saveSetting(key, parsedValue, 'json');
            logger.info(`✅ Ayar migrate edildi: ${key}`);
          } catch (parseError) {
            // JSON parse edilemeyen verileri string olarak kaydet
            await db.saveSetting(key, value, 'string');
            logger.info(`✅ Ayar migrate edildi (string): ${key}`);
          }
        }
      }
      
      logger.info('✅ Ayar migration tamamlandı');
      
    } catch (error) {
      logger.error('❌ Ayar migration hatası:', error);
      throw error;
    }
  }
  
  /**
   * Geçici verileri migrate et
   */
  async migrateTempData() {
    try {
      const tempKeys = [
        'dragDropLearning',
        'learningData',
        'deviceId',
        'performance_issues'
      ];
      
      logger.info('🗂️ Geçici veriler migrate ediliyor...');
      
      for (const key of tempKeys) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const parsedValue = JSON.parse(value);
            await db.saveTempData(key, parsedValue, 'json', 24); // 24 saat geçerli
            logger.info(`✅ Geçici veri migrate edildi: ${key}`);
          } catch (parseError) {
            // JSON parse edilemeyen verileri string olarak kaydet
            await db.saveTempData(key, value, 'string', 24);
            logger.info(`✅ Geçici veri migrate edildi (string): ${key}`);
          }
        }
      }
      
      logger.info('✅ Geçici veri migration tamamlandı');
      
    } catch (error) {
      logger.error('❌ Geçici veri migration hatası:', error);
      throw error;
    }
  }
  
  /**
   * Migration durumunu kontrol et
   */
  async checkMigrationStatus() {
    try {
      const migrationCompleted = await db.getSetting('migration_completed');
      return migrationCompleted === true;
    } catch (error) {
      logger.error('❌ Migration durumu kontrol hatası:', error);
      return false;
    }
  }
  
  /**
   * localStorage'ı temizle (migration sonrası)
   */
  async clearLocalStorage() {
    try {
      const keysToRemove = [
        'kayitli_planlar',
        'exam_ogrenciler',
        'exam_salonlar',
        'exam_ayarlar',
        'exam_yerlestirme',
        'exam_aktif_tab',
        'ogrenciListesi',
        'salonAyarlari',
        'sinavAyarlari',
        'dragDropLearning',
        'learningData',
        'deviceId',
        'performance_issues'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        logger.info(`🗑️ localStorage temizlendi: ${key}`);
      });
      
      logger.info('✅ localStorage temizlendi');
      
    } catch (error) {
      logger.error('❌ localStorage temizleme hatası:', error);
      throw error;
    }
  }
  
  /**
   * Tam migration işlemi (migrate + temizle)
   */
  async fullMigration() {
    try {
      // Migration durumunu kontrol et
      const isMigrated = await this.checkMigrationStatus();
      if (isMigrated) {
        logger.info('✅ Migration zaten tamamlanmış');
        return;
      }
      
      // Migration yap
      await this.migrate();
      
      // localStorage'ı temizle
      await this.clearLocalStorage();
      
      logger.info('🎉 Tam migration işlemi tamamlandı!');
      
    } catch (error) {
      logger.error('❌ Tam migration hatası:', error);
      throw error;
    }
  }
}

// Singleton instance
const migration = new DatabaseMigration();

export default migration;




























