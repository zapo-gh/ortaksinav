import Dexie from 'dexie';
import firestoreClient from './firestoreClient';
import logger from '../utils/logger';

/**
 * Database Adapter - Firestore + IndexedDB Fallback
 * Mevcut database.js API'sini koruyarak Firestore'a geçiş
 */
class DatabaseAdapter {
  constructor() {
    // Firestore birincil (primary) veritabanı olarak aktif
    // IndexedDB fallback olarak kullanılır
    this.useFirestore = true; // Firestore aktif - birincil veritabanı
    this.firestore = firestoreClient;
    this.indexedDB = null; // IndexedDB lazy load (fallback için)
  }

  /**
   * Firestore için veriyi temizle: undefined değerleri kaldır veya null'a çevir,
   * Date nesnelerini toString yapma, fonksiyonları drop et, NaN/Infinity'yi null yap.
   */
  sanitizeForFirestore(input) {
    const seen = new WeakSet();
    const walk = (value) => {
      if (value === undefined) return null; // Firestore undefined desteklemez
      if (value === null) return null;
      if (typeof value === 'function') return null;
      if (typeof value === 'number' && (!Number.isFinite(value) || Number.isNaN(value))) return null;
      if (value instanceof Date) return value; // native Date desteklenir
      if (Array.isArray(value)) return value.map(walk);
      if (typeof value === 'object') {
        if (seen.has(value)) return null; // döngüsel referansı kır
        seen.add(value);
        const out = {};
        for (const [k, v] of Object.entries(value)) {
          // Anahtar her zaman string; değeri sanitize et
          const sv = walk(v);
          if (sv !== undefined) out[k] = sv;
        }
        return out;
      }
      return value;
    };
    return walk(input);
  }

  /**
   * IndexedDB'yi lazy load et - DEVRE DIŞI
   */
  async getIndexedDB() {
    // IndexedDB'yi lazy import et ve adapter olarak kullan
    if (this.indexedDB) return this.indexedDB;
    const { default: dexieDb } = await import('./database');
    this.indexedDB = dexieDb;
    return this.indexedDB;
  }

  /**
   * Aktif veritabanını döndür - Birincil olarak Firestore
   */
  async getActiveDB() {
    // Firestore birincil veritabanı olarak kullanılır
    if (this.useFirestore) {
      return this.firestore;
    }
    // Fallback olarak IndexedDB kullan
    return await this.getIndexedDB();
  }

  /**
   * Plan kaydetme
   */
  async savePlan(planData) {
    try {
      // DEBUG: Plan kaydetme başlangıcı
      logger.info('💾 DatabaseAdapter savePlan çağrıldı:', {
        planName: planData?.name,
        useFirestore: this.useFirestore,
        planDataKeys: Object.keys(planData || {})
      });
      
      // Firestore birincil - veriyi sanitize et
      const payload = this.sanitizeForFirestore(planData);
      const db = await this.getActiveDB();
      
      logger.info('🔍 Aktif DB türü:', this.useFirestore ? 'Firestore' : 'IndexedDB');
      logger.info('🔍 DB objesi:', {
        type: typeof db,
        hasSavePlan: typeof db?.savePlan === 'function',
        isFirestore: db?.constructor?.name === 'FirestoreClient' || db?.isDisabled !== undefined
      });
      
      const result = await db.savePlan(payload);
      logger.info('✅ DatabaseAdapter savePlan başarılı:', result);
      return result;
    } catch (error) {
      logger.error('❌ Plan kaydetme hatası:', error);
      
      // Firestore hatası durumunda IndexedDB'ye geç
      if (this.useFirestore) {
        logger.info('🔄 Firestore hatası, IndexedDB\'ye geçiliyor...');
        this.useFirestore = false;
        const indexedDB = await this.getIndexedDB();
        return await indexedDB.savePlan(planData);
      }
      
      throw error;
    }
  }

  /**
   * Plan yükleme
   */
  async loadPlan(planId) {
    try {
      const db = await this.getActiveDB();
      return await db.loadPlan(planId);
    } catch (error) {
      logger.error('❌ Plan yükleme hatası:', error);
      
      if (this.useFirestore) {
        logger.info('🔄 Firestore hatası, IndexedDB\'ye geçiliyor...');
        this.useFirestore = false;
        const indexedDB = await this.getIndexedDB();
        return await indexedDB.loadPlan(planId);
      }
      
      throw error;
    }
  }

