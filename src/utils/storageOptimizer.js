/**
 * Storage Optimizer - Okuma/yazma işlemlerini optimize eder
 * Debouncing, değişiklik kontrolü ve batch işlemler sağlar
 */

import logger from './logger';

class StorageOptimizer {
  constructor() {
    // Her key için debounce timer'ları
    this.debounceTimers = new Map();

    // Son kaydedilen değerler (değişiklik kontrolü için)
    this.lastSavedValues = new Map();

    // Batch işlemler için queue
    this.pendingOperations = new Map();

    // Debounce delay (ms)
    this.debounceDelay = 500; // 500ms

    // Batch delay (ms)
    this.batchDelay = 1000; // 1 saniye
  }

  /**
   * Değer değişmiş mi kontrol et (deep equality check)
   */
  hasValueChanged(key, newValue) {
    const lastValue = this.lastSavedValues.get(key);

    // İlk kayıt
    if (lastValue === undefined) {
      return true;
    }

    // Basit karşılaştırma (shallow)
    if (JSON.stringify(lastValue) === JSON.stringify(newValue)) {
      return false; // Değer değişmemiş
    }

    return true; // Değer değişmiş
  }

  /**
   * Debounced save - Hızlı ardışık çağrıları birleştir
   */
  async debouncedSave(key, value, saveFunction) {
    // Değer değişmemişse kaydetme
    if (!this.hasValueChanged(key, value)) {
      logger.debug(`⏭️ ${key} değeri değişmemiş, kaydetme atlandı`);
      return;
    }

    // Mevcut timer'ı iptal et
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    // Yeni timer başlat
    const timer = setTimeout(async () => {
      try {
        logger.debug(`💾 ${key} kaydediliyor (debounced)...`);

        // Kaydet
        await saveFunction(key, value);

        // Son kaydedilen değeri sakla
        this.lastSavedValues.set(key, JSON.parse(JSON.stringify(value)));

        // Timer'ı temizle
        this.debounceTimers.delete(key);

        logger.debug(`✅ ${key} başarıyla kaydedildi`);
      } catch (error) {
        logger.error(`❌ ${key} kaydetme hatası:`, error);
        this.debounceTimers.delete(key);
      }
    }, this.debounceDelay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Immediate save - Acil durumlar için (debounce olmadan)
   */
  async immediateSave(key, value, saveFunction) {
    // Timer varsa iptal et
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
      this.debounceTimers.delete(key);
    }

    try {
      logger.debug(`💾 ${key} hemen kaydediliyor (immediate)...`);

      // Kaydet
      await saveFunction(key, value);

      // Son kaydedilen değeri sakla
      this.lastSavedValues.set(key, JSON.parse(JSON.stringify(value)));

      logger.debug(`✅ ${key} başarıyla kaydedildi (immediate)`);
    } catch (error) {
      logger.error(`❌ ${key} kaydetme hatası:`, error);
    }
  }

  /**
   * Batch save - Birden fazla işlemi birleştir
   */
  async batchSave(operations) {
    // Bekleyen işlemleri ekle
    operations.forEach(({ key, value, saveFunction }) => {
      this.pendingOperations.set(key, { value, saveFunction });
    });

    // Timer başlat (eğer yoksa)
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(async () => {
        await this.flushBatch();
      }, this.batchDelay);
    }
  }

  /**
   * Batch işlemleri hemen çalıştır
   */
  async flushBatch() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.pendingOperations.size === 0) {
      return;
    }

    const operations = Array.from(this.pendingOperations.entries());
    this.pendingOperations.clear();

    logger.debug(`📦 ${operations.length} batch işlem çalıştırılıyor...`);

    // Tüm işlemleri paralel çalıştır
    await Promise.all(
      operations.map(async ([key, { value, saveFunction }]) => {
        try {
          await saveFunction(key, value);
          this.lastSavedValues.set(key, JSON.parse(JSON.stringify(value)));
        } catch (error) {
          logger.error(`❌ Batch işlem hatası (${key}):`, error);
        }
      })
    );

    logger.debug(`✅ Batch işlemler tamamlandı`);
  }

  /**
   * Tüm bekleyen işlemleri temizle
   */
  clear() {
    // Tüm timer'ları temizle
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    // Batch timer'ı temizle
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Bekleyen işlemleri temizle
    this.pendingOperations.clear();
  }

  clearCache(key) {
    if (key) {
      this.lastSavedValues.delete(key);
    } else {
      this.lastSavedValues.clear();
    }
  }

  /**
   * Schedule save - decide between debounced or immediate save
   */
  scheduleSave(key, value, saveFunction, immediate = false) {
    if (immediate) {
      this.immediateSave(key, value, saveFunction);
    } else {
      this.debouncedSave(key, value, saveFunction);
    }
  }
}

// Singleton instance
export const storageOptimizer = new StorageOptimizer();

