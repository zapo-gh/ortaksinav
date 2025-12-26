import { getSinifSeviyesi, getNeighbors } from '../utils/helpers.js';
import { isGenderValid, isClassLevelValid } from '../validation/constraints.js';

/**
 * Gelişmiş istatistik sistemi
 */
class EnhancedStatistics {
    constructor(salonlar, yerlesilemeyen) {
        this.salonlar = salonlar;
        this.yerlesilemeyen = yerlesilemeyen;
    }

    generateComprehensiveReport() {
        const baseStats = this.getBaseStatistics();

        return {
            ...baseStats,
            // Yeni metrikler
            optimizationImpact: this.calculateOptimizationImpact(),
            constraintSuccessRates: this.analyzeConstraintSuccess(),
            placementEfficiency: this.calculateEfficiency(),
            suggestions: this.generateSuggestions()
        };
    }

    getBaseStatistics() {
        const toplamYerlesen = this.salonlar.reduce((toplam, salon) => toplam + salon.ogrenciler.length, 0);

        const salonBasinaOgrenci = {};
        this.salonlar.forEach(salon => {
            salonBasinaOgrenci[salon.salonAdi] = salon.ogrenciler.length;
        });

        const sinifDagilimlari = {};
        const cinsiyetDagilimlari = { Erkek: 0, Kız: 0 };
        let esnekYerlestirilenSayisi = 0;

        this.salonlar.forEach(salon => {
            salon.ogrenciler.forEach(ogrenci => {
                // Sınıf dağılımı
                const seviye = getSinifSeviyesi(ogrenci.sinif);
                if (seviye) {
                    sinifDagilimlari[seviye] = (sinifDagilimlari[seviye] || 0) + 1;
                }

                // Cinsiyet dağılımı
                if (ogrenci.cinsiyet) {
                    cinsiyetDagilimlari[ogrenci.cinsiyet] = (cinsiyetDagilimlari[ogrenci.cinsiyet] || 0) + 1;
                }

                // Esnek yerleştirme sayısı
                if (ogrenci.esnekYerlestirme) {
                    esnekYerlestirilenSayisi++;
                }
            });
        });

        const toplamOgrenci = toplamYerlesen + (this.yerlesilemeyen ? this.yerlesilemeyen.length : 0);
        const basariOrani = toplamOgrenci > 0 ? (toplamYerlesen / toplamOgrenci) * 100 : 0;

        return {
            yerlesenOgrenci: toplamYerlesen,
            toplamOgrenci,
            toplamYerlesen,
            toplamYerlesilemeyen: this.yerlesilemeyen ? this.yerlesilemeyen.length : 0,
            salonBasinaOgrenci,
            sinifDagilimlari,
            cinsiyetDagilimlari,
            esnekYerlestirilenSayisi,
            basariOrani
        };
    }

    calculateOptimizationImpact() {
        const toplamOptimizasyonSkoru = this.salonlar.reduce((toplam, salon) => {
            return toplam + (salon.optimizasyonSkoru || 0);
        }, 0);

        return {
            toplamSkor: toplamOptimizasyonSkoru,
            ortalamaSkor: this.salonlar.length > 0 ? toplamOptimizasyonSkoru / this.salonlar.length : 0,
            optimizasyonYapilanSalon: this.salonlar.filter(salon => (salon.optimizasyonSkoru || 0) > 0).length
        };
    }

    analyzeConstraintSuccess() {
        const constraintStats = {
            gender: { success: 0, total: 0 },
            classLevel: { success: 0, total: 0 }
        };

        this.salonlar.forEach(salon => {
            if (salon.plan) {
                // Find grid dimensions if potential missing
                const maxSatir = Math.max(...salon.plan.map(p => p.satir)) + 1;
                const maxSutun = Math.max(...salon.plan.map(p => p.sutun)) + 1;

                salon.plan.forEach(planItem => {
                    if (planItem.ogrenci) {
                        const komsular = getNeighbors(planItem.satir, planItem.sutun, maxSatir, maxSutun);

                        // 2D plan oluştur (basit versiyon)
                        const plan2D = Array(maxSatir)
                            .fill(null)
                            .map(() => Array(maxSutun).fill(null));

                        salon.plan.forEach(p => {
                            if (p.ogrenci) {
                                plan2D[p.satir][p.sutun] = { ogrenci: p.ogrenci, grup: p.grup };
                            }
                        });

                        // Kısıt başarısını kontrol et
                        constraintStats.gender.total++;
                        if (isGenderValid(planItem.ogrenci, komsular, plan2D, planItem.grup)) {
                            constraintStats.gender.success++;
                        }

                        constraintStats.classLevel.total++;
                        if (isClassLevelValid(planItem.ogrenci, komsular, plan2D, planItem.grup)) {
                            constraintStats.classLevel.success++;
                        }
                    }
                });
            }
        });

        return {
            gender: {
                successRate: constraintStats.gender.total > 0 ?
                    (constraintStats.gender.success / constraintStats.gender.total) * 100 : 0,
                success: constraintStats.gender.success,
                total: constraintStats.gender.total
            },
            classLevel: {
                successRate: constraintStats.classLevel.total > 0 ?
                    (constraintStats.classLevel.success / constraintStats.classLevel.total) * 100 : 0,
                success: constraintStats.classLevel.success,
                total: constraintStats.classLevel.total
            }
        };
    }

    calculateEfficiency() {
        const baseStats = this.getBaseStatistics();
        const optimizationImpact = this.calculateOptimizationImpact();

        return {
            placementEfficiency: baseStats.basariOrani,
            optimizationEfficiency: optimizationImpact.ortalamaSkor,
            overallEfficiency: baseStats.basariOrani + (optimizationImpact.ortalamaSkor * 0.1) // Optimizasyon skorunu %10 etkili yap
        };
    }

    generateSuggestions() {
        const suggestions = [];
        const baseStats = this.getBaseStatistics();
        const constraintStats = this.analyzeConstraintSuccess();
        const optimizationImpact = this.calculateOptimizationImpact();

        if (baseStats.basariOrani < 85) {
            suggestions.push("• Cinsiyet kısıtını gevşetmeyi deneyin");
        }

        if (constraintStats.gender.successRate < 80) {
            suggestions.push("• Cinsiyet dağılımını kontrol edin");
        }

        if (constraintStats.classLevel.successRate < 70) {
            suggestions.push("• Sınıf seviyesi kısıtını gevşetmeyi düşünün");
        }

        if (optimizationImpact.ortalamaSkor < 2) {
            suggestions.push("• Daha fazla optimizasyon denemesi gerekli");
        }

        if (baseStats.toplamYerlesilemeyen > 0) {
            suggestions.push(`• ${baseStats.toplamYerlesilemeyen} öğrenci manuel yerleştirme gerektiriyor`);
        }

        if (suggestions.length === 0) {
            suggestions.push("• Mükemmel yerleştirme! Herhangi bir iyileştirme önerisi yok.");
        }

        return suggestions;
    }
}

export default EnhancedStatistics;
