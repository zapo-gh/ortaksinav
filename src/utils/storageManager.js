/**
 * ============================================================================
 * GELİŞMİŞ VERİ SAKLAMA YÖNETİCİSİ
 * ============================================================================
 * 
 * Local Storage quota aşımını önler
 * - Veri sıkıştırma
 * - Otomatik temizlik
 * - Alternatif saklama
 */

import logger from './logger';

class StorageManager {
  constructor() {
    this.maxStorageSize = 8 * 1024 * 1024; // 8MB limit (daha yüksek)
    this.compressionEnabled = false; // Sıkıştırmayı kapat
    this.autoCleanup = true;
    this.aggressiveCompression = false; // Agresif sıkıştırmayı kapat
  }

  /**
   * Veri sıkıştırma (basit algoritma)
   */
  compressData(data) {
    if (!this.compressionEnabled) return data;
    
    try {
      // Gereksiz alanları kaldır
      const compressed = this.removeUnnecessaryFields(data);
      
      // JSON string'i sıkıştır
      const jsonString = JSON.stringify(compressed);
      
      // Tekrarlayan karakterleri kısalt
      return this.simpleCompress(jsonString);
    } catch (error) {
      logger.error('Veri sıkıştırma hatası:', error);
      return data;
    }
  }

  /**
   * Sıkıştırılmış veriyi aç
   */
  decompressData(compressedData) {
    if (!this.compressionEnabled) return compressedData;
    
    try {
      const jsonString = this.simpleDecompress(compressedData);
      return JSON.parse(jsonString);
    } catch (error) {
      logger.error('Veri açma hatası:', error);
      return compressedData;
    }
  }

  /**
   * Gereksiz alanları kaldır
   */
  removeUnnecessaryFields(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.removeUnnecessaryFields(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const cleaned = {};
      for (const [key, value] of Object.entries(data)) {
        // Gereksiz alanları atla
        if (this.isUnnecessaryField(key, value)) continue;
        
        cleaned[key] = this.removeUnnecessaryFields(value);
      }
      return cleaned;
    }
    
    return data;
  }

  /**
   * Gereksiz alan kontrolü
   */
  isUnnecessaryField(key, value) {
    const unnecessaryFields = [
      'temp', 'cache', 'debug', 'log', 'timestamp',
      'createdAt', 'updatedAt', 'version', 'id'
    ];
    
    return unnecessaryFields.includes(key) || 
           value === null || 
           value === undefined ||
           (typeof value === 'string' && value.length === 0);
  }

