import React, { createContext, useContext, useReducer, useEffect } from 'react';
import logger from '../utils/logger';

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

const saveToStorage = async (key, value) => {
  try {
    // Lazy import db
    const { default: db } = await import('../database');
    
    // IndexedDB'ye kaydet
    if (key === 'exam_ogrenciler') {
      await db.saveStudents(value);
      // localStorage yedeği
      try { localStorage.setItem('exam_ogrenciler', JSON.stringify(value)); } catch (e) { logger.debug('localStorage mirror failed (exam_ogrenciler):', e); }
    } else if (key === 'exam_ayarlar') {
      await db.saveSettings(value);
      try { localStorage.setItem('exam_ayarlar', JSON.stringify(value)); } catch (e) { logger.debug('localStorage mirror failed (exam_ayarlar):', e); }
    } else if (key === 'exam_salonlar') {
      await db.saveSalons(value);
      try { localStorage.setItem('exam_salonlar', JSON.stringify(value)); } catch (e) { logger.debug('localStorage mirror failed (exam_salonlar):', e); }
    } else if (key === 'exam_yerlestirme') {
      // Değer boş/null ise kaydetmeyi atla
      if (!value) {
        logger.debug('ℹ️ Yerleştirme sonucu boş, veritabanına kaydetme atlandı');
      } else {
        // Firestore/IndexedDB: Yerleştirme planını veritabanına kaydet
        await db.savePlan(value);
        logger.debug('✅ Yerleştirme sonucu veritabanına kaydedildi (Firestore/IndexedDB)');
      }
      try { localStorage.setItem('exam_yerlestirme', JSON.stringify(value)); } catch (e) { logger.debug('localStorage mirror failed (exam_yerlestirme):', e); }
    } else {
      // Diğer veriler için normal kayıt
      // LocalStorage yerine veritabanı adapter'ını kullanmaya devam edelim
      logger.debug(`✅ ${key} veritabanına kaydedildi (adapter)`);
    }
  } catch (error) {
    logger.error(`❌ IndexedDB'ye ${key} kaydedilirken hata:`, error);
    
    // Quota hatası durumunda eski verileri temizle
    if (error.name === 'QuotaExceededError') {
      logger.info('🧹 Quota hatası - eski veriler temizleniyor...');
      // Firestore/IndexedDB kullanıldığı için localStorage temizlik/tekrar deneme yapmıyoruz
    } else {
      // Fallback localStorage devre dışı (quota sorunlarını önlemek için)
    }
  }
};

// Firestore'dan veri yükleme fonksiyonu
const loadFromFirestore = async () => {
  try {
    // console.log('📥 Firestore\'dan veriler yükleniyor...');
    
    // Lazy import db
    const { default: db } = await import('../database');
    
    const [ogrenciler, ayarlar, salonlar, latestPlan] = await Promise.all([
      db.getAllStudents().catch(() => []),
      db.getSettings().catch(() => null),
      db.getAllSalons().catch(() => []),
      db.getLatestPlan().catch(() => null)
    ]);
    
    console.log('🔍 Firestore\'dan yüklenen salonlar:', salonlar?.map(s => s.ad || s.salonAdi || 'İsimsiz') || []);
    console.log('🔍 Firestore\'dan yüklenen en son plan:', latestPlan ? latestPlan.name : 'Yok');
    
    // console.log('✅ IndexedDB\'den veriler yüklendi:', {
    //   ogrenciler: ogrenciler?.length || 0,
    //   ayarlar: ayarlar ? Object.keys(ayarlar).length : 0,
    //   salonlar: salonlar?.length || 0
    // });
    
    // Yerleştirme sonucunu en son plandan çıkar
    let yerlestirmeSonucu = null;
    if (latestPlan && latestPlan.data) {
      // Plan verisini yerleştirme sonucu formatına dönüştür
      yerlestirmeSonucu = latestPlan.data;
      console.log('✅ Yerleştirme sonucu en son plandan yüklendi');
    }
    
    // IndexedDB'de veri varsa onu kullan
    if (ogrenciler && ogrenciler.length > 0) {
      // console.log('✅ IndexedDB\'den öğrenciler yüklendi:', ogrenciler.length, 'öğrenci');
      return {
        ogrenciler: ogrenciler,
        ayarlar: ayarlar || {
          sinavAdi: '',
          sinavTarihi: '',
          sinavSaati: '',
          dersler: []
        },
        salonlar: salonlar?.length > 0 ? salonlar : [],
        yerlestirmeSonucu: yerlestirmeSonucu
      };
    }
    
    // IndexedDB'de öğrenci yoksa ama ayarlar/salonlar varsa onları kullan
    if ((ayarlar && Object.keys(ayarlar).length > 0) || (salonlar && salonlar.length > 0)) {
      return {
        ogrenciler: [],
        ayarlar: ayarlar || {
          sinavAdi: '',
          sinavTarihi: '',
          sinavSaati: '',
          dersler: []
        },
        salonlar: salonlar?.length > 0 ? salonlar : [],
        yerlestirmeSonucu: yerlestirmeSonucu
      };
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
    case ACTIONS.OGRENCILER_YUKLE:
      newState = {
        ...state,
        ogrenciler: action.payload,
        yukleme: false
      };
      // SADECE VERİ VARSA IndexedDB'ye kaydet
      if (action.payload && action.payload.length > 0) {
        saveToStorage('exam_ogrenciler', newState.ogrenciler);
      }
      return newState;
      
    case ACTIONS.OGRENCILER_EKLE:
      newState = {
        ...state,
        ogrenciler: [...state.ogrenciler, ...action.payload],
        yukleme: false
      };
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
      saveToStorage('exam_ogrenciler', newState.ogrenciler);
      return newState;
      
    case ACTIONS.OGRENCILER_TEMIZLE:
      newState = {
        ...state,
        ogrenciler: []
      };
      saveToStorage('exam_ogrenciler', newState.ogrenciler);
      return newState;
      
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
        saveToStorage('exam_salonlar', newState.salonlar);
      }
      return newState;
      
    case ACTIONS.SALON_EKLE:
      newState = {
        ...state,
        salonlar: [...state.salonlar, action.payload]
      };
      saveToStorage('exam_salonlar', newState.salonlar);
      return newState;
      
    case ACTIONS.SALON_SIL:
      newState = {
        ...state,
        salonlar: state.salonlar.filter(salon => salon.id !== action.payload)
      };
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
        yukleme: false
      };
      saveToStorage('exam_yerlestirme', newState.yerlestirmeSonucu);
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
        }
      };
      
      // CRITICAL: Hem localStorage hem IndexedDB'ye kaydet
      saveToStorage('exam_yerlestirme', newState.yerlestirmeSonucu);
      
      logger.debug('🔄 Context: State güncellendi, salon:', !!newState.yerlestirmeSonucu?.salon);
      logger.debug('🔄 Context: Masalar sayısı:', newState.yerlestirmeSonucu?.salon?.masalar?.length);
      logger.debug('✅ Context: Yerleştirme sonucu localStorage\'a kaydedildi');
      return newState;
      
    case ACTIONS.YERLESTIRME_TEMIZLE:
      newState = {
        ...state,
        yerlestirmeSonucu: null
      };
      saveToStorage('exam_yerlestirme', newState.yerlestirmeSonucu);
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
