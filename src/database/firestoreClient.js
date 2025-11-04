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
      const sanitizedPlanData = sanitizeForFirestore(planData);
      
      // EK KORUMA: Çok az öğrenci/salon içeren planları engelle (sanitize edilmiş veriyle kontrol)
      const totalStudents = sanitizedPlanData?.totalStudents || 0;
      const salonCount = sanitizedPlanData?.salonCount || 0;
      
      // Minimal test plan kontrolü: 5'ten az öğrenci VE 2'den az salon = muhtemelen test planı
      if (totalStudents <= 5 && salonCount <= 2 && (totalStudents === 1 || salonCount === 1)) {
        logger.warn(`⚠️ Firestore: Minimal test plan kaydetme engellendi (${totalStudents} öğrenci, ${salonCount} salon):`, planName);
        return null; // Kaydetme, null döndür
      }
      
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
  async savePlanSalons(planId, salons) {
    try {
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
   * En son planı getir
   */
  async getLatestPlan() {
    const disabledResult = this._handleDisabledFirebase('getLatestPlan', null);
    if (disabledResult) return disabledResult;
    
    try {
      logger.debug('📥 Firestore: En son plan yükleniyor...');
      
      const plansRef = collection(this.db, 'plans');
      const q = query(plansRef);
      const plansSnap = await getDocs(q);
      
      const plans = [];
      plansSnap.forEach(doc => {
        const planData = doc.data();
        // Test Plan'ları filtrele
        const planName = String(planData?.name || '').trim();
        const lowerName = planName.toLowerCase();
        if (planName === 'Test Plan' || 
            planName === 'Valid Plan' ||
            lowerName.includes('test plan') ||
            lowerName.includes('valid plan')) {
          return; // Bu planı atla
        }
        
        plans.push({
          id: doc.id,
          ...planData
        });
      });
      
      // Client-side sıralama
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
          
          return dateB - dateA; // Yeni tarihler önce
        });
        
        // En son planı al
        const latestPlan = plans[0];
        
        // Plan detaylarını yükle (data alanı için loadPlan kullan)
        if (latestPlan && latestPlan.id) {
          const fullPlan = await this.loadPlan(latestPlan.id);
          logger.debug('✅ Firestore: En son plan yüklendi:', latestPlan.name);
          return fullPlan;
        }
      }
      
      logger.debug('⚠️ Firestore: Plan bulunamadı');
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
      logger.debug('🔍 Firestore: Planlar listeleniyor...');
      
      const plansRef = collection(this.db, 'plans');
      
      // orderBy kullanmadan tüm planları getir (index sorunlarını önlemek için)
      // Client-side sıralama yapacağız
      const q = query(plansRef);
      const plansSnap = await getDocs(q);
      
      const plans = [];
      plansSnap.forEach(doc => {
        const planData = doc.data();
        // Test Plan'ları ve Valid Plan'ları filtrele (gereksiz test planlarını Firestore'dan getirme)
        const planName = String(planData?.name || '').trim();
        const lowerName = planName.toLowerCase();
        if (planName === 'Test Plan' || 
            planName === 'Valid Plan' ||
            lowerName.includes('test plan') ||
            lowerName.includes('valid plan')) {
          logger.debug(`⚠️ Test/Valid Plan filtrelendi: ${doc.id} - ${planName}`);
          return; // Bu planı atla
        }
        
        plans.push({
          id: doc.id,
          ...planData
        });
      });
      
      // Client-side sıralama (Firestore index gerektirmeyen yöntem)
      if (plans.length > 0) {
        plans.sort((a, b) => {
          // Firestore Timestamp'lerini handle et
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
   * Plan güncelleme
   */
  async updatePlan(planId, planData) {
    const disabledResult = this._handleDisabledFirebase('updatePlan', null);
    if (disabledResult) {
      throw new Error('Firestore devre dışı. Plan güncellenemez.');
    }
    
    try {
      logger.debug('🔄 Firestore: Plan güncelleniyor:', planId);
      
      const planRef = doc(this.db, 'plans', planId);
      
      // Planın var olup olmadığını kontrol et
      const planSnap = await getDoc(planRef);
      if (!planSnap.exists()) {
        throw new Error(`Plan bulunamadı: ${planId}`);
      }
      
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
        await this.savePlanSalons(planId, planData.data.tumSalonlar);
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
        await this.saveUnplacedStudents(planId, planData.data.yerlesilemeyenOgrenciler);
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
   * Önce mevcut öğrencileri alır, yeni listede olmayanları siler, sonra yeni listeyi kaydeder
   */
  async saveStudents(students) {
    const disabledResult = this._handleDisabledFirebase('saveStudents', null);
    if (disabledResult) return disabledResult;
    
    try {
      logger.debug('💾 Firestore: Öğrenciler kaydediliyor...');
      
      // Önce mevcut tüm öğrencileri al
      const studentsRef = collection(this.db, 'students');
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
          const studentRef = doc(this.db, 'students', student.id.toString());
          saveBatch.set(studentRef, {
            ...student,
            updatedAt: serverTimestamp()
          });
        });
        
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
    
    try {
      logger.info('📥 Firestore: Öğrenciler yükleniyor (SERVER\'dan - cache bypass)...');
      
      const studentsRef = collection(this.db, 'students');
      // getDocsFromServer kullanarak cache'i bypass et ve server'dan güncel verileri çek
      const studentsSnap = await getDocsFromServer(studentsRef);
      
      const students = [];
      studentsSnap.forEach(doc => {
        students.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`📊 Firestore: ${students.length} öğrenci yüklendi (duplicate kontrolü öncesi)`);
      
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
        const studentsRef = collection(this.db, 'students');
        const studentsSnap = await getDocs(studentsRef);
        const students = [];
        studentsSnap.forEach(doc => {
          students.push({ id: doc.id, ...doc.data() });
        });
        
        // Cache'den yüklenen öğrencilerde de duplicate kontrolü yap
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
    const seenIds = new Set();
    const seenNumbers = new Map();
    const duplicates = [];
    
    const uniqueStudents = students.filter(student => {
      const studentId = student.id?.toString();
      const studentNumber = student.numara?.toString();
      
      // ID duplicate kontrolü
      if (studentId && seenIds.has(studentId)) {
        console.warn(`⚠️ Duplicate ID: ${studentId} - ${student.ad} ${student.soyad}`);
        duplicates.push({ type: 'ID', id: studentId, student });
        logger.warn(`⚠️ Firestore: Duplicate ID tespit edildi ve filtrelendi: ${studentId} - ${student.ad} ${student.soyad}`);
        return false;
      }
      if (studentId) seenIds.add(studentId);
      
      // Numara duplicate kontrolü
      if (studentNumber) {
        if (seenNumbers.has(studentNumber)) {
          const existingStudent = seenNumbers.get(studentNumber);
          console.warn(`⚠️ Duplicate numara: ${studentNumber} - Mevcut: ID=${existingStudent.id} (${existingStudent.ad} ${existingStudent.soyad}), Yeni: ID=${studentId} (${student.ad} ${student.soyad})`);
          duplicates.push({ type: 'numara', numara: studentNumber, existing: existingStudent, new: student });
          logger.warn(`⚠️ Firestore: Duplicate numara tespit edildi: ${studentNumber} (mevcut ID: ${existingStudent.id}, yeni ID: ${studentId}) - ${student.ad} ${student.soyad}`);
          return false;
        }
        seenNumbers.set(studentNumber, student);
      }
      
      return true;
    });
    
    if (duplicates.length > 0) {
      console.log(`🔍 Toplam ${duplicates.length} duplicate tespit edildi:`, duplicates);
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
      logger.debug('📥 Firestore: Ayarlar yükleniyor (SERVER\'dan - cache bypass)...');
      
      const settingsRef = collection(this.db, 'settings');
      // getDocsFromServer kullanarak cache'i bypass et ve server'dan güncel verileri çek
      const settingsSnap = await getDocsFromServer(settingsRef);
      
      const settings = {};
      settingsSnap.forEach(doc => {
        settings[doc.id] = doc.data().value;
      });
      
      logger.debug('✅ Firestore: Ayarlar yüklendi (SERVER):', Object.keys(settings).length);
      return settings;
    } catch (error) {
      logger.error('❌ Firestore: Ayar yükleme hatası:', error);
      // Hata durumunda cache'den yükle (fallback)
      try {
        logger.warn('⚠️ Server yükleme başarısız, cache\'den yükleniyor...');
        const settingsRef = collection(this.db, 'settings');
        const settingsSnap = await getDocs(settingsRef);
        const settings = {};
        settingsSnap.forEach(doc => {
          settings[doc.id] = doc.data().value;
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
    
    try {
      logger.info('📥 Firestore: Salonlar yükleniyor (SERVER\'dan - cache bypass)...');
      
      const salonsRef = collection(this.db, 'salons');
      // getDocsFromServer kullanarak cache'i bypass et ve server'dan güncel verileri çek
      const salonsSnap = await getDocsFromServer(salonsRef);
      
      logger.info('📊 Firestore salonsSnap.size:', salonsSnap.size);
      
      const salons = [];
      salonsSnap.forEach(doc => {
        salons.push({ id: doc.id, ...doc.data() });
      });
      
      // Salonları sayısal ID'ye göre sırala (string sıralama yerine)
      salons.sort((a, b) => {
        const aId = parseInt(a.id || a.salonId || 0, 10);
        const bId = parseInt(b.id || b.salonId || 0, 10);
        return aId - bId;
      });
      
      logger.info('✅ Firestore: Salonlar yüklendi (SERVER):', salons.length, 'salon');
      if (salons.length > 0) {
        logger.info('📋 İlk salon:', salons[0]);
      }
      return salons;
    } catch (error) {
      logger.error('❌ Firestore: Salon yükleme hatası:', error);
      // Hata durumunda cache'den yükle (fallback)
      try {
        logger.warn('⚠️ Server yükleme başarısız, cache\'den yükleniyor...');
        const salonsRef = collection(this.db, 'salons');
        const salonsSnap = await getDocs(salonsRef);
        const salons = [];
        salonsSnap.forEach(doc => {
          salons.push({ id: doc.id, ...doc.data() });
        });
        // Salonları sayısal ID'ye göre sırala
        salons.sort((a, b) => {
          const aId = parseInt(a.id || a.salonId || 0, 10);
          const bId = parseInt(b.id || b.salonId || 0, 10);
          return aId - bId;
        });
        logger.warn('⚠️ Cache\'den yüklendi:', salons.length, 'salon');
        return salons;
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

