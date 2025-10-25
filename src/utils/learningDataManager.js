/**
 * ============================================================================
 * MAKİNE ÖĞRENMESİ VERİ YÖNETİCİSİ
 * ============================================================================
 * 
 * Bu sistem hem local storage hem de sunucu veritabanı ile çalışır
 * - Geliştirme: Local Storage kullanır
 * - Production: Sunucu veritabanı kullanır
 * - Otomatik senkronizasyon sağlar
 */

import logger from './logger';

class LearningDataManager {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.learningData = {
      // AI ağırlıkları
      weights: {
        genderBalance: 0.2,
        classLevelMix: 0.15,
        medicalNeeds: 0.4,
        groupPreservation: 0.25
      },
      
      // Öğrenme istatistikleri
      learningStats: {
        totalMoves: 0,
        successfulMoves: 0,
        failedMoves: 0,
        averageScore: 0,
        lastUpdated: Date.now()
      },
      
      // Kullanıcı tercihleri
      userPreferences: {
        genderPreferences: { same: 0, different: 0 },
        classPreferences: { same: 0, different: 0 },
        spatialPreferences: { corner: 0, center: 0, edge: 0 }
      },
      
      // Geçmiş veriler
      moveHistory: [],
      placementHistory: [],
      
      // Sistem bilgileri
      systemInfo: {
        version: '2.0',
        lastSync: null,
        deviceId: this.generateDeviceId()
      }
    };
    
