/**
 * ============================================================================
 * SUNUCU TARAFI API ENDPOINT'LERİ (ÖRNEK)
 * ============================================================================
 * 
 * Bu dosya sunucu tarafında (Node.js + Express) çalışacak
 * Gerçek sunucuya bu kodu ekleyebilirsiniz
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Schema'ları
const LearningDataSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true },
  weights: {
    genderBalance: { type: Number, default: 0.2 },
    classLevelMix: { type: Number, default: 0.15 },
    medicalNeeds: { type: Number, default: 0.4 },
    groupPreservation: { type: Number, default: 0.25 }
  },
  learningStats: {
    totalMoves: { type: Number, default: 0 },
    successfulMoves: { type: Number, default: 0 },
    failedMoves: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  userPreferences: {
    genderPreferences: {
      same: { type: Number, default: 0 },
      different: { type: Number, default: 0 }
    },
    classPreferences: {
      same: { type: Number, default: 0 },
      different: { type: Number, default: 0 }
    }
  },
  moveHistory: [{ type: Object }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const LearningData = mongoose.model('LearningData', LearningDataSchema);

// Global AI Model Schema
const AIModelSchema = new mongoose.Schema({
  version: { type: String, default: '2.0' },
  globalWeights: {
    genderBalance: { type: Number, default: 0.2 },
    classLevelMix: { type: Number, default: 0.15 },
    medicalNeeds: { type: Number, default: 0.4 },
    groupPreservation: { type: Number, default: 0.25 }
  },
  performance: {
    averageSuccessRate: { type: Number, default: 0 },
    totalUsers: { type: Number, default: 0 },
    totalMoves: { type: Number, default: 0 }
  },
  lastUpdated: { type: Date, default: Date.now }
});

const AIModel = mongoose.model('AIModel', AIModelSchema);

// API Endpoint'leri

/**
 * GET /api/learning-data/:deviceId
 * Belirli bir cihazın öğrenme verilerini getir
 */
app.get('/api/learning-data/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    let learningData = await LearningData.findOne({ deviceId });
    
    if (!learningData) {
      // İlk kez gelen cihaz için varsayılan veri oluştur
      learningData = new LearningData({
        deviceId,
        weights: {
          genderBalance: 0.2,
          classLevelMix: 0.15,
          medicalNeeds: 0.4,
          groupPreservation: 0.25
        }
      });
      await learningData.save();
    }
    
    res.json({
      success: true,
      data: learningData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Öğrenme verileri alınamadı',
      details: error.message
    });
  }
});

/**
 * POST /api/learning-data
 * Öğrenme verilerini kaydet/güncelle
 */
app.post('/api/learning-data', async (req, res) => {
  try {
    const { deviceId, weights, learningStats, userPreferences, moveHistory } = req.body;
    
    // Mevcut veriyi bul veya yeni oluştur
    let learningData = await LearningData.findOne({ deviceId });
    
    if (learningData) {
      // Güncelle
      learningData.weights = { ...learningData.weights, ...weights };
      learningData.learningStats = { ...learningData.learningStats, ...learningStats };
      learningData.userPreferences = { ...learningData.userPreferences, ...userPreferences };
      learningData.moveHistory = [...learningData.moveHistory, ...moveHistory].slice(-1000);
      learningData.updatedAt = new Date();
    } else {
      // Yeni oluştur
      learningData = new LearningData({
        deviceId,
        weights,
        learningStats,
        userPreferences,
        moveHistory
      });
    }
    
    await learningData.save();
    
    // Global AI modelini güncelle
    await updateGlobalAIModel(deviceId, weights, learningStats);
    
    res.json({
      success: true,
      message: 'Öğrenme verileri kaydedildi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Öğrenme verileri kaydedilemedi',
      details: error.message
    });
  }
});

/**
 * GET /api/learning-data/global
 * Global (tüm kullanıcıların birleşik) öğrenme verilerini getir
 */
