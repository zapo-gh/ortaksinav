/**
 * Salon Kapasite Doğrulama ve Hesaplama Yardımcı Fonksiyonları
 * Sınav salonları kapasite hesaplamalarını doğrular ve optimize eder
 */

import { logger } from '../../utils/logger';

/**
 * Salon kapasitesini doğrular ve uyarılar verir
 * @param {Array} salonlar - Salon listesi
 * @param {Array} ogrenciler - Öğrenci listesi
 * @returns {Object} Doğrulama sonucu
 */
export const validateCapacity = (salonlar, ogrenciler) => {
  if (!salonlar || salonlar.length === 0) {
    return {
      isValid: false,
      error: 'Salon listesi boş',
      suggestions: ['En az bir salon ekleyin']
    };
  }

  if (!ogrenciler || ogrenciler.length === 0) {
    return {
      isValid: false,
      error: 'Öğrenci listesi boş',
      suggestions: ['Öğrenci listesi yükleyin']
    };
  }

  const aktifSalonlar = salonlar.filter(salon => salon.aktif !== false);
  const toplamKapasite = aktifSalonlar.reduce((toplam, salon) => toplam + (salon.kapasite || 0), 0);
  const toplamOgrenci = ogrenciler.length;

  const result = {
    isValid: true,
    warnings: [],
    suggestions: [],
    statistics: {
      toplamKapasite,
      toplamOgrenci,
      kullanilabilirKapasite: toplamKapasite,
      dolulukOrani: toplamKapasite > 0 ? (toplamOgrenci / toplamKapasite) * 100 : 0,
      salonSayisi: aktifSalonlar.length,
      ortalamaSalonKapasitesi: aktifSalonlar.length > 0 ? toplamKapasite / aktifSalonlar.length : 0
    }
  };

  // Kapasite kontrolü
  if (toplamOgrenci > toplamKapasite) {
    result.isValid = false;
    result.error = `Öğrenci sayısı (${toplamOgrenci}) toplam salon kapasitesini (${toplamKapasite}) aşıyor`;
    result.suggestions.push('Daha fazla salon ekleyin veya salon kapasitelerini artırın');
    result.suggestions.push('Öğrenci sayısını azaltın');
  } else if (toplamOgrenci > toplamKapasite * 0.9) {
    result.warnings.push(`Yüksek doluluk oranı: %${result.statistics.dolulukOrani.toFixed(1)}`);
    result.suggestions.push('Yedek salon eklemeyi düşünün');
  }

  // Salon kapasite dağılımı kontrolü
  const kapasiteDagilimi = aktifSalonlar.map(salon => ({
    salonAdi: salon.salonAdi || salon.ad || salon.id,
    kapasite: salon.kapasite || 0,
    oran: toplamKapasite > 0 ? ((salon.kapasite || 0) / toplamKapasite) * 100 : 0
  }));

  result.statistics.kapasiteDagilimi = kapasiteDagilimi;

  // Dengesiz dağılım kontrolü
  const kapasiteler = aktifSalonlar.map(salon => salon.kapasite || 0);
  const enBuyukKapasite = Math.max(...kapasiteler);
  const enKucukKapasite = Math.min(...kapasiteler);
  const kapasiteFarki = enBuyukKapasite - enKucukKapasite;

  if (kapasiteFarki > enKucukKapasite) {
    result.warnings.push('Salon kapasiteleri arasında büyük fark var');
    result.suggestions.push('Salon kapasitelerini dengelemeyi düşünün');
  }

  // Optimal dağılım önerisi
  if (result.isValid) {
    const optimalDagilim = calculateOptimalDistribution(ogrenciler, aktifSalonlar);
    result.statistics.optimalDagilim = optimalDagilim;
  }

  return result;
};

/**
 * Optimal öğrenci dağılımını hesaplar
 * @param {Array} ogrenciler - Öğrenci listesi
 * @param {Array} salonlar - Salon listesi
 * @returns {Array} Optimal dağılım
 */
export const calculateOptimalDistribution = (ogrenciler, salonlar) => {
  const toplamOgrenci = ogrenciler.length;
  const toplamKapasite = salonlar.reduce((toplam, salon) => toplam + (salon.kapasite || 0), 0);
  
  if (toplamKapasite === 0) {
    return [];
  }

  return salonlar.map(salon => {
    const oran = (salon.kapasite || 0) / toplamKapasite;
    const hedefOgrenciSayisi = Math.floor(toplamOgrenci * oran);
    
    return {
      salonId: salon.id,
      salonAdi: salon.salonAdi || salon.ad || salon.id,
      kapasite: salon.kapasite || 0,
      hedefOgrenciSayisi,
      oran: oran * 100,
      kalanKapasite: (salon.kapasite || 0) - hedefOgrenciSayisi
    };
  });
};

