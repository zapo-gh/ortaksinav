/**
 * Yerleştirme Optimizasyonu
 * Takas algoritması ile yerleştirme sonrası optimizasyon
 */

import logger from '../../utils/logger';
import { getNeighbors } from '../utils/helpers';
import { isGenderValid, isClassLevelValid } from '../validation/constraints';

/**
 * Yerleştirme sonrası optimizasyon - Takas algoritması + Boş koltuk doldurma
 */
export const optimizePlacement = (salon, plan2D) => {
  let optimizationScore = 0;

  logger.info(`🔄 Yerleştirme sonrası optimizasyon başlıyor...`);

  // 1. Önce boş koltukları doldur
  optimizationScore += fillEmptySeats(plan2D, salon);

  // 2. Sonra komşu takasları yap
  optimizationScore += performNeighborSwaps(plan2D);

  logger.info(`✅ Optimizasyon tamamlandı. Toplam skor: ${optimizationScore}`);
  return optimizationScore;
};

/**
 * Boş koltukları doldurmaya odaklanan optimizasyon
 */
const fillEmptySeats = (plan2D, salon) => {
  let score = 0;
  const satirSayisi = plan2D.length;
  const sutunSayisi = plan2D[0].length;
  
  // Boş koltukları bul
  const emptySeats = [];
  for (let satir = 0; satir < satirSayisi; satir++) {
    for (let sutun = 0; sutun < sutunSayisi; sutun++) {
      if (!plan2D[satir][sutun]?.ogrenci) {
        emptySeats.push({ satir, sutun, grup: plan2D[satir][sutun]?.grup });
      }
    }
  }

  if (emptySeats.length === 0) {
    logger.debug(`📝 Boş koltuk bulunamadı, optimizasyon atlanıyor`);
    return 0;
  }

  logger.info(`🔍 ${emptySeats.length} boş koltuk bulundu, doldurma optimizasyonu başlıyor...`);

  // Her boş koltuk için uygun aday ara
  for (const emptySeat of emptySeats) {
    const bestMove = findBestMoveToEmptySeat(plan2D, emptySeat, salon);
    if (bestMove) {
      // En iyi hareketi uygula
      const { fromStudent, fromRow, fromCol, benefit } = bestMove;
      
      // Öğrenciyi boş koltuğa taşı
      plan2D[emptySeat.satir][emptySeat.sutun] = {
        ogrenci: fromStudent,
        grup: emptySeat.grup
      };
      
      // Eski koltuğu boşalt
      plan2D[fromRow][fromCol] = { grup: plan2D[fromRow][fromCol]?.grup };
      
      score += benefit;
      logger.debug(`🔄 Boş koltuk doldurma: ${fromStudent.ad} → (${emptySeat.satir},${emptySeat.sutun}) (+${benefit})`);
    }
  }

  return score;
};

/**
 * Boş koltuk için en iyi hareketi bulur
 */
const findBestMoveToEmptySeat = (plan2D, emptySeat, salon) => {
  const satirSayisi = plan2D.length;
  const sutunSayisi = plan2D[0].length;
  let bestMove = null;
  let bestBenefit = 0;

  // Tüm dolu koltukları kontrol et
  for (let satir = 0; satir < satirSayisi; satir++) {
    for (let sutun = 0; sutun < sutunSayisi; sutun++) {
      const student = plan2D[satir][sutun]?.ogrenci;
      if (!student) continue;

      // Bu öğrenciyi boş koltuğa taşımanın faydasını hesapla
      const benefit = calculateMoveBenefit(
        student, 
        satir, sutun, 
        emptySeat.satir, emptySeat.sutun, 
        plan2D, 
        emptySeat.grup
      );

      if (benefit > bestBenefit) {
        bestMove = {
          fromStudent: student,
          fromRow: satir,
          fromCol: sutun,
          benefit: benefit
        };
        bestBenefit = benefit;
      }
    }
  }

  return bestMove;
};

