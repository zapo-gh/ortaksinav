import Dexie from 'dexie';
import firestoreClient from './firestoreClient';
import logger from '../utils/logger';

/**
 * Database Adapter - Firestore + IndexedDB Fallback
 * Mevcut database.js API'sini koruyarak Firestore'a geçiş
 */
class DatabaseAdapter {
  constructor() {
    this.useFirestore = true; // Feature flag
    this.firestore = firestoreClient;
    this.indexedDB = null; // Lazy load IndexedDB
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
   * IndexedDB'yi lazy load et
   */
  async getIndexedDB() {
    if (!this.indexedDB) {
      const { default: IndexedDBClient } = await import('./database.js');
      this.indexedDB = IndexedDBClient;
    }
    return this.indexedDB;
  }

  /**
   * Aktif veritabanını döndür
   */
  async getActiveDB() {
    if (this.useFirestore) {
      try {
        return this.firestore;
      } catch (error) {
        logger.warn('⚠️ Firestore hatası, IndexedDB\'ye geçiliyor:', error);
        this.useFirestore = false;
        return await this.getIndexedDB();
      }
    }
    return await this.getIndexedDB();
  }

  /**
   * Plan kaydetme
   */
  async savePlan(planData) {
    try {
      const payload = this.sanitizeForFirestore(planData);
      const db = await this.getActiveDB();
      return await db.savePlan(payload);
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
      const payload = this.sanitizeForFirestore(students);
      const db = await this.getActiveDB();
      return await db.saveStudents(payload);
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
      const payload = this.sanitizeForFirestore(settings);
      const db = await this.getActiveDB();
      return await db.saveSettings(payload);
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
      const payload = this.sanitizeForFirestore(salons);
      const db = await this.getActiveDB();
      return await db.saveSalons(payload);
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
