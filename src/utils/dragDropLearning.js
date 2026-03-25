/**
 * Drag & Drop Öğrenme Sistemi
 * Kullanıcının manuel düzenlemelerini AI'ye öğretir
 */

import logger from './logger';
import { findEnBosSalonlar } from '../algorithms/gelismisYerlestirmeAlgoritmasi';

class DragDropLearningSystem {
  constructor() {
    this.learningData = {
      // Kullanıcı tercihleri
      userPreferences: {
        genderPlacements: [], // Cinsiyet yerleştirme tercihleri
        classPlacements: [], // Sınıf yerleştirme tercihleri
        neighborPreferences: [], // Komşu tercihleri
        riskAvoidance: [] // Risk kaçınma tercihleri
      },
      
      // Öğrenme istatistikleri
      learningStats: {
        totalMoves: 0,
        successfulMoves: 0,
        failedMoves: 0,
        learningRate: 0.1
      },
      
      // Ağırlık güncellemeleri
      weightUpdates: []
    };
    
    // Debounce için timer
    this.saveTimer = null;
    this.SAVE_DELAY = 2000; // 2 saniye bekle
    
    this.loadLearningData();
  }

  // En boş salonları doğru veri kaynağından analiz et (koltukMatrisi -> masalar -> gruplar)
  analyzeEmptiestSalons(yerlesilemeyenOgrenciler, tumSalonlar, ayarlar = {}, yerlestirmeSonucu = null) {
    try {
      logger.info('🔍 Yerleşemeyen öğrenciler için en boş salonlar aranıyor...');
      // KAYNAK DÜZELTME: varsa yerlestirmeSonucu.tumSalonlar kullan
      const salonKaynak = Array.isArray(yerlestirmeSonucu?.tumSalonlar)
        ? yerlestirmeSonucu.tumSalonlar
        : tumSalonlar;
      const sonuc = findEnBosSalonlar(yerlesilemeyenOgrenciler, salonKaynak, ayarlar);

      logger.info('📊 Salon boşluk analizi tamamlandı:');
      (sonuc.enBosSalonlar || []).forEach((s, i) => {
        logger.info(`   ${i + 1}. ${s.salonAdi}: ${s.bosKoltuk} boş koltuk (%${s.dolulukOrani?.toFixed?.(1) ?? 0} dolu)`);
      });

      return sonuc;
    } catch (e) {
      logger.warn('⚠️ En boş salon analizi başarısız, fallback hesap kullanılacak:', e);
      // Fallback: güvenli, basit bir hesap (yalnızca masalar üzerinden)
      const kaynaks = Array.isArray(yerlestirmeSonucu?.tumSalonlar) ? yerlestirmeSonucu.tumSalonlar : tumSalonlar;
      const enBosSalonlar = (Array.isArray(kaynaks) ? kaynaks : []).map(salon => {
        const masalar = salon?.koltukMatrisi?.masalar || salon?.masalar || [];
        let kapasite = salon?.kapasite || masalar.length || 0;
        let mevcutDoluluk = masalar.filter(m => m && m.ogrenci).length;
        // Ek düzeltme: masalar boş ama ogrenciler listesi doluysa onu kullan
        if (mevcutDoluluk === 0 && Array.isArray(salon?.ogrenciler) && salon.ogrenciler.length > 0) {
          mevcutDoluluk = salon.ogrenciler.length;
          if (kapasite === 0) kapasite = mevcutDoluluk; // kapasite bilgisi yoksa asgari olarak mevcut doluluk kadar varsay
        }
        const bosKoltuk = Math.max(0, kapasite - mevcutDoluluk);
        const dolulukOrani = kapasite > 0 ? (mevcutDoluluk / kapasite) * 100 : 0;
        return {
          salonId: salon.id,
          salonAdi: salon.salonAdi || salon.ad || String(salon.id),
          bosKoltuk,
          dolulukOrani,
          kapasite,
          mevcutDoluluk,
          boslukSkoru: kapasite > 0 ? (bosKoltuk / kapasite) : 0
        };
      }).sort((a, b) => b.boslukSkoru - a.boslukSkoru);

      // Teşhis logu
      const ornek = enBosSalonlar[0];
      if (ornek && ornek.kapasite > 0 && enBosSalonlar.every(s => s.mevcutDoluluk === 0)) {
        logger.warn('⚠️ Teşhis: tumSalonlar kaynağı muhtemelen eski/stale. yerlestirmeSonucu.tumSalonlar kullanılmalı.');
      }

      return {
        enBosSalonlar,
        yerlesilemeyenOgrenciler,
        oneriler: [],
        toplamBosKoltuk: enBosSalonlar.reduce((t, s) => t + s.bosKoltuk, 0),
        yerlesilemeyenOgrenciSayisi: yerlesilemeyenOgrenciler?.length || 0
      };
    }
  }