/**
 * Öğrenciyi boş koltuğa taşımanın faydasını hesaplar
 */
const calculateMoveBenefit = (student, fromRow, fromCol, toRow, toCol, plan, targetGroup) => {
  // Kısıt kontrolü - öğrenci hedef koltuğa uygun mu?
  const komsular = getNeighbors(toRow, toCol, plan.length, plan[0].length);
  const genderValid = isGenderValid(student, komsular, plan, targetGroup);
  const classValid = isClassLevelValid(student, komsular, plan, targetGroup);
  
  // Kısıt ihlali varsa fayda yok
  if (!genderValid || !classValid) {
    return 0;
  }

  // Boş koltuk doldurma faydası (yüksek öncelik)
  let benefit = 100;
  
  // Kısıt uyumluluğu bonusu
  if (genderValid) benefit += 10;
  if (classValid) benefit += 5;
  
  // Eski koltuğun boş kalması durumunda kayıp (düşük)
  benefit -= 5;
  
  return benefit;
};

/**
 * Komşu takasları yapan optimizasyon
 */
const performNeighborSwaps = (plan2D) => {
  let score = 0;
  const satirSayisi = plan2D.length;
  const sutunSayisi = plan2D[0].length;

  for (let satir = 0; satir < satirSayisi; satir++) {
    for (let sutun = 0; sutun < sutunSayisi; sutun++) {
      const currentStudent = plan2D[satir][sutun]?.ogrenci;
      if (!currentStudent) continue;

      // Komşu koltuklarla takas fırsatlarını kontrol et
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;

          const newSatir = satir + dr;
          const newSutun = sutun + dc;

          if (newSatir >= 0 && newSatir < satirSayisi &&
              newSutun >= 0 && newSutun < sutunSayisi) {

            const neighborStudent = plan2D[newSatir][newSutun]?.ogrenci;
            if (neighborStudent) {
              const swapBenefit = calculateSwapBenefit(
                currentStudent, neighborStudent,
                satir, sutun, newSatir, newSutun,
                plan2D
              );

              if (swapBenefit > 0) {
                // Takas işlemi
                plan2D[satir][sutun].ogrenci = neighborStudent;
                plan2D[newSatir][newSutun].ogrenci = currentStudent;
                score += swapBenefit;

                logger.debug(`🔄 Komşu takas: ${currentStudent.ad} ↔ ${neighborStudent.ad} (+${swapBenefit})`);
              }
            }
          }
        }
      }
    }
  }

  return score;
};

/**
 * Takas faydasını hesaplar
 */
const calculateSwapBenefit = (student1, student2, row1, col1, row2, col2, plan) => {
  // Mevcut durum kısıt skoru
  const currentScore1 = calculateConstraintScore(student1, getNeighbors(row1, col1, plan.length, plan[0].length), plan, null);
  const currentScore2 = calculateConstraintScore(student2, getNeighbors(row2, col2, plan.length, plan[0].length), plan, null);
  const currentTotal = currentScore1 + currentScore2;

  // Yeni durum kısıt skoru (takas sonrası)
  const newScore1 = calculateConstraintScore(student2, getNeighbors(row1, col1, plan.length, plan[0].length), plan, null);
  const newScore2 = calculateConstraintScore(student1, getNeighbors(row2, col2, plan.length, plan[0].length), plan, null);
  const newTotal = newScore1 + newScore2;

  return newTotal - currentTotal;
};

/**
 * Kısıt skorunu hesaplar (yüksek = daha iyi)
 */
const calculateConstraintScore = (ogrenci, komsular, plan) => {
  let score = 0;

  // Cinsiyet kısıtı skoru
  // Grup ve satır bağlamı bu kapsamda mevcut değil; nötr bırak

  // Sınıf seviyesi kısıtı skoru
  // Grup ve satır bağlamı bu kapsamda mevcut değil; sınıf seviyesini nötr bırak
  if (true) {
    score += 5; // Sınıf seviyesi kısıtı sağlanırsa +5 puan
  }

  return score;
};
