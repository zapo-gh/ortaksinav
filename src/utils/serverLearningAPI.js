/**
 * ============================================================================
 * SUNUCU MAKİNE ÖĞRENMESİ API'Sİ
 * ============================================================================
 * 
 * Bu dosya sunucu tarafında çalışacak API endpoint'lerini tanımlar
 * Node.js + Express + MongoDB/PostgreSQL ile çalışır
 */

import logger from './logger';

class ServerLearningAPI {
  constructor() {
    this.apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  }

  /**
   * Öğrenme verilerini sunucudan al
   */
  async getLearningData(deviceId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/learning-data/${deviceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        logger.warn('⚠️ Sunucudan öğrenme verisi alınamadı:', response.status);
        return null;
      }
    } catch (error) {
      logger.error('❌ Sunucu API hatası:', error);
      return null;
    }
  }

  /**
   * Öğrenme verilerini sunucuya gönder
   */
  async saveLearningData(deviceId, learningData) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/learning-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deviceId,
          ...learningData,
          timestamp: Date.now()
        })
      });

      if (response.ok) {
        logger.info('✅ Öğrenme verileri sunucuya kaydedildi');
        return true;
      } else {
        logger.warn('⚠️ Sunucuya veri kaydedilemedi:', response.status);
        return false;
      }
    } catch (error) {
      logger.error('❌ Sunucu API hatası:', error);
      return false;
    }
  }

  /**
   * Global öğrenme verilerini al (tüm kullanıcıların birleşik verisi)
   */
  async getGlobalLearningData() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/learning-data/global`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        logger.warn('⚠️ Global öğrenme verisi alınamadı:', response.status);
        return null;
      }
    } catch (error) {
      logger.error('❌ Global API hatası:', error);
      return null;
    }
  }

  /**
   * AI modelini güncelle
   */
  async updateAIModel(weights, performance) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/ai-model/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weights,
          performance,
          timestamp: Date.now()
        })
      });

      if (response.ok) {
        logger.info('🤖 AI modeli güncellendi');
        return true;
      } else {
        logger.warn('⚠️ AI modeli güncellenemedi:', response.status);
        return false;
      }
    } catch (error) {
      logger.error('❌ AI model güncelleme hatası:', error);
      return false;
    }
  }
}

export default ServerLearningAPI;





