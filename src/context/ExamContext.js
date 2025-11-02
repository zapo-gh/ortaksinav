import React, { createContext, useContext, useReducer, useEffect } from 'react';
import logger from '../utils/logger';
import { storageOptimizer } from '../utils/storageOptimizer';

// localStorage yardımcı fonksiyonları (sıkıştırmasız)
const loadFromStorage = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    logger.error(`localStorage'dan ${key} yüklenirken hata:`, error);
    return defaultValue;
  }
};

// Gerçek kaydetme fonksiyonu (optimizer tarafından çağrılır)
const _saveToStorage = async (key, value) => {
  try {
    // Lazy import db
    const { default: db } = await import('../database');
    
    // IndexedDB'ye kaydet (localStorage sadece fallback - daha az kullan)
    if (key === 'exam_ogrenciler') {
      await db.saveStudents(value);
      // localStorage yedeği - sadece hata durumunda
      // try { localStorage.setItem('exam_ogrenciler', JSON.stringify(value)); } catch (e) { logger.debug('localStorage mirror failed (exam_ogrenciler):', e); }
    } else if (key === 'exam_ayarlar') {
      await db.saveSettings(value);
      // try { localStorage.setItem('exam_ayarlar', JSON.stringify(value)); } catch (e) { logger.debug('localStorage mirror failed (exam_ayarlar):', e); }
    } else if (key === 'exam_salonlar') {
      await db.saveSalons(value);
      // try { localStorage.setItem('exam_salonlar', JSON.stringify(value)); } catch (e) { logger.debug('localStorage mirror failed (exam_salonlar):', e); }
    } else if (key === 'exam_yerlestirme') {
      // GEREKSIZ OTOMATIK PLAN KAYDETMEYI ENGELLE
      // Yerleştirme sonucu sadece oturum için localStorage'da tutulmalı
      // Kullanıcı "Kaydet" butonuna bastığında plan kaydedilmeli (handleSavePlan)
      // Otomatik kaydetme gereksiz plan oluşturuyor ve kota sorunlarına yol açıyor
      if (!value) {
        logger.debug('ℹ️ Yerleştirme sonucu boş, kaydetme atlandı');
        return; // Erken çıkış
      }
      
      // Sadece localStorage'a kaydet (oturum için), veritabanına kaydetme
      // Kullanıcı açıkça "Kaydet" dediğinde planManager.savePlan çağrılacak
      try { 
        localStorage.setItem('exam_yerlestirme', JSON.stringify(value)); 
        logger.debug('✅ Yerleştirme sonucu localStorage\'a kaydedildi (oturum için)');
      } catch (e) { 
        logger.debug('localStorage mirror failed (exam_yerlestirme):', e); 
      }
    } else if (key === 'exam_aktif_tab') {
      // Sadece localStorage (basit string)
      try { localStorage.setItem('exam_aktif_tab', JSON.stringify(value)); } catch (e) { logger.debug('localStorage mirror failed (exam_aktif_tab):', e); }
    } else {
      // Diğer veriler için normal kayıt
      logger.debug(`✅ ${key} veritabanına kaydedildi (adapter)`);
    }
  } catch (error) {
    logger.error(`❌ IndexedDB'ye ${key} kaydedilirken hata:`, error);
    
    // Quota hatası durumunda eski verileri temizle
    if (error.name === 'QuotaExceededError') {
      logger.info('🧹 Quota hatası - eski veriler temizleniyor...');
      // Firestore/IndexedDB kullanıldığı için localStorage temizlik/tekrar deneme yapmıyoruz
    }
  }
};

// Optimize edilmiş saveToStorage - debouncing ve değişiklik kontrolü ile
const saveToStorage = async (key, value, immediate = false) => {
  // Acil durumlar için (örneğin plan kaydetme)
  if (immediate) {
    await storageOptimizer.immediateSave(key, value, _saveToStorage);
    return;
  }

  // Normal durumlar için debounced save
  await storageOptimizer.debouncedSave(key, value, _saveToStorage);
};

