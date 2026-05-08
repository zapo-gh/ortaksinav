/**
 * Yerleştirme Algoritması Yardımcı Fonksiyonları
 * Genel utility fonksiyonları
 */

import logger from '../../utils/logger.js';

/**
 * Sınıf seviyesini çıkarır (9-A -> 9)
 */
export const getSinifSeviyesi = (sinif) => {
  if (!sinif) return null;

  logger.debug(`🔍 getSinifSeviyesi debug: "${sinif}" -> `, {
    sinif: sinif,
    type: typeof sinif,
    length: sinif.length,
    charCode0: sinif.charCodeAt(0),
    charCode1: sinif.length > 1 ? sinif.charCodeAt(1) : 'N/A'
  });

  // 10-A, 11-B, 9-C gibi formatlar için sınıf seviyesini çıkar
  // Önce iki haneli sayıları kontrol et (10, 11, 12)
  let match = sinif.match(/^(1[0-2])/);
  if (match) {
    logger.debug(`✅ İki haneli match: "${match[1]}"`);
    return match[1];
  }

  // Sonra tek haneli sayıları kontrol et (9)
  match = sinif.match(/^(\d)/);
  const result = match ? match[1] : null;
  logger.debug(`📊 Final result: "${result}"`);
  return result;
};

/**
 * Seed bazlı rastgele sayı üretici
 */
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

/**
 * Fisher-Yates shuffle algoritması (seed bazlı)
 */
export const seedShuffle = (array, seed) => {
  const shuffled = [...array];
  const rng = new SeededRandom(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

/**
 * Yan yana komşu pozisyonları (sadece sol-sağ)
 */
export const getNeighbors = (satir, sutun, satirSayisi, sutunSayisi) => {
  const neighbors = [];

  // SADECE YAN YANA KOMŞULAR (sol-sağ)
  const directions = [
    [0, -1],  // Sol
    [0, 1]    // Sağ
  ];

  for (const [dr, dc] of directions) {
    const newSatir = satir + dr;
    const newSutun = sutun + dc;

    if (newSatir >= 0 && newSatir < satirSayisi &&
        newSutun >= 0 && newSutun < sutunSayisi) {
      neighbors.push([newSatir, newSutun]);
    }
  }

  return neighbors;
};

/**
 * Öğrencinin hangi derslere girdiğini belirler
 */
export const getOgrenciDersleri = (ogrenci, ayarlar) => {
  if (!ayarlar.dersler || !ogrenci.sinif) return [];

  return ayarlar.dersler
    .filter(ders => ders.siniflar && ders.siniflar.includes(ogrenci.sinif))
    .map(ders => ders.ad);
};

/**
 * Dengeli dağılım hesaplama - Düzeltilmiş versiyon
 */
export const calculateBalancedDistribution = (ogrenciler, kapasite) => {
  if (!ogrenciler || ogrenciler.length === 0) {
    logger.warn('⚠️ Öğrenci listesi boş - dağılım hesaplanamıyor');
    return {};
  }

  if (kapasite <= 0) {
    logger.warn('⚠️ Geçersiz kapasite değeri - dağılım hesaplanamıyor');
    return {};
  }

  const sinifSeviyeleri = {};

  // Sınıf seviyelerine göre grupla
  ogrenciler.forEach(ogrenci => {
    const seviye = getSinifSeviyesi(ogrenci.sinif);
    if (seviye) {
      if (!sinifSeviyeleri[seviye]) {
        sinifSeviyeleri[seviye] = [];
      }
      sinifSeviyeleri[seviye].push(ogrenci);
    }
  });

  const seviyeler = Object.keys(sinifSeviyeleri);
  
  if (seviyeler.length === 0) {
    logger.warn('⚠️ Hiçbir sınıf seviyesi bulunamadı');
    return {};
  }

  const dağılım = {};

  // Her seviyeden eşit sayıda öğrenci al
  const seviyeBasi = Math.floor(kapasite / seviyeler.length);
  const kalan = kapasite % seviyeler.length;

  logger.debug(`📊 Dengeli dağılım hesaplanıyor: Kapasite=${kapasite}, Seviye sayısı=${seviyeler.length}`);
  logger.debug(`📊 Seviye başına: ${seviyeBasi}, Kalan: ${kalan}`);

  seviyeler.forEach((seviye, index) => {
    const alinacak = seviyeBasi + (index < kalan ? 1 : 0);
    const mevcutOgrenciSayisi = sinifSeviyeleri[seviye].length;
    const finalAlinacak = Math.min(alinacak, mevcutOgrenciSayisi);
    
    dağılım[seviye] = finalAlinacak;
    
    logger.debug(`📊 Sınıf ${seviye}: ${finalAlinacak} öğrenci (mevcut: ${mevcutOgrenciSayisi})`);
  });

  return dağılım;
};