  /**
   * Drag & Drop hareketini kaydet ve öğren
   */
  recordMove(fromMasaId, toMasaId, student, context) {
    const moveData = {
      timestamp: Date.now(),
      fromMasaId,
      toMasaId,
      student: {
        id: student.id,
        ad: student.ad,
        soyad: student.soyad,
        cinsiyet: student.cinsiyet,
        sinif: student.sinif,
        gecmisSkor: student.gecmisSkor,
        ozelDurum: student.ozelDurum
      },
      context: {
        salonId: context.salonId,
        salonAdi: context.salonAdi,
        totalStudents: context.totalStudents,
        currentPlan: context.currentPlan
      }
    };

    // Hareketi kaydet
    this.learningData.learningStats.totalMoves++;
    
    // Öğrenme analizi yap
    this.analyzeMove(moveData);
    
    // Ağırlıkları güncelle
    this.updateWeights(moveData);
    
    // Veriyi debounce ile kaydet (her hareketten sonra değil, belli aralıklarla)
    this.debouncedSave();
    
    logger.info('🎓 Drag & Drop öğrenme kaydedildi:', {
      student: student.ad,
      from: fromMasaId,
      to: toMasaId,
      totalMoves: this.learningData.learningStats.totalMoves
    });
  }

  /**
   * Hareket analizi yap
   */
  analyzeMove(moveData) {
    const { student, fromMasaId, toMasaId, context } = moveData;
    
    // Cinsiyet analizi
    if (student.cinsiyet) {
      this.learningData.userPreferences.genderPlacements.push({
        student: student,
        fromMasaId,
        toMasaId,
        preference: this.analyzeGenderPreference(student, context)
      });
    }
    
    // Sınıf analizi
    if (student.sinif) {
      this.learningData.userPreferences.classPlacements.push({
        student: student,
        fromMasaId,
        toMasaId,
        preference: this.analyzeClassPreference(student, context)
      });
    }
    
    // Komşu analizi
    this.learningData.userPreferences.neighborPreferences.push({
      student: student,
      fromMasaId,
      toMasaId,
      preference: this.analyzeNeighborPreference(student, context)
    });
    
    // Risk analizi
    this.learningData.userPreferences.riskAvoidance.push({
      student: student,
      fromMasaId,
      toMasaId,
      preference: this.analyzeRiskPreference(student, context)
    });
  }

  /**
   * Cinsiyet tercihi analizi
   */
  analyzeGenderPreference(student, context) {
    // Komşu cinsiyet analizi
    const neighborGenders = this.getNeighborGenders(context.currentPlan, student);
    const genderDiversity = this.calculateGenderDiversity(student, neighborGenders);
    
    return {
      type: 'gender',
      diversity: genderDiversity,
      preference: genderDiversity > 0.5 ? 'diverse' : 'similar',
      confidence: Math.abs(genderDiversity - 0.5) * 2
    };
  }

  /**
   * Sınıf tercihi analizi
   */
  analyzeClassPreference(student, context) {
    const neighborClasses = this.getNeighborClasses(context.currentPlan, student);
    const classDiversity = this.calculateClassDiversity(student, neighborClasses);
    
    return {
      type: 'class',
      diversity: classDiversity,
      preference: classDiversity > 0.5 ? 'diverse' : 'similar',
      confidence: Math.abs(classDiversity - 0.5) * 2
    };
  }

  /**
   * Komşu tercihi analizi
   */
  analyzeNeighborPreference(student, context) {
    const neighbors = this.getNeighbors(context.currentPlan, student);
    const neighborCount = neighbors.length;
    const emptyNeighbors = this.getEmptyNeighbors(context.currentPlan, student);
    
    return {
      type: 'neighbor',
      neighborCount,
      emptyNeighbors,
      preference: emptyNeighbors > neighborCount ? 'isolated' : 'social',
      confidence: Math.abs(emptyNeighbors - neighborCount) / Math.max(emptyNeighbors, neighborCount, 1)
    };
  }

