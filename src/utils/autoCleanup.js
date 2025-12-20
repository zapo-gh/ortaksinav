/**
 * Otomatik temizlik sistemi
 * Eski geçici kayıtları otomatik siler
 */
import db from '../database';
import logger from './logger';

class AutoCleanup {
  constructor() {
    this.cleanupInterval = 24 * 60 * 60 * 1000; // 24 saat
    this.maxTempPlans = 3; // Maksimum 3 geçici plan
    this.tempPlanMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 gün
    this.intervalId = null; // Interval ID'yi sakla (cleanup için)
  }

  /**
   * Otomatik temizlik başlat
   */
  startAutoCleanup() {
    // Önce mevcut interval'ı temizle (eğer varsa)
    this.stopAutoCleanup();
    
    // Sayfa yüklendiğinde temizlik yap
    this.performCleanup();
    
    // Periyodik temizlik (her 24 saatte bir)
    this.intervalId = setInterval(() => {
      this.performCleanup();
    }, this.cleanupInterval);
  }

  /**
   * Otomatik temizliği durdur (memory leak önleme)
   */
  stopAutoCleanup() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.debug('🛑 Otomatik temizlik durduruldu');
    }
  }

  /**
   * Temizlik işlemi
   */
  async performCleanup() {
    try {
      console.log('🧹 Otomatik temizlik başlatılıyor...');
      
      const allPlans = await db.getAllPlans();
      const tempPlans = allPlans.filter(plan => 
        plan.name.includes('Geçici Plan') || 
        plan.id.startsWith('temp_')
      );

      if (tempPlans.length === 0) {
        console.log('✅ Temizlenecek geçici plan yok');
        return;
      }

      // Tarihe göre sırala (en yeni en son)
      const sortedTempPlans = tempPlans.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );

      let deletedCount = 0;
      const now = Date.now();

      for (let i = 0; i < sortedTempPlans.length; i++) {
        const plan = sortedTempPlans[i];
        const planAge = now - new Date(plan.date).getTime();
        
        // Silme kriterleri:
        // 1. 7 günden eski
        // 2. 3'ten fazla geçici plan varsa (en eskileri sil)
        const shouldDelete = 
          planAge > this.tempPlanMaxAge || 
          (i >= this.maxTempPlans);

        if (shouldDelete) {
          await db.deletePlan(plan.id);
          deletedCount++;
          console.log(`🗑️ Eski geçici plan silindi: ${plan.id} (${Math.round(planAge / (24 * 60 * 60 * 1000))} gün eski)`);
        }
      }

      if (deletedCount > 0) {
        console.log(`✅ ${deletedCount} eski geçici plan temizlendi`);
      } else {
        console.log('✅ Temizlenecek eski plan yok');
      }

    } catch (error) {
      logger.error('❌ Otomatik temizlik hatası:', error);
    }
  }

  /**
   * Manuel temizlik (kullanıcı isteği)
   */
  async manualCleanup() {
    try {
      const allPlans = await db.getAllPlans();
      const tempPlans = allPlans.filter(plan => 
        plan.name.includes('Geçici Plan') || 
        plan.id.startsWith('temp_')
      );

      if (tempPlans.length <= 1) {
        return { success: true, deletedCount: 0, message: 'Temizlenecek plan yok' };
      }

      // En son geçici planı koru, diğerlerini sil
      const sortedTempPlans = tempPlans.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );

      const plansToDelete = sortedTempPlans.slice(1);
      let deletedCount = 0;

      for (const plan of plansToDelete) {
        await db.deletePlan(plan.id);
        deletedCount++;
      }

      return {
        success: true,
        deletedCount,
        message: `${deletedCount} geçici plan temizlendi`
      };

    } catch (error) {
      logger.error('❌ Manuel temizlik hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
const autoCleanup = new AutoCleanup();

export default autoCleanup;






