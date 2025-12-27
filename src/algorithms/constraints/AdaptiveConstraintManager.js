import { isGenderValid, isClassLevelValid } from './constraints.js';

/**
 * Adaptif kısıt seviyesi yöneticisi
 */
class AdaptiveConstraintManager {
    constructor() {
        this.constraintLevels = {
            STRICT: {
                gender: true,
                classLevel: true,
                description: 'Tüm kısıtlar aktif'
            },
            MODERATE: {
                gender: true,
                classLevel: false,
                description: 'Sadece cinsiyet kısıtı aktif'
            },
            RELAXED: {
                gender: false,
                classLevel: false,
                description: 'Tüm kısıtlar gevşetildi'
            }
        };

    }

    getConstraintLevel(deneme, successRate) {
        // ORİJİNAL: Basit gevşetme stratejisi
        if (deneme === 1) {
            return 'STRICT';
        } else if (deneme === 2) {
            return 'STRICT';
        } else if (deneme === 3) {
            return 'STRICT';
        } else if (deneme === 4) {
            return 'MODERATE';
        } else if (deneme === 5) {
            // Son denemede de kısıtlar tamamen kaldırılmasın
            return 'MODERATE';
        }
        // Varsayılan olarak da kısıtlar en az MODERATE seviyede kalsın
        return 'MODERATE';
    }

    checkConstraints(ogrenci, komsular, plan, constraintLevel, currentGroup = null) {
        // ORİJİNAL: Basit kısıt kontrolü
        const level = this.constraintLevels[constraintLevel];
        if (!level) return true;

        // Cinsiyet kısıtı kontrolü
        if (level.gender && !isGenderValid(ogrenci, komsular, plan, currentGroup)) {
            return false;
        }

        // Sınıf seviyesi kısıtı kontrolü
        if (level.classLevel && !isClassLevelValid(ogrenci, komsular, plan, currentGroup)) {
            return false;
        }

        return true;
    }

    /**
     * Cinsiyet değerini normalize eder
     */
    normalizeGender(cinsiyet) {
        if (!cinsiyet) return null;

        const normalized = cinsiyet.toString().trim().toUpperCase();

        // Erkek pattern'leri
        if (['E', 'ERKEK', 'MALE', 'M', 'BAY'].includes(normalized)) {
            return 'E';
        }

        // Kadın pattern'leri  
        if (['K', 'KIZ', 'KADIN', 'FEMALE', 'F', 'BAYAN'].includes(normalized)) {
            return 'K';
        }

        return normalized; // Bilinmeyen değerleri olduğu gibi döndür
    }
}

export default AdaptiveConstraintManager;
