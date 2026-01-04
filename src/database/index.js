import Dexie from 'dexie';
import firestoreClient from './firestoreClient';
import logger from '../utils/logger';
import { waitForAuth, getCurrentUserId, getUserRole } from '../firebase/authState';

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
    this.writeAccessExplicit = null;
    this.writeAccessCache = false;
    this.writeAccessCacheTime = 0;
  }

  setWriteAccess(enabled) {
    this.writeAccessExplicit = enabled === null ? null : Boolean(enabled);
    if (enabled === true && !this.useFirestore) {
      this.useFirestore = true;
      logger.info('✅ Firestore yazma izinleri yeniden etkinleştirildi (setWriteAccess)');
    }
  }

  _isPermissionError(error) {
    if (!error) return false;
    const code = error.code || error.name || '';
    const message = (error.message || '').toLowerCase();
    return (
      code === 'permission-denied' ||
      code === 'unauthenticated' ||
      message.includes('permission-denied') ||
      message.includes('kimlik doğrulaması olmadan') ||
      message.includes('permission denied') ||
      message.includes('missing or insufficient permissions')
    );
  }

  async _canWriteToFirestore() {
    if (this.writeAccessExplicit === true) {
      return true;
    }
    if (this.writeAccessExplicit === false) {
      return false;
    }

    const now = Date.now();
    if (now - this.writeAccessCacheTime < 5_000) {
      return this.writeAccessCache;
    }

    try {
      await waitForAuth();
      const userId = getCurrentUserId();
      if (!userId) {
        this.writeAccessCache = false;
      } else {
        const role = await getUserRole();
        this.writeAccessCache = role === 'admin';
      }
    } catch (error) {
      logger.warn('⚠️ Firestore yazma yetkisi kontrolü başarısız:', error);
      this.writeAccessCache = false;
    }

    this.writeAccessCacheTime = now;
    return this.writeAccessCache;
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
   * Plan güncelleme
   */
  async updatePlan(planId, planData) {
    try {

      logger.info('🔄 DatabaseAdapter updatePlan çağrıldı:', {
        planId,
        planName: planData?.name,
        useFirestore: this.useFirestore
      });

      const canWrite = await this._canWriteToFirestore();
      if (!canWrite) {
        throw new Error('Yazma izni olmayan oturumda plan güncellenemez.');
      }

      // Firestore birincil - veriyi sanitize et
      const payload = this.sanitizeForFirestore(planData);
      const db = await this.getActiveDB();

      if (!db.updatePlan) {
        throw new Error('Veritabanı güncelleme desteği yok');
      }

      const result = await db.updatePlan(planId, payload);

      logger.info('✅ DatabaseAdapter updatePlan başarılı:', result);
      return result;
    } catch (error) {
      logger.error('❌ Plan güncelleme hatası:', error);

      if (this._isPermissionError(error)) {
        throw new Error('Firestore izin hatası: Plan güncellenemedi.');
      }

      // Firestore hatası durumunda IndexedDB'ye geç
      if (this.useFirestore) {
        logger.info('🔄 Firestore hatası, IndexedDB\'ye geçiliyor...');
        this.useFirestore = false;
        const indexedDB = await this.getIndexedDB();
        if (indexedDB.updatePlan) {
          return await indexedDB.updatePlan(planId, planData);
        }
      }

      throw error;
    }
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

      // Test ortamında yazma izni kontrolünü atla
      if (process.env.NODE_ENV !== 'test') {
        const canWrite = await this._canWriteToFirestore();
        if (!canWrite) {
          throw new Error('Yazma izni olmayan oturumda plan kaydedilemez.');
        }
      }

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

      // Firestore'a kaydedildiğinden emin ol
      if (this.useFirestore && result && typeof result === 'string') {

        logger.info('✅ Plan Firestore\'a kaydedildi. Plan ID:', result);
      } else if (result && typeof result === 'number') {

        logger.warn('⚠️ Plan IndexedDB\'ye kaydedildi (Firestore devre dışı veya hata). Plan ID:', result);
      }

      return result;
    } catch (error) {
      logger.error('❌ Plan kaydetme hatası:', error);


      if (this._isPermissionError(error)) {
        throw new Error('Firestore izin hatası: Plan kaydedilemedi.');
      }

      // Firestore hatası durumunda IndexedDB'ye geç
      if (this.useFirestore) {

        logger.warn('⚠️ Firestore hatası, IndexedDB\'ye geçiliyor...');
        try {
          this.useFirestore = false;
          const indexedDB = await this.getIndexedDB();
          const indexedResult = await indexedDB.savePlan(planData);
          logger.warn('⚠️ Plan IndexedDB\'ye kaydedildi (Firestore hatası). Plan ID:', indexedResult);
          return indexedResult;
        } catch (indexedError) {
          logger.error('❌ IndexedDB kaydetme hatası:', indexedError);
          throw new Error(`Plan kaydedilemedi. Firestore hatası: ${error.message}, IndexedDB hatası: ${indexedError.message}`);
        }
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
      // Firestore ve IndexedDB için ID formatını kontrol et
      // Firestore ID'leri string, IndexedDB ID'leri number olabilir
      const db = await this.getActiveDB();

      // Firestore kullanılıyorsa loadPlan kullan (getPlan yok)
      if (this.useFirestore && typeof planId === 'string' && isNaN(Number(planId))) {
        // Firestore string ID'si - loadPlan kullan
        return await db.loadPlan(planId);
      }

      // IndexedDB veya sayısal ID için getPlan kullan
      const indexedDB = await this.getIndexedDB();
      return await indexedDB.getPlan(planId);
    } catch (error) {
      logger.error('❌ Plan getirme hatası:', error);

      // Hata durumunda loadPlan'ı dene (Firestore için)
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
   * En son planı getir
   */
  async getLatestPlan() {
    try {
      const db = await this.getActiveDB();
      return await db.getLatestPlan();
    } catch (error) {
      logger.error('❌ En son plan yükleme hatası:', error);

      if (this.useFirestore) {
        logger.info('🔄 Firestore hatası, IndexedDB\'ye geçiliyor...');
        this.useFirestore = false;
        const indexedDB = await this.getIndexedDB();
        return await indexedDB.getLatestPlan();
      }

      return null;
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
      const canWrite = await this._canWriteToFirestore();
      if (!canWrite) {
        const indexedDB = await this.getIndexedDB();
        await indexedDB.saveStudents(students);
        logger.info('ℹ️ Öğrenciler yalnızca IndexedDB\'ye kaydedildi (yazma izni yok)');
        return 'local-only';
      }

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

      if (this._isPermissionError(error)) {
        const indexedDB = await this.getIndexedDB();
        await indexedDB.saveStudents(students);
        logger.info('ℹ️ Öğrenciler sadece IndexedDB\'ye kaydedildi (Firestore izin hatası)');
        return 'local-only';
      }

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
      const canWrite = await this._canWriteToFirestore();
      if (!canWrite) {
        const indexedDB = await this.getIndexedDB();
        await indexedDB.saveSettings(settings);
        logger.info('ℹ️ Ayarlar yalnızca IndexedDB\'ye kaydedildi (yazma izni yok)');
        return 'local-only';
      }

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

      if (this._isPermissionError(error)) {
        const indexedDB = await this.getIndexedDB();
        await indexedDB.saveSettings(settings);
        logger.info('ℹ️ Ayarlar sadece IndexedDB\'ye kaydedildi (Firestore izin hatası)');
        return 'local-only';
      }

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
      const canWrite = await this._canWriteToFirestore();
      if (!canWrite) {
        const indexedDB = await this.getIndexedDB();
        await indexedDB.saveSalons(salons);
        logger.info('ℹ️ Salonlar yalnızca IndexedDB\'ye kaydedildi (yazma izni yok)');
        return 'local-only';
      }

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

      if (this._isPermissionError(error)) {
        const indexedDB = await this.getIndexedDB();
        await indexedDB.saveSalons(salons);
        logger.info('ℹ️ Salonlar sadece IndexedDB\'ye kaydedildi (Firestore izin hatası)');
        return 'local-only';
      }

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
