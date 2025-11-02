/**
 * Plan Yönetimi - Temiz ve Basit Sistem
 * Kaydetme ve yükleme işlemlerini standardize eder
 */

// DatabaseAdapter'ı import et (Firestore birincil, IndexedDB fallback)
import db from '../database/index';

class PlanManager {
  constructor() {
    this.currentPlan = null;
  }

  /**
   * Plan kaydetme - Basit ve güvenilir
   */
  async savePlan(planName, planData) {
    try {
      console.log('💾 Plan kaydediliyor:', planName);
      
      // TÜM TEST PLANLARINI ENGelle (Firestore kota sorununu önlemek için)
      // Test dosyalarından gelen tüm plan isimlerini engelle
      const normalizedPlanName = String(planName || '').trim();
      const lowerPlanName = normalizedPlanName.toLowerCase();
      
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
        normalizedPlanName === testName || 
        normalizedPlanName.toLowerCase() === testName ||
        lowerPlanName === testName ||
        lowerPlanName.includes(testName) ||
        testPlanNames.some(tpn => lowerPlanName.startsWith(tpn + ' ') || lowerPlanName.endsWith(' ' + tpn))
      );
      
      if (isTestPlan) {
        console.warn('⚠️ Test Plan kaydetme engellendi (Firestore kota koruması):', normalizedPlanName);
        return null; // Kaydetme
      }
      
      // Plan verisini temizle ve standardize et
      const cleanPlanData = this.cleanPlanData(planData);
      
      // EK KORUMA: Çok az öğrenci/salon içeren planları engelle (test planları genellikle 1-5 öğrenci/salon içerir)
      const totalStudents = cleanPlanData.totalStudents || 0;
      const salonCount = cleanPlanData.tumSalonlar?.length || 0;
      
      // Boş plan kontrolü
      const isEmpty = totalStudents === 0 && salonCount === 0;
      if (isEmpty) {
        console.warn('⚠️ Boş plan kaydetme atlandı (0 öğrenci, 0 salon).');
        return null;
      }
      
      // Minimal test plan kontrolü: 5'ten az öğrenci VE 2'den az salon = muhtemelen test planı
      if (totalStudents <= 5 && salonCount <= 2 && (totalStudents === 1 || salonCount === 1)) {
        console.warn(`⚠️ Minimal test plan kaydetme engellendi (${totalStudents} öğrenci, ${salonCount} salon):`, normalizedPlanName);
        return null; // Kaydetme
      }
      
      // Sınav tarihi-saati bilgilerini metadata'ya ekle (plan listesinde göstermek için)
      const ayarlar = cleanPlanData.ayarlar || {};
      
      // DEBUG: Ayarlar kontrolü
      console.log('🔍 planManager.savePlan - Ayarlar:', {
        sinavTarihi: ayarlar.sinavTarihi,
        sinavSaati: ayarlar.sinavSaati,
        sinavDonemi: ayarlar.sinavDonemi,
        donem: ayarlar.donem,
        ayarlarKeys: Object.keys(ayarlar)
      });
      
      // Veritabanına kaydet
      const planPayload = {
        name: planName,
        date: new Date().toISOString(),
        totalStudents: cleanPlanData.totalStudents || 0,
        salonCount: cleanPlanData.salonCount || 0,
        // Sınav bilgilerini metadata'ya ekle (boş string'leri de kaydet)
        sinavTarihi: ayarlar.sinavTarihi !== undefined && ayarlar.sinavTarihi !== null && ayarlar.sinavTarihi !== '' ? ayarlar.sinavTarihi : null,
        sinavSaati: ayarlar.sinavSaati !== undefined && ayarlar.sinavSaati !== null && ayarlar.sinavSaati !== '' ? ayarlar.sinavSaati : null,
        sinavDonemi: ayarlar.sinavDonemi !== undefined && ayarlar.sinavDonemi !== null && ayarlar.sinavDonemi !== '' ? ayarlar.sinavDonemi : null,
        donem: ayarlar.donem !== undefined && ayarlar.donem !== null && ayarlar.donem !== '' ? ayarlar.donem : null,
        data: cleanPlanData
      };
      
      console.log('💾 planManager: Plan payload hazırlandı:', {
        name: planPayload.name,
        totalStudents: planPayload.totalStudents,
        salonCount: planPayload.salonCount,
        hasData: !!planPayload.data,
        dataKeys: planPayload.data ? Object.keys(planPayload.data) : []
      });
      
      console.log('💾 planManager: db.savePlan çağrılıyor...', {
        dbType: typeof db,
        hasSavePlan: typeof db?.savePlan === 'function',
        dbConstructor: db?.constructor?.name,
        dbKeys: Object.keys(db || {}),
        useFirestore: db?.useFirestore,
        getDatabaseType: db?.getDatabaseType ? db.getDatabaseType() : 'N/A'
      });
      
      // DEBUG: DatabaseAdapter'ın çağrıldığından emin olmak için
      if (db?.useFirestore !== undefined) {
        console.log('✅ planManager: DatabaseAdapter kullanılıyor, useFirestore:', db.useFirestore);
      } else {
        console.warn('⚠️ planManager: DatabaseAdapter KULLANILMIYOR! Doğrudan IndexedDB kullanılıyor olabilir!');
        console.warn('⚠️ db objesi:', db);
      }
      
      const savedPlan = await db.savePlan(planPayload);
      
      console.log('✅ planManager: Plan başarıyla kaydedildi:', savedPlan);
      console.log('✅ planManager: Kaydedilen plan ID tipi:', typeof savedPlan);
      console.log('✅ planManager: Kaydedilen plan ID değeri:', savedPlan);
      
      return savedPlan;
      
    } catch (error) {
      console.error('❌ Plan kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Plan yükleme - Basit ve güvenilir
   */
  async loadPlan(planId) {
    try {
      console.log('📥 Plan yükleniyor:', planId);
      
      // planId validation
      if (planId === null || planId === undefined || planId === '') {
        throw new Error('Plan ID geçersiz: null, undefined veya boş string');
      }
      
      // Firestore ID'leri string, IndexedDB ID'leri number olabilir
      // Her iki formatı da destekle
      let normalizedPlanId = planId;
      if (typeof planId === 'string') {
        // String ID'yi kontrol et - Firestore ID'si mi (alfanumerik) yoksa sayısal string mi?
        const numId = parseInt(planId, 10);
        if (!isNaN(numId) && String(numId) === planId) {
          // Sayısal string ise (örn: "123"), number'a çevir (IndexedDB için)
          normalizedPlanId = numId;
          console.log('📥 Plan ID sayısal string olarak algılandı, number\'a çevriliyor:', normalizedPlanId);
        } else {
          // Firestore ID'si (örn: "SYAMtaEPx9xyqU8TWWCy") - string olarak bırak
          normalizedPlanId = planId;
          console.log('📥 Plan ID Firestore formatında (string), olduğu gibi kullanılıyor:', normalizedPlanId);
        }
      } else if (typeof planId !== 'number') {
        throw new Error(`Plan ID geçersiz tip: ${typeof planId} (number veya string olmalı)`);
      }
      
      console.log('📥 Normalize edilmiş Plan ID:', normalizedPlanId, '(tip:', typeof normalizedPlanId + ')');
      
      // Veritabanından planı al - hem string hem number ID'leri destekler
      const plan = await db.getPlan(normalizedPlanId);
      if (!plan) {
        throw new Error(`Plan bulunamadı (ID: ${normalizedPlanId})`);
      }
      
      console.log('✅ Plan yüklendi:', plan.name);
      console.log('🔍 Plan verisi (raw):', {
        planDataKeys: Object.keys(plan.data),
        salonVar: !!plan.data.salon,
        tumSalonlarVar: !!plan.data.tumSalonlar,
        tumSalonlarLength: plan.data.tumSalonlar?.length || 0
      });
      
      // Plan verisini doğrula ve düzelt
      const validatedPlan = this.validateAndFixPlan(plan.data);
      
      console.log('🔍 Plan verisi (validated):', {
        validatedPlanKeys: Object.keys(validatedPlan),
        salonVar: !!validatedPlan.salon,
        tumSalonlarVar: !!validatedPlan.tumSalonlar,
        tumSalonlarLength: validatedPlan.tumSalonlar?.length || 0
      });
      
      return {
        id: plan.id,
        name: plan.name,
        date: plan.date,
        data: validatedPlan
      };
      
    } catch (error) {
      console.error('❌ Plan yükleme hatası:', error);
      throw error;
    }
  }

  /**
   * Plan listesi
   */
  async getAllPlans() {
    try {
      console.log('📋 Tüm planlar yükleniyor...');
      const plans = await db.getAllPlans();
      
      // ÖNCE: Geçersiz ID'ye sahip planları filtrele
      const validIdPlans = plans.filter(p => {
        const hasValidId = p.id !== null && p.id !== undefined && p.id !== '';
        if (!hasValidId) {
          console.warn('⚠️ Geçersiz Plan ID\'ye sahip plan bulundu ve atlandı:', p);
        }
        return hasValidId;
      });
      
      // Temizlik: tamamen boş kayıtları ayıkla (sadece geçerli ID'li planlar için)
      const emptyPlans = validIdPlans.filter(p => (p.totalStudents || 0) === 0 && (p.salonCount || 0) === 0);
      if (emptyPlans.length > 0) {
        console.warn(`🧹 ${emptyPlans.length} boş plan bulundu, siliniyor...`);
        for (const p of emptyPlans) {
          try { 
            await db.deletePlan(p.id); 
          } catch (e) { 
            console.warn('Plan silme hatası:', p.id, e); 
          }
        }
      }
      
      // Geçerli ID'li ve boş olmayan planları filtrele
      const nonEmptyPlans = validIdPlans.filter(p => (p.totalStudents || 0) > 0 || (p.salonCount || 0) > 0);
      
      // Test Plan'ları ve Valid Plan'ları filtrele (DatabaseTest.js ve test dosyalarından gelen gereksiz planlar)
      const withoutTestPlans = nonEmptyPlans.filter(p => {
        const planName = String(p.name || '').trim();
        const lowerName = planName.toLowerCase();
        return planName !== 'Test Plan' && 
               planName !== 'Valid Plan' &&
               !lowerName.includes('test plan') &&
               !lowerName.includes('valid plan');
      });
      
      if (nonEmptyPlans.length !== withoutTestPlans.length) {
        console.warn(`⚠️ ${nonEmptyPlans.length - withoutTestPlans.length} test plan filtrelendi`);
      }
      
      console.log('✅ Tüm planlar yüklendi:', withoutTestPlans.length, 'geçerli plan');
      console.log('📋 Plan detayları:', withoutTestPlans.map(p => ({ id: p.id, name: p.name, date: p.date })));
      
      const mappedPlans = withoutTestPlans.map(plan => ({
        id: plan.id,
        name: plan.name,
        date: plan.date,
        totalStudents: plan.totalStudents,
        salonCount: plan.salonCount,
        sinavTarihi: plan.sinavTarihi || null,
        sinavSaati: plan.sinavSaati || null,
        sinavDonemi: plan.sinavDonemi || null,
        donem: plan.donem || null,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
      }));
      
      console.log('✅ Planlar map edildi:', mappedPlans.length, 'plan');
      return mappedPlans;
    } catch (error) {
      console.error('❌ HATA - Plan listesi yükleme hatası:', error);
      console.error('❌ Hata detayı:', error.message, error.stack);
      throw error;
    }
  }


  /**
   * Plan silme
   */
  async deletePlan(planId) {
    try {
      // planId validation
      if (planId === null || planId === undefined || planId === '') {
        throw new Error('Plan ID geçersiz: null, undefined veya boş string');
      }
      
      // Firestore ID'leri string, IndexedDB ID'leri number olabilir
      // Her iki formatı da destekle
      let normalizedPlanId = planId;
      if (typeof planId === 'string') {
        // String ID'yi kontrol et - Firestore ID'si mi (alfanumerik) yoksa sayısal string mi?
        const numId = parseInt(planId, 10);
        if (!isNaN(numId) && String(numId) === planId) {
          // Sayısal string ise (örn: "123"), number'a çevir (IndexedDB için)
          normalizedPlanId = numId;
        } else {
          // Firestore ID'si (örn: "SYAMtaEPx9xyqU8TWWCy") - string olarak bırak
          normalizedPlanId = planId;
        }
      } else if (typeof planId !== 'number') {
        throw new Error(`Plan ID geçersiz tip: ${typeof planId} (number veya string olmalı)`);
      }
      
      // Veritabanından planı sil - hem string hem number ID'leri destekler
      await db.deletePlan(normalizedPlanId);
      console.log('✅ Plan silindi:', planId);
    } catch (error) {
      console.error('❌ Plan silme hatası:', error);
      throw error;
    }
  }

  /**
   * Plan verisini temizle ve standardize et
   */
  cleanPlanData(planData) {
    if (!planData) {
      throw new Error('Plan verisi boş olamaz');
    }


    // CRITICAL: tumSalonlar verisini koru
    let tumSalonlar = [];
    if (planData.tumSalonlar && Array.isArray(planData.tumSalonlar) && planData.tumSalonlar.length > 0) {
      tumSalonlar = planData.tumSalonlar.map(salon => this.cleanSalonData(salon));
    }

    // Temel plan yapısını oluştur
    const cleanData = {
      // Ana salon (ilk salon)
      salon: this.cleanSalonData(planData.salon),
      
      // Tüm salonlar
      tumSalonlar: tumSalonlar,
      
      // Yerleşemeyen öğrenciler
      yerlesilemeyenOgrenciler: planData.yerlesilemeyenOgrenciler || [],
      
      // Kalan öğrenciler
      kalanOgrenciler: planData.kalanOgrenciler || [],
      
      // İstatistikler
      istatistikler: planData.istatistikler || {
        toplamOgrenci: 0,
        yerlesenOgrenci: 0,
        yerlesemeyenOgrenci: 0
      },
      
      // Ayarlar bilgilerini de kaydet
      ayarlar: planData.ayarlar || {}
    };

    // Toplam öğrenci sayısını hesapla
    cleanData.totalStudents = this.calculateTotalStudents(cleanData);
    cleanData.salonCount = cleanData.tumSalonlar.length;



    return cleanData;
  }

  /**
   * Salon verisini temizle
   */
  cleanSalonData(salon) {
    if (!salon) return null;

    return {
      id: salon.id || salon.salonId,
      salonId: salon.salonId || salon.id,
      salonAdi: salon.salonAdi || salon.ad || 'İsimsiz Salon',
      kapasite: salon.kapasite || 0,
      siraDizilimi: salon.siraDizilimi || { satir: 0, sutun: 0 },
      ogrenciler: (salon.ogrenciler || []).map(ogrenci => this.cleanStudentData(ogrenci)),
      masalar: (salon.masalar || []).map(masa => this.cleanMasaData(masa)),
      yerlesilemeyenOgrenciler: salon.yerlesilemeyenOgrenciler || []
    };
  }

  /**
   * Öğrenci verisini temizle
   */
  cleanStudentData(ogrenci) {
    if (!ogrenci) return null;

    return {
      id: ogrenci.id,
      ad: ogrenci.ad || '',
      soyad: ogrenci.soyad || '',
      numara: ogrenci.numara || '',
      sinif: ogrenci.sinif || '',
      cinsiyet: ogrenci.cinsiyet || 'E',
      masaNumarasi: ogrenci.masaNumarasi || null
    };
  }

  /**
   * Masa verisini temizle
   */
  cleanMasaData(masa) {
    if (!masa) return null;

    return {
      id: masa.id,
      masaNumarasi: masa.masaNumarasi || (masa.id + 1),
      satir: masa.satir || 0,
      sutun: masa.sutun || 0,
      grup: masa.grup || 0,
      koltukTipi: masa.koltukTipi || 'normal',
      ogrenci: masa.ogrenci ? this.cleanStudentData(masa.ogrenci) : null
    };
  }

  /**
   * Plan verisini doğrula ve düzelt
   */
  validateAndFixPlan(planData) {
    if (!planData) {
      throw new Error('Plan verisi bulunamadı');
    }

    // Temel yapıyı kontrol et
    if (!planData.tumSalonlar || !Array.isArray(planData.tumSalonlar)) {
      console.warn('⚠️ tumSalonlar bulunamadı, boş array oluşturuluyor');
      planData.tumSalonlar = [];
    }

    if (planData.tumSalonlar.length === 0) {
      console.warn('⚠️ tumSalonlar boş, ana salon varsa onu kullanıyoruz');
      
      // Ana salon varsa, onu tumSalonlar'a ekle
      if (planData.salon) {
        console.log('✅ Ana salon tumSalonlar\'a ekleniyor');
        planData.tumSalonlar = [planData.salon];
      } else {
        console.warn('❌ Ana salon da bulunamadı, varsayılan salon oluşturuluyor');
        planData.tumSalonlar = [this.createDefaultSalon()];
      }
    }

    // Ana salonu ayarla
    if (!planData.salon && planData.tumSalonlar.length > 0) {
      planData.salon = planData.tumSalonlar[0];
    }

    // KRITIK: Tüm salonların siraDizilimi'ni kontrol et ve eksikse ekle
    // SalonPlani bileşeni siraDizilimi.satir ve siraDizilimi.sutun bekliyor
    if (planData.salon && (!planData.salon.siraDizilimi || !planData.salon.siraDizilimi.satir || !planData.salon.siraDizilimi.sutun)) {
      console.warn('⚠️ Ana salon siraDizilimi eksik, varsayılan değerler ekleniyor');
      planData.salon.siraDizilimi = planData.salon.siraDizilimi || {};
      planData.salon.siraDizilimi.satir = planData.salon.siraDizilimi.satir || Math.ceil(Math.sqrt(planData.salon.kapasite || 30)) || 6;
      planData.salon.siraDizilimi.sutun = planData.salon.siraDizilimi.sutun || Math.ceil((planData.salon.kapasite || 30) / planData.salon.siraDizilimi.satir) || 5;
    }

    // TumSalonlar içindeki tüm salonların siraDizilimi'ni kontrol et
    planData.tumSalonlar = planData.tumSalonlar.map(salon => {
      if (!salon.siraDizilimi || !salon.siraDizilimi.satir || !salon.siraDizilimi.sutun) {
        console.warn('⚠️ Salon siraDizilimi eksik, varsayılan değerler ekleniyor:', salon.salonAdi || salon.ad);
        salon.siraDizilimi = salon.siraDizilimi || {};
        salon.siraDizilimi.satir = salon.siraDizilimi.satir || Math.ceil(Math.sqrt(salon.kapasite || 30)) || 6;
        salon.siraDizilimi.sutun = salon.siraDizilimi.sutun || Math.ceil((salon.kapasite || 30) / salon.siraDizilimi.satir) || 5;
      }
      return salon;
    });

    console.log('✅ Plan verisi doğrulandı:', {
      salonVar: !!planData.salon,
      tumSalonlarSayisi: planData.tumSalonlar.length,
      totalStudents: planData.totalStudents || 0,
      salonSiraDizilimi: planData.salon?.siraDizilimi
    });

    // Debug: Plan verisinin detaylarını kontrol et
    console.log('🔍 PlanManager - Plan verisi detayları:', {
      planDataKeys: Object.keys(planData),
      salonKeys: planData.salon ? Object.keys(planData.salon) : 'null',
      salonMasalar: planData.salon?.masalar?.length || 0,
      salonOgrenciler: planData.salon?.ogrenciler?.length || 0,
      tumSalonlarDetay: planData.tumSalonlar?.map(s => ({
        salonAdi: s.salonAdi,
        masalar: s.masalar?.length || 0,
        ogrenciler: s.ogrenciler?.length || 0
      })) || []
    });

    return planData;
  }

  /**
   * Varsayılan salon oluştur
   */
  createDefaultSalon() {
    return {
      id: 'default',
      salonId: 'default',
      salonAdi: 'Varsayılan Salon',
      kapasite: 30,
      siraDizilimi: { satir: 5, sutun: 6 },
      ogrenciler: [],
      masalar: [],
      yerlesilemeyenOgrenciler: []
    };
  }

  /**
   * Toplam öğrenci sayısını hesapla
   */
  calculateTotalStudents(planData) {
    let total = 0;
    
    if (planData.tumSalonlar) {
      planData.tumSalonlar.forEach(salon => {
        if (salon.ogrenciler) {
          total += salon.ogrenciler.length;
        }
      });
    }
    
    if (planData.yerlesilemeyenOgrenciler) {
      total += planData.yerlesilemeyenOgrenciler.length;
    }
    
    return total;
  }
}

// Singleton instance
const planManager = new PlanManager();

export default planManager;