// Firestore'dan veri yükleme fonksiyonu
const loadFromFirestore = async () => {
  try {
    // console.log('📥 Firestore\'dan veriler yükleniyor...');
    
    // Lazy import db
    const { default: db } = await import('../database');
    
    // Firestore'dan verileri çek (birincil veritabanı)
    console.log('📥 loadFromFirestore: Veriler yükleniyor...');
    console.log('📥 loadFromFirestore: DB adapter:', {
      useFirestore: db?.useFirestore,
      getDatabaseType: db?.getDatabaseType ? db.getDatabaseType() : 'unknown'
    });
    
    const [firestoreOgrenciler, firestoreAyarlar, firestoreSalonlar, latestPlan] = await Promise.all([
      db.getAllStudents().catch((error) => {
        console.error('❌ getAllStudents hatası:', error);
        return [];
      }),
      db.getSettings().catch((error) => {
        console.error('❌ getSettings hatası:', error);
        return null;
      }),
      db.getAllSalons().catch((error) => {
        console.error('❌ getAllSalons hatası:', error);
        return [];
      }),
      db.getLatestPlan().catch((error) => {
        console.error('❌ getLatestPlan hatası:', error);
        return null;
      })
    ]);
    
    console.log('📥 Firestore\'dan yüklenen veriler:', {
      ogrenciler: firestoreOgrenciler?.length || 0,
      ayarlar: firestoreAyarlar ? Object.keys(firestoreAyarlar).length : 0,
      salonlar: firestoreSalonlar?.length || 0,
      latestPlan: latestPlan ? latestPlan.name : 'Yok'
    });
    console.log('🔍 Firestore\'dan yüklenen salonlar:', firestoreSalonlar?.map(s => s.ad || s.salonAdi || 'İsimsiz') || []);
    console.log('🔍 Firestore\'dan yüklenen en son plan:', latestPlan ? latestPlan.name : 'Yok');
    
    // Yerleştirme sonucunu en son plandan çıkar
    let yerlestirmeSonucu = null;
    if (latestPlan && latestPlan.data) {
      // Plan verisini yerleştirme sonucu formatına dönüştür
      yerlestirmeSonucu = latestPlan.data;
      console.log('✅ Yerleştirme sonucu en son plandan yüklendi');
    }
    
    // Firestore'dan TÜM mevcut verileri kullan (birincil veritabanı)
    // Öğrenci, salon, ayar verilerinden hangisi varsa onları kullan
    const hasAnyFirestoreData = 
      (firestoreOgrenciler && firestoreOgrenciler.length > 0) ||
      (firestoreSalonlar && firestoreSalonlar.length > 0) ||
      (firestoreAyarlar && Object.keys(firestoreAyarlar).length > 0);
    
    if (hasAnyFirestoreData) {
      console.log('✅ Firestore\'dan veriler yükleniyor:', {
        ogrenciler: firestoreOgrenciler?.length || 0,
        salonlar: firestoreSalonlar?.length || 0,
        ayarlar: firestoreAyarlar ? Object.keys(firestoreAyarlar).length : 0
      });
      
      return {
        // Firestore'dan hangi veriler varsa onları kullan, yoksa boş array/object
        ogrenciler: firestoreOgrenciler && firestoreOgrenciler.length > 0 ? firestoreOgrenciler : [],
        salonlar: firestoreSalonlar && firestoreSalonlar.length > 0 ? firestoreSalonlar : [],
        ayarlar: firestoreAyarlar && Object.keys(firestoreAyarlar).length > 0 ? firestoreAyarlar : {
          sinavAdi: '',
          sinavTarihi: '',
          sinavSaati: '',
          dersler: []
        },
        yerlestirmeSonucu: yerlestirmeSonucu
      };
    }
    
    // Firestore'da hiç veri yoksa IndexedDB fallback (offline/local persist için)
    console.log('⚠️ Firestore\'da veri yok, IndexedDB fallback kontrol ediliyor...');
    try {
      const { default: indexedDB } = await import('../database/database');
      await indexedDB.open();
      const indexedDBOgrenciler = await indexedDB.getAllStudents().catch(() => []);
      const indexedDBAyarlar = await indexedDB.getSettings().catch(() => null);
      const indexedDBSalonlar = await indexedDB.getAllSalons().catch(() => []);
      
      if (indexedDBOgrenciler && indexedDBOgrenciler.length > 0) {
        console.log('✅ IndexedDB\'den öğrenciler yüklendi (fallback):', indexedDBOgrenciler.length, 'öğrenci');
      return {
          ogrenciler: indexedDBOgrenciler,
          ayarlar: indexedDBAyarlar || {
          sinavAdi: '',
          sinavTarihi: '',
          sinavSaati: '',
          dersler: []
        },
          salonlar: indexedDBSalonlar?.length > 0 ? indexedDBSalonlar : [],
        yerlestirmeSonucu: yerlestirmeSonucu
      };
      }
    } catch (indexedDBError) {
      console.debug('IndexedDB fallback hatası:', indexedDBError);
    }
    
    // IndexedDB'de veri yoksa localStorage'dan yükle
    // console.log('⚠️ IndexedDB\'de öğrenci verisi yok, localStorage\'dan yükleniyor...');
    const localStorageOgrenciler = loadFromStorage('exam_ogrenciler', []);
    const localStorageAyarlar = loadFromStorage('exam_ayarlar', {
      sinavAdi: '',
      sinavTarihi: '',
      sinavSaati: '',
      dersler: []
    });
    const localStorageSalonlar = loadFromStorage('exam_salonlar', []);
    console.log('🔍 localStorage\'dan yüklenen salonlar:', localStorageSalonlar?.map(s => s.ad || s.salonAdi || 'İsimsiz') || []);
    
    // console.log('📋 localStorage verileri:', {
    //   ogrenciler: localStorageOgrenciler.length,
    //   ayarlar: Object.keys(localStorageAyarlar).length,
    //   salonlar: localStorageSalonlar.length
    // });
    
    // Eğer localStorage'da da veri yoksa, test verilerini kullan
    if (localStorageOgrenciler.length === 0 && localStorageSalonlar.length === 0) {
      // console.log('⚠️ localStorage\'da da veri yok, test verileri yükleniyor...');
      return {
        ogrenciler: [],
        ayarlar: {
          sinavAdi: '',
          sinavTarihi: '',
          sinavSaati: '',
          dersler: []
        },
        salonlar: []
      };
    }
    
    // localStorage'dan yerleştirme sonucu yoksa IndexedDB'den kontrol et
    const localStorageYerlestirme = loadFromStorage('exam_yerlestirme', null);
    
    return {
      ogrenciler: localStorageOgrenciler,
      ayarlar: localStorageAyarlar,
      salonlar: localStorageSalonlar,
      yerlestirmeSonucu: localStorageYerlestirme || yerlestirmeSonucu
    };
    
  } catch (error) {
    // console.error('❌ IndexedDB\'den veri yükleme hatası:', error);
    // Fallback: localStorage'dan yükle
    return {
      ogrenciler: loadFromStorage('exam_ogrenciler', []),
      ayarlar: loadFromStorage('exam_ayarlar', {
        sinavAdi: '',
        sinavTarihi: '',
        sinavSaati: '',
        dersler: []
      }),
      salonlar: loadFromStorage('exam_salonlar', []),
      yerlestirmeSonucu: loadFromStorage('exam_yerlestirme', null)
    };
  }
};

