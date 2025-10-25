/**
 * Akıllı Salon Havuzu Optimizasyonu
 * Öğrencileri salonlara dengeli dağıtım
 */

import { logger } from '../../utils/logger';
import { getSinifSeviyesi, seedShuffle } from '../utils/helpers';

/**
 * Akıllı salon havuzu oluşturma - mevcut dağıtımı geliştirir
 */
export const createAkilliSalonHavuzu = (ogrenciler, salonlar, seed) => {
  logger.info('🧠 Akıllı salon havuzu oluşturuluyor...');

  // Mevcut gruplama mantığını koru
  const sinifSeviyeleri = {};
  ogrenciler.forEach(ogrenci => {
    const seviye = getSinifSeviyesi(ogrenci.sinif);
    if (!sinifSeviyeleri[seviye]) sinifSeviyeleri[seviye] = [];
    sinifSeviyeleri[seviye].push(ogrenci);
  });

  // Her seviyeyi karıştır
  Object.keys(sinifSeviyeleri).forEach(seviye => {
    sinifSeviyeleri[seviye] = seedShuffle(sinifSeviyeleri[seviye], seed + parseInt(seviye));
  });

  const aktifSalonlar = salonlar.filter(salon => salon.aktif);
  const salonHavuzlari = aktifSalonlar.map(() => []);

  // YENİ: Kısıt optimizasyonu için ön analiz
  const kisitAnalizi = analyzeKisitlar(ogrenciler, sinifSeviyeleri);

  // YENİ: Akıllı dağıtım algoritması
  return akilliDagitim(sinifSeviyeleri, aktifSalonlar, salonHavuzlari, kisitAnalizi);
};

/**
 * Kısıt analizi yapar
 */
const analyzeKisitlar = (ogrenciler, sinifSeviyeleri) => {
  const analiz = {
    seviyeBazliZorluk: {},
    cinsiyetDagilimi: { Erkek: 0, Kız: 0 },
    toplamOgrenci: ogrenciler.length
  };

  Object.keys(sinifSeviyeleri).forEach(seviye => {
    const seviyeOgrencileri = sinifSeviyeleri[seviye];
    const cinsiyetSayilari = { Erkek: 0, Kız: 0 };

    seviyeOgrencileri.forEach(ogrenci => {
      if (ogrenci.cinsiyet) {
        cinsiyetSayilari[ogrenci.cinsiyet]++;
        analiz.cinsiyetDagilimi[ogrenci.cinsiyet]++;
      }
    });

    // Zorluk skoru: tek cinsiyetli sınıflar daha zor
    const zorluk = Math.abs(cinsiyetSayilari.Erkek - cinsiyetSayilari.Kız) / seviyeOgrencileri.length;
    analiz.seviyeBazliZorluk[seviye] = zorluk;

    logger.debug(`📊 Sınıf ${seviye} analizi: ${seviyeOgrencileri.length} öğrenci, zorluk: ${zorluk.toFixed(2)}`);
  });

  return analiz;
};

/**
 * EŞİT DAĞITIM algoritması - Her salona eşit sayıda öğrenci dağıtım
 */
const akilliDagitim = (sinifSeviyeleri, aktifSalonlar, salonHavuzlari, kisitAnalizi) => {
  const toplamOgrenci = kisitAnalizi.toplamOgrenci;
  const salonSayisi = aktifSalonlar.length;

  // Her salona eşit sayıda öğrenci hedefi
  const hedefOgrenciSayisi = Math.floor(toplamOgrenci / salonSayisi);
  const kalanOgrenci = toplamOgrenci % salonSayisi;

  logger.info(`🎯 EŞİT DAĞITIM: ${toplamOgrenci} öğrenci, ${salonSayisi} salon`);
  logger.info(`🎯 Her salona hedef: ${hedefOgrenciSayisi} öğrenci, ${kalanOgrenci} öğrenci fazla`);

  // Salon hedef sayılarını hesapla (eşit dağıtım)
  aktifSalonlar.forEach((salon, index) => {
    const hedefSayi = hedefOgrenciSayisi + (index < kalanOgrenci ? 1 : 0);
    salonHavuzlari[index].hedefSayi = hedefSayi;
    logger.debug(`  📍 Salon ${salon.salonAdi || salon.ad}: hedef ${hedefSayi} öğrenci`);
  });

  // EŞİT DAĞITIM: Her sınıf seviyesinden salonlara eşit sayıda dağıt
  Object.keys(sinifSeviyeleri).forEach(seviye => {
    const seviyeOgrencileri = [...sinifSeviyeleri[seviye]];
    const seviyeToplamOgrenci = seviyeOgrencileri.length;

    logger.info(`\n🎯 Sınıf ${seviye} dağıtılıyor: ${seviyeToplamOgrenci} öğrenci`);

    // Her salona bu seviyeden eşit sayıda öğrenci ver
    const seviyeBasiOgrenci = Math.floor(seviyeToplamOgrenci / salonSayisi);
    const seviyeKalanOgrenci = seviyeToplamOgrenci % salonSayisi;

    logger.debug(`  📊 Sınıf ${seviye} dağıtımı: Her salona ${seviyeBasiOgrenci} öğrenci, ${seviyeKalanOgrenci} öğrenci fazla`);

    aktifSalonlar.forEach((salon, index) => {
      const seviyeOgrenciSayisi = seviyeBasiOgrenci + (index < seviyeKalanOgrenci ? 1 : 0);

      logger.debug(`  📍 Salon ${salon.salonAdi || salon.ad}: ${seviyeOgrenciSayisi} öğrenci alacak`);

      // Bu salona öğrencileri yerleştir
      for (let i = 0; i < seviyeOgrenciSayisi && seviyeOgrencileri.length > 0; i++) {
            salonHavuzlari[index].push(seviyeOgrencileri.shift());
      }
    });

    // Kalan öğrencileri dengeli dağıt (eğer varsa)
    while (seviyeOgrencileri.length > 0) {
      let yerlestirildi = false;

      for (let i = 0; i < aktifSalonlar.length; i++) {
        if (seviyeOgrencileri.length > 0 &&
            salonHavuzlari[i].length < salonHavuzlari[i].hedefSayi) {
          salonHavuzlari[i].push(seviyeOgrencileri.shift());
          yerlestirildi = true;
          break; // Bir öğrenci yerleştirildi, döngüyü yeniden başlat
        }
      }

      // Hiçbir salona yerleştirilemediyse, hedef sayıyı aşmaya izin ver
      if (!yerlestirildi && seviyeOgrencileri.length > 0) {
        const enAzDoluIndex = salonHavuzlari
          .map((havuz, idx) => ({ havuz, idx, length: havuz.length }))
          .sort((a, b) => a.length - b.length)[0].idx;

        salonHavuzlari[enAzDoluIndex].push(seviyeOgrencileri.shift());
        logger.warn(`  ⚠️ Kalan öğrenci en az dolu salona yerleştirildi: Salon ${aktifSalonlar[enAzDoluIndex].salonAdi || aktifSalonlar[enAzDoluIndex].ad}`);
      }
    }
  });

  // Son durumu logla
  logger.info(`\n📊 EŞİT DAĞITIM SONUÇLARI:`);
  salonHavuzlari.forEach((havuz, index) => {
    const salon = aktifSalonlar[index];
    logger.info(`  📍 Salon ${salon.salonAdi || salon.ad}: ${havuz.length} öğrenci (hedef: ${havuz.hedefSayi})`);
  });

  return salonHavuzlari;
};