  /**
   * Risk tercihi analizi
   */
  analyzeRiskPreference(student, context) {
    const riskFactors = this.calculateRiskFactors(student, context);
    const riskLevel = this.calculateRiskLevel(riskFactors);
    
    return {
      type: 'risk',
      riskLevel,
      factors: riskFactors,
      preference: riskLevel < 0.3 ? 'low_risk' : riskLevel > 0.7 ? 'high_risk' : 'medium_risk',
      confidence: Math.abs(riskLevel - 0.5) * 2
    };
  }

  /**
   * Ağırlıkları güncelle
   */
  updateWeights(moveData) {
    const { student, fromMasaId, toMasaId } = moveData;
    
    // Kullanılmayan parametreleri işaretle
    void student;
    void fromMasaId;
    void toMasaId;
    
    // Mevcut ağırlıkları al
    const currentWeights = this.getCurrentWeights();
    
    // Yeni ağırlıkları hesapla
    const newWeights = this.calculateNewWeights(currentWeights, moveData);
    
    // Ağırlık güncellemesini kaydet
    this.learningData.weightUpdates.push({
      timestamp: Date.now(),
      oldWeights: currentWeights,
      newWeights: newWeights,
      moveData: moveData
    });
    
    // Ağırlıkları güncelle
    this.setWeights(newWeights);
    
    logger.info('⚖️ Ağırlıklar güncellendi:', newWeights);
  }

  /**
   * Yeni ağırlıkları hesapla
   */
  calculateNewWeights(currentWeights, moveData) {
    const learningRate = this.learningData.learningStats.learningRate;
    const newWeights = { ...currentWeights };
    
    // Cinsiyet ağırlığı güncelleme
    if (moveData.student.cinsiyet) {
      const genderPreference = this.analyzeGenderPreference(moveData.student, moveData.context);
      const genderUpdate = learningRate * genderPreference.confidence * (genderPreference.diversity - 0.5);
      newWeights.genderBalance += genderUpdate;
    }
    
    // Sınıf ağırlığı güncelleme
    if (moveData.student.sinif) {
      const classPreference = this.analyzeClassPreference(moveData.student, moveData.context);
      const classUpdate = learningRate * classPreference.confidence * (classPreference.diversity - 0.5);
      newWeights.classLevelMix += classUpdate;
    }
    
    // Komşu ağırlığı güncelleme
    const neighborPreference = this.analyzeNeighborPreference(moveData.student, moveData.context);
    const neighborUpdate = learningRate * neighborPreference.confidence * (neighborPreference.emptyNeighbors - neighborPreference.neighborCount);
    newWeights.neighborIsolation += neighborUpdate;
    
    // Risk ağırlığı güncelleme
    const riskPreference = this.analyzeRiskPreference(moveData.student, moveData.context);
    const riskUpdate = learningRate * riskPreference.confidence * (0.5 - riskPreference.riskLevel);
    newWeights.riskAvoidance += riskUpdate;
    
    // Ağırlıkları normalize et
    return this.normalizeWeights(newWeights);
  }

  /**
   * Öğrenme verilerini AI sistemine aktar
   */
  transferToAI() {
    const aiWeights = this.calculateAIWeights();
    const learningSuggestions = this.generateLearningSuggestions();
    
    return {
      weights: aiWeights,
      suggestions: learningSuggestions,
      confidence: this.calculateLearningConfidence()
    };
  }

  /**
   * AI ağırlıklarını hesapla
   */
  calculateAIWeights() {
    const recentMoves = this.learningData.userPreferences.genderPlacements.slice(-10);
    const genderWeight = this.calculateAveragePreference(recentMoves, 'gender');
    const classWeight = this.calculateAveragePreference(recentMoves, 'class');
    const neighborWeight = this.calculateAveragePreference(recentMoves, 'neighbor');
    const riskWeight = this.calculateAveragePreference(recentMoves, 'risk');
    
    return {
      genderBalance: genderWeight,
      classLevelMix: classWeight,
      neighborIsolation: neighborWeight,
      riskAvoidance: riskWeight
    };
  }

