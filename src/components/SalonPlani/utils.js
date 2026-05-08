/**
 * SalonPlani yardımcı fonksiyonları
 * Ana bileşenden çıkarılmış saf (pure) fonksiyonlar
 */

// Drag & Drop item types
export const ITEM_TYPES = {
  STUDENT: 'student'
};

/**
 * Salondaki yerleşen öğrenci sayısını hesaplar (duplicate'leri önler)
 */
export const getSalonYerlesenSayisi = (salon) => {
  if (!salon) return 0;
  const uniqueIds = new Set();

  const addStudent = (ogrenci) => {
    if (ogrenci && ogrenci.id != null) {
      uniqueIds.add(String(ogrenci.id));
    }
  };

  const addFromSeatArray = (koleksiyon) => {
    if (!Array.isArray(koleksiyon)) return;
    koleksiyon.forEach(koltuk => {
      if (!koltuk) return;
      if (koltuk.ogrenci) {
        addStudent(koltuk.ogrenci);
      }
    });
  };

  addFromSeatArray(salon.masalar);

  if (!salon.masalar || salon.masalar.length === 0) {
    addFromSeatArray(salon.plan);
    addFromSeatArray(salon?.koltukMatrisi?.masalar);
    addFromSeatArray(salon?.salon?.masalar);

    if (Array.isArray(salon.ogrenciler)) {
      salon.ogrenciler.forEach(addStudent);
    }
  }

  return uniqueIds.size;
};

/**
 * Masanın salonddaki pozisyonunu belirler (köşe/kenar/merkez)
 */
export const getPozisyon = (satir, sutun, satirSayisi, sutunSayisi) => {
  if ((satir === 0 || satir === satirSayisi - 1) &&
    (sutun === 0 || sutun === sutunSayisi - 1)) {
    return 'kose';
  } else if (satir === 0 || satir === satirSayisi - 1 ||
    sutun === 0 || sutun === sutunSayisi - 1) {
    return 'kenar';
  }
  return 'merkez';
};

/**
 * Grup bazlı masa numarası hesaplama
 */
export const calculateGroupBasedDeskNumbers = (masalar) => {
  if (!masalar || masalar.length === 0) return masalar;

  const gruplar = {};
  masalar.forEach(masa => {
    const grup = masa.grup || 1;
    if (!gruplar[grup]) {
      gruplar[grup] = [];
    }
    gruplar[grup].push(masa);
  });

  let masaNumarasi = 1;
  const guncellenmisMasalar = [];
  const sortedGruplar = Object.keys(gruplar).sort((a, b) => parseInt(a) - parseInt(b));

  sortedGruplar.forEach(grupId => {
    const grupMasalar = gruplar[grupId];
    const sortedGrupMasalar = grupMasalar.sort((a, b) => {
      if (a.satir !== b.satir) {
        return a.satir - b.satir;
      }
      return a.sutun - b.sutun;
    });

    sortedGrupMasalar.forEach(masa => {
      guncellenmisMasalar.push({
        ...masa,
        masaNumarasi: masaNumarasi++
      });
    });
  });

  return guncellenmisMasalar;
};

/**
 * Öğrenci cinsiyetine göre MUI renk döndürür
 */
export const getGenderColor = (ogrenci) => {
  if (!ogrenci) return 'primary';
  const cinsiyet = (ogrenci.cinsiyet || '').toLowerCase();
  if (cinsiyet === 'k' || cinsiyet === 'kız' || cinsiyet === 'kiz') return 'secondary';
  return 'primary';
};
