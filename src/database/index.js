import firestoreClient from './firestoreClient';
import logger from '../utils/logger';
import { waitForAuth, getCurrentUserId, getUserRole } from '../firebase/authState';
import { sanitizeForFirestore } from '../utils/sanitizer';

/**
 * Database Adapter - Firestore + IndexedDB Fallback
 * Refactored using Wrapper Pattern to reduce complexity
 */
class DatabaseAdapter {
  constructor() {
    this.useFirestore = true; // Firestore birincil veritabanı
    this.firestore = firestoreClient;
    this.indexedDB = null; // Lazy load
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

  async getIndexedDB() {
    if (this.indexedDB) return this.indexedDB;
    // Dinamik import
    const { default: dexieDb } = await import('./database');
    this.indexedDB = dexieDb;
    return this.indexedDB;
  }

  async getActiveDB() {
    if (this.useFirestore) return this.firestore;
    return await this.getIndexedDB();
  }

  // --- Helper Methods ---

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
    if (this.writeAccessExplicit !== null) return this.writeAccessExplicit;

    const now = Date.now();
    if (now - this.writeAccessCacheTime < 5_000) return this.writeAccessCache;

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

  // --- CORE WRAPPER ---

  /**
   * Merkezi Hata Yönetimi ve Fallback Metodu
   */
  async _execute(opName, fsTask, idbTask, options = {}) {
    const {
      requiresWrite = false,
      strictPermission = false, // True ise permission hatasında throw eder (savePlan), False ise fallback yapar (saveStudents)
      mirrorToLocal = false, // True ise başarılı Firestore işleminden sonra IndexedDB'ye de yazar
      checkLocalIfEmpty = false // True ise Firestore boş döndüğünde Local'e bakar (getAllStudents)
    } = options;

    // 1. Yazma İzni Ön Kontrolü (Sadece Write gerekiyorsa ve Firestore aktifse)
    if (requiresWrite && this.useFirestore && process.env.NODE_ENV !== 'test') {
      const canWrite = await this._canWriteToFirestore();
      if (!canWrite) {
        if (strictPermission) {
          throw new Error(`Yazma izni olmayan oturumda ${opName} yapılamaz.`);
        }
        // Strict değilse (örn. saveStudents), direkt IndexedDB'ye düşmek isteyebiliriz ama
        // aşağıdaki logic zaten Firestore denemeden önce bunu handle edebilir.
        // Ancak tutarlılık için fallback logic'e bırakıyoruz veya direkt local'e yönlendiriyoruz.
        logger.info(`ℹ️ Yazma izni yok, ${opName} direkt IndexedDB'de denenecek.`);
        // Firestore pass geç, direkt idbTask'e git
        // useFirestore flag'ini değiştirmiyor, sadece bu işlem için atlıyor.
        return await this._runIndexedDB(opName, idbTask, requiresWrite, true);
      }
    }

    // 2. Firestore Deneme
    if (this.useFirestore) {
      try {
        const result = await fsTask(this.firestore);

        if (requiresWrite) logger.info(`✅ ${opName} başarılı (Firestore)`);

        // Mirroring (Opsiyonel)
        if (mirrorToLocal && idbTask) {
          this.getIndexedDB().then(idb => idbTask(idb)).catch(e => logger.debug(`Mirror fail for ${opName}`, e));
        }

        // Empty Check (Opsiyonel)
        if (checkLocalIfEmpty && Array.isArray(result) && result.length === 0) {
          try {
            const idb = await this.getIndexedDB();
            const localRes = await idbTask(idb);
            if (Array.isArray(localRes) && localRes.length > 0) return localRes;
          } catch (ignore) { /* ignore */ }
        }

        return result;

      } catch (error) {
        // Hata Yönetimi
        logger.error(`❌ ${opName} hatası (Firestore):`, error);

        const isPermission = this._isPermissionError(error);

        if (isPermission) {
          if (strictPermission) {
            throw new Error(`Firestore izin hatası: ${opName} başarısız.`);
          }
          // Strict değilse fallback'e devam et
          logger.info(`ℹ️ İzin hatası, ${opName} IndexedDB ile denenecek.`);
          return await this._runIndexedDB(opName, idbTask, requiresWrite, true);
        }

        // Diğer hatalarda (bağlantı vb.) kalıcı olarak IndexedDB'ye geç
        logger.info(`🔄 Firestore hatası, IndexedDB'ye geçiliyor (${opName})...`);
        this.useFirestore = false;
      }
    }

    // 3. Fallback (IndexedDB)
    return await this._runIndexedDB(opName, idbTask, requiresWrite, false);
  }

  async _runIndexedDB(opName, idbTask, isWrite, returnedLocalOnlyFlag) {
    if (!idbTask) throw new Error(`${opName} için fallback (IndexedDB) tanımlı değil.`);

    try {
      const idb = await this.getIndexedDB();
      const result = await idbTask(idb);

      if (isWrite) {
        if (returnedLocalOnlyFlag) {
          logger.info(`ℹ️ ${opName} yalnızca IndexedDB'ye kaydedildi ('local-only')`);
          return 'local-only';
        }
        logger.warn(`⚠️ ${opName} IndexedDB ile tamamlandı (Firestore devre dışı/hata).`);
      }
      return result;
    } catch (err) {
      logger.error(`❌ ${opName} hatası (IndexedDB):`, err);
      throw err;
    }
  }

  // --- CRUD METHODS ---

  async updatePlan(planId, planData) {
    const payload = sanitizeForFirestore(planData);
    return this._execute(
      'updatePlan',
      (fs) => fs.updatePlan(planId, payload),
      (idb) => idb.updatePlan ? idb.updatePlan(planId, planData) : null,
      { requiresWrite: true, strictPermission: true }
    );
  }

  async savePlan(planData) {
    const payload = sanitizeForFirestore(planData);
    return this._execute(
      'savePlan',
      (fs) => fs.savePlan(payload),
      (idb) => idb.savePlan(planData),
      { requiresWrite: true, strictPermission: true }
    );
  }

  async loadPlan(planId) {
    return this._execute(
      'loadPlan',
      (fs) => fs.loadPlan(planId),
      (idb) => idb.loadPlan(planId)
    );
  }

  async getPlan(planId) {
    // getPlan için özel logic: Firestore loadPlan kullanır (string ID için), IDB getPlan kullanır.
    return this._execute(
      'getPlan',
      async (fs) => {
        if (typeof planId === 'string' && isNaN(Number(planId))) {
          return await fs.loadPlan(planId);
        }
        // Firestore'da getPlan yoksa loadPlan
        return await fs.loadPlan ? fs.loadPlan(planId) : null;
      },
      (idb) => idb.getPlan(planId)
    );
  }

  async getAllPlans() {
    return this._execute(
      'getAllPlans',
      (fs) => fs.getAllPlans(),
      (idb) => idb.getAllPlans()
    );
  }

  async getLatestPlan() {
    return this._execute(
      'getLatestPlan',
      (fs) => fs.getLatestPlan(),
      (idb) => idb.getLatestPlan()
    );
  }

  async deletePlan(planId) {
    return this._execute(
      'deletePlan',
      (fs) => fs.deletePlan(planId),
      (idb) => idb.deletePlan(planId),
      { requiresWrite: true, strictPermission: false } // Delete için strict değil? Mevcut kodda throw ediyordu. Strict: true yapıyorum.
    );
    // Note: Orijinal kodda deletePlan'da permission check yoktu (try-catch içindeydi).
    // Ancak mantıken delete de strict olmalı. Eğer orijinal kodda yoksa permission hatasında idb'den siliyordu.
    // Orijinal kodda deletePlan için explicit permission check yoktu, sadece throw error vardı.
    // Ben strict: false yapayım (orijinal gibi davranması için) veya true?
    // Orijinal kod step 241, line 353 deletePlan:
    // try { getActiveDB().deletePlan } catch { if firestore switch, idb.deletePlan }.
    // Yani permission check yok. Hata alırsa IDB'den silmeye çalışır.
    // Strict: false doğru seçim.
  }

  async saveStudents(students) {
    const payload = sanitizeForFirestore(students);
    return this._execute(
      'saveStudents',
      (fs) => fs.saveStudents(payload),
      (idb) => idb.saveStudents(students),
      { requiresWrite: true, strictPermission: false, mirrorToLocal: true }
    );
  }

  async getAllStudents() {
    return this._execute(
      'getAllStudents',
      (fs) => fs.getAllStudents(),
      (idb) => idb.getAllStudents(),
      { checkLocalIfEmpty: true }
    );
  }

  async saveSettings(settings) {
    const payload = sanitizeForFirestore(settings);
    return this._execute(
      'saveSettings',
      (fs) => fs.saveSettings(payload),
      (idb) => idb.saveSettings(settings),
      { requiresWrite: true, strictPermission: false, mirrorToLocal: true }
    );
  }

  async getSettings() {
    return this._execute(
      'getSettings',
      (fs) => fs.getSettings(),
      (idb) => idb.getSettings()
    );
  }

  async saveSalons(salons) {
    const payload = sanitizeForFirestore(salons);
    return this._execute(
      'saveSalons',
      (fs) => fs.saveSalons(payload),
      (idb) => idb.saveSalons(salons),
      { requiresWrite: true, strictPermission: false, mirrorToLocal: true }
    );
  }

  async getAllSalons() {
    return this._execute(
      'getAllSalons',
      (fs) => fs.getAllSalons(),
      (idb) => idb.getAllSalons(),
      { checkLocalIfEmpty: true }
    );
  }

  async getDatabaseStats() {
    return this._execute(
      'getDatabaseStats',
      (fs) => fs.getDatabaseStats(),
      (idb) => idb.getDatabaseStats()
    ).catch(() => null); // Stats hatası null döner
  }

  async clearDatabase() {
    return this._execute(
      'clearDatabase',
      (fs) => fs.clearDatabase(),
      (idb) => idb.clearDatabase(),
      { requiresWrite: true } // strict?
    );
  }

  // --- UTILS ---
  setDatabaseType(useFirestore) {
    this.useFirestore = useFirestore;
    logger.info(`🔄 Veritabanı türü değiştirildi: ${useFirestore ? 'Firestore' : 'IndexedDB'}`);
  }

  getDatabaseType() {
    return this.useFirestore ? 'Firestore' : 'IndexedDB';
  }
}

// Singleton instance
const db = new DatabaseAdapter();
export default db;
