import Dexie from 'dexie';
import firestoreClient from './firestoreClient';
import logger from '../utils/logger';

/**
 * Database Adapter - Firestore + IndexedDB Fallback
 * Mevcut database.js API'sini koruyarak Firestore'a geçiş
 */
class DatabaseAdapter {
  constructor() {
    // Firestore kota sorunları nedeniyle varsayılan olarak DEVRE DIŞI
    // Sadece IndexedDB kullan (kota sorunu yok, tarayıcıda çalışır)
    this.useFirestore = false; // Firestore devre dışı - IndexedDB kullan
    this.firestore = firestoreClient; // Lazy import için hazır tut
    this.indexedDB = null; // IndexedDB lazy load
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
   * Aktif veritabanını döndür - Varsayılan olarak IndexedDB
   */
  async getActiveDB() {
    // Seçili veritabanını döndür
    // Firestore kota sorunları nedeniyle varsayılan olarak IndexedDB kullanıyoruz
    if (this.useFirestore) {
      return this.firestore;
    }
    return await this.getIndexedDB();
  }

  /**
   * Plan kaydetme
   */
  async savePlan(planData) {
    try {
      // IndexedDB kullanıyoruz (Firestore devre dışı)
      const db = await this.getActiveDB();
      // IndexedDB için sanitize gerekmez
      return await db.savePlan(planData);
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
      // IndexedDB kullanıyoruz (Firestore devre dışı)
      const db = await this.getActiveDB();
      // IndexedDB için sanitize gerekmez
      return await db.saveStudents(students);
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
      // IndexedDB kullanıyoruz (Firestore devre dışı)
      const db = await this.getActiveDB();
      return await db.getAllStudents();
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
      // IndexedDB kullanıyoruz (Firestore devre dışı)
      const db = await this.getActiveDB();
      // IndexedDB için sanitize gerekmez
      return await db.saveSettings(settings);
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
      // IndexedDB kullanıyoruz (Firestore devre dışı)
      const db = await this.getActiveDB();
      // IndexedDB için sanitize gerekmez
      return await db.saveSalons(salons);
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
      // IndexedDB kullanıyoruz (Firestore devre dışı)
      const db = await this.getActiveDB();
      return await db.getAllSalons();
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