// Initial State - IndexedDB'den yükle (async olmadığı için boş başlat)
const initialState = {
  // Öğrenci verileri
  ogrenciler: [],
  seciliOgrenciler: [],
  
  // Sınıf verileri
  siniflar: [],
  seciliSinif: null,
  
  // Salon verileri
  salonlar: [],
  
  // Sınav ayarları
  ayarlar: {
    sinavAdi: '',
    sinavTarihi: '',
    sinavSaati: '',
    dersler: []
  },
  
  // Yerleştirme sonuçları
  yerlestirmeSonucu: null,
  // Hızlı arama için index { [studentId]: { salonId, salonAdi, masaNo } }
  placementIndex: {},
  
  // UI durumu
  aktifTab: 'ayarlar',
  yukleme: true, // Başlangıçta yükleme durumunda
  hata: null
};

// Action Types
export const ACTIONS = {
  // Öğrenci işlemleri
  OGRENCILER_YUKLE: 'OGRENCILER_YUKLE',
  OGRENCILER_EKLE: 'OGRENCILER_EKLE',
  OGRENCI_SEC: 'OGRENCI_SEC',
  OGRENCI_SECIMI_TEMIZLE: 'OGRENCI_SECIMI_TEMIZLE',
  OGRENCI_SIL: 'OGRENCI_SIL',
  OGRENCILER_TEMIZLE: 'OGRENCILER_TEMIZLE',
  // Sabitleme işlemleri
  OGRENCI_PIN: 'OGRENCI_PIN',
  OGRENCI_UNPIN: 'OGRENCI_UNPIN',
  
  // Sınıf işlemleri
  SINIFLAR_YUKLE: 'SINIFLAR_YUKLE',
  SINIF_SEC: 'SINIF_SEC',
  
  // Salon işlemleri
  SALONLAR_GUNCELLE: 'SALONLAR_GUNCELLE',
  SALON_EKLE: 'SALON_EKLE',
  SALON_SIL: 'SALON_SIL',
  
  // Ayarlar işlemleri
  AYARLAR_GUNCELLE: 'AYARLAR_GUNCELLE',
  
  // Yerleştirme işlemleri
  YERLESTIRME_YAP: 'YERLESTIRME_YAP',
  YERLESTIRME_GUNCELLE: 'YERLESTIRME_GUNCELLE',
  YERLESTIRME_TEMIZLE: 'YERLESTIRME_TEMIZLE',
  
  // UI işlemleri
  TAB_DEGISTIR: 'TAB_DEGISTIR',
  YUKLEME_BASLAT: 'YUKLEME_BASLAT',
  YUKLEME_BITIR: 'YUKLEME_BITIR',
  HATA_AYARLA: 'HATA_AYARLA',
  HATA_TEMIZLE: 'HATA_TEMIZLE'
};