/**
 * Salon düzenini optimize eder
 * @param {Object} salon - Salon bilgileri
 * @returns {Object} Optimize edilmiş düzen
 */
export const optimizeSalonLayout = (salon) => {
  if (!salon || !salon.kapasite) {
    return {
      satir: 0,
      sutun: 0,
      toplamKoltuk: 0,
      bosKoltuk: 0
    };
  }

  const kapasite = salon.kapasite;
  
  // Eğer satır ve sütun sayıları belirtilmişse, onları kullan
  if (salon.satir && salon.sutun) {
    const toplamKoltuk = salon.satir * salon.sutun;
    return {
      satir: salon.satir,
      sutun: salon.sutun,
      toplamKoltuk,
      bosKoltuk: Math.max(0, toplamKoltuk - kapasite),
      isValid: toplamKoltuk >= kapasite
    };
  }

  // Optimal düzeni hesapla
  let enIyiSatir = Math.ceil(Math.sqrt(kapasite));
  let enIyiSutun = Math.ceil(kapasite / enIyiSatir);
  let enIyiToplamKoltuk = enIyiSatir * enIyiSutun;

  // Alternatif düzenleri dene
  for (let satir = Math.floor(Math.sqrt(kapasite)); satir <= Math.ceil(Math.sqrt(kapasite)) + 2; satir++) {
    const sutun = Math.ceil(kapasite / satir);
    const toplamKoltuk = satir * sutun;
    
    // Kapasiteyi karşılayan ve en az boş koltuk bırakan düzeni seç
    if (toplamKoltuk >= kapasite && toplamKoltuk < enIyiToplamKoltuk) {
      enIyiSatir = satir;
      enIyiSutun = sutun;
      enIyiToplamKoltuk = toplamKoltuk;
    }
  }

  return {
    satir: enIyiSatir,
    sutun: enIyiSutun,
    toplamKoltuk: enIyiToplamKoltuk,
    bosKoltuk: enIyiToplamKoltuk - kapasite,
    isValid: true,
    verimlilik: (kapasite / enIyiToplamKoltuk) * 100
  };
};

/**
 * Kapasite raporu oluşturur
 * @param {Object} validationResult - Doğrulama sonucu
 * @returns {String} Rapor metni
 */
export const generateCapacityReport = (validationResult) => {
  if (!validationResult) {
    return 'Geçersiz doğrulama sonucu';
  }

  const { statistics, warnings, suggestions } = validationResult;
  
  let report = '📊 SALON KAPASİTE RAPORU\n';
  report += '='.repeat(50) + '\n\n';
  
  report += `📈 GENEL İSTATİSTİKLER:\n`;
  report += `   Toplam Öğrenci: ${statistics.toplamOgrenci}\n`;
  report += `   Toplam Kapasite: ${statistics.toplamKapasite}\n`;
  report += `   Doluluk Oranı: %${statistics.dolulukOrani.toFixed(1)}\n`;
  report += `   Salon Sayısı: ${statistics.salonSayisi}\n`;
  report += `   Ortalama Salon Kapasitesi: ${statistics.ortalamaSalonKapasitesi.toFixed(1)}\n\n`;
  
  if (statistics.kapasiteDagilimi) {
    report += `🏢 SALON KAPASİTE DAĞILIMI:\n`;
    statistics.kapasiteDagilimi.forEach(salon => {
      report += `   ${salon.salonAdi}: ${salon.kapasite} koltuk (%${salon.oran.toFixed(1)})\n`;
    });
    report += '\n';
  }
  
  if (warnings && warnings.length > 0) {
    report += `⚠️ UYARILAR:\n`;
    warnings.forEach(warning => {
      report += `   • ${warning}\n`;
    });
    report += '\n';
  }
  
  if (suggestions && suggestions.length > 0) {
    report += `💡 ÖNERİLER:\n`;
    suggestions.forEach(suggestion => {
      report += `   • ${suggestion}\n`;
    });
    report += '\n';
  }
  
  return report;
};

export default {
  validateCapacity,
  calculateOptimalDistribution,
  optimizeSalonLayout,
  generateCapacityReport
};









