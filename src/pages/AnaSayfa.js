import React, { useCallback, useEffect, useRef, useState, Suspense, useMemo } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Box,
  Container,
  Typography,
  Alert,
  Button,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Fab,
  Chip,
  Card,
  CardContent,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  People as PeopleIcon,
  Settings as SettingsIcon,
  Book as BookIcon,
  MeetingRoom as MeetingRoomIcon,
  Chair as ChairIcon,
  PlayArrow as PlayIcon,
  Print as PrintIcon,
  // CheckCircle as CheckCircleIcon,
  // ArrowForward as ArrowForwardIcon,
  // ArrowBack as ArrowBackIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  Save as SaveIcon,
  BugReport as BugReportIcon,
  Assignment as AssignmentIcon,
  Lock as LockIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { BsClipboardCheck } from 'react-icons/bs';
import { useReactToPrint } from 'react-to-print';

import Header from '../components/Header';
import Footer from '../components/Footer';
import ErrorBoundary from '../components/ErrorBoundary';
import GenelAyarlarFormu from '../components/GenelAyarlarFormu';
import OgrenciListesi from '../components/OgrenciListesi';
import AyarlarFormu from '../components/AyarlarFormu';
import SalonFormu from '../components/SalonFormu';
import { useExamStore } from '../store/useExamStore';
import { useNotifications, NotificationProvider } from '../components/NotificationSystem';
import { gelismisYerlestirme } from '../algorithms/gelismisYerlestirmeAlgoritmasi';
import { calculateDeskNumbersForMasalar } from '../algorithms/gelismisYerlestirmeAlgoritmasi';
import planManager from '../utils/planManager';
import {
  DatabaseTestLazy,
  TestDashboardLazy,
  SalonPlaniLazy,
  PlanlamaYapLazy,
  SabitAtamalarLazy,
  KayitliPlanlarLazy
} from '../components/LazyComponents';
import { SalonPlaniPrintable } from '../components/SalonPlaniPrintable';
import { SalonOgrenciListesiPrintable } from '../components/SalonOgrenciListesiPrintable';
import { SalonImzaListesiPrintable } from '../components/SalonImzaListesiPrintable';
import logger from '../utils/logger';
import transferManager from '../utils/transferManager';
import PlanKaydetmeDialog from '../components/AnaSayfa/PlanKaydetmeDialog';
import { UnplacedStudentsDropZone, DraggableUnplacedStudent, ITEM_TYPES } from '../components/AnaSayfa/UnplacedStudentsDnd';
import { usePlanPersistence } from '../hooks/usePlanPersistence';
import { useStudentPlacement } from '../hooks/useStudentPlacement';
import { usePlacementAlgorithm } from '../hooks/usePlacementAlgorithm';
import { usePlanExport } from '../hooks/usePlanExport';

