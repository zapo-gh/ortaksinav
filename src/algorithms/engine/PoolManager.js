import logger from '../../utils/logger.js';
import { getSinifSeviyesi, seedShuffle } from '../utils/helpers.js';

/**
 * Akıllı salon havuzu oluşturma - mevcut dağıtımı geliştirir
 */
export const createAkilliSalonHavuzu = (ogrenciler, salonlar, seed) => {
    logger.info('🧠 Akıllı salon havuzu oluşturuluyor...');

    // KRİTİK: Önce öğrencileri benzersiz hale getir (duplicate önleme - 1. seviye)
    const uniqueOgrenciler = [];
    const seenIds = new Set();

    ogrenciler.forEach(ogrenci => {
        if (ogrenci && ogrenci.id && !seenIds.has(ogrenci.id)) {
            uniqueOgrenciler.push(ogrenci);
            seenIds.add(ogrenci.id);
        } else if (ogrenci && ogrenci.id) {
            logger.warn(`⚠️ DUPLICATE ÖNLEME: ${ogrenci.ad} ${ogrenci.soyad} (ID: ${ogrenci.id}) zaten listede, atlandı`);
        }
    });

    logger.info(`✅ Benzersiz öğrenci kontrolü: ${ogrenciler.length} -> ${uniqueOgrenciler.length} (${ogrenciler.length - uniqueOgrenciler.length} duplicate önlendi)`);

    const sinifSeviyeleri = {};
    uniqueOgrenciler.forEach(ogrenci => {
        const seviye = getSinifSeviyesi(ogrenci.sinif);
        if (seviye && seviye !== null) {
            if (!sinifSeviyeleri[seviye]) sinifSeviyeleri[seviye] = [];
            sinifSeviyeleri[seviye].push(ogrenci);
        }
    });

    Object.keys(sinifSeviyeleri).forEach(seviye => {
        sinifSeviyeleri[seviye] = seedShuffle(sinifSeviyeleri[seviye], seed + parseInt(seviye));
    });

    const aktifSalonlar = salonlar.filter(salon => salon.aktif);
    const salonHavuzlari = aktifSalonlar.map(() => []);
    const salonOgrenciSets = aktifSalonlar.map(() => new Set());

    const kisitAnalizi = analyzeKisitlar(uniqueOgrenciler, sinifSeviyeleri);

    return akilliDagitim(sinifSeviyeleri, aktifSalonlar, salonHavuzlari, kisitAnalizi, salonOgrenciSets);
};

/**
 * Kısıt analizi yapar
 */
export const analyzeKisitlar = (ogrenciler, sinifSeviyeleri) => {
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

        const zorluk = Math.abs(cinsiyetSayilari.Erkek - cinsiyetSayilari.Kız) / seviyeOgrencileri.length;
        analiz.seviyeBazliZorluk[seviye] = zorluk;
    });

    return analiz;
};

/**
 * EŞİT DAĞITIM algoritması - Her salona eşit sayıda öğrenci dağıtım
 */
export const akilliDagitim = (sinifSeviyeleri, aktifSalonlar, salonHavuzlari, kisitAnalizi, salonOgrenciSets = null) => {
    if (!salonOgrenciSets) {
        salonOgrenciSets = aktifSalonlar.map(() => new Set());
    }
    const toplamOgrenci = kisitAnalizi.toplamOgrenci;
    const salonSayisi = aktifSalonlar.length;

    const hedefOgrenciSayisi = Math.floor(toplamOgrenci / salonSayisi);
    const kalanOgrenci = toplamOgrenci % salonSayisi;

    aktifSalonlar.forEach((salon, index) => {
        const hedefSayi = hedefOgrenciSayisi + (index < kalanOgrenci ? 1 : 0);
        salonHavuzlari[index].hedefSayi = hedefSayi;
    });

    Object.keys(sinifSeviyeleri).forEach(seviye => {
        const seviyeOgrencileri = [...sinifSeviyeleri[seviye]];
        const seviyeToplamOgrenci = seviyeOgrencileri.length;

        const seviyeBasiOgrenci = Math.floor(seviyeToplamOgrenci / salonSayisi);
        const seviyeKalanOgrenci = seviyeToplamOgrenci % salonSayisi;

        aktifSalonlar.forEach((salon, index) => {
            const seviyeOgrenciSayisi = seviyeBasiOgrenci + (index < seviyeKalanOgrenci ? 1 : 0);

            for (let i = 0; i < seviyeOgrenciSayisi && seviyeOgrencileri.length > 0; i++) {
                const ogrenci = seviyeOgrencileri.shift();

                if (!salonOgrenciSets[index].has(ogrenci.id)) {
                    salonHavuzlari[index].push(ogrenci);
                    salonOgrenciSets[index].add(ogrenci.id);
                } else {
                    i--;
                }
            }
        });

        while (seviyeOgrencileri.length > 0) {
            let yerlestirildi = false;
            const ogrenci = seviyeOgrencileri.shift();

            for (let i = 0; i < aktifSalonlar.length; i++) {
                if (salonHavuzlari[i].length < salonHavuzlari[i].hedefSayi) {
                    if (!salonOgrenciSets[i].has(ogrenci.id)) {
                        salonHavuzlari[i].push(ogrenci);
                        salonOgrenciSets[i].add(ogrenci.id);
                        yerlestirildi = true;
                        break;
                    }
                }
            }

            if (!yerlestirildi) {
                let placed = false;
                for (let i = 0; i < aktifSalonlar.length; i++) {
                    if (!salonOgrenciSets[i].has(ogrenci.id)) {
                        const enAzDoluIndex = salonHavuzlari
                            .map((havuz, idx) => ({ havuz, idx, length: havuz.length, hasStudent: salonOgrenciSets[idx].has(ogrenci.id) }))
                            .filter(item => !item.hasStudent)
                            .sort((a, b) => a.length - b.length)[0]?.idx;

                        if (enAzDoluIndex !== undefined) {
                            salonHavuzlari[enAzDoluIndex].push(ogrenci);
                            salonOgrenciSets[enAzDoluIndex].add(ogrenci.id);
                            placed = true;
                        }
                        break;
                    }
                }
            }
        }
    });

    return salonHavuzlari;
};