  /**
   * Tek plan getirme (getPlan)
   */
  async getPlan(planId) {
    try {
      // Firestore'da getPlan yok, direkt IndexedDB'den getPlan çağır
      // IndexedDB'de getPlan metodu var ve daha spesifik
      const indexedDB = await this.getIndexedDB();
      return await indexedDB.getPlan(planId);
    } catch (error) {
      logger.error('❌ Plan getirme hatası:', error);
      
      // Hata durumunda loadPlan'ı dene
      try {
        const db = await this.getActiveDB();
        if (db.loadPlan) {
          return await db.loadPlan(planId);
        }
      } catch (fallbackError) {
        logger.error('❌ Fallback loadPlan hatası:', fallbackError);
      }
      
      throw error;
    }
  }

  /**
   * Tüm planları listele
   */
  async getAllPlans() {
    try {
      const db = await this.getActiveDB();
      return await db.getAllPlans();
    } catch (error) {
      logger.error('❌ Plan listesi yükleme hatası:', error);
      
      if (this.useFirestore) {
        logger.info('🔄 Firestore hatası, IndexedDB\'ye geçiliyor...');
        this.useFirestore = false;
        const indexedDB = await this.getIndexedDB();
        return await indexedDB.getAllPlans();
      }
      
      throw error;
    }
  }

  /**
   * Plan silme
   */
  async deletePlan(planId) {
    try {
      const db = await this.getActiveDB();
      return await db.deletePlan(planId);
    } catch (error) {
      logger.error('❌ Plan silme hatası:', error);
      
      if (this.useFirestore) {
        logger.info('🔄 Firestore hatası, IndexedDB\'ye geçiliyor...');
        this.useFirestore = false;
        const indexedDB = await this.getIndexedDB();
        return await indexedDB.deletePlan(planId);
      }
      
      throw error;
    }
  }

  /**
   * Öğrencileri kaydet
   */
  async saveStudents(students) {
    try {
      // Firestore birincil - veriyi sanitize et
      const payload = this.sanitizeForFirestore(students);
      const db = await this.getActiveDB();
      const result = await db.saveStudents(payload);
      // Mirror to IndexedDB to guarantee offline persistence
      try {
        const indexedDB = await this.getIndexedDB();
        await indexedDB.saveStudents(students);
      } catch (mirrorError) {
        logger.debug('IndexedDB mirror failed for students:', mirrorError);
      }
      return result;
    } catch (error) {
      logger.error('❌ Öğrenci kaydetme hatası:', error);
      
      if (this.useFirestore) {
        logger.info('🔄 Firestore hatası, IndexedDB\'ye geçiliyor...');
        this.useFirestore = false;
        const indexedDB = await this.getIndexedDB();
        return await indexedDB.saveStudents(students);
      }
      
      throw error;
    }
  }

  /**
   * Tüm öğrencileri getir
   */
  async getAllStudents() {
    try {
      const db = await this.getActiveDB();
      const students = await db.getAllStudents();
      // Firestore boş dönerse IndexedDB'den de kontrol et (offline/local persist için)
      if (this.useFirestore && Array.isArray(students) && students.length === 0) {
        try {
          const indexedDB = await this.getIndexedDB();
          const localStudents = await indexedDB.getAllStudents();
          if (Array.isArray(localStudents) && localStudents.length > 0) {
            return localStudents;
          }
        } catch (_) {
          // IndexedDB erişimi başarısızsa sessizce devam et
        }
      }
      return students;
    } catch (error) {
      logger.error('❌ Öğrenci yükleme hatası:', error);
      
      if (this.useFirestore) {
        logger.info('🔄 Firestore hatası, IndexedDB\'ye geçiliyor...');
        this.useFirestore = false;
        const indexedDB = await this.getIndexedDB();
        return await indexedDB.getAllStudents();
      }
      
      return [];
    }
  }