// Reducer
const examReducer = (state, action) => {
  let newState;
  
  switch (action.type) {
    // Helper: index builder (scoped for reducer)
    case '__BUILD_INDEX_INTERNAL__': {
      return state;
    }
    case ACTIONS.OGRENCILER_YUKLE:
      newState = {
        ...state,
        ogrenciler: action.payload,
        yukleme: false
      };
      // SADECE VERİ VARSA IndexedDB'ye kaydet
      if (action.payload && action.payload.length > 0) {
        // Anında localStorage'a yaz (sayfa yenileme için senkron yedek)
        try { localStorage.setItem('exam_ogrenciler', JSON.stringify(newState.ogrenciler)); } catch (e) { logger.debug('localStorage immediate write failed (exam_ogrenciler):', e); }
        saveToStorage('exam_ogrenciler', newState.ogrenciler);
      }
      return newState;
      
    case ACTIONS.OGRENCILER_EKLE:
      // Öğrencileri sınıf ve numaraya göre sıralama fonksiyonu
      const sortOgrencilerBySinifVeNumara = (a, b) => {
        // Sınıf karşılaştırması: önce sınıf numarası, sonra şube harfi
        const parseSinif = (sinif) => {
          if (!sinif) return { numara: 0, sube: '' };
          const match = sinif.toString().match(/^(\d+)[-/]?([A-Za-z]+)?/);
          if (match) {
            return {
              numara: parseInt(match[1]) || 0,
              sube: (match[2] || '').toUpperCase()
            };
          }
          return { numara: 0, sube: sinif.toString().toUpperCase() };
        };
        
        const sinifA = parseSinif(a.sinif);
        const sinifB = parseSinif(b.sinif);
        
        // Önce sınıf numarasına göre
        if (sinifA.numara !== sinifB.numara) {
          return sinifA.numara - sinifB.numara;
        }
        
        // Sonra şube harfine göre
        if (sinifA.sube !== sinifB.sube) {
          return sinifA.sube.localeCompare(sinifB.sube, 'tr-TR');
        }
        
        // Aynı sınıfta ise numaraya göre
        const numaraA = parseInt(a.numara) || 0;
        const numaraB = parseInt(b.numara) || 0;
        return numaraA - numaraB;
      };
      
      // Mevcut öğrencilerle yeni öğrencileri birleştir ve sırala
      const tumOgrenciler = [...state.ogrenciler, ...action.payload];
      const siraliOgrenciler = tumOgrenciler.sort(sortOgrencilerBySinifVeNumara);
      
      newState = {
        ...state,
        ogrenciler: siraliOgrenciler,
        yukleme: false
      };
      // Anında localStorage'a yaz
      try { localStorage.setItem('exam_ogrenciler', JSON.stringify(newState.ogrenciler)); } catch (e) { logger.debug('localStorage immediate write failed (exam_ogrenciler):', e); }
      saveToStorage('exam_ogrenciler', newState.ogrenciler);
      return newState;
      
    case ACTIONS.OGRENCI_SEC:
      const ogrenci = action.payload;
      const mevcutSecili = state.seciliOgrenciler.find(o => o.id === ogrenci.id);
      
      return {
        ...state,
        seciliOgrenciler: mevcutSecili
          ? state.seciliOgrenciler.filter(o => o.id !== ogrenci.id)
          : [...state.seciliOgrenciler, ogrenci]
      };
      
    case ACTIONS.OGRENCI_SECIMI_TEMIZLE:
      return {
        ...state,
        seciliOgrenciler: []
      };
      
    case ACTIONS.OGRENCI_SIL:
      newState = {
        ...state,
        ogrenciler: state.ogrenciler.filter(o => o.id !== action.payload)
      };
      try { localStorage.setItem('exam_ogrenciler', JSON.stringify(newState.ogrenciler)); } catch (e) { logger.debug('localStorage immediate write failed (exam_ogrenciler):', e); }
      saveToStorage('exam_ogrenciler', newState.ogrenciler);
      return newState;
      
    case ACTIONS.OGRENCILER_TEMIZLE:
      newState = {
        ...state,
        ogrenciler: []
      };
      try { localStorage.setItem('exam_ogrenciler', JSON.stringify(newState.ogrenciler)); } catch (e) { logger.debug('localStorage immediate write failed (exam_ogrenciler):', e); }
      saveToStorage('exam_ogrenciler', newState.ogrenciler);
      return newState;
    
    case ACTIONS.OGRENCI_PIN: {
      const { ogrenciId, pinnedSalonId, pinnedMasaId } = action.payload || {};
      newState = {
        ...state,
        ogrenciler: state.ogrenciler.map(o => o.id === ogrenciId ? {
          ...o,
          pinned: true,
          pinnedSalonId,
          pinnedMasaId: pinnedMasaId ?? null
        } : o)
      };
      try { localStorage.setItem('exam_ogrenciler', JSON.stringify(newState.ogrenciler)); } catch (e) { logger.debug('localStorage immediate write failed (exam_ogrenciler):', e); }
      saveToStorage('exam_ogrenciler', newState.ogrenciler);
      return newState;
    }
    case ACTIONS.OGRENCI_UNPIN: {
      const ogrenciId = action.payload;
      newState = {
        ...state,
        ogrenciler: state.ogrenciler.map(o => o.id === ogrenciId ? {
          ...o,
          pinned: false,
          pinnedSalonId: null,
          pinnedMasaId: null
        } : o)
      };
      try { localStorage.setItem('exam_ogrenciler', JSON.stringify(newState.ogrenciler)); } catch (e) { logger.debug('localStorage immediate write failed (exam_ogrenciler):', e); }
      saveToStorage('exam_ogrenciler', newState.ogrenciler);
      return newState;
    }
      
    case ACTIONS.SINIFLAR_YUKLE:
      return {
        ...state,
        siniflar: action.payload,
        yukleme: false
      };
      
    case ACTIONS.SINIF_SEC:
      return {
        ...state,
        seciliSinif: action.payload
      };
      
    case ACTIONS.SALONLAR_GUNCELLE:
      newState = {
        ...state,
        salonlar: action.payload
      };
      // SADECE VERİ VARSA IndexedDB'ye kaydet
      if (action.payload && action.payload.length > 0) {
        // Anında localStorage'a yaz
        try { localStorage.setItem('exam_salonlar', JSON.stringify(newState.salonlar)); } catch (e) { logger.debug('localStorage immediate write failed (exam_salonlar):', e); }
        saveToStorage('exam_salonlar', newState.salonlar);
      }
      return newState;
      
    case ACTIONS.SALON_EKLE:
      newState = {
        ...state,
        salonlar: [...state.salonlar, action.payload]
      };
      try { localStorage.setItem('exam_salonlar', JSON.stringify(newState.salonlar)); } catch (e) { logger.debug('localStorage immediate write failed (exam_salonlar):', e); }
      saveToStorage('exam_salonlar', newState.salonlar);
      return newState;
      
    case ACTIONS.SALON_SIL:
      newState = {
        ...state,
        salonlar: state.salonlar.filter(salon => salon.id !== action.payload)
      };
      try { localStorage.setItem('exam_salonlar', JSON.stringify(newState.salonlar)); } catch (e) { logger.debug('localStorage immediate write failed (exam_salonlar):', e); }
      saveToStorage('exam_salonlar', newState.salonlar);
      return newState;
      
    case ACTIONS.AYARLAR_GUNCELLE:
      newState = {
        ...state,
        ayarlar: { ...state.ayarlar, ...action.payload }
      };
      
      // SADECE VERİ VARSA IndexedDB'ye kaydet
      if (action.payload && Object.keys(action.payload).length > 0) {
        saveToStorage('exam_ayarlar', newState.ayarlar);
      }
      return newState;
      
    case ACTIONS.YERLESTIRME_YAP:
      newState = {
        ...state,
        yerlestirmeSonucu: action.payload,
        placementIndex: (() => {
          const index = {};
          try {
            const tumSalonlar = action.payload?.tumSalonlar;
            if (Array.isArray(tumSalonlar)) {
              tumSalonlar.forEach(salon => {
                const salonAdi = salon.salonAdi || salon.ad || String(salon.id || salon.salonId || '');
                const masalar = Array.isArray(salon.masalar) ? salon.masalar : [];
                masalar.forEach(m => {
                  if (m?.ogrenci?.id) {
                    const masaNo = m.masaNumarasi != null ? m.masaNumarasi : (typeof m.id === 'number' ? m.id + 1 : null);
                    index[m.ogrenci.id] = { salonId: salon.id || salon.salonId, salonAdi, masaNo };
                  }
                });
              });
            }
          } catch (e) {
            logger.debug('build index (YERLESTIRME_YAP) error:', e);
          }
          return index;
        })(),
        yukleme: false
      };
      saveToStorage('exam_yerlestirme', newState.yerlestirmeSonucu, true); // immediate = true
      try { localStorage.setItem('exam_placement_index', JSON.stringify(newState.placementIndex)); } catch (e) { logger.debug('localStorage mirror failed (exam_placement_index):', e); }
      return newState;
      
    case ACTIONS.YERLESTIRME_GUNCELLE:
      newState = {
        ...state,
        yerlestirmeSonucu: { 
          ...state.yerlestirmeSonucu, 
          ...action.payload,
          // Salon objesini deep copy et
          salon: action.payload.salon ? {
            ...action.payload.salon,
            masalar: action.payload.salon.masalar ? [...action.payload.salon.masalar] : []
          } : state.yerlestirmeSonucu?.salon
        },
        placementIndex: (() => {
          const index = {};
          try {
            const tumSalonlar = (action.payload?.tumSalonlar) || state.yerlestirmeSonucu?.tumSalonlar;
            if (Array.isArray(tumSalonlar)) {
              tumSalonlar.forEach(salon => {
                const salonAdi = salon.salonAdi || salon.ad || String(salon.id || salon.salonId || '');
                const masalar = Array.isArray(salon.masalar) ? salon.masalar : [];
                masalar.forEach(m => {
                  if (m?.ogrenci?.id) {
                    const masaNo = m.masaNumarasi != null ? m.masaNumarasi : (typeof m.id === 'number' ? m.id + 1 : null);
                    index[m.ogrenci.id] = { salonId: salon.id || salon.salonId, salonAdi, masaNo };
                  }
                });
              });
            }
          } catch (e) {
            logger.debug('build index (YERLESTIRME_GUNCELLE) error:', e);
          }
          return index;
        })()
      };
      
      // CRITICAL: Hem localStorage hem IndexedDB'ye kaydet (yerleştirme sonucu acil kaydedilmeli)
      saveToStorage('exam_yerlestirme', newState.yerlestirmeSonucu, true); // immediate = true
      try { localStorage.setItem('exam_placement_index', JSON.stringify(newState.placementIndex)); } catch (e) { logger.debug('localStorage mirror failed (exam_placement_index):', e); }
      
      logger.debug('🔄 Context: State güncellendi, salon:', !!newState.yerlestirmeSonucu?.salon);
      logger.debug('🔄 Context: Masalar sayısı:', newState.yerlestirmeSonucu?.salon?.masalar?.length);
      logger.debug('✅ Context: Yerleştirme sonucu localStorage\'a kaydedildi');
      return newState;
      
    case ACTIONS.YERLESTIRME_TEMIZLE:
      newState = {
        ...state,
        yerlestirmeSonucu: null,
        placementIndex: {}
      };
      saveToStorage('exam_yerlestirme', newState.yerlestirmeSonucu, true); // immediate = true (temizleme acil)
      try { localStorage.removeItem('exam_placement_index'); } catch (e) { logger.debug('localStorage remove failed (exam_placement_index):', e); }
      return newState;
      
    case ACTIONS.TAB_DEGISTIR:
      newState = {
        ...state,
        aktifTab: action.payload
      };
      saveToStorage('exam_aktif_tab', newState.aktifTab);
      return newState;
      
    case ACTIONS.YUKLEME_BASLAT:
      return {
        ...state,
        yukleme: true,
        hata: null
      };
      
    case ACTIONS.YUKLEME_BITIR:
      return {
        ...state,
        yukleme: false
      };
      
    case ACTIONS.HATA_AYARLA:
      return {
        ...state,
        hata: action.payload,
        yukleme: false
      };
      
    case ACTIONS.HATA_TEMIZLE:
      return {
        ...state,
        hata: null
      };
      
    default:
      return state;
  }
};

