/**
 * Plan Yönetimi - Temiz ve Basit Sistem
 * Kaydetme ve yükleme işlemlerini standardize eder
 */

import db from '../database/database';

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
      
      // Plan verisini temizle ve standardize et
      const cleanPlanData = this.cleanPlanData(planData);
      // Kaydetme koruması: boş planları kaydetme
      const isEmpty = (cleanPlanData.totalStudents || 0) === 0 && (cleanPlanData.tumSalonlar?.length || 0) === 0;
      if (isEmpty) {
        console.warn('⚠️ Boş plan kaydetme atlandı (0 öğrenci, 0 salon).');
        return null;
      }
      
      // Veritabanına kaydet
      const savedPlan = await db.savePlan({
        name: planName,
        date: new Date().toISOString(),
        totalStudents: cleanPlanData.totalStudents || 0,
        salonCount: cleanPlanData.salonCount || 0,
        data: cleanPlanData
      });
      
      console.log('✅ Plan başarıyla kaydedildi:', savedPlan);
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
      
      // Veritabanından planı al
      const plan = await db.getPlan(planId);
      if (!plan) {
        throw new Error('Plan bulunamadı');
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
      // Temizlik: tamamen boş kayıtları ayıkla
      const emptyPlans = plans.filter(p => (p.totalStudents || 0) === 0 && (p.salonCount || 0) === 0);
      if (emptyPlans.length > 0) {
        console.warn(`🧹 ${emptyPlans.length} boş plan bulundu, siliniyor...`);
        for (const p of emptyPlans) {
          try { await db.deletePlan(p.id); } catch (e) { console.warn('Plan silme hatası:', p.id, e); }
        }
      }
      const nonEmptyPlans = plans.filter(p => (p.totalStudents || 0) > 0 || (p.salonCount || 0) > 0);
      console.log('✅ Tüm planlar yüklendi:', plans.length, 'plan');
      console.log('📋 Plan detayları:', plans.map(p => ({ id: p.id, name: p.name, date: p.date })));
      
      const mappedPlans = nonEmptyPlans.map(plan => ({
        id: plan.id,
        name: plan.name,
        date: plan.date,
        totalStudents: plan.totalStudents,
        salonCount: plan.salonCount
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
      await db.deletePlan(planId);
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

    console.log('✅ Plan verisi doğrulandı:', {
      salonVar: !!planData.salon,
      tumSalonlarSayisi: planData.tumSalonlar.length,
      totalStudents: planData.totalStudents || 0
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
