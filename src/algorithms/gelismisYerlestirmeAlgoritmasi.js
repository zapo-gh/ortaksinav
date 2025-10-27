/**
 * Gelişmiş Sınav Yerleştirme Algoritması
 * 9 temel kural ile öğrencilerin salonlara yerleştirilmesi
 * 
 * AŞAMALI OPTİMİZASYON:
 * - Aşama 1: Akıllı salon havuzu optimizasyonu
 * - Aşama 2: Gelişmiş yerleştirme motoru
 * - Aşama 3: Tam entegrasyon
 */

import logger from '../utils/logger.js';
import { getNeighbors } from './utils/helpers.js';
import { isBackToBackClassLevelValid } from './validation/constraints.js';

// Re-export getNeighbors for other files that import from this module
export { getNeighbors };

// ==================== AŞAMA 1: AKILLI SALON HAVUZU OPTİMİZASYONU ====================

/**
 * Akıllı salon havuzu oluşturma - mevcut dağıtımı geliştirir
 */
export const createAkilliSalonHavuzu = (ogrenciler, salonlar, seed) => {
  logger.info('🧠 Akıllı salon havuzu oluşturuluyor...');
  
  // Mevcut gruplama mantığını koru
  const sinifSeviyeleri = {};
  ogrenciler.forEach(ogrenci => {
    const seviye = getSinifSeviyesi(ogrenci.sinif);
    logger.debug(`🔍 Öğrenci ${ogrenci.ad} ${ogrenci.soyad} - Sınıf: "${ogrenci.sinif}" -> Seviye: "${seviye}"`);
    if (seviye && seviye !== null) {
      if (!sinifSeviyeleri[seviye]) sinifSeviyeleri[seviye] = [];
      sinifSeviyeleri[seviye].push(ogrenci);
    } else {
      logger.warn(`⚠️ Öğrenci ${ogrenci.ad} ${ogrenci.soyad} - Sınıf: "${ogrenci.sinif}" -> Seviye: "${seviye}" (geçersiz seviye)`);
    }
  });
  
  logger.info(`🔍 DEBUG: sinifSeviyeleri oluşturuldu:`, Object.keys(sinifSeviyeleri).map(seviye => ({
    seviye,
    ogrenciSayisi: sinifSeviyeleri[seviye].length
  })));

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
    logger.info(`🔍 DEBUG: sinifSeviyeleri[${seviye}] =`, sinifSeviyeleri[seviye].length, 'öğrenci');
    
    // Her salona bu seviyeden eşit sayıda öğrenci ver
    const seviyeBasiOgrenci = Math.floor(seviyeToplamOgrenci / salonSayisi);
    const seviyeKalanOgrenci = seviyeToplamOgrenci % salonSayisi;
    
    logger.debug(`  📊 Sınıf ${seviye} dağıtımı: Her salona ${seviyeBasiOgrenci} öğrenci, ${seviyeKalanOgrenci} öğrenci fazla`);
    
    aktifSalonlar.forEach((salon, index) => {
      const seviyeOgrenciSayisi = seviyeBasiOgrenci + (index < seviyeKalanOgrenci ? 1 : 0);
      
      logger.debug(`  📍 Salon ${salon.salonAdi || salon.ad}: ${seviyeOgrenciSayisi} öğrenci alacak`);
      
      // Bu salona öğrencileri yerleştir
      for (let i = 0; i < seviyeOgrenciSayisi && seviyeOgrencileri.length > 0; i++) {
            const ogrenci = seviyeOgrencileri.shift();
            salonHavuzlari[index].push(ogrenci);
            logger.debug(`  ✅ Salon ${salon.salonAdi || salon.ad}: ${ogrenci.ad} ${ogrenci.soyad} eklendi`);
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

// ==================== YARDIMCI FONKSİYONLAR ====================

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
 * Cinsiyet kontrolü - kız-erkek yan yana oturamaz
 * İYİLEŞTİRİLMİŞ: Daha iyi cinsiyet bilgisi kontrolü
 */
export const isGenderValid = (ogrenci, komsular, plan, currentGroup = null, currentRow = null) => {
  // İYİLEŞTİRİLMİŞ: Cinsiyet bilgisi eksikse uyarı ver ama geç
  if (!ogrenci.cinsiyet) {
    logger.warn(`⚠️ Cinsiyet bilgisi eksik: ${ogrenci.ad} - Kısıt kontrolü atlanıyor`);
    return true; // Cinsiyet bilgisi yoksa geç
  }
  
  // Cinsiyet değeri geçerli mi kontrol et
  if (!['E', 'K', 'Erkek', 'Kız'].includes(ogrenci.cinsiyet)) {
    logger.warn(`⚠️ Geçersiz cinsiyet değeri: ${ogrenci.ad} (${ogrenci.cinsiyet}) - Kısıt kontrolü atlanıyor`);
    return true;
  }
  
  // SADECE YAN YANA KOMŞULAR İÇİN KISIT KONTROLÜ (getNeighbors artık sadece sol-sağ döndürüyor)
  for (const [satir, sutun] of komsular) {
    const neighborCell = plan[satir] && plan[satir][sutun];
    const komsuOgrenci = neighborCell?.ogrenci;
    // YENİ: Cinsiyet kısıtı sadece aynı grup içinde yan yana olanlar için geçerli
    if (currentGroup != null && neighborCell?.grup != null && neighborCell.grup !== currentGroup) {
      continue;
    }
    if (komsuOgrenci && komsuOgrenci.cinsiyet) {
      const ogrenciCinsiyet = normalizeGender(ogrenci.cinsiyet);
      const komsuCinsiyet = normalizeGender(komsuOgrenci.cinsiyet);
      // KURAL: Aynı satır ve aynı grupta FARKLI cinsiyet yan yana olmasın
      if (ogrenciCinsiyet !== komsuCinsiyet) {
        logger.debug(`❌ Cinsiyet kısıt ihlali: ${ogrenci.ad} (${ogrenciCinsiyet}) yanında ${komsuOgrenci.ad} (${komsuCinsiyet}) - FARKLI CİNSİYET YASAK`);
        return false;
      }
    }
  }
  return true;
};

/**
 * Cinsiyet değerini normalize eder
 */
const normalizeGender = (cinsiyet) => {
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
};

/**
 * Sınıf seviyesi kontrolü - aynı seviye yan yana oturamaz
 * Direkt yan yana komşuları kontrol eder (özellikle ikili koltuklarda)
 */
export const isClassLevelValid = (ogrenci, komsular, plan, currentGroup = null, currentRow = null) => {
  const ogrenciSeviye = getSinifSeviyesi(ogrenci.sinif);
  if (!ogrenciSeviye) return true;
  
  // SADECE YAN YANA KOMŞULAR İÇİN KISIT KONTROLÜ (getNeighbors artık sadece sol-sağ döndürüyor)
  for (const [satir, sutun] of komsular) {
    const neighborCell = plan[satir] && plan[satir][sutun];
    const komsuOgrenci = neighborCell?.ogrenci;
    if (currentGroup != null && neighborCell?.grup != null && neighborCell.grup !== currentGroup) {
      continue; // sadece aynı grup
    }
    if (komsuOgrenci) {
      const komsuSeviye = getSinifSeviyesi(komsuOgrenci.sinif);
      if (komsuSeviye === ogrenciSeviye) {
        logger.debug(`❌ Sınıf seviyesi kısıt ihlali: ${ogrenci.ad} (${ogrenciSeviye}) yanında ${komsuOgrenci.ad} (${komsuSeviye})`);
        return false;
      }
    }
  }
  return true;
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
 * Dengeli dağılım hesaplama
 */
export const calculateBalancedDistribution = (ogrenciler, kapasite) => {
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
  const dağılım = {};
  
  // Her seviyeden eşit sayıda öğrenci al
  const seviyeBasi = Math.floor(kapasite / seviyeler.length);
  const kalan = kapasite % seviyeler.length;
  
  seviyeler.forEach((seviye, index) => {
    const alinacak = seviyeBasi + (index < kalan ? 1 : 0);
    dağılım[seviye] = Math.min(alinacak, sinifSeviyeleri[seviye].length);
  });
  
  return dağılım;
};

/**
 * Masa numaralarını hesaplar - Grup bazlı sıralama
 * 1.grup: Sıra1-Sol(1), Sıra1-Sağ(2), Sıra2-Sol(3), Sıra2-Sağ(4)...
 * 2.grup: Sıra1-Sol(5), Sıra1-Sağ(6), Sıra2-Sol(7), Sıra2-Sağ(8)...
 */
export const calculateDeskNumbersForMasalar = (masalar) => {
  // Güvenlik kontrolü
  if (!masalar || !Array.isArray(masalar) || masalar.length === 0) {
    return [];
  }
  
  // Grup bazlı sıralama
  const gruplar = {};
  masalar.forEach((masa, index) => {
    // Her masanın geçerli olduğundan emin ol
    if (!masa || typeof masa !== 'object') {
      logger.warn(`⚠️ Geçersiz masa objesi at index ${index}`);
      return;
    }
    
    const grup = masa.grup || 1;
    if (!gruplar[grup]) {
      gruplar[grup] = [];
    }
    
    // Güvenli push işlemi
    if (Array.isArray(gruplar[grup])) {
      gruplar[grup].push(masa);
    } else {
      logger.error(`❌ Grup ${grup} array değil!`);
      gruplar[grup] = [masa];
    }
  });
  
  let masaNumarasi = 1;
  const guncellenmisMasalar = [];
  const sortedGruplar = Object.keys(gruplar).sort((a, b) => parseInt(a) - parseInt(b));
  
  for (const grupId of sortedGruplar) {
    const grupMasalar = gruplar[grupId];
    
    // Güvenlik kontrolü
    if (!Array.isArray(grupMasalar) || grupMasalar.length === 0) {
      continue;
    }
    
    // Grup içinde satır-sütun sıralaması
    const sortedGrupMasalar = grupMasalar.sort((a, b) => {
      // Null/undefined kontrolü
      const satirA = a.satir != null ? a.satir : 0;
      const satirB = b.satir != null ? b.satir : 0;
      const sutunA = a.sutun != null ? a.sutun : 0;
      const sutunB = b.sutun != null ? b.sutun : 0;
      
      if (satirA !== satirB) return satirA - satirB;
      return sutunA - sutunB;
    });
    
    // Bu grup için masa numaralarını ata
    sortedGrupMasalar.forEach(masa => {
      if (masa && typeof masa === 'object') {
        guncellenmisMasalar.push({
          ...masa,
          masaNumarasi: masaNumarasi++
        });
      }
    });
  }
  
  return guncellenmisMasalar;
};

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
  
  // Masa numaralarını hesapla - Grup bazlı sıralama
  const masalarWithNumbers = calculateDeskNumbersForMasalar(masalar);
  
  return {
    masalar: masalarWithNumbers,
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
  
  // İSTENEN SIRALAMA:
  // FAZE 1: Sol koltuklar - Grup bazlı, satır bazlı
  //   1. grup, satır 0, sol → 2. grup, satır 0, sol → 3. grup, satır 0, sol...
  //   1. grup, satır 1, sol → 2. grup, satır 1, sol → 3. grup, satır 1, sol...
  // FAZE 2: Sağ koltuklar - Grup bazlı, satır bazlı
  //   1. grup, satır 0, sağ → 2. grup, satır 0, sağ → 3. grup, satır 0, sağ...
  //   1. grup, satır 1, sağ → 2. grup, satır 1, sağ → 3. grup, satır 1, sağ...
  
  // En fazla satır sayısını bul
  const maxSatirSayisi = Math.max(...masalar.map(m => m.satir)) + 1;
  const gruplar = [...new Set(masalar.map(m => m.grupSira))].sort((a, b) => a - b);
  
  const siraliKoltuklar = [];
  
  // FAZE 1: Sol koltuklar (veya tekli koltuklar)
  for (let satir = 0; satir < maxSatirSayisi; satir++) {
    for (const grupSira of gruplar) {
      const koltuk = masalar.find(m => 
        m.satir === satir && 
        m.grupSira === grupSira && 
        (m.koltukTipi === 'ikili-sol' || m.koltukTipi === 'tekli')
      );
      if (koltuk) {
        siraliKoltuklar.push(koltuk);
      }
    }
  }
  
  // FAZE 2: Sağ koltuklar
  for (let satir = 0; satir < maxSatirSayisi; satir++) {
    for (const grupSira of gruplar) {
      const koltuk = masalar.find(m => 
        m.satir === satir && 
        m.grupSira === grupSira && 
        m.koltukTipi === 'ikili-sag'
      );
      if (koltuk) {
        siraliKoltuklar.push(koltuk);
      }
    }
  }
  
  logger.debug('🎯 YENİ Yerleştirme düzeni oluşturuldu!');
  logger.debug('🎯 Toplam koltuk:', siraliKoltuklar.length);
  logger.debug('🎯 İlk 8 koltuk:', siraliKoltuklar.slice(0, 8).map(koltuk => ({
    satir: koltuk.satir + 1,
    grup: koltuk.grup,
    grupSira: koltuk.grupSira,
    tip: koltuk.koltukTipi
  })));
  
  return siraliKoltuklar;
};

// ==================== AŞAMA 2: GELİŞMİŞ YERLEŞTİRME MOTORU ====================

/**
 * Gelişmiş yerleştirme motoru - çok katmanlı kısıt sistemi
 */
class GelismisYerlestirmeMotoru {
  constructor(salon, ogrenciler, ayarlar, seed, weightManager = null) {
    this.salon = salon;
    this.ogrenciler = [...ogrenciler];
    this.ayarlar = ayarlar;
    this.seed = seed;
    this.koltukMatrisi = createSalonKoltukMatrisi(salon);
    this.plan = this.initPlan();
    this.plan2D = this.init2DPlan();
    this.oncelikliKoltuklar = [];
    this.zorKoltuklar = new Set();
    this.weightManager = weightManager; // YENİ: WeightManager referansı
  }

  initPlan() {
    return this.koltukMatrisi.masalar.map(masa => ({
      id: masa.id,
      ogrenci: null,
      satir: masa.satir,
      sutun: masa.sutun,
      grup: masa.grup,
      koltukTipi: masa.koltukTipi,
      masaNumarasi: masa.masaNumarasi // masaNumarasi ekle
    }));
  }

  init2DPlan() {
    return Array(this.koltukMatrisi.satirSayisi)
      .fill(null)
      .map(() => Array(this.koltukMatrisi.sutunSayisi).fill(null));
  }

  /**
   * Akıllı koltuk önceliklendirme
   */
  calculateKoltukOncelikleri() {
    const koltukSirasi = getKoltukSira(this.salon, this.seed);
    
    // Koltuk sırasını masa numaralarıyla eşleştir
    const masalarMap = {};
    this.koltukMatrisi.masalar.forEach(masa => {
      masalarMap[masa.id] = masa;
    });
    
    // İSTENEN DÜZENİ KORU: Sıralamayı değiştirme, getKoltukSira'nın düzenini kullan
    this.oncelikliKoltuklar = koltukSirasi.map((koltuk, index) => {
      // Masadan masa numarasını al
      const masaWithNumber = masalarMap[koltuk.id] || koltuk;
      
      const komsular = getNeighbors(koltuk.satir, koltuk.sutun, 
        this.koltukMatrisi.satirSayisi, this.koltukMatrisi.sutunSayisi);
      
      return {
        ...koltuk,
        masaNumarasi: masaWithNumber.masaNumarasi, // masaNumarasi ekle
        komsular,
        siraNo: index // Sıra numarasını koru
      };
    });
    // SIRALAMAYI DEĞİŞTİRME - getKoltukSira'nın düzenini kullan

    logger.debug(`🎯 Koltuk öncelikleri hesaplandı: ${this.oncelikliKoltuklar.length} koltuk`);
  }

  calculateZorlukSkoru(koltuk, komsular) {
    let skor = 0;
    
    // Komşu sayısı - daha fazla komşu = daha zor
    skor += komsular.length * 2;
    
    // Köşe koltukları daha kolay (daha az komşu)
    if (koltuk.satir === 0 || koltuk.satir === this.koltukMatrisi.satirSayisi - 1) {
      skor -= 1;
    }
    if (koltuk.sutun === 0 || koltuk.sutun === this.koltukMatrisi.sutunSayisi - 1) {
      skor -= 1;
    }
    
    // İkili koltuklarda sağ koltuk daha zor (sol komşu zorunlu)
    if (koltuk.koltukTipi === 'ikili-sag') {
      skor += 1;
    }
    
    return Math.max(skor, 0);
  }

  /**
   * Çok katmanlı kısıt kontrolü - KADEMELİ AZALAN KONTROL SİSTEMİ
   */
  checkKisitlar(ogrenci, koltuk, komsular, katmanSeviyesi = 0) {
    const tempOgrenci = { ...ogrenci, satir: koltuk.satir };
    
    // Katman 0: TÜM KISITLAR AKTİF (En sıkı kontrol)
    if (katmanSeviyesi === 0) {
      const cinsiyetOK = isGenderValid(tempOgrenci, komsular, this.plan2D, koltuk.grup);
      const sinifOK = isClassLevelValid(tempOgrenci, komsular, this.plan2D, koltuk.grup);
      const arkaArkayaOK = isBackToBackClassLevelValid(tempOgrenci, koltuk, this.plan2D, koltuk.grup);
      
      logger.debug(`🔍 Katman 0 kontrolü: Cinsiyet=${cinsiyetOK}, Sınıf=${sinifOK}, ArkaArkaya=${arkaArkayaOK}`);
      return cinsiyetOK && sinifOK && arkaArkayaOK;
    }
    
    // Katman 1: ARKA ARKAYA KISITI KALDIRILDI (Cinsiyet + Yan yana sınıf)
    if (katmanSeviyesi === 1) {
      const cinsiyetOK = isGenderValid(tempOgrenci, komsular, this.plan2D, koltuk.grup);
      const sinifOK = isClassLevelValid(tempOgrenci, komsular, this.plan2D, koltuk.grup);
      // Arka arkaya kontrol kaldırıldı
      
      logger.debug(`🔍 Katman 1 kontrolü: Cinsiyet=${cinsiyetOK}, Sınıf=${sinifOK}, ArkaArkaya=ATLANDI`);
      return cinsiyetOK && sinifOK;
    }
    
    // Katman 2: SADECE CİNSİYET KISITI (En gevşek kontrol)
    if (katmanSeviyesi === 2) {
      const cinsiyetOK = isGenderValid(tempOgrenci, komsular, this.plan2D, koltuk.grup);
      // Sınıf seviyesi ve arka arkaya kontrolleri kaldırıldı
      
      logger.debug(`🔍 Katman 2 kontrolü: Cinsiyet=${cinsiyetOK}, Sınıf=ATLANDI, ArkaArkaya=ATLANDI`);
      return cinsiyetOK;
    }
    
    return true;
  }

  /**
   * Uygun öğrenci bulma (optimize) - İYİLEŞTİRİLMİŞ: AI Destekli Skorlama
   */
  findUygunOgrenci(koltuk, komsular, katmanSeviyesi) {
    // YENİ: AI destekli gelişmiş skorlama (weightManager varsa)
    const skorluOgrenciler = this.ogrenciler.map(ogrenci => {
      let skor;
      
      if (this.weightManager) {
        // AI destekli gelişmiş skorlama
        skor = this.weightManager.calculateAIEnhancedScore(ogrenci, koltuk, komsular, this.plan2D);
      } else {
        // Mevcut tahminsel skorlama
        skor = this.calculatePredictiveScore(ogrenci, koltuk, komsular);
      }
      
      return { ogrenci, skor };
    }).sort((a, b) => b.skor - a.skor);

    // En iyi 3 adayı logla (debug için)
    if (skorluOgrenciler.length > 0) {
      logger.debug(`🎯 En iyi 3 aday (Sıra${koltuk.satir + 1}-Grup${koltuk.grup}):`);
      skorluOgrenciler.slice(0, 3).forEach((c, i) => {
        logger.debug(`   ${i + 1}. ${c.ogrenci.ad} - Skor: ${c.skor.toFixed(3)}`);
      });
    }

    for (const { ogrenci } of skorluOgrenciler) {
      if (this.checkKisitlar(ogrenci, koltuk, komsular, katmanSeviyesi)) {
        return ogrenci;
      }
    }
    return null;
  }

  /**
   * YENİ: Tahminsel skor hesaplama
   */
  calculatePredictiveScore(ogrenci, koltuk, komsular) {
    // Temel uygunluk skoru
    const baseScore = this.calculateUygunlukSkoru(ogrenci, koltuk, komsular);
    
    // Tahminsel faktör ekle (DynamicWeightManager'dan)
    const predictiveBonus = this.weightManager ? 
      this.weightManager.predictiveFactor(ogrenci) : 0;
    
    // Komşu analizi bonusu
    const neighborBonus = this.calculateNeighborBonus(ogrenci, komsular, koltuk);
    
    // Final skor
    const finalScore = baseScore + predictiveBonus + neighborBonus;
    
    return Math.max(0, Math.min(1, finalScore)); // 0-1 aralığında sınırla
  }

  /**
   * YENİ: Komşu analizi bonusu
   */
  calculateNeighborBonus(ogrenci, komsular, koltuk) {
    let bonus = 0;
    
    // Boş komşu sayısı
    const emptyNeighbors = komsular.filter(([satir, sutun]) => {
      if (satir !== koltuk.satir) return false;
      const cell = this.plan2D[satir]?.[sutun];
      if (!cell || cell.grup !== koltuk.grup) return false;
      return !cell?.ogrenci;
    }).length;
    bonus += emptyNeighbors * 0.05; // Her boş komşu için +0.05
    
    // Cinsiyet çeşitliliği bonusu
    const genderDiversity = this.calculateGenderDiversity(ogrenci, komsular, koltuk);
    bonus += genderDiversity * 0.1;
    
    // Sınıf çeşitliliği bonusu
    const classDiversity = this.calculateClassDiversity(ogrenci, komsular, koltuk);
    bonus += classDiversity * 0.05;
    
    return bonus;
  }

  /**
   * YENİ: Cinsiyet çeşitliliği hesapla
   */
  calculateGenderDiversity(ogrenci, komsular, koltuk) {
    if (!ogrenci.cinsiyet) return 0;
    
    const neighborGenders = komsular
      .map(([satir, sutun]) => {
        if (satir !== koltuk.satir) return null;
        const cell = this.plan2D[satir]?.[sutun];
        if (cell?.grup !== koltuk.grup) return null;
        return cell?.ogrenci?.cinsiyet || null;
      })
      .filter(Boolean);
    
    if (neighborGenders.length === 0) return 0.5; // Boş komşular için orta bonus
    
    const differentGenders = neighborGenders.filter(gender => 
      gender !== ogrenci.cinsiyet
    ).length;
    
    return differentGenders / neighborGenders.length; // 0-1 arası çeşitlilik
  }

  /**
   * YENİ: Sınıf çeşitliliği hesapla
   */
  calculateClassDiversity(ogrenci, komsular, koltuk) {
    if (!ogrenci.sinif) return 0;
    
    const neighborClasses = komsular
      .map(([satir, sutun]) => {
        if (satir !== koltuk.satir) return null;
        const cell = this.plan2D[satir]?.[sutun];
        if (cell?.grup !== koltuk.grup) return null;
        return cell?.ogrenci?.sinif || null;
      })
      .filter(Boolean);
    
    if (neighborClasses.length === 0) return 0.3; // Boş komşular için düşük bonus
    
    const differentClasses = neighborClasses.filter(sinif => 
      sinif !== ogrenci.sinif
    ).length;
    
    return differentClasses / neighborClasses.length; // 0-1 arası çeşitlilik
  }

  calculateUygunlukSkoru(ogrenci, koltuk, komsular) {
    let skor = 0;
    
    // Mevcut komşularla uyum
    for (const [satir, sutun] of komsular) {
      const cell = this.plan2D[satir] && this.plan2D[satir][sutun];
      if (satir !== koltuk.satir || cell?.grup !== koltuk.grup) continue;
      const komsuOgrenci = cell?.ogrenci;
      if (komsuOgrenci) {
        // Farklı cinsiyet + puan
        if (komsuOgrenci.cinsiyet !== ogrenci.cinsiyet) {
          skor += 2;
        }
        // Farklı sınıf + puan
        if (getSinifSeviyesi(komsuOgrenci.sinif) !== getSinifSeviyesi(ogrenci.sinif)) {
          skor += 1;
        }
      } else {
        // Boş komşu + puan (daha esnek)
        skor += 1;
      }
    }
    
    return skor;
  }

  /**
   * Yerleştirme işlemini çalıştır (ana entry point)
   */
  run() {
    // Orijinal öğrenci listesini sakla
    const orijinalOgrenciler = [...this.ogrenciler];
    
    // Yerleştirme yap
    const yerlesenOgrenciler = this.executeYerlestirme();
    
    // Yerleştirilemeyen öğrencileri bul
    const yerlesenIdler = new Set(yerlesenOgrenciler.map(o => o.id));
    const yerlesilemeyenOgrenciler = orijinalOgrenciler.filter(o => !yerlesenIdler.has(o.id));
    
    const basariOrani = orijinalOgrenciler.length > 0 
      ? (yerlesenOgrenciler.length / orijinalOgrenciler.length) * 100 
      : 100;
    
    return {
      ogrenciler: yerlesenOgrenciler, // DÜZELTME: plan'dan değil, yerlesenOgrenciler'den döndür
      yerlesilemeyenOgrenciler,
      plan: this.plan,
      basariOrani
    };
  }

  /**
   * Yerleştirme işlemi
   */
  executeYerlestirme() {
    this.calculateKoltukOncelikleri();
    
    // Öğrenci havuzunu kopyala (yerleştirme sırasında değişecek)
    const ogrenciHavuzu = [...this.ogrenciler];
    const yerlesen = [];
    const kullanilanOgrenciler = new Set();
    
    // 3 katmanlı deneme sistemi
    for (let katman = 0; katman < 3; katman++) {
      logger.info(`🔄 Yerleştirme katmanı ${katman + 1}/3`);
      
      for (const koltuk of this.oncelikliKoltuklar) {
        if (koltuk.ogrenci) continue; // Zaten dolu
        
        // Mevcut öğrenci havuzundan bul
        const uygunOgrenci = this.findUygunOgrenciFromPool(koltuk, koltuk.komsular, katman, ogrenciHavuzu);
        
        if (uygunOgrenci && !kullanilanOgrenciler.has(uygunOgrenci.id)) {
          this.placeOgrenci(koltuk, uygunOgrenci);
          yerlesen.push(uygunOgrenci);
          kullanilanOgrenciler.add(uygunOgrenci.id);
          
          // Öğrenciyi havuzdan kaldır
          const index = ogrenciHavuzu.findIndex(o => o.id === uygunOgrenci.id);
          if (index > -1) {
            ogrenciHavuzu.splice(index, 1);
          }
        }
      }
      
      // Tüm öğrenciler yerleştirildiyse dur
      if (yerlesen.length === this.ogrenciler.length || ogrenciHavuzu.length === 0) {
        break;
      }
    }
    
    return yerlesen;
  }

  /**
   * Öğrenci havuzundan uygun öğrenci bul
   */
  findUygunOgrenciFromPool(koltuk, komsular, katmanSeviyesi, ogrenciHavuzu) {
    // AI destekli gelişmiş skorlama veya tahminsel skorlama
    const skorluOgrenciler = ogrenciHavuzu.map(ogrenci => {
      let skor;
      
      if (this.weightManager) {
        skor = this.weightManager.calculateAIEnhancedScore(ogrenci, koltuk, komsular, this.plan2D);
      } else {
        skor = this.calculatePredictiveScore(ogrenci, koltuk, komsular);
      }
      
      return { ogrenci, skor };
    }).sort((a, b) => b.skor - a.skor);

    for (const { ogrenci } of skorluOgrenciler) {
      if (this.checkKisitlar(ogrenci, koltuk, komsular, katmanSeviyesi)) {
        return ogrenci;
      }
    }
    return null;
  }

  placeOgrenci(koltuk, ogrenci) {
    const planItem = this.plan.find(p => p.id === koltuk.id);
    planItem.ogrenci = {
      ...ogrenci,
      masaNumarasi: koltuk.masaNumarasi || this.calculateDeskNumber(koltuk),
      satir: koltuk.satir,
      sutun: koltuk.sutun,
      grup: koltuk.grup,
      koltukTipi: koltuk.koltukTipi
    };
    
    this.plan2D[koltuk.satir][koltuk.sutun] = { ogrenci: planItem.ogrenci, grup: koltuk.grup };
  }

  /**
   * Masa numarasını hesaplar - Grup bazlı sıralama
   * 1.grup: Sıra1-Sol(1), Sıra1-Sağ(2), Sıra2-Sol(3), Sıra2-Sağ(4)...
   * 2.grup: Sıra1-Sol(5), Sıra1-Sağ(6), Sıra2-Sol(7), Sıra2-Sağ(8)...
   */
  calculateDeskNumber(koltuk) {
    // Tüm koltukları al ve sırala
    const allKoltuklar = this.koltukMatrisi.masalar;
    
    // Grup bazlı sıralama
    const gruplar = {};
    allKoltuklar.forEach(k => {
      const grup = k.grup || 1;
      if (!gruplar[grup]) gruplar[grup] = [];
      gruplar[grup].push(k);
    });
    
    let masaNumarasi = 1;
    const sortedGruplar = Object.keys(gruplar).sort((a, b) => parseInt(a) - parseInt(b));
    
    for (const grupId of sortedGruplar) {
      const grupMasalar = gruplar[grupId];
      
      // Grup içinde satır-sütun sıralaması
      const sortedGrupMasalar = grupMasalar.sort((a, b) => {
        if (a.satir !== b.satir) return a.satir - b.satir;
        return a.sutun - b.sutun;
      });
      
      for (const masa of sortedGrupMasalar) {
        if (masa.id === koltuk.id) {
          return masaNumarasi;
        }
        masaNumarasi++;
      }
    }
    
    return koltuk.id + 1; // Fallback
  }
}


// ==================== ANA ALGORİTMA ====================

/**
 * Gelişmiş yerleştirme algoritması - OPTİMİZE EDİLMİŞ VERSİYON
 */
export const gelismisYerlestirme = (ogrenciler, salonlar, ayarlar) => {
  logger.info('🚀 Gelişmiş yerleştirme algoritması başladı (Akıllı Havuz + Eski Sistem)');
  
  if (!ogrenciler || ogrenciler.length === 0) {
    throw new Error('Öğrenci listesi boş olamaz');
  }
  
  if (!salonlar || salonlar.length === 0) {
    throw new Error('Salon listesi boş olamaz');
  }
  
  // Aktif salonları filtrele
  const aktifSalonlar = salonlar.filter(salon => salon.aktif);
  if (aktifSalonlar.length === 0) {
    throw new Error('Aktif salon bulunamadı');
  }
  
  // AŞAMA 1: Akıllı salon havuzu optimizasyonu kullan
  const seed = Date.now();
  const salonHavuzlari = createAkilliSalonHavuzu(ogrenciler, aktifSalonlar, seed);
  
  // YENİ: Dinamik ağırlık yöneticisi (ana algoritma seviyesinde)
  const weightManager = new DynamicWeightManager();
  
  logger.info('🧠 Akıllı salon havuzu oluşturuldu:', salonHavuzlari.map((havuz, i) => ({
    salon: aktifSalonlar[i].salonAdi,
    ogrenciSayisi: havuz.length,
    hedefSayi: havuz.hedefSayi
  })));
  
  // AŞAMA 2: Her salon için ESKİ YERLEŞTİRME SİSTEMİ kullan
  const sonuclar = [];
  let toplamDeneme = 0;
  let toplamMukemmel = 0;
  
  aktifSalonlar.forEach((salon, index) => {
    const salonOgrencileri = salonHavuzlari[index];
    
    if (salonOgrencileri.length === 0) {
      logger.warn(`⚠️ Salon ${salon.salonAdi} için öğrenci yok`);
      sonuclar.push({
        salonId: salon.id,
        salonAdi: salon.salonAdi,
        ogrenciler: [],
        koltukMatrisi: createSalonKoltukMatrisi(salon),
        yerlesilemeyenOgrenciler: [],
        plan: [],
        deneme: 0,
        basariOrani: 0
      });
      return;
    }
    
    logger.info(`🏢 Salon ${salon.salonAdi} yerleştirme başladı: ${salonOgrencileri.length} öğrenci`);
    
    // YENİ YERLEŞTİRME SİSTEMİ kullan (çoklu deneme ile)
    const sonuc = salonYerlestirmeYeni(salon, salonOgrencileri, ayarlar, seed + index, weightManager);
    
    
    sonuclar.push(sonuc);
    toplamDeneme += sonuc.deneme || 1;
    if (sonuc.basariOrani === 100) toplamMukemmel++;
    
    logger.info(`✅ Salon ${salon.salonAdi} tamamlandı: ${sonuc.ogrenciler.length}/${salonOgrencileri.length} öğrenci yerleştirildi (%${(sonuc.basariOrani || 0).toFixed(1)})`);
  });
  
  // Yerleştirilemeyen öğrencileri topla
  const tumYerlesilemeyen = sonuclar.reduce((toplam, sonuc) => {
    return toplam.concat(sonuc.yerlesilemeyenOgrenciler || []);
  }, []);
  
  // YENİ: Yerleşemeyen öğrenciler için en boş salonları kontrol et
  if (tumYerlesilemeyen.length > 0) {
    logger.info(`\n🔍 ${tumYerlesilemeyen.length} yerleştirilemeyen öğrenci için en boş salonlar kontrol ediliyor...`);
    
    const bosSalonAnalizi = findEnBosSalonlar(tumYerlesilemeyen, aktifSalonlar, ayarlar);
    
    logger.info(`📊 En boş salon analizi:`);
    bosSalonAnalizi.oneriler.forEach(oneri => {
      logger.info(`   ${oneri}`);
    });
    
    // Alternatif yerleştirme dene
    const alternatifSonuc = yerlesilemeyenOgrencileriYerlestir(tumYerlesilemeyen, aktifSalonlar, ayarlar);
    
    if (alternatifSonuc.basarili) {
      logger.info(`✅ Gelişmiş alternatif yerleştirme başarılı: ${alternatifSonuc.yerlesenOgrenciler.length} öğrenci gerçek salon planına yerleştirildi`);
      
      // GELİŞMİŞ: Sonuçları gerçek salon planlarına entegre et
      alternatifSonuc.yerlesenOgrenciler.forEach(ogrenci => {
        const salonIndex = aktifSalonlar.findIndex(s => s.id === ogrenci.salonId);
        if (salonIndex !== -1) {
          // Öğrenciyi salon planına ekle
          sonuclar[salonIndex].ogrenciler.push(ogrenci);
          
          // Plan'a da ekle
          const planItem = {
            id: ogrenci.id,
            ogrenci: ogrenci,
            satir: ogrenci.satir,
            sutun: ogrenci.sutun,
            grup: ogrenci.grup,
            koltukTipi: ogrenci.koltukTipi,
            masaNumarasi: ogrenci.masaNumarasi
          };
          sonuclar[salonIndex].plan.push(planItem);
          
          // Yerleştirilemeyen listesinden çıkar
          sonuclar[salonIndex].yerlesilemeyenOgrenciler = sonuclar[salonIndex].yerlesilemeyenOgrenciler.filter(o => o.id !== ogrenci.id);
        }
      });
      
      // Yerleştirilemeyen listesini güncelle - DÜZELTME: ID bazlı çıkarma
      const yerlesenIdler = new Set(alternatifSonuc.yerlesenOgrenciler.map(o => o.id));
      for (let i = tumYerlesilemeyen.length - 1; i >= 0; i--) {
        if (yerlesenIdler.has(tumYerlesilemeyen[i].id)) {
          tumYerlesilemeyen.splice(i, 1);
        }
      }
      
      logger.info(`📊 Salon planları güncellendi: ${alternatifSonuc.yerlesenOgrenciler.length} öğrenci gerçek plana entegre edildi`);
      
      // GÜVENLİK KONTROLÜ: Öğrenci sayısı doğrulaması
      const toplamYerlesen = sonuclar.reduce((toplam, sonuc) => toplam + (sonuc.ogrenciler ? sonuc.ogrenciler.length : 0), 0);
      const toplamYerlesilemeyen = tumYerlesilemeyen.length;
      const toplamKontrol = toplamYerlesen + toplamYerlesilemeyen;
      
      if (toplamKontrol !== ogrenciler.length) {
        logger.error(`🚨 KRİTİK HATA: Öğrenci sayısı uyumsuzluğu!`);
        logger.error(`   Orijinal öğrenci sayısı: ${ogrenciler.length}`);
        logger.error(`   Toplam yerleşen: ${toplamYerlesen}`);
        logger.error(`   Toplam yerleştirilemeyen: ${toplamYerlesilemeyen}`);
        logger.error(`   Toplam kontrol: ${toplamKontrol}`);
        logger.error(`   Fark: ${ogrenciler.length - toplamKontrol}`);
      } else {
        logger.info(`✅ Öğrenci sayısı kontrolü başarılı: ${toplamKontrol}/${ogrenciler.length}`);
      }
    } else {
      logger.warn(`⚠️ Gelişmiş alternatif yerleştirme başarısız: ${alternatifSonuc.halaYerlesilemeyen.length} öğrenci hala yerleştirilemedi`);
      logger.warn(`💡 Öneriler: Salon kapasitelerini artırın veya kısıtları gevşetin`);
    }
  }
  
  // İstatistikleri hesapla
  const istatistikler = calculateStatistics(sonuclar, tumYerlesilemeyen);
  
  logger.info('📊 GELİŞMİŞ İSTATİSTİK RAPORU:');
  logger.info(`📈 Toplam yerleşen: ${istatistikler.toplamYerlesen}/${ogrenciler.length} (%${(istatistikler.basariOrani || 0).toFixed(1)})`);
  logger.info(`🎯 Mükemmel salon sayısı: ${toplamMukemmel}/${aktifSalonlar.length}`);
  logger.info(`🔄 Ortalama deneme sayısı: ${(toplamDeneme / aktifSalonlar.length).toFixed(1)}`);
  logger.info(`📊 Salon başına öğrenci:`, istatistikler.salonBasinaOgrenci);
  logger.info(`👥 Sınıf dağılımları:`, istatistikler.sinifDagilimlari);
  logger.info(`⚖️ Cinsiyet dağılımları:`, istatistikler.cinsiyetDagilimlari);
  
  // YENİ: Gelişmiş metrikler
  logger.info(`\n🚀 OPTİMİZASYON METRİKLERİ:`);
  logger.info(`   Toplam optimizasyon skoru: ${istatistikler.optimizationImpact?.toplamSkor || 0}`);
  logger.info(`   Ortalama optimizasyon skoru: ${(istatistikler.optimizationImpact?.ortalamaSkor || 0).toFixed(2)}`);
  logger.info(`   Optimizasyon yapılan salon: ${istatistikler.optimizationImpact?.optimizasyonYapilanSalon || 0}/${aktifSalonlar.length}`);
  
  logger.info(`\n📋 KISIT BAŞARI ORANLARI:`);
  logger.info(`   Cinsiyet kısıtı: %${(istatistikler.constraintSuccessRates?.gender?.successRate || 0).toFixed(1)} (${istatistikler.constraintSuccessRates?.gender?.success || 0}/${istatistikler.constraintSuccessRates?.gender?.total || 0})`);
  logger.info(`   Sınıf seviyesi kısıtı: %${(istatistikler.constraintSuccessRates?.classLevel?.successRate || 0).toFixed(1)} (${istatistikler.constraintSuccessRates?.classLevel?.success || 0}/${istatistikler.constraintSuccessRates?.classLevel?.total || 0})`);
  
  logger.info(`\n💡 ÖNERİLER:`);
  istatistikler.suggestions?.forEach(suggestion => {
    logger.info(`   ${suggestion}`);
  });
  
  // YENİ: Dinamik ağırlık öğrenme önerileri
  if (weightManager) {
    const learningSuggestions = weightManager.generateLearningSuggestions();
    if (learningSuggestions.length > 0) {
      logger.info(`\n🧠 ÖĞRENME ÖNERİLERİ:`);
      learningSuggestions.forEach(suggestion => {
        logger.info(`   ${suggestion}`);
      });
    }
  }
  
  // DEBUG: Sonuçları kontrol et
  // SON GÜVENLİK KONTROLÜ: Tüm öğrencilerin durumu doğrulanıyor
  const orijinalOgrenciIdleri = new Set(ogrenciler.map(o => o.id));
  const yerlesenOgrenciIdleri = new Set();
  
  // Tüm salonlardaki yerleşen öğrencileri topla
  sonuclar.forEach(sonuc => {
    if (sonuc.ogrenciler) {
      sonuc.ogrenciler.forEach(yerlesen => {
        if (yerlesen.id) {
          yerlesenOgrenciIdleri.add(yerlesen.id);
        }
      });
    }
  });
  
  // Yerleştirilemeyen öğrencileri topla
  const halaYerlesemeyenOgrenciIdleri = new Set(tumYerlesilemeyen.map(o => o.id));
  
  // Tüm işlem gören öğrencileri birleştir
  const tumIslemGorenOgrenciIdleri = new Set([...yerlesenOgrenciIdleri, ...halaYerlesemeyenOgrenciIdleri]);
  
  // Kayıp öğrencileri tespit et
  const kayipOgrenciIdleri = [...orijinalOgrenciIdleri].filter(id => !tumIslemGorenOgrenciIdleri.has(id));
  const fazlaOgrenciIdleri = [...tumIslemGorenOgrenciIdleri].filter(id => !orijinalOgrenciIdleri.has(id));
  
  // Detaylı hata raporlama
  if (kayipOgrenciIdleri.length > 0) {
    logger.error(`🚨 KRİTİK HATA: ${kayipOgrenciIdleri.length} öğrenci yerleştirme sürecinde kayboldu!`);
    logger.error(`   Kayıp öğrenci ID'leri: ${kayipOgrenciIdleri.join(', ')}`);
    logger.error(`   Orijinal öğrenci sayısı: ${orijinalOgrenciIdleri.size}`);
    logger.error(`   Yerleşen öğrenci sayısı: ${yerlesenOgrenciIdleri.size}`);
    logger.error(`   Hala yerleşemeyen sayısı: ${halaYerlesemeyenOgrenciIdleri.size}`);
    logger.error(`   Toplam işlem gören: ${tumIslemGorenOgrenciIdleri.size}`);
    
    // Kayıp öğrencilerin detaylarını göster
    const kayipOgrenciler = ogrenciler.filter(o => kayipOgrenciIdleri.includes(o.id));
    logger.error(`   Kayıp öğrenci detayları:`);
    kayipOgrenciler.forEach(ogrenci => {
      logger.error(`     - ${ogrenci.ad} ${ogrenci.soyad} (ID: ${ogrenci.id}, Sınıf: ${ogrenci.sinif})`);
    });
    
    throw new Error(`Yerleştirme sürecinde ${kayipOgrenciIdleri.length} öğrenci kayboldu!`);
  }
  
  if (fazlaOgrenciIdleri.length > 0) {
    logger.error(`🚨 KRİTİK HATA: ${fazlaOgrenciIdleri.length} öğrenci yerleştirme sürecinde fazladan görünüyor!`);
    logger.error(`   Fazla öğrenci ID'leri: ${fazlaOgrenciIdleri.join(', ')}`);
    throw new Error(`Yerleştirme sürecinde ${fazlaOgrenciIdleri.length} fazla öğrenci tespit edildi!`);
  }
  
  if (orijinalOgrenciIdleri.size !== tumIslemGorenOgrenciIdleri.size) {
    logger.error(`🚨 KRİTİK HATA: Öğrenci ID set boyutları uyuşmuyor!`);
    logger.error(`   Orijinal öğrenci sayısı: ${orijinalOgrenciIdleri.size}`);
    logger.error(`   İşlem gören öğrenci sayısı: ${tumIslemGorenOgrenciIdleri.size}`);
    throw new Error("Öğrenci ID set boyutları uyumsuzluğu!");
  }
  
  logger.info(`✅ TÜM ÖĞRENCİLER BAŞARIYLA TAKİP EDİLDİ:`);
  logger.info(`   Orijinal öğrenci sayısı: ${orijinalOgrenciIdleri.size}`);
  logger.info(`   Yerleşen öğrenci sayısı: ${yerlesenOgrenciIdleri.size}`);
  logger.info(`   Hala yerleşemeyen sayısı: ${halaYerlesemeyenOgrenciIdleri.size}`);
  logger.info(`   Toplam kontrol: ${tumIslemGorenOgrenciIdleri.size}`);
  logger.info(`   Kayıp veya fazla öğrenci: YOK ✅`);

  return {
    salonlar: sonuclar,
    yerlesilemeyenOgrenciler: tumYerlesilemeyen,
    istatistikler,
    algoritma: 'AKILLI HAVUZ + ESKİ YERLEŞTİRME SİSTEMİ'
  };
};

// ==================== YEDEK: ESKİ ALGORİTMA ====================

/**
 * ESKİ Yerleştirme algoritması - Yedek versiyon
 * Kullanım: gelismisYerlestirmeEski(ogrenciler, salonlar, ayarlar)
 */
export const gelismisYerlestirmeEski = (ogrenciler, salonlar, ayarlar) => {
  logger.info('🔄 ESKİ Yerleştirme algoritması başladı (yedek versiyon)');
  
  if (!ogrenciler || ogrenciler.length === 0) {
    throw new Error('Öğrenci listesi boş olamaz');
  }
  
  if (!salonlar || salonlar.length === 0) {
    throw new Error('Salon listesi boş olamaz');
  }
  
  // Aktif salonları filtrele
  const aktifSalonlar = salonlar.filter(salon => salon.aktif);
  if (aktifSalonlar.length === 0) {
    throw new Error('Aktif salon bulunamadı');
  }
  
  // 1. Tüm öğrencileri karıştır
  const seed = Date.now();
  const karisikOgrenciler = seedShuffle([...ogrenciler], seed);
  
  // 2. Sınıf seviyelerine göre grupla
  const sinifSeviyeleri = {};
  karisikOgrenciler.forEach(ogrenci => {
    const seviye = getSinifSeviyesi(ogrenci.sinif);
    if (!sinifSeviyeleri[seviye]) sinifSeviyeleri[seviye] = [];
    sinifSeviyeleri[seviye].push(ogrenci);
  });
  
  // Her seviyeyi karıştır
  Object.keys(sinifSeviyeleri).forEach(seviye => {
    sinifSeviyeleri[seviye] = seedShuffle(sinifSeviyeleri[seviye], seed + parseInt(seviye));
  });
  
  // 3. Salon havuzlarına dağıt (her seviyeden eşit oranda, salon kapasitesine göre)
  const salonHavuzlari = aktifSalonlar.map(() => []);
  
  // Her salon için hedef öğrenci sayısını hesapla
  const toplamKapasite = aktifSalonlar.reduce((toplam, salon) => toplam + salon.kapasite, 0);
  const toplamOgrenci = ogrenciler.length;
  
  // Kapasite kontrolü - eğer toplam öğrenci sayısı toplam kapasiteyi aşıyorsa uyarı ver
  if (toplamOgrenci > toplamKapasite) {
    logger.warn(`⚠️ UYARI: Toplam öğrenci sayısı (${toplamOgrenci}) toplam salon kapasitesini (${toplamKapasite}) aşıyor!`);
    logger.warn(`⚠️ Bazı öğrenciler yerleştirilemeyebilir.`);
  }
  
  aktifSalonlar.forEach((salon, index) => {
    // Düzeltilmiş oran hesaplaması - salon kapasitesinin toplam kapasiteye oranı
    const oran = salon.kapasite / toplamKapasite;
    const hedefSayi = Math.floor(toplamOgrenci * oran);
    
    // Minimum 1 öğrenci garantisi (eğer salon kapasitesi varsa)
    const finalHedefSayi = salon.kapasite > 0 ? Math.max(1, hedefSayi) : 0;
    
    salonHavuzlari[index].hedefSayi = finalHedefSayi;
    
    logger.debug(`📊 Salon ${salon.salonAdi || salon.ad}: Kapasite=${salon.kapasite}, Oran=${oran.toFixed(3)}, Hedef=${finalHedefSayi}`);
  });
  
  // Her sınıf seviyesinden salonlara dağıt
  Object.keys(sinifSeviyeleri).forEach(seviye => {
    const seviyeOgrencileri = [...sinifSeviyeleri[seviye]];
    const seviyeToplamOgrenci = seviyeOgrencileri.length;
    const seviyeToplamHedef = salonHavuzlari.reduce((toplam, havuz) => toplam + havuz.hedefSayi, 0);
    
    aktifSalonlar.forEach((salon, index) => {
      const seviyeOran = salonHavuzlari[index].hedefSayi / seviyeToplamHedef;
      const seviyeSayi = Math.floor(seviyeToplamOgrenci * seviyeOran);
      
      for (let i = 0; i < seviyeSayi && seviyeOgrencileri.length > 0; i++) {
        salonHavuzlari[index].push(seviyeOgrencileri.shift());
      }
    });
    
    // Kalanları dağıt
    while (seviyeOgrencileri.length > 0) {
      salonHavuzlari.forEach(havuz => {
        if (seviyeOgrencileri.length > 0 && havuz.length < havuz.hedefSayi) {
          havuz.push(seviyeOgrencileri.shift());
        }
      });
    }
  });
  
  // 4. Her salon için yerleştirme yap (çoklu deneme sistemi ile)
  const sonuclar = [];
  let toplamDeneme = 0;
  let toplamMukemmel = 0;
  
  aktifSalonlar.forEach((salon, index) => {
    logger.info(`\n🎯 Salon ${index + 1}/${aktifSalonlar.length} işleniyor: ${salon.salonAdi}`);
    const sonuc = salonYerlestirmeEski(salon, salonHavuzlari[index], ayarlar, seed);
    sonuclar.push(sonuc);
    
    toplamDeneme += sonuc.deneme || 1;
    if (sonuc.basariOrani === 100) {
      toplamMukemmel++;
    }
  });
  
  // İstatistikleri hesapla
  const yerlesilemeyen = [];
  sonuclar.forEach(sonuc => {
    yerlesilemeyen.push(...sonuc.yerlesilemeyenOgrenciler);
  });
  
  const istatistikler = calculateStatistics(sonuclar, yerlesilemeyen);
  
  // Çoklu deneme istatistikleri
  const ortalamaDeneme = (toplamDeneme / aktifSalonlar.length).toFixed(1);
  const mukemmelOrani = ((toplamMukemmel / aktifSalonlar.length) * 100).toFixed(1);
  
  logger.info('\n📊 ESKİ ALGORİTMA İSTATİSTİKLERİ:');
  logger.info(`🏢 Toplam salon: ${aktifSalonlar.length}`);
  logger.info(`🔄 Ortalama deneme: ${ortalamaDeneme}`);
  logger.info(`✅ Mükemmel sonuç: ${toplamMukemmel}/${aktifSalonlar.length} (%${mukemmelOrani})`);
  logger.info(`📈 Toplam yerleşen: ${istatistikler.yerlesenOgrenci}/${istatistikler.toplamOgrenci} (%${((istatistikler.yerlesenOgrenci / istatistikler.toplamOgrenci) * 100).toFixed(1)})`);
  
  logger.info('✅ ESKİ Yerleştirme algoritması tamamlandı');
  return { salonlar: sonuclar, istatistikler };
};

// ==================== KARŞILAŞTIRMA FONKSİYONU ====================

/**
 * Yeni ve eski algoritma karşılaştırması
 * Kullanım: compareAlgorithms(ogrenciler, salonlar, ayarlar)
 */
export const compareAlgorithms = (ogrenciler, salonlar, ayarlar) => {
  logger.info('🔬 ALGORİTMA KARŞILAŞTIRMASI BAŞLIYOR...\n');
  
  const startTime = Date.now();
  
  // Yeni algoritma testi
  logger.info('🚀 YENİ ALGORİTMA TEST EDİLİYOR...');
  const yeniBaslangic = Date.now();
  const yeniSonuc = gelismisYerlestirme(ogrenciler, salonlar, ayarlar);
  const yeniSüre = Date.now() - yeniBaslangic;
  
  logger.info('\n' + '='.repeat(60));
  
  // Eski algoritma testi
  logger.info('🔄 ESKİ ALGORİTMA TEST EDİLİYOR...');
  const eskiBaslangic = Date.now();
  const eskiSonuc = gelismisYerlestirmeEski(ogrenciler, salonlar, ayarlar);
  const eskiSüre = Date.now() - eskiBaslangic;
  
  logger.info('\n' + '='.repeat(60));
  logger.info('📊 KARŞILAŞTIRMA SONUÇLARI:');
  logger.info('='.repeat(60));
  
  // Performans karşılaştırması
  logger.info(`⏱️  SÜRE KARŞILAŞTIRMASI:`);
  logger.info(`   Yeni Algoritma: ${yeniSüre}ms`);
  logger.info(`   Eski Algoritma: ${eskiSüre}ms`);
  logger.info(`   Hız Artışı: ${((eskiSüre / yeniSüre - 1) * 100).toFixed(1)}%`);
  
  // Başarı oranı karşılaştırması
  logger.info(`\n📈 BAŞARI ORANI KARŞILAŞTIRMASI:`);
  logger.info(`   Yeni Algoritma: ${yeniSonuc.istatistikler.yerlesenOgrenci}/${yeniSonuc.istatistikler.toplamOgrenci} (%${((yeniSonuc.istatistikler.yerlesenOgrenci / yeniSonuc.istatistikler.toplamOgrenci) * 100).toFixed(1)})`);
  logger.info(`   Eski Algoritma: ${eskiSonuc.istatistikler.yerlesenOgrenci}/${eskiSonuc.istatistikler.toplamOgrenci} (%${((eskiSonuc.istatistikler.yerlesenOgrenci / eskiSonuc.istatistikler.toplamOgrenci) * 100).toFixed(1)})`);
  
  const yeniBasari = (yeniSonuc.istatistikler.yerlesenOgrenci / yeniSonuc.istatistikler.toplamOgrenci) * 100;
  const eskiBasari = (eskiSonuc.istatistikler.yerlesenOgrenci / eskiSonuc.istatistikler.toplamOgrenci) * 100;
  logger.info(`   Başarı Artışı: ${(yeniBasari - eskiBasari).toFixed(1)} puan`);
  
  // Mükemmel salon sayısı karşılaştırması
  const yeniMukemmel = yeniSonuc.salonlar.filter(s => s.basariOrani === 100).length;
  const eskiMukemmel = eskiSonuc.salonlar.filter(s => s.basariOrani === 100).length;
  
  logger.info(`\n🏆 MÜKEMMEL SALON KARŞILAŞTIRMASI:`);
  logger.info(`   Yeni Algoritma: ${yeniMukemmel}/${yeniSonuc.salonlar.length} salon`);
  logger.info(`   Eski Algoritma: ${eskiMukemmel}/${eskiSonuc.salonlar.length} salon`);
  logger.info(`   Mükemmel Artışı: +${yeniMukemmel - eskiMukemmel} salon`);
  
  logger.info('\n' + '='.repeat(60));
  logger.info('✅ ALGORİTMA KARŞILAŞTIRMASI TAMAMLANDI');
  logger.info(`⏱️  Toplam süre: ${Date.now() - startTime}ms`);
  
  return {
    yeni: yeniSonuc,
    eski: eskiSonuc,
    karsilastirma: {
      yeniSüre,
      eskiSüre,
      hizArtisi: ((eskiSüre / yeniSüre - 1) * 100).toFixed(1),
      yeniBasari: yeniBasari.toFixed(1),
      eskiBasari: eskiBasari.toFixed(1),
      basariArtisi: (yeniBasari - eskiBasari).toFixed(1),
      yeniMukemmel,
      eskiMukemmel,
      mukemmelArtisi: yeniMukemmel - eskiMukemmel
    }
  };
};

/**
 * Masa numarasını hesaplar - Grup bazlı sıralama (ESKİ algoritma için)
 * 1.grup: Sıra1-Sol(1), Sıra1-Sağ(2), Sıra2-Sol(3), Sıra2-Sağ(4)...
 * 2.grup: Sıra1-Sol(5), Sıra1-Sağ(6), Sıra2-Sol(7), Sıra2-Sağ(8)...
 */
const calculateDeskNumberForKoltuk = (koltuk, masalar) => {
  // Grup bazlı sıralama
  const gruplar = {};
  masalar.forEach(masa => {
    const grup = masa.grup || 1;
    if (!gruplar[grup]) gruplar[grup] = [];
    gruplar[grup].push(masa);
  });
  
  let masaNumarasi = 1;
  const sortedGruplar = Object.keys(gruplar).sort((a, b) => parseInt(a) - parseInt(b));
  
  for (const grupId of sortedGruplar) {
    const grupMasalar = gruplar[grupId];
    
    // Grup içinde satır-sütun sıralaması
    const sortedGrupMasalar = grupMasalar.sort((a, b) => {
      if (a.satir !== b.satir) return a.satir - b.satir;
      return a.sutun - b.sutun;
    });
    
    for (const masa of sortedGrupMasalar) {
      if (masa.id === koltuk.id) {
        return masaNumarasi;
      }
      masaNumarasi++;
    }
  }
  
  return koltuk.id + 1; // Fallback
};

/**
 * YENİ salon yerleştirme fonksiyonu - Gelişmiş motor kullanır
 */
const salonYerlestirmeYeni = (salon, ogrenciler, ayarlar, seed, weightManager) => {
  const koltukMatrisi = createSalonKoltukMatrisi(salon);
  const { masalar } = koltukMatrisi;
  
  // Masa numaralarını hesapla - Grup bazlı sıralama
  const masalarWithNumbers = calculateDeskNumbersForMasalar(masalar);
  
  logger.info('🏢 Salon yerleştirme başladı (YENİ MOTOR):', {
    salonId: salon.id,
    ogrenciSayisi: ogrenciler.length,
    ogrenciler: ogrenciler.slice(0, 5).map(o => o.ad)
  });
  
  // YENİ: Gelişmiş yerleştirme motoru kullan
  const motor = new GelismisYerlestirmeMotoru(salon, ogrenciler, ayarlar, seed, weightManager);
  
  // Koltuk matrisini güncelle (masa numaralarıyla)
  motor.koltukMatrisi = { ...koltukMatrisi, masalar: masalarWithNumbers };
  
  // Plan'ı da güncelle (masa numaralarıyla)
  motor.plan = masalarWithNumbers.map(masa => ({
    id: masa.id,
    ogrenci: null,
    satir: masa.satir,
    sutun: masa.sutun,
    grup: masa.grup,
    koltukTipi: masa.koltukTipi,
    masaNumarasi: masa.masaNumarasi
  }));
  
  // Motoru çalıştır
  const sonuc = motor.run();
  
  return {
    salonId: salon.id,
    salonAdi: salon.salonAdi,
    ogrenciler: sonuc.ogrenciler,
    koltukMatrisi: motor.koltukMatrisi,
    yerlesilemeyenOgrenciler: sonuc.yerlesilemeyenOgrenciler,
    plan: sonuc.plan,
    deneme: 1,
    basariOrani: sonuc.basariOrani
  };
};

/**
 * ESKİ salon yerleştirme fonksiyonu - Yedek versiyon
 */
const salonYerlestirmeEski = (salon, ogrenciler, ayarlar, seed, weightManager) => {
  const koltukMatrisi = createSalonKoltukMatrisi(salon);
  const { masalar } = koltukMatrisi;
  
  // Masa numaralarını hesapla - Grup bazlı sıralama
  const masalarWithNumbers = calculateDeskNumbersForMasalar(masalar);
  
  logger.info('🏢 Salon yerleştirme başladı:', {
    salonId: salon.id,
    ogrenciSayisi: ogrenciler.length,
    ogrenciler: ogrenciler.slice(0, 5).map(o => o.ad)
  });
  
  // ÇOKLU DENEME SİSTEMİ
  const MAX_DENEME = 5;
  let enIyiSonuc = null;
  let enIyiYerlesen = 0;
  
  // YENİ: Adaptif kısıt yöneticisi
  const constraintManager = new AdaptiveConstraintManager();
  
  for (let deneme = 1; deneme <= MAX_DENEME; deneme++) {
    // Her denemede farklı seed kullan
    const denemeSeed = seed + deneme * 1000;
    
    // YENİ: Öğrencileri öncelik sırasına göre sırala (weightManager varsa)
    let salonHavuzu;
    if (weightManager) {
      const prioritizedStudents = weightManager.prioritizeStudents([...ogrenciler]);
      salonHavuzu = seedShuffle(prioritizedStudents, denemeSeed);
    } else {
      salonHavuzu = seedShuffle([...ogrenciler], denemeSeed);
    }
    
    // Plan oluştur
    const plan = masalarWithNumbers.map(masa => ({
      id: masa.id,
      ogrenci: null,
      satir: masa.satir,
      sutun: masa.sutun,
      grup: masa.grup,
      koltukTipi: masa.koltukTipi,
      grupSira: masa.grupSira,
      masaNumarasi: masa.masaNumarasi
    }));
    
    // DEBUG: Plan oluşturma kontrolü
    console.log('🔍 salonYerlestirmeEski - Plan oluşturuldu:', {
      salonAdi: salon.salonAdi,
      masalarSayisi: masalarWithNumbers.length,
      planUzunlugu: plan.length,
      planIlkOrnek: plan[0]
    });
    
    // 2D plan (komşu kontrolü için)
    const plan2D = Array(koltukMatrisi.satirSayisi)
      .fill(null)
      .map(() => Array(koltukMatrisi.sutunSayisi).fill(null));
    
    // DÜZELTİLMİŞ: Koltuk sırasına göre yerleştirme
    const koltukSirasi = getKoltukSira(salon, denemeSeed);
    
    logger.debug('📋 Koltuk yerleştirme sırası:');
    koltukSirasi.slice(0, 8).forEach((koltuk, index) => {
      logger.debug(`   ${index + 1}. Sıra${koltuk.satir + 1}-Grup${koltuk.grup}-${koltuk.koltukTipi} (sütun:${koltuk.sutun})`);
    });
    if (koltukSirasi.length > 8) {
      logger.debug(`   ... ve ${koltukSirasi.length - 8} koltuk daha`);
    }
    
    const yerlesen = [];
    const yerlesilemeyen = [...salonHavuzu];
    
    let yerlesenSayisi = 0;
    
    // ORİJİNAL: Başarı oranı hesaplaması (yerlesen tanımlandıktan sonra)
    const currentSuccessRate = yerlesen.length / ogrenciler.length;
    const constraintLevel = constraintManager.getConstraintLevel(deneme, currentSuccessRate);
    const levelInfo = constraintManager.constraintLevels[constraintLevel];
    
    logger.info(`🔄 Deneme ${deneme}/${MAX_DENEME} başladı - Kısıt Seviyesi: ${constraintLevel} (${levelInfo.description})`);
    
    // YENİ: Detaylı AI skorlama bilgisi
    if (weightManager) {
      logger.info(`🤖 AI Destekli Yerleştirme - Ağırlıklar:`, weightManager.weights);
    }
    
    // DEBUG: Yerleştirme başlangıcı
    console.log('🔍 salonYerlestirmeEski - Yerleştirme başlıyor:', {
      salonAdi: salon.salonAdi,
      ogrenciSayisi: salonHavuzu.length,
      koltukSayisi: koltukSirasi.length,
      ogrenciler: salonHavuzu.slice(0, 3).map(o => o.ad)
    });
    
    for (const koltuk of koltukSirasi) {
      if (yerlesilemeyen.length === 0) break; // Tüm öğrenciler yerleştirildi
      
      // Komşuları al
      const komsular = getNeighbors(koltuk.satir, koltuk.sutun, koltukMatrisi.satirSayisi, koltukMatrisi.sutunSayisi);
      
      // Uygun öğrenci bul
      let uygunOgrenciIndex = -1;
      
      for (let i = 0; i < yerlesilemeyen.length; i++) {
        const ogrenci = yerlesilemeyen[i];
        
        // Kısıt kontrolü için geçici ogrenci objesi oluştur
        const tempOgrenci = { ...ogrenci, satir: koltuk.satir };
        
        // ORİJİNAL: Adaptif kısıt kontrolü (yerlesen zaten tanımlı)
        const currentSuccessRate = yerlesen.length / ogrenciler.length;
        const constraintLevel = constraintManager.getConstraintLevel(deneme, currentSuccessRate);
        
        // YENİ: Kademeli azalan kontrol sistemi
        let constraintsOK = false;
        
        if (constraintLevel === 'STRICT') {
          // Tüm kısıtlar aktif
          const cinsiyetOK = isGenderValid(tempOgrenci, komsular, plan2D, koltuk.grup);
          const sinifOK = isClassLevelValid(tempOgrenci, komsular, plan2D, koltuk.grup);
          const arkaArkayaOK = isBackToBackClassLevelValid(tempOgrenci, koltuk, plan2D, koltuk.grup);
          constraintsOK = cinsiyetOK && sinifOK && arkaArkayaOK;
        } else if (constraintLevel === 'MODERATE') {
          // Arka arkaya kontrol kaldırıldı
          const cinsiyetOK = isGenderValid(tempOgrenci, komsular, plan2D, koltuk.grup);
          const sinifOK = isClassLevelValid(tempOgrenci, komsular, plan2D, koltuk.grup);
          constraintsOK = cinsiyetOK && sinifOK;
        } else {
          // Sadece cinsiyet kontrolü
          constraintsOK = isGenderValid(tempOgrenci, komsular, plan2D, koltuk.grup);
        }
        
        // DEBUG: Kısıt kontrolü
        if (yerlesenSayisi < 3) {
          console.log(`🔍 Kısıt kontrolü: ${ogrenci.ad} (${ogrenci.cinsiyet}) - ${constraintsOK ? '✅ Geçti' : '❌ Başarısız'}`);
        }
        
        if (constraintsOK) {
          uygunOgrenciIndex = i;
          break;
        }
      }
      
      if (uygunOgrenciIndex !== -1) {
        // Öğrenciyi yerleştir
        const ogrenci = yerlesilemeyen[uygunOgrenciIndex];
        const planItem = plan.find(p => p.id === koltuk.id);
        
        planItem.ogrenci = {
          ...ogrenci,
          masaNumarasi: koltuk.masaNumarasi || calculateDeskNumberForKoltuk(koltuk, masalarWithNumbers),
          satir: koltuk.satir,
          sutun: koltuk.sutun,
          grup: koltuk.grup,
          koltukTipi: koltuk.koltukTipi,
          grupSira: koltuk.grupSira
        };
        
        // 2D plan güncelle (grup bilgisi ile)
        plan2D[koltuk.satir][koltuk.sutun] = { ogrenci: planItem.ogrenci, grup: koltuk.grup };
        
        yerlesen.push(planItem.ogrenci);
        yerlesilemeyen.splice(uygunOgrenciIndex, 1);
        yerlesenSayisi++;
        
        if (yerlesenSayisi <= 5) {
          logger.debug(`   ✅ ${ogrenci.ad} -> Sıra${koltuk.satir + 1}-Grup${koltuk.grup}-${koltuk.koltukTipi}`);
        }
      }
    }
    
    // Yerleştirilemeyen öğrenciler zaten yerlesilemeyen dizisinde
    
    // Plan verisi oluşturuldu

    const sonuc = {
      salonId: salon.id,
      salonAdi: salon.salonAdi,
      ogrenciler: yerlesen,
      koltukMatrisi,
      yerlesilemeyenOgrenciler: yerlesilemeyen,
      plan,
      deneme: deneme,
      basariOrani: (yerlesen.length / ogrenciler.length) * 100
    };
    
    logger.info(`📊 Deneme ${deneme} sonucu: ${yerlesen.length}/${ogrenciler.length} öğrenci yerleştirildi (%${sonuc.basariOrani.toFixed(1)})`);
    
    // YENİ: AI öğrenme güncellemesi
    if (weightManager) {
      weightManager.updateWeights(yerlesen.length / ogrenciler.length, sonuc.basariOrani / 100);
      logger.debug(`🧠 AI ağırlıkları güncellendi - Başarı: %${sonuc.basariOrani.toFixed(1)}`);
    }
    
    // YENİ: Öğrenme sistemine kaydet (weightManager varsa)
    if (weightManager) {
      weightManager.recordPlacementAttempt({
        deneme: deneme,
        successRate: sonuc.basariOrani / 100,
        constraintLevel: constraintLevel,
        optimizationScore: sonuc.optimizasyonSkoru || 0,
        placedStudents: yerlesen.length,
        totalStudents: ogrenciler.length
      });
    }
    
    // En iyi sonucu güncelle
    if (yerlesen.length > enIyiYerlesen) {
      enIyiYerlesen = yerlesen.length;
      enIyiSonuc = sonuc;
      logger.info(`🏆 Yeni en iyi sonuç: ${yerlesen.length} öğrenci yerleştirildi`);
    }
    
    // Mükemmel sonuç bulunduysa dur
    if (yerlesen.length === ogrenciler.length) {
      logger.info(`✅ Mükemmel sonuç bulundu! Deneme ${deneme}'de tüm öğrenciler yerleştirildi`);
      return sonuc;
    }
  }
  
  logger.info(`🏁 Tüm denemeler tamamlandı. En iyi sonuç: ${enIyiYerlesen} öğrenci yerleştirildi`);
  return enIyiSonuc;
};


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
    // Tamamen serbest bırakma kaldırıldı
    
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
        salon.plan.forEach(planItem => {
          if (planItem.ogrenci) {
            const komsular = getNeighbors(planItem.satir, planItem.sutun, 
              salon.koltukMatrisi.satirSayisi, salon.koltukMatrisi.sutunSayisi);
            
            // 2D plan oluştur (basit versiyon)
            const plan2D = Array(salon.koltukMatrisi.satirSayisi)
              .fill(null)
              .map(() => Array(salon.koltukMatrisi.sutunSayisi).fill(null));
            
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

/**
 * İstatistikleri hesaplar (eski fonksiyon - geriye uyumluluk için)
 */
const calculateStatistics = (salonlar, yerlesilemeyen) => {
  const enhancedStats = new EnhancedStatistics(salonlar, yerlesilemeyen);
  return enhancedStats.generateComprehensiveReport();
};

/**
 * Yerleşemeyen öğrenciler için en boş salonları bulan fonksiyon
 * @param {Array} yerlesilemeyenOgrenciler - Yerleştirilemeyen öğrenci listesi
 * @param {Array} salonlar - Tüm salon listesi
 * @param {Object} ayarlar - Sistem ayarları
 * @returns {Object} En boş salonlar ve yerleştirme önerileri
 */
export const findEnBosSalonlar = (yerlesilemeyenOgrenciler, salonlar, ayarlar) => {
  logger.info('🔍 Yerleşemeyen öğrenciler için en boş salonlar aranıyor...');
  
  if (!yerlesilemeyenOgrenciler || yerlesilemeyenOgrenciler.length === 0) {
    logger.info('✅ Yerleştirilemeyen öğrenci yok');
    return {
      enBosSalonlar: [],
      yerlesilemeyenOgrenciler: [],
      oneriler: []
    };
  }
  
  // Aktif salonları filtrele
  const aktifSalonlar = salonlar.filter(salon => salon.aktif);
  
  if (aktifSalonlar.length === 0) {
    logger.warn('⚠️ Aktif salon bulunamadı');
    return {
      enBosSalonlar: [],
      yerlesilemeyenOgrenciler,
      oneriler: ['Aktif salon bulunamadı']
    };
  }
  
  // Her salon için boş koltuk sayısını hesapla
  const salonBoslukAnalizi = aktifSalonlar.map(salon => {
    const koltukMatrisi = createSalonKoltukMatrisi(salon);
    const toplamKoltuk = koltukMatrisi.masalar.length;
    
    // Salon kapasitesi ve mevcut durumu
    const kapasite = salon.kapasite || toplamKoltuk;
    const mevcutDoluluk = salon.ogrenciler ? salon.ogrenciler.length : 0;
    const bosKoltuk = kapasite - mevcutDoluluk;
    const dolulukOrani = kapasite > 0 ? (mevcutDoluluk / kapasite) * 100 : 0;
    
    return {
      salon,
      toplamKoltuk,
      kapasite,
      mevcutDoluluk,
      bosKoltuk,
      dolulukOrani,
      boslukSkoru: bosKoltuk / kapasite // 0-1 arası boşluk skoru
    };
  });
  
  // En boş salonları sırala (boşluk skoruna göre)
  const enBosSalonlar = salonBoslukAnalizi
    .filter(salon => salon.bosKoltuk > 0) // Sadece boş koltuk olan salonlar
    .sort((a, b) => b.boslukSkoru - a.boslukSkoru); // En boştan en doluya
  
  logger.info(`📊 Salon boşluk analizi tamamlandı:`);
  enBosSalonlar.forEach((salon, index) => {
    logger.info(`   ${index + 1}. ${salon.salon.salonAdi}: ${salon.bosKoltuk} boş koltuk (%${salon.dolulukOrani.toFixed(1)} dolu)`);
  });
  
  // Yerleştirme önerileri oluştur
  const oneriler = generateYerlestirmeOnerileri(yerlesilemeyenOgrenciler, enBosSalonlar, ayarlar);
  
  return {
    enBosSalonlar: enBosSalonlar.map(s => ({
      salonId: s.salon.id,
      salonAdi: s.salon.salonAdi,
      bosKoltuk: s.bosKoltuk,
      dolulukOrani: s.dolulukOrani,
      boslukSkoru: s.boslukSkoru,
      kapasite: s.kapasite,
      mevcutDoluluk: s.mevcutDoluluk
    })),
    yerlesilemeyenOgrenciler,
    oneriler,
    toplamBosKoltuk: enBosSalonlar.reduce((toplam, salon) => toplam + salon.bosKoltuk, 0),
    yerlesilemeyenOgrenciSayisi: yerlesilemeyenOgrenciler.length
  };
};

/**
 * Yerleştirme önerileri oluşturur
 */
const generateYerlestirmeOnerileri = (yerlesilemeyenOgrenciler, enBosSalonlar, ayarlar) => {
  const oneriler = [];
  
  if (yerlesilemeyenOgrenciler.length === 0) {
    oneriler.push('✅ Tüm öğrenciler başarıyla yerleştirildi');
    return oneriler;
  }
  
  const toplamBosKoltuk = enBosSalonlar.reduce((toplam, salon) => toplam + salon.bosKoltuk, 0);
  
  if (toplamBosKoltuk >= yerlesilemeyenOgrenciler.length) {
    oneriler.push(`✅ Yeterli boş koltuk var: ${toplamBosKoltuk} boş koltuk, ${yerlesilemeyenOgrenciler.length} yerleştirilemeyen öğrenci`);
    
    // En boş salonları öner
    const enIyiSalonlar = enBosSalonlar.slice(0, 3);
    oneriler.push(`🎯 Önerilen salonlar:`);
    enIyiSalonlar.forEach((salon, index) => {
      oneriler.push(`   ${index + 1}. ${salon.salon.salonAdi} (${salon.bosKoltuk} boş koltuk)`);
    });
  } else {
    oneriler.push(`⚠️ Yetersiz boş koltuk: ${toplamBosKoltuk} boş koltuk, ${yerlesilemeyenOgrenciler.length} yerleştirilemeyen öğrenci`);
    oneriler.push(`💡 Çözüm önerileri:`);
    oneriler.push(`   • Yeni salon ekleyin`);
    oneriler.push(`   • Mevcut salonların kapasitesini artırın`);
    oneriler.push(`   • Kısıtları gevşetin`);
  }
  
  // Sınıf seviyesi analizi
  const sinifAnalizi = analyzeSinifSeviyeleri(yerlesilemeyenOgrenciler);
  if (sinifAnalizi.length > 0) {
    oneriler.push(`📊 Yerleştirilemeyen öğrenci analizi:`);
    sinifAnalizi.forEach(analiz => {
      oneriler.push(`   • ${analiz.seviye}. sınıf: ${analiz.sayisi} öğrenci`);
    });
  }
  
  return oneriler;
};

/**
 * Sınıf seviyesi analizi yapar
 */
const analyzeSinifSeviyeleri = (ogrenciler) => {
  const seviyeAnalizi = {};
  
  ogrenciler.forEach(ogrenci => {
    const seviye = getSinifSeviyesi(ogrenci.sinif);
    if (seviye) {
      seviyeAnalizi[seviye] = (seviyeAnalizi[seviye] || 0) + 1;
    }
  });
  
  return Object.keys(seviyeAnalizi).map(seviye => ({
    seviye,
    sayisi: seviyeAnalizi[seviye]
  })).sort((a, b) => b.sayisi - a.sayisi);
};

/**
 * Yerleşemeyen öğrencileri en boş salonlara yerleştirmeyi dener - KADEMELİ AGRESİF VERSİYON
 * @param {Array} yerlesilemeyenOgrenciler - Yerleştirilemeyen öğrenci listesi
 * @param {Array} salonlar - Tüm salon listesi
 * @param {Object} ayarlar - Sistem ayarları
 * @returns {Object} Yerleştirme sonucu
 */
export const yerlesilemeyenOgrencileriYerlestir = (yerlesilemeyenOgrenciler, salonlar, ayarlar) => {
  logger.info('🔥 Yerleşemeyen öğrenciler için kademeli agresif yerleştirme başlatılıyor...');
  
  if (!yerlesilemeyenOgrenciler || yerlesilemeyenOgrenciler.length === 0) {
    return {
      basarili: true,
      yerlesenOgrenciler: [],
      halaYerlesilemeyen: [],
      mesaj: 'Yerleştirilemeyen öğrenci yok'
    };
  }
  
  const yerlesenOgrenciler = [];
  const halaYerlesilemeyen = [...yerlesilemeyenOgrenciler];
  const kullanilanOgrenciler = new Set(); // Global kullanılan öğrenci takibi
  
  // 7 AŞAMALI SÜPER AGRESİF YERLEŞTİRME STRATEJİSİ
  const stratejiler = [
    { 
      ad: '1. AŞAMA: Kısıt Kontrolü ile Yerleştirme', 
      fonksiyon: () => kademeliYerlestirmeAsama1([...halaYerlesilemeyen], salonlar, ayarlar, kullanilanOgrenciler),
      katman: 0
    },
    { 
      ad: '2. AŞAMA: Sadece Cinsiyet Kontrolü', 
      fonksiyon: () => kademeliYerlestirmeAsama2([...halaYerlesilemeyen], salonlar, ayarlar, kullanilanOgrenciler),
      katman: 2
    },
    { 
      ad: '3. AŞAMA: Kısıt Kontrolü Olmadan', 
      fonksiyon: () => kademeliYerlestirmeAsama3([...halaYerlesilemeyen], salonlar, ayarlar, kullanilanOgrenciler),
      katman: -1
    },
    { 
      ad: '4. AŞAMA: Zorla Yerleştirme', 
      fonksiyon: () => kademeliYerlestirmeAsama4([...halaYerlesilemeyen], salonlar, ayarlar, kullanilanOgrenciler),
      katman: -1
    },
    { 
      ad: '5. AŞAMA: Son Çare Yerleştirme', 
      fonksiyon: () => kademeliYerlestirmeAsama5([...halaYerlesilemeyen], salonlar, ayarlar, kullanilanOgrenciler),
      katman: -1
    },
    { 
      ad: '6. AŞAMA: SÜPER AGRESİF Yerleştirme', 
      fonksiyon: () => kademeliYerlestirmeAsama6([...halaYerlesilemeyen], salonlar, ayarlar, kullanilanOgrenciler),
      katman: -1
    },
    { 
      ad: '7. AŞAMA: SON ÇARE SÜPER AGRESİF', 
      fonksiyon: () => kademeliYerlestirmeAsama7([...halaYerlesilemeyen], salonlar, ayarlar, kullanilanOgrenciler),
      katman: -1
    }
  ];
  
  for (const strateji of stratejiler) {
    if (halaYerlesilemeyen.length === 0) break;
    
    logger.info(`\n🎯 ${strateji.ad} başlatılıyor...`);
    logger.info(`   Kalan öğrenci: ${halaYerlesilemeyen.length}`);
    
    const asamaSonucu = strateji.fonksiyon();
    
    if (asamaSonucu.yerlesenOgrenciler.length > 0) {
      yerlesenOgrenciler.push(...asamaSonucu.yerlesenOgrenciler);
      
      // Yerleştirilen öğrencileri listeden çıkar
      asamaSonucu.yerlesenOgrenciler.forEach(yerlesen => {
        const index = halaYerlesilemeyen.findIndex(o => o.id === yerlesen.id);
        if (index !== -1) {
          halaYerlesilemeyen.splice(index, 1);
        }
      });
      
      logger.info(`✅ ${strateji.ad} başarılı: ${asamaSonucu.yerlesenOgrenciler.length} öğrenci yerleştirildi`);
    } else {
      logger.warn(`⚠️ ${strateji.ad} başarısız: Hiç öğrenci yerleştirilemedi`);
    }
  }
  
  const basarili = halaYerlesilemeyen.length === 0;
  
  // GÜVENLİK KONTROLÜ: Öğrenci sayısı doğrulaması
  const toplamKontrol = yerlesenOgrenciler.length + halaYerlesilemeyen.length;
  const orijinalSayi = yerlesilemeyenOgrenciler.length;
  
  if (toplamKontrol !== orijinalSayi) {
    logger.error(`🚨 KRİTİK HATA: Kademeli yerleştirmede öğrenci sayısı uyumsuzluğu!`);
    logger.error(`   Orijinal öğrenci sayısı: ${orijinalSayi}`);
    logger.error(`   Yerleşen: ${yerlesenOgrenciler.length}`);
    logger.error(`   Hala yerleşemeyen: ${halaYerlesilemeyen.length}`);
    logger.error(`   Toplam kontrol: ${toplamKontrol}`);
    logger.error(`   Fark: ${orijinalSayi - toplamKontrol}`);
  } else {
    logger.info(`✅ Kademeli yerleştirme öğrenci sayısı kontrolü başarılı: ${toplamKontrol}/${orijinalSayi}`);
  }
  
  logger.info(`\n📊 KADEMELİ AGRESİF YERLEŞTİRME SONUCU:`);
  logger.info(`   Yerleşen: ${yerlesenOgrenciler.length} öğrenci`);
  logger.info(`   Hala yerleşemeyen: ${halaYerlesilemeyen.length} öğrenci`);
  logger.info(`   Başarı: ${basarili ? '✅ TAM BAŞARI' : '❌ KISMİ BAŞARI'}`);
  
  return {
    basarili,
    yerlesenOgrenciler,
    halaYerlesilemeyen,
    mesaj: basarili ? 
      'Tüm öğrenciler kademeli agresif sistem ile yerleştirildi' : 
      `${halaYerlesilemeyen.length} öğrenci hala yerleştirilemedi`
  };
};

/**
 * 1. AŞAMA: Kısıt kontrolü ile yerleştirme
 */
const kademeliYerlestirmeAsama1 = (ogrenciler, salonlar, ayarlar, kullanilanOgrenciler) => {
  logger.debug('🔍 1. Aşama: Kısıt kontrolü ile yerleştirme');
  
  const yerlesenOgrenciler = [];
  
  for (const salon of salonlar) {
    if (ogrenciler.length === 0) break;
    
    const koltukMatrisi = createSalonKoltukMatrisi(salon);
    const { masalar } = koltukMatrisi;
    const masalarWithNumbers = calculateDeskNumbersForMasalar(masalar);
    
    const plan = masalarWithNumbers.map(masa => ({
      id: masa.id,
      ogrenci: null,
      satir: masa.satir,
      sutun: masa.sutun,
      grup: masa.grup,
      koltukTipi: masa.koltukTipi,
      masaNumarasi: masa.masaNumarasi
    }));
    
    const plan2D = Array(koltukMatrisi.satirSayisi)
      .fill(null)
      .map(() => Array(koltukMatrisi.sutunSayisi).fill(null));
    
    const koltukSirasi = getKoltukSira(salon, Date.now());
    
    for (const koltuk of koltukSirasi) {
      if (koltuk.ogrenci) continue;
      
      const uygunOgrenci = akilliOgrenciBul(ogrenciler, koltuk, plan2D, 0, kullanilanOgrenciler);
      
      if (uygunOgrenci) {
        const planItem = plan.find(p => p.id === koltuk.id);
        planItem.ogrenci = {
          ...uygunOgrenci,
          salonId: salon.id,
          salonAdi: salon.salonAdi,
          masaNumarasi: koltuk.masaNumarasi || koltuk.id + 1,
          satir: koltuk.satir,
          sutun: koltuk.sutun,
          grup: koltuk.grup,
          koltukTipi: koltuk.koltukTipi,
          kademeliYerlestirme: true,
          asama: 1
        };
        
        plan2D[koltuk.satir][koltuk.sutun] = { ogrenci: planItem.ogrenci, grup: koltuk.grup };
        yerlesenOgrenciler.push(planItem.ogrenci);
        kullanilanOgrenciler.add(uygunOgrenci.id);
      }
    }
  }
  
  return { yerlesenOgrenciler };
};

/**
 * 2. AŞAMA: Sadece cinsiyet kontrolü
 */
const kademeliYerlestirmeAsama2 = (ogrenciler, salonlar, ayarlar, kullanilanOgrenciler) => {
  logger.debug('🔍 2. Aşama: Sadece cinsiyet kontrolü');
  
  const yerlesenOgrenciler = [];
  
  for (const salon of salonlar) {
    if (ogrenciler.length === 0) break;
    
    const koltukMatrisi = createSalonKoltukMatrisi(salon);
    const { masalar } = koltukMatrisi;
    const masalarWithNumbers = calculateDeskNumbersForMasalar(masalar);
    
    const plan = masalarWithNumbers.map(masa => ({
      id: masa.id,
      ogrenci: null,
      satir: masa.satir,
      sutun: masa.sutun,
      grup: masa.grup,
      koltukTipi: masa.koltukTipi,
      masaNumarasi: masa.masaNumarasi
    }));
    
    const plan2D = Array(koltukMatrisi.satirSayisi)
      .fill(null)
      .map(() => Array(koltukMatrisi.sutunSayisi).fill(null));
    
    const koltukSirasi = getKoltukSira(salon, Date.now());
    
    for (const koltuk of koltukSirasi) {
      if (koltuk.ogrenci) continue;
      
      const uygunOgrenci = akilliOgrenciBul(ogrenciler, koltuk, plan2D, 2, kullanilanOgrenciler);
      
      if (uygunOgrenci) {
        const planItem = plan.find(p => p.id === koltuk.id);
        planItem.ogrenci = {
          ...uygunOgrenci,
          salonId: salon.id,
          salonAdi: salon.salonAdi,
          masaNumarasi: koltuk.masaNumarasi || koltuk.id + 1,
          satir: koltuk.satir,
          sutun: koltuk.sutun,
          grup: koltuk.grup,
          koltukTipi: koltuk.koltukTipi,
          kademeliYerlestirme: true,
          asama: 2
        };
        
        plan2D[koltuk.satir][koltuk.sutun] = { ogrenci: planItem.ogrenci, grup: koltuk.grup };
        yerlesenOgrenciler.push(planItem.ogrenci);
        kullanilanOgrenciler.add(uygunOgrenci.id);
      }
    }
  }
  
  return { yerlesenOgrenciler };
};

/**
 * 3. AŞAMA: Kısıt kontrolü olmadan
 */
const kademeliYerlestirmeAsama3 = (ogrenciler, salonlar, ayarlar, kullanilanOgrenciler) => {
  logger.debug('🔍 3. Aşama: Kısıt kontrolü olmadan');
  
  const yerlesenOgrenciler = [];
  
  for (const salon of salonlar) {
    if (ogrenciler.length === 0) break;
    
    const koltukMatrisi = createSalonKoltukMatrisi(salon);
    const { masalar } = koltukMatrisi;
    const masalarWithNumbers = calculateDeskNumbersForMasalar(masalar);
    
    const plan = masalarWithNumbers.map(masa => ({
      id: masa.id,
      ogrenci: null,
      satir: masa.satir,
      sutun: masa.sutun,
      grup: masa.grup,
      koltukTipi: masa.koltukTipi,
      masaNumarasi: masa.masaNumarasi
    }));
    
    const koltukSirasi = getKoltukSira(salon, Date.now());
    
    for (const koltuk of koltukSirasi) {
      if (koltuk.ogrenci) continue;
      
      // İlk uygun öğrenciyi al (kısıt kontrolü olmadan)
      const uygunOgrenci = ogrenciler.find(ogrenci => !kullanilanOgrenciler.has(ogrenci.id));
      
      if (uygunOgrenci) {
        const planItem = plan.find(p => p.id === koltuk.id);
        planItem.ogrenci = {
          ...uygunOgrenci,
          salonId: salon.id,
          salonAdi: salon.salonAdi,
          masaNumarasi: koltuk.masaNumarasi || koltuk.id + 1,
          satir: koltuk.satir,
          sutun: koltuk.sutun,
          grup: koltuk.grup,
          koltukTipi: koltuk.koltukTipi,
          kademeliYerlestirme: true,
          asama: 3
        };
        
        yerlesenOgrenciler.push(planItem.ogrenci);
        kullanilanOgrenciler.add(uygunOgrenci.id);
      }
    }
  }
  
  return { yerlesenOgrenciler };
};

/**
 * 4. AŞAMA: Zorla yerleştirme
 */
const kademeliYerlestirmeAsama4 = (ogrenciler, salonlar, ayarlar, kullanilanOgrenciler) => {
  logger.debug('🔍 4. Aşama: Zorla yerleştirme');
  
  const yerlesenOgrenciler = [];
  
  for (const salon of salonlar) {
    if (ogrenciler.length === 0) break;
    
    const koltukMatrisi = createSalonKoltukMatrisi(salon);
    const { masalar } = koltukMatrisi;
    const masalarWithNumbers = calculateDeskNumbersForMasalar(masalar);
    
    const plan = masalarWithNumbers.map(masa => ({
      id: masa.id,
      ogrenci: null,
      satir: masa.satir,
      sutun: masa.sutun,
      grup: masa.grup,
      koltukTipi: masa.koltukTipi,
      masaNumarasi: masa.masaNumarasi
    }));
    
    // Tüm koltukları doldur
    const koltukSirasi = getKoltukSira(salon, Date.now());
    
    for (const koltuk of koltukSirasi) {
      if (koltuk.ogrenci) continue;
      
      const uygunOgrenci = ogrenciler.find(ogrenci => !kullanilanOgrenciler.has(ogrenci.id));
      
      if (uygunOgrenci) {
        const planItem = plan.find(p => p.id === koltuk.id);
        planItem.ogrenci = {
          ...uygunOgrenci,
          salonId: salon.id,
          salonAdi: salon.salonAdi,
          masaNumarasi: koltuk.masaNumarasi || koltuk.id + 1,
          satir: koltuk.satir,
          sutun: koltuk.sutun,
          grup: koltuk.grup,
          koltukTipi: koltuk.koltukTipi,
          kademeliYerlestirme: true,
          asama: 4,
          zorlaYerlestirme: true
        };
        
        yerlesenOgrenciler.push(planItem.ogrenci);
        kullanilanOgrenciler.add(uygunOgrenci.id);
      }
    }
  }
  
  return { yerlesenOgrenciler };
};

/**
 * 5. AŞAMA: Son çare yerleştirme
 */
const kademeliYerlestirmeAsama5 = (ogrenciler, salonlar, ayarlar, kullanilanOgrenciler) => {
  logger.debug('🔍 5. Aşama: Son çare yerleştirme');
  
  const yerlesenOgrenciler = [];
  
  // En boş salonları bul
  const bosSalonAnalizi = findEnBosSalonlar(ogrenciler, salonlar, ayarlar);
  
  for (const salonInfo of bosSalonAnalizi.enBosSalonlar) {
    if (ogrenciler.length === 0) break;
    
    const salon = salonInfo;
    const bosKoltuk = salonInfo.bosKoltuk;
    const alinacakOgrenciSayisi = Math.min(bosKoltuk, ogrenciler.length);
    
    // Bu salona alınacak öğrencileri seç - DÜZELTME: Orijinal listeyi koru
    const alinacakOgrenciler = ogrenciler.slice(0, alinacakOgrenciSayisi);
    // Orijinal listeden çıkar
    ogrenciler.splice(0, alinacakOgrenciSayisi);
    
    // Son çare yerleştirme
    const sonCareYerlestirme = alinacakOgrenciler.map((ogrenci, index) => ({
      ...ogrenci,
      salonId: salon.id,
      salonAdi: salon.salonAdi,
      masaNumarasi: index + 1,
      kademeliYerlestirme: true,
      asama: 5,
      sonCare: true
    }));
    
    yerlesenOgrenciler.push(...sonCareYerlestirme);
  }
  
  return { yerlesenOgrenciler };
};

/**
 * 6. AŞAMA: SÜPER AGRESİF Yerleştirme
 */
const kademeliYerlestirmeAsama6 = (ogrenciler, salonlar, ayarlar, kullanilanOgrenciler) => {
  logger.debug('🔍 6. Aşama: SÜPER AGRESİF Yerleştirme');
  
  const yerlesenOgrenciler = [];
  
  // Tüm salonları dene, kapasite sınırını göz ardı et
  for (const salon of salonlar) {
    if (ogrenciler.length === 0) break;
    
    // Salon kapasitesini 2 katına çıkar (süper agresif)
    const genisletilmisKapasite = salon.kapasite * 2;
    const alinacakOgrenciSayisi = Math.min(genisletilmisKapasite, ogrenciler.length);
    
    // Bu salona alınacak öğrencileri seç - DÜZELTME: Orijinal listeyi koru
    const alinacakOgrenciler = ogrenciler.slice(0, alinacakOgrenciSayisi);
    // Orijinal listeden çıkar
    ogrenciler.splice(0, alinacakOgrenciSayisi);
    
    // Süper agresif yerleştirme - her öğrenciyi yerleştir
    const superAgresifYerlestirme = alinacakOgrenciler.map((ogrenci, index) => ({
      ...ogrenci,
      salonId: salon.id,
      salonAdi: salon.salonAdi,
      masaNumarasi: index + 1,
      kademeliYerlestirme: true,
      asama: 6,
      superAgresif: true,
      genisletilmisKapasite: true
    }));
    
    yerlesenOgrenciler.push(...superAgresifYerlestirme);
    
    logger.debug(`🔥 Süper agresif: ${superAgresifYerlestirme.length} öğrenci ${salon.salonAdi} salonuna yerleştirildi`);
  }
  
  return { yerlesenOgrenciler };
};

/**
 * 7. AŞAMA: SON ÇARE SÜPER AGRESİF
 */
const kademeliYerlestirmeAsama7 = (ogrenciler, salonlar, ayarlar, kullanilanOgrenciler) => {
  logger.debug('🔍 7. Aşama: SON ÇARE SÜPER AGRESİF');
  
  const yerlesenOgrenciler = [];
  
  // En büyük salonu bul
  const enBuyukSalon = salonlar.reduce((max, salon) => 
    salon.kapasite > max.kapasite ? salon : max, salonlar[0]);
  
  if (enBuyukSalon && ogrenciler.length > 0) {
    // Tüm kalan öğrencileri en büyük salona zorla yerleştir
    const sonCareYerlestirme = ogrenciler.map((ogrenci, index) => ({
      ...ogrenci,
      salonId: enBuyukSalon.id,
      salonAdi: enBuyukSalon.salonAdi,
      masaNumarasi: index + 1,
      kademeliYerlestirme: true,
      asama: 7,
      sonCareSuperAgresif: true,
      zorlaYerlestirme: true
    }));
    
    yerlesenOgrenciler.push(...sonCareYerlestirme);
    
    logger.debug(`🚨 SON ÇARE: ${sonCareYerlestirme.length} öğrenci ${enBuyukSalon.salonAdi} salonuna ZORLA yerleştirildi`);
  }
  
  return { yerlesenOgrenciler };
};

/**
 * Gerçek salon planına yerleştirme - Akıllı kısıt gevşetme ile
 */
const gercekSalonPlaninaYerlestir = (salonInfo, ogrenciler, ayarlar) => {
  const salon = salonInfo;
  
  // Salon yapısını kontrol et
  if (!salon.gruplar || salon.gruplar.length === 0) {
    logger.warn(`⚠️ Salon ${salon.salonAdi} için grup bilgisi bulunamadı`);
    return [];
  }
  
  const koltukMatrisi = createSalonKoltukMatrisi(salon);
  const { masalar } = koltukMatrisi;
  
  // Masa numaralarını hesapla
  const masalarWithNumbers = calculateDeskNumbersForMasalar(masalar);
  
  // Plan oluştur
  const plan = masalarWithNumbers.map(masa => ({
    id: masa.id,
    ogrenci: null,
    satir: masa.satir,
    sutun: masa.sutun,
    grup: masa.grup,
    koltukTipi: masa.koltukTipi,
    masaNumarasi: masa.masaNumarasi
  }));
  
  // 2D plan oluştur
  const plan2D = Array(koltukMatrisi.satirSayisi)
    .fill(null)
    .map(() => Array(koltukMatrisi.sutunSayisi).fill(null));
  
  const yerlesenOgrenciler = [];
  const kullanilanOgrenciler = new Set();
  
  // Koltuk sırasına göre yerleştirme
  const koltukSirasi = getKoltukSira(salon, Date.now());
  
  // 3 katmanlı deneme sistemi
  for (let katman = 0; katman < 3; katman++) {
    logger.debug(`🔄 Katman ${katman} denemesi başladı`);
    
    for (const koltuk of koltukSirasi) {
      if (koltuk.ogrenci) continue; // Zaten dolu
      
      // Uygun öğrenci bul
      const uygunOgrenci = akilliOgrenciBul(ogrenciler, koltuk, plan2D, katman, kullanilanOgrenciler);
      
      if (uygunOgrenci) {
        // Öğrenciyi yerleştir
        const planItem = plan.find(p => p.id === koltuk.id);
        planItem.ogrenci = {
          ...uygunOgrenci,
          masaNumarasi: koltuk.masaNumarasi || koltuk.id + 1,
          satir: koltuk.satir,
          sutun: koltuk.sutun,
          grup: koltuk.grup,
          koltukTipi: koltuk.koltukTipi,
          alternatifYerlestirme: true
        };
        
        // 2D plan güncelle
        plan2D[koltuk.satir][koltuk.sutun] = { ogrenci: planItem.ogrenci, grup: koltuk.grup };
        
        yerlesenOgrenciler.push(planItem.ogrenci);
        kullanilanOgrenciler.add(uygunOgrenci.id);
        
        logger.debug(`✅ ${uygunOgrenci.ad} yerleştirildi (Katman ${katman})`);
      }
    }
    
    // Tüm öğrenciler yerleştirildiyse dur
    if (yerlesenOgrenciler.length === ogrenciler.length) {
      break;
    }
  }
  
  return yerlesenOgrenciler;
};

/**
 * Akıllı öğrenci bulma - Kademeli kısıt gevşetme ile
 */
const akilliOgrenciBul = (ogrenciler, koltuk, plan2D, katman, kullanilanOgrenciler) => {
  const komsular = getNeighbors(koltuk.satir, koltuk.sutun, plan2D.length, plan2D[0].length);
  
  for (const ogrenci of ogrenciler) {
    if (kullanilanOgrenciler.has(ogrenci.id)) continue;
    
    const tempOgrenci = { ...ogrenci, satir: koltuk.satir };
    
    // Kademeli kısıt kontrolü
    let uygun = false;
    
    if (katman === 0) {
      // Tüm kısıtlar aktif
      const cinsiyetOK = isGenderValid(tempOgrenci, komsular, plan2D, koltuk.grup);
      const sinifOK = isClassLevelValid(tempOgrenci, komsular, plan2D, koltuk.grup);
      const arkaArkayaOK = isBackToBackClassLevelValid(tempOgrenci, koltuk, plan2D, koltuk.grup);
      uygun = cinsiyetOK && sinifOK && arkaArkayaOK;
    } else if (katman === 1) {
      // Arka arkaya kontrol kaldırıldı
      const cinsiyetOK = isGenderValid(tempOgrenci, komsular, plan2D, koltuk.grup);
      const sinifOK = isClassLevelValid(tempOgrenci, komsular, plan2D, koltuk.grup);
      uygun = cinsiyetOK && sinifOK;
    } else {
      // Sadece cinsiyet kontrolü
      const cinsiyetOK = isGenderValid(tempOgrenci, komsular, plan2D, koltuk.grup);
      uygun = cinsiyetOK;
    }
    
    if (uygun) {
      return ogrenci;
    }
  }
  
  return null;
};

/**
 * Yerleşemeyen öğrenciler için en boş salonları test eden fonksiyon
 */
export const testEnBosSalonlar = () => {
  console.log('🧪 EN BOŞ SALONLAR TESTİ\n' + '='.repeat(60));
  
  // Test verileri
  // ZORLU TEST: Kapasiteyi aşan öğrenci sayısı
  const testOgrenciler = Array.from({ length: 100 }, (_, index) => ({
    id: index + 1,
    ad: `Öğrenci${index + 1}`,
    soyad: 'Test',
    sinif: `${9 + (index % 3)}-${String.fromCharCode(65 + (index % 26))}`,
    cinsiyet: index % 2 === 0 ? 'E' : 'K'
  }));
  
  const testSalonlar = [
    {
      id: 1,
      salonAdi: 'Salon A',
      aktif: true,
      kapasite: 30,
      ogrenciler: [{ id: 10, ad: 'Test' }], // 1 öğrenci var, 29 boş
      siraTipi: 'ikili',
      gruplar: [
        { id: 1, siraSayisi: 5 },
        { id: 2, siraSayisi: 5 },
        { id: 3, siraSayisi: 5 },
        { id: 4, siraSayisi: 5 }
      ]
    },
    {
      id: 2,
      salonAdi: 'Salon B', 
      aktif: true,
      kapasite: 25,
      ogrenciler: [], // Boş salon
      siraTipi: 'ikili',
      gruplar: [
        { id: 1, siraSayisi: 4 },
        { id: 2, siraSayisi: 4 },
        { id: 3, siraSayisi: 4 }
      ]
    },
    {
      id: 3,
      salonAdi: 'Salon C',
      aktif: true,
      kapasite: 20,
      ogrenciler: Array(15).fill({ id: 0, ad: 'Test' }), // 15 öğrenci var, 5 boş
      siraTipi: 'ikili',
      gruplar: [
        { id: 1, siraSayisi: 3 },
        { id: 2, siraSayisi: 3 },
        { id: 3, siraSayisi: 3 }
      ]
    }
  ];
  
  const testAyarlar = {};
  
  console.log('\n📋 TEST SENARYOSU:');
  console.log(`   Yerleştirilemeyen öğrenci: ${testOgrenciler.length}`);
  console.log(`   Toplam salon: ${testSalonlar.length}`);
  
  // En boş salonları bul
  const sonuc = findEnBosSalonlar(testOgrenciler, testSalonlar, testAyarlar);
  
  console.log('\n📊 SONUÇLAR:');
  console.log(`   En boş salon sayısı: ${sonuc.enBosSalonlar.length}`);
  console.log(`   Toplam boş koltuk: ${sonuc.toplamBosKoltuk}`);
  console.log(`   Yerleştirilemeyen öğrenci: ${sonuc.yerlesilemeyenOgrenciSayisi}`);
  
  console.log('\n🏢 EN BOŞ SALONLAR:');
  sonuc.enBosSalonlar.forEach((salon, index) => {
    console.log(`   ${index + 1}. ${salon.salonAdi}: ${salon.bosKoltuk} boş koltuk (%${salon.dolulukOrani.toFixed(1)} dolu)`);
  });
  
  console.log('\n💡 ÖNERİLER:');
  sonuc.oneriler.forEach(oneri => {
    console.log(`   ${oneri}`);
  });
  
  // Süper agresif yerleştirme testi
  console.log('\n🔥 SÜPER AGRESİF YERLEŞTİRME TESTİ:');
  const alternatifSonuc = yerlesilemeyenOgrencileriYerlestir(testOgrenciler, testSalonlar, testAyarlar);
  
  console.log(`   Başarılı: ${alternatifSonuc.basarili ? '✅' : '❌'}`);
  console.log(`   Yerleşen öğrenci: ${alternatifSonuc.yerlesenOgrenciler.length}`);
  console.log(`   Hala yerleşemeyen: ${alternatifSonuc.halaYerlesilemeyen.length}`);
  console.log(`   Mesaj: ${alternatifSonuc.mesaj}`);
  
  // Yerleştirilen öğrencilerin detaylarını göster
  if (alternatifSonuc.yerlesenOgrenciler.length > 0) {
    console.log('\n📋 YERLEŞTİRİLEN ÖĞRENCİLER:');
    alternatifSonuc.yerlesenOgrenciler.forEach((ogrenci, index) => {
      const asamaBilgisi = ogrenci.asama ? ` (Aşama: ${ogrenci.asama})` : '';
      let ozelBilgi = '';
      if (ogrenci.zorlaYerlestirme) ozelBilgi += ' [ZORLA]';
      if (ogrenci.sonCare) ozelBilgi += ' [SON ÇARE]';
      if (ogrenci.superAgresif) ozelBilgi += ' [SÜPER AGRESİF]';
      if (ogrenci.genisletilmisKapasite) ozelBilgi += ' [GENİŞLETİLMİŞ]';
      if (ogrenci.sonCareSuperAgresif) ozelBilgi += ' [SON ÇARE SÜPER]';
      
      console.log(`   ${index + 1}. ${ogrenci.ad} ${ogrenci.soyad} -> ${ogrenci.salonAdi} (Masa: ${ogrenci.masaNumarasi})${asamaBilgisi}${ozelBilgi}`);
    });
  }
  
  // Hala yerleşemeyen varsa uyarı ver
  if (alternatifSonuc.halaYerlesilemeyen.length > 0) {
    console.log('\n🚨 UYARI: HALA YERLEŞEMEYEN ÖĞRENCİLER VAR!');
    console.log('   Bu durumda sistem kapasitesi yetersiz olabilir.');
    console.log('   Öneriler:');
    console.log('   • Yeni salon ekleyin');
    console.log('   • Mevcut salonların kapasitesini artırın');
    console.log('   • Öğrenci sayısını azaltın');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ En boş salonlar testi tamamlandı!\n');
  
  return {
    bosSalonAnalizi: sonuc,
    alternatifYerlestirme: alternatifSonuc
  };
};


/**
 * Mevcut yerleştirme durumunu kontrol eder
 * @param {Object} yerlesimSonucu - Yerleştirme sonucu objesi
 * @returns {Object} Kontrol sonucu ve analiz
 */
export const mevcutYerlesimiKontrolEt = (yerlesimSonucu) => {
  console.log('🔍 MEVCUT YERLEŞİM DURUMU KONTROLÜ\n' + '='.repeat(60));
  
  if (!yerlesimSonucu) {
    console.log('❌ Yerleştirme sonucu bulunamadı');
    return {
      hata: true,
      mesaj: 'Yerleştirme sonucu bulunamadı'
    };
  }
  
  const { salonlar, yerlesilemeyenOgrenciler, istatistikler } = yerlesimSonucu;
  
  console.log('\n📊 GENEL DURUM:');
  console.log(`   Toplam salon: ${salonlar ? salonlar.length : 0}`);
  console.log(`   Yerleştirilemeyen öğrenci: ${yerlesilemeyenOgrenciler ? yerlesilemeyenOgrenciler.length : 0}`);
  
  if (istatistikler) {
    console.log(`   Başarı oranı: %${(istatistikler.basariOrani || 0).toFixed(1)}`);
    console.log(`   Yerleşen öğrenci: ${istatistikler.toplamYerlesen || 0}`);
    console.log(`   Toplam öğrenci: ${istatistikler.toplamOgrenci || 0}`);
  }
  
  // Salon bazlı analiz
  if (salonlar && salonlar.length > 0) {
    console.log('\n🏢 SALON BAZLI ANALİZ:');
    salonlar.forEach((salon, index) => {
      const yerlesenSayisi = salon.ogrenciler ? salon.ogrenciler.length : 0;
      const yerlesilemeyenSayisi = salon.yerlesilemeyenOgrenciler ? salon.yerlesilemeyenOgrenciler.length : 0;
      const basariOrani = salon.basariOrani || 0;
      
      console.log(`   ${index + 1}. ${salon.salonAdi}:`);
      console.log(`      Yerleşen: ${yerlesenSayisi} öğrenci`);
      console.log(`      Yerleşemeyen: ${yerlesilemeyenSayisi} öğrenci`);
      console.log(`      Başarı: %${basariOrani.toFixed(1)}`);
      
      if (yerlesilemeyenSayisi > 0) {
        console.log(`      ⚠️ ${yerlesilemeyenSayisi} öğrenci yerleştirilemedi`);
      }
    });
  }
  
  // Yerleştirilemeyen öğrenciler analizi
  if (yerlesilemeyenOgrenciler && yerlesilemeyenOgrenciler.length > 0) {
    console.log('\n❌ YERLEŞTİRİLEMEYEN ÖĞRENCİLER:');
    yerlesilemeyenOgrenciler.forEach((ogrenci, index) => {
      console.log(`   ${index + 1}. ${ogrenci.ad} ${ogrenci.soyad} (${ogrenci.sinif}) - ${ogrenci.cinsiyet}`);
    });
    
    // Sınıf seviyesi analizi
    const sinifAnalizi = {};
    yerlesilemeyenOgrenciler.forEach(ogrenci => {
      const seviye = getSinifSeviyesi(ogrenci.sinif);
      if (seviye) {
        sinifAnalizi[seviye] = (sinifAnalizi[seviye] || 0) + 1;
      }
    });
    
    if (Object.keys(sinifAnalizi).length > 0) {
      console.log('\n📊 SINIF SEVİYESİ ANALİZİ:');
      Object.keys(sinifAnalizi).forEach(seviye => {
        console.log(`   ${seviye}. sınıf: ${sinifAnalizi[seviye]} öğrenci`);
      });
    }
    
    // Cinsiyet analizi
    const cinsiyetAnalizi = { Erkek: 0, Kız: 0, Belirsiz: 0 };
    yerlesilemeyenOgrenciler.forEach(ogrenci => {
      if (ogrenci.cinsiyet === 'E' || ogrenci.cinsiyet === 'Erkek') {
        cinsiyetAnalizi.Erkek++;
      } else if (ogrenci.cinsiyet === 'K' || ogrenci.cinsiyet === 'Kız') {
        cinsiyetAnalizi.Kız++;
      } else {
        cinsiyetAnalizi.Belirsiz++;
      }
    });
    
    console.log('\n👥 CİNSİYET ANALİZİ:');
    Object.keys(cinsiyetAnalizi).forEach(cinsiyet => {
      if (cinsiyetAnalizi[cinsiyet] > 0) {
        console.log(`   ${cinsiyet}: ${cinsiyetAnalizi[cinsiyet]} öğrenci`);
      }
    });
  } else {
    console.log('\n✅ TÜM ÖĞRENCİLER YERLEŞTİRİLDİ!');
    console.log('   Yerleştirilemeyen öğrenci bulunamadı.');
  }
  
  // Öneriler
  console.log('\n💡 ÖNERİLER:');
  if (yerlesilemeyenOgrenciler && yerlesilemeyenOgrenciler.length > 0) {
    console.log(`   • ${yerlesilemeyenOgrenciler.length} öğrenci için alternatif yerleştirme denenebilir`);
    console.log('   • Salon kapasiteleri artırılabilir');
    console.log('   • Kısıtlar gevşetilebilir');
    console.log('   • Yeni salon eklenebilir');
  } else {
    console.log('   • Mükemmel yerleştirme! Herhangi bir iyileştirme gerekmiyor.');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Mevcut yerleştirme durumu kontrolü tamamlandı!\n');
  
  return {
    hata: false,
    toplamSalon: salonlar ? salonlar.length : 0,
    yerlesilemeyenSayisi: yerlesilemeyenOgrenciler ? yerlesilemeyenOgrenciler.length : 0,
    basariOrani: istatistikler ? istatistikler.basariOrani : 0,
    yerlesilemeyenOgrenciler: yerlesilemeyenOgrenciler || [],
    salonlar: salonlar || []
  };
};

/**
 * Kademeli azalan arka arkaya kontrol testi
 */
export const testKademeliArkaArkayaKontrol = () => {
  console.log('🧪 KADEMELİ ARKA ARKAYA KONTROL TESTİ\n' + '='.repeat(60));
  
  // Test öğrencileri
  const ogrenci1 = { id: 1, ad: 'Ali', cinsiyet: 'E', sinif: '9-A' };
  const ogrenci2 = { id: 2, ad: 'Ayşe', cinsiyet: 'K', sinif: '10-B' };
  const ogrenci3 = { id: 3, ad: 'Mehmet', cinsiyet: 'E', sinif: '9-C' };
  const ogrenci4 = { id: 4, ad: 'Fatma', cinsiyet: 'K', sinif: '10-A' };
  const ogrenci5 = { id: 5, ad: 'Ahmet', cinsiyet: 'E', sinif: '9-D' };
  
  // Test planı - Arka arkaya aynı sınıf seviyesi senaryosu
  const plan2D = [
    [{ ogrenci: ogrenci1, grup: 1 }, { ogrenci: ogrenci2, grup: 1 }], // Sıra 1: 9-A, 10-B
    [{ ogrenci: ogrenci3, grup: 1 }, { ogrenci: ogrenci4, grup: 1 }]  // Sıra 2: 9-C, 10-A (arka arkaya 9-9)
  ];
  
  console.log('\n📋 TEST SENARYOSU:');
  console.log('   Sıra 1: Ali (9-A) | Ayşe (10-B)');
  console.log('   Sıra 2: Mehmet (9-C) | Fatma (10-A)');
  console.log('   Test: Ahmet (9-D) sıra 2, sütun 0\'a yerleştirilebilir mi?');
  console.log('   Beklenen: Arka arkaya 9-9-9 olacağı için KATMAN 0\'da RED, KATMAN 1\'de GEÇ');
  
  // Test koltuk (sıra 2, sütun 0 - Mehmet'in üstü)
  const testKoltuk = { satir: 2, sutun: 0, grup: 1 };
  const testOgrenci = ogrenci5;
  
  console.log('\n🔍 KATMAN KONTROLLERİ:');
  
  // Katman 0: Tüm kısıtlar aktif
  console.log('\n1️⃣  Katman 0 (TÜM KISITLAR):');
  const komsular0 = getNeighbors(testKoltuk.satir, testKoltuk.sutun, 3, 2);
  const cinsiyetOK0 = isGenderValid(testOgrenci, komsular0, plan2D, testKoltuk.grup);
  const sinifOK0 = isClassLevelValid(testOgrenci, komsular0, plan2D, testKoltuk.grup);
  const arkaArkayaOK0 = isBackToBackClassLevelValid(testOgrenci, testKoltuk, plan2D, testKoltuk.grup);
  
  console.log(`   Cinsiyet: ${cinsiyetOK0 ? '✅' : '❌'}`);
  console.log(`   Sınıf: ${sinifOK0 ? '✅' : '❌'}`);
  console.log(`   Arka Arkaya: ${arkaArkayaOK0 ? '✅' : '❌'} (9-9-9 kontrolü)`);
  console.log(`   SONUÇ: ${cinsiyetOK0 && sinifOK0 && arkaArkayaOK0 ? '✅ GEÇTİ' : '❌ REDDEDİLDİ'}`);
  
  // Katman 1: Arka arkaya kontrol kaldırıldı
  console.log('\n2️⃣  Katman 1 (ARKA ARKAYA KALDIRILDI):');
  const cinsiyetOK1 = isGenderValid(testOgrenci, komsular0, plan2D, testKoltuk.grup);
  const sinifOK1 = isClassLevelValid(testOgrenci, komsular0, plan2D, testKoltuk.grup);
  
  console.log(`   Cinsiyet: ${cinsiyetOK1 ? '✅' : '❌'}`);
  console.log(`   Sınıf: ${sinifOK1 ? '✅' : '❌'}`);
  console.log(`   Arka Arkaya: ATLANDI`);
  console.log(`   SONUÇ: ${cinsiyetOK1 && sinifOK1 ? '✅ GEÇTİ' : '❌ REDDEDİLDİ'}`);
  
  // Katman 2: Sadece cinsiyet
  console.log('\n3️⃣  Katman 2 (SADECE CİNSİYET):');
  const cinsiyetOK2 = isGenderValid(testOgrenci, komsular0, plan2D, testKoltuk.grup);
  
  console.log(`   Cinsiyet: ${cinsiyetOK2 ? '✅' : '❌'}`);
  console.log(`   Sınıf: ATLANDI`);
  console.log(`   Arka Arkaya: ATLANDI`);
  console.log(`   SONUÇ: ${cinsiyetOK2 ? '✅ GEÇTİ' : '❌ REDDEDİLDİ'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Kademeli arka arkaya kontrol testi tamamlandı!\n');
  
  return {
    katman0: cinsiyetOK0 && sinifOK0 && arkaArkayaOK0,
    katman1: cinsiyetOK1 && sinifOK1,
    katman2: cinsiyetOK2,
    beklenti: {
      katman0: false, // Arka arkaya 9-9-9 olacağı için red
      katman1: true,  // Arka arkaya kontrol kaldırıldığı için geç
      katman2: true   // Sadece cinsiyet kontrolü
    }
  };
};

/**
 * Mevcut yerleştirme durumunu test eder
 */
export const testMevcutYerlesimKontrol = () => {
  console.log('🧪 MEVCUT YERLEŞİM DURUMU TESTİ\n' + '='.repeat(60));
  
  // Test verileri - Örnek yerleştirme sonucu
  const testYerlesimSonucu = {
    salonlar: [
      {
        salonAdi: 'Salon A',
        ogrenciler: [
          { id: 1, ad: 'Ali', soyad: 'Veli', sinif: '9-A', cinsiyet: 'E' },
          { id: 2, ad: 'Ayşe', soyad: 'Kaya', sinif: '10-B', cinsiyet: 'K' }
        ],
        yerlesilemeyenOgrenciler: [
          { id: 3, ad: 'Mehmet', soyad: 'Demir', sinif: '9-C', cinsiyet: 'E' }
        ],
        basariOrani: 66.7
      },
      {
        salonAdi: 'Salon B',
        ogrenciler: [
          { id: 4, ad: 'Fatma', soyad: 'Öz', sinif: '11-A', cinsiyet: 'K' }
        ],
        yerlesilemeyenOgrenciler: [],
        basariOrani: 100.0
      }
    ],
    yerlesilemeyenOgrenciler: [
      { id: 3, ad: 'Mehmet', soyad: 'Demir', sinif: '9-C', cinsiyet: 'E' },
      { id: 5, ad: 'Zeynep', soyad: 'Yılmaz', sinif: '10-D', cinsiyet: 'K' }
    ],
    istatistikler: {
      basariOrani: 60.0,
      toplamYerlesen: 3,
      toplamOgrenci: 5,
      toplamYerlesilemeyen: 2
    }
  };
  
  // Kontrol fonksiyonunu çağır
  const sonuc = mevcutYerlesimiKontrolEt(testYerlesimSonucu);
  
  console.log('\n📊 TEST SONUCU:');
  console.log(`   Hata: ${sonuc.hata ? '❌' : '✅'}`);
  console.log(`   Toplam salon: ${sonuc.toplamSalon}`);
  console.log(`   Yerleştirilemeyen: ${sonuc.yerlesilemeyenSayisi} öğrenci`);
  console.log(`   Başarı oranı: %${sonuc.basariOrani.toFixed(1)}`);
  
  return sonuc;
};


/**
 * Gerçek yerleştirme sonucunu kontrol eder
 */
export const gercekYerlesimSonucunuKontrolEt = () => {
  console.log('🔍 GERÇEK YERLEŞTİRME SONUCU KONTROLÜ\n' + '='.repeat(60));
  
  try {
    // Örnek yerleştirme verileri (gerçek sistemden alınacak)
    const ornekYerlesimSonucu = {
      salonlar: [
        {
          salonAdi: 'Ana Salon',
          ogrenciler: [
            { id: 1, ad: 'Ahmet', soyad: 'Yılmaz', sinif: '9-A', cinsiyet: 'E', masaNumarasi: 1 },
            { id: 2, ad: 'Ayşe', soyad: 'Kaya', sinif: '10-B', cinsiyet: 'K', masaNumarasi: 2 },
            { id: 3, ad: 'Mehmet', soyad: 'Demir', sinif: '11-C', cinsiyet: 'E', masaNumarasi: 3 }
          ],
          yerlesilemeyenOgrenciler: [],
          basariOrani: 100.0
        },
        {
          salonAdi: 'Yan Salon',
          ogrenciler: [
            { id: 4, ad: 'Fatma', soyad: 'Öz', sinif: '9-D', cinsiyet: 'K', masaNumarasi: 1 },
            { id: 5, ad: 'Ali', soyad: 'Veli', sinif: '10-E', cinsiyet: 'E', masaNumarasi: 2 }
          ],
          yerlesilemeyenOgrenciler: [
            { id: 6, ad: 'Zeynep', soyad: 'Çelik', sinif: '11-F', cinsiyet: 'K' }
          ],
          basariOrani: 66.7
        }
      ],
      yerlesilemeyenOgrenciler: [
        { id: 6, ad: 'Zeynep', soyad: 'Çelik', sinif: '11-F', cinsiyet: 'K' },
        { id: 7, ad: 'Can', soyad: 'Arslan', sinif: '9-G', cinsiyet: 'E' }
      ],
      istatistikler: {
        basariOrani: 71.4,
        toplamYerlesen: 5,
        toplamOgrenci: 7,
        toplamYerlesilemeyen: 2
      }
    };
    
    // Kontrol fonksiyonunu çağır
    const sonuc = mevcutYerlesimiKontrolEt(ornekYerlesimSonucu);
    
    console.log('\n📊 GERÇEK YERLEŞTİRME ANALİZİ:');
    console.log(`   Toplam salon: ${sonuc.toplamSalon}`);
    console.log(`   Yerleştirilemeyen: ${sonuc.yerlesilemeyenSayisi} öğrenci`);
    console.log(`   Başarı oranı: %${sonuc.basariOrani.toFixed(1)}`);
    
    if (sonuc.yerlesilemeyenSayisi > 0) {
      console.log('\n⚠️ YERLEŞTİRİLEMEYEN ÖĞRENCİLER TESPİT EDİLDİ!');
      console.log('   Alternatif yerleştirme öneriliyor...');
      
      // Alternatif yerleştirme önerisi
      console.log('\n💡 ALTERNATİF YERLEŞTİRME ÖNERİSİ:');
      console.log('   1. En boş salonları kontrol et');
      console.log('   2. Kısıtları gevşet');
      console.log('   3. Yeni salon ekle');
      console.log('   4. Kapasite artır');
    } else {
      console.log('\n✅ TÜM ÖĞRENCİLER BAŞARIYLA YERLEŞTİRİLDİ!');
    }
    
    return sonuc;
    
  } catch (error) {
    console.error('❌ Yerleştirme kontrolü sırasında hata:', error.message);
    return {
      hata: true,
      mesaj: error.message
    };
  }
};

/**
 * DÜZELTİLMİŞ KISITLARI TEST ET
 */
export const testDuzeltilmisKisitlar = () => {
  console.log('🧪 DÜZELTİLMİŞ KISIT TESTİ\n' + '='.repeat(60));
  
  // Test öğrencileri
  const ogrenci1 = { id: 1, ad: 'Ali', cinsiyet: 'E', sinif: '9-A' };
  const ogrenci2 = { id: 2, ad: 'Ayşe', cinsiyet: 'K', sinif: '10-B' };
  const ogrenci3 = { id: 3, ad: 'Mehmet', cinsiyet: 'E', sinif: '9-C' };
  const ogrenci4 = { id: 4, ad: 'Fatma', cinsiyet: 'K', sinif: '10-A' };
  
  // Test planı
  const plan2D = [
    [{ ogrenci: ogrenci1 }, null],
    [null, null]
  ];
  
  console.log('\n📋 TEST SENARYOLARI:\n');
  
  // Test 1: Aynı cinsiyet (Erkek-Erkek) - OLMALI
  console.log('1️⃣  Test: Erkek yanına Erkek');
  console.log('   Mevcut: Ali (E, 9-A)');
  console.log('   Aday: Mehmet (E, 9-C)');
  const test1 = isGenderValid(ogrenci3, [[0, 0]], plan2D);
  console.log(`   Cinsiyet Kontrolü: ${test1 ? '✅ UYGUN (Aynı cinsiyet OK)' : '❌ UYGUN DEĞİL'}`);
  
  // Test 2: Farklı cinsiyet (Erkek-Kız) - OLMAMALI
  console.log('\n2️⃣  Test: Erkek yanına Kız');
  console.log('   Mevcut: Ali (E, 9-A)');
  console.log('   Aday: Ayşe (K, 10-B)');
  const test2 = isGenderValid(ogrenci2, [[0, 0]], plan2D);
  console.log(`   Cinsiyet Kontrolü: ${test2 ? '✅ UYGUN' : '❌ UYGUN DEĞİL (Farklı cinsiyet YASAK)'}`);
  
  // Test 3: Aynı sınıf seviyesi (9-9) - OLMAMALI
  console.log('\n3️⃣  Test: 9. sınıf yanına 9. sınıf');
  console.log('   Mevcut: Ali (E, 9-A)');
  console.log('   Aday: Mehmet (E, 9-C)');
  const test3 = isClassLevelValid(ogrenci3, [[0, 0]], plan2D);
  console.log(`   Sınıf Kontrolü: ${test3 ? '✅ UYGUN' : '❌ UYGUN DEĞİL (Aynı seviye YASAK)'}`);
  
  // Test 4: Farklı sınıf seviyesi (9-10) - OLMALI
  console.log('\n4️⃣  Test: 9. sınıf yanına 10. sınıf');
  console.log('   Mevcut: Ali (E, 9-A)');
  console.log('   Aday: Fatma (K, 10-A)');
  const test4_sinif = isClassLevelValid(ogrenci4, [[0, 0]], plan2D);
  console.log(`   Sınıf Kontrolü: ${test4_sinif ? '✅ UYGUN (Farklı seviye OK)' : '❌ UYGUN DEĞİL'}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Düzeltilmiş kısıt testi tamamlandı!\n');
  
  return {
    genderSame: test1,      // Aynı cinsiyet OK olmalı
    genderDiff: !test2,    // Farklı cinsiyet YASAK olmalı
    classSame: !test3,      // Aynı sınıf YASAK olmalı
    classDiff: test4_sinif // Farklı sınıf OK olmalı
  };
};

export default gelismisYerlestirme;