  /**
   * Basit sıkıştırma algoritması
   */
  simpleCompress(str) {
    if (!this.aggressiveCompression) {
      // Normal sıkıştırma
      return str
        .replace(/(.)\1{2,}/g, (match, char) => `${char}*${match.length}`)
        .replace(/\s{2,}/g, ' ')
        .replace(/"/g, "'");
    }
    
    // Agresif sıkıştırma
    return str
      .replace(/(.)\1{2,}/g, (match, char) => `${char}*${match.length}`)
      .replace(/\s{2,}/g, ' ')
      .replace(/"/g, "'")
      .replace(/([a-zA-Z])\1{1,}/g, (match, char) => `${char}${match.length}`)
      .replace(/([0-9])\1{1,}/g, (match, char) => `${char}${match.length}`)
      .replace(/\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/g, '')
      .replace(/\b(id|ad|soyad|cinsiyet|sinif|durum|ozellikler|kapasite|satir|sutun|kat|binadi)\b/g, (match) => {
        const shortMap = {
          'id': 'i', 'ad': 'a', 'soyad': 's', 'cinsiyet': 'c',
          'sinif': 'sn', 'durum': 'd', 'ozellikler': 'oz',
          'kapasite': 'k', 'satir': 'st', 'sutun': 'su',
          'kat': 'kt', 'binadi': 'b'
        };
        return shortMap[match] || match;
      });
  }

  /**
   * Basit açma algoritması
   */
  simpleDecompress(str) {
    if (!this.aggressiveCompression) {
      // Normal açma
      return str
        .replace(/(.)\*(\d+)/g, (match, char, count) => char.repeat(parseInt(count)))
        .replace(/'/g, '"');
    }
    
    // Agresif açma
    return str
      .replace(/(.)\*(\d+)/g, (match, char, count) => char.repeat(parseInt(count)))
      .replace(/([a-zA-Z])(\d+)/g, (match, char, count) => char.repeat(parseInt(count)))
      .replace(/([0-9])(\d+)/g, (match, char, count) => char.repeat(parseInt(count)))
      .replace(/'/g, '"')
      .replace(/\b(i|a|s|c|sn|d|oz|k|st|su|kt|b)\b/g, (match) => {
        const expandMap = {
          'i': 'id', 'a': 'ad', 's': 'soyad', 'c': 'cinsiyet',
          'sn': 'sinif', 'd': 'durum', 'oz': 'ozellikler',
          'k': 'kapasite', 'st': 'satir', 'su': 'sutun',
          'kt': 'kat', 'b': 'binadi'
        };
        return expandMap[match] || match;
      });
  }

  /**
   * Storage boyutunu kontrol et
   */
  getStorageSize() {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length;
      }
    }
    return totalSize;
  }

  /**
   * Storage temizliği
   */
  cleanupStorage() {
    try {
      const keysToClean = [
        'temp_', 'cache_', 'debug_', 'old_',
        'learningData', 'dragDropLearning',
        'performance_issues', 'deviceId'
      ];
      
      let cleanedCount = 0;
      let freedSpace = 0;
      
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const shouldClean = keysToClean.some(prefix => key.startsWith(prefix));
          if (shouldClean) {
            const itemSize = localStorage[key].length;
            localStorage.removeItem(key);
            cleanedCount++;
            freedSpace += itemSize;
          }
        }
      }
      
      // Eski kayıtlı planları temizle (en eskilerden başla)
      this.cleanupOldPlans();
      
      logger.info(`🧹 Storage temizliği: ${cleanedCount} öğe silindi, ${Math.round(freedSpace/1024)}KB alan açıldı`);
      return cleanedCount;
    } catch (error) {
      logger.error('Storage temizlik hatası:', error);
      return 0;
    }
  }

  /**
   * Eski kayıtlı planları temizle
   */
  cleanupOldPlans() {
    try {
      const stored = localStorage.getItem('kayitli_planlar');
      if (!stored) return;
      
      const plans = JSON.parse(stored);
      if (!Array.isArray(plans) || plans.length <= 10) return; // En az 10 plan bırak
      
      // Tarihe göre sırala ve en eskileri sil
      const sortedPlans = plans.sort((a, b) => new Date(a.tarih || 0) - new Date(b.tarih || 0));
      const keepPlans = sortedPlans.slice(-10); // Son 10 planı tut
      
      localStorage.setItem('kayitli_planlar', JSON.stringify(keepPlans));
      logger.info(`🗑️ Eski planlar temizlendi: ${plans.length - keepPlans.length} plan silindi`);
    } catch (error) {
      logger.error('Eski plan temizlik hatası:', error);
    }
  }

