import logger from '../../utils/logger.js';
import { getSinifSeviyesi } from '../utils/helpers.js';

/**
 * Dinamik ağırlık yöneticisi - öğrenci önceliklendirme sistemi
 */
class DynamicWeightManager {
    constructor() {
        this.weights = {
            medicalNeeds: 0.40,      // Tıbbi ihtiyaçlar (en yüksek öncelik)
            groupPreservation: 0.25,  // Grup koruma (aynı okul/sınıf)
            genderBalance: 0.20,      // Cinsiyet dengesi
            classLevelMix: 0.10,      // Sınıf seviyesi çeşitliliği
            academicSimilarity: 0.05  // Akademik benzerlik
        };
        this.learningRate = 0.1;
        this.history = [];
        this.learningHistory = []; // YENİ: Öğrenme geçmişi
    }

    /**
     * Öğrenci öncelik skorunu hesaplar
     */
    calculateStudentPriority(student) {
        let priority = 0;

        // Tıbbi ihtiyaçlar (en yüksek öncelik)
        if (student.tibbiIhtiyac || student.engelDurumu || student.ozelIhtiyac) {
            priority += 50 * this.weights.medicalNeeds;
            logger.debug(`🏥 Tıbbi öncelik: ${student.ad} (+${50 * this.weights.medicalNeeds})`);
        }

        // Grup koruma isteği (aynı okuldan öğrenciler)
        if (student.grupKoruma || student.aynıOkul || student.okulId) {
            priority += 30 * this.weights.groupPreservation;
            logger.debug(`👥 Grup koruma: ${student.ad} (+${30 * this.weights.groupPreservation})`);
        }

        // Cinsiyet dengesi (daha fazla öncelik)
        if (student.cinsiyet) {
            priority += 20 * this.weights.genderBalance;
        }

        // Sınıf seviyesi çeşitliliği
        const seviye = getSinifSeviyesi(student.sinif);
        if (seviye) {
            priority += 15 * this.weights.classLevelMix;
        }

        // Akademik benzerlik (düşük öncelik)
        if (student.akademikSeviye || student.notOrtalamasi) {
            priority += 10 * this.weights.academicSimilarity;
        }

        // Temel öncelik (her öğrenci için)
        priority += 5;

        return Math.max(priority, 1); // Minimum 1 puan
    }

    /**
     * Öğrencileri öncelik sırasına göre sıralar
     */
    prioritizeStudents(ogrenciler) {
        logger.info(`🎯 ${ogrenciler.length} öğrenci önceliklendiriliyor...`);

        const prioritizedStudents = ogrenciler.map(ogrenci => ({
            ...ogrenci,
            priority: this.calculateStudentPriority(ogrenci)
        })).sort((a, b) => b.priority - a.priority);

        logger.info(`📊 Öncelik sıralaması:`);
        prioritizedStudents.slice(0, 5).forEach((ogrenci, index) => {
            logger.info(`   ${index + 1}. ${ogrenci.ad} - Öncelik: ${ogrenci.priority.toFixed(2)}`);
        });

        return prioritizedStudents;
    }

    /**
     * Ağırlıkları günceller (öğrenme) - İYİLEŞTİRİLMİŞ: Gradient-like öğrenme
     */
    updateWeights(actualSuccess, predictedSuccess) {
        logger.info(`🧠 Ağırlıklar güncelleniyor (Gradient-like öğrenme)...`);

        for (const constraint in actualSuccess) {
            if (this.weights[constraint] !== undefined) {
                // İYİLEŞTİRİLMİŞ: Gradient-like öğrenme
                const error = actualSuccess[constraint] - predictedSuccess[constraint];
                const learningRate = 0.05;

                // Rastgele varyasyon ekle (daha akıllı öğrenme)
                const variation = Math.random() * 0.2 + 0.9; // 0.9-1.1 arası
                const newWeight = this.weights[constraint] + learningRate * error * variation;

                // Ağırlıkları sınırla (0.1 - 1.0 arası - daha geniş aralık)
                this.weights[constraint] = Math.max(0.1, Math.min(1.0, newWeight));

                logger.debug(`   ${constraint}: ${this.weights[constraint].toFixed(3)} (hata: ${error.toFixed(3)}, varyasyon: ${variation.toFixed(3)})`);
            }
        }

        // Ağırlıkları normalize et (toplam 1.0 olacak şekilde)
        this.normalizeWeights();

        // YENİ: Öğrenme geçmişini kaydet
        this.recordLearningHistory(actualSuccess, predictedSuccess);
    }

