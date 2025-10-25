/**
 * Salon İle İlgili Yardımcı Fonksiyonları
 * Salon matrisi oluşturma, koltuk sıralama vb.
 */

import { logger } from '../../utils/logger';

/**
 * Salon için koltuk matrisi oluşturur - GRUP BAZLI SIRALAMA İÇİN
 */
export const createSalonKoltukMatrisi = (salon) => {
  const { siraTipi, gruplar } = salon;
  const masalar = [];

  let masaIndex = 0;

  // En fazla sıra sayısını bul
  const maxSiraSayisi = Math.max(...gruplar.map(g => g.siraSayisi));

  // YENİ DÜZEN: Grup1-Grup2-Grup3-Grup4 yan yana, her grupta sol-sağ koltuklar
  // Grup1: sutun=0,1 | Grup2: sutun=2,3 | Grup3: sutun=4,5 | Grup4: sutun=6,7

  for (let satir = 0; satir < maxSiraSayisi; satir++) {
    gruplar.forEach((grup, grupIndex) => {
      if (satir < grup.siraSayisi) {
        if (siraTipi === 'tekli') {
          masalar.push({
            id: masaIndex++,
            satir: satir,
            sutun: grupIndex, // Her grup farklı sütun
            grup: grup.id,
            koltukTipi: 'tekli',
            grupSira: grupIndex
          });
        } else { // ikili
          // Sol koltuk
          masalar.push({
            id: masaIndex++,
            satir: satir,
            sutun: grupIndex * 2, // Grup1: 0, Grup2: 2, Grup3: 4, Grup4: 6
            grup: grup.id,
            koltukTipi: 'ikili-sol',
            grupSira: grupIndex
          });

          // Sağ koltuk
          masalar.push({
            id: masaIndex++,
            satir: satir,
            sutun: grupIndex * 2 + 1, // Grup1: 1, Grup2: 3, Grup3: 5, Grup4: 7
            grup: grup.id,
            koltukTipi: 'ikili-sag',
            grupSira: grupIndex
          });
        }
      }
    });
  }

  // Satır ve sütun sayılarını hesapla
  const maxSatir = maxSiraSayisi;
  const maxSutun = siraTipi === 'tekli' ? gruplar.length : gruplar.length * 2;

  return {
    masalar,
    satirSayisi: maxSatir,
    sutunSayisi: maxSutun
  };
};

/**
 * Koltuk sırasını belirler - grup bazlı sıralama
 * createSalonKoltukMatrisi zaten doğru sırayı veriyor (önce sol, sonra sağ)
 */
/**
 * DÜZELTİLMİŞ: Koltuk sırasını belirler - İSTENEN SIRALAMA
 * 1. ÖNCE SOL KOLTUKLAR: Grup1-Sıra1-Sol, Grup2-Sıra1-Sol, Grup3-Sıra1-Sol, Grup4-Sıra1-Sol
 * 2. SONRA Grup1-Sıra2-Sol, Grup2-Sıra2-Sol, Grup3-Sıra2-Sol, Grup4-Sıra2-Sol
 * 3. TÜM SOL KOLTUKLARDAN SONRA SAĞ KOLTUKLAR: Grup1-Sıra1-Sağ, Grup2-Sıra1-Sağ, ...
 */
export const getKoltukSira = (salon, seed) => {
  const { masalar } = createSalonKoltukMatrisi(salon);

  const siraliKoltuklar = masalar.sort((a, b) => {
    // 1. ÖNCE koltuk tipi: Sol koltuklar (0) önce, sağ koltuklar (1) sonra
    const aTip = a.koltukTipi === 'ikili-sol' ? 0 :
                 a.koltukTipi === 'ikili-sag' ? 1 : 0;
    const bTip = b.koltukTipi === 'ikili-sol' ? 0 :
                 b.koltukTipi === 'ikili-sag' ? 1 : 0;

    if (aTip !== bTip) return aTip - bTip;

    // 2. SONRA sıra numarası: Önceki sıralar önce
    if (a.satir !== b.satir) return a.satir - b.satir;

    // 3. SONRA grup sırası: Grup1, Grup2, Grup3, Grup4 şeklinde
    if (a.grupSira !== b.grupSira) return a.grupSira - b.grupSira;

    // 4. SON olarak sütun
    return a.sutun - b.sutun;
  });

  logger.debug('🎯 DÜZELTİLMİŞ Koltuk sırası oluşturuldu!');
  logger.debug('🎯 İlk 8 koltuk:', siraliKoltuklar.slice(0, 8).map(koltuk => ({
    id: koltuk.id,
    satir: koltuk.satir,
    sutun: koltuk.sutun,
    grup: koltuk.grup,
    koltukTipi: koltuk.koltukTipi
  })));

  return siraliKoltuklar;
};