  /**
   * Güvenli veri kaydetme
   */
  safeSetItem(key, data, options = {}) {
    try {
      // JSON string'e çevir (sıkıştırma yok)
      const jsonData = JSON.stringify(data);
      
      // Boyut kontrolü
      const dataSize = new Blob([jsonData]).size;
      const currentSize = this.getStorageSize();
      
      if (currentSize + dataSize > this.maxStorageSize) {
        logger.warn('⚠️ Storage limiti aşıldı, temizlik yapılıyor...');
        this.cleanupStorage();
        
        // Hala sığmıyorsa eski verileri sil
        if (currentSize + dataSize > this.maxStorageSize) {
          this.forceCleanup();
        }
      }
      
      // Kaydet
      localStorage.setItem(key, jsonData);
      
      logger.debug(`💾 Veri kaydedildi: ${key} (${dataSize} bytes)`);
      return true;
      
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        logger.error('❌ Storage quota aşıldı, alternatif çözüm uygulanıyor...');
        return this.handleQuotaExceeded(key, data);
      }
      
      logger.error('❌ Veri kaydetme hatası:', error);
      return false;
    }
  }

  /**
   * Güvenli veri yükleme
   */
  safeGetItem(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      
      // Direkt JSON parse (sıkıştırma yok)
      return JSON.parse(data);
      
    } catch (error) {
      logger.error('❌ Veri yükleme hatası:', error);
      return defaultValue;
    }
  }

  /**
   * Quota aşımı durumunda alternatif çözüm
   */
  handleQuotaExceeded(key, data) {
    try {
      // 1. Eski verileri sil
      this.forceCleanup();
      
      // 2. Veriyi daha da sıkıştır
      const ultraCompressed = this.ultraCompress(data);
      
      // 3. Tekrar dene
      localStorage.setItem(key, JSON.stringify(ultraCompressed));
      
      logger.warn('⚠️ Veri ultra sıkıştırma ile kaydedildi');
      return true;
      
    } catch (error) {
      logger.error('❌ Alternatif çözüm başarısız:', error);
      
      // 4. Son çare: IndexedDB kullan
      return this.saveToIndexedDB(key, data);
    }
  }

  /**
   * Ultra sıkıştırma
   */
  ultraCompress(data) {
    // Sadece en önemli alanları sakla
    if (Array.isArray(data)) {
      return data.slice(0, 50).map(item => this.ultraCompress(item)); // İlk 50 öğe
    }
    
    if (typeof data === 'object' && data !== null) {
      const ultra = {};
      const importantFields = ['id', 'ad', 'cinsiyet', 'sinif', 'masaNumarasi'];
      
      for (const field of importantFields) {
        if (data[field] !== undefined) {
          ultra[field] = data[field];
        }
      }
      
      return ultra;
    }
    
    return data;
  }

  /**
   * Zorla temizlik
   */
  forceCleanup() {
    const keysToRemove = [];
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        // Eski verileri sil
        if (key.includes('old_') || key.includes('temp_') || key.includes('cache_')) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    logger.warn(`🗑️ Zorla temizlik: ${keysToRemove.length} öğe silindi`);
  }

  /**
   * IndexedDB'ye kaydet (son çare)
   */
  async saveToIndexedDB(key, data) {
    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('KelebekSinavDB', 1);
        
        request.onerror = () => {
          logger.error('❌ IndexedDB açma hatası:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['storage'], 'readwrite');
          const store = transaction.objectStore('storage');
          
          const putRequest = store.put(data, key);
          
          putRequest.onsuccess = () => {
            logger.info('✅ Veri IndexedDB\'ye kaydedildi:', key);
            resolve(true);
          };
          
          putRequest.onerror = () => {
            logger.error('❌ IndexedDB kaydetme hatası:', putRequest.error);
            reject(putRequest.error);
          };
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('storage')) {
            db.createObjectStore('storage', { keyPath: 'key' });
          }
        };
      });
    } catch (error) {
      logger.error('❌ IndexedDB kaydetme hatası:', error);
      return false;
    }
  }

  /**
   * IndexedDB'den yükle
   */
  async loadFromIndexedDB(key) {
    try {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('KelebekSinavDB', 1);
        
        request.onerror = () => {
          logger.error('❌ IndexedDB açma hatası:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['storage'], 'readonly');
          const store = transaction.objectStore('storage');
          
          const getRequest = store.get(key);
          
          getRequest.onsuccess = () => {
            resolve(getRequest.result || null);
          };
          
          getRequest.onerror = () => {
            logger.error('❌ IndexedDB yükleme hatası:', getRequest.error);
            reject(getRequest.error);
          };
        };
      });
    } catch (error) {
      logger.error('❌ IndexedDB yükleme hatası:', error);
      return null;
    }
  }

  /**
   * Storage durumu raporu
   */
  getStorageReport() {
    const totalSize = this.getStorageSize();
    const maxSize = this.maxStorageSize;
    const usagePercent = (totalSize / maxSize) * 100;
    
    return {
      totalSize: totalSize,
      maxSize: maxSize,
      usagePercent: usagePercent,
      isNearLimit: usagePercent > 80,
      needsCleanup: usagePercent > 90
    };
  }
}

// Singleton instance
const storageManager = new StorageManager();

export default storageManager;


