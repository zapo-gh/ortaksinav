/**
 * Kısıt Validasyon Fonksiyonları
 * Cinsiyet ve sınıf seviyesi kısıtlarını kontrol eder
 */

import logger from '../../utils/logger.js';
import { getSinifSeviyesi } from '../utils/helpers.js';

/**
 * Cinsiyet kontrolü - kız-erkek yan yana oturamaz
 */
export const isGenderValid = (ogrenci, komsular, plan, currentGroup = null, currentRow = null) => {
  if (!ogrenci.cinsiyet) return true; // Cinsiyet bilgisi yoksa geç

  // SADECE YAN YANA KOMŞULAR İÇİN KISIT KONTROLÜ (getNeighbors artık sadece sol-sağ döndürüyor)
  for (const [satir, sutun] of komsular) {
    const neighborCell = plan[satir] && plan[satir][sutun];
    const komsuOgrenci = neighborCell?.ogrenci;
    if (currentGroup != null && neighborCell?.grup != null && neighborCell.grup !== currentGroup) {
      continue; // sadece aynı grup
    }
    if (komsuOgrenci && komsuOgrenci.cinsiyet !== ogrenci.cinsiyet) {
      logger.debug(`❌ Cinsiyet kısıt ihlali: ${ogrenci.ad} (${ogrenci.cinsiyet}) yanında ${komsuOgrenci.ad} (${komsuOgrenci.cinsiyet})`);
      return false;
    }
  }
  return true;
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
 * Arka arkaya aynı sınıf seviyesi kontrolü - aynı sütunda üst-alt oturamaz
 * Farklı satırlarda aynı sütundaki öğrencileri kontrol eder
 */
export const isBackToBackClassLevelValid = (ogrenci, masa, plan, currentGroup = null) => {
  const ogrenciSeviye = getSinifSeviyesi(ogrenci.sinif);
  if (!ogrenciSeviye) return true;

  const satir = masa.satir;
  const sutun = masa.sutun;
  const satirSayisi = plan.length;

  // Üst ve alt komşuları kontrol et
  const ustSatir = satir - 1;
  const altSatir = satir + 1;

  // Üst komşu kontrolü
  if (ustSatir >= 0) {
    const ustCell = plan[ustSatir] && plan[ustSatir][sutun];
    const ustOgrenci = ustCell?.ogrenci;
    if (currentGroup != null && ustCell?.grup != null && ustCell.grup !== currentGroup) {
      // Farklı grup, kontrol etme
    } else if (ustOgrenci) {
      const ustSeviye = getSinifSeviyesi(ustOgrenci.sinif);
      if (ustSeviye === ogrenciSeviye) {
        logger.debug(`❌ Arka arkaya sınıf seviyesi kısıt ihlali: ${ogrenci.ad} (${ogrenciSeviye}) üstte ${ustOgrenci.ad} (${ustSeviye})`);
        return false;
      }
    }
  }

  // Alt komşu kontrolü
  if (altSatir < satirSayisi) {
    const altCell = plan[altSatir] && plan[altSatir][sutun];
    const altOgrenci = altCell?.ogrenci;
    if (currentGroup != null && altCell?.grup != null && altCell.grup !== currentGroup) {
      // Farklı grup, kontrol etme
    } else if (altOgrenci) {
      const altSeviye = getSinifSeviyesi(altOgrenci.sinif);
      if (altSeviye === ogrenciSeviye) {
        logger.debug(`❌ Arka arkaya sınıf seviyesi kısıt ihlali: ${ogrenci.ad} (${ogrenciSeviye}) altta ${altOgrenci.ad} (${altSeviye})`);
        return false;
      }
    }
  }

  return true;
};
