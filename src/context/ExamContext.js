import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import logger from '../utils/logger';
import {
  waitForAuth,
  getUserRole,
  clearCachedRole,
  subscribeToAuthChanges,
  signInWithEmail,
  signOutUser
} from '../firebase/authState';
import { useStudentsQuery, useSalonsQuery, useSettingsQuery } from '../hooks/queries/useExamData';
import firestoreClient from '../database/firestoreClient';
import { useQueryClient } from '@tanstack/react-query';
import { useExamStore } from '../store/useExamStore';

const mapAuthUser = (user) => {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    isAnonymous: !!user.isAnonymous
  };
};

// Context
const ExamContext = createContext();

// Provider Component
export const ExamProvider = ({ children }) => {
  // 1. State Selectors (Selective subscriptions)
  const ogrenciler = useExamStore(s => s.ogrenciler);
  const ayarlar = useExamStore(s => s.ayarlar);
  const salonlar = useExamStore(s => s.salonlar);
  const yerlestirmeSonucu = useExamStore(s => s.yerlestirmeSonucu);
  const placementIndex = useExamStore(s => s.placementIndex);
  const aktifTab = useExamStore(s => s.aktifTab);
  const yukleme = useExamStore(s => s.yukleme);
  const hata = useExamStore(s => s.hata);
  const role = useExamStore(s => s.role);
  const authUser = useExamStore(s => s.authUser);

  // 2. Action Selectors (STABLE REFERENCES)
  const setOgrenciler = useExamStore(s => s.setOgrenciler);
  const addOgrenciler = useExamStore(s => s.addOgrenciler);
  const toggleOgrenciSec = useExamStore(s => s.toggleOgrenciSec);
  const clearSeciliOgrenciler = useExamStore(s => s.clearSeciliOgrenciler);
  const deleteOgrenci = useExamStore(s => s.deleteOgrenci);
  const clearOgrenciler = useExamStore(s => s.clearOgrenciler);
  const setSiniflar = useExamStore(s => s.setSiniflar);
  const setSeciliSinif = useExamStore(s => s.setSeciliSinif);
  const setSalonlar = useExamStore(s => s.setSalonlar);
  const addSalon = useExamStore(s => s.addSalon);
  const deleteSalon = useExamStore(s => s.deleteSalon);
  const updateAyarlar = useExamStore(s => s.updateAyarlar);
  const setYerlestirmeSonucu = useExamStore(s => s.setYerlestirmeSonucu);
  const updateYerlestirmeSonucu = useExamStore(s => s.updateYerlestirmeSonucu);
  const clearYerlestirme = useExamStore(s => s.clearYerlestirme);
  const setAktifTab = useExamStore(s => s.setAktifTab);
  const startLoading = useExamStore(s => s.startLoading);
  const stopLoading = useExamStore(s => s.stopLoading);
  const setHata = useExamStore(s => s.setHata);
  const clearHata = useExamStore(s => s.clearHata);
  const pinOgrenci = useExamStore(s => s.pinOgrenci);
  const unpinOgrenci = useExamStore(s => s.unpinOgrenci);
  const setAuthUser = useExamStore(s => s.setAuthUser);
  const setRoleAction = useExamStore(s => s.setRole);

  const [isInitialized, setIsInitialized] = React.useState(false);
  const prevAuthUserRef = React.useRef(null);
  const initialSyncRef = React.useRef({ students: false, salons: false, settings: false });

  // React Query Hooks
  const { data: studentsData, isLoading: studentsLoading } = useStudentsQuery();
  const { data: salonsData, isLoading: salonsLoading } = useSalonsQuery();
  const { data: settingsData, isLoading: settingsLoading } = useSettingsQuery();

  // Initial data loading from database - Server First Strategy

  // Öğrenciler: İlk yüklemede sunucu verisi varsa store'u güncelle (yerel veriyi ez)
  useEffect(() => {
    const shouldSync = !initialSyncRef.current.students && studentsData && studentsData.length > 0 && !studentsLoading;
    const shouldPopulateEmpty = studentsData && studentsData.length > 0 && ogrenciler.length === 0 && !studentsLoading;

    if (shouldSync) {
      logger.info('📥 ExamContext: İlk yükleme - Sunucudan öğrenciler senkronize ediliyor (Server First)...', studentsData.length);
      setOgrenciler(studentsData);
      initialSyncRef.current.students = true;
    } else if (shouldPopulateEmpty) {
      // Store sonradan boşalırsa (örn: çıkış yapıp girince) tekrar doldur
      setOgrenciler(studentsData);
    }
  }, [studentsData, studentsLoading, ogrenciler.length, setOgrenciler]);

  // Salonlar: İlk yüklemede sunucu verisi varsa store'u güncelle
  useEffect(() => {
    const shouldSync = !initialSyncRef.current.salons && salonsData && salonsData.length > 0 && !salonsLoading;
    const shouldPopulateEmpty = salonsData && salonsData.length > 0 && salonlar.length === 0 && !salonsLoading;

    if (shouldSync) {
      logger.info('📥 ExamContext: İlk yükleme - Sunucudan salonlar senkronize ediliyor (Server First)...', salonsData.length);
      setSalonlar(salonsData);
      initialSyncRef.current.salons = true;
    } else if (shouldPopulateEmpty) {
      setSalonlar(salonsData);
    }
  }, [salonsData, salonsLoading, salonlar.length, setSalonlar]);

  // Ayarlar: İlk yüklemede sunucu verisi varsa store'u güncelle
  useEffect(() => {
    const hasData = settingsData && Object.keys(settingsData).length > 0;
    const shouldSync = !initialSyncRef.current.settings && hasData && !settingsLoading;
    const shouldPopulateEmpty = hasData && !settingsLoading &&
      (!ayarlar.sinavAdi && !ayarlar.sinavTarihi && !ayarlar.sinavSaati && (!ayarlar.dersler || ayarlar.dersler.length === 0));

    if (shouldSync) {
      logger.info('📥 ExamContext: İlk yükleme - Sunucudan ayarlar senkronize ediliyor (Server First)...');
      updateAyarlar(settingsData);
      initialSyncRef.current.settings = true;
    } else if (shouldPopulateEmpty) {
      updateAyarlar(settingsData);
    }
  }, [settingsData, settingsLoading, ayarlar, updateAyarlar]);

  // Yükleme durumu
  useEffect(() => {
    if (!studentsLoading && !salonsLoading && !settingsLoading && yukleme) {
      stopLoading();
    }
  }, [studentsLoading, salonsLoading, settingsLoading, yukleme, stopLoading]);

  const queryClient = useQueryClient();

  const refreshFromFirestore = React.useCallback(
    async ({ showLoading = true } = {}) => {
      if (showLoading) {
        startLoading();
      }
      try {
        await Promise.all([
          queryClient.invalidateQueries(['students']),
          queryClient.invalidateQueries(['salons']),
          queryClient.invalidateQueries(['settings'])
        ]);

        const user = await waitForAuth();
        setAuthUser(mapAuthUser(user));

        const newRole = await getUserRole();
        setRoleAction(newRole);

        return { success: true };
      } catch (error) {
        logger.error('❌ refreshFromFirestore: Veri yenilenemedi:', error);
        return { success: false, error };
      } finally {
        if (showLoading) {
          stopLoading();
        }
      }
    },
    [startLoading, stopLoading, setAuthUser, setRoleAction, queryClient]
  );

  const login = React.useCallback(
    async (email, password) => {
      try {
        const trimmedEmail = (email || '').trim();
        if (!trimmedEmail || !password) {
          throw new Error('E-posta ve şifre zorunludur.');
        }
        await signInWithEmail(trimmedEmail, password);
        clearCachedRole();
        prevAuthUserRef.current = null;
        return await refreshFromFirestore({ showLoading: true });
      } catch (error) {
        logger.error('❌ Giriş denemesi başarısız:', error);
        return { success: false, error };
      }
    },
    [refreshFromFirestore]
  );

  const logout = React.useCallback(async () => {
    try {
      await signOutUser();
      clearCachedRole();
      prevAuthUserRef.current = null;
      setAuthUser(null);
      setRoleAction('public');
      return { success: true };
    } catch (error) {
      logger.error('❌ Çıkış işlemi başarısız:', error);
      return { success: false, error };
    }
  }, [setAuthUser, setRoleAction]);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      const userId = user?.uid || null;
      const prevUserId = prevAuthUserRef.current;
      prevAuthUserRef.current = userId;

      setAuthUser(mapAuthUser(user));

      if (!userId) {
        setRoleAction('public');
        return;
      }

      const currentRole = await getUserRole();
      setRoleAction(currentRole);

      if (isInitialized && userId !== prevUserId) {
        await refreshFromFirestore({ showLoading: true });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [isInitialized, refreshFromFirestore, setAuthUser, setRoleAction]);

  const isWriteAllowed = React.useMemo(() => role === 'admin', [role]);

  useEffect(() => {
    (async () => {
      try {
        const { default: db } = await import('../database');
        db.setWriteAccess(isWriteAllowed);
      } catch (error) {
        logger.warn('⚠️ Veritabanı yazma izni güncellenemedi:', error);
      }
    })();
  }, [isWriteAllowed]);

  // Legacy Action Bridge - Memoized for stability
  const actionsList = useMemo(() => ({
    ogrencilerYukle: async (yeniOgrenciler) => {
      try {
        await firestoreClient.saveStudents(yeniOgrenciler);
        logger.info('✅ Öğrenciler Firestore\'a kaydedildi');
        // Her durumda local state'i güncelle (offline çalışma desteği)
        setOgrenciler(yeniOgrenciler);
        return { success: true };
      } catch (error) {
        logger.error('❌ Öğrenciler Firestore\'a kaydedilemedi:', error);
        // Hata durumunda bile local state güncellensin mi?
        // UI'da hata gösterilecekse belki güncellemeli, ama veritabanı başarısızsa kullanıcı bilmeli.
        // Şimdilik local state'i güncelleyelim ama hatayı da fırlatalım.
        setOgrenciler(yeniOgrenciler);
        throw error;
      }
    },
    ogrencilerEkle: addOgrenciler,
    ogrenciSec: toggleOgrenciSec,
    ogrenciSecimiTemizle: clearSeciliOgrenciler,
    ogrenciSil: deleteOgrenci,
    ogrencileriTemizle: clearOgrenciler,
    siniflarYukle: setSiniflar,
    sinifSec: setSeciliSinif,
    salonlarGuncelle: setSalonlar,
    salonEkle: addSalon,
    salonSil: deleteSalon,
    ayarlarGuncelle: updateAyarlar,
    yerlestirmeYap: setYerlestirmeSonucu,
    yerlestirmeGuncelle: updateYerlestirmeSonucu,
    yerlestirmeTemizle: clearYerlestirme,
    tabDegistir: setAktifTab,
    yuklemeBaslat: startLoading,
    yuklemeBitir: stopLoading,
    hataAyarla: setHata,
    hataTemizle: clearHata,
    ogrenciPin: pinOgrenci,
    ogrenciUnpin: unpinOgrenci,
    refreshFromFirestore,
    login,
    logout
  }), [
    setOgrenciler, addOgrenciler, toggleOgrenciSec, clearSeciliOgrenciler,
    deleteOgrenci, clearOgrenciler, setSiniflar, setSeciliSinif,
    setSalonlar, addSalon, deleteSalon, updateAyarlar,
    setYerlestirmeSonucu, updateYerlestirmeSonucu, clearYerlestirme,
    setAktifTab, startLoading, stopLoading, setHata, clearHata,
    pinOgrenci, unpinOgrenci, refreshFromFirestore, login, logout
  ]);

  // Memoize value to stabilize context and prevent unnecessary re-renders of consumers
  const value = useMemo(() => ({
    ogrenciler,
    ayarlar,
    salonlar,
    yerlestirmeSonucu,
    placementIndex,
    aktifTab,
    yukleme,
    hata,
    role,
    authUser,
    ...actionsList,
    isInitialized,
    isWriteAllowed
  }), [
    ogrenciler, ayarlar, salonlar, yerlestirmeSonucu, placementIndex,
    aktifTab, yukleme, hata, role, authUser, actionsList, isInitialized, isWriteAllowed
  ]);

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

