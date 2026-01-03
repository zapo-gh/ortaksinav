import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Local Storage'dan veri yükleme fonksiyonları
const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (error) {
    console.warn(`LocalStorage'dan ${key} yüklenirken hata:`, error);
    return defaultValue;
  }
};

// Initial State - Local Storage'dan yükle
const initialState = {
  // Öğrenci verileri
  ogrenciler: loadFromStorage('ogrenciListesi', []),
  seciliOgrenciler: [],
  
  // Salon bilgileri
  salon: loadFromStorage('salonAyarlari', {
    id: 'A-101',
    kapasite: 30,
    siraDizilimi: { satir: 6, sutun: 5 },
    ad: 'Matematik Sınıfı'
  }),
  
  // Yerleştirme planı
  yerlesimPlani: [],
  kalanOgrenciler: [],
  
  // Kitapçık ayarları
  kitapcikSayisi: 2,
  kitapcikTurleri: ['A', 'B'],
  
  // Sınav ayarları
  ayarlar: loadFromStorage('sinavAyarlari', {
    sinavAdi: '',
    sinavTarihi: '',
    sinavSaati: '',
    sinavSuresi: 90,
    gozetmenSayisi: 2,
    kopyaOnleme: false,
    dikkatliYerlestirme: false,
    algoritmaTuru: 'kelebek',
    minimumMesafe: 1,
    farkliSubelerKaristir: false,
    ozelDurumOncelik: true
  }),
  
  // UI durumu
  aktifTab: 'ayarlar',
  yukleme: false,
  hata: null,
  istatistikler: null
};

// Action Types
export const ACTIONS = {
  // Öğrenci işlemleri
  OGRENCILER_YUKLE: 'OGRENCILER_YUKLE',
  OGRENCILER_EKLE: 'OGRENCILER_EKLE',
  OGRENCI_SEC: 'OGRENCI_SEC',
  OGRENCI_SECIMI_TEMIZLE: 'OGRENCI_SECIMI_TEMIZLE',
  
  // Salon işlemleri
  SALON_GUNCELLE: 'SALON_GUNCELLE',
  
  // Yerleştirme işlemleri
  YERLESIM_PLANI_GUNCELLE: 'YERLESIM_PLANI_GUNCELLE',
  YERLESIM_TEMIZLE: 'YERLESIM_TEMIZLE',
  
  // Kitapçık işlemleri
  KITAPCIK_SAYISI_GUNCELLE: 'KITAPCIK_SAYISI_GUNCELLE',
  
  // Ayarlar işlemleri
  AYARLAR_GUNCELLE: 'AYARLAR_GUNCELLE',
  
  // UI işlemleri
  TAB_DEGISTIR: 'TAB_DEGISTIR',
  YUKLEME_BASLAT: 'YUKLEME_BASLAT',
  YUKLEME_BITIR: 'YUKLEME_BITIR',
  HATA_AYARLA: 'HATA_AYARLA',
  HATA_TEMIZLE: 'HATA_TEMIZLE',
  
  // İstatistik işlemleri
  ISTATISTIKLER_GUNCELLE: 'ISTATISTIKLER_GUNCELLE'
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.OGRENCILER_YUKLE:
      return {
        ...state,
        ogrenciler: action.payload,
        yukleme: false
      };
      
    case ACTIONS.OGRENCILER_EKLE:
      return {
        ...state,
        ogrenciler: [...state.ogrenciler, ...action.payload],
        yukleme: false
      };
      
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
      
    case ACTIONS.SALON_GUNCELLE:
      return {
        ...state,
        salon: { ...state.salon, ...action.payload }
      };
      
    case ACTIONS.YERLESIM_PLANI_GUNCELLE:
      return {
        ...state,
        yerlesimPlani: action.payload.plan,
        kalanOgrenciler: action.payload.kalanOgrenciler || [],
        istatistikler: action.payload.istatistikler || null,
        yukleme: false
      };
      
    case ACTIONS.YERLESIM_TEMIZLE:
      return {
        ...state,
        yerlesimPlani: [],
        kalanOgrenciler: [],
        istatistikler: null
      };
      
    case ACTIONS.KITAPCIK_SAYISI_GUNCELLE:
      const kitapcikSayisi = action.payload;
      const kitapcikTurleri = ['A', 'B', 'C', 'D'].slice(0, kitapcikSayisi);
      
      return {
        ...state,
        kitapcikSayisi,
        kitapcikTurleri
      };
      
    case ACTIONS.AYARLAR_GUNCELLE:
      return {
        ...state,
        ayarlar: { ...state.ayarlar, ...action.payload }
      };
      
    case ACTIONS.TAB_DEGISTIR:
      return {
        ...state,
        aktifTab: action.payload
      };
      
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
      
    case ACTIONS.ISTATISTIKLER_GUNCELLE:
      return {
        ...state,
        istatistikler: action.payload
      };
      
    default:
      return state;
  }
};

// Context
const AppContext = createContext();

// Provider Component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Local Storage'a veri kaydetme
  useEffect(() => {
    localStorage.setItem('ogrenciListesi', JSON.stringify(state.ogrenciler));
  }, [state.ogrenciler]);

  useEffect(() => {
    localStorage.setItem('salonAyarlari', JSON.stringify(state.salon));
  }, [state.salon]);

  useEffect(() => {
    localStorage.setItem('sinavAyarlari', JSON.stringify(state.ayarlar));
  }, [state.ayarlar]);

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
    
    salonGuncelle: (salon) => {
      dispatch({ type: ACTIONS.SALON_GUNCELLE, payload: salon });
    },
    
    yerlesimPlaniGuncelle: (yerlesimData) => {
      dispatch({ type: ACTIONS.YERLESIM_PLANI_GUNCELLE, payload: yerlesimData });
    },
    
    yerlesimTemizle: () => {
      dispatch({ type: ACTIONS.YERLESIM_TEMIZLE });
    },
    
    kitapcikSayisiGuncelle: (kitapcikSayisi) => {
      dispatch({ type: ACTIONS.KITAPCIK_SAYISI_GUNCELLE, payload: kitapcikSayisi });
    },
    
    ayarlarGuncelle: (ayarlar) => {
      dispatch({ type: ACTIONS.AYARLAR_GUNCELLE, payload: ayarlar });
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
    
    istatistiklerGuncelle: (istatistikler) => {
      dispatch({ type: ACTIONS.ISTATISTIKLER_GUNCELLE, payload: istatistikler });
    }
  };

  const value = {
    ...state,
    ...actions
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom Hook
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp hook must be used within AppProvider');
  }
  return context;
};

export default AppContext;
