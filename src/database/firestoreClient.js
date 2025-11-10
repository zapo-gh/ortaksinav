import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  getDocsFromServer,
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
import { waitForAuth, getCurrentUserId, getUserRole } from '../firebase/authState';
import { sanitizeStudentRecord, sanitizeSettingsMap, sanitizeSalonRecord, sanitizePlanMeta, sanitizeText, sanitizeStringArray } from '../utils/sanitizer';

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
    // DEBUG: Firestore durumunu kontrol et
    const isMockDb = db?.mock === true;
    this.isDisabled = DISABLE_FIREBASE || isMockDb;
    
    // DEBUG: Durum logları - Console'a da yaz
    console.log('🔥 FirestoreClient constructor:', {
      DISABLE_FIREBASE,
      dbIsMock: isMockDb,
      isDisabled: this.isDisabled,
      dbType: typeof db,
      dbHasMock: 'mock' in (db || {}),
      dbMockValue: db?.mock
    });
    logger.debug('🔥 FirestoreClient constructor:', {
      DISABLE_FIREBASE,
      dbIsMock: isMockDb,
      isDisabled: this.isDisabled,
      dbType: typeof db,
      dbHasMock: 'mock' in (db || {})
    });
    
    if (this.isDisabled) {
      console.warn('⚠️ Firestore DEVRE DIŞI - veriler Firestore\'a kaydedilmeyecek!');
      console.warn('⚠️ Sebep:', {
        DISABLE_FIREBASE,
        dbIsMock: isMockDb
      });
      logger.warn('⚠️ Firestore DEVRE DIŞI - veriler Firestore\'a kaydedilmeyecek!');
    } else {
      console.log('✅ Firestore AKTIF - veriler Firestore\'a kaydedilecek');
      logger.info('✅ Firestore AKTIF - veriler Firestore\'a kaydedilecek');
    }
  }

  /**
   * Check if Firebase is disabled and return appropriate response
   */
  _handleDisabledFirebase(operation, defaultValue = null) {
    if (this.isDisabled) {
      logger.warn(`🔧 Firebase disabled - ${operation} skipped, using localStorage fallback`);
      return { isDisabled: true, defaultValue };
    }
    return null;
  }

  /**
   * Plan meta bilgilerini kaydet
   */
  async savePlan(planData) {
    // DEBUG: Plan kaydetme başlangıcı - Console'a da yaz
    console.log('💾 Firestore savePlan çağrıldı:', {
      planName: planData?.name,
      isDisabled: this.isDisabled,
      dbIsMock: this.db?.mock
    });
    logger.info('💾 Firestore savePlan çağrıldı:', {
      planName: planData?.name,
      isDisabled: this.isDisabled,
      dbIsMock: this.db?.mock
    });
    
    const disabledResult = this._handleDisabledFirebase('savePlan', 'mock-plan-id');
    if (disabledResult && disabledResult.isDisabled) {
      console.error('❌ Firestore devre dışı, plan kaydedilemez!');
      logger.error('❌ Firestore devre dışı, plan kaydedilemez!');
      throw new Error('Firestore devre dışı. Plan kaydedilemez. Lütfen Firestore\'u aktif edin.');
    }
    
    try {
      await waitForAuth();
      const ownerId = getCurrentUserId();
      if (!ownerId) {
        throw new Error('Kimlik doğrulaması olmadan plan kaydedilemez.');
      }
      // TÜM TEST PLANLARINI ENGelle (Firestore kota sorununu önlemek için)
      const planName = String(planData?.name || '').trim();
      const lowerPlanName = planName.toLowerCase();
      
      // Test plan isimleri listesi (genişletilmiş)
      const testPlanNames = [
        'test plan',
        'valid plan',
        'minimal plan',
        'plan 1',
        'plan 2',
        'plan 3',
        'plan 4',
        'plan 5',
        'test',
        'geçici plan',
        'temp plan',
        'sample plan',
        'demo plan'
      ];
      
      // Tam eşleşme veya içerme kontrolü
      const isTestPlan = testPlanNames.some(testName => 
        planName === testName || 
        planName.toLowerCase() === testName ||
        lowerPlanName === testName ||
        lowerPlanName.includes(testName) ||
        testPlanNames.some(tpn => lowerPlanName.startsWith(tpn + ' ') || lowerPlanName.endsWith(' ' + tpn))
      );
      
      if (isTestPlan) {
        logger.warn('⚠️ Firestore: Test Plan kaydetme engellendi (kota koruması):', planName);
        return null; // Kaydetme, null döndür (kota kullanımını engelle)
      }
      
      logger.debug('💾 Firestore: Plan meta kaydediliyor...');
      
      const planRef = doc(collection(this.db, 'plans'));
      const planId = planRef.id;
      
      // Veriyi sanitize et (ÖNCE sanitize et, SONRA kontrol yap)
      const sanitizedPlanData = sanitizeForFirestore({
        ...planData,
        ownerId
      });
      
      // EK KORUMA: Çok az öğrenci/salon içeren planları engelle (sanitize edilmiş veriyle kontrol)
      const totalStudents = sanitizedPlanData?.totalStudents || 0;
      const salonCount = sanitizedPlanData?.salonCount || 0;
      
      // Minimal test plan kontrolü: 5'ten az öğrenci VE 2'den az salon = muhtemelen test planı
      if (totalStudents <= 5 && salonCount <= 2 && (totalStudents === 1 || salonCount === 1)) {
        logger.warn(`⚠️ Firestore: Minimal test plan kaydetme engellendi (${totalStudents} öğrenci, ${salonCount} salon):`, planName);
        return null; // Kaydetme, null döndür
      }
      
      const sanitizedAyarlar =
        sanitizeSettingsMap(sanitizedPlanData?.data?.ayarlar || sanitizedPlanData?.ayarlar || {});

      const planMeta = {
        ...sanitizePlanMeta(sanitizedPlanData),
        totalStudents: sanitizedPlanData?.totalStudents || null,
        salonCount: sanitizedPlanData?.salonCount || null,
        // Plan ayarlarını da meta verisine ekle (ayarlar sekmesini geri yüklemek için)
        ayarlar: sanitizedAyarlar,
        ownerId,
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
        await this.savePlanSalons(planId, planData.data.tumSalonlar, ownerId);
      }
      
      // Yerleşmeyen öğrencileri kaydet
      if (planData?.data?.yerlesilemeyenOgrenciler) {
        await this.saveUnplacedStudents(planId, planData.data.yerlesilemeyenOgrenciler, ownerId);
      }
      
      console.log('✅ Firestore: Plan kaydedildi:', planId);
      console.log('✅ Firestore: Plan kaydetme başarılı - Plan ID:', planId);
      logger.info('✅ Firestore: Plan kaydedildi:', planId);
      logger.info('✅ Firestore: Plan kaydetme başarılı - Plan ID:', planId);
      return planId;
    } catch (error) {
      logger.error('❌ Firestore: Plan kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Salonları parçalı olarak kaydet
   */
  async savePlanSalons(planId, salons, ownerIdParam = null) {
    try {
      const ownerId = ownerIdParam || getCurrentUserId();
      const batch = writeBatch(this.db);
      const chunkSize = 500; // Firestore batch limit
      
      for (let i = 0; i < salons.length; i += chunkSize) {
        const chunk = salons.slice(i, i + chunkSize);
        
        chunk.forEach((salon, chunkIndex) => {
          // Salon ID'sini string'e çevir ve sıfırlarla doldur (sıralama için)
          // Firestore path segment'leri her zaman string olmalı
          // String sıralamasında "01" < "02" < "10" şeklinde olacak (sayısal sıralama gibi)
          const salonIdRaw = salon.salonId || salon.id;
          let salonId = null;
          
          if (salonIdRaw !== undefined && salonIdRaw !== null) {
            // Sayısal değeri sıfırlarla doldurarak string'e çevir (2 haneli: "01", "02", ..., "10", "11")
            // Eğer sayısal değilse direkt string'e çevir
            const numValue = Number(salonIdRaw);
            if (!isNaN(numValue) && isFinite(numValue) && numValue >= 0) {
              // Sıfırlarla doldur (en fazla 3 haneli salon ID'leri için)
              salonId = String(numValue).padStart(3, '0'); // "001", "002", "010", "100"
            } else {
              salonId = String(salonIdRaw);
            }
          } else {
            // Fallback: index'e dayalı ID oluştur (sıfırlarla doldurulmuş)
            const globalIndex = i + chunkIndex;
            salonId = String(globalIndex).padStart(3, '0'); // "000", "001", "002", ...
            console.warn(`⚠️ Firestore: Salon ID bulunamadı, fallback ID kullanılıyor: ${salonId}`, salon);
          }
          
          // Firestore path segment'leri için güvenli karakterler kullan (/, \ gibi karakterleri temizle)
          salonId = salonId.replace(/[/\\]/g, '_');
          
          const salonRef = doc(this.db, 'plans', planId, 'salons', salonId);
          const sanitizedSalon = sanitizeForFirestore({
            ...sanitizeSalonRecord(salon),
            ownerId,
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
  async saveUnplacedStudents(planId, students, ownerIdParam = null) {
    try {
      if (!students || students.length === 0) return;
      const ownerId = ownerIdParam || getCurrentUserId();
      
      const batch = writeBatch(this.db);
      const chunkSize = 500;
      
      for (let i = 0; i < students.length; i += chunkSize) {
        const chunk = students.slice(i, i + chunkSize);
        const chunkRef = doc(this.db, 'plans', planId, 'unplaced', `chunk_${Math.floor(i / chunkSize)}`);
        
        batch.set(chunkRef, {
          students: chunk.map(sanitizeStudentRecord),
          chunkIndex: Math.floor(i / chunkSize),
          ownerId,
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
      await waitForAuth();
      const ownerId = getCurrentUserId();
      const userRole = await getUserRole();
      const isAdmin = userRole === 'admin';
      logger.debug('📥 Firestore: Plan yükleniyor:', planId);
      
      const planRef = doc(this.db, 'plans', planId);
      const planSnap = await getDoc(planRef);
      
      if (!planSnap.exists()) {
        throw new Error('Plan bulunamadı');
      }
      
      const planMeta = planSnap.data();
      if (planMeta.ownerId && ownerId && planMeta.ownerId !== ownerId && !isAdmin) {
        logger.debug('ℹ️ Plan sahibi farklı ancak görüntüleme modunda izin veriliyor');
      }
      if (!planMeta.ownerId && ownerId && !DISABLE_FIREBASE && isAdmin) {
        try {
          await updateDoc(planRef, {
            ownerId,
            updatedAt: serverTimestamp()
          });
          logger.debug('✅ Firestore: Legacy plan ownerId güncellendi:', planId);
          planMeta.ownerId = ownerId;
        } catch (claimError) {
          logger.warn('⚠️ Legacy plan ownerId güncellenemedi:', claimError);
        }
      }
      
      const salonsRef = collection(this.db, 'plans', planId, 'salons');
      const salonsSnap = await getDocs(salonsRef);
      const salons = [];
      
      salonsSnap.forEach(doc => {
        const salonData = doc.data();
        salons.push({ id: doc.id, ...salonData });
      });
      
      const unplacedRef = collection(this.db, 'plans', planId, 'unplaced');
      const unplacedSnap = await getDocs(unplacedRef);
      const unplacedStudents = [];
      
      unplacedSnap.forEach(doc => {
        const data = doc.data();
        if (Array.isArray(data.students)) {
          unplacedStudents.push(...data.students);
        }
      });
      
      const planData = {
        id: planId,
        ...planMeta,
        data: {
          tumSalonlar: salons,
          yerlesilemeyenOgrenciler: unplacedStudents,
          ayarlar: planMeta?.ayarlar || {}
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
   * En son planı getir
   */
  async getLatestPlan() {
    const disabledResult = this._handleDisabledFirebase('getLatestPlan', null);
    if (disabledResult) return disabledResult;
    
    try {
      await waitForAuth();
      const authOwnerId = getCurrentUserId();
      const userRole = await getUserRole();
      const isAdmin = userRole === 'admin';
      const ownerId = authOwnerId || (DISABLE_FIREBASE ? 'offline' : null);
      logger.debug('📥 Firestore: En son plan yükleniyor...');
      
      const plansRef = collection(this.db, 'plans');
      let plansSnap;
      if (isAdmin && authOwnerId) {
        plansSnap = await getDocs(query(plansRef, where('ownerId', '==', authOwnerId)));
        if (plansSnap.empty) {
          plansSnap = await getDocs(plansRef);
        }
      } else {
        plansSnap = await getDocs(plansRef);
      }
      let plans = [];
      
      const accumulatePlans = (snapshot) => {
        snapshot.forEach(doc => {
          const planData = doc.data();
          const planName = String(planData?.name || '').trim();
          const lowerName = planName.toLowerCase();
          if (planName === 'Test Plan' || 
              planName === 'Valid Plan' ||
              lowerName.includes('test plan') ||
              lowerName.includes('valid plan')) {
            return;
          }
          plans.push({
            id: doc.id,
            ...planData
          });
        });
      };
      
      accumulatePlans(plansSnap);
      
      if (plans.length === 0 && isAdmin && authOwnerId) {
        try {
          const legacySnap = await getDocs(plansRef);
          accumulatePlans(legacySnap);
        } catch (legacyError) {
          logger.warn('⚠️ Legacy planlar alınamadı:', legacyError);
        }
      }
      
      if (plans.length > 0) {
        plans.sort((a, b) => {
          let dateA, dateB;
          
          if (a.updatedAt?.toMillis) {
            dateA = a.updatedAt.toMillis();
          } else if (a.createdAt?.toMillis) {
            dateA = a.createdAt.toMillis();
          } else if (a.date) {
            dateA = new Date(a.date).getTime();
          } else {
            dateA = 0;
          }
          
          if (b.updatedAt?.toMillis) {
            dateB = b.updatedAt.toMillis();
          } else if (b.createdAt?.toMillis) {
            dateB = b.createdAt.toMillis();
          } else if (b.date) {
            dateB = new Date(b.date).getTime();
          } else {
            dateB = 0;
          }
          
          return dateB - dateA;
        });
        return plans[0];
      }
      
      return null;
    } catch (error) {
      logger.error('❌ Firestore: En son plan yükleme hatası:', error);
      return null;
    }
  }

  /**
   * Tüm planları listele
   */
  async getAllPlans() {
    const disabledResult = this._handleDisabledFirebase('getAllPlans', []);
    if (disabledResult) return disabledResult;
    
    try {
      await waitForAuth();
      const authOwnerId = getCurrentUserId();
      const userRole = await getUserRole();
      const isAdmin = userRole === 'admin';
      logger.debug('🔍 Firestore: Planlar listeleniyor...');
      
      const plansRef = collection(this.db, 'plans');
      let plansSnap;
      if (isAdmin && authOwnerId) {
        plansSnap = await getDocs(query(plansRef, where('ownerId', '==', authOwnerId)));
        if (plansSnap.empty) {
          plansSnap = await getDocs(plansRef);
        }
      } else {
        plansSnap = await getDocs(plansRef);
      }
      
      const plans = [];
      const addPlanIfAllowed = (doc) => {
        const planData = doc.data();
        const planName = String(planData?.name || '').trim();
        const lowerName = planName.toLowerCase();
        if (planName === 'Test Plan' || 
            planName === 'Valid Plan' ||
            lowerName.includes('test plan') ||
            lowerName.includes('valid plan')) {
          logger.debug(`⚠️ Test/Valid Plan filtrelendi: ${doc.id} - ${planName}`);
          return;
        }
        plans.push({
          id: doc.id,
          ...planData
        });
      };
      
      plansSnap.forEach(addPlanIfAllowed);
      
      if (plans.length === 0 && isAdmin && authOwnerId) {
        try {
          const legacySnap = await getDocs(plansRef);
          legacySnap.forEach(addPlanIfAllowed);
        } catch (legacyError) {
          logger.warn('⚠️ Legacy planlar alınamadı:', legacyError);
        }
      }
      
      if (plans.length > 0) {
        plans.sort((a, b) => {
          let dateA, dateB;
          
          if (a.updatedAt?.toMillis) {
            dateA = a.updatedAt.toMillis();
          } else if (a.createdAt?.toMillis) {
            dateA = a.createdAt.toMillis();
          } else if (a.date) {
            dateA = new Date(a.date).getTime();
          } else {
            dateA = 0;
          }
          
          if (b.updatedAt?.toMillis) {
            dateB = b.updatedAt.toMillis();
          } else if (b.createdAt?.toMillis) {
            dateB = b.createdAt.toMillis();
          } else if (b.date) {
            dateB = new Date(b.date).getTime();
          } else {
            dateB = 0;
          }
          
          return dateB - dateA;
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
   * Plan güncelleme
   */
  async updatePlan(planId, planData) {
    const disabledResult = this._handleDisabledFirebase('updatePlan', null);
    if (disabledResult) {
      throw new Error('Firestore devre dışı. Plan güncellenemez.');
    }
    
    try {
      await waitForAuth();
      const ownerId = getCurrentUserId();
      if (!ownerId) {
        throw new Error('Kimlik doğrulaması olmadan plan güncellenemez.');
      }
      logger.debug('🔄 Firestore: Plan güncelleniyor:', planId);
      
      const planRef = doc(this.db, 'plans', planId);
      
      // Planın var olup olmadığını kontrol et
      const planSnap = await getDoc(planRef);
      if (!planSnap.exists()) {
        throw new Error(`Plan bulunamadı: ${planId}`);
      }
      const existingPlan = planSnap.data();
      if (existingPlan.ownerId && existingPlan.ownerId !== ownerId) {
        throw new Error('Bu planı güncelleme yetkiniz yok.');
      }
      
      // Veriyi sanitize et
      const sanitizedPlanData = sanitizeForFirestore({
        ...planData,
        ownerId
      });
      
      const sanitizedAyarlar =
        sanitizeSettingsMap(sanitizedPlanData?.data?.ayarlar || sanitizedPlanData?.ayarlar || {});

      const planMeta = {
        ...sanitizePlanMeta(sanitizedPlanData),
        totalStudents: sanitizedPlanData?.totalStudents || null,
        salonCount: sanitizedPlanData?.salonCount || null,
        ayarlar: sanitizedAyarlar,
        ownerId,
        updatedAt: serverTimestamp()
      };
      
      // Veri boyutunu kontrol et
      const sizeCheck = checkDataSize(planMeta);
      if (!sizeCheck.isValid) {
        throw new Error(`Plan meta verisi çok büyük: ${sizeCheck.sizeInMB.toFixed(2)}MB`);
      }
      
      // Plan meta bilgilerini güncelle
      await updateDoc(planRef, planMeta);
      
      // Salonları güncelle (önce eski salonları sil, sonra yenilerini ekle)
      if (planData?.data?.tumSalonlar) {
        // Eski salonları sil
        const salonsRef = collection(this.db, 'plans', planId, 'salons');
        const salonsSnap = await getDocs(salonsRef);
        const batch = writeBatch(this.db);
        
        salonsSnap.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        
        // Yeni salonları ekle
        await this.savePlanSalons(planId, planData.data.tumSalonlar, ownerId);
      }
      
      // Yerleşmeyen öğrencileri güncelle
      if (planData?.data?.yerlesilemeyenOgrenciler) {
        // Eski unplaced öğrencileri sil
        const unplacedRef = collection(this.db, 'plans', planId, 'unplaced');
        const unplacedSnap = await getDocs(unplacedRef);
        const batch = writeBatch(this.db);
        
        unplacedSnap.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        
        // Yeni unplaced öğrencileri ekle
        await this.saveUnplacedStudents(planId, planData.data.yerlesilemeyenOgrenciler, ownerId);
      }
      
      console.log('✅ Firestore: Plan güncellendi:', planId);
      logger.info('✅ Firestore: Plan güncellendi:', planId);
      return planId;
    } catch (error) {
      logger.error('❌ Firestore: Plan güncelleme hatası:', error);
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
      await waitForAuth();
      const ownerId = getCurrentUserId();
      if (!ownerId) {
        throw new Error('Kimlik doğrulaması olmadan plan silinemez.');
      }
      logger.debug('🗑️ Firestore: Plan siliniyor:', planId);
      const planRef = doc(this.db, 'plans', planId);
      const planSnap = await getDoc(planRef);
      if (!planSnap.exists()) {
        return null;
      }
      const planMeta = planSnap.data();
      if (planMeta.ownerId && planMeta.ownerId !== ownerId) {
        throw new Error('Bu planı silme yetkiniz yok.');
      }
      
      // Alt koleksiyonları sil
      const batch = writeBatch(this.db);
      
      // Salonları sil
      const salonsRef = collection(this.db, 'plans', planId, 'salons');
      const salonsSnap = await getDocs(salonsRef);
      salonsSnap.forEach(doc => {
        const salonData = doc.data();
        if (!salonData.ownerId || salonData.ownerId === ownerId) {
          batch.delete(doc.ref);
        }
      });
      
      // Yerleşmeyen öğrencileri sil
      const unplacedRef = collection(this.db, 'plans', planId, 'unplaced');
      const unplacedSnap = await getDocs(unplacedRef);
      unplacedSnap.forEach(doc => {
        const unplacedData = doc.data();
        if (!unplacedData.ownerId || unplacedData.ownerId === ownerId) {
          batch.delete(doc.ref);
        }
      });
      
      // Meta planı sil
      batch.delete(planRef);
      
      await batch.commit();
      logger.debug('✅ Firestore: Plan silindi:', planId);
      return planId;
    } catch (error) {
      logger.error('❌ Firestore: Plan silme hatası:', error);
      throw error;
    }
  }

  /**
   * Öğrencileri kaydet
   * Önce mevcut öğrencileri alır, yeni listede olmayanları siler, sonra yeni listeyi kaydeder
   */
  async saveStudents(students) {
    const disabledResult = this._handleDisabledFirebase('saveStudents', null);
    if (disabledResult) return disabledResult;
    
    try {
      await waitForAuth();
      const ownerId = getCurrentUserId();
      if (!ownerId) {
        throw new Error('Kimlik doğrulaması olmadan öğrenci kaydedilemez.');
      }
      logger.debug('💾 Firestore: Öğrenciler kaydediliyor...');
      
      // Önce mevcut tüm öğrencileri al
      const studentsRef = query(collection(this.db, 'students'), where('ownerId', '==', ownerId));
      const existingStudentsSnap = await getDocs(studentsRef);
      
      // Yeni listedeki öğrenci ID'lerini bir Set'e al (hızlı lookup için)
      const newStudentIds = new Set(students.map(s => s.id?.toString()));
      
      // Duplicate kontrolü: aynı numara veya ID'ye sahip öğrencileri filtrele
      const seenIds = new Set();
      const seenNumbers = new Map(); // numara -> öğrenci ID mapping
      const uniqueStudents = students.filter(student => {
        const studentId = student.id?.toString();
        const studentNumber = student.numara?.toString();
        
        // ID duplicate kontrolü
        if (studentId && seenIds.has(studentId)) {
          logger.warn(`⚠️ Firestore: Duplicate ID tespit edildi ve filtrelendi: ${studentId} - ${student.ad} ${student.soyad}`);
          return false;
        }
        if (studentId) seenIds.add(studentId);
        
        // Numara duplicate kontrolü (aynı numara farklı ID'lerle kaydedilmiş olabilir)
        if (studentNumber) {
          if (seenNumbers.has(studentNumber)) {
            const existingId = seenNumbers.get(studentNumber);
            logger.warn(`⚠️ Firestore: Duplicate numara tespit edildi: ${studentNumber} (mevcut ID: ${existingId}, yeni ID: ${studentId}) - ${student.ad} ${student.soyad}`);
            // Aynı numaraya sahip öğrenciyi filtrele (ilkini tut)
            return false;
          }
          seenNumbers.set(studentNumber, studentId);
        }
        
        return true;
      });
      
      logger.debug(`📊 Firestore: ${students.length} öğrenci, ${uniqueStudents.length} unique öğrenci (${students.length - uniqueStudents.length} duplicate filtrelendi)`);
      
      // Yeni listede olmayan eski öğrencileri sil
      const studentsToDelete = [];
      existingStudentsSnap.forEach(doc => {
        const studentId = doc.id;
        if (!newStudentIds.has(studentId)) {
          studentsToDelete.push(doc.ref);
        }
      });
      
      // Silme işlemini batch ile yap
      if (studentsToDelete.length > 0) {
        logger.debug(`🗑️ Firestore: ${studentsToDelete.length} eski öğrenci silinecek`);
        const deleteChunkSize = 500;
        
        for (let i = 0; i < studentsToDelete.length; i += deleteChunkSize) {
          const chunk = studentsToDelete.slice(i, i + deleteChunkSize);
          const deleteBatch = writeBatch(this.db);
          
          chunk.forEach(studentRef => {
            deleteBatch.delete(studentRef);
          });
          
          await deleteBatch.commit();
          logger.debug(`✅ Firestore: Eski öğrenci chunk silindi (${i + 1}-${i + chunk.length})`);
        }
      }
      
      // Yeni öğrencileri kaydet/güncelle
      const chunkSize = 500;
      
      for (let i = 0; i < uniqueStudents.length; i += chunkSize) {
        const chunk = uniqueStudents.slice(i, i + chunkSize);
        const saveBatch = writeBatch(this.db);
        
        chunk.forEach(student => {
          const sanitizedStudent = sanitizeStudentRecord(student);
          const studentRef = doc(this.db, 'students', sanitizedStudent.id.toString());
          // Pinned bilgilerini de kaydet (pinned, pinnedSalonId, pinnedMasaId)
          saveBatch.set(studentRef, {
            ...sanitizedStudent,
            pinned: sanitizedStudent.pinned || false,
            pinnedSalonId: sanitizedStudent.pinnedSalonId || null,
            pinnedMasaId: sanitizedStudent.pinnedMasaId || null,
            ownerId,
            updatedAt: serverTimestamp()
          });
        });
        
        // Pinned öğrencileri log'la
        const pinnedInChunk = chunk.filter(s => s.pinned === true);
        if (pinnedInChunk.length > 0) {
          logger.debug(`📌 Firestore: ${pinnedInChunk.length} sabitlenen öğrenci kaydediliyor:`, 
            pinnedInChunk.map(s => ({ id: s.id, ad: s.ad || s.name, pinnedSalonId: s.pinnedSalonId })));
        }
        
        await saveBatch.commit();
        logger.debug(`✅ Firestore: Öğrenci chunk kaydedildi (${i + 1}-${i + chunk.length})`);
      }
      
      logger.info(`✅ Firestore: ${uniqueStudents.length} öğrenci kaydedildi, ${studentsToDelete.length} eski öğrenci silindi`);
    } catch (error) {
      logger.error('❌ Firestore: Öğrenci kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Tüm öğrencileri getir
   */
  async getAllStudents() {
    // DEBUG: Öğrenci yükleme başlangıcı
    logger.info('📥 Firestore getAllStudents çağrıldı:', {
      isDisabled: this.isDisabled,
      dbIsMock: this.db?.mock
    });
    
    const disabledResult = this._handleDisabledFirebase('getAllStudents', []);
    if (disabledResult) {
      logger.warn('⚠️ Firestore devre dışı, öğrenciler yüklenmeyecek!');
      return disabledResult;
    }
    
    let ownerId = null;
    let isAdmin = false;
    
    try {
      await waitForAuth();
      ownerId = getCurrentUserId();
      const userRole = await getUserRole();
      isAdmin = userRole === 'admin';
      if (!ownerId && !isAdmin) {
        console.info('ℹ️ getAllStudents: Public görüntüleme modunda, bütün öğrenciler okunacak');
      }
      logger.info('📥 Firestore: Öğrenciler yükleniyor (SERVER\'dan - cache bypass)...');
      
      const studentsCollectionRef = collection(this.db, 'students');
      const studentsQuery = (isAdmin && ownerId)
        ? query(studentsCollectionRef, where('ownerId', '==', ownerId))
        : studentsCollectionRef;
      const studentsSnap = await getDocsFromServer(studentsQuery);
      
      const students = [];
      studentsSnap.forEach(doc => {
        const studentData = doc.data();
        if (isAdmin && studentData.ownerId && studentData.ownerId !== ownerId) {
          return;
        }
        students.push({ id: doc.id, ...studentData });
      });
      
      // Pinned öğrencileri kontrol et ve log'la
      const pinnedStudents = students.filter(s => s.pinned === true);
      if (pinnedStudents.length > 0) {
        console.log(`📌 Firestore: ${pinnedStudents.length} sabitlenen öğrenci yüklendi:`, 
          pinnedStudents.map(s => ({
            id: s.id,
            ad: s.ad || s.name,
            soyad: s.soyad || s.surname,
            numara: s.numara || s.number,
            pinnedSalonId: s.pinnedSalonId,
            pinnedMasaId: s.pinnedMasaId
          })));
      }
      
      console.log(`📊 Firestore: ${students.length} öğrenci yüklendi (duplicate kontrolü öncesi)`);
      
      // Geçersiz öğrencileri filtrele (ad/soyad/numara eksik olanlar)
      const invalidStudents = students.filter(s => {
        const hasAd = s.ad || s.name;
        const hasSoyad = s.soyad || s.surname;
        const hasNumara = s.numara || s.number;
        return !hasAd && !hasSoyad && !hasNumara;
      });
      
      if (invalidStudents.length > 0) {
        console.warn(`⚠️ Geçersiz öğrenci kayıtları tespit edildi (${invalidStudents.length} adet):`, 
          invalidStudents.map(s => ({ id: s.id, ad: s.ad, soyad: s.soyad, numara: s.numara || s.number })));
        
        // Geçersiz öğrencileri Firestore'dan sil
        const invalidIds = invalidStudents.map(s => s.id.toString());
        const validStudents = students.filter(s => !invalidIds.includes(s.id.toString()));
        
        // Geçersiz kayıtları Firestore'dan sil
        if (invalidStudents.length > 0) {
          console.log(`🗑️ Geçersiz öğrenci kayıtları Firestore'dan siliniyor...`);
          const deleteBatch = writeBatch(this.db);
          invalidStudents.forEach(student => {
            const studentRef = doc(this.db, 'students', student.id.toString());
            deleteBatch.delete(studentRef);
          });
          try {
            await deleteBatch.commit();
            console.log(`✅ ${invalidStudents.length} geçersiz öğrenci kaydı Firestore'dan silindi`);
          } catch (deleteError) {
            console.error('❌ Geçersiz öğrenci kayıtları silinirken hata:', deleteError);
          }
        }
        
        // Geçerli öğrencileri kullan
        students.length = 0;
        students.push(...validStudents);
        console.log(`📊 Geçerli öğrenci sayısı: ${students.length} (${invalidStudents.length} geçersiz kayıt filtrelendi)`);
      }
      
      // 555 numaralı öğrenciyi özel olarak kontrol et ve tüm öğrencileri numara ve ad/soyad'a göre kontrol et
      const student555 = students.filter(s => {
        const numara = s.numara?.toString() || s.number?.toString() || 
                      (typeof s.numara === 'number' ? s.numara.toString() : null) ||
                      (typeof s.number === 'number' ? s.number.toString() : null);
        const ad = (s.ad || s.name || '').toString().toLowerCase().trim();
        const soyad = (s.soyad || s.surname || '').toString().toLowerCase().trim();
        return numara === '555' || (numara && numara.trim() === '555') || 
               (ad.includes('can') && soyad.includes('güzel'));
      });
      
      console.log(`🔍 555 numaralı veya Can Güzel öğrenci kontrolü: ${student555.length} kayıt bulundu`);
      if (student555.length > 0) {
        console.log(`📋 555/Can Güzel öğrenci detayları:`, student555.map(s => ({
          id: s.id,
          numara: s.numara || s.number,
          ad: s.ad || s.name,
          soyad: s.soyad || s.surname,
          tümVeri: s
        })));
      }
      
      // Tüm öğrencileri numara ve ad/soyad kombinasyonuna göre kontrol et
      const studentsByName = new Map();
      students.forEach(s => {
        const numara = (s.numara?.toString() || s.number?.toString() || '').trim();
        const ad = (s.ad || s.name || '').toString().toLowerCase().trim();
        const soyad = (s.soyad || s.surname || '').toString().toLowerCase().trim();
        const key = `${numara}_${ad}_${soyad}`;
        
        if (!studentsByName.has(key)) {
          studentsByName.set(key, []);
        }
        studentsByName.get(key).push(s);
      });
      
      // Aynı numara ve ad/soyad kombinasyonuna sahip duplicate'leri bul
      const duplicateByName = [];
      studentsByName.forEach((studentsList, key) => {
        if (studentsList.length > 1) {
          duplicateByName.push({ key, students: studentsList });
        }
      });
      
      if (duplicateByName.length > 0) {
        console.warn(`⚠️ Aynı numara ve ad/soyad kombinasyonuna sahip ${duplicateByName.length} duplicate bulundu:`, 
          duplicateByName.map(d => ({
            key: d.key,
            count: d.students.length,
            students: d.students.map(s => ({ id: s.id, numara: s.numara || s.number, ad: s.ad || s.name, soyad: s.soyad || s.surname }))
          })));
      }
      
      // Duplicate kontrolü: aynı ID veya numaraya sahip öğrencileri filtrele
      const uniqueStudents = this._filterDuplicateStudents(students);
      
      if (students.length !== uniqueStudents.length) {
        const duplicateCount = students.length - uniqueStudents.length;
        console.warn(`⚠️ Firestore: ${duplicateCount} duplicate öğrenci filtrelendi, ${uniqueStudents.length} unique öğrenci döndürüldü`);
        logger.warn(`⚠️ Firestore: ${duplicateCount} duplicate öğrenci filtrelendi, ${uniqueStudents.length} unique öğrenci döndürüldü`);
      } else {
        console.log(`✅ Firestore: Duplicate öğrenci bulunamadı, ${uniqueStudents.length} öğrenci`);
      }
      
      console.log(`✅ Firestore: Öğrenciler yüklendi (SERVER): ${uniqueStudents.length} öğrenci`);
      logger.info('✅ Firestore: Öğrenciler yüklendi (SERVER):', uniqueStudents.length, 'öğrenci');
      if (uniqueStudents.length > 0) {
        logger.info('📋 İlk öğrenci:', uniqueStudents[0]);
      }
      return uniqueStudents;
    } catch (error) {
      logger.error('❌ Firestore: Öğrenci yükleme hatası:', error);
      // Hata durumunda cache'den yükle (fallback)
      try {
        logger.warn('⚠️ Server yükleme başarısız, cache\'den yükleniyor...');
        const studentsCollectionRef = collection(this.db, 'students');
        const studentsQuery = (isAdmin && ownerId)
          ? query(studentsCollectionRef, where('ownerId', '==', ownerId))
          : studentsCollectionRef;
        const studentsSnap = await getDocs(studentsQuery);
        const students = [];
        studentsSnap.forEach(doc => {
          const studentData = doc.data();
          if (isAdmin && studentData.ownerId && studentData.ownerId !== ownerId) {
            return;
          }
          students.push({ id: doc.id, ...studentData });
        });
        
        const uniqueStudents = this._filterDuplicateStudents(students);
        if (students.length !== uniqueStudents.length) {
          logger.warn(`⚠️ Cache: ${students.length - uniqueStudents.length} duplicate öğrenci filtrelendi`);
        }
        
        logger.warn('⚠️ Cache\'den yüklendi:', uniqueStudents.length, 'öğrenci');
        return uniqueStudents;
      } catch (cacheError) {
        logger.error('❌ Cache yükleme de başarısız:', cacheError);
        return [];
      }
    }
  }
  
  /**
   * Duplicate öğrencileri filtrele (helper fonksiyon)
   */
  _filterDuplicateStudents(students) {
    const duplicates = [];
    const studentsWithoutNumber = [];
    
    // Önce tüm öğrencileri numara ve ID'ye göre grupla
    const studentsByNumber = new Map();
    const studentsById = new Map();
    
    students.forEach(student => {
      const studentId = student.id?.toString();
      // Numara alanını farklı formatlardan oku (numara, number, numaraStr, vs.)
      let studentNumber = student.numara?.toString() || 
                         student.number?.toString() || 
                         (typeof student.numara === 'number' ? student.numara.toString() : null) ||
                         (typeof student.number === 'number' ? student.number.toString() : null);
      
      // Trim ve normalize et
      if (studentNumber) {
        studentNumber = studentNumber.trim();
      }
      
      // Numara ile grupla
      if (studentNumber && studentNumber.length > 0) {
        if (!studentsByNumber.has(studentNumber)) {
          studentsByNumber.set(studentNumber, []);
        }
        studentsByNumber.get(studentNumber).push(student);
      } else {
        studentsWithoutNumber.push(student);
      }
      
      // ID ile grupla
      if (studentId) {
        if (!studentsById.has(studentId)) {
          studentsById.set(studentId, []);
        }
        studentsById.get(studentId).push(student);
      }
    });
    
    // Numara bazlı duplicate'leri bul
    studentsByNumber.forEach((studentsWithSameNumber, numara) => {
      if (studentsWithSameNumber.length > 1) {
        console.warn(`⚠️ Duplicate numara tespit edildi: ${numara} - ${studentsWithSameNumber.length} kayıt:`, 
          studentsWithSameNumber.map(s => ({ id: s.id, ad: s.ad, soyad: s.soyad })));
        
        // İlkini tut, diğerlerini duplicate olarak işaretle
        for (let i = 1; i < studentsWithSameNumber.length; i++) {
          duplicates.push({ 
            type: 'numara', 
            numara: numara, 
            student: studentsWithSameNumber[i],
            kept: studentsWithSameNumber[0]
          });
        }
      }
    });
    
    // ID bazlı duplicate'leri bul
    studentsById.forEach((studentsWithSameId, id) => {
      if (studentsWithSameId.length > 1) {
        console.warn(`⚠️ Duplicate ID tespit edildi: ${id} - ${studentsWithSameId.length} kayıt`);
        for (let i = 1; i < studentsWithSameId.length; i++) {
          duplicates.push({ 
            type: 'ID', 
            id: id, 
            student: studentsWithSameId[i],
            kept: studentsWithSameId[0]
          });
        }
      }
    });
    
    // Duplicate'leri çıkar
    const duplicateIds = new Set(duplicates.map(d => d.student.id?.toString()).filter(Boolean));
    const duplicateNumbers = new Set(duplicates.map(d => d.numara).filter(Boolean));
    
    const uniqueStudents = students.filter(student => {
      const studentId = student.id?.toString();
      // Numara alanını farklı formatlardan oku
      let studentNumber = student.numara?.toString() || 
                         student.number?.toString() || 
                         (typeof student.numara === 'number' ? student.numara.toString() : null) ||
                         (typeof student.number === 'number' ? student.number.toString() : null);
      
      // Trim ve normalize et
      if (studentNumber) {
        studentNumber = studentNumber.trim();
      }
      
      // Duplicate ID kontrolü
      if (studentId && duplicateIds.has(studentId)) {
        return false;
      }
      
      // Duplicate numara kontrolü (ilk kayıt tutulur)
      if (studentNumber && duplicateNumbers.has(studentNumber)) {
        // Bu numaranın ilk kaydı mı kontrol et
        const allWithThisNumber = studentsByNumber.get(studentNumber) || [];
        const studentIndex = allWithThisNumber.findIndex(s => s.id === student.id);
        if (studentIndex !== 0 && studentIndex !== -1) {
          return false; // İlk kayıt değil, duplicate
        }
      }
      
      return true;
    });
    
    if (duplicates.length > 0) {
      console.log(`🔍 Toplam ${duplicates.length} duplicate tespit edildi ve filtrelendi:`, duplicates);
      console.log(`📊 Sonuç: ${students.length} öğrenci → ${uniqueStudents.length} unique öğrenci (${duplicates.length} duplicate filtrelendi)`);
    }
    
    if (studentsWithoutNumber.length > 0) {
      console.warn(`⚠️ ${studentsWithoutNumber.length} öğrenci numarası olmadan kaydedilmiş:`, 
        studentsWithoutNumber.map(s => ({ id: s.id, ad: s.ad, soyad: s.soyad })));
    }
    
    return uniqueStudents;
  }

  /**
   * Ayarları kaydet
   */
  async saveSettings(settings) {
    const disabledResult = this._handleDisabledFirebase('saveSettings', null);
    if (disabledResult) return disabledResult;
    
    try {
      await waitForAuth();
      const ownerId = getCurrentUserId();
      if (!ownerId) {
        throw new Error('Kimlik doğrulaması olmadan ayarlar kaydedilemez.');
      }
      logger.debug('💾 Firestore: Ayarlar kaydediliyor...');
      
      const batch = writeBatch(this.db);
      
      Object.entries(settings).forEach(([key, value]) => {
        const docId = `${ownerId}_${key}`;
        const sanitizedValue = typeof value === 'string'
          ? sanitizeText(value)
          : Array.isArray(value)
            ? sanitizeStringArray(value)
            : value && typeof value === 'object'
              ? sanitizeSettingsMap(value)
              : value;
        const settingRef = doc(this.db, 'settings', docId);
        batch.set(settingRef, {
          ownerId,
          key,
          value: sanitizedValue,
          type: typeof sanitizedValue,
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
    
    let ownerId = null;
    let isAdmin = false;
    
    try {
      await waitForAuth();
      ownerId = getCurrentUserId();
      const userRole = await getUserRole();
      isAdmin = userRole === 'admin';
      if (!ownerId && !isAdmin) {
        logger.info('ℹ️ getSettings: Public görüntüleme modunda ayarlar okunuyor');
      }
      logger.debug('📥 Firestore: Ayarlar yükleniyor (SERVER\'dan - cache bypass)...');
      
      const settingsCollectionRef = collection(this.db, 'settings');
      const settingsQuery = (isAdmin && ownerId)
        ? query(settingsCollectionRef, where('ownerId', '==', ownerId))
        : settingsCollectionRef;
      const settingsSnap = await getDocsFromServer(settingsQuery);
      
      const settings = {};
      settingsSnap.forEach(doc => {
        const data = doc.data();
        if (isAdmin && data.ownerId && data.ownerId !== ownerId) {
          return;
        }
        const key = data.key || doc.id.replace(`${ownerId || ''}_`, '');
        settings[key] = data.value;
      });
      
      logger.debug('✅ Firestore: Ayarlar yüklendi (SERVER):', Object.keys(settings).length);
      return settings;
    } catch (error) {
      logger.error('❌ Firestore: Ayar yükleme hatası:', error);
      // Hata durumunda cache'den yükle (fallback)
      try {
        logger.warn('⚠️ Server yükleme başarısız, cache\'den yükleniyor...');
        const settingsCollectionRef = collection(this.db, 'settings');
        const settingsQuery = (isAdmin && ownerId)
          ? query(settingsCollectionRef, where('ownerId', '==', ownerId))
          : settingsCollectionRef;
        const settingsSnap = await getDocs(settingsQuery);
        const settings = {};
        settingsSnap.forEach(doc => {
          const data = doc.data();
          if (isAdmin && data.ownerId && data.ownerId !== ownerId) {
            return;
          }
          const key = data.key || doc.id.replace(`${ownerId || ''}_`, '');
          settings[key] = data.value;
        });
        logger.warn('⚠️ Cache\'den yüklendi:', Object.keys(settings).length, 'ayar');
        return settings;
      } catch (cacheError) {
        logger.error('❌ Cache yükleme de başarısız:', cacheError);
        return {};
      }
    }
  }

  /**
   * Salonları kaydet
   */
  async saveSalons(salons) {
    const disabledResult = this._handleDisabledFirebase('saveSalons', null);
    if (disabledResult) return disabledResult;
    
    try {
      await waitForAuth();
      const ownerId = getCurrentUserId();
      if (!ownerId) {
        throw new Error('Kimlik doğrulaması olmadan salon kaydedilemez.');
      }
      logger.debug('💾 Firestore: Salonlar kaydediliyor...');
      
      const chunkSize = 500;
      const existingSnap = await getDocs(query(collection(this.db, 'salons'), where('ownerId', '==', ownerId)));
      const existingIds = new Set();
      existingSnap.forEach(docSnap => existingIds.add(docSnap.id));
      
      const incomingIds = new Set();
      const batches = [];
      
      for (let i = 0; i < salons.length; i += chunkSize) {
        const chunk = salons.slice(i, i + chunkSize);
        const batch = writeBatch(this.db);
        
        chunk.forEach(salon => {
          const sanitizedSalon = sanitizeSalonRecord(salon);
          const salonId = sanitizedSalon.id != null ? sanitizedSalon.id : sanitizedSalon.salonId;
          if (!salonId) {
            logger.warn('⚠️ Firestore: ID\'si olmayan salon atlandı:', sanitizedSalon);
            return;
          }
          const idString = String(salonId);
          incomingIds.add(idString);
          const salonRef = doc(this.db, 'salons', idString);
          batch.set(salonRef, {
            ...sanitizedSalon,
            ownerId,
            updatedAt: serverTimestamp()
          }, { merge: true });
        });
        
        batches.push(batch.commit());
      }
      
      // Silinmesi gereken eski salonlar
      const idsToDelete = [];
      existingIds.forEach(id => {
        if (!incomingIds.has(id)) {
          idsToDelete.push(id);
        }
      });
      
      // Silmeleri batch ile yap
      for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        const batch = writeBatch(this.db);
        chunk.forEach(id => {
          const salonRef = doc(this.db, 'salons', id);
          batch.delete(salonRef);
        });
        batches.push(batch.commit());
      }
      
      await Promise.all(batches);
      logger.debug(`✅ Firestore: Salonlar senkronize edildi. Yazılan: ${incomingIds.size}, silinen: ${idsToDelete.length}`);
    } catch (error) {
      logger.error('❌ Firestore: Salon kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Tüm salonları getir
   */
  async getAllSalons() {
    // DEBUG: Salon yükleme başlangıcı
    logger.info('📥 Firestore getAllSalons çağrıldı:', {
      isDisabled: this.isDisabled,
      dbIsMock: this.db?.mock
    });
    
    const disabledResult = this._handleDisabledFirebase('getAllSalons', []);
    if (disabledResult) {
      logger.warn('⚠️ Firestore devre dışı, salonlar yüklenmeyecek!');
      return disabledResult;
    }
    
    let ownerId = null;
    let isAdmin = false;
    
    try {
      await waitForAuth();
      ownerId = getCurrentUserId();
      const userRole = await getUserRole();
      isAdmin = userRole === 'admin';
      if (!ownerId && !isAdmin) {
        logger.info('ℹ️ getAllSalons: Public görüntüleme modunda salonlar okunuyor');
      }
      logger.info('📥 Firestore: Salonlar yükleniyor (SERVER\'dan - cache bypass)...');
      
      const salonsCollectionRef = collection(this.db, 'salons');
      const salonsQuery = (isAdmin && ownerId)
        ? query(salonsCollectionRef, where('ownerId', '==', ownerId))
        : salonsCollectionRef;
      const salonsSnap = await getDocsFromServer(salonsQuery);
      
      logger.info('📊 Firestore salonsSnap.size:', salonsSnap.size);
      
      const salons = [];
      salonsSnap.forEach(doc => {
        const salonData = doc.data();
        if (isAdmin && salonData.ownerId && salonData.ownerId !== ownerId) {
          return;
        }
        salons.push({ id: doc.id, ...salonData });
      });
      
      const uniqueSalons = [];
      const seenSalons = new Map();
      const getScore = (salon) => {
        if (!salon) return 0;
        const masalar = Array.isArray(salon.masalar) ? salon.masalar.length : 0;
        const ogrenciler = Array.isArray(salon.ogrenciler) ? salon.ogrenciler.length : 0;
        const kapasite = Number.isFinite(salon.kapasite) ? salon.kapasite : 0;
        return (masalar * 10) + ogrenciler + kapasite;
      };
      salons.forEach((salon) => {
        const key = salon.id || salon.salonId || salon.salonAdi || salon.ad;
        const existing = seenSalons.get(key);
        if (!existing || getScore(salon) > getScore(existing)) {
          seenSalons.set(key, salon);
        }
      });
      seenSalons.forEach((value) => uniqueSalons.push(value));
      
      uniqueSalons.sort((a, b) => {
        const aId = parseInt(a.id || a.salonId || 0, 10);
        const bId = parseInt(b.id || b.salonId || 0, 10);
        return aId - bId;
      });
      
      logger.info('✅ Firestore: Salonlar yüklendi (SERVER):', uniqueSalons.length, 'salon');
      if (uniqueSalons.length > 0) {
        logger.info('📋 İlk salon:', uniqueSalons[0]);
      }
      return uniqueSalons;
    } catch (error) {
      logger.error('❌ Firestore: Salon yükleme hatası:', error);
      // Hata durumunda cache'den yükle (fallback)
      try {
        logger.warn('⚠️ Server yükleme başarısız, cache\'den yükleniyor...');
        const salonsCollectionRef = collection(this.db, 'salons');
        const salonsQuery = (isAdmin && ownerId)
          ? query(salonsCollectionRef, where('ownerId', '==', ownerId))
          : salonsCollectionRef;
        const salonsSnap = await getDocs(salonsQuery);
        const salons = [];
        salonsSnap.forEach(doc => {
          const salonData = doc.data();
          if (isAdmin && salonData.ownerId && salonData.ownerId !== ownerId) {
            return;
          }
          salons.push({ id: doc.id, ...salonData });
        });
        salons.sort((a, b) => {
          const aId = parseInt(a.id || a.salonId || 0, 10);
          const bId = parseInt(b.id || b.salonId || 0, 10);
          return aId - bId;
        });
        const seenSalons = new Map();
        const getScore = (salon) => {
          if (!salon) return 0;
          const masalar = Array.isArray(salon.masalar) ? salon.masalar.length : 0;
          const ogrenciler = Array.isArray(salon.ogrenciler) ? salon.ogrenciler.length : 0;
          const kapasite = Number.isFinite(salon.kapasite) ? salon.kapasite : 0;
          return (masalar * 10) + ogrenciler + kapasite;
        };
        salons.forEach((salon) => {
          const key = salon.id || salon.salonId || salon.salonAdi || salon.ad;
          const existing = seenSalons.get(key);
          if (!existing || getScore(salon) > getScore(existing)) {
            seenSalons.set(key, salon);
          }
        });
        const uniqueSalons = Array.from(seenSalons.values());
        logger.warn('⚠️ Cache\'den yüklendi:', uniqueSalons.length, 'salon');
        return uniqueSalons;
      } catch (cacheError) {
        logger.error('❌ Cache yükleme de başarısız:', cacheError);
        return [];
      }
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

