import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  DialogActions
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
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';

import Header from '../components/Header';
import Footer from '../components/Footer';
import SalonPlani from '../components/SalonPlani';
import { SalonPlaniPrintable } from '../components/SalonPlaniPrintable';
import { SalonOgrenciListesiPrintable } from '../components/SalonOgrenciListesiPrintable';
import { SalonImzaListesiPrintable } from '../components/SalonImzaListesiPrintable';
import GenelAyarlarFormu from '../components/GenelAyarlarFormu';
import OgrenciListesi from '../components/OgrenciListesi';
import AyarlarFormu from '../components/AyarlarFormu';
import SalonFormu from '../components/SalonFormu';
import PlanlamaYap from '../components/PlanlamaYap';
import { useExam } from '../context/ExamContext';
import { useNotifications, NotificationProvider } from '../components/NotificationSystem';
import { gelismisYerlestirme } from '../algorithms/gelismisYerlestirmeAlgoritmasi';
import { calculateDeskNumbersForMasalar } from '../algorithms/gelismisYerlestirmeAlgoritmasi';
import planManager from '../utils/planManager';
import { DatabaseTestLazy, TestDashboardLazy, WelcomePageLazy } from '../components/LazyComponents';
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
  const handleSave = useCallback(() => {
    onSave(planAdi);
    setPlanAdi('');
  }, [onSave, planAdi]);
  
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


