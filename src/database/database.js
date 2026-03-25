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
      plans: '++id, name, date, totalStudents, salonCount, sinavTarihi, sinavSaati, sinavDonemi, donem, data, createdAt, updatedAt',
      
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
   * Plan kaydetme - sıkıştırmasız
   */
  async savePlan(planData) {
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
        logger.warn('⚠️ IndexedDB: Test Plan kaydetme engellendi (kota koruması):', planName);
        return null; // Kaydetme
      }
      
      logger.info('💾 Plan verisi kaydediliyor...');
      const plan = {
        name: planData.name,
        date: planData.date,
        totalStudents: planData.totalStudents,
        salonCount: planData.salonCount,
        sinavTarihi: planData.sinavTarihi || null,
        sinavSaati: planData.sinavSaati || null,
        sinavDonemi: planData.sinavDonemi || null,
        donem: planData.donem || null,
        data: planData.data
      };
      
      const id = await this.plans.add(plan);
      logger.info('✅ Plan veritabanına kaydedildi:', id);
      return id;
    } catch (error) {
      logger.error('❌ Plan kaydetme hatası:', error);
      
      // Quota hatası durumunda eski planları temizle ve tekrar dene
      if (error.name === 'QuotaExceededError') {
        logger.info('🧹 Quota hatası - eski planlar temizleniyor...');
        await this.cleanupOldPlans();
        
        // Tekrar dene
        try {
          const plan = {
            name: planData.name,
            date: planData.date,
            totalStudents: planData.totalStudents,
            salonCount: planData.salonCount,
            sinavTarihi: planData.sinavTarihi || null,
            sinavSaati: planData.sinavSaati || null,
            sinavDonemi: planData.sinavDonemi || null,
            donem: planData.donem || null,
            data: planData.data
          };
          
          const id = await this.plans.add(plan);
          logger.info('✅ Plan temizlik sonrası kaydedildi:', id);
          return id;
        } catch (retryError) {
          logger.error('❌ Temizlik sonrası da kaydetme başarısız:', retryError);
          throw retryError;
        }
      }
      
      throw error;
    }
  }

  /**
   * Plan güncelleme
   */
  async updatePlan(planId, planData) {
    try {
      const normalizedPlanId = parseInt(planId, 10);
      if (isNaN(normalizedPlanId)) {
        throw new Error('Geçersiz plan ID');
      }
      
      // Planın var olup olmadığını kontrol et
      const existingPlan = await this.plans.get(normalizedPlanId);
      if (!existingPlan) {
        throw new Error(`Plan bulunamadı: ${planId}`);
      }
      
      const updateData = {
        name: planData.name,
        date: planData.date || new Date().toISOString(),
        totalStudents: planData.totalStudents || 0,
        salonCount: planData.salonCount || 0,
        sinavTarihi: planData.sinavTarihi || null,
        sinavSaati: planData.sinavSaati || null,
        sinavDonemi: planData.sinavDonemi || null,
        donem: planData.donem || null,
        data: planData.data,
        updatedAt: new Date()
      };
      
      await this.plans.update(normalizedPlanId, updateData);
      logger.info('✅ Plan güncellendi:', normalizedPlanId);
      return normalizedPlanId;
    } catch (error) {
      logger.error('❌ Plan güncelleme hatası:', error);
      throw error;
    }
  }
  
  /**
   * Plan yükleme - sıkıştırmasız
   */
  async loadPlan(planId) {
    try {
      const plan = await this.plans.get(planId);
      if (!plan) {
        throw new Error('Plan bulunamadı');
      }
      logger.info('📥 Plan verisi yükleniyor...');
      return {
        ...plan,
        data: plan.data
      };
    } catch (error) {
      logger.error('❌ Plan yükleme hatası:', error);
      throw error;
    }
  }
  
  /**
   * Tüm planları listele
   */
  async getAllPlans() {
    try {
      logger.info('🔍 Database.getAllPlans çağrıldı');
      const plans = await this.plans.orderBy('updatedAt').reverse().toArray();
      logger.info('✅ Database\'den planlar alındı:', plans.length, 'plan');
      logger.info('📋 Database plan detayları:', plans.map(p => ({ id: p.id, name: p.name, date: p.date })));
      
      const mappedPlans = plans.map(plan => ({
        ...plan,
        data: plan.data // SIKIŞTIRMA KALDIRILDI - Doğrudan veriyi döndür
      }));
      
      logger.info('✅ Database planlar map edildi:', mappedPlans.length, 'plan');
      return mappedPlans;
    } catch (error) {
      logger.error('❌ HATA - Database plan listesi yükleme hatası:', error);
      logger.error('❌ Hata detayı:', error.message, error.stack);
      throw error;
    }
  }
  
  /**
   * Tek plan yükleme
   */
  async getPlan(planId) {
    try {
      // planId validation - Dexie Table.get() için gerekli
      if (planId === null || planId === undefined || planId === '') {
        throw new Error('Invalid argument to Table.get(): planId cannot be null, undefined, or empty string');
      }
      
      // Dexie primary key number bekliyor, string ise number'a çevir
      let normalizedPlanId = planId;
      if (typeof planId === 'string') {
        const sanitizedId = planId.trim();
        const numId = parseInt(sanitizedId, 10);
        if (!isNaN(numId)) {
          normalizedPlanId = numId;
        } else {
          logger.warn(`ℹ️ IndexedDB getPlan: planId "${planId}" numerik değil, IndexedDB yalnızca sayısal anahtar destekliyor. Firestore'dan devam edilecek.`);
          return null;
        }
      } else if (typeof planId !== 'number') {
        throw new Error(`Invalid argument to Table.get(): planId must be number or string, got ${typeof planId}`);
      }
      
      const plan = await this.plans.get(normalizedPlanId);
      if (!plan) {
        logger.info('⚠️ Plan bulunamadı:', normalizedPlanId);
        return null;
      }
      
      return {
        ...plan,
        data: plan.data // SIKIŞTIRMA KALDIRILDI - Doğrudan veriyi döndür
      };
    } catch (error) {
      logger.error('❌ Plan yükleme hatası:', error);
      throw error;
    }
  }

  /**
   * En son kaydedilen planı getir (yerleştirme sonucu için)
   */
  async getLatestPlan() {
    try {
      const plans = await this.plans.orderBy('updatedAt').reverse().limit(1).toArray();
      if (plans.length === 0) {
        logger.info('⚠️ Hiç plan bulunamadı');
        return null;
      }
      
      const latestPlan = plans[0];
      logger.info('✅ En son plan yüklendi:', latestPlan.name, latestPlan.updatedAt);
      
      return {
        ...latestPlan,
        data: latestPlan.data
      };
    } catch (error) {
      logger.error('❌ En son plan yükleme hatası:', error);
      return null;
    }
  }
  
  /**
   * Plan silme
   */
  async deletePlan(planId) {
    try {
      // planId validation - Dexie Table.delete() için gerekli
      if (planId === null || planId === undefined || planId === '') {
        throw new Error('Invalid argument to Table.delete(): planId cannot be null, undefined, or empty string');
      }
      
      // Dexie primary key number bekliyor, string ise number'a çevir
      let normalizedPlanId = planId;
      if (typeof planId === 'string') {
        const sanitizedId = planId.trim();
        const numId = parseInt(sanitizedId, 10);
        if (!isNaN(numId)) {
          normalizedPlanId = numId;
        } else {
          logger.warn(`ℹ️ IndexedDB deletePlan: planId "${planId}" numerik değil, IndexedDB yalnızca sayısal anahtar destekliyor. Silinecek kayıt bulunmadı.`);
          return false;
        }
      } else if (typeof planId !== 'number') {
        throw new Error(`Invalid argument to Table.delete(): planId must be number or string, got ${typeof planId}`);
      }
      
      await this.transaction('rw', [this.plans, this.students, this.salons], async () => {
        // İlgili öğrenci ve salon verilerini de sil
        await this.students.where('planId').equals(normalizedPlanId).delete();
        await this.salons.where('planId').equals(normalizedPlanId).delete();
        await this.plans.delete(normalizedPlanId);
      });
      
      logger.info('✅ Plan silindi:', normalizedPlanId);
    } catch (error) {
      logger.error('❌ Plan silme hatası:', error);
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
      logger.info('✅ Ayar kaydedildi:', key);
    } catch (error) {
      logger.error('❌ Ayar kaydetme hatası:', error);
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
      logger.error('❌ Ayar yükleme hatası:', error);
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
      
      logger.info('✅ Geçici veri kaydedildi:', key);
    } catch (error) {
      logger.error('❌ Geçici veri kaydetme hatası:', error);
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
      logger.error('❌ Geçici veri yükleme hatası:', error);
      return null;
    }
  }
  
  // compress/decompress kaldırıldı
  
  /**
   * Süresi dolmuş geçici verileri temizle
   */
  async cleanupExpiredTempData() {
    try {
      const now = new Date();
      await this.tempData.where('expiresAt').below(now).delete();
    } catch (error) {
      logger.error('❌ Geçici veri temizleme hatası:', error);
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
      logger.error('❌ Veritabanı istatistik hatası:', error);
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
      
      logger.info('✅ Veritabanı temizlendi');
    } catch (error) {
      logger.error('❌ Veritabanı temizleme hatası:', error);
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
      
      logger.info('✅ Otomatik kayıt planları temizlendi');
    } catch (error) {
      logger.error('❌ Otomatik kayıt planları temizleme hatası:', error);
      throw error;
    }
  }

  /**
   * Öğrencileri kaydet
   */
  async saveStudents(students) {
    try {
      // Boş array veya null/undefined ise hiçbir şey yapma (verileri silme!)
      if (!students || students.length === 0) {
        logger.info('⚠️ Öğrenci verisi boş, kaydetme atlanıyor (mevcut veriler korunuyor)');
        return; // Mevcut verileri koru, silme!
      }
      await this.transaction('rw', this.students, async () => {
        await this.students.clear();
        const records = students.map((student, index) => ({
          ...student,
          id: String(student.id ?? index + 1)
        }));
        await this.students.bulkPut(records);
      });
      
      logger.info('✅ Öğrenciler kaydedildi:', students.length);
    } catch (error) {
      logger.error('❌ Öğrenci kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Tüm öğrencileri getir
   */
  async getAllStudents() {
    try {
      const students = await this.students.toArray();
      logger.info('✅ Öğrenciler yüklendi:', students.length);
      return students;
    } catch (error) {
      logger.error('❌ Öğrenci yükleme hatası:', error);
      return [];
    }
  }

  /**
   * Ayarları kaydet
   */
  async saveSettings(settings) {
    try {
      await this.transaction('rw', this.settings, async () => {
        await this.settings.clear();
        if (settings) {
          const settingsArray = Object.entries(settings).map(([key, value]) => ({
            id: key,
            key,
            value,
            type: typeof value,
            updatedAt: new Date()
          }));
          if (settingsArray.length > 0) {
            await this.settings.bulkPut(settingsArray);
          }
        }
      });
      
      logger.info('✅ Ayarlar kaydedildi');
    } catch (error) {
      logger.error('❌ Ayar kaydetme hatası:', error);
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
      
      logger.info('✅ Ayarlar yüklendi:', Object.keys(settingsObj).length);
      return settingsObj;
    } catch (error) {
      logger.error('❌ Ayar yükleme hatası:', error);
      return {};
    }
  }

  /**
   * Salonları kaydet
   */
  async saveSalons(salons) {
    try {
      // Boş array veya null/undefined ise hiçbir şey yapma (verileri silme!)
      if (!salons || salons.length === 0) {
        logger.info('⚠️ Salon verisi boş, kaydetme atlanıyor (mevcut veriler korunuyor)');
        return; // Mevcut verileri koru, silme!
      }
      await this.transaction('rw', this.salons, async () => {
        await this.salons.clear();
        const now = Date.now();
        const records = salons.map((salon, index) => {
          const { id: userSalonId, ...rest } = salon || {};
          return {
            ...rest,
            salonId: String(salon.salonId || userSalonId || `${now}-${index}`),
            masalar: Array.isArray(salon?.masalar) ? salon.masalar : [],
            unplacedStudents: Array.isArray(salon?.unplacedStudents) ? salon.unplacedStudents : []
          };
        });
        if (records.length > 0) {
          await this.salons.bulkPut(records);
        }
      });
      
      logger.info('✅ Salonlar kaydedildi:', salons.length);
    } catch (error) {
      logger.error('❌ Salon kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Tüm salonları getir
   */
  async getAllSalons() {
    try {
      const salons = await this.salons.toArray();
      logger.info('✅ Salonlar yüklendi:', salons.length);
      // Kullanım kolaylığı için 'id' alanını geri eşle
      const mappedSalons = salons.map((s) => ({
        id: s.salonId || s.id,
        ...s
      }));
      
      // Salonları sayısal ID'ye göre sırala (string sıralama yerine)
      mappedSalons.sort((a, b) => {
        const aId = parseInt(a.id || a.salonId || 0, 10);
        const bId = parseInt(b.id || b.salonId || 0, 10);
        return aId - bId;
      });
      
      return mappedSalons;
    } catch (error) {
      logger.error('❌ Salon yükleme hatası:', error);
      return [];
    }
  }

  /**
   * Salon sil
   */
  async deleteSalon(salonId) {
    try {
      await this.salons.delete(salonId);
      logger.info('✅ Salon silindi:', salonId);
    } catch (error) {
      logger.error('❌ Salon silme hatası:', error);
      throw error;
    }
  }

  /**
   * Plan verisini sıkıştır
   */
  compressPlanData(data) {
    try {
      const jsonString = JSON.stringify(data);
      // Basit sıkıştırma: tekrarlanan karakterleri azalt
      const compressed = jsonString
        .replace(/"ogrenci":null/g, '"o":null')
        .replace(/"ogrenciler":/g, '"o":')
        .replace(/"masalar":/g, '"m":')
        .replace(/"salonAdi":/g, '"s":')
        .replace(/"masaNumarasi":/g, '"mn":')
        .replace(/"satir":/g, '"r":')
        .replace(/"sutun":/g, '"c":')
        .replace(/"grup":/g, '"g":')
        .replace(/"koltukTipi":/g, '"kt":')
        .replace(/"ad":/g, '"a":')
        .replace(/"soyad":/g, '"sn":')
        .replace(/"sinif":/g, '"sf":')
        .replace(/"cinsiyet":/g, '"cs":')
        .replace(/"id":/g, '"i":');
      
      return compressed;
    } catch (error) {
      logger.warn('⚠️ Sıkıştırma hatası, orijinal veri kullanılıyor:', error);
      return data;
    }
  }

  /**
   * Sıkıştırılmış plan verisini aç
   */
  decompressPlanData(compressedData) {
    try {
      // Sıkıştırma tersine çevir
      const decompressed = compressedData
        .replace(/"o":null/g, '"ogrenci":null')
        .replace(/"o":/g, '"ogrenciler":')
        .replace(/"m":/g, '"masalar":')
        .replace(/"s":/g, '"salonAdi":')
        .replace(/"mn":/g, '"masaNumarasi":')
        .replace(/"r":/g, '"satir":')
        .replace(/"c":/g, '"sutun":')
        .replace(/"g":/g, '"grup":')
        .replace(/"kt":/g, '"koltukTipi":')
        .replace(/"a":/g, '"ad":')
        .replace(/"sn":/g, '"soyad":')
        .replace(/"sf":/g, '"sinif":')
        .replace(/"cs":/g, '"cinsiyet":')
        .replace(/"i":/g, '"id":');
      
      return JSON.parse(decompressed);
    } catch (error) {
      logger.warn('⚠️ Açma hatası, orijinal veri kullanılıyor:', error);
      return compressedData;
    }
  }

  /**
   * Eski planları temizle (quota hatası önleme)
   */
  async cleanupOldPlans() {
    try {
      const plans = await this.plans.orderBy('createdAt').toArray();
      
      // En eski 3 planı sil (en az 5 plan kalacak şekilde)
      if (plans.length > 5) {
        const plansToDelete = plans.slice(0, plans.length - 5);
        
        for (const plan of plansToDelete) {
          await this.plans.delete(plan.id);
          logger.info('🗑️ Eski plan silindi:', plan.id, plan.name);
        }
        
        logger.info(`✅ ${plansToDelete.length} eski plan temizlendi`);
      }
    } catch (error) {
      logger.error('❌ Plan temizleme hatası:', error);
    }
  }
}

// Singleton instance
const db = new KelebekDatabase();

export default db;