    this.loadData();
  }

  /**
   * Cihaz ID'si oluştur (kullanıcı tanımlama için)
   */
  generateDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  /**
   * Veri yükleme - Önce local, sonra sunucu
   */
  async loadData() {
    try {
      // 1. Local Storage'dan yükle
      this.loadFromLocal();
      
      // 2. Production'da sunucudan senkronize et
      if (this.isProduction) {
        await this.syncFromServer();
      }
      
      logger.info('📚 Öğrenme verileri yüklendi:', {
        source: this.isProduction ? 'Sunucu + Local' : 'Local',
        totalMoves: this.learningData.learningStats.totalMoves
      });
      
    } catch (error) {
      logger.error('❌ Öğrenme verileri yüklenirken hata:', error);
      // Hata durumunda local veriyi kullan
      this.loadFromLocal();
    }
  }

  /**
   * Local Storage'dan yükle
   */
  loadFromLocal() {
    try {
      const saved = localStorage.getItem('learningData');
      if (saved) {
        const localData = JSON.parse(saved);
        this.learningData = { ...this.learningData, ...localData };
      }
    } catch (error) {
      logger.error('❌ Local Storage yüklenirken hata:', error);
    }
  }

  /**
   * Sunucudan senkronize et
   */
  async syncFromServer() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/learning-data`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Device-ID': this.learningData.systemInfo.deviceId
        }
      });

      if (response.ok) {
        const serverData = await response.json();
        
        // Sunucu verisi ile local veriyi birleştir
        this.mergeLearningData(serverData);
        
        logger.info('🔄 Sunucudan öğrenme verileri senkronize edildi');
      }
    } catch (error) {
      logger.warn('⚠️ Sunucu senkronizasyonu başarısız, local veri kullanılıyor:', error);
    }
  }

  /**
   * Veri birleştirme - Sunucu + Local
   */
  mergeLearningData(serverData) {
    // Ağırlıkları birleştir (sunucu öncelikli)
    this.learningData.weights = {
      ...this.learningData.weights,
      ...serverData.weights
    };

    // İstatistikleri topla
    this.learningData.learningStats.totalMoves += serverData.learningStats?.totalMoves || 0;
    this.learningData.learningStats.successfulMoves += serverData.learningStats?.successfulMoves || 0;
    this.learningData.learningStats.failedMoves += serverData.learningStats?.failedMoves || 0;

    // Geçmiş verileri birleştir
    this.learningData.moveHistory = [
      ...this.learningData.moveHistory,
      ...(serverData.moveHistory || [])
    ].slice(-1000); // Son 1000 hareket

    // Son güncelleme zamanını güncelle
    this.learningData.learningStats.lastUpdated = Date.now();
  }

  /**
   * Veri kaydetme - Hem local hem sunucu
   */
  async saveData() {
    try {
      // 1. Local Storage'a kaydet
      this.saveToLocal();
      
      // 2. Production'da sunucuya gönder
      if (this.isProduction) {
        await this.syncToServer();
      }
      
      logger.debug('💾 Öğrenme verileri kaydedildi');
      
    } catch (error) {
      logger.error('❌ Öğrenme verileri kaydedilirken hata:', error);
    }
  }

  /**
   * Local Storage'a kaydet
   */
  saveToLocal() {
    try {
      localStorage.setItem('learningData', JSON.stringify(this.learningData));
    } catch (error) {
      logger.error('❌ Local Storage kaydedilirken hata:', error);
    }
  }

  /**
   * Sunucuya senkronize et
   */
  async syncToServer() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/learning-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Device-ID': this.learningData.systemInfo.deviceId
        },
        body: JSON.stringify({
          deviceId: this.learningData.systemInfo.deviceId,
          weights: this.learningData.weights,
          learningStats: this.learningData.learningStats,
          userPreferences: this.learningData.userPreferences,
          moveHistory: this.learningData.moveHistory.slice(-100), // Son 100 hareket
          lastUpdated: Date.now()
        })
      });

      if (response.ok) {
        logger.info('🔄 Sunucuya öğrenme verileri gönderildi');
      } else {
        logger.warn('⚠️ Sunucuya veri gönderilemedi:', response.status);
      }
    } catch (error) {
      logger.warn('⚠️ Sunucu senkronizasyonu başarısız:', error);
    }
  }

  /**
   * Drag & Drop hareketini kaydet
   */
  recordMove(fromMasaId, toMasaId, student, context) {
    const moveData = {
      id: Date.now() + Math.random(),
      timestamp: Date.now(),
      fromMasaId,
      toMasaId,
      student: {
        id: student.id,
        ad: student.ad,
        cinsiyet: student.cinsiyet,
        sinif: student.sinif
      },
      context: {
        salonId: context.salonId,
        totalStudents: context.totalStudents
      }
    };

    // Hareketi kaydet
    this.learningData.moveHistory.push(moveData);
    this.learningData.learningStats.totalMoves++;

    // Tercih analizi
    this.analyzePreferences(moveData);

    // Ağırlıkları güncelle
    this.updateWeights(moveData);

    // Veriyi kaydet
    this.saveData();

    logger.debug('🎓 Hareket kaydedildi:', moveData);
  }

  /**
   * Kullanıcı tercihlerini analiz et
   */
  analyzePreferences(moveData) {
    // Cinsiyet tercihi analizi
    if (moveData.student.cinsiyet) {
      // Basit analiz - gerçek uygulamada daha karmaşık olabilir
      this.learningData.userPreferences.genderPreferences.same += 0.1;
    }

    // Sınıf tercihi analizi
    if (moveData.student.sinif) {
      this.learningData.userPreferences.classPreferences.same += 0.1;
    }
  }

  /**
   * AI ağırlıklarını güncelle
   */
  updateWeights(moveData) {
    const learningRate = 0.01;
    
    // Başarılı hareket varsa ağırlıkları artır
    this.learningData.weights.genderBalance += learningRate;
    this.learningData.weights.classLevelMix += learningRate;
    
    // Ağırlıkları normalize et
    this.normalizeWeights();
  }

  /**
   * Ağırlıkları normalize et
   */
  normalizeWeights() {
    const total = Object.values(this.learningData.weights).reduce((sum, w) => sum + w, 0);
    if (total > 0) {
      for (const key in this.learningData.weights) {
        this.learningData.weights[key] = this.learningData.weights[key] / total;
      }
    }
  }

  /**
   * Öğrenme istatistiklerini al
   */
  getLearningStats() {
    return {
      ...this.learningData.learningStats,
      weights: this.learningData.weights,
      userPreferences: this.learningData.userPreferences,
      totalMoves: this.learningData.moveHistory.length,
      lastSync: this.learningData.systemInfo.lastSync
    };
  }

  /**
   * Öğrenme verilerini temizle
   */
  clearLearningData() {
    this.learningData = {
      weights: {
        genderBalance: 0.2,
        classLevelMix: 0.15,
        medicalNeeds: 0.4,
        groupPreservation: 0.25
      },
      learningStats: {
        totalMoves: 0,
        successfulMoves: 0,
        failedMoves: 0,
        averageScore: 0,
        lastUpdated: Date.now()
      },
      userPreferences: {
        genderPreferences: { same: 0, different: 0 },
        classPreferences: { same: 0, different: 0 },
        spatialPreferences: { corner: 0, center: 0, edge: 0 }
      },
      moveHistory: [],
      placementHistory: [],
      systemInfo: {
        version: '2.0',
        lastSync: null,
        deviceId: this.learningData.systemInfo.deviceId
      }
    };
    
    this.saveData();
    logger.info('🗑️ Öğrenme verileri temizlendi');
  }

  /**
   * Veri dışa aktarma (backup için)
   */
  exportLearningData() {
    return {
      ...this.learningData,
      exportDate: new Date().toISOString(),
      version: '2.0'
    };
  }

  /**
   * Veri içe aktarma (restore için)
   */
  importLearningData(data) {
    try {
      this.learningData = { ...this.learningData, ...data };
      this.saveData();
      logger.info('📥 Öğrenme verileri içe aktarıldı');
    } catch (error) {
      logger.error('❌ Veri içe aktarılırken hata:', error);
    }
  }
}

// Singleton instance
const learningDataManager = new LearningDataManager();

export default learningDataManager;