app.get('/api/learning-data/global', async (req, res) => {
  try {
    // Tüm kullanıcıların verilerini topla
    const allData = await LearningData.find({});
    
    // Global ağırlıkları hesapla
    const globalWeights = calculateGlobalWeights(allData);
    
    // Global istatistikleri hesapla
    const globalStats = calculateGlobalStats(allData);
    
    res.json({
      success: true,
      data: {
        globalWeights,
        globalStats,
        totalUsers: allData.length,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Global veriler alınamadı',
      details: error.message
    });
  }
});

/**
 * POST /api/ai-model/update
 * AI modelini güncelle
 */
app.post('/api/ai-model/update', async (req, res) => {
  try {
    const { weights, performance } = req.body;
    
    let aiModel = await AIModel.findOne({});
    
    if (aiModel) {
      aiModel.globalWeights = { ...aiModel.globalWeights, ...weights };
      aiModel.performance = { ...aiModel.performance, ...performance };
      aiModel.lastUpdated = new Date();
    } else {
      aiModel = new AIModel({
        globalWeights: weights,
        performance
      });
    }
    
    await aiModel.save();
    
    res.json({
      success: true,
      message: 'AI modeli güncellendi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'AI modeli güncellenemedi',
      details: error.message
    });
  }
});

/**
 * Global ağırlıkları hesapla
 */
function calculateGlobalWeights(allData) {
  if (allData.length === 0) {
    return {
      genderBalance: 0.2,
      classLevelMix: 0.15,
      medicalNeeds: 0.4,
      groupPreservation: 0.25
    };
  }
  
  const totalMoves = allData.reduce((sum, data) => sum + data.learningStats.totalMoves, 0);
  
  if (totalMoves === 0) {
    return {
      genderBalance: 0.2,
      classLevelMix: 0.15,
      medicalNeeds: 0.4,
      groupPreservation: 0.25
    };
  }
  
  // Ağırlıklı ortalama hesapla
  const globalWeights = {};
  
  for (const key in allData[0].weights) {
    let weightedSum = 0;
    let totalWeight = 0;
    
    allData.forEach(data => {
      const weight = data.learningStats.totalMoves;
      weightedSum += data.weights[key] * weight;
      totalWeight += weight;
    });
    
    globalWeights[key] = totalWeight > 0 ? weightedSum / totalWeight : 0.2;
  }
  
  return globalWeights;
}

/**
 * Global istatistikleri hesapla
 */
function calculateGlobalStats(allData) {
  const totalMoves = allData.reduce((sum, data) => sum + data.learningStats.totalMoves, 0);
  const totalSuccessful = allData.reduce((sum, data) => sum + data.learningStats.successfulMoves, 0);
  const totalFailed = allData.reduce((sum, data) => sum + data.learningStats.failedMoves, 0);
  
  return {
    totalMoves,
    totalSuccessful,
    totalFailed,
    averageSuccessRate: totalMoves > 0 ? (totalSuccessful / totalMoves) * 100 : 0,
    totalUsers: allData.length
  };
}

/**
 * Global AI modelini güncelle
 */
async function updateGlobalAIModel(deviceId, weights, learningStats) {
  try {
    let aiModel = await AIModel.findOne({});
    
    if (!aiModel) {
      aiModel = new AIModel({
        globalWeights: weights,
        performance: {
          averageSuccessRate: 0,
          totalUsers: 1,
          totalMoves: learningStats.totalMoves
        }
      });
    } else {
      // Mevcut modeli güncelle
      aiModel.globalWeights = {
        genderBalance: (aiModel.globalWeights.genderBalance + weights.genderBalance) / 2,
        classLevelMix: (aiModel.globalWeights.classLevelMix + weights.classLevelMix) / 2,
        medicalNeeds: (aiModel.globalWeights.medicalNeeds + weights.medicalNeeds) / 2,
        groupPreservation: (aiModel.globalWeights.groupPreservation + weights.groupPreservation) / 2
      };
      
      aiModel.performance.totalMoves += learningStats.totalMoves;
      aiModel.performance.totalUsers += 1;
    }
    
    await aiModel.save();
  } catch (error) {
    console.error('Global AI model güncellenemedi:', error);
  }
}

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learning-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🤖 Makine Öğrenmesi API'si çalışıyor: http://localhost:${PORT}`);
});

module.exports = app;


