  /**
   * Öğrenme önerileri oluştur
   */
  generateLearningSuggestions() {
    const suggestions = [];
    
    // Cinsiyet çeşitliliği önerisi
    const genderDiversity = this.calculateAverageDiversity('gender');
    if (genderDiversity < 0.3) {
      suggestions.push({
        type: 'gender_diversity',
        message: 'Cinsiyet çeşitliliğini artırmayı tercih ediyorsunuz',
        weight: 0.8
      });
    }
    
    // Sınıf çeşitliliği önerisi
    const classDiversity = this.calculateAverageDiversity('class');
    if (classDiversity < 0.3) {
      suggestions.push({
        type: 'class_diversity',
        message: 'Sınıf çeşitliliğini artırmayı tercih ediyorsunuz',
        weight: 0.6
      });
    }
    
    // Komşu tercihi önerisi
    const neighborPreference = this.calculateAverageNeighborPreference();
    if (neighborPreference > 0.7) {
      suggestions.push({
        type: 'neighbor_isolation',
        message: 'Öğrencileri izole etmeyi tercih ediyorsunuz',
        weight: 0.9
      });
    }
    
    return suggestions;
  }

  /**
   * Öğrenme güvenini hesapla
   */
  calculateLearningConfidence() {
    const totalMoves = this.learningData.learningStats.totalMoves;
    const successfulMoves = this.learningData.learningStats.successfulMoves;
    
    if (totalMoves === 0) return 0;
    
    const successRate = successfulMoves / totalMoves;
    const dataVolume = Math.min(totalMoves / 50, 1); // 50 hareket = %100 güven
    
    return (successRate * 0.7 + dataVolume * 0.3);
  }

  // Yardımcı fonksiyonlar
  getNeighborGenders(plan, student) {
    // Komşu cinsiyetleri hesapla
    return [];
  }

  getNeighborClasses(plan, student) {
    // Komşu sınıfları hesapla
    return [];
  }

  getNeighbors(plan, student) {
    // Komşuları hesapla
    return [];
  }

  getEmptyNeighbors(plan, student) {
    // Boş komşuları hesapla
    return 0;
  }

  calculateGenderDiversity(student, neighborGenders) {
    // Cinsiyet çeşitliliği hesapla
    return 0.5;
  }

  calculateClassDiversity(student, neighborClasses) {
    // Sınıf çeşitliliği hesapla
    return 0.5;
  }

  calculateRiskFactors(student, context) {
    // Risk faktörlerini hesapla
    return {};
  }

  calculateRiskLevel(riskFactors) {
    // Risk seviyesini hesapla
    return 0.5;
  }

  getCurrentWeights() {
    // Mevcut ağırlıkları al
    return {
      genderBalance: 0.5,
      classLevelMix: 0.5,
      neighborIsolation: 0.5,
      riskAvoidance: 0.5
    };
  }

  setWeights(weights) {
    // Ağırlıkları ayarla
    this.learningData.currentWeights = weights;
  }

  normalizeWeights(weights) {
    // Ağırlıkları normalize et
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const normalized = {};
    for (const [key, value] of Object.entries(weights)) {
      normalized[key] = value / total;
    }
    return normalized;
  }

  calculateAveragePreference(moves, type) {
    // Ortalama tercihi hesapla
    return 0.5;
  }

  calculateAverageDiversity(type) {
    // Ortalama çeşitliliği hesapla
    return 0.5;
  }

  calculateAverageNeighborPreference() {
    // Ortalama komşu tercihini hesapla
    return 0.5;
  }

