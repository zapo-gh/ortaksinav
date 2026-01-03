import logger from './logger';
import { storageOptimizer } from './storageOptimizer';

/**
 * localStorage yardımcı fonksiyonları (sıkıştırmasız)
 */
export const loadFromStorage = (key, defaultValue) => {
    try {
        const saved = localStorage.getItem(key);
        if (!saved) return defaultValue;
        return JSON.parse(saved);
    } catch (err) {
        logger.debug(`${key} yüklenirken hata:`, err);
        return defaultValue;
    }
};

/**
 * Salon listesini normalize eder, eksik alanları tamamlar
 */
export const normalizeSalonList = (list) => {
    if (!list || !Array.isArray(list)) return [];

    const getScore = (salon) => {
        let score = 0;
        if (salon.kapasite > 0) score += 10;
        if (salon.satir > 0 && salon.sutun > 0) score += 10;
        if (salon.aktif !== false) score += 5;
        return score;
    };

    return list
        .filter(s => s && (s.id || s.salonId))
        .sort((a, b) => getScore(b) - getScore(a))
        .map(salon => ({
            ...salon,
            id: salon.id || salon.salonId,
            salonId: salon.salonId || salon.id,
            salonAdi: salon.salonAdi || salon.ad || salon.id || 'İsimsiz'
        }));
};

/**
 * Boş ayarlar nesnesi oluşturur
 */
export const createEmptySettings = () => ({
    sinavAdi: '',
    sinavTarihi: '',
    sinavSaati: '',
    dersler: []
});

/**
 * Ayarlar nesnesinin anlamlı veri içerip içermediğini kontrol eder
 */
export const hasMeaningfulSettings = (settings) => {
    if (!settings) return false;
    return !!(
        settings.sinavAdi ||
        settings.sinavTarihi ||
        settings.sinavSaati ||
        (settings.dersler && settings.dersler.length > 0)
    );
};

/**
 * Gerçek kaydetme fonksiyonu (optimizer tarafından çağrılır)
 */
export const _saveToStorage = (key, value) => {
    try {
        if (value === null || value === undefined) {
            localStorage.removeItem(key);
            return;
        }

        const json = JSON.stringify(value);
        localStorage.setItem(key, json);

        // console.log(`💾 ${key} kaydedildi (${json.length} bytes)`);

        // Gecikmeli IndexedDB yedekleme (opsiyonel/arka planda)
        if (['exam_ogrenciler', 'exam_salonlar', 'exam_ayarlar'].includes(key)) {
            setTimeout(async () => {
                try {
                    const { default: db } = await import('../database/database');
                    if (key === 'exam_ogrenciler') await db.saveStudents(value);
                    else if (key === 'exam_salonlar') await db.saveSalons(value);
                    else if (key === 'exam_ayarlar') await db.saveSettings(value);
                } catch (e) {
                    console.debug(`${key} IndexedDB yedekleme hatası:`, e);
                }
            }, 2000);
        }
    } catch (err) {
        console.error(`❌ ${key} kaydedilirken hata:`, err);
    }
};

/**
 * Optimize edilmiş saveToStorage - debouncing ve değişiklik kontrolü ile
 */
export const saveToStorage = (key, value, immediate = false) => {
    storageOptimizer.scheduleSave(key, value, _saveToStorage, immediate);
};
