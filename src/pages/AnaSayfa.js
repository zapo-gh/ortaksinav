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
import { useExam } from '../context/ExamContext';
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
  KayitliPlanlarLazy,
  LazySalonPlaniPrintable,
  LazySalonOgrenciListesiPrintable,
  LazySalonImzaListesiPrintable
} from '../components/LazyComponents';
import logger from '../utils/logger';
import transferManager from '../utils/transferManager';

// Drag & Drop item types
const ITEM_TYPES = {
  STUDENT: 'student'
};

// Plan Kaydetme Dialog Bileşeni - Tamamen optimize edilmiş
const PlanKaydetmeDialog = React.memo(({
  open,
  onClose,
  onSave
}) => {
  const [planAdi, setPlanAdi] = useState('');

  // Plan adı değişikliği için optimize edilmiş handler
  const handlePlanAdiChange = useCallback((e) => {
    setPlanAdi(e.target.value);
  }, []);

  // Dialog kapandığında state'i temizle
  const handleClose = useCallback(() => {
    setPlanAdi('');
    onClose();
  }, [onClose]);

  // Kaydetme işlemi
  const handleSave = useCallback(async () => {
    if (!planAdi.trim()) {
      return; // Boş plan adı için hiçbir şey yapma
    }
    try {
      await onSave(planAdi);
      setPlanAdi('');
      // Modal'ı kesinlikle kapat
      onClose();
    } catch (error) {
      // Hata durumunda da modal'ı kapat (hata mesajı handleSavePlan'den gösterilecek)
      console.error('Plan kaydetme hatası:', error);
      setPlanAdi('');
      onClose(); // Modal'ı kapat
    }
  }, [onSave, onClose, planAdi]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Planı Kaydet</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Plan Adı"
          fullWidth
          variant="outlined"
          value={planAdi}
          onChange={handlePlanAdiChange}
          placeholder="Örn: 2025-2026 1. Dönem Sınav Planı"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>İptal</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
});



// Unplaced Students Drop Zone Component
const UnplacedStudentsDropZone = ({ children, onStudentMove }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPES.STUDENT,
    drop: (item, monitor) => {
      if (item.masaId !== null && onStudentMove) { // Salon masasından geliyorsa
        onStudentMove(item.masaId, null, item.ogrenci);
      }
      return { dropped: true };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
    options: {
      // Drop sensitivity'yi artır
      hoverOptions: {
        hoverDelay: 0, // Hemen hover algıla
      },
    },
  });

  const isActive = isOver && canDrop;
  let backgroundColor = 'grey.50';
  if (isActive) {
    backgroundColor = 'rgba(255, 193, 7, 0.1)'; // Sarı vurgu
  } else if (canDrop) {
    backgroundColor = 'rgba(255, 193, 7, 0.05)'; // Hafif sarı vurgu
  }

  return (
    <Box
      ref={drop}
      sx={{
        backgroundColor: backgroundColor,
        borderRadius: 2,
        border: '2px dashed',
        borderColor: isActive ? 'warning.main' : 'grey.300',
        transition: 'border-color 0.1s ease, background-color 0.1s ease',
        '&:hover': {
          borderColor: 'warning.main',
        }
      }}
    >
      {children}
    </Box>
  );
};