    /**
     * YENİ: Öğrenme geçmişini kaydet
     */
    recordLearningHistory(actualSuccess, predictedSuccess) {
        this.learningHistory.push({
            timestamp: Date.now(),
            actualSuccess,
            predictedSuccess,
            weights: { ...this.weights }
        });

        // Son 50 öğrenme kaydını sakla
        if (this.learningHistory.length > 50) {
            this.learningHistory.shift();
        }
    }

    /**
     * YENİ: Tahminsel faktör hesapla
     */
    predictiveFactor(ogrenci) {
        let factor = 0;

        // Tıbbi ihtiyaçlar için yüksek tahmin
        if (ogrenci.tibbiIhtiyac || ogrenci.engelDurumu) {
            factor += this.weights.medicalNeeds * 0.3;
        }

        // Grup koruma için orta tahmin
        if (ogrenci.grupKoruma || ogrenci.aynıOkul) {
            factor += this.weights.groupPreservation * 0.2;
        }

        // Cinsiyet dengesi için düşük tahmin
        if (ogrenci.cinsiyet) {
            factor += this.weights.genderBalance * 0.1;
        }

        return factor;
    }

    /**
     * YENİ: AI Destekli Gelişmiş Skorlama
     */
    calculateAIEnhancedScore(ogrenci, koltuk, komsular, plan2D) {
        // Mevcut temel skor
        const baseScore = this.calculateStudentPriority(ogrenci);

        // AI bonus skorları
        const genderScore = this.calculateGenderCompatibility(ogrenci, komsular, plan2D);
        const classScore = this.calculateClassCompatibility(ogrenci, komsular, plan2D);
        const diversityScore = this.calculateDiversityBonus(ogrenci, komsular, plan2D);
        const spatialScore = this.calculateSpatialBonus(koltuk, komsular, plan2D);

        // Ağırlıklı toplam
        const aiBonus = (
            genderScore * 0.35 +
            classScore * 0.25 +
            diversityScore * 0.20 +
            spatialScore * 0.20
        );

        return baseScore + aiBonus;
    }

    /**
     * YENİ: Cinsiyet uyumluluğu hesapla
     */
    calculateGenderCompatibility(ogrenci, komsular, plan2D) {
        if (!ogrenci.cinsiyet) return 0.5;

        let score = 1.0;
        let conflictCount = 0;

        for (const [satir, sutun] of komsular) {
            const komsuOgrenci = plan2D[satir]?.[sutun]?.ogrenci;
            if (komsuOgrenci?.cinsiyet) {
                const ogrenciCinsiyet = this.normalizeGender(ogrenci.cinsiyet);
                const komsuCinsiyet = this.normalizeGender(komsuOgrenci.cinsiyet);

                if (ogrenciCinsiyet === komsuCinsiyet) {
                    conflictCount++;
                    score -= 0.3;
                } else {
                    score += 0.1;
                }
            }
        }

        return conflictCount > 0 ? 0 : Math.max(0, score);
    }

    /**
     * YENİ: Sınıf uyumluluğu hesapla
     */
    calculateClassCompatibility(ogrenci, komsular, plan2D) {
        const ogrenciSeviye = getSinifSeviyesi(ogrenci.sinif);
        if (!ogrenciSeviye) return 0.5;

        let score = 1.0;
        let conflictCount = 0;

        for (const [satir, sutun] of komsular) {
            const komsuOgrenci = plan2D[satir]?.[sutun]?.ogrenci;
            if (komsuOgrenci) {
                const komsuSeviye = getSinifSeviyesi(komsuOgrenci.sinif);
                if (komsuSeviye === ogrenciSeviye) {
                    conflictCount++;
                    score -= 0.25;
                } else {
                    score += 0.05;
                }
            }
        }

        return conflictCount > 0 ? 0 : Math.max(0, score);
    }

    /**
     * YENİ: Çeşitlilik bonusu hesapla
     */
    calculateDiversityBonus(ogrenci, komsular, plan2D) {
        let emptyNeighbors = 0;
        let differentGender = 0;
        let differentClass = 0;

        for (const [satir, sutun] of komsular) {
            const komsuOgrenci = plan2D[satir]?.[sutun]?.ogrenci;

            if (!komsuOgrenci) {
                emptyNeighbors++;
            } else {
                // Farklı cinsiyet
                if (ogrenci.cinsiyet && komsuOgrenci.cinsiyet) {
                    const ogrenciCinsiyet = this.normalizeGender(ogrenci.cinsiyet);
                    const komsuCinsiyet = this.normalizeGender(komsuOgrenci.cinsiyet);
                    if (ogrenciCinsiyet !== komsuCinsiyet) differentGender++;
                }

                // Farklı sınıf
                const ogrenciSeviye = getSinifSeviyesi(ogrenci.sinif);
                const komsuSeviye = getSinifSeviyesi(komsuOgrenci.sinif);
                if (ogrenciSeviye && komsuSeviye && ogrenciSeviye !== komsuSeviye) {
                    differentClass++;
                }
            }
        }

        const totalNeighbors = komsular.length || 1;
        return (emptyNeighbors * 0.2 + differentGender * 0.4 + differentClass * 0.2) / totalNeighbors;
    }

    /**
     * YENİ: Uzamsal bonus hesapla
     */
    calculateSpatialBonus(koltuk, komsular, plan2D) {
        let score = 0.5;

        // Boş komşu sayısı
        const emptyCount = komsular.filter(([s, su]) =>
            !plan2D[s]?.[su]?.ogrenci
        ).length;

        score += emptyCount * 0.1;

        // Köşe/kenar avantajı
        if (komsular.length < 4) {
            score += 0.1;
        }

        return Math.min(1, score);
    }

    /**
     * YENİ: Cinsiyet normalizasyonu
     */
    normalizeGender(cinsiyet) {
        if (!cinsiyet) return null;
        const normalized = cinsiyet.toString().trim().toUpperCase();
        if (['E', 'ERKEK', 'MALE', 'M', 'BAY'].includes(normalized)) return 'E';
        if (['K', 'KIZ', 'KADIN', 'FEMALE', 'F', 'BAYAN'].includes(normalized)) return 'K';
        return normalized;
    }

    /**
     * Ağırlıkları normalize eder
     */
    normalizeWeights() {
        const total = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);

        if (total > 0) {
            for (const key in this.weights) {
                this.weights[key] /= total;
            }
        }

        logger.debug(`📊 Normalize edilmiş ağırlıklar:`, this.weights);
    }

    /**
     * Geçmiş verileri kaydeder
     */
    recordPlacementAttempt(attemptData) {
        this.history.push({
            timestamp: Date.now(),
            ...attemptData
        });

        // Son 10 denemeyi sakla
        if (this.history.length > 10) {
            this.history.shift();
        }
    }

    /**
     * Öğrenme önerileri üretir
     */
    generateLearningSuggestions() {
        if (this.history.length < 3) {
            return ["Yeterli veri yok - daha fazla yerleştirme yapın"];
        }

        const suggestions = [];
        const recentAttempts = this.history.slice(-5);
        const avgSuccess = recentAttempts.reduce((sum, attempt) => sum + attempt.successRate, 0) / recentAttempts.length;

        if (avgSuccess < 0.8) {
            suggestions.push("Tıbbi ihtiyaç ağırlığını artırmayı deneyin");
        }

        if (this.weights.medicalNeeds < 0.3) {
            suggestions.push("Tıbbi ihtiyaçlar için daha yüksek öncelik verin");
        }

        return suggestions;
    }
}

export default DynamicWeightManager;