  // Veri yönetimi - HİBRİT SİSTEM
  saveLearningData() {
    try {
      // Veri boyutunu kontrol et ve temizle
      this.cleanupOldData();
      
      // Veriyi serialize et
      const jsonData = JSON.stringify(this.learningData);
      const dataSize = new Blob([jsonData]).size;
      
      // localStorage limit kontrolü (yaklaşık 5MB)
      const maxSize = 4 * 1024 * 1024; // 4MB güvenli limit
      
      if (dataSize > maxSize) {
        logger.warn(`⚠️ Drag & Drop verisi çok büyük (${(dataSize / 1024).toFixed(2)} KB), agresif temizlik yapılıyor...`);
        this.aggressiveCleanup();
        
        // Tekrar dene - temizlik sonrası
        const cleanedData = JSON.stringify(this.learningData);
        const cleanedSize = new Blob([cleanedData]).size;
        
        if (cleanedSize > maxSize) {
          logger.error('❌ Veri hala çok büyük, öğrenme verisi sıfırlanıyor...');
          this.resetLearningData();
        }
      }
      
      // 1. Local Storage'a kaydet
      localStorage.setItem('dragDropLearning', JSON.stringify(this.learningData));
      
      // 2. Production'da sunucuya da gönder
      if (process.env.NODE_ENV === 'production') {
        this.syncToServer();
      }
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        logger.error('❌ localStorage quota aşıldı, veriler temizleniyor...');
        // Agresif temizlik yap
        this.aggressiveCleanup();
        try {
          // Tekrar dene
          localStorage.setItem('dragDropLearning', JSON.stringify(this.learningData));
          logger.info('✅ Veriler temizlendikten sonra kaydedildi');
        } catch (retryError) {
          // Hala sığmıyorsa öğrenme verilerini sıfırla
          logger.error('❌ Temizlikten sonra da kaydedilemedi, öğrenme verisi sıfırlanıyor...');
          this.resetLearningData();
          try {
            localStorage.setItem('dragDropLearning', JSON.stringify(this.learningData));
          } catch (finalError) {
            logger.error('❌ Kritik hata: localStorage tamamen dolu, kayıt yapılamıyor');
          }
        }
      } else {
        logger.error('Drag & Drop öğrenme verisi kaydedilemedi:', error);
      }
    }
  }
  
  // Eski verileri temizle
  cleanupOldData() {
    const MAX_MOVES = 1000; // Maksimum hareket kaydı
    const MAX_PREFERENCES = 500; // Maksimum tercih kaydı
    
    // Eski hareket kayıtlarını temizle (eğer varsa)
    if (this.learningData.userPreferences?.genderPlacements?.length > MAX_PREFERENCES) {
      this.learningData.userPreferences.genderPlacements = 
        this.learningData.userPreferences.genderPlacements.slice(-MAX_PREFERENCES);
    }
    
    if (this.learningData.userPreferences?.classPlacements?.length > MAX_PREFERENCES) {
      this.learningData.userPreferences.classPlacements = 
        this.learningData.userPreferences.classPlacements.slice(-MAX_PREFERENCES);
    }
    
    if (this.learningData.userPreferences?.neighborPreferences?.length > MAX_PREFERENCES) {
      this.learningData.userPreferences.neighborPreferences = 
        this.learningData.userPreferences.neighborPreferences.slice(-MAX_PREFERENCES);
    }
    
    if (this.learningData.userPreferences?.riskAvoidance?.length > MAX_PREFERENCES) {
      this.learningData.userPreferences.riskAvoidance = 
        this.learningData.userPreferences.riskAvoidance.slice(-MAX_PREFERENCES);
    }
    
    // Weight updates listesini temizle
    if (this.learningData.weightUpdates?.length > MAX_MOVES) {
      this.learningData.weightUpdates = 
        this.learningData.weightUpdates.slice(-MAX_MOVES);
    }
  }
  
  // Agresif temizlik (daha fazla veri sil)
  aggressiveCleanup() {
    const AGGRESSIVE_MAX = 100; // Çok daha az kayıt tut
    
    if (this.learningData.userPreferences?.genderPlacements) {
      this.learningData.userPreferences.genderPlacements = 
        this.learningData.userPreferences.genderPlacements.slice(-AGGRESSIVE_MAX);
    }
    
    if (this.learningData.userPreferences?.classPlacements) {
      this.learningData.userPreferences.classPlacements = 
        this.learningData.userPreferences.classPlacements.slice(-AGGRESSIVE_MAX);
    }
    
    if (this.learningData.userPreferences?.neighborPreferences) {
      this.learningData.userPreferences.neighborPreferences = 
        this.learningData.userPreferences.neighborPreferences.slice(-AGGRESSIVE_MAX);
    }
    
    if (this.learningData.userPreferences?.riskAvoidance) {
      this.learningData.userPreferences.riskAvoidance = 
        this.learningData.userPreferences.riskAvoidance.slice(-AGGRESSIVE_MAX);
    }
    
    if (this.learningData.weightUpdates) {
      this.learningData.weightUpdates = 
        this.learningData.weightUpdates.slice(-AGGRESSIVE_MAX);
    }
    
    logger.info('🧹 Agresif temizlik tamamlandı, veriler %90 azaltıldı');
  }
  
  // Öğrenme verilerini sıfırla
  resetLearningData() {
    // Sadece istatistikleri koru, tüm detaylı verileri temizle
    const stats = this.learningData.learningStats || {
      totalMoves: 0,
      successfulMoves: 0,
      failedMoves: 0,
      learningRate: 0.1
    };
    
    this.learningData = {
      userPreferences: {
        genderPlacements: [],
        classPlacements: [],
        neighborPreferences: [],
        riskAvoidance: []
      },
      learningStats: stats,
      weightUpdates: []
    };
    
    logger.warn('⚠️ Öğrenme verileri sıfırlandı (localStorage quota aşıldı)');
  }

  loadLearningData() {
    try {
      // 1. Local Storage'dan yükle
      const saved = localStorage.getItem('dragDropLearning');
      if (saved) {
        this.learningData = { ...this.learningData, ...JSON.parse(saved) };
        
        // Yüklerken veri temizliği yap
        this.cleanupOldData();
        
        // Temizlenmiş veriyi kaydet (eğer değişiklik varsa)
        try {
          localStorage.setItem('dragDropLearning', JSON.stringify(this.learningData));
        } catch (error) {
          // Kaydedilemezse temizlik yap
          if (error.name === 'QuotaExceededError') {
            logger.warn('⚠️ Yükleme sırasında quota aşıldı, agresif temizlik yapılıyor...');
            this.aggressiveCleanup();
            try {
              localStorage.setItem('dragDropLearning', JSON.stringify(this.learningData));
            } catch (retryError) {
              logger.error('❌ Temizlikten sonra da kaydedilemedi, veri sıfırlanıyor...');
              this.resetLearningData();
            }
          }
        }
      }
      
      // 2. Production'da sunucudan da senkronize et
      if (process.env.NODE_ENV === 'production') {
        this.syncFromServer();
      }
    } catch (error) {
      logger.error('Drag & Drop öğrenme verisi yüklenemedi:', error);
      // Hata durumunda veriyi sıfırla
      this.resetLearningData();
    }
  }
  
  // Debounced save - performans için
  debouncedSave() {
    // Önceki timer'ı iptal et
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    // Yeni timer başlat
    this.saveTimer = setTimeout(() => {
      this.saveLearningData();
      this.saveTimer = null;
    }, this.SAVE_DELAY);
  }

  // YENİ: Sunucu senkronizasyonu
  async syncToServer() {
    try {
      const response = await fetch('/api/learning-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceId: this.getDeviceId(),
          learningData: this.learningData,
          timestamp: Date.now()
        })
      });

      if (response.ok) {
        logger.debug('🔄 Sunucuya öğrenme verileri gönderildi');
      }
    } catch (error) {
      logger.warn('⚠️ Sunucu senkronizasyonu başarısız:', error);
    }
  }

  async syncFromServer() {
    try {
      const response = await fetch(`/api/learning-data/${this.getDeviceId()}`);
      
      if (response.ok) {
        const serverData = await response.json();
        if (serverData.success) {
          // Sunucu verisi ile local veriyi birleştir
          this.mergeServerData(serverData.data);
          logger.debug('🔄 Sunucudan öğrenme verileri alındı');
        }
      }
    } catch (error) {
      logger.warn('⚠️ Sunucudan veri alınamadı:', error);
    }
  }

  getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  mergeServerData(serverData) {
    // Ağırlıkları birleştir
    this.learningData.weights = {
      ...this.learningData.weights,
      ...serverData.weights
    };

    // İstatistikleri topla
    this.learningData.learningStats.totalMoves += serverData.learningStats?.totalMoves || 0;
    this.learningData.learningStats.successfulMoves += serverData.learningStats?.successfulMoves || 0;
    this.learningData.learningStats.failedMoves += serverData.learningStats?.failedMoves || 0;
  }

  // İstatistikler
  getLearningStats() {
    return {
      totalMoves: this.learningData.learningStats.totalMoves,
      successfulMoves: this.learningData.learningStats.successfulMoves,
      failedMoves: this.learningData.learningStats.failedMoves,
      successRate: this.learningData.learningStats.totalMoves > 0 ? 
        this.learningData.learningStats.successfulMoves / this.learningData.learningStats.totalMoves : 0,
      confidence: this.calculateLearningConfidence()
    };
  }

  // Öğrenme verilerini temizle
  clearLearningData() {
    this.learningData = {
      userPreferences: {
        genderPlacements: [],
        classPlacements: [],
        neighborPreferences: [],
        riskAvoidance: []
      },
      learningStats: {
        totalMoves: 0,
        successfulMoves: 0,
        failedMoves: 0,
        learningRate: 0.1
      },
      weightUpdates: []
    };
    this.saveLearningData();
  }
}

// Singleton instance
const dragDropLearning = new DragDropLearningSystem();

export default dragDropLearning;