  /**
   * Ayarları kaydet
   */
  async saveSettings(settings) {
    try {
      // Firestore birincil - veriyi sanitize et
      const payload = this.sanitizeForFirestore(settings);
      const db = await this.getActiveDB();
      const result = await db.saveSettings(payload);
      // Mirror to IndexedDB
      try {
        const indexedDB = await this.getIndexedDB();
        await indexedDB.saveSettings(settings);
      } catch (mirrorError) {
        logger.debug('IndexedDB mirror failed for settings:', mirrorError);
      }
      return result;
    } catch (error) {
      logger.error('❌ Ayar kaydetme hatası:', error);
      
      if (this.useFirestore) {
        logger.info('🔄 Firestore hatası, IndexedDB\'ye geçiliyor...');
        this.useFirestore = false;
        const indexedDB = await this.getIndexedDB();
        return await indexedDB.saveSettings(settings);
      }
      
      throw error;
    }
  }

  /**
   * Tüm ayarları getir
   */
  async getSettings() {
    try {
      const db = await this.getActiveDB();
      return await db.getSettings();
    } catch (error) {
      logger.error('❌ Ayar yükleme hatası:', error);
      
      if (this.useFirestore) {
        logger.info('🔄 Firestore hatası, IndexedDB\'ye geçiliyor...');
        this.useFirestore = false;
        const indexedDB = await this.getIndexedDB();
        return await indexedDB.getSettings();
      }
      
      return {};
    }
  }

  /**
   * Salonları kaydet
   */
  async saveSalons(salons) {
    try {
      // Firestore birincil - veriyi sanitize et
      const payload = this.sanitizeForFirestore(salons);
      const db = await this.getActiveDB();
      const result = await db.saveSalons(payload);
      // Mirror to IndexedDB
      try {
        const indexedDB = await this.getIndexedDB();
        await indexedDB.saveSalons(salons);
      } catch (mirrorError) {
        logger.debug('IndexedDB mirror failed for salons:', mirrorError);
      }
      return result;
    } catch (error) {
      logger.error('❌ Salon kaydetme hatası:', error);
      
      if (this.useFirestore) {
        logger.info('🔄 Firestore hatası, IndexedDB\'ye geçiliyor...');
        this.useFirestore = false;
        const indexedDB = await this.getIndexedDB();
        return await indexedDB.saveSalons(salons);
      }
      
      throw error;
    }
  }

  /**
   * Tüm salonları getir
   */
  async getAllSalons() {
    try {
      const db = await this.getActiveDB();
      const salons = await db.getAllSalons();
      // Firestore boş dönerse IndexedDB'den de kontrol et (offline/local persist için)
      if (this.useFirestore && Array.isArray(salons) && salons.length === 0) {
        try {
          const indexedDB = await this.getIndexedDB();
          const localSalons = await indexedDB.getAllSalons();
          if (Array.isArray(localSalons) && localSalons.length > 0) {
            return localSalons;
          }
        } catch (fallbackError) {
          logger.debug('IndexedDB fallback for salons failed:', fallbackError);
        }
      }
      return salons;
    } catch (error) {
      logger.error('❌ Salon yükleme hatası:', error);
      
      if (this.useFirestore) {
        logger.info('🔄 Firestore hatası, IndexedDB\'ye geçiliyor...');
        this.useFirestore = false;
        const indexedDB = await this.getIndexedDB();
        return await indexedDB.getAllSalons();
      }
      
      return [];
    }
  }

  /**
   * Veritabanı durumu
   */
  async getDatabaseStats() {
    try {
      const db = await this.getActiveDB();
      return await db.getDatabaseStats();
    } catch (error) {
      logger.error('❌ Veritabanı istatistik hatası:', error);
      return null;
    }
  }

  /**
   * Veritabanını temizle
   */
  async clearDatabase() {
    try {
      const db = await this.getActiveDB();
      return await db.clearDatabase();
    } catch (error) {
      logger.error('❌ Veritabanı temizleme hatası:', error);
      throw error;
    }
  }

  /**
   * Veritabanı türünü değiştir
   */
  setDatabaseType(useFirestore) {
    this.useFirestore = useFirestore;
    logger.info(`🔄 Veritabanı türü değiştirildi: ${useFirestore ? 'Firestore' : 'IndexedDB'}`);
  }

  /**
   * Mevcut veritabanı türünü döndür
   */
  getDatabaseType() {
    return this.useFirestore ? 'Firestore' : 'IndexedDB';
  }
}

// Singleton instance
const db = new DatabaseAdapter();
export default db;