const AnaSayfaContent = React.memo(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [seciliSalonId, setSeciliSalonId] = useState(null);
  const [showFirstTimeLoader, setShowFirstTimeLoader] = useState(false); // İlk açılış loading ekranı
  const { showSuccess, showError, showInfo } = useNotifications();

  // 1. State Selectors
  const ogrenciler = useExamStore(s => s.ogrenciler);
  const ayarlar = useExamStore(s => s.ayarlar);
  const salonlar = useExamStore(s => s.salonlar);
  const yerlestirmeSonucu = useExamStore(s => s.yerlestirmeSonucu);
  const aktifTab = useExamStore(s => s.aktifTab);
  const yukleme = useExamStore(s => s.yukleme);
  const hata = useExamStore(s => s.hata);
  const role = useExamStore(s => s.role);
  const authUser = useExamStore(s => s.authUser);

  // 2. Action Selectors
  const setOgrenciler = useExamStore(s => s.setOgrenciler);
  const addOgrenciler = useExamStore(s => s.addOgrenciler);
  const updateAyarlar = useExamStore(s => s.updateAyarlar);
  const setSalonlar = useExamStore(s => s.setSalonlar);
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

  // Derivations
  const isWriteAllowed = role === 'admin';

  // Legacy mappings for internal functions
  const ogrencilerYukle = setOgrenciler;
  const ayarlarGuncelle = updateAyarlar;
  const salonlarGuncelle = setSalonlar;
  const yerlestirmeYap = setYerlestirmeSonucu;
  const yerlestirmeGuncelle = updateYerlestirmeSonucu;
  const yerlestirmeTemizle = clearYerlestirme;
  const tabDegistir = setAktifTab;
  const yuklemeBaslat = startLoading;
  const hataAyarla = setHata;
  const hataTemizle = clearHata;
  const ogrenciPin = pinOgrenci;
  const ogrenciUnpin = unpinOgrenci;

  const readOnly = !isWriteAllowed;

  // İlk açılışta güzel bir loading ekranı göster
  useEffect(() => {
    // İlk açılış kontrolü - localStorage'dan kontrol et
    try {
      const hasVisited = localStorage.getItem('hasVisited');
      const isFirstVisit = !hasVisited || hasVisited !== 'true';

      if (isFirstVisit) {
        setShowFirstTimeLoader(true);
        localStorage.setItem('hasVisited', 'true');
        // İlk açılışta genel-ayarlar sekmesine geç
        tabDegistir('genel-ayarlar');
      } else {
        // Daha önce ziyaret edilmişse direkt genel-ayarlar sekmesine geç
        if (aktifTab !== 'genel-ayarlar') {
          tabDegistir('genel-ayarlar');
        }
      }
    } catch (error) {
      console.error('❌ localStorage kontrolü hatası:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading ekranını otomatik kapat
  useEffect(() => {
    if (showFirstTimeLoader) {
      const timer = setTimeout(() => {
        setShowFirstTimeLoader(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showFirstTimeLoader]);

  // Plan varsa ilk salonu otomatik seç - sadece bir kez çalışsın (useRef ile kontrol)
  const ilkSalonSecildiRef = useRef(false);
  useEffect(() => {
    if (yerlestirmeSonucu && yerlestirmeSonucu.tumSalonlar && yerlestirmeSonucu.tumSalonlar.length > 0) {
      if (ilkSalonSecildiRef.current) return; // Zaten seçilmişse tekrar seçme

      // Eğer seciliSalonId null ise veya seçili salon tumSalonlar içinde yoksa, ilk salonu seç
      const aktifTumSalonlar = yerlestirmeSonucu.tumSalonlar.filter(salon => salon.aktif !== false);
      if (aktifTumSalonlar.length > 0) {
        const seciliSalonMevcutMu = seciliSalonId && aktifTumSalonlar.some(salon =>
          salon.salonId === seciliSalonId || salon.id === seciliSalonId
        );

        if (!seciliSalonMevcutMu) {
          const ilkSalon = aktifTumSalonlar[0];
          const ilkSalonId = ilkSalon.salonId || ilkSalon.id;
          if (ilkSalonId) {
            ilkSalonSecildiRef.current = true;
            setSeciliSalonId(ilkSalonId);
            // Ana salonu da güncelle - sadece ilk seferinde
            if (yerlestirmeGuncelle && !yerlestirmeSonucu.salon) {
              yerlestirmeGuncelle({ salon: ilkSalon });
            }
          }
        } else {
          ilkSalonSecildiRef.current = true;
        }
      }
    } else {
      // Plan yoksa ref'i sıfırla
      ilkSalonSecildiRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yerlestirmeSonucu?.tumSalonlar?.length]);



  // Gizli kısayol: Ctrl+Alt+D ile veritabanı test panelini aç/kapat
  useEffect(() => {
    const handler = (e) => {
      try {
        const isToggle = (e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'd' || e.key === 'D');
        if (isToggle) {
          const enabled = localStorage.getItem('enable_db_test') === '1';
          const next = enabled ? '0' : '1';
          localStorage.setItem('enable_db_test', next);
          // panel görünürse hemen geç
          if (next === '1') {
            tabDegistir('database-test');
            showSuccess('Veritabanı Test paneli etkinleştirildi (Ctrl+Alt+D)');
          } else {
            showSuccess('Veritabanı Test paneli devre dışı bırakıldı');
            if (aktifTab === 'database-test') tabDegistir('genel-ayarlar');
          }
        }
      } catch (err) {
        logger.debug('Kısayol işleyicisinde hata yakalandı:', err);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tabDegistir, showSuccess, aktifTab]);


  // PDF Export için ref'ler
  const salonPlaniPrintRef = useRef();
  const sinifListesiPrintRef = useRef();
  const salonImzaListesiPrintRef = useRef();

  // Kaydetme için state'ler
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [activePlanMeta, setActivePlanMeta] = useState(null);
  const currentPlanDisplayName = activePlanMeta?.name || planManager.getCurrentPlanName() || '';

  const {
    printMenuAnchor,
    handlePrintMenuOpen,
    handlePrintMenuClose,
    handleSalonPlaniPrintClick,
    handleSinifListesiPrintClick,
    handleSalonImzaListesiPrintClick
  } = usePlanExport(
    salonPlaniPrintRef,
    sinifListesiPrintRef,
    salonImzaListesiPrintRef,
    ayarlar
  );

  const { handleSavePlan, handlePlanYukle } = usePlanPersistence(activePlanMeta, setActivePlanMeta);
  const { handleStudentMove, handleStudentTransfer } = useStudentPlacement(
    yerlestirmeSonucu,
    yerlestirmeGuncelle,
    ogrenciler,
    ogrencilerYukle,
    readOnly
  );

  const { handleYerlestirmeYap } = usePlacementAlgorithm(
    ogrenciler,
    salonlar,
    ayarlar,
    readOnly,
    yuklemeBaslat,
    yerlestirmeYap,
    tabDegistir,
    hataAyarla,
    setActivePlanMeta,
    showError,
    yukleme
  );

  // Kaydetme fonksiyonları - useCallback ile optimize edildi
  const handleSaveClick = useCallback(() => {
    if (readOnly) {
      showError('Bu işlem için yönetici girişi gereklidir.');
      return;
    }
    console.log('💾 handleSaveClick - currentPlan state:', {
      isActive: planManager.isCurrentPlanActive(),
      currentPlanId: planManager.getCurrentPlanId(),
      currentPlanName: planManager.getCurrentPlanName()
    });
    if (activePlanMeta?.id && activePlanMeta?.name) {
      handleSavePlan(activePlanMeta.name, { planId: activePlanMeta.id });
      return;
    }

    if (planManager.isCurrentPlanActive()) {
      const currentPlanName = planManager.getCurrentPlanName();
      if (currentPlanName) {
        handleSavePlan(currentPlanName, { planId: planManager.getCurrentPlanId() });
        return;
      }
    }
    setSaveDialogOpen(true);
  }, [handleSavePlan, activePlanMeta, readOnly, showError]);

  const handleSaveDialogClose = useCallback(() => {
    setSaveDialogOpen(false);
  }, []);



  // Veri yükleme - artık localStorage'dan otomatik yükleniyor
  // useEffect kaldırıldı çünkü ExamContext localStorage'dan veriyi otomatik yüklüyor

  const handleAyarlarDegistir = useCallback((yeniAyarlar) => {
    if (readOnly) {
      showError('Bu alanları düzenlemek için yönetici girişi gerekiyor.');
      return;
    }
    ayarlarGuncelle(yeniAyarlar);
  }, [ayarlarGuncelle, readOnly, showError]);

  const handleSalonlarDegistir = useCallback((yeniSalonlar) => {
    if (readOnly) {
      showError('Salon düzenleme yetkisi için yönetici girişi gerekli.');
      return;
    }
    salonlarGuncelle(yeniSalonlar);

    // Eğer yerleştirme sonucu varsa, salon sıralamasını güncelle
    if (yerlestirmeSonucu && yerlestirmeSonucu.tumSalonlar) {
      // Yeni salon sıralamasına göre tumSalonlar'ı güncelle
      const guncellenmisTumSalonlar = yeniSalonlar.map(yeniSalon => {
        // Mevcut tumSalonlar'da bu salon var mı kontrol et
        const mevcutSalon = yerlestirmeSonucu.tumSalonlar.find(salon =>
          salon.salonId === yeniSalon.id || salon.salonAdi === yeniSalon.salonAdi
        );

        if (mevcutSalon) {
          // Mevcut salon verilerini koru, sadece sıralamayı güncelle
          return {
            ...mevcutSalon,
            salonAdi: yeniSalon.salonAdi,
            salonId: yeniSalon.id
          };
        } else {
          // Yeni salon eklenmişse, boş salon oluştur
          return {
            salonId: yeniSalon.id,
            salonAdi: yeniSalon.salonAdi,
            masalar: [],
            gruplar: {},
            ogrenciler: []
          };
        }
      });

      // Yerleştirme sonucunu güncelle
      yerlestirmeGuncelle({
        ...yerlestirmeSonucu,
        tumSalonlar: guncellenmisTumSalonlar
      });
    }
  }, [salonlarGuncelle, yerlestirmeSonucu, yerlestirmeGuncelle, readOnly]);

  // Yerleştirme sonuçlarını temizle - useCallback ile optimize edildi
  const handleYerlestirmeTemizle = useCallback(() => {
    // Public modda da yerleşim planı temizlenebilir
    yerlestirmeTemizle(); // Yerleştirme sonucunu temizle
    tabDegistir('planlama'); // Planlama sekmesine geri dön
    planManager.clearCurrentPlan(); // Aktif planı temizle
    setActivePlanMeta(null); // activePlanMeta'yı da temizle
  }, [yerlestirmeTemizle, tabDegistir, setActivePlanMeta]);





  const genelAyarlarContent = useMemo(() => (
    <GenelAyarlarFormu
      ayarlar={ayarlar}
      onAyarlarDegistir={handleAyarlarDegistir}
      readOnly={readOnly}
    />
  ), [ayarlar, handleAyarlarDegistir, readOnly]);

  const ogrencilerContent = useMemo(() => (
    <OgrenciListesi
      ogrenciler={ogrenciler}
      yerlestirmeSonucu={yerlestirmeSonucu}
    />
  ), [ogrenciler, yerlestirmeSonucu]);

  const salonlarContent = useMemo(() => (
    <SalonFormu
      salonlar={salonlar}
      onSalonlarDegistir={handleSalonlarDegistir}
      yerlestirmeSonucu={yerlestirmeSonucu}
      readOnly={readOnly}
    />
  ), [salonlar, handleSalonlarDegistir, yerlestirmeSonucu, readOnly]);

  const ayarlarTabContent = useMemo(() => (
    <AyarlarFormu
      ayarlar={ayarlar}
      onAyarlarDegistir={handleAyarlarDegistir}
      ogrenciler={ogrenciler}
      yerlestirmeSonucu={yerlestirmeSonucu}
      readOnly={readOnly}
    />
  ), [ayarlar, handleAyarlarDegistir, ogrenciler, yerlestirmeSonucu, readOnly]);

  const sabitAtamalarContent = useMemo(() => (
    <ErrorBoundary componentName="SabitAtamalar">
      <SabitAtamalarLazy />
    </ErrorBoundary>
  ), []);

  const planlamaContent = useMemo(() => (
    <ErrorBoundary componentName="PlanlamaYap">
      <PlanlamaYapLazy
        ogrenciler={ogrenciler}
        ayarlar={ayarlar}
        salonlar={salonlar}
        onYerlestirmeYap={handleYerlestirmeYap}
        yukleme={yukleme}
      />
    </ErrorBoundary>
  ), [ogrenciler, ayarlar, salonlar, handleYerlestirmeYap, yukleme]);

  // Aktif salonlar hesaplaması - performans için useMemo ile cache'lendi
  const aktifSalonlar = useMemo(() => {
    return salonlar?.filter(salon => salon.aktif !== false) || [];
  }, [salonlar]);

  // Tab içerik render fonksiyonu
  const renderTabIcerik = () => {
    switch (aktifTab) {
      case 'genel-ayarlar':
        return genelAyarlarContent;

      case 'ogrenciler':
        return ogrencilerContent;

      case 'salonlar':
        return salonlarContent;

      case 'ayarlar':
        return ayarlarTabContent;

      case 'sabit-atamalar':
        return sabitAtamalarContent;

      case 'planlama':
        return planlamaContent;

      case 'salon-plani':
        // aktifSalonlar useMemo ile yukarıda tanımlandı

        // NOT: seciliSalonId seçimi useEffect'te yapılıyor - render sırasında state güncellemesi yapmayalım
        if (aktifSalonlar.length > 0 && !yerlestirmeSonucu) {

          const seciliSalon = aktifSalonlar.find(salon => salon.id === seciliSalonId) || aktifSalonlar[0];

          // Kapasite bilgisini doğru şekilde al - 0 ise varsayılan değer kullan
          const salonKapasite = seciliSalon.kapasite || 30;

          // Satır ve sütun sayılarını hesapla - eksikse kapasiteden hesapla
          const defaultSatir = seciliSalon.satir || (salonKapasite > 0 ? Math.ceil(Math.sqrt(salonKapasite)) : 6);
          const defaultSutun = seciliSalon.sutun || (salonKapasite > 0 ? Math.ceil(salonKapasite / defaultSatir) : 5);

          // Grup bazlı düzen için varsayılan gruplar
          const defaultGruplar = seciliSalon.gruplar || [
            { id: 1, siraSayisi: Math.ceil(defaultSatir / 2) },
            { id: 2, siraSayisi: Math.ceil(defaultSatir / 2) },
            { id: 3, siraSayisi: Math.ceil(defaultSatir / 2) },
            { id: 4, siraSayisi: Math.ceil(defaultSatir / 2) }
          ];

          return (
            <ErrorBoundary componentName="SalonPlani">
              <Box sx={{ position: 'relative' }}>
                {/* Salon planı - SalonPlani bileşeni kendi salon seçimini yapar */}
                <SalonPlaniLazy
                  sinif={{
                    id: seciliSalon.id,
                    salonAdi: seciliSalon.salonAdi || seciliSalon.ad,
                    kapasite: salonKapasite,
                    siraTipi: seciliSalon.siraTipi || 'ikili',
                    grupSayisi: seciliSalon.grupSayisi,
                    gruplar: defaultGruplar,
                    masalar: [], // Boş masa listesi
                    ogrenciler: [], // Boş öğrenci listesi
                    // Fallback için eski veri yapısı
                    siraDizilimi: {
                      satir: defaultSatir,
                      sutun: defaultSutun
                    }
                  }}
                  ogrenciler={[]}
                  ayarlar={ayarlar}
                  salonlar={aktifSalonlar}
                  seciliSalonId={seciliSalonId}
                  onSeciliSalonDegistir={setSeciliSalonId}
                  aktifPlanAdi={currentPlanDisplayName}
                />
              </Box>
            </ErrorBoundary>
          );
        }

        return (
          <ErrorBoundary componentName="SalonPlani">
            <Box sx={{ position: 'relative' }}>
              {yerlestirmeSonucu && (
                <>
                  <SalonPlaniLazy
                    sinif={yerlestirmeSonucu?.salon || {
                      id: 'A-101',
                      kapasite: Math.max(ogrenciler.length, 30),
                      siraDizilimi: {
                        satir: Math.ceil(Math.sqrt(Math.max(ogrenciler.length, 30))),
                        sutun: Math.ceil(Math.max(ogrenciler.length, 30) / Math.ceil(Math.sqrt(Math.max(ogrenciler.length, 30))))
                      },
                      ad: 'Sınav Salonu'
                    }}
                    ogrenciler={yerlestirmeSonucu?.salon?.ogrenciler || []}
                    ayarlar={ayarlar}
                    onOgrenciSec={(action, data) => {
                      if (action === 'clear') {
                        handleYerlestirmeTemizle();
                      } else if (action === 'move') {
                        // Drag & Drop: Öğrenci taşıma
                        handleStudentMove('move', data);
                      }
                    }}
                    tumSalonlar={yerlestirmeSonucu?.tumSalonlar?.filter(salon => salon.aktif !== false) || []}
                    onSalonDegistir={(salon) => {
                      // Formatlanmış salonu bul
                      const formatlanmisSalon = yerlestirmeSonucu.tumSalonlar.find(
                        fSalon => fSalon.salonId === salon.salonId
                      );

                      if (formatlanmisSalon) {
                        // State'i güncelle
                        yerlestirmeGuncelle({ salon: formatlanmisSalon });
                      }
                    }}
                    salonlar={salonlar?.filter(salon => salon.aktif !== false) || []}
                    seciliSalonId={seciliSalonId}
                    onSeciliSalonDegistir={setSeciliSalonId}
                    onStudentTransfer={handleStudentTransfer}
                    yerlestirmeSonucu={yerlestirmeSonucu}
                    aktifPlanAdi={currentPlanDisplayName}
                    readOnly={readOnly}
                  />

                  {/* Yerleşmeyen Öğrenciler kartı kaldırıldı - Artık Salon Planı'ndaki boş masalara tıklanarak modal üzerinden erişiliyor */}
                </>
              )}


              {/* Salon planı boşken - SalonPlani bileşeni ile salon sekmeleri render edilecek */}
              {!yerlestirmeSonucu && (
                <ErrorBoundary componentName="SalonPlani">
                  <>
                    {(() => {
                      const seciliSalon = salonlar.find(salon => salon.id === (seciliSalonId || salonlar[0]?.id));
                      if (!seciliSalon) return null;

                      // Kapasite bilgisini doğru şekilde al - 0 ise varsayılan değer kullan
                      const salonKapasite = seciliSalon.kapasite || 30;

                      // Satır ve sütun sayılarını hesapla - eksikse kapasiteden hesapla
                      const defaultSatir = seciliSalon.satir || (salonKapasite > 0 ? Math.ceil(Math.sqrt(salonKapasite)) : 6);
                      const defaultSutun = seciliSalon.sutun || (salonKapasite > 0 ? Math.ceil(salonKapasite / defaultSatir) : 5);

                      // Grup bazlı düzen için varsayılan gruplar
                      const defaultGruplar = seciliSalon.gruplar || [
                        { id: 1, siraSayisi: Math.ceil(defaultSatir / 2) },
                        { id: 2, siraSayisi: Math.ceil(defaultSatir / 2) },
                        { id: 3, siraSayisi: Math.ceil(defaultSatir / 2) },
                        { id: 4, siraSayisi: Math.ceil(defaultSatir / 2) }
                      ];

                      return (
                        <SalonPlaniLazy
                          sinif={{
                            id: seciliSalon.id,
                            kapasite: salonKapasite,
                            ad: seciliSalon.salonAdi || seciliSalon.ad,
                            // SalonFormu formatından gelen veriyi kullan
                            siraTipi: seciliSalon.siraTipi || 'ikili',
                            gruplar: defaultGruplar,
                            // Fallback için eski veri yapısı
                            siraDizilimi: {
                              satir: defaultSatir,
                              sutun: defaultSutun
                            }
                          }}
                          ogrenciler={[]}
                          ayarlar={ayarlar}
                          onOgrenciSec={(action, data) => {
                            if (action === 'clear') {
                              handleYerlestirmeTemizle();
                            } else if (action === 'move') {
                              // Drag & Drop: Öğrenci taşıma
                              handleStudentMove(action, data);
                            }
                          }}
                          tumSalonlar={[]}
                          onSalonDegistir={() => { }}
                          // Salon sekmeleri için yeni prop'lar
                          salonlar={salonlar}
                          seciliSalonId={seciliSalonId}
                          onSeciliSalonDegistir={setSeciliSalonId}
                          onStudentTransfer={handleStudentTransfer}
                          aktifPlanAdi={currentPlanDisplayName}
                          readOnly={readOnly}
                        />
                      );
                    })()}

                    {/* Yerleştirme yap butonu */}
                    <Box sx={{ textAlign: 'center', mt: 1 }}>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={yukleme ? <CircularProgress size={20} color="inherit" /> : <PlayIcon />}
                        onClick={handleYerlestirmeYap}
                        disabled={ogrenciler.length === 0 || yukleme}
                        sx={{
                          px: 4,
                          py: 1.5,
                          fontSize: '1.1rem',
                          borderRadius: 2,
                          boxShadow: 3,
                          '&:hover': {
                            boxShadow: 6,
                            transform: 'translateY(-2px)'
                          }
                        }}
                      >
                        {yukleme ? 'Yerleştirme Yapılıyor...' : 'Yerleştirme Yap'}
                      </Button>
                    </Box>

                  </>
                </ErrorBoundary>
              )}


            </Box>
          </ErrorBoundary>
        );

      case 'kayitli-planlar':
        return (
          <ErrorBoundary componentName="KayitliPlanlar">
            <KayitliPlanlarLazy
              onPlanYukle={handlePlanYukle}
            />
          </ErrorBoundary>
        );

      case 'database-test':
        // Gizli erişim: sadece yetkilendirme anahtarı aktifse göster
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const enabledByQuery = urlParams.get('dbtest') === '1';
          const enabledByStorage = localStorage.getItem('enable_db_test') === '1';
          if (enabledByQuery || enabledByStorage) {
            // Query ile açılırsa bayrağı kalıcı yap
            if (enabledByQuery) {
              localStorage.setItem('enable_db_test', '1');
            }
            return <DatabaseTestLazy />;
          }
        } catch (e) {
          logger.debug('Database test sekmesi kontrolünde hata:', e);
        }
        return null;

      case 'test-dashboard':
        return <TestDashboardLazy />;

      default:
        return null;
    }
  };

  // Tam sayfa loader yerine her zaman ana iskeleti render et

  // İlk açılış loading ekranı
  if (showFirstTimeLoader) {
    return (
      <Box
        onClick={() => setShowFirstTimeLoader(false)}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          cursor: 'pointer',
        }}
      >
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            textAlign: 'center',
            color: 'white',
            animation: 'fadeIn 0.8s ease-in'
          }}
        >
          <Box
            sx={{
              width: 120,
              height: 120,
              mx: 'auto',
              mb: 4,
              position: 'relative',
              animation: 'pulse 2s ease-in-out infinite'
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'linear-gradient(45deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                border: '2px solid rgba(255,255,255,0.2)'
              }}
            >
              <SchoolIcon sx={{ fontSize: 60, color: 'white' }} />
            </Box>
            <Box
              sx={{
                position: 'absolute',
                top: -10,
                right: -10,
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'rotate 2s linear infinite'
              }}
            >
              <BsClipboardCheck style={{ fontSize: 20, color: 'white' }} />
            </Box>
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              mb: 1,
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
              animation: 'slideUp 0.8s ease-out 0.2s both',
              fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
              px: 2
            }}
          >
            Akhisar Farabi Mesleki ve Teknik Anadolu Lisesi
          </Typography>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 2,
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
              animation: 'slideUp 0.8s ease-out 0.3s both',
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2rem' }
            }}
          >
            Ortak Sınav Yerleştirme Sistemi
          </Typography>

          <Typography
            variant="h6"
            sx={{
              opacity: 0.9,
              mb: 4,
              fontWeight: 300,
              animation: 'slideUp 0.8s ease-out 0.4s both'
            }}
          >
            Hoş geldiniz
          </Typography>

          <Box
            sx={{
              width: 200,
              height: 4,
              mx: 'auto',
              background: 'rgba(255,255,255,0.3)',
              borderRadius: 2,
              overflow: 'hidden',
              animation: 'slideUp 0.8s ease-out 0.6s both',
              mb: 3
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '100%',
                background: 'white',
                borderRadius: 2,
                animation: 'loading 3s ease-in-out'
              }}
            />
          </Box>

          <Button
            variant="contained"
            onClick={() => setShowFirstTimeLoader(false)}
            sx={{
              mt: 2,
              px: 4,
              py: 1.5,
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255,255,255,0.3)',
              color: 'white',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': {
                background: 'rgba(255,255,255,0.3)',
                border: '2px solid rgba(255,255,255,0.5)',
              },
              animation: 'slideUp 0.8s ease-out 0.8s both'
            }}
          >
            Devam Et
          </Button>
        </Box>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.05);
            }
          }
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes loading {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(0);
            }
          }
        `}</style>
      </Box>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{
        bgcolor: 'background.default',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Header
          baslik="Ortak Sınav Yerleştirme Sistemi"
          onHomeClick={() => tabDegistir('genel-ayarlar')}
          onTestDashboardClick={() => tabDegistir('test-dashboard')}
          showNav={false}
        />

        <Container maxWidth="xl" sx={{ py: 2, px: 0, pb: 1, flex: 1 }}>

          {/* Yükleme durumu - testlerde beklenen metin */}
          {yukleme && ogrenciler.length === 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Veriler yükleniyor...
            </Alert>
          )}

          {/* Hata Mesajı */}
          {hata && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              onClose={hataTemizle}
            >
              {hata}
            </Alert>
          )}

          {readOnly && (
            <Alert
              severity="info"
              icon={<LockIcon fontSize="inherit" />}
              sx={{
                mb: 3,
                textAlign: 'center',
                '& .MuiAlert-message': {
                  textAlign: 'center',
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }
              }}
            >
              <Box sx={{ textAlign: 'center', width: '100%' }}>
                Bu oturumda <strong>sadece görüntüleme</strong> yetkisine sahipsiniz. Planları
                yükleyebilir ve yazdırabilirsiniz, ancak değişiklik yapmak için yönetici
                girişi gereklidir.
              </Box>
            </Alert>
          )}

          {/* Tab Navigation */}
          <Paper
            elevation={1}
            sx={{
              mb: { xs: 2, sm: 3 },
              position: { xs: 'sticky', sm: 'relative' },
              top: { xs: 0, sm: 0 },
              zIndex: { xs: 1100, sm: 1 },
              backgroundColor: 'background.paper',
              width: '100%'
            }}
          >
            <Tabs
              value={aktifTab}
              onChange={(e, newValue) => tabDegistir(newValue)}
              variant={isMobile ? "scrollable" : "standard"}
              scrollButtons={isMobile ? "auto" : false}
              centered={!isMobile}
              allowScrollButtonsMobile
              sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTabs-scrollButtons': {
                  '&.Mui-disabled': {
                    opacity: 0.3
                  }
                },
                '& .MuiTab-root': {
                  minWidth: { xs: 'auto', sm: 'auto' },
                  px: { xs: 1, sm: 2 },
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  whiteSpace: 'nowrap'
                }
              }}
            >
              <Tab
                icon={<SettingsIcon />}
                label={"Ayarlar"}
                value="genel-ayarlar"
                sx={{ textTransform: 'none' }}
              />
              <Tab
                icon={<PeopleIcon />}
                label={"Öğrenciler"}
                value="ogrenciler"
                sx={{ textTransform: 'none' }}
              />
              <Tab
                icon={<BookIcon />}
                label={"Dersler"}
                value="ayarlar"
                sx={{ textTransform: 'none' }}
              />
              <Tab
                icon={<MeetingRoomIcon />}
                label={"Sınav Salonları"}
                value="salonlar"
                sx={{ textTransform: 'none' }}
              />
              <Tab
                icon={<AssignmentIcon />}
                label={"Sabit Atamalar"}
                value="sabit-atamalar"
                sx={{ textTransform: 'none' }}
              />
              <Tab
                icon={<AssessmentIcon />}
                label={"Planlama Yap"}
                value="planlama"
                sx={{ textTransform: 'none' }}
              />
              <Tab
                icon={<ChairIcon />}
                label={"Salon Planı"}
                value="salon-plani"
                sx={{ textTransform: 'none' }}
              />
              <Tab
                icon={<SaveIcon />}
                label={"Kayıtlı Planlar"}
                value="kayitli-planlar"
                sx={{ textTransform: 'none' }}
              />
              {(() => {
                try {
                  const urlParams = new URLSearchParams(window.location.search);
                  const enabledByQuery = urlParams.get('dbtest') === '1';
                  const enabledByStorage = localStorage.getItem('enable_db_test') === '1';
                  if (enabledByQuery || enabledByStorage) {
                    if (enabledByQuery) localStorage.setItem('enable_db_test', '1');
                    return (
                      <Tab
                        icon={<BugReportIcon />}
                        label={("Veritabanı Test").toLocaleUpperCase('tr-TR')}
                        value="database-test"
                        sx={{ textTransform: 'none' }}
                      />
                    );
                  }
                } catch (e) {
                  logger.debug('Database test tab görünürlük kontrolünde hata:', e);
                }
                return null;
              })()}
            </Tabs>
          </Paper>

          {/* Tab Content */}
          {renderTabIcerik()}


          {/* Test ortamı dışında Plan Kaydet butonunu gösterme */}
          {process.env.NODE_ENV === 'test' && (
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={handleSaveClick}>
                Plan Kaydet
              </Button>
            </Box>
          )}

        </Container>

        <Footer />

        {/* Kaydet FAB */}
        <Fab
          color="secondary"
          sx={{
            position: 'fixed',
            bottom: { xs: 8, sm: 24 },
            right: { xs: 8, sm: 24 },
            zIndex: 1000,
            width: { xs: 48, sm: 56 },
            height: { xs: 48, sm: 56 }
          }}
          onClick={handleSaveClick}
          title={readOnly ? 'Bu işlem için yönetici girişi gerekir' : 'Planı Kaydet'}
          disabled={readOnly}
        >
          <SaveIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
        </Fab>

        {/* PDF Export FAB */}
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: { xs: 8, sm: 24 },
            right: { xs: 64, sm: 88 },
            zIndex: 1000,
            width: { xs: 48, sm: 56 },
            height: { xs: 48, sm: 56 }
          }}
          onClick={handlePrintMenuOpen}
          title="Yazdırma Seçenekleri"
        >
          <PrintIcon sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }} />
        </Fab>

        {/* Yazdırma Menüsü */}
        <Menu
          anchorEl={printMenuAnchor}
          open={Boolean(printMenuAnchor)}
          onClose={handlePrintMenuClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
        >
          <MenuItem onClick={handleSalonPlaniPrintClick}>
            <ListItemIcon>
              <ChairIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Salon Planı" />
          </MenuItem>
          <MenuItem onClick={handleSinifListesiPrintClick}>
            <ListItemIcon>
              <PeopleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Sınıf Listesi" />
          </MenuItem>
          <MenuItem onClick={handleSalonImzaListesiPrintClick}>
            <ListItemIcon>
              <AssignmentIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Salon İmza Listesi" />
          </MenuItem>
        </Menu>

        {/* PDF Export Bileşenleri - Görünür ama ekranda görünmez */}
        <Box sx={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          visibility: 'hidden'
        }}>
          {/* Salon Planı */}
          <SalonPlaniPrintable
            ref={salonPlaniPrintRef}
            yerlestirmeSonucu={yerlestirmeSonucu}
            ayarlar={ayarlar}
          />

          {/* Sınıf Listesi */}
          <SalonOgrenciListesiPrintable
            ref={sinifListesiPrintRef}
            ogrenciler={ogrenciler}
            yerlestirmeSonucu={yerlestirmeSonucu}
            ayarlar={ayarlar}
          />

          {/* Salon İmza Listesi */}
          <SalonImzaListesiPrintable
            ref={salonImzaListesiPrintRef}
            yerlestirmeSonucu={yerlestirmeSonucu}
            ayarlar={ayarlar}
            tumOgrenciler={ogrenciler}
          />
        </Box>
      </Box>

      {/* Kaydetme Dialog'u - Optimize edilmiş */}
      <PlanKaydetmeDialog
        open={saveDialogOpen}
        onClose={handleSaveDialogClose}
        onSave={(planAdi) => handleSavePlan(planAdi, { onCloseCallback: handleSaveDialogClose })}
      />
    </DndProvider>
  );
});

const AnaSayfa = () => {
  return (
    <NotificationProvider>
      <AnaSayfaContent />
    </NotificationProvider>
  );
};

export default AnaSayfa;