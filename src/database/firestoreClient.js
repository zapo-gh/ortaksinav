import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  writeBatch,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import logger from '../utils/logger';
import { sanitizeForFirestore, sanitizeFromFirestore, checkDataSize, chunkArray } from '../utils/firestoreUtils';
import { DISABLE_FIREBASE } from '../config/firebaseConfig';

/**
 * Firestore Database Client - Parçalı Model
 * 
 * Koleksiyon Yapısı:
 * - plans/{planId} → meta bilgiler
 * - plans/{planId}/salons/{salonId} → salon detayları
 * - plans/{planId}/unplaced/{chunkId} → yerleşmeyen öğrenciler
 * - settings/{key} → sistem ayarları
 * - students → öğrenci listesi (global)
 */
class FirestoreClient {
  constructor() {
    this.db = db;
    this.isDisabled = DISABLE_FIREBASE || db?.mock;
  }

  /**
   * Check if Firebase is disabled and return appropriate response
   */
  _handleDisabledFirebase(operation, defaultValue = null) {
    if (this.isDisabled) {
      logger.debug(`🔧 Firebase disabled - ${operation} skipped, using localStorage fallback`);
      return Promise.resolve(defaultValue);
    }
    return null;
  }

  /**
   * Plan meta bilgilerini kaydet
   */
  async savePlan(planData) {
    const disabledResult = this._handleDisabledFirebase('savePlan', 'mock-plan-id');
    if (disabledResult) return disabledResult;
    
    try {
      logger.debug('💾 Firestore: Plan meta kaydediliyor...');
      
      const planRef = doc(collection(this.db, 'plans'));
      const planId = planRef.id;
      
      // Veriyi sanitize et
      const sanitizedPlanData = sanitizeForFirestore(planData);
      
      const planMeta = {
        name: sanitizedPlanData?.name || 'İsimsiz Plan',
        date: sanitizedPlanData?.date || null,
        totalStudents: sanitizedPlanData?.totalStudents || null,
        salonCount: sanitizedPlanData?.salonCount || null,
        // Sınav bilgilerini metadata'ya ekle
        sinavTarihi: sanitizedPlanData?.sinavTarihi || null,
        sinavSaati: sanitizedPlanData?.sinavSaati || null,
        sinavDonemi: sanitizedPlanData?.sinavDonemi || null,
        donem: sanitizedPlanData?.donem || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Veri boyutunu kontrol et
      const sizeCheck = checkDataSize(planMeta);
      if (!sizeCheck.isValid) {
        throw new Error(`Plan meta verisi çok büyük: ${sizeCheck.sizeInMB.toFixed(2)}MB`);
      }
      
      await setDoc(planRef, planMeta);
      
      // Salonları parçalı olarak kaydet
      if (planData?.data?.tumSalonlar) {
        await this.savePlanSalons(planId, planData.data.tumSalonlar);
      }
      
      // Yerleşmeyen öğrencileri kaydet
      if (planData?.data?.yerlesilemeyenOgrenciler) {
        await this.saveUnplacedStudents(planId, planData.data.yerlesilemeyenOgrenciler);
      }
      
      logger.debug('✅ Firestore: Plan kaydedildi:', planId);
      return planId;
    } catch (error) {
      logger.error('❌ Firestore: Plan kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Salonları parçalı olarak kaydet
   */
  async savePlanSalons(planId, salons) {
    try {
      const batch = writeBatch(this.db);
      const chunkSize = 500; // Firestore batch limit
      
      for (let i = 0; i < salons.length; i += chunkSize) {
        const chunk = salons.slice(i, i + chunkSize);
        
        chunk.forEach(salon => {
          const salonRef = doc(this.db, 'plans', planId, 'salons', salon.salonId || salon.id);
          const sanitizedSalon = sanitizeForFirestore({
            ...salon,
            updatedAt: serverTimestamp()
          });
          batch.set(salonRef, sanitizedSalon);
        });
        
        await batch.commit();
        logger.debug(`✅ Firestore: Salon chunk kaydedildi (${i + 1}-${i + chunk.length})`);
      }
    } catch (error) {
      logger.error('❌ Firestore: Salon kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Yerleşmeyen öğrencileri parçalı olarak kaydet
   */
  async saveUnplacedStudents(planId, students) {
    try {
      if (!students || students.length === 0) return;
      
      const batch = writeBatch(this.db);
      const chunkSize = 500;
      
      for (let i = 0; i < students.length; i += chunkSize) {
        const chunk = students.slice(i, i + chunkSize);
        const chunkRef = doc(this.db, 'plans', planId, 'unplaced', `chunk_${Math.floor(i / chunkSize)}`);
        
        batch.set(chunkRef, {
          students: chunk,
          chunkIndex: Math.floor(i / chunkSize),
          updatedAt: serverTimestamp()
        });
      }
      
      await batch.commit();
      logger.debug('✅ Firestore: Yerleşmeyen öğrenciler kaydedildi');
    } catch (error) {
      logger.error('❌ Firestore: Yerleşmeyen öğrenci kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Plan yükleme
   */
  async loadPlan(planId) {
    const disabledResult = this._handleDisabledFirebase('loadPlan', null);
    if (disabledResult) return disabledResult;
    
    try {
      logger.debug('📥 Firestore: Plan yükleniyor:', planId);
      
      // Meta bilgileri yükle
      const planRef = doc(this.db, 'plans', planId);
      const planSnap = await getDoc(planRef);
      
      if (!planSnap.exists()) {
        throw new Error('Plan bulunamadı');
      }
      
      const planMeta = planSnap.data();
      
      // Salonları yükle
      const salonsRef = collection(this.db, 'plans', planId, 'salons');
      const salonsSnap = await getDocs(salonsRef);
      const salons = [];
      
      salonsSnap.forEach(doc => {
        salons.push({ id: doc.id, ...doc.data() });
      });
      
      // Yerleşmeyen öğrencileri yükle
      const unplacedRef = collection(this.db, 'plans', planId, 'unplaced');
      const unplacedSnap = await getDocs(unplacedRef);
      const unplacedStudents = [];
      
      unplacedSnap.forEach(doc => {
        const data = doc.data();
        if (data.students) {
          unplacedStudents.push(...data.students);
        }
      });
      
      // Plan verisini birleştir
      const planData = {
        ...planMeta,
        data: {
          tumSalonlar: salons,
          yerlesilemeyenOgrenciler: unplacedStudents
        }
      };
      
      logger.debug('✅ Firestore: Plan yüklendi');
      return planData;
    } catch (error) {
      logger.error('❌ Firestore: Plan yükleme hatası:', error);
      throw error;
    }
  }

  /**
   * Tüm planları listele
   */
  async getAllPlans() {
    const disabledResult = this._handleDisabledFirebase('getAllPlans', []);
    if (disabledResult) return disabledResult;
    
    try {
      logger.debug('🔍 Firestore: Planlar listeleniyor...');
      
      const plansRef = collection(this.db, 'plans');
      
      // orderBy('updatedAt', 'desc') index gerektirebilir, önce basit sorgu deneyelim
      // Eğer hata verirse, orderBy olmadan sorgula
      let q;
      try {
        q = query(plansRef, orderBy('updatedAt', 'desc'));
      } catch (indexError) {
        logger.warn('⚠️ Firestore index hatası, orderBy olmadan sorgulanıyor:', indexError);
        // Index yoksa orderBy olmadan sorgula
        q = query(plansRef);
      }
      
      const plansSnap = await getDocs(q);
      
      const plans = [];
      plansSnap.forEach(doc => {
        const planData = doc.data();
        // Test Plan'ları filtrele (gereksiz test planlarını Firestore'dan getirme)
        const planName = String(planData?.name || '').trim();
        if (planName === 'Test Plan' || planName.toLowerCase().includes('test plan')) {
          logger.debug(`⚠️ Test Plan filtrelendi: ${doc.id} - ${planName}`);
          return; // Bu planı atla
        }
        
        plans.push({
          id: doc.id,
          ...planData
        });
      });
      
      // Eğer orderBy kullanılamadıysa, client-side sırala
      if (plans.length > 0 && !q._queryConstraints?.some(c => c.type === 'orderBy')) {
        plans.sort((a, b) => {
          const dateA = a.updatedAt?.toMillis?.() || new Date(a.date || a.createdAt || 0).getTime();
          const dateB = b.updatedAt?.toMillis?.() || new Date(b.date || b.createdAt || 0).getTime();
          return dateB - dateA; // Yeni tarihler önce
        });
      }
      
      logger.debug('✅ Firestore: Planlar yüklendi:', plans.length);
      return plans;
    } catch (error) {
      logger.error('❌ Firestore: Plan listesi yükleme hatası:', error);
      throw error;
    }
  }

  /**
   * Plan silme
   */
  async deletePlan(planId) {
    const disabledResult = this._handleDisabledFirebase('deletePlan', null);
    if (disabledResult) return disabledResult;
    
    try {
      logger.debug('🗑️ Firestore: Plan siliniyor:', planId);
      
      // Alt koleksiyonları sil
      const batch = writeBatch(this.db);
      
      // Salonları sil
      const salonsRef = collection(this.db, 'plans', planId, 'salons');
      const salonsSnap = await getDocs(salonsRef);
      salonsSnap.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Yerleşmeyen öğrencileri sil
      const unplacedRef = collection(this.db, 'plans', planId, 'unplaced');
      const unplacedSnap = await getDocs(unplacedRef);
      unplacedSnap.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Meta planı sil
      const planRef = doc(this.db, 'plans', planId);
      batch.delete(planRef);
      
      await batch.commit();
      logger.debug('✅ Firestore: Plan silindi:', planId);
    } catch (error) {
      logger.error('❌ Firestore: Plan silme hatası:', error);
      throw error;
    }
  }

  /**
   * Öğrencileri kaydet
   */
  async saveStudents(students) {
    const disabledResult = this._handleDisabledFirebase('saveStudents', null);
    if (disabledResult) return disabledResult;
    
    try {
      logger.debug('💾 Firestore: Öğrenciler kaydediliyor...');
      
      const batch = writeBatch(this.db);
      const chunkSize = 500;
      
      for (let i = 0; i < students.length; i += chunkSize) {
        const chunk = students.slice(i, i + chunkSize);
        
        chunk.forEach(student => {
          const studentRef = doc(this.db, 'students', student.id.toString());
          batch.set(studentRef, {
            ...student,
            updatedAt: serverTimestamp()
          });
        });
        
        await batch.commit();
        logger.debug(`✅ Firestore: Öğrenci chunk kaydedildi (${i + 1}-${i + chunk.length})`);
      }
    } catch (error) {
      logger.error('❌ Firestore: Öğrenci kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Tüm öğrencileri getir
   */
  async getAllStudents() {
    const disabledResult = this._handleDisabledFirebase('getAllStudents', []);
    if (disabledResult) return disabledResult;
    
    try {
      logger.debug('📥 Firestore: Öğrenciler yükleniyor...');
      
      const studentsRef = collection(this.db, 'students');
      const studentsSnap = await getDocs(studentsRef);
      
      const students = [];
      studentsSnap.forEach(doc => {
        students.push({ id: doc.id, ...doc.data() });
      });
      
      logger.debug('✅ Firestore: Öğrenciler yüklendi:', students.length);
      return students;
    } catch (error) {
      logger.error('❌ Firestore: Öğrenci yükleme hatası:', error);
      return [];
    }
  }

  /**
   * Ayarları kaydet
   */
  async saveSettings(settings) {
    const disabledResult = this._handleDisabledFirebase('saveSettings', null);
    if (disabledResult) return disabledResult;
    
    try {
      logger.debug('💾 Firestore: Ayarlar kaydediliyor...');
      
      const batch = writeBatch(this.db);
      
      Object.entries(settings).forEach(([key, value]) => {
        const settingRef = doc(this.db, 'settings', key);
        batch.set(settingRef, {
          value,
          type: typeof value,
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      logger.debug('✅ Firestore: Ayarlar kaydedildi');
    } catch (error) {
      logger.error('❌ Firestore: Ayar kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Tüm ayarları getir
   */
  async getSettings() {
    const disabledResult = this._handleDisabledFirebase('getSettings', {});
    if (disabledResult) return disabledResult;
    
    try {
      logger.debug('📥 Firestore: Ayarlar yükleniyor...');
      
      const settingsRef = collection(this.db, 'settings');
      const settingsSnap = await getDocs(settingsRef);
      
      const settings = {};
      settingsSnap.forEach(doc => {
        settings[doc.id] = doc.data().value;
      });
      
      logger.debug('✅ Firestore: Ayarlar yüklendi:', Object.keys(settings).length);
      return settings;
    } catch (error) {
      logger.error('❌ Firestore: Ayar yükleme hatası:', error);
      return {};
    }
  }

  /**
   * Salonları kaydet
   */
  async saveSalons(salons) {
    const disabledResult = this._handleDisabledFirebase('saveSalons', null);
    if (disabledResult) return disabledResult;
    
    try {
      logger.debug('💾 Firestore: Salonlar kaydediliyor...');
      
      const batch = writeBatch(this.db);
      const chunkSize = 500;
      
      for (let i = 0; i < salons.length; i += chunkSize) {
        const chunk = salons.slice(i, i + chunkSize);
        
        chunk.forEach(salon => {
          const salonRef = doc(this.db, 'salons', salon.id.toString());
          batch.set(salonRef, {
            ...salon,
            updatedAt: serverTimestamp()
          });
        });
        
        await batch.commit();
        logger.debug(`✅ Firestore: Salon chunk kaydedildi (${i + 1}-${i + chunk.length})`);
      }
    } catch (error) {
      logger.error('❌ Firestore: Salon kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Tüm salonları getir
   */
  async getAllSalons() {
    const disabledResult = this._handleDisabledFirebase('getAllSalons', []);
    if (disabledResult) return disabledResult;
    
    try {
      logger.debug('📥 Firestore: Salonlar yükleniyor...');
      
      const salonsRef = collection(this.db, 'salons');
      const salonsSnap = await getDocs(salonsRef);
      
      const salons = [];
      salonsSnap.forEach(doc => {
        salons.push({ id: doc.id, ...doc.data() });
      });
      
      logger.debug('✅ Firestore: Salonlar yüklendi:', salons.length);
      return salons;
    } catch (error) {
      logger.error('❌ Firestore: Salon yükleme hatası:', error);
      return [];
    }
  }

  /**
   * Veritabanı durumu
   */
  async getDatabaseStats() {
    try {
      const [plansSnap, studentsSnap, salonsSnap, settingsSnap] = await Promise.all([
        getDocs(collection(this.db, 'plans')),
        getDocs(collection(this.db, 'students')),
        getDocs(collection(this.db, 'salons')),
        getDocs(collection(this.db, 'settings'))
      ]);
      
      return {
        plans: plansSnap.size,
        students: studentsSnap.size,
        salons: salonsSnap.size,
        settings: settingsSnap.size,
        total: plansSnap.size + studentsSnap.size + salonsSnap.size + settingsSnap.size
      };
    } catch (error) {
      logger.error('❌ Firestore: İstatistik hatası:', error);
      return null;
    }
  }

  /**
   * Veritabanını temizle
   */
  async clearDatabase() {
    try {
      logger.warn('⚠️ Firestore: Veritabanı temizleniyor...');
      
      const collections = ['plans', 'students', 'salons', 'settings'];
      
      for (const collectionName of collections) {
        const collectionRef = collection(this.db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        const batch = writeBatch(this.db);
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        logger.debug(`✅ Firestore: ${collectionName} temizlendi`);
      }
      
      logger.debug('✅ Firestore: Veritabanı temizlendi');
    } catch (error) {
      logger.error('❌ Firestore: Veritabanı temizleme hatası:', error);
      throw error;
    }
  }
}

// Singleton instance
const firestoreClient = new FirestoreClient();
export default firestoreClient;