// Kayıtlı Planlar Bileşeni
const KayitliPlanlar = ({ onPlanYukle }) => {
  const [kayitliPlanlar, setKayitliPlanlar] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showSuccess, showError } = useNotifications();

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const allPlans = await planManager.getAllPlans();
      
      // Geçici kayıtları filtrele (kullanıcı tarafından kaydedilen planları göster)
      const filteredPlans = allPlans.filter(plan => {
        // plan.id'nin string olduğundan emin ol
        const planId = String(plan.id || '');
        const planName = String(plan.name || '');
        
        return !planName.includes('Geçici Plan') && 
               !planId.startsWith('temp_');
      });
      
      // Son eklenen kayıtlar en sağda olacak şekilde sırala (tarihe göre artan sıralama)
      const sortedPlans = filteredPlans.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0);
        const dateB = new Date(b.date || b.createdAt || 0);
        return dateA - dateB; // Eski tarihler önce, yeni tarihler sonra
      });
      
      setKayitliPlanlar(sortedPlans);
    } catch (error) {
      logger.error('❌ Planlar yüklenirken hata:', error);
      showError('Planlar yüklenirken hata oluştu!');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handlePlanSil = async (planId) => {
    try {
      await planManager.deletePlan(planId);
      showSuccess('Plan silindi!');
      loadPlans();
    } catch (error) {
      logger.error('❌ Plan silme hatası:', error);
      showError('Plan silinirken hata oluştu!');
    }
  };

  // Geçici kayıtları temizleme fonksiyonu
  const handleCleanupTempPlans = async () => {
    try {
      console.log('🧹 Geçici kayıtlar temizleme başlatılıyor...');
      const { cleanupTempPlans } = await import('../utils/cleanupTempPlans');
      const result = await cleanupTempPlans();
      
      console.log('📊 Temizleme sonucu:', result);
      
      if (result.success) {
        if (result.deletedCount > 0) {
          showSuccess(`${result.deletedCount} geçici kayıt temizlendi!`);
        } else {
          showSuccess('Temizlenecek geçici kayıt bulunamadı.');
        }
        loadPlans(); // Listeyi yenile
      } else {
        console.error('❌ Temizleme başarısız:', result.error);
        showError(`Geçici kayıtlar temizlenirken hata oluştu: ${result.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('❌ Geçici kayıtlar temizlenirken hata:', error);
      logger.error('❌ Geçici kayıt temizleme hatası:', error);
      showError(`Geçici kayıtlar temizlenirken hata oluştu: ${error.message}`);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Card elevation={2}>
        <CardContent>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: { xs: 2, sm: 3 },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}>
            <Typography variant="h5" gutterBottom sx={{ 
              mb: 0,
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}>
              Kayıtlı Planlar
            </Typography>
            <Button
              variant="outlined"
              color="warning"
              size="small"
              onClick={handleCleanupTempPlans}
              sx={{ 
                ml: { xs: 0, sm: 2 },
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1, sm: 2 }
              }}
            >
              Geçici Kayıtları Temizle
            </Button>
          </Box>
      
      {isLoading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : kayitliPlanlar.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Henüz kayıtlı plan bulunmuyor
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Salon Planı sekmesinde bir plan oluşturup kaydedebilirsiniz
          </Typography>
        </Box>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 2, 
          justifyContent: 'center',
          alignItems: 'flex-start',
          maxWidth: '1200px', 
          mx: 'auto',
          px: 2
        }}>
          {kayitliPlanlar.map((plan) => (
            <Card key={plan.id} sx={{ p: 2, width: '300px', flex: '0 0 300px' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {plan.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Kayıt Tarihi: {(() => {
                    try {
                      const tarih = new Date(plan.date);
                      if (isNaN(tarih.getTime())) {
                        return plan.date || 'Bilinmiyor';
                      }
                      return tarih.toLocaleDateString('tr-TR');
                    } catch (error) {
                      return plan.date || 'Bilinmiyor';
                    }
                  })()}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Toplam Öğrenci: {plan.totalStudents || 0}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Salon Sayısı: {plan.salonCount || 0}
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  gap: { xs: 0.5, sm: 1 }, 
                  justifyContent: 'center',
                  flexDirection: { xs: 'column', sm: 'row' }
                }}>
                  <Button 
                    variant="contained" 
                    size="small"
                    onClick={() => onPlanYukle(plan)}
                    sx={{ 
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      px: { xs: 1, sm: 2 }
                    }}
                  >
                    Yükle
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    size="small"
                    onClick={() => handlePlanSil(plan.id)}
                    sx={{ 
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      px: { xs: 1, sm: 2 }
                    }}
                  >
                    Sil
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
        </CardContent>
      </Card>
    </Container>
  );
};

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
  const [seciliSalonId, setSeciliSalonId] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false); // Sayfa yenileme için false
  const { showSuccess, showError } = useNotifications();

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
    hataTemizle
  } = useExam();

  // Sadece ilk açılışta giriş sayfası göster
  useEffect(() => {
    // İlk açılış kontrolü - localStorage'dan kontrol et
    try {
      const hasVisited = localStorage.getItem('hasVisited');
      const isFirstVisit = !hasVisited || hasVisited !== 'true';
      
      if (isFirstVisit) {
        setShowWelcome(true);
        localStorage.setItem('hasVisited', 'true');
      }
    } catch (error) {
      console.error('❌ localStorage kontrolü hatası:', error);
      // Hata durumunda karşılama sayfasını göster
      setShowWelcome(true);
    }
  }, []);


  // Giriş sayfasından ana sisteme geçiş
  const handleStartSystem = useCallback(() => {
    setShowWelcome(false);
    showSuccess('Sisteme hoş geldiniz!');
  }, [showSuccess]);

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

  // Yazdırma menüsü handler'ları
  const handlePrintMenuOpen = (event) => {
    setPrintMenuAnchor(event.currentTarget);
  };

  const handlePrintMenuClose = () => {
    setPrintMenuAnchor(null);
  };

  const handleSalonPlaniPrintClick = () => {
    handleSalonPlaniPrint();
    handlePrintMenuClose();
  };

  const handleSinifListesiPrintClick = () => {
    handleSinifListesiPrint();
    handlePrintMenuClose();
  };

  const handleSalonImzaListesiPrintClick = () => {
    handleSalonImzaListesiPrint();
    handlePrintMenuClose();
  };

  // Kaydetme fonksiyonları
  const handleSaveClick = () => {
    setSaveDialogOpen(true);
  };

  const handleSaveDialogClose = () => {
    setSaveDialogOpen(false);
  };

  const handleSavePlan = useCallback(async (planAdi) => {
    if (!planAdi.trim()) {
      showError('Lütfen plan adı giriniz.');
      return;
    }

    if (!yerlestirmeSonucu) {
      showError('Kaydedilecek plan bulunamadı.');
      return;
    }

    try {
      // Plan verisini hazırla
      const planData = {
        salon: yerlestirmeSonucu.salon,
        tumSalonlar: yerlestirmeSonucu.tumSalonlar,
        kalanOgrenciler: yerlestirmeSonucu.kalanOgrenciler,
        yerlesilemeyenOgrenciler: yerlestirmeSonucu.yerlesilemeyenOgrenciler,
        istatistikler: yerlestirmeSonucu.istatistikler,
        // Ayarlar bilgilerini de kaydet (dersler ayarlar içinde yer alıyor)
        ayarlar: ayarlar
      };


      // DEBUG: Plan kaydetme öncesi veri kontrolü
      logger.debug('Plan kaydediliyor - Salon masaları: ' + (planData.salon?.masalar?.length || 0));
      logger.debug('Plan kaydediliyor - tumSalonlar sayısı: ' + (planData.tumSalonlar?.length || 0));
      if (planData.tumSalonlar && planData.tumSalonlar.length > 0) {
        logger.debug('Plan kaydediliyor - İlk salon masaları: ' + (planData.tumSalonlar[0]?.masalar?.length || 0));
      }

      // PlanManager ile kaydet
      await planManager.savePlan(planAdi.trim(), planData);
      
      showSuccess('Plan başarıyla kaydedildi!');
      setSaveDialogOpen(false);
      
    } catch (error) {
      logger.error('❌ Plan kaydetme hatası:', error);
      showError(`Plan kaydedilirken hata oluştu: ${error.message}`);
    }
  }, [yerlestirmeSonucu, showError, showSuccess]);



  // Veri yükleme - artık localStorage'dan otomatik yükleniyor
  // useEffect kaldırıldı çünkü ExamContext localStorage'dan veriyi otomatik yüklüyor

  const handleAyarlarDegistir = (yeniAyarlar) => {
    ayarlarGuncelle(yeniAyarlar);
    
    // LocalStorage'a kaydet
    try {
      localStorage.setItem('exam_ayarlar', JSON.stringify(yeniAyarlar));
    } catch (error) {
      console.error('❌ Ayarlar LocalStorage\'a kaydedilemedi:', error);
    }
  };

  const handleSalonlarDegistir = (yeniSalonlar) => {
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
  };

  // Yerleştirme sonuçlarını temizle
  const handleYerlestirmeTemizle = () => {
    yerlestirmeTemizle(); // Yerleştirme sonucunu temizle
    tabDegistir('planlama'); // Planlama sekmesine geri dön
  };

  // Plan yükleme fonksiyonu
  const handlePlanYukle = async (plan) => {
    try {
      const loadedPlan = await planManager.loadPlan(plan.id);

      if (!loadedPlan || !loadedPlan.data) {
        showError('Plan verisi bulunamadı!');
        return;
      }

      const planData = loadedPlan.data;

      // Plan verisini yerlestirmeSonucu formatına dönüştür
      const yerlestirmeFormatinda = {
        salon: planData.salon,
        tumSalonlar: planData.tumSalonlar,
        kalanOgrenciler: planData.kalanOgrenciler,
        yerlesilemeyenOgrenciler: planData.yerlesilemeyenOgrenciler,
        istatistikler: planData.istatistikler
      };

      // Ayarlar ve dersler bilgilerini yükle
      if (planData.ayarlar) {
        ayarlarGuncelle(planData.ayarlar);
      }

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

      yerlestirmeGuncelle(yerlestirmeFormatinda);
      
      tabDegistir('salon-plani');

      showSuccess(`"${loadedPlan.name}" planı yüklendi!`);

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

        const updatedYerlestirmeSonucu = {
          ...yerlestirmeSonucu,
          salon: updatedSalon,
          tumSalonlar: updatedTumSalonlar,
          yerlesilemeyenOgrenciler: updatedYerlesilemeyen
        };
        
        yerlestirmeGuncelle(updatedYerlestirmeSonucu);
        
        // LocalStorage kaydetme artık ExamContext'te yapılıyor
      }
      return;
    }
    
    // Öğrenciyi salondan çıkarma (toMasaId === null)
    if (fromMasa && fromMasa.ogrenci && toMasaId === null) {
      const cikarilanOgrenci = fromMasa.ogrenci;
      
      // Masayı boşalt
      fromMasa.ogrenci = null;
      
      // Öğrenciyi yerleşmeyen listesine ekle
      const updatedYerlesilemeyen = [...(yerlestirmeSonucu.yerlesilemeyenOgrenciler || []), cikarilanOgrenci];
      
      // Salon öğrenci listesinden çıkar
      const updatedSalonOgrenciler = currentSalon.ogrenciler.filter(o => o.id !== cikarilanOgrenci.id);
      
      // Güncellenmiş salon
      const updatedSalon = { ...currentSalon, ogrenciler: updatedSalonOgrenciler };
      
      // tumSalonlar listesini de güncelle
      const updatedTumSalonlar = yerlestirmeSonucu.tumSalonlar.map(salon => 
        salon.id === currentSalon.id ? updatedSalon : salon
      );

      const updatedYerlestirmeSonucu = {
        ...yerlestirmeSonucu,
        salon: updatedSalon,
        tumSalonlar: updatedTumSalonlar,
        yerlesilemeyenOgrenciler: updatedYerlesilemeyen
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
  }, [yerlestirmeSonucu, yerlestirmeGuncelle]);

  // Transfer işlemi
  const handleStudentTransfer = useCallback(async (transferData) => {
    try {
      const result = await transferManager.executeTransfer(transferData);
      
      // Yerleştirme sonucunu güncelle
      const updatedTumSalonlar = [...(yerlestirmeSonucu.tumSalonlar || [])];
      
      // Kaynak salonu güncelle
      const fromSalonIndex = updatedTumSalonlar.findIndex(s => s.id === result.fromSalon.id);
      if (fromSalonIndex !== -1) {
        updatedTumSalonlar[fromSalonIndex] = result.fromSalon;
      }
      
      // Hedef salonu güncelle
      const toSalonIndex = updatedTumSalonlar.findIndex(s => s.id === result.toSalon.id);
      if (toSalonIndex !== -1) {
        updatedTumSalonlar[toSalonIndex] = result.toSalon;
      }
      
      // Mevcut salonu güncelle (eğer transfer edilen salon mevcut salon ise)
      let updatedCurrentSalon = yerlestirmeSonucu.salon;
      if (result.fromSalon.id === yerlestirmeSonucu.salon.id) {
        updatedCurrentSalon = result.fromSalon;
      } else if (result.toSalon.id === yerlestirmeSonucu.salon.id) {
        updatedCurrentSalon = result.toSalon;
      }
      
      yerlestirmeGuncelle({
        ...yerlestirmeSonucu,
        salon: updatedCurrentSalon,
        tumSalonlar: updatedTumSalonlar
      });
      
      showSuccess(`✅ ${result.student.ad} ${result.student.soyad} başarıyla transfer edildi!`);
      
    } catch (error) {
      showError(`❌ Transfer hatası: ${error.message}`);
      throw error;
    }
  }, [yerlestirmeSonucu, yerlestirmeGuncelle, showSuccess, showError]);

  const handleYerlestirmeYap = () => {
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
        siraDizilimi: {
          satir: salon.koltukMatrisi.satirSayisi,
          sutun: salon.koltukMatrisi.sutunSayisi
        },
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

  // Tab içerik render fonksiyonu
  const renderTabIcerik = () => {
    switch (aktifTab) {
      case 'genel-ayarlar':
        return (
          <GenelAyarlarFormu 
            ayarlar={ayarlar}
            onAyarlarDegistir={handleAyarlarDegistir}
          />
        );
      
      case 'ogrenciler':
        return (
          <OgrenciListesi 
            ogrenciler={ogrenciler}
            yerlestirmeSonucu={yerlestirmeSonucu}
          />
        );
      
      case 'salonlar':
        return (
          <SalonFormu 
            salonlar={salonlar}
            onSalonlarDegistir={handleSalonlarDegistir}
            yerlestirmeSonucu={yerlestirmeSonucu}
          />
        );
      
      case 'ayarlar':
        return (
          <AyarlarFormu 
            ayarlar={ayarlar}
            onAyarlarDegistir={handleAyarlarDegistir}
            ogrenciler={ogrenciler}
            yerlestirmeSonucu={yerlestirmeSonucu}
          />
        );
      
      case 'planlama':
        return (
          <PlanlamaYap 
            ogrenciler={ogrenciler}
            ayarlar={ayarlar}
            salonlar={salonlar}
            onYerlestirmeYap={handleYerlestirmeYap}
            yukleme={yukleme}
          />
        );
      
      case 'salon-plani':
        // Sadece aktif salonları göster
        const aktifSalonlar = salonlar?.filter(salon => salon.aktif !== false) || [];
        
        if (aktifSalonlar.length > 0 && !yerlestirmeSonucu) {
          // İlk aktif salonu seç (eğer seçili salon yoksa)
          if (!seciliSalonId && aktifSalonlar.length > 0) {
            setSeciliSalonId(aktifSalonlar[0].id);
          }
          
          const seciliSalon = aktifSalonlar.find(salon => salon.id === seciliSalonId) || aktifSalonlar[0];
          
          return (
            <Box sx={{ position: 'relative' }}>
              {/* Salon planı - SalonPlani bileşeni kendi salon seçimini yapar */}
              <SalonPlani 
                sinif={{
                  id: seciliSalon.id,
                  salonAdi: seciliSalon.salonAdi || seciliSalon.ad,
                  kapasite: seciliSalon.kapasite,
                  siraTipi: seciliSalon.siraTipi,
                  grupSayisi: seciliSalon.grupSayisi,
                  gruplar: seciliSalon.gruplar,
                  masalar: [], // Boş masa listesi
                  ogrenciler: [] // Boş öğrenci listesi
                }}
                ogrenciler={[]}
                ayarlar={ayarlar}
                salonlar={aktifSalonlar}
                seciliSalonId={seciliSalonId}
                onSeciliSalonDegistir={setSeciliSalonId}
              />
            </Box>
          );
        }
        
        return (
          <Box sx={{ position: 'relative' }}>
            {yerlestirmeSonucu && (
              <>
                <SalonPlani 
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
                />
                
                {/* Yerleşmeyen Öğrenciler Bölümü */}
                {yerlestirmeSonucu?.yerlesilemeyenOgrenciler && yerlestirmeSonucu.yerlesilemeyenOgrenciler.length > 0 && (
                  <Card sx={{ mt: 1, border: '2px solid', borderColor: 'warning.main' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ 
                        color: 'warning.main', 
                        mb: 2, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        fontSize: { xs: '1rem', sm: '1.25rem' }
                      }}>
                        <WarningIcon />
                        Yerleşmeyen Öğrenciler ({yerlestirmeSonucu.yerlesilemeyenOgrenciler.length})
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        mb: 2,
                        fontSize: { xs: '0.875rem', sm: '0.875rem' }
                      }}>
                        Aşağıdaki öğrenciler kısıtlar nedeniyle otomatik yerleştirilemedi. 
                        Manuel olarak yerleştirebilirsiniz.
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: { xs: 0.5, sm: 1 },
                        justifyContent: { xs: 'center', sm: 'flex-start' }
                      }}>
                        {yerlestirmeSonucu.yerlesilemeyenOgrenciler.map((ogrenci, index) => (
                          <Chip
                            key={index}
                            label={`${ogrenci.ad} (${ogrenci.sinif})`}
                            variant="outlined"
                            color="warning"
                            size="small"
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
            
            
            {/* Salon planı boşken - SalonPlani bileşeni ile salon sekmeleri render edilecek */}
            {!yerlestirmeSonucu && (
              <>
                {(() => {
                  const seciliSalon = salonlar.find(salon => salon.id === (seciliSalonId || salonlar[0]?.id));
                  if (!seciliSalon) return null;
                  
                  // Kapasite bilgisini doğru şekilde al
                  const salonKapasite = seciliSalon.kapasite || 0;
                  
                  return (
                    <SalonPlani 
                      sinif={{
                        id: seciliSalon.id,
                        kapasite: salonKapasite,
                        ad: seciliSalon.salonAdi || seciliSalon.ad,
                        // SalonFormu formatından gelen veriyi kullan
                        siraTipi: seciliSalon.siraTipi || 'ikili',
                        gruplar: seciliSalon.gruplar || [
                          { id: 1, siraSayisi: Math.ceil((seciliSalon.satir || 6) / 2) },
                          { id: 2, siraSayisi: Math.ceil((seciliSalon.satir || 6) / 2) },
                          { id: 3, siraSayisi: Math.ceil((seciliSalon.satir || 6) / 2) },
                          { id: 4, siraSayisi: Math.ceil((seciliSalon.satir || 6) / 2) }
                        ],
                        // Fallback için eski veri yapısı
                        siraDizilimi: {
                          satir: seciliSalon.satir || Math.ceil(Math.sqrt(salonKapasite)),
                          sutun: seciliSalon.sutun || Math.ceil(salonKapasite / Math.ceil(Math.sqrt(salonKapasite)))
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
                      onSalonDegistir={() => {}}
                      // Salon sekmeleri için yeni prop'lar
                      salonlar={salonlar}
                      seciliSalonId={seciliSalonId}
                      onSeciliSalonDegistir={setSeciliSalonId}
                      onStudentTransfer={handleStudentTransfer}
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
            )}
            
            
          </Box>
        );
      
      case 'kayitli-planlar':
        return (
          <KayitliPlanlar 
            onPlanYukle={handlePlanYukle}
          />
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

  if (!isInitialized) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Sistem yükleniyor...
        </Typography>
      </Box>
    );
  }

  if (yukleme && ogrenciler.length === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Veriler yükleniyor...
        </Typography>
      </Box>
    );
  }

  // Giriş sayfası göster
  if (showWelcome) {
    return <WelcomePageLazy onStart={handleStartSystem} />;
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
          onHomeClick={() => setShowWelcome(true)}
          onTestDashboardClick={() => tabDegistir('test-dashboard')}
        />
      
      <Container maxWidth="xl" sx={{ py: 2, px: 0, pb: 1, flex: 1 }}>

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

        {/* Tab Navigation */}
        <Paper elevation={1} sx={{ mb: { xs: 2, sm: 3 } }}>
          <Tabs
            value={aktifTab}
            onChange={(e, newValue) => tabDegistir(newValue)}
            centered
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': {
                minWidth: { xs: 'auto', sm: 'auto' },
                px: { xs: 1, sm: 2 },
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }
            }}
          >
            <Tab 
              icon={<SettingsIcon />} 
              label="Ayarlar" 
              value="genel-ayarlar"
            />
            <Tab 
              icon={<PeopleIcon />} 
              label="Öğrenciler" 
              value="ogrenciler"
            />
            <Tab 
              icon={<BookIcon />} 
              label="Dersler" 
              value="ayarlar"
            />
            <Tab 
              icon={<MeetingRoomIcon />} 
              label="Sınav Salonları" 
              value="salonlar"
            />
            <Tab 
              icon={<AssessmentIcon />} 
              label="Planlama Yap" 
              value="planlama"
            />
            <Tab 
              icon={<ChairIcon />} 
              label="Salon Planı" 
              value="salon-plani"
            />
            <Tab 
              icon={<SaveIcon />} 
              label="Kayıtlı Planlar" 
              value="kayitli-planlar"
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
                      label="Veritabanı Test" 
                      value="database-test"
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

        {/* Gizli PDF Export Bileşeni */}
        {yerlestirmeSonucu && (
          <Box sx={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden' }}>
            <SalonPlaniPrintable 
              ref={salonPlaniPrintRef}
              yerlestirmeSonucu={yerlestirmeSonucu}
              ayarlar={ayarlar}
            />
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
          title="Planı Kaydet"
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
          />
        </Box>
      </Box>

      {/* Kaydetme Dialog'u - Optimize edilmiş */}
      <PlanKaydetmeDialog
        open={saveDialogOpen}
        onClose={handleSaveDialogClose}
        onSave={handleSavePlan}
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