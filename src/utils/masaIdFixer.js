/**
 * ============================================================================
 * MASA ID DÜZELTİCİ UTİLİTY
 * ============================================================================
 * 
 * Masa ID'lerinin doğru şekilde atanmasını sağlar
 * Kayıtlı plan yükleme ve kaydetme sırasında kullanılır
 */

import logger from './logger';

/**
 * Masa ID'sini düzelt ve güvenli hale getir
 */
export const fixMasaId = (masa, index) => {
  let masaId = masa.id;
  
  // ID geçersizse index kullan
  if (masaId === undefined || masaId === null || isNaN(masaId) || masaId < 0) {
    masaId = index;
    logger.debug(`🔧 Masa ID düzeltildi: ${masa.id} -> ${masaId}`);
  }
  
  return {
    ...masa,
    id: masaId,
    masaNumarasi: masaId + 1
  };
};

/**
 * Salon masalarını düzelt
 */
export const fixSalonMasalar = (salon) => {
  if (!salon || !salon.masalar) {
    logger.warn('⚠️ Salon veya masalar bulunamadı:', salon);
    return salon;
  }
  
  const duzeltilmisMasalar = salon.masalar.map((masa, index) => {
    return fixMasaId(masa, index);
  });
  
  return {
    ...salon,
    masalar: duzeltilmisMasalar
  };
};

/**
 * Tüm salonları düzelt
 */
export const fixAllSalonlar = (tumSalonlar) => {
  if (!tumSalonlar || !Array.isArray(tumSalonlar)) {
    logger.warn('⚠️ Salonlar bulunamadı:', tumSalonlar);
    return tumSalonlar;
  }
  
  return tumSalonlar.map(salon => fixSalonMasalar(salon));
};

/**
 * Plan verisini düzelt
 */
export const fixPlanData = (planData) => {
  if (!planData) {
    logger.warn('⚠️ Plan verisi bulunamadı');
    return planData;
  }
  
  return {
    ...planData,
    tumSalonlar: fixAllSalonlar(planData.tumSalonlar)
  };
};

/**
 * Masa numarası güvenli gösterim
 */
export const getSafeMasaNumarasi = (masa) => {
  // Masa ID'sini kontrol et
  if (typeof masa.id === 'number' && !isNaN(masa.id) && masa.id >= 0) {
    return masa.id + 1;
  }
  
  // masaNumarasi varsa onu kullan
  if (typeof masa.masaNumarasi === 'number' && !isNaN(masa.masaNumarasi) && masa.masaNumarasi > 0) {
    return masa.masaNumarasi;
  }
  
  // Hiçbiri yoksa ? göster
  return '?';
};

/**
 * Debug: Masa ID'lerini kontrol et
 */
export const debugMasaIds = (planData, label = 'Plan') => {
  logger.info(`🔍 ${label} masa ID kontrolü:`);
  if (!planData || !Array.isArray(planData.tumSalonlar)) {
    logger.warn('⚠️ Plan veri yapısı beklenen formatta değil (tumSalonlar yok)');
    return;
  }

  planData.tumSalonlar.forEach((salon, salonIndex) => {
    logger.info(`🏫 Salon ${salonIndex + 1} (${salon.salonAdi || 'Bilinmeyen'}):`);
    
    salon.masalar?.forEach((masa, masaIndex) => {
      const masaNumarasi = getSafeMasaNumarasi(masa);
      const ogrenciAdi = masa.ogrenci ? masa.ogrenci.ad : 'Boş';
      
      logger.info(`  🪑 Masa ${masaIndex}: ID=${masa.id}, Numara=${masaNumarasi}, Öğrenci=${ogrenciAdi}`);
    });
  });
};

export default {
  fixMasaId,
  fixSalonMasalar,
  fixAllSalonlar,
  fixPlanData,
  getSafeMasaNumarasi,
  debugMasaIds
};