// Draggable Unplaced Student Component
const DraggableUnplacedStudent = ({ ogrenci }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPES.STUDENT,
    item: {
      masaId: null, // Yerleşmeyen öğrenci için masaId null
      ogrenci: ogrenci
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  return (
    <Chip
      ref={drag}
      label={`${ogrenci.ad} (${ogrenci.sinif})`}
      variant="outlined"
      color="warning"
      sx={{
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        '&:active': {
          cursor: 'grabbing'
        }
      }}
      title={`${ogrenci.ad} - ${ogrenci.sinif} - ${ogrenci.cinsiyet || 'Cinsiyet belirtilmemiş'}`}
    />
  );
};

const AnaSayfaContent = React.memo(() => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [seciliSalonId, setSeciliSalonId] = useState(null);
  const [showFirstTimeLoader, setShowFirstTimeLoader] = useState(false); // İlk açılış loading ekranı
  const { showSuccess, showError, showInfo } = useNotifications();

  // Exam context state & actions (erken tanımla - aşağıdaki effectler kullanıyor)
  const {
    // State
    ogrenciler,
    ayarlar,
    salonlar,
    yerlestirmeSonucu,
    aktifTab,
    yukleme,
    hata,
    isInitialized,
    isWriteAllowed,

    // Actions
    ogrencilerYukle,
    ayarlarGuncelle,
    salonlarGuncelle,
    yerlestirmeYap,
    yerlestirmeGuncelle,
    yerlestirmeTemizle,
    tabDegistir,
    yuklemeBaslat,
    hataAyarla,
    hataTemizle,
    ogrenciPin,
    ogrenciUnpin
  } = useExam();

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

  // Yazdırma menüsü için state
  const [printMenuAnchor, setPrintMenuAnchor] = useState(null);

  // Kaydetme için state'ler
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [activePlanMeta, setActivePlanMeta] = useState(null);
  const currentPlanDisplayName = activePlanMeta?.name || planManager.getCurrentPlanName() || '';

  // Salon Planı yazdırma fonksiyonu
  const handleSalonPlaniPrint = useReactToPrint({
    contentRef: salonPlaniPrintRef,
    documentTitle: 'Salon Planı',
    pageStyle: `
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
        @page {
          size: A4 landscape !important;
          margin: 0.5in !important;
        }
      }
    `
  });

  // Sınıf Listesi yazdırma fonksiyonu
  const handleSinifListesiPrint = useReactToPrint({
    contentRef: sinifListesiPrintRef,
    documentTitle: 'Sınıf Listesi',
    pageStyle: `
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
        .page-break { page-break-before: always; }
        .page-break-after { page-break-after: always; }
        @page {
          size: A4 portrait !important;
          margin: 0 !important;
        }
      }
    `
  });

  // Salon İmza Listesi yazdırma fonksiyonu
  const handleSalonImzaListesiPrint = useReactToPrint({
    contentRef: salonImzaListesiPrintRef,
    documentTitle: 'Salon İmza Listesi',
    pageStyle: `
      @media print {
        body { -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
        .page-break { page-break-before: always; }
        .page-break-after { page-break-after: always; }
        @page {
          size: A4 portrait !important;
          margin: 0 !important;
        }
      }
    `
  });

  // Yazdırma menüsü handler'ları - useCallback ile optimize edildi
  const handlePrintMenuOpen = useCallback((event) => {
    setPrintMenuAnchor(event.currentTarget);
  }, []);

  const handlePrintMenuClose = useCallback(() => {
    setPrintMenuAnchor(null);
  }, []);

  const handleSalonPlaniPrintClick = useCallback(() => {
    handleSalonPlaniPrint();
    handlePrintMenuClose();
  }, [handleSalonPlaniPrint, handlePrintMenuClose]);

  const handleSinifListesiPrintClick = useCallback(() => {
    handleSinifListesiPrint();
    handlePrintMenuClose();
  }, [handleSinifListesiPrint, handlePrintMenuClose]);

  const handleSalonImzaListesiPrintClick = useCallback(() => {
    handleSalonImzaListesiPrint();
    handlePrintMenuClose();
  }, [handleSalonImzaListesiPrint, handlePrintMenuClose]);

  const handleSavePlan = useCallback(async (planAdi, options) => {
    let onCloseCallback = undefined;
    let targetPlanId = null;

    if (typeof options === 'function') {
      onCloseCallback = options;
    } else if (options && typeof options === 'object') {
      onCloseCallback = options.onCloseCallback;
      targetPlanId = options.planId ?? null;
    }

    const trimmedPlanName = (planAdi || '').trim();

    if (!trimmedPlanName) {
      showError('Lütfen plan adı giriniz.');
      return;
    }

    if (!yerlestirmeSonucu) {
      showError('Kaydedilecek plan bulunamadı.');
      return;
    }

    // Modal'ı hemen kapat - kaydetme işlemi arka planda devam edecek
    if (onCloseCallback) {
      onCloseCallback();
    }
    setSaveDialogOpen(false);

    try {
      // Plan verisini hazırla - Ayarları derin kopyala (referans sorununu önlemek için)
      const ayarlarKopya = JSON.parse(JSON.stringify(ayarlar || {}));

      // Salonlar listesini ayarlardan kaldır (sistemde zaten kayıtlı olduğu için kaydetmeye gerek yok)
      const { kayitliSalonlar, ...ayarlarKopyaTemiz } = ayarlarKopya;

      // KRITIK: Plan kaydedilirken güncel verilerle yerlestirmeSonucu'yu güncelle
      // 1. Salon isimlerini güncelle (global salonlar listesinden)
      const guncelTumSalonlar = (yerlestirmeSonucu.tumSalonlar || []).map(salon => {
        // Global salonlar listesinden bu salonu bul
        const guncelSalon = salonlar.find(s => s.id === salon.id || s.salonId === salon.salonId);
        if (guncelSalon) {
          // Güncel salon bilgileriyle güncelle (isim, kapasite vb.)
          return {
            ...salon,
            ad: guncelSalon.ad || guncelSalon.salonAdi || salon.ad,
            salonAdi: guncelSalon.salonAdi || guncelSalon.ad || salon.salonAdi,
            kapasite: guncelSalon.kapasite || salon.kapasite,
            siraDizilimi: guncelSalon.siraDizilimi || salon.siraDizilimi
          };
        }
        return salon;
      });

      // 2. Ana salonu güncelle
      const guncelSalon = guncelTumSalonlar.find(s =>
        s.id === yerlestirmeSonucu.salon?.id ||
        s.salonId === yerlestirmeSonucu.salon?.salonId
      ) || yerlestirmeSonucu.salon;

      // 3. Silinen öğrencileri yerleşmeyen öğrenciler listesinden kaldır
      const mevcutOgrenciIdleri = new Set(ogrenciler.map(o => o.id));
      const guncelYerlesilemeyenOgrenciler = (yerlestirmeSonucu.yerlesilemeyenOgrenciler || [])
        .filter(ogrenci => mevcutOgrenciIdleri.has(ogrenci.id));

      // 4. Salon masalarındaki silinen öğrencileri temizle
      const guncelSalonMasalar = (guncelSalon?.masalar || []).map(masa => {
        if (masa.ogrenci && !mevcutOgrenciIdleri.has(masa.ogrenci.id)) {
          // Öğrenci silinmişse masadan kaldır
          return { ...masa, ogrenci: null };
        }
        return masa;
      });

      const guncelSalonFinal = guncelSalon ? {
        ...guncelSalon,
        masalar: guncelSalonMasalar,
        ogrenciler: guncelSalonMasalar
          .filter(m => m.ogrenci)
          .map(m => ({ ...m.ogrenci, masaNumarasi: m.masaNumarasi }))
      } : guncelSalon;

      // 5. TumSalonlar içindeki masaları da güncelle
      const guncelTumSalonlarFinal = guncelTumSalonlar.map(salon => {
        if (salon.id === guncelSalonFinal?.id || salon.salonId === guncelSalonFinal?.salonId) {
          return guncelSalonFinal;
        }
        // Diğer salonların masalarını da kontrol et
        const guncelMasalar = (salon.masalar || []).map(masa => {
          if (masa.ogrenci && !mevcutOgrenciIdleri.has(masa.ogrenci.id)) {
            return { ...masa, ogrenci: null };
          }
          return masa;
        });
        return {
          ...salon,
          masalar: guncelMasalar,
          ogrenciler: guncelMasalar
            .filter(m => m.ogrenci)
            .map(m => ({ ...m.ogrenci, masaNumarasi: m.masaNumarasi }))
        };
      });

      const planData = {
        salon: guncelSalonFinal,
        tumSalonlar: guncelTumSalonlarFinal,
        kalanOgrenciler: yerlestirmeSonucu.kalanOgrenciler || [],
        yerlesilemeyenOgrenciler: guncelYerlesilemeyenOgrenciler,
        istatistikler: yerlestirmeSonucu.istatistikler,
        // Ayarlar bilgilerini de kaydet (sadece dersler, salonlar listesi kaydedilmez)
        ayarlar: ayarlarKopyaTemiz,

        // Sabit atamalar (pinned students) - Tüm öğrenci listesinden çek
        sabitOgrenciler: ogrenciler.filter(o => o.pinned)
      };

      // DEBUG: Sınav bilgilerini kontrol et
      console.log('🔍 Plan kaydediliyor - Ayarlar:', {
        sinavTarihi: planData.ayarlar.sinavTarihi,
        sinavSaati: planData.ayarlar.sinavSaati,
        sinavDonemi: planData.ayarlar.sinavDonemi,
        donem: planData.ayarlar.donem
      });


      // DEBUG: Plan kaydetme öncesi veri kontrolü
      logger.debug('Plan kaydediliyor - Salon masaları: ' + (planData.salon?.masalar?.length || 0));
      logger.debug('Plan kaydediliyor - tumSalonlar sayısı: ' + (planData.tumSalonlar?.length || 0));
      if (planData.tumSalonlar && planData.tumSalonlar.length > 0) {
        logger.debug('Plan kaydediliyor - İlk salon masaları: ' + (planData.tumSalonlar[0]?.masalar?.length || 0));
      }

      // PlanManager ile kaydet - Firestore'a kayıt yap
      console.log('💾 Plan kaydetme başlatılıyor - Firestore\'a kaydedilecek:', trimmedPlanName);

      // Kaydetme başladı bildirimi göster
      showInfo(`Plan "${trimmedPlanName}" kaydediliyor...`);

      // DEBUG: DatabaseAdapter durumunu kontrol et
      const dbAdapter = await import('../database/index');
      const dbStatus = {
        useFirestore: dbAdapter.default.useFirestore,
        firestoreIsDisabled: dbAdapter.default.firestore?.isDisabled,
        dbType: dbAdapter.default.getDatabaseType(),
        firestoreDbMock: dbAdapter.default.firestore?.db?.mock
      };
      console.log('🔍 DatabaseAdapter durumu:', dbStatus);
      logger.info('🔍 DatabaseAdapter durumu:', dbStatus);

      // Firestore devre dışıysa kullanıcıya bilgi ver
      if (dbAdapter.default.firestore?.isDisabled) {
        console.warn('⚠️ Firestore devre dışı - Plan IndexedDB\'ye kaydedilecek');
        logger.warn('⚠️ Firestore devre dışı - Plan IndexedDB\'ye kaydedilecek');
      }

      // Hangi planın güncelleneceğini belirle
      const resolvedPlanId = targetPlanId ?? activePlanMeta?.id ?? planManager.getCurrentPlanId();
      let planId = null;
      let isUpdate = false;

      if (resolvedPlanId) {
        console.log('🔄 Mevcut plan güncelleniyor (ID eşleşmesi):', {
          planId: resolvedPlanId,
          planName: trimmedPlanName
        });
        isUpdate = true;
        planId = await planManager.updatePlan(resolvedPlanId, trimmedPlanName, planData);
      } else {
        planId = await planManager.savePlan(trimmedPlanName, planData);
      }

      if (!planId) {
        // planId null dönerse, muhtemelen test plan filtresi veya Firestore devre dışı
        console.warn('⚠️ Plan ID null döndü - muhtemelen test plan filtresi veya Firestore devre dışı');
        throw new Error('Plan kaydedilemedi. Plan ID alınamadı. Firestore aktif mi kontrol edin.');
      }

      // Plan ID tipine göre hangi veritabanına kaydedildiğini belirle
      const isFirestore = typeof planId === 'string' && isNaN(Number(planId));
      const isIndexedDB = typeof planId === 'number' || (typeof planId === 'string' && !isNaN(Number(planId)));

      if (isFirestore) {
        console.log('✅ Plan başarıyla Firestore\'a kaydedildi/güncellendi. Plan ID:', planId);
        logger.info('✅ Plan başarıyla Firestore\'a kaydedildi/güncellendi. Plan ID:', planId);
      } else if (isIndexedDB) {
        console.warn('⚠️ Plan IndexedDB\'ye kaydedildi (Firestore devre dışı). Plan ID:', planId);
        logger.warn('⚠️ Plan IndexedDB\'ye kaydedildi (Firestore devre dışı). Plan ID:', planId);
      }

      // Success mesajını göster (modal zaten kapatıldı)
      const finalPlanName = trimmedPlanName;
      const finalPlanId = planId;

      // Genel bildirim mesajı - hem Firestore hem IndexedDB için
      showSuccess(`Plan "${finalPlanName}" başarıyla veritabanına ${isUpdate ? 'güncellendi' : 'kaydedildi'}!`);

      setActivePlanMeta({
        id: finalPlanId,
        name: finalPlanName
      });

    } catch (error) {
      logger.error('❌ Plan kaydetme hatası:', error);

      // Hata mesajını göster (modal zaten kapatıldı)
      showError(`Plan kaydedilirken hata oluştu: ${error.message}`);
    }
  }, [yerlestirmeSonucu, salonlar, ayarlar, ogrenciler, showError, showSuccess, showInfo, activePlanMeta]);

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

    // LocalStorage'a kaydet
    try {
      localStorage.setItem('exam_ayarlar', JSON.stringify(yeniAyarlar));
    } catch (error) {
      console.error('❌ Ayarlar LocalStorage\'a kaydedilemedi:', error);
    }
  }, [ayarlarGuncelle, readOnly, showError]);

  const handleSalonlarDegistir = useCallback((yeniSalonlar) => {
    if (readOnly) {
      showError('Salon düzenleme yetkisi için yönetici girişi gerekli.');
      return;
    }
    salonlarGuncelle(yeniSalonlar);

    // LocalStorage'a kaydet
    try {
      // ExamContext'in beklediği anahtar ile kaydet
      localStorage.setItem('exam_salonlar', JSON.stringify(yeniSalonlar));
    } catch (error) {
      console.error('❌ Salonlar LocalStorage\'a kaydedilemedi:', error);
    }

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

  // Plan yükleme fonksiyonu
  const handlePlanYukle = async (plan) => {
    try {
      console.log('🔍 AnaSayfa.handlePlanYukle çağrıldı, plan:', plan);
      console.log('🔍 AnaSayfa.handlePlanYukle - plan tip:', typeof plan);
      console.log('🔍 AnaSayfa.handlePlanYukle - plan.id:', plan?.id);

      // Plan meta ve data referanslarını ayır
      let planMeta = null;
      let planData = null;

      if (plan && plan.data) {
        // KayitliPlanlar'dan { id, name, data } yapısı geldi
        planMeta = plan;
        planData = plan.data;
        console.log('✅ Plan meta + data birlikte geldi', {
          planId: planMeta.id,
          dataKeys: Object.keys(planData || {}),
          ayarlarVar: !!planData?.ayarlar,
          dersSayisi: planData?.ayarlar?.dersler?.length || 0
        });
        if (planMeta.id) {
          const activeName = planMeta.name || planData?.ayarlar?.planAdi || '';
          planManager.setCurrentPlan({
            id: planMeta.id,
            name: activeName
          });
          console.log('✅ Aktif plan set edildi (meta+data):', {
            id: planMeta.id,
            name: activeName,
            isActive: planManager.isCurrentPlanActive()
          });
        } else {
          planManager.clearCurrentPlan();
          console.log('ℹ️ Plan ID bulunamadı, aktif plan temizlendi');
        }
      } else if (plan && !plan.id && (plan.tumSalonlar || plan.salon)) {
        // Plan sadece data objesi olarak geldi
        console.log('✅ Plan verisi (yalnız data objesi) kullanılıyor');
        planData = plan;
        planManager.clearCurrentPlan();
        console.log('ℹ️ Yalnız data objesi yüklendi, aktif plan temizlendi');
      } else if (plan && plan.id) {
        // Plan ID'si var, veritabanından yükle
        console.log('📥 Plan ID ile yükleniyor:', plan.id);
        const loadedPlan = await planManager.loadPlan(plan.id);

        if (!loadedPlan || !loadedPlan.data) {
          showError('Plan verisi bulunamadı!');
          return;
        }

        planMeta = loadedPlan;
        planData = loadedPlan.data;
        planManager.setCurrentPlan({
          id: loadedPlan.id,
          name: loadedPlan.name || loadedPlan.data?.ayarlar?.planAdi || ''
        });
        console.log('✅ Aktif plan set edildi (loadPlan):', {
          id: loadedPlan.id,
          name: loadedPlan.name || loadedPlan.data?.ayarlar?.planAdi || '',
          isActive: planManager.isCurrentPlanActive()
        });
      } else {
        // Geçersiz plan objesi
        console.error('❌ Geçersiz plan objesi:', plan);
        showError('Plan verisi geçersiz!');
        return;
      }

      const resolvedPlanId = planMeta?.id ?? plan?.id ?? null;
      const resolvedPlanName = (planMeta?.name || planData?.ayarlar?.planAdi || plan?.name || '').trim();
      if (resolvedPlanId) {
        setActivePlanMeta({
          id: resolvedPlanId,
          name: resolvedPlanName || planMeta?.name || plan?.name || ''
        });
        console.log('✅ activePlanMeta güncellendi:', {
          id: resolvedPlanId,
          name: resolvedPlanName || planMeta?.name || plan?.name || '',
          source: 'handlePlanYukle'
        });
      } else {
        setActivePlanMeta(null);
        console.log('ℹ️ activePlanMeta temizlendi (plan ID bulunamadı)');
      }

      // Plan verisini yerlestirmeSonucu formatına dönüştür
      let tumSalonlarSirali = planData.tumSalonlar;

      // Salonları sayısal ID'ye göre sırala (string sıralama yerine)
      if (Array.isArray(tumSalonlarSirali) && tumSalonlarSirali.length > 0) {
        tumSalonlarSirali = [...tumSalonlarSirali].sort((a, b) => {
          const aId = parseInt(a.id || a.salonId || 0, 10);
          const bId = parseInt(b.id || b.salonId || 0, 10);
          return aId - bId;
        });
      }

      const yerlestirmeFormatinda = {
        id: resolvedPlanId,
        isArchived: planMeta?.isArchived || false,
        salon: planData.salon,
        tumSalonlar: tumSalonlarSirali,
        kalanOgrenciler: planData.kalanOgrenciler,
        yerlesilemeyenOgrenciler: planData.yerlesilemeyenOgrenciler,
        istatistikler: planData.istatistikler
      };

      // KRITIK: Salonların siraDizilimi'ni kontrol et ve eksikse ekle (SalonPlani bileşeni için gerekli)
      if (yerlestirmeFormatinda.salon && (!yerlestirmeFormatinda.salon.siraDizilimi || !yerlestirmeFormatinda.salon.siraDizilimi.satir)) {
        console.warn('⚠️ Ana salon siraDizilimi eksik, varsayılan değerler ekleniyor');
        yerlestirmeFormatinda.salon.siraDizilimi = yerlestirmeFormatinda.salon.siraDizilimi || {};
        const kapasite = yerlestirmeFormatinda.salon.kapasite || 30;
        yerlestirmeFormatinda.salon.siraDizilimi.satir = yerlestirmeFormatinda.salon.siraDizilimi.satir || Math.ceil(Math.sqrt(kapasite)) || 6;
        yerlestirmeFormatinda.salon.siraDizilimi.sutun = yerlestirmeFormatinda.salon.siraDizilimi.sutun || Math.ceil(kapasite / yerlestirmeFormatinda.salon.siraDizilimi.satir) || 5;
      }

      // TumSalonlar içindeki tüm salonların siraDizilimi'ni kontrol et
      if (yerlestirmeFormatinda.tumSalonlar && Array.isArray(yerlestirmeFormatinda.tumSalonlar)) {
        yerlestirmeFormatinda.tumSalonlar = yerlestirmeFormatinda.tumSalonlar.map(salon => {
          if (!salon.siraDizilimi || !salon.siraDizilimi.satir || !salon.siraDizilimi.sutun) {
            console.warn('⚠️ Salon siraDizilimi eksik, varsayılan değerler ekleniyor:', salon.salonAdi || salon.ad);
            salon.siraDizilimi = salon.siraDizilimi || {};
            const kapasite = salon.kapasite || 30;
            salon.siraDizilimi.satir = salon.siraDizilimi.satir || Math.ceil(Math.sqrt(kapasite)) || 6;
            salon.siraDizilimi.sutun = salon.siraDizilimi.sutun || Math.ceil(kapasite / salon.siraDizilimi.satir) || 5;
          }
          return salon;
        });
      }

      // Ayarlar ve dersler bilgilerini yükle (salonlar listesi değiştirilmez)
      if (planData.ayarlar) {
        console.log('🔄 Plan yükleme: ayarlar verisi bulundu', {
          dersSayisi: planData.ayarlar?.dersler?.length || 0,
          sinavTarihi: planData.ayarlar?.sinavTarihi,
          keys: Object.keys(planData.ayarlar)
        });
        // Salonlar listesini ayarlardan kaldır (sistemde zaten kayıtlı olduğu için güncellemeye gerek yok)
        const { kayitliSalonlar, ...ayarlarTemiz } = planData.ayarlar;
        console.log('🔄 Plan yükleme: ayarlarTemiz', ayarlarTemiz);
        ayarlarGuncelle(ayarlarTemiz);
      } else {
        console.warn('⚠️ Plan yükleme: ayarlar verisi bulunamadı, meta üzerinden toparlanmaya çalışılıyor');
        if (planMeta) {
          const metaFallback = {
            sinavTarihi: planMeta.sinavTarihi || ayarlar.sinavTarihi || '',
            sinavSaati: planMeta.sinavSaati || ayarlar.sinavSaati || '',
            sinavDonemi: planMeta.sinavDonemi || ayarlar.sinavDonemi || '1',
            donem: planMeta.donem || ayarlar.donem || '1',
            dersler: planData?.dersler || ayarlar.dersler || []
          };
          console.log('🔄 Plan yükleme: meta fallback ayarlar kullanılıyor', metaFallback);
          ayarlarGuncelle(metaFallback);
        } else {
          console.warn('⚠️ Plan meta bulunamadı, mevcut ayarlar korunacak');
        }
      }

      // NOT: Salonlar listesi sistemde zaten kayıtlı olduğu için plan yükleme sırasında güncellenmez

      // CRITICAL: Salon objesinde masalar array'i eksikse, tumSalonlar'dan al
      if (yerlestirmeFormatinda.salon && (!yerlestirmeFormatinda.salon.masalar || yerlestirmeFormatinda.salon.masalar.length === 0)) {
        // İlk salonu bul ve masalarını al
        const ilkSalon = yerlestirmeFormatinda.tumSalonlar?.[0];
        if (ilkSalon && ilkSalon.masalar) {
          yerlestirmeFormatinda.salon.masalar = ilkSalon.masalar;
        }
      }

      // Masa numaralarını yeniden hesapla - Tüm salonlar için
      if (yerlestirmeFormatinda.tumSalonlar && yerlestirmeFormatinda.tumSalonlar.length > 0) {
        yerlestirmeFormatinda.tumSalonlar = yerlestirmeFormatinda.tumSalonlar.map(salon => {
          if (salon.masalar && Array.isArray(salon.masalar)) {
            // Masa numaralarını yeniden hesapla
            const masalarWithNumbers = calculateDeskNumbersForMasalar(salon.masalar);
            return {
              ...salon,
              masalar: masalarWithNumbers
            };
          }
          return salon;
        });

        // Ana salon masalarını da güncelle
        if (yerlestirmeFormatinda.salon && yerlestirmeFormatinda.salon.masalar) {
          yerlestirmeFormatinda.salon.masalar = yerlestirmeFormatinda.tumSalonlar[0]?.masalar || yerlestirmeFormatinda.salon.masalar;
        }
      }

      console.log('🔄 Plan yükleme: yerlestirmeFormatinda hazırlandı', {
        salon: yerlestirmeFormatinda.salon?.salonAdi,
        tumSalonlar: yerlestirmeFormatinda.tumSalonlar?.length,
        dersler: planData.ayarlar?.dersler?.length || 0
      });

      yerlestirmeGuncelle(yerlestirmeFormatinda);

      // Plan verisindeki pinned bilgilerini öğrenci listesine geri yükle
      // Önce: Explicit sabitOgrenciler listesi var mı kontrol et (Yeni sistem)
      const hasExplicitSabit = planData.sabitOgrenciler && Array.isArray(planData.sabitOgrenciler);

      if (hasExplicitSabit) {
        console.log(`📌 Plan verisinde ${planData.sabitOgrenciler.length} adet explicit sabit öğrenci bulundu.`);

        // Mevcut tüm sabitleri temizle ve plan'dakileri yükle
        ogrenciler.forEach(ogrenci => {
          const planSabit = planData.sabitOgrenciler.find(ps => ps.id?.toString() === ogrenci.id?.toString());
          if (planSabit) {
            // Plan'da sabit ise, pinle
            ogrenciPin(ogrenci.id, planSabit.pinnedSalonId, planSabit.pinnedMasaId);
          } else if (ogrenci.pinned) {
            // Plan'da sabit değil ama şu an sabitse, unpinle
            ogrenciUnpin(ogrenci.id);
          }
        });
      } else {
        // Eski sistem: Pinned bilgilerini yerleşim sonuçlarından (masalardan vs.) infer et
        console.log('⚠️ Plan verisinde explicit sabit listesi yok, infer ediliyor...');
        const planOgrencileri = new Map();

        // Salon masalarındaki öğrencileri topla
        if (yerlestirmeFormatinda.tumSalonlar && Array.isArray(yerlestirmeFormatinda.tumSalonlar)) {
          yerlestirmeFormatinda.tumSalonlar.forEach(salon => {
            if (salon.masalar && Array.isArray(salon.masalar)) {
              salon.masalar.forEach(masa => {
                if (masa.ogrenci && masa.ogrenci.id) {
                  planOgrencileri.set(masa.ogrenci.id.toString(), {
                    ...masa.ogrenci,
                    pinned: masa.ogrenci.pinned || false,
                    pinnedSalonId: masa.ogrenci.pinnedSalonId || null,
                    pinnedMasaId: masa.ogrenci.pinnedMasaId || null
                  });
                }
              });
            }
          });
        }

        // Yerleşemeyen öğrencileri de topla
        if (yerlestirmeFormatinda.yerlesilemeyenOgrenciler && Array.isArray(yerlestirmeFormatinda.yerlesilemeyenOgrenciler)) {
          yerlestirmeFormatinda.yerlesilemeyenOgrenciler.forEach(ogrenci => {
            if (ogrenci && ogrenci.id) {
              planOgrencileri.set(ogrenci.id.toString(), {
                ...ogrenci,
                pinned: ogrenci.pinned || false,
                pinnedSalonId: ogrenci.pinnedSalonId || null,
                pinnedMasaId: ogrenci.pinnedMasaId || null
              });
            }
          });
        }

        // Öğrenci listesindeki pinned bilgilerini plan verisinden güncelle
        if (planOgrencileri.size > 0) {
          ogrenciler.forEach(ogrenci => {
            const planOgrenci = planOgrencileri.get(ogrenci.id?.toString());
            if (planOgrenci && (planOgrenci.pinned || planOgrenci.pinnedSalonId || planOgrenci.pinnedMasaId)) {
              ogrenciPin(ogrenci.id, planOgrenci.pinnedSalonId, planOgrenci.pinnedMasaId);
            } else if (ogrenci.pinned) {
              ogrenciUnpin(ogrenci.id);
            }
          });
        }
      }

      tabDegistir('salon-plani');

      showSuccess('Plan başarıyla yüklendi!');

    } catch (error) {
      console.error('❌ Plan yükleme hatası:', error);
      showError(`Plan yüklenirken hata oluştu: ${error.message}`);
    }
  };


  // Masa numarası hesaplama fonksiyonu
  const calculateDeskNumberForMasa = useCallback((masa) => {
    if (!masa || !yerlestirmeSonucu?.salon?.masalar) return masa?.id + 1 || 1;

    // Tüm masaları al ve grup bazlı sıralama yap
    const allMasalar = yerlestirmeSonucu.salon.masalar;
    const gruplar = {};

    allMasalar.forEach(m => {
      const grup = m.grup || 1;
      if (!gruplar[grup]) gruplar[grup] = [];
      gruplar[grup].push(m);
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

      for (const m of sortedGrupMasalar) {
        if (m.id === masa.id) {
          return masaNumarasi;
        }
        masaNumarasi++;
      }
    }

    return masa.id + 1; // Fallback
  }, [yerlestirmeSonucu]);

  // Drag & Drop: Öğrenci taşıma ve masa numarası güncelleme
  const handleStudentMove = useCallback((action, data) => {
    // Public modda yerleşim planları değiştirilemez
    if (readOnly) {
      showError('Yerleşim planını değiştirmek için yönetici olarak giriş yapmalısınız.');
      return;
    }

    if (action === 'update_desk_number') {
      // Öğrenci listesinde masa numarasını güncelle
      const updatedOgrenciler = ogrenciler.map(ogrenci =>
        ogrenci.id === data.studentId
          ? { ...ogrenci, masaNumarasi: data.deskNumber }
          : ogrenci
      );
      ogrencilerYukle(updatedOgrenciler);
      return;
    }

    // Normal drag & drop işlemleri
    const { from, to, draggedStudent } = data || {};
    const fromMasaId = from;
    const toMasaId = to;

    if (!yerlestirmeSonucu || !yerlestirmeSonucu.salon) {
      return;
    }

    const currentSalon = yerlestirmeSonucu.salon;
    const fromMasa = currentSalon.masalar?.find(m => m.id === fromMasaId);
    const toMasa = currentSalon.masalar?.find(m => m.id === toMasaId);


    // Yerleşmeyen öğrenciden salona taşıma
    if (fromMasaId === null && toMasa) {
      // Drag edilen öğrenci bilgisini kullan
      const ogrenciToMove = draggedStudent || yerlestirmeSonucu.yerlesilemeyenOgrenciler?.[0];
      if (ogrenciToMove && !toMasa.ogrenci) {
        const updatedYerlesilemeyen = yerlestirmeSonucu.yerlesilemeyenOgrenciler.filter(o => o.id !== ogrenciToMove.id);
        const updatedSalonMasalar = currentSalon.masalar.map(m =>
          m.id === toMasa.id ? { ...m, ogrenci: { ...ogrenciToMove, masaNumarasi: toMasa.masaNumarasi || calculateDeskNumberForMasa(toMasa) } } : m
        );
        const updatedSalonOgrenciler = [...currentSalon.ogrenciler, { ...ogrenciToMove, masaNumarasi: toMasa.masaNumarasi || calculateDeskNumberForMasa(toMasa) }];

        // Güncellenmiş salon
        const updatedSalon = { ...currentSalon, masalar: updatedSalonMasalar, ogrenciler: updatedSalonOgrenciler };

        // tumSalonlar listesini de güncelle
        const updatedTumSalonlar = yerlestirmeSonucu.tumSalonlar.map(salon =>
          salon.id === currentSalon.id ? updatedSalon : salon
        );

        // İstatistikleri güncelle
        const mevcutIstatistikler = yerlestirmeSonucu.istatistikler || {};
        const updatedIstatistikler = {
          ...mevcutIstatistikler,
          yerlesenOgrenci: (mevcutIstatistikler.yerlesenOgrenci || 0) + 1,
          yerlesemeyenOgrenci: (mevcutIstatistikler.yerlesemeyenOgrenci || 0) - 1
        };

        const updatedYerlestirmeSonucu = {
          ...yerlestirmeSonucu,
          salon: updatedSalon,
          tumSalonlar: updatedTumSalonlar,
          yerlesilemeyenOgrenciler: updatedYerlesilemeyen,
          istatistikler: updatedIstatistikler
        };

        yerlestirmeGuncelle(updatedYerlestirmeSonucu);

        // LocalStorage kaydetme artık ExamContext'te yapılıyor
      }
      return;
    }

    // Öğrenciyi salondan çıkarma (toMasaId === null)
    if (fromMasa && fromMasa.ogrenci && toMasaId === null) {
      const cikarilanOgrenci = fromMasa.ogrenci;

      // Salon masa listesini güncelle (Yeni array oluştur - mutasyondan kaçın)
      const updatedSalonMasalar = currentSalon.masalar.map(m =>
        m.id === fromMasa.id ? { ...m, ogrenci: null } : m
      );

      // Salon öğrenci listesinden çıkar
      const updatedSalonOgrenciler = (currentSalon.ogrenciler || []).filter(o => o.id !== cikarilanOgrenci.id);

      // Güncellenmiş salon
      const updatedSalon = {
        ...currentSalon,
        masalar: updatedSalonMasalar,
        ogrenciler: updatedSalonOgrenciler
      };

      // tumSalonlar listesini de güncelle
      const updatedTumSalonlar = yerlestirmeSonucu.tumSalonlar.map(salon =>
        salon.id === currentSalon.id ? updatedSalon : salon
      );

      // Öğrenciyi yerleşmeyen listesine ekle
      const updatedYerlesilemeyen = [...(yerlestirmeSonucu.yerlesilemeyenOgrenciler || []), cikarilanOgrenci];

      // İstatistikleri güncelle
      const mevcutIstatistikler = yerlestirmeSonucu.istatistikler || {};
      const updatedIstatistikler = {
        ...mevcutIstatistikler,
        yerlesenOgrenci: (mevcutIstatistikler.yerlesenOgrenci || 0) - 1,
        yerlesemeyenOgrenci: (mevcutIstatistikler.yerlesemeyenOgrenci || 0) + 1
      };

      const updatedYerlestirmeSonucu = {
        ...yerlestirmeSonucu,
        salon: updatedSalon,
        tumSalonlar: updatedTumSalonlar,
        yerlesilemeyenOgrenciler: updatedYerlesilemeyen,
        istatistikler: updatedIstatistikler
      };

      yerlestirmeGuncelle(updatedYerlestirmeSonucu);

      // LocalStorage kaydetme artık ExamContext'te yapılıyor
      return;
    }

    if (!fromMasa || !toMasa || !fromMasa.ogrenci) {
      return;
    }

    // Yer değiştirme mantığı
    const fromOgrenci = fromMasa.ogrenci;
    const toOgrenci = toMasa.ogrenci; // Boş koltuk için null olabilir

    // Öğrencileri değiştir
    fromMasa.ogrenci = toOgrenci; // Boş koltuk için null
    toMasa.ogrenci = fromOgrenci;

    // Salon öğrenci listesini de güncelle
    const updatedSalonOgrenciler = currentSalon.ogrenciler.map(ogrenci => {
      if (ogrenci.id === fromOgrenci.id) {
        return { ...ogrenci, masaNumarasi: toMasa.masaNumarasi || calculateDeskNumberForMasa(toMasa) };
      } else if (toOgrenci && ogrenci.id === toOgrenci.id) {
        return { ...ogrenci, masaNumarasi: fromMasa.masaNumarasi || calculateDeskNumberForMasa(fromMasa) };
      }
      return ogrenci;
    });

    // Güncellenmiş salon
    const updatedSalon = { ...currentSalon, ogrenciler: updatedSalonOgrenciler };

    // tumSalonlar listesini de güncelle
    const updatedTumSalonlar = yerlestirmeSonucu.tumSalonlar.map(salon =>
      salon.id === currentSalon.id ? updatedSalon : salon
    );

    // State'i anında güncelle - gecikme olmasın
    yerlestirmeGuncelle({
      salon: updatedSalon,
      tumSalonlar: updatedTumSalonlar
    });

    // LocalStorage kaydetme artık ExamContext'te yapılıyor
  }, [yerlestirmeSonucu, yerlestirmeGuncelle, readOnly, showError]);

  // Transfer işlemi
  const handleStudentTransfer = useCallback(async (transferData) => {
    if (readOnly) {
      showError('Öğrenci transferi yapmak için yönetici olarak giriş yapmalısınız.');
      return;
    }
    try {
      const result = await transferManager.executeTransfer(transferData);

      // Yerleştirme sonucunu güncelle - Deep copy ile
      // KRİTİK: Hem id hem de salonId property'lerini kontrol et
      const updatedTumSalonlar = (yerlestirmeSonucu.tumSalonlar || []).map(salon => {
        // Kaynak salonu güncelle - id veya salonId eşleşmesi
        if (salon.id === result.fromSalon.id ||
          salon.salonId === result.fromSalon.salonId ||
          salon.id === result.fromSalon.salonId ||
          salon.salonId === result.fromSalon.id) {
          return result.fromSalon;
        }
        // Hedef salonu güncelle - id veya salonId eşleşmesi
        if (salon.id === result.toSalon.id ||
          salon.salonId === result.toSalon.salonId ||
          salon.id === result.toSalon.salonId ||
          salon.salonId === result.toSalon.id) {
          return result.toSalon;
        }
        // Diğer salonları olduğu gibi bırak
        return salon;
      });

      // Mevcut salonu güncelle (eğer transfer edilen salon mevcut salon ise)
      let updatedCurrentSalon = yerlestirmeSonucu.salon;
      const currentSalonId = yerlestirmeSonucu.salon?.id || yerlestirmeSonucu.salon?.salonId;
      const fromSalonId = result.fromSalon.id || result.fromSalon.salonId;
      const toSalonId = result.toSalon.id || result.toSalon.salonId;

      if (currentSalonId === fromSalonId ||
        yerlestirmeSonucu.salon?.id === result.fromSalon.id ||
        yerlestirmeSonucu.salon?.salonId === result.fromSalon.salonId) {
        updatedCurrentSalon = result.fromSalon;
      } else if (currentSalonId === toSalonId ||
        yerlestirmeSonucu.salon?.id === result.toSalon.id ||
        yerlestirmeSonucu.salon?.salonId === result.toSalon.salonId) {
        updatedCurrentSalon = result.toSalon;
      }

      // KRİTİK: İstatistikleri yeniden hesapla - tumSalonlar üzerinden
      // Transfer işlemi sonrasında toplam ve yerleşen öğrenci sayısı değişmemeli
      // (öğrenci bir salondan diğerine taşınıyor, yeni öğrenci eklenmiyor)
      const calculateYerlesenOgrenciSayisi = (salonlar) => {
        const uniqueIds = new Set();
        salonlar.forEach(salon => {
          if (salon.masalar && Array.isArray(salon.masalar)) {
            salon.masalar.forEach(masa => {
              if (masa.ogrenci && masa.ogrenci.id != null) {
                uniqueIds.add(String(masa.ogrenci.id));
              }
            });
          }
        });
        return uniqueIds.size;
      };

      const yerlesenOgrenciSayisi = calculateYerlesenOgrenciSayisi(updatedTumSalonlar);
      const mevcutIstatistikler = yerlestirmeSonucu.istatistikler || {};

      // İstatistikleri güncelle - toplam öğrenci sayısı değişmemeli
      const updatedIstatistikler = {
        ...mevcutIstatistikler,
        yerlesenOgrenci: yerlesenOgrenciSayisi,
        // Toplam öğrenci sayısı değişmemeli (transfer yeni öğrenci eklemiyor)
        toplamOgrenci: mevcutIstatistikler.toplamOgrenci || ogrenciler.length,
        // Yerleşemeyen öğrenci sayısı = Toplam - Yerleşen
        yerlesemeyenOgrenci: (mevcutIstatistikler.toplamOgrenci || ogrenciler.length) - yerlesenOgrenciSayisi
      };

      yerlestirmeGuncelle({
        ...yerlestirmeSonucu,
        salon: updatedCurrentSalon,
        tumSalonlar: updatedTumSalonlar,
        istatistikler: updatedIstatistikler
      });

      showSuccess(`✅ ${result.student.ad} ${result.student.soyad} başarıyla transfer edildi!`);

    } catch (error) {
      showError(`❌ Transfer hatası: ${error.message}`);
      throw error;
    }
  }, [yerlestirmeSonucu, yerlestirmeGuncelle, showSuccess, showError, readOnly, ogrenciler]);

  const handleYerlestirmeYap = () => {
    if (readOnly) {
      showError('Yerleştirme yapmak için yönetici olarak giriş yapmalısınız.');
      return;
    }
    if (ogrenciler.length === 0) {
      hataAyarla('Lütfen öğrenci ekleyin!');
      return;
    }

    if (!salonlar || salonlar.length === 0) {
      hataAyarla('Lütfen salon ekleyin!');
      return;
    }

    if (!ayarlar.dersler || ayarlar.dersler.length === 0) {
      hataAyarla('Lütfen ders ekleyin!');
      return;
    }

    planManager.invalidateCurrentPlan('yerlestirme_yap');
    setActivePlanMeta(null);

    try {
      yuklemeBaslat();

      // Algoritmanın çalışmasını bir sonraki "tick"e erteleyerek
      // UI'nin güncellenmesine izin ver
      setTimeout(() => {
        try {
          let sonuc;
          const baslangicZamani = performance.now();

          // Sadece aktif salonları kullan
          const aktifSalonlar = salonlar.filter(salon => salon.aktif !== false);

          if (aktifSalonlar.length === 0) {
            throw new Error('Aktif salon bulunamadı! Lütfen en az bir salonu aktif hale getirin.');
          }

          // Seçili sınıflardaki öğrencileri filtrele
          const seciliSiniflar = [];
          if (ayarlar?.dersler && ayarlar.dersler.length > 0) {
            ayarlar.dersler.forEach(ders => {
              if (ders.siniflar && ders.siniflar.length > 0) {
                seciliSiniflar.push(...ders.siniflar);
              }
            });
          }

          // Benzersiz sınıfları al
          const benzersizSeciliSiniflar = [...new Set(seciliSiniflar)];

          // Seçili sınıflardaki öğrencileri filtrele
          const seciliSinifOgrencileri = ogrenciler.filter(ogrenci =>
            benzersizSeciliSiniflar.includes(ogrenci.sinif)
          );


          if (seciliSinifOgrencileri.length === 0) {
            throw new Error('Seçili sınıflarda öğrenci bulunamadı! Lütfen ders ayarlarında sınıf seçimi yapın.');
          }

          // Gelişmiş yerleştirme algoritması kullanılıyor - sadece seçili sınıf öğrencileri
          sonuc = gelismisYerlestirme(seciliSinifOgrencileri, aktifSalonlar, ayarlar);

          // KRİTİK DÜZELTME: İstatistikleri gerçek öğrenci sayısına göre güncelle
          if (sonuc && sonuc.istatistikler) {
            sonuc.istatistikler.toplamOgrenci = ogrenciler.length; // Tüm öğrenci sayısı
            sonuc.istatistikler.yerlesemeyenOgrenci = ogrenciler.length - sonuc.istatistikler.yerlesenOgrenci;
          }


          const bitisZamani = performance.now();
          const islemSuresi = bitisZamani - baslangicZamani;

          if (!sonuc || !sonuc.salonlar || sonuc.salonlar.length === 0) {
            throw new Error('Algoritma geçerli sonuç döndürmedi');
          }

          // Sonucu formatla (eski sistemle uyumlu hale getir)
          const formatlanmisSonuc = formatYerlestirmeSonucu(sonuc);

          yerlestirmeYap(formatlanmisSonuc);
          tabDegistir('salon-plani');
        } catch (error) {
          console.error('Yerleştirme hatası:', error);
          hataAyarla(`Yerleştirme sırasında bir hata oluştu: ${error.message}`);
        }
      }, 50); // 50 milisaniye gecikme
    } catch (error) {
      console.error('Yerleştirme başlatma hatası:', error);
      hataAyarla(`Yerleştirme başlatılamadı: ${error.message}`);
    }
  };

  // Yerleştirme sonucunu eski sistemle uyumlu hale getirir
  const formatYerlestirmeSonucu = (sonuc) => {
    // İlk salonun öğrencilerini al (varsayılan olarak)
    const ilkSalon = sonuc.salonlar[0];
    if (!ilkSalon) {
      return {
        salon: {
          id: 'A-101',
          kapasite: ogrenciler.length,
          siraDizilimi: {
            satir: Math.ceil(Math.sqrt(ogrenciler.length)),
            sutun: Math.ceil(ogrenciler.length / Math.ceil(Math.sqrt(ogrenciler.length)))
          },
          ad: 'Sınav Salonu'
        },
        kalanOgrenciler: sonuc.yerlesilemeyenOgrenciler || [],
        yerlesilemeyenOgrenciler: sonuc.yerlesilemeyenOgrenciler || [], // Yerleşmeyen öğrenciler için ayrı property
        istatistikler: sonuc.istatistikler,
        tumSalonlar: []
      };
    }

    // Tüm salonları formatla
    const formatlanmisSalonlar = sonuc.salonlar.map(salon => {
      // KRİTİK GÜVENLİK: Duplicate'ları temizle
      const uniqueOgrenciler = [];
      const seenIds = new Set();

      if (salon.ogrenciler && Array.isArray(salon.ogrenciler)) {
        salon.ogrenciler.forEach(ogrenci => {
          if (ogrenci && ogrenci.id && !seenIds.has(ogrenci.id)) {
            uniqueOgrenciler.push(ogrenci);
            seenIds.add(ogrenci.id);
          }
        });
      }

      if (uniqueOgrenciler.length !== salon.ogrenciler?.length) {
        console.warn(`⚠️ ${salon.salonAdi}: ${salon.ogrenciler?.length || 0} -> ${uniqueOgrenciler.length} öğrenci (${(salon.ogrenciler?.length || 0) - uniqueOgrenciler.length} duplicate temizlendi)`);
      }

      // KRİTİK: Gerçek salon kapasitesini hesapla (masa sayısı)
      const gercekKapasite = salon.koltukMatrisi?.masalar?.length || salon.koltukMatrisi?.satirSayisi * salon.koltukMatrisi?.sutunSayisi || 0;

      const formatlanmisSalon = {
        id: salon.salonId, // SalonPlani için id property'si ekle
        salonId: salon.salonId,
        salonAdi: salon.salonAdi,
        kapasite: gercekKapasite, // KRİTİK DÜZELTME: Gerçek salon kapasitesi (masa sayısı)
        siraDizilimi: salon.siraDizilimi || (salon.koltukMatrisi?.satirSayisi && salon.koltukMatrisi?.sutunSayisi ? {
          satir: salon.koltukMatrisi.satirSayisi,
          sutun: salon.koltukMatrisi.sutunSayisi
        } : {
          satir: Math.ceil(Math.sqrt(gercekKapasite || 30)) || 6,
          sutun: Math.ceil((gercekKapasite || 30) / (Math.ceil(Math.sqrt(gercekKapasite || 30)) || 6)) || 5
        }),
        ogrenciler: uniqueOgrenciler, // DÜZELTME: Temizlenmiş liste
        masalar: [],
        plan: salon.plan || [] // Plan verisini ekle
      };

      // Gerçek grup yapısını kullan - koltukMatrisi.masalar'dan

      formatlanmisSalon.masalar = salon.koltukMatrisi.masalar.map((koltuk) => {
        // Plan matrisinden öğrenciyi bul (doğru eşleştirme)
        const ogrenci = salon.plan?.find(p =>
          p.satir === koltuk.satir &&
          p.sutun === koltuk.sutun &&
          p.grup === koltuk.grup
        )?.ogrenci || null;

        return {
          id: koltuk.id,
          masaNumarasi: koltuk.masaNumarasi || calculateDeskNumberForMasa(koltuk),
          ogrenci: ogrenci,
          satir: koltuk.satir,
          sutun: koltuk.sutun,
          grup: koltuk.grup,
          koltukTipi: koltuk.koltukTipi
        };
      });

      return formatlanmisSalon;
    });

    // İlk salonu varsayılan olarak seç
    const varsayilanSalon = formatlanmisSalonlar[0];

    return {
      salon: varsayilanSalon,
      kalanOgrenciler: sonuc.yerlesilemeyenOgrenciler || [],
      yerlesilemeyenOgrenciler: sonuc.yerlesilemeyenOgrenciler || [], // Yerleşmeyen öğrenciler için ayrı property
      istatistikler: sonuc.istatistikler,
      tumSalonlar: formatlanmisSalonlar // Formatlanmış tüm salonları sakla
    };
  };

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
        // Sadece aktif salonları göster
        const aktifSalonlar = salonlar?.filter(salon => salon.aktif !== false) || [];

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

          {/* Gizli PDF Export Bileşeni - Lazy loaded */}
          {yerlestirmeSonucu && (
            <Box sx={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden' }}>
              <Suspense fallback={null}>
                <LazySalonPlaniPrintable
                  ref={salonPlaniPrintRef}
                  yerlestirmeSonucu={yerlestirmeSonucu}
                  ayarlar={ayarlar}
                />
              </Suspense>
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
          {/* Salon Planı - Lazy loaded */}
          <Suspense fallback={null}>
            <LazySalonPlaniPrintable
              ref={salonPlaniPrintRef}
              yerlestirmeSonucu={yerlestirmeSonucu}
              ayarlar={ayarlar}
            />
          </Suspense>

          {/* Sınıf Listesi - Lazy loaded */}
          <Suspense fallback={null}>
            <LazySalonOgrenciListesiPrintable
              ref={sinifListesiPrintRef}
              ogrenciler={ogrenciler}
              yerlestirmeSonucu={yerlestirmeSonucu}
              ayarlar={ayarlar}
            />
          </Suspense>

          {/* Salon İmza Listesi - Lazy loaded */}
          <Suspense fallback={null}>
            <LazySalonImzaListesiPrintable
              ref={salonImzaListesiPrintRef}
              yerlestirmeSonucu={yerlestirmeSonucu}
              ayarlar={ayarlar}
              tumOgrenciler={ogrenciler}
            />
          </Suspense>
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