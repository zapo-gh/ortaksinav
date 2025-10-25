import Dexie from 'dexie';

/**
 * Kelebek Sınav Sistemi Veritabanı
 * IndexedDB tabanlı modern veritabanı yönetimi
 */
class KelebekDatabase extends Dexie {
  constructor() {
    super('KelebekSinavDB');
    
    // Veritabanı şeması tanımları
    this.version(1).stores({
      // Planlar tablosu
      plans: '++id, name, date, totalStudents, salonCount, data, createdAt, updatedAt',
      
      // Öğrenciler tablosu (plan bazlı)
      students: '++id, planId, name, surname, number, class, gender, masaNumarasi, salonId, isPlaced',
      
      // Salonlar tablosu (plan bazlı)
      salons: '++id, planId, salonId, name, capacity, layout, masalar, unplacedStudents',
      
      // Ayarlar tablosu
      settings: '++id, key, value, type, updatedAt',
      
      // Geçici veriler tablosu (drag-drop, learning data vb.)
      tempData: '++id, key, value, type, expiresAt'
    });
    
    // Hook'lar - veri değişikliklerini izle
    this.plans.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });
    
    this.plans.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });
    
    this.settings.hook('creating', (primKey, obj, trans) => {
      obj.updatedAt = new Date();
    });
    
    this.settings.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });
  }
  
  /**
   * Plan kaydetme - gelişmiş sıkıştırma ile
   */
  async savePlan(planData) {
    try {
      // SIKIŞTIRMA KALDIRILDI - Veriyi doğrudan kaydet
      console.log('💾 Plan verisi sıkıştırılmadan kaydediliyor...');
      
      const plan = {
        name: planData.name,
        date: planData.date,
        totalStudents: planData.totalStudents,
        salonCount: planData.salonCount,
        data: planData.data // Doğrudan veriyi kaydet
      };
      
      const id = await this.plans.add(plan);
      console.log('✅ Plan veritabanına kaydedildi:', id);
      return id;
    } catch (error) {
      console.error('❌ Plan kaydetme hatası:', error);
      throw error;
    }
  }
  
  /**
   * Plan yükleme
   */
  async loadPlan(planId) {
    try {
      const plan = await this.plans.get(planId);
      if (!plan) {
        throw new Error('Plan bulunamadı');
      }
      
      // SIKIŞTIRMA KALDIRILDI - Veriyi doğrudan döndür
      console.log('📥 Plan verisi sıkıştırılmadan yükleniyor...');
      return {
        ...plan,
        data: plan.data // Doğrudan veriyi döndür
      };
    } catch (error) {
      console.error('❌ Plan yükleme hatası:', error);
      throw error;
    }
  }
  
  /**
   * Tüm planları listele
   */
  async getAllPlans() {
    try {
      console.log('🔍 Database.getAllPlans çağrıldı');
      const plans = await this.plans.orderBy('updatedAt').reverse().toArray();
      console.log('✅ Database\'den planlar alındı:', plans.length, 'plan');
      console.log('📋 Database plan detayları:', plans.map(p => ({ id: p.id, name: p.name, date: p.date })));
      
      const mappedPlans = plans.map(plan => ({
        ...plan,
        data: plan.data // SIKIŞTIRMA KALDIRILDI - Doğrudan veriyi döndür
      }));
      
      console.log('✅ Database planlar map edildi:', mappedPlans.length, 'plan');
      return mappedPlans;
    } catch (error) {
      console.error('❌ HATA - Database plan listesi yükleme hatası:', error);
      console.error('❌ Hata detayı:', error.message, error.stack);
      throw error;
    }
  }
  
  /**
   * Tek plan yükleme
   */
  async getPlan(planId) {
    try {
      const plan = await this.plans.get(planId);
      if (!plan) {
        console.log('⚠️ Plan bulunamadı:', planId);
        return null;
      }
      
      return {
        ...plan,
        data: plan.data // SIKIŞTIRMA KALDIRILDI - Doğrudan veriyi döndür
      };
    } catch (error) {
      console.error('❌ Plan yükleme hatası:', error);
      throw error;
    }
  }
  
  /**
   * Plan silme
   */
  async deletePlan(planId) {
    try {
      await this.transaction('rw', [this.plans, this.students, this.salons], async () => {
        // İlgili öğrenci ve salon verilerini de sil
        await this.students.where('planId').equals(planId).delete();
        await this.salons.where('planId').equals(planId).delete();
        await this.plans.delete(planId);
      });
      
      console.log('✅ Plan silindi:', planId);
    } catch (error) {
      console.error('❌ Plan silme hatası:', error);
      throw error;
    }
  }
  
  /**
   * Ayar kaydetme
   */
  async saveSetting(key, value, type = 'string') {
    try {
      await this.settings.put({
        key,
        value,
        type
      });
      console.log('✅ Ayar kaydedildi:', key);
    } catch (error) {
      console.error('❌ Ayar kaydetme hatası:', error);
      throw error;
    }
  }
  
  /**
   * Ayar yükleme
   */
  async getSetting(key) {
    try {
      const setting = await this.settings.get(key);
      return setting ? setting.value : null;
    } catch (error) {
      console.error('❌ Ayar yükleme hatası:', error);
      return null;
    }
  }
  
  /**
   * Geçici veri kaydetme (otomatik silme ile)
   */
  async saveTempData(key, value, type = 'json', expiresInHours = 24) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);
      
      await this.tempData.put({
        key,
        value,
        type,
        expiresAt
      });
      
      // Eski verileri temizle
      await this.cleanupExpiredTempData();
      
      console.log('✅ Geçici veri kaydedildi:', key);
    } catch (error) {
      console.error('❌ Geçici veri kaydetme hatası:', error);
      throw error;
    }
  }
  
  /**
   * Geçici veri yükleme
   */
  async getTempData(key) {
    try {
      const tempData = await this.tempData.get(key);
      if (!tempData) return null;
      
      // Süresi dolmuş mu kontrol et
      if (new Date() > tempData.expiresAt) {
        await this.tempData.delete(key);
        return null;
      }
      
      return tempData.value;
    } catch (error) {
      console.error('❌ Geçici veri yükleme hatası:', error);
      return null;
    }
  }
  
  /**
   * Plan verilerini sıkıştır
   */
  compressPlanData(planData) {
    if (!planData) return null;
    
    // Tüm plan verisini koru - sadece gereksiz alanları temizle
    const compressed = {
      salon: planData.salon ? {
        id: planData.salon.id,
        salonId: planData.salon.salonId,
        salonAdi: planData.salon.salonAdi,
        kapasite: planData.salon.kapasite,
        siraDizilimi: planData.salon.siraDizilimi,
        ogrenciler: planData.salon.ogrenciler?.map(ogrenci => ({
          id: ogrenci.id,
          ad: ogrenci.ad,
          soyad: ogrenci.soyad,
          numara: ogrenci.numara,
          sinif: ogrenci.sinif,
          cinsiyet: ogrenci.cinsiyet,
          masaNumarasi: ogrenci.masaNumarasi
        })) || [],
        masalar: planData.salon.masalar?.map(masa => ({
          id: masa.id,
          masaNumarasi: masa.masaNumarasi,
          satir: masa.satir,
          sutun: masa.sutun,
          grup: masa.grup,
          koltukTipi: masa.koltukTipi,
          ogrenci: masa.ogrenci ? {
            id: masa.ogrenci.id,
            ad: masa.ogrenci.ad,
            soyad: masa.ogrenci.soyad,
            numara: masa.ogrenci.numara,
            sinif: masa.ogrenci.sinif,
            cinsiyet: masa.ogrenci.cinsiyet,
            masaNumarasi: masa.ogrenci.masaNumarasi
          } : null
        })) || [],
        yerlesilemeyenOgrenciler: planData.salon.yerlesilemeyenOgrenciler?.map(ogrenci => ({
          id: ogrenci.id,
          ad: ogrenci.ad,
          soyad: ogrenci.soyad,
          numara: ogrenci.numara,
          sinif: ogrenci.sinif,
          cinsiyet: ogrenci.cinsiyet
        })) || []
      } : null,
      kalanOgrenciler: planData.kalanOgrenciler?.map(ogrenci => ({
        id: ogrenci.id,
        ad: ogrenci.ad,
        soyad: ogrenci.soyad,
        numara: ogrenci.numara,
        sinif: ogrenci.sinif,
        cinsiyet: ogrenci.cinsiyet
      })) || [],
      yerlesilemeyenOgrenciler: planData.yerlesilemeyenOgrenciler?.map(ogrenci => ({
        id: ogrenci.id,
        ad: ogrenci.ad,
        soyad: ogrenci.soyad,
        numara: ogrenci.numara,
        sinif: ogrenci.sinif,
        cinsiyet: ogrenci.cinsiyet
      })) || [],
      istatistikler: planData.istatistikler,
      tumSalonlar: planData.tumSalonlar?.map(salon => ({
        id: salon.id,
        salonId: salon.salonId,
        salonAdi: salon.salonAdi,
        kapasite: salon.kapasite,
        siraDizilimi: salon.siraDizilimi,
        ogrenciler: salon.ogrenciler?.map(ogrenci => ({
          id: ogrenci.id,
          ad: ogrenci.ad,
          soyad: ogrenci.soyad,
          numara: ogrenci.numara,
          sinif: ogrenci.sinif,
          cinsiyet: ogrenci.cinsiyet,
          masaNumarasi: ogrenci.masaNumarasi
        })) || [],
        masalar: salon.masalar?.map(masa => ({
          id: masa.id,
          masaNumarasi: masa.masaNumarasi,
          satir: masa.satir,
          sutun: masa.sutun,
          grup: masa.grup,
          koltukTipi: masa.koltukTipi,
          ogrenci: masa.ogrenci ? {
            id: masa.ogrenci.id,
            ad: masa.ogrenci.ad,
            soyad: masa.ogrenci.soyad,
            numara: masa.ogrenci.numara,
            sinif: masa.ogrenci.sinif,
            cinsiyet: masa.ogrenci.cinsiyet,
            masaNumarasi: masa.ogrenci.masaNumarasi
          } : null
        })) || [],
        yerlesilemeyenOgrenciler: salon.yerlesilemeyenOgrenciler?.map(ogrenci => ({
          id: ogrenci.id,
          ad: ogrenci.ad,
          soyad: ogrenci.soyad,
          numara: ogrenci.numara,
          sinif: ogrenci.sinif,
          cinsiyet: ogrenci.cinsiyet
        })) || []
      })) || []
    };
    
    return compressed;
  }
  
  /**
   * Plan verilerini aç
   */
  decompressPlanData(compressedData) {
    if (!compressedData) return null;
    return compressedData;
  }
  
  /**
   * Süresi dolmuş geçici verileri temizle
   */
  async cleanupExpiredTempData() {
    try {
      const now = new Date();
      await this.tempData.where('expiresAt').below(now).delete();
    } catch (error) {
      console.error('❌ Geçici veri temizleme hatası:', error);
    }
  }
  
  /**
   * Veritabanı durumu
   */
  async getDatabaseStats() {
    try {
      const [planCount, studentCount, salonCount, settingCount, tempDataCount] = await Promise.all([
        this.plans.count(),
        this.students.count(),
        this.salons.count(),
        this.settings.count(),
        this.tempData.count()
      ]);
      
      return {
        plans: planCount,
        students: studentCount,
        salons: salonCount,
        settings: settingCount,
        tempData: tempDataCount,
        total: planCount + studentCount + salonCount + settingCount + tempDataCount
      };
    } catch (error) {
      console.error('❌ Veritabanı istatistik hatası:', error);
      return null;
    }
  }
  
  /**
   * Veritabanını temizle
   */
  async clearDatabase() {
    try {
      await this.transaction('rw', [this.plans, this.students, this.salons, this.settings, this.tempData], async () => {
        await this.plans.clear();
        await this.students.clear();
        await this.salons.clear();
        await this.settings.clear();
        await this.tempData.clear();
      });
      
      console.log('✅ Veritabanı temizlendi');
    } catch (error) {
      console.error('❌ Veritabanı temizleme hatası:', error);
      throw error;
    }
  }

  /**
   * Otomatik kayıt planlarını temizle
   */
  async clearAutoPlans() {
    try {
      await this.transaction('rw', [this.plans], async () => {
        await this.plans.where('name').equals('Otomatik Kayıt').delete();
      });
      
      console.log('✅ Otomatik kayıt planları temizlendi');
    } catch (error) {
      console.error('❌ Otomatik kayıt planları temizleme hatası:', error);
      throw error;
    }
  }

  /**
   * Öğrencileri kaydet
   */
  async saveStudents(students) {
    try {
      // Mevcut öğrencileri temizle
      await this.students.clear();
      
      // Yeni öğrencileri ekle
      if (students && students.length > 0) {
        await this.students.bulkAdd(students.map((student, index) => ({
          ...student,
          id: student.id || index + 1
        })));
      }
      
      console.log('✅ Öğrenciler kaydedildi:', students?.length || 0);
    } catch (error) {
      console.error('❌ Öğrenci kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Tüm öğrencileri getir
   */
  async getAllStudents() {
    try {
      const students = await this.students.toArray();
      console.log('✅ Öğrenciler yüklendi:', students.length);
      return students;
    } catch (error) {
      console.error('❌ Öğrenci yükleme hatası:', error);
      return [];
    }
  }

  /**
   * Ayarları kaydet
   */
  async saveSettings(settings) {
    try {
      // Mevcut ayarları temizle
      await this.settings.clear();
      
      // Yeni ayarları ekle
      if (settings) {
        const settingsArray = Object.entries(settings).map(([key, value]) => ({
          key,
          value,
          type: typeof value
        }));
        
        await this.settings.bulkAdd(settingsArray);
      }
      
      console.log('✅ Ayarlar kaydedildi');
    } catch (error) {
      console.error('❌ Ayar kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Tüm ayarları getir
   */
  async getSettings() {
    try {
      const settings = await this.settings.toArray();
      const settingsObj = {};
      
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });
      
      console.log('✅ Ayarlar yüklendi:', Object.keys(settingsObj).length);
      return settingsObj;
    } catch (error) {
      console.error('❌ Ayar yükleme hatası:', error);
      return {};
    }
  }

  /**
   * Salonları kaydet
   */
  async saveSalons(salons) {
    try {
      // Mevcut salonları temizle
      await this.salons.clear();
      
      // Yeni salonları ekle
      if (salons && salons.length > 0) {
        await this.salons.bulkAdd(salons.map((salon, index) => ({
          ...salon,
          id: salon.id || index + 1
        })));
      }
      
      console.log('✅ Salonlar kaydedildi:', salons?.length || 0);
    } catch (error) {
      console.error('❌ Salon kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Tüm salonları getir
   */
  async getAllSalons() {
    try {
      const salons = await this.salons.toArray();
      console.log('✅ Salonlar yüklendi:', salons.length);
      return salons;
    } catch (error) {
      console.error('❌ Salon yükleme hatası:', error);
      return [];
    }
  }

  /**
   * Salon sil
   */
  async deleteSalon(salonId) {
    try {
      await this.salons.delete(salonId);
      console.log('✅ Salon silindi:', salonId);
    } catch (error) {
      console.error('❌ Salon silme hatası:', error);
      throw error;
    }
  }
}

// Singleton instance
const db = new KelebekDatabase();

export default db;