// Context
const ExamContext = createContext();

// Provider Component
export const ExamProvider = ({ children }) => {
  const [state, dispatch] = useReducer(examReducer, initialState);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // IndexedDB'den veri yükleme (sadece bir kez)
  useEffect(() => {
    console.log('🚀 ExamProvider useEffect başladı!');
    
    let timeoutId;
    
    const initializeData = async () => {
      // Timeout - maksimum 10 saniye sonra yükleme durumunu sonlandır
      timeoutId = setTimeout(() => {
        console.warn('⚠️ Veri yükleme timeout (10 saniye), yükleme durumu zorla sonlandırılıyor');
        dispatch({ type: ACTIONS.YUKLEME_BITIR });
        setIsInitialized(true);
      }, 10000);
      
      // TEMİZLEME İŞLEMİ KALDIRILDI - Kullanıcı salonları korunuyor
      console.log('✅ Salon temizleme işlemi kaldırıldı, tüm salonlar korunuyor');
      try {
        // Firestore birincil veritabanı olarak aktif olmalı
        // NOT: setDatabaseType(false) KALDIRILDI - Firestore aktif kalmalı
        // console.log('🔄 ExamProvider: Veriler Firestore\'dan yükleniyor...');
        const data = await loadFromFirestore();
        
        // console.log('📊 Yüklenen veriler:', {
        //   ogrenciler: data.ogrenciler?.length || 0,
        //   ayarlar: data.ayarlar ? Object.keys(data.ayarlar).length : 0,
        //   salonlar: data.salonlar?.length || 0
        // });
        
        // Verileri state'e yükle - SADECE VERİ VARSA
        console.log('🔍 Veri kontrolü:', {
          ogrenciler: data.ogrenciler?.length || 0,
          ayarlar: data.ayarlar ? Object.keys(data.ayarlar).length : 0,
          salonlar: data.salonlar?.length || 0
        });
        console.log('🔍 Salon verileri detayı:', data.salonlar);
        console.log('🔍 Salon isimleri:', data.salonlar?.map(s => s.ad || s.salonAdi || 'İsimsiz') || []);
        
        if (data.ogrenciler && data.ogrenciler.length > 0) {
          console.log('✅ Öğrenciler yükleniyor:', data.ogrenciler.length);
          dispatch({ type: ACTIONS.OGRENCILER_YUKLE, payload: data.ogrenciler });
        } else {
          console.log('⚠️ Öğrenci verisi yok, yükleme atlanıyor');
        }
        if (data.ayarlar && Object.keys(data.ayarlar).length > 0) {
          console.log('✅ Ayarlar yükleniyor:', Object.keys(data.ayarlar).length);
          dispatch({ type: ACTIONS.AYARLAR_GUNCELLE, payload: data.ayarlar });
        } else {
          console.log('⚠️ Ayar verisi yok, yükleme atlanıyor');
        }
        if (data.salonlar && data.salonlar.length > 0) {
          console.log('✅ Salonlar yükleniyor:', data.salonlar.length);
          dispatch({ type: ACTIONS.SALONLAR_GUNCELLE, payload: data.salonlar });
        } else {
          console.log('⚠️ Salon verisi yok, yükleme atlanıyor - TEST SALONLARI YÜKLENMEYECEK');
        }
        
        // console.log('✅ State\'e veriler yüklendi');
        
        // Yerleştirme sonucunu yükle - önce IndexedDB'den, yoksa localStorage'dan
        try {
          // IndexedDB'den yüklendi mi kontrol et
          if (data.yerlestirmeSonucu) {
            dispatch({ type: ACTIONS.YERLESTIRME_YAP, payload: data.yerlestirmeSonucu });
            console.log('✅ Yerleştirme sonucu IndexedDB\'den yüklendi');
          } else {
            // Fallback: localStorage'dan yükle
            const yerlestirmeSonucu = loadFromStorage('exam_yerlestirme', null);
            if (yerlestirmeSonucu) {
              dispatch({ type: ACTIONS.YERLESTIRME_YAP, payload: yerlestirmeSonucu });
              console.log('✅ Yerleştirme sonucu localStorage\'dan yüklendi');
            } else {
              console.log('ℹ️ Yerleştirme sonucu bulunamadı');
            }
          }
        } catch (error) {
          console.error('❌ Yerleştirme sonucu yükleme hatası:', error);
        }
        
        // Aktif tab'ı localStorage'dan yükle
        const aktifTab = loadFromStorage('exam_aktif_tab', 'ayarlar');
        dispatch({ type: ACTIONS.TAB_DEGISTIR, payload: aktifTab });
        
        // Yükleme durumunu bitir
        dispatch({ type: ACTIONS.YUKLEME_BITIR });
        
        // Timeout'u temizle
        clearTimeout(timeoutId);
        
        setIsInitialized(true);
        console.log('✅ ExamProvider: Tüm veriler yüklendi ve yükleme durumu sonlandı!');
        
      } catch (error) {
        console.error('❌ ExamProvider: Veri yükleme hatası:', error);
        console.error('❌ Hata detayları:', error.message, error.stack);
        
        // Timeout'u temizle
        clearTimeout(timeoutId);
        
        // Yükleme durumunu bitir (hata olsa bile)
        dispatch({ type: ACTIONS.YUKLEME_BITIR });
        setIsInitialized(true); // Hata olsa bile devam et
      }
    };
    
    initializeData();
    
    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Sadece component mount olduğunda çalış

  // Firestore'a otomatik kaydetme - DEBOUNCED (Firestore quota koruması için)
  // Ref'ler component içinde tanımlanmalı
  const saveStudentsTimerRef = React.useRef(null);
  const saveSettingsTimerRef = React.useRef(null);
  const saveSalonsTimerRef = React.useRef(null);
  const isQuotaExceededRef = React.useRef(false); // Firestore quota hatası durumunda kayıt yapma
  
  // Öğrenciler için debounced save
  useEffect(() => {
    if (!isInitialized) return; // İlk yükleme tamamlanana kadar bekle
    // Boş veri ise kaydetme (sayfa yenileme sırasında verileri silme!)
    if (!state.ogrenciler || state.ogrenciler.length === 0) {
      return;
    }
    // Quota hatası varsa kaydetmeyi atla
    if (isQuotaExceededRef.current) {
      logger.warn('⚠️ Firestore quota aşıldı, kayıt yapılmıyor (IndexedDB kullanılıyor)');
      return;
    }
    
    // Önceki timer'ı temizle
    if (saveStudentsTimerRef.current) {
      clearTimeout(saveStudentsTimerRef.current);
    }
    
    // Debounced save - 3 saniye bekle
    saveStudentsTimerRef.current = setTimeout(async () => {
      try {
        const { default: db } = await import('../database');
        await db.saveStudents(state.ogrenciler);
        logger.debug('✅ Öğrenciler Firestore\'a kaydedildi (debounced)');
        isQuotaExceededRef.current = false; // Başarılıysa flag'i sıfırla
      } catch (error) {
        // Firestore quota hatası kontrolü
        if (error.code === 'resource-exhausted' || error.message?.includes('Quota exceeded')) {
          logger.error('❌ Firestore quota aşıldı, gelecekteki kayıtlar atlanacak');
          isQuotaExceededRef.current = true;
          // IndexedDB'ye kaydet (Firestore olmadan)
          try {
            const { default: db } = await import('../database');
            await db.saveStudents(state.ogrenciler);
            logger.info('✅ Öğrenciler IndexedDB\'ye kaydedildi (Firestore quota aşıldı)');
          } catch (indexedDBError) {
            logger.error('❌ IndexedDB\'ye de kaydedilemedi:', indexedDBError);
          }
        } else {
          logger.error('❌ Öğrenciler kaydedilemedi:', error);
        }
      }
    }, 3000); // 3 saniye debounce
    
    return () => {
      if (saveStudentsTimerRef.current) {
        clearTimeout(saveStudentsTimerRef.current);
      }
    };
  }, [state.ogrenciler, isInitialized]);

  // Ayarlar için debounced save
  useEffect(() => {
    if (!isInitialized) return; // İlk yükleme tamamlanana kadar bekle
    // Quota hatası varsa kaydetmeyi atla
    if (isQuotaExceededRef.current) {
      return;
    }
    
    // Önceki timer'ı temizle
    if (saveSettingsTimerRef.current) {
      clearTimeout(saveSettingsTimerRef.current);
    }
    
    // Debounced save - 3 saniye bekle
    saveSettingsTimerRef.current = setTimeout(async () => {
      try {
        const { default: db } = await import('../database');
        await db.saveSettings(state.ayarlar);
        logger.debug('✅ Ayarlar Firestore\'a kaydedildi (debounced)');
        isQuotaExceededRef.current = false; // Başarılıysa flag'i sıfırla
      } catch (error) {
        // Firestore quota hatası kontrolü
        if (error.code === 'resource-exhausted' || error.message?.includes('Quota exceeded')) {
          logger.error('❌ Firestore quota aşıldı, gelecekteki kayıtlar atlanacak');
          isQuotaExceededRef.current = true;
          // IndexedDB'ye kaydet (Firestore olmadan)
          try {
            const { default: db } = await import('../database');
            await db.saveSettings(state.ayarlar);
            logger.info('✅ Ayarlar IndexedDB\'ye kaydedildi (Firestore quota aşıldı)');
          } catch (indexedDBError) {
            logger.error('❌ IndexedDB\'ye de kaydedilemedi:', indexedDBError);
          }
        } else {
          logger.error('❌ Ayarlar kaydedilemedi:', error);
        }
      }
    }, 3000); // 3 saniye debounce
    
    return () => {
      if (saveSettingsTimerRef.current) {
        clearTimeout(saveSettingsTimerRef.current);
      }
    };
  }, [state.ayarlar, isInitialized]);

  // Salonlar için debounced save
  useEffect(() => {
    if (!isInitialized) return; // İlk yükleme tamamlanana kadar bekle
    // Boş veri ise kaydetme (sayfa yenileme sırasında verileri silme!)
    if (!state.salonlar || state.salonlar.length === 0) {
      return;
    }
    // Quota hatası varsa kaydetmeyi atla
    if (isQuotaExceededRef.current) {
      return;
    }
    
    // Önceki timer'ı temizle
    if (saveSalonsTimerRef.current) {
      clearTimeout(saveSalonsTimerRef.current);
    }
    
    // Debounced save - 3 saniye bekle
    saveSalonsTimerRef.current = setTimeout(async () => {
      try {
        const { default: db } = await import('../database');
        await db.saveSalons(state.salonlar);
        logger.debug('✅ Salonlar Firestore\'a kaydedildi (debounced)');
        isQuotaExceededRef.current = false; // Başarılıysa flag'i sıfırla
      } catch (error) {
        // Firestore quota hatası kontrolü
        if (error.code === 'resource-exhausted' || error.message?.includes('Quota exceeded')) {
          logger.error('❌ Firestore quota aşıldı, gelecekteki kayıtlar atlanacak');
          isQuotaExceededRef.current = true;
          // IndexedDB'ye kaydet (Firestore olmadan)
          try {
            const { default: db } = await import('../database');
            await db.saveSalons(state.salonlar);
            logger.info('✅ Salonlar IndexedDB\'ye kaydedildi (Firestore quota aşıldı)');
          } catch (indexedDBError) {
            logger.error('❌ IndexedDB\'ye de kaydedilemedi:', indexedDBError);
          }
        } else {
          logger.error('❌ Salonlar kaydedilemedi:', error);
        }
      }
    }, 3000); // 3 saniye debounce
    
    return () => {
      if (saveSalonsTimerRef.current) {
        clearTimeout(saveSalonsTimerRef.current);
      }
    };
  }, [state.salonlar, isInitialized]);

  // Action Creators
  const actions = {
    ogrencilerYukle: (ogrenciler) => {
      dispatch({ type: ACTIONS.OGRENCILER_YUKLE, payload: ogrenciler });
    },
    
    ogrencilerEkle: (yeniOgrenciler) => {
      dispatch({ type: ACTIONS.OGRENCILER_EKLE, payload: yeniOgrenciler });
    },
    
    ogrenciSec: (ogrenci) => {
      dispatch({ type: ACTIONS.OGRENCI_SEC, payload: ogrenci });
    },
    
    ogrenciSecimiTemizle: () => {
      dispatch({ type: ACTIONS.OGRENCI_SECIMI_TEMIZLE });
    },
    
    ogrenciSil: (ogrenciId) => {
      dispatch({ type: ACTIONS.OGRENCI_SIL, payload: ogrenciId });
    },
    
    ogrencileriTemizle: () => {
      dispatch({ type: ACTIONS.OGRENCILER_TEMIZLE });
    },
    
    siniflarYukle: (siniflar) => {
      dispatch({ type: ACTIONS.SINIFLAR_YUKLE, payload: siniflar });
    },
    
    sinifSec: (sinif) => {
      dispatch({ type: ACTIONS.SINIF_SEC, payload: sinif });
    },
    
    salonlarGuncelle: (salonlar) => {
      dispatch({ type: ACTIONS.SALONLAR_GUNCELLE, payload: salonlar });
    },
    
    salonEkle: (salon) => {
      dispatch({ type: ACTIONS.SALON_EKLE, payload: salon });
    },
    
    salonSil: (salonId) => {
      dispatch({ type: ACTIONS.SALON_SIL, payload: salonId });
    },
    
    ayarlarGuncelle: (ayarlar) => {
      dispatch({ type: ACTIONS.AYARLAR_GUNCELLE, payload: ayarlar });
    },
    
    yerlestirmeYap: (sonuc) => {
      dispatch({ type: ACTIONS.YERLESTIRME_YAP, payload: sonuc });
    },
    
    yerlestirmeGuncelle: (guncelleme) => {
      dispatch({ type: ACTIONS.YERLESTIRME_GUNCELLE, payload: guncelleme });
    },
    
    yerlestirmeTemizle: () => {
      dispatch({ type: ACTIONS.YERLESTIRME_TEMIZLE });
    },
    
    tabDegistir: (tab) => {
      dispatch({ type: ACTIONS.TAB_DEGISTIR, payload: tab });
    },
    
    yuklemeBaslat: () => {
      dispatch({ type: ACTIONS.YUKLEME_BASLAT });
    },
    
    yuklemeBitir: () => {
      dispatch({ type: ACTIONS.YUKLEME_BITIR });
    },
    
    hataAyarla: (hata) => {
      dispatch({ type: ACTIONS.HATA_AYARLA, payload: hata });
    },
    
    hataTemizle: () => {
      dispatch({ type: ACTIONS.HATA_TEMIZLE });
    },
    ogrenciPin: (ogrenciId, pinnedSalonId, pinnedMasaId = null) => {
      // ID tiplerini normalize et (string)
      const normalizedSalonId = pinnedSalonId != null ? String(pinnedSalonId) : null;
      const normalizedMasaId = pinnedMasaId != null ? String(pinnedMasaId) : null;
      dispatch({ type: ACTIONS.OGRENCI_PIN, payload: { ogrenciId, pinnedSalonId: normalizedSalonId, pinnedMasaId: normalizedMasaId } });
    },
    ogrenciUnpin: (ogrenciId) => {
      dispatch({ type: ACTIONS.OGRENCI_UNPIN, payload: ogrenciId });
    }
  };

  const value = {
    ...state,
    ...actions,
    isInitialized
  };

  return (
    <ExamContext.Provider value={value}>
      {children}
    </ExamContext.Provider>
  );
};

// Custom Hook
export const useExam = () => {
  const context = useContext(ExamContext);
  if (!context) {
    throw new Error('useExam hook must be used within ExamProvider');
  }
  return context;
};

export default ExamContext;

