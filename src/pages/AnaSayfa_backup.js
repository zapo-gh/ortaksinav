import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
  DialogContentText
} from '@mui/material';
import DatabaseTest from '../components/DatabaseTest';
import {
  People as PeopleIcon,
  Settings as SettingsIcon,
  Book as BookIcon,
  MeetingRoom as MeetingRoomIcon,
  Chair as ChairIcon,
  PlayArrow as PlayIcon,
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  Save as SaveIcon,
  Backup as BackupIcon,
  BugReport as BugReportIcon
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
import { useNotifications } from '../components/NotificationSystem';
import { gelismisYerlestirme } from '../algorithms/gelismisYerlestirmeAlgoritmasi';
import { fixPlanData, debugMasaIds } from '../utils/masaIdFixer';
import BackupManager from '../components/BackupManager';
import AdvancedReports from '../components/AdvancedReports';
import SaveDialog from '../components/SaveDialog';
import { NotificationProvider } from '../components/NotificationSystem';
import backupManager from '../utils/backupManager';
import db from '../database/database';
import migration from '../database/migration';
import planManager from '../utils/planManager';

// Drag & Drop item types
const ITEM_TYPES = {
  STUDENT: 'student'
};



const AnaSayfaContent = () => {
  const [kayitliPlanlar, setKayitliPlanlar] = useState([]);
  const [storageReport, setStorageReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showSuccess, showError, showConfirm } = useNotifications();

  // Plan manager ile planları yükle
  const loadPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('📥 Planlar yükleniyor...');
      
      const plans = await planManager.getAllPlans();
      setKayitliPlanlar(plans);
      console.log('✅ Planlar yüklendi:', plans.length);
      
      // Veritabanı istatistiklerini al
      const stats = await db.getDatabaseStats();
      if (stats) {
        setStorageReport({
          totalSize: stats.total * 1000, // Yaklaşık boyut
          maxSize: 50 * 1024 * 1024, // 50MB IndexedDB limit
          usagePercent: (stats.total * 1000) / (50 * 1024 * 1024) * 100,
          needsCleanup: stats.total > 1000,
          stats: stats
        });
      }
      
    } catch (error) {
      console.error('❌ Planlar yüklenirken hata:', error);
      setKayitliPlanlar([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Plan kaydedildiğinde listeyi yenile
  useEffect(() => {
    const handlePlanSaved = (event) => {
      console.log('📡 Plan kaydedildi eventi alındı:', event.detail);
      loadPlans(); // IndexedDB'den planları yenile
    };

    window.addEventListener('planSaved', handlePlanSaved);
    
    return () => {
      window.removeEventListener('planSaved', handlePlanSaved);
    };
  }, [loadPlans]);

  // IndexedDB temizleme fonksiyonu
  const handleStorageTemizle = async () => {
    const confirmed = await showConfirm(
      'Tüm kayıtlı planları silmek istediğinizden emin misiniz?',
      'Planları Sil',
      'Evet, Sil',
      'İptal'
    );
    
    if (confirmed) {
      try {
        await db.clearDatabase();
        await loadPlans();
      showSuccess('Tüm kayıtlı planlar silindi!');
      } catch (error) {
        console.error('❌ Plan silme hatası:', error);
        showError('Planlar silinirken hata oluştu!');
      }
    }
  };

  // Storage temizlik fonksiyonu - son 5 planı koru
  const handleStorageCleanup = async () => {
    const confirmed = await showConfirm(
      'Storage temizliği yapmak istiyor musunuz?\n\nBu işlem:\n- Son 5 planı korur\n- Diğer tüm planları siler\n- Gereksiz verileri temizler',
      'Storage Temizle',
      'Evet, Temizle',
      'İptal'
    );
    
    if (confirmed) {
      try {
        const plans = await db.getAllPlans();
        if (plans.length > 5) {
          // Son 5 planı koru, diğerlerini sil
          const plansToKeep = plans.slice(-5);
          const plansToDelete = plans.slice(0, -5);
          
          for (const plan of plansToDelete) {
            await db.deletePlan(plan.id);
          }
          
          console.log('✅ Storage temizlendi, son 5 plan korundu');
          showSuccess('Storage temizlendi! Son 5 plan korundu.');
        } else {
          showSuccess('Zaten 5 veya daha az plan var, temizlik gerekmiyor.');
        }
        
        await loadPlans();
        
      } catch (error) {
        console.error('❌ Storage temizlik hatası:', error);
        showError('Storage temizlenirken hata oluştu!');
      }
    }
  };

  // Eski planları temizleme fonksiyonu - eksik veri sorunu için
  const handleEskiPlanlariTemizle = async () => {
    const confirmed = await showConfirm(
      'Eski planları temizlemek istiyor musunuz?\n\nBu işlem:\n- Tüm kayıtlı planları siler\n- Eksik öğrenci verileri olan planları temizler\n- Yeni planlar kaydedebilirsiniz',
      'Eski Planları Temizle',
      'Evet, Temizle',
      'İptal'
    );
    
    if (confirmed) {
      try {
        await db.clearDatabase();
        await loadPlans();
        console.log('✅ Tüm kayıtlı planlar temizlendi');
        showSuccess('Eski planlar temizlendi! Artık yeni planlar kaydedebilirsiniz.');
      } catch (error) {
        console.error('❌ Plan temizlik hatası:', error);
        showError('Planlar temizlenirken hata oluştu!');
      }
    }
  };

  const handlePlanSil = async (planId) => {
    // Silinecek planı bul
    const silinecekPlan = kayitliPlanlar.find(plan => plan.id === planId);
    if (!silinecekPlan) {
      console.warn('⚠️ Silinecek plan bulunamadı:', planId);
      return;
    }
    
    // Onay dialog'u
    const onay = await showConfirm(
      `"${silinecekPlan.name}" planını silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz.`,
      'Planı Sil',
      'Evet, Sil',
      'İptal'
    );
    
    if (!onay) {
      console.log('❌ Plan silme işlemi iptal edildi');
      return;
    }
    
    try {
    console.log('🗑️ Plan siliniyor:', { 
      planId, 
        planAd: silinecekPlan.name,
      mevcutPlanlar: kayitliPlanlar.length 
    });
    
      // Plan manager ile sil
      await planManager.deletePlan(planId);
      console.log('✅ Plan IndexedDB\'den silindi');
      
      // Listeyi yenile
      await loadPlans();
      
      showSuccess('Plan başarıyla silindi!');
      
    } catch (error) {
      console.error('❌ Plan silme hatası:', error);
      showError('Plan silinirken hata oluştu!');
    }
  };

  // Kayıtlı Planlar bileşeni - AnaSayfaContent içinde tanımlanmış
  const KayitliPlanlar = ({ yerlestirmeGuncelle, tabDegistir }) => {
    const [kayitliPlanlar, setKayitliPlanlar] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSuccess, showError, showConfirm } = useNotifications();
  
    // Planları yükle
    useEffect(() => {
      loadPlans();
    }, []);
  
    const loadPlans = async () => {
      try {
        setIsLoading(true);
        const plans = await planManager.getAllPlans();
        setKayitliPlanlar(plans);
    } catch (error) {
        console.error('❌ Planlar yüklenirken hata:', error);
        showError('Planlar yüklenirken hata oluştu!');
      } finally {
        setIsLoading(false);
      }
    };
  
    const handlePlanSil = async (planId) => {
      try {
        await planManager.deletePlan(planId);
        showSuccess('Plan silindi!');
        loadPlans();
      } catch (error) {
        console.error('❌ Plan silme hatası:', error);
      showError('Plan silinirken hata oluştu!');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          Kayıtlı Planlar
        </Typography>
      </Box>
      
        {isLoading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Planlar yükleniyor...
          </Typography>
        </Box>
        ) : !Array.isArray(kayitliPlanlar) || kayitliPlanlar.length === 0 ? (
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
            alignItems: 'flex-start'
          }}>
            {kayitliPlanlar.map((plan) => (
              <Card key={plan.id} sx={{ 
                maxWidth: 345, 
                minWidth: 300,
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}>
              <CardContent>
                  <Typography variant="h6" component="div" gutterBottom>
                    {plan.name}
                </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {(() => {
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
                    Öğrenci Sayısı: {plan.totalStudents || 0}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    Salon Sayısı: {plan.salonCount || 0}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Button 
                    variant="contained" 
                    size="small"
                      onClick={async () => {
                        try {
                          console.log('📥 Plan yükleniyor:', plan);
                          
                          const loadedPlan = await planManager.loadPlan(plan.id);
                          console.log('✅ Plan yüklendi:', loadedPlan.name);

                          if (!loadedPlan || !loadedPlan.data) {
                            showError('Plan verisi bulunamadı!');
                            return;
                          }

                          const planData = loadedPlan.data;

                          const yerlestirmeFormatinda = {
                            salon: planData.salon,
                            tumSalonlar: planData.tumSalonlar,
                            kalanOgrenciler: planData.kalanOgrenciler,
                            yerlesilemeyenOgrenciler: planData.yerlesilemeyenOgrenciler,
                            istatistikler: planData.istatistikler
                          };

                          yerlestirmeGuncelle(yerlestirmeFormatinda);
                          tabDegistir('salon-plani');
                          
                          showSuccess(`"${loadedPlan.name}" planı yüklendi!`);
                          
                        } catch (error) {
                          console.error('❌ Plan yükleme hatası:', error);
                          showError(`Plan yüklenirken hata oluştu: ${error.message}`);
                        }
                      }}
                  >
                    Yükle
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    size="small"
                    onClick={() => handlePlanSil(plan.id)}
                  >
                    Sil
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

// Unplaced Students Drop Zone Component
const UnplacedStudentsDropZone = ({ children, onStudentMove }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPES.STUDENT,
    drop: (item, monitor) => {
      console.log('🎯 UnplacedStudentsDropZone drop:', { 
        fromMasaId: item.masaId, 
        fromOgrenci: item.ogrenci?.ad,
        toMasaId: null // Yerleşmeyen listesine ekleme
      });
      
      if (item.masaId !== null && onStudentMove) { // Salon masasından geliyorsa
        console.log('✅ Öğrenci salondan çıkarılıyor...');
        onStudentMove(item.masaId, null, item.ogrenci);
      }
      return { dropped: true };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
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
        transition: 'all 0.2s ease',
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

// Unplaced Students Drop Zone Component
const UnplacedStudentsDropZone = ({ children, onStudentMove }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPES.STUDENT,
    drop: (item, monitor) => {
      console.log('🎯 UnplacedStudentsDropZone drop:', { 
        fromMasaId: item.masaId, 
        fromOgrenci: item.ogrenci?.ad,
        toMasaId: null // Yerleşmeyen listesine ekleme
      });
      
      if (item.masaId !== null && onStudentMove) { // Salon masasından geliyorsa
        console.log('✅ Öğrenci salondan çıkarılıyor...');
        onStudentMove(item.masaId, null, item.ogrenci);
      }
      return { dropped: true };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
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
        transition: 'all 0.2s ease',
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
                        return plan.date || 'Bilinmiyor';
                      }
                    })()}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Öğrenci Sayısı: {plan.totalStudents || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Salon Sayısı: {plan.salonCount || 0}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Button 
                      variant="contained" 
                      size="small"
                      onClick={async () => {
                        console.log('📥 Plan yükleniyor:', plan);
                        console.log('🔍 handlePlanYukle başladı, plan.id:', plan.id);
                        
                        try {
                          console.log('🔄 planManager.loadPlan çağrılıyor...');
                          // Yeni plan manager ile planı yükle
                          const loadedPlan = await planManager.loadPlan(plan.id);
                          console.log('✅ Plan yüklendi:', loadedPlan.name);
                          
                          // Plan verisini kontrol et
                          if (!loadedPlan || !loadedPlan.data) {
                            console.warn('⚠️ Plan verisi bulunamadı:', loadedPlan);
                            showError('Plan verisi bulunamadı!');
                            return;
                          }
                          
                          const planData = loadedPlan.data;
                          
                          console.log('✅ Plan verisi doğrulandı:', {
                            salonVar: !!planData.salon,
                            tumSalonlarSayisi: planData.tumSalonlar?.length || 0,
                            totalStudents: planData.totalStudents || 0
                          });
                          
                          // Plan verisini yerlestirmeSonucu formatına dönüştür
                          const yerlestirmeFormatinda = {
                            salon: planData.salon,
                            tumSalonlar: planData.tumSalonlar,
                            kalanOgrenciler: planData.kalanOgrenciler,
                            yerlesilemeyenOgrenciler: planData.yerlesilemeyenOgrenciler,
                            istatistikler: planData.istatistikler
                          };
                          
                          console.log('🔄 Plan verisi yerlestirmeSonucu formatına dönüştürüldü:', {
                            salonVar: !!yerlestirmeFormatinda.salon,
                            tumSalonlarSayisi: yerlestirmeFormatinda.tumSalonlar?.length || 0,
                            salonMasalar: yerlestirmeFormatinda.salon?.masalar?.length || 0
                          });
                          
                          // Plan verisini state'e yükle
                          yerlestirmeGuncelle(yerlestirmeFormatinda);
                          tabDegistir('salon-plani');
                          
                          showSuccess(`"${loadedPlan.name}" planı yüklendi!`);
                          
                        } catch (error) {
                          console.error('❌ Plan yükleme hatası:', error);
                          showError(`Plan yüklenirken hata oluştu: ${error.message}`);
                        }
                      }}
                    >
                      Yükle
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="error" 
                      size="small"
                      onClick={() => handlePlanSil(plan.id)}
                    >
                      Sil
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    );
  };
  
  const {
    // State
    ogrenciler,
    ayarlar,
    salonlar,
    yerlestirmeSonucu,
    aktifTab,
    yukleme,
    hata,
    
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

  // PDF Export için ref'ler
  const salonPlaniPrintRef = useRef();
  const sinifListesiPrintRef = useRef();
  const salonImzaListesiPrintRef = useRef();
  
  // Yazdırma menüsü için state
  const [printMenuAnchor, setPrintMenuAnchor] = useState(null);
  
  // Kaydetme için state'ler
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);


  // Memoized plan data - sadece yerlestirmeSonucu değişince hesapla
  const memoizedPlanData = useMemo(() => {
    console.log('🔄 memoizedPlanData hesaplanıyor...');
    console.log('🔍 yerlestirmeSonucu durumu:', {
      yerlestirmeSonucu: yerlestirmeSonucu,
      type: typeof yerlestirmeSonucu,
      keys: yerlestirmeSonucu ? Object.keys(yerlestirmeSonucu) : 'null'
    });

    if (!yerlestirmeSonucu) {
      console.log('⚠️ memoizedPlanData: yerlestirmeSonucu null');
      return null;
    }
    console.log('✅ memoizedPlanData: yerlestirmeSonucu var, plan data oluşturuluyor');
    console.log('🔍 yerlestirmeSonucu:', yerlestirmeSonucu);
    
    // Plan kaydetme için tam veri yapısını oluştur
    const planData = {
      salon: yerlestirmeSonucu.salon,
      kalanOgrenciler: yerlestirmeSonucu.kalanOgrenciler || [],
      yerlesilemeyenOgrenciler: yerlestirmeSonucu.yerlesilemeyenOgrenciler || [],
      istatistikler: yerlestirmeSonucu.istatistikler,
      tumSalonlar: yerlestirmeSonucu.tumSalonlar || yerlestirmeSonucu.salonlar || []
    };
    
    console.log('📊 memoizedPlanData - Plan data oluşturuldu:', {
      salonVar: !!planData.salon,
      tumSalonlarSayisi: planData.tumSalonlar?.length || 0,
      tumSalonlarIcerik: planData.tumSalonlar?.map(s => s.salonAdi) || []
    });
    
    // CRITICAL DEBUG: tumSalonlar içeriğini detaylı kontrol et
    if (planData.tumSalonlar && planData.tumSalonlar.length > 0) {
      console.log('🔍 CRITICAL - tumSalonlar detayları:', {
        tumSalonlarLength: planData.tumSalonlar.length,
        tumSalonlarKeys: planData.tumSalonlar.map(s => Object.keys(s)),
        tumSalonlarMasalar: planData.tumSalonlar.map(s => s.masalar?.length || 0),
        tumSalonlarOgrenciler: planData.tumSalonlar.map(s => s.ogrenciler?.length || 0)
      });
    } else {
      console.error('❌ CRITICAL - tumSalonlar boş veya yok!');
      console.error('❌ yerlestirmeSonucu.tumSalonlar:', yerlestirmeSonucu.tumSalonlar);
      console.error('❌ yerlestirmeSonucu.salonlar:', yerlestirmeSonucu.salonlar);
    }
    
    return planData;
  }, [yerlestirmeSonucu]);

  // Memoized toplam öğrenci hesaplaması
  const memoizedToplamOgrenci = useMemo(() => {
    if (!yerlestirmeSonucu) return 0;
    
    if (yerlestirmeSonucu.tumSalonlar && yerlestirmeSonucu.tumSalonlar.length > 0) {
      return yerlestirmeSonucu.tumSalonlar.reduce((toplam, salon) => {
        if (salon.ogrenciler && salon.ogrenciler.length > 0) {
          return toplam + salon.ogrenciler.length;
        } else if (salon.masalar && salon.masalar.length > 0) {
          return toplam + salon.masalar.filter(masa => masa.ogrenci).length;
        }
        return toplam;
      }, 0);
    }
    
    // Tek salon durumu
    if (yerlestirmeSonucu.salon?.ogrenciler?.length > 0) {
      return yerlestirmeSonucu.salon.ogrenciler.length;
    } else if (yerlestirmeSonucu.salon?.masalar?.length > 0) {
      return yerlestirmeSonucu.salon.masalar.filter(masa => masa.ogrenci).length;
    }
    return 0;
  }, [yerlestirmeSonucu]);

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
    console.log('🔍 Save butonuna tıklandı');
    console.log('📋 Mevcut durum:', {
      yerlestirmeSonucu: yerlestirmeSonucu,
      memoizedPlanData: memoizedPlanData,
      memoizedToplamOgrenci: memoizedToplamOgrenci,
      saveDialogOpen: saveDialogOpen
    });
    setSaveDialogOpen(true);
  };

  const handleSaveDialogClose = useCallback(() => {
    setSaveDialogOpen(false);
  }, []);



  // Veri yükleme - artık localStorage'dan otomatik yükleniyor
  // IndexedDB'den veri yükleme artık ExamContext'te yapılıyor

  const handleAyarlarDegistir = (yeniAyarlar) => {
    ayarlarGuncelle(yeniAyarlar);
    // IndexedDB kaydetme artık ExamContext'te otomatik yapılıyor
  };

  const handleSalonlarDegistir = (yeniSalonlar) => {
    console.log('🔄 Salonlar güncelleniyor:', yeniSalonlar.map(s => ({
      id: s.id,
      salonAdi: s.salonAdi,
      kapasite: s.kapasite,
      siraTipi: s.siraTipi
    })));
    
    salonlarGuncelle(yeniSalonlar);
    // IndexedDB kaydetme artık ExamContext'te otomatik yapılıyor
    
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
      
      console.log('✅ Salon sıralaması yerleştirme sonucunda güncellendi');
    }
  };

  // Yerleştirme sonuçlarını temizle
  const handleYerlestirmeTemizle = () => {
    yerlestirmeTemizle(); // Yerleştirme sonucunu temizle
    tabDegistir('planlama'); // Planlama sekmesine geri dön
  };

  // Plan yükleme fonksiyonu - Yeni basit sistem
  const handlePlanYukle = async (plan) => {
    console.log('📥 Plan yükleniyor:', plan);
    console.log('🔍 handlePlanYukle başladı, plan.id:', plan.id);
    
    try {
      console.log('🔄 planManager.loadPlan çağrılıyor...');
      // Yeni plan manager ile planı yükle
      const loadedPlan = await planManager.loadPlan(plan.id);
      console.log('✅ Plan yüklendi:', loadedPlan.name);
      
      // Plan verisini kontrol et
      if (!loadedPlan || !loadedPlan.data) {
        console.warn('⚠️ Plan verisi bulunamadı:', loadedPlan);
        showError('Plan verisi bulunamadı!');
        return;
      }
      
      const planData = loadedPlan.data;
      
      console.log('✅ Plan verisi doğrulandı:', {
        salonVar: !!planData.salon,
        tumSalonlarSayisi: planData.tumSalonlar?.length || 0,
        totalStudents: planData.totalStudents || 0
      });
      
      // Plan verisini detaylı debug et
      console.log('🔍 Plan verisi detayları:', {
        planDataKeys: Object.keys(planData),
        salonKeys: planData.salon ? Object.keys(planData.salon) : 'null',
        salonMasalar: planData.salon?.masalar?.length || 0,
        salonOgrenciler: planData.salon?.ogrenciler?.length || 0,
        tumSalonlarDetay: planData.tumSalonlar?.map(s => ({
          salonAdi: s.salonAdi,
          masalar: s.masalar?.length || 0,
          ogrenciler: s.ogrenciler?.length || 0
        })) || []
      });
      
      // Plan verisini yerlestirmeSonucu formatına dönüştür
      const yerlestirmeFormatinda = {
        salon: planData.salon,
        tumSalonlar: planData.tumSalonlar,
        kalanOgrenciler: planData.kalanOgrenciler,
        yerlesilemeyenOgrenciler: planData.yerlesilemeyenOgrenciler,
        istatistikler: planData.istatistikler
      };
      
      console.log('🔄 Plan verisi yerlestirmeSonucu formatına dönüştürüldü:', {
        salonVar: !!yerlestirmeFormatinda.salon,
        tumSalonlarSayisi: yerlestirmeFormatinda.tumSalonlar?.length || 0,
        salonMasalar: yerlestirmeFormatinda.salon?.masalar?.length || 0
      });
      
      // Plan verisini state'e yükle
      yerlestirmeGuncelle(yerlestirmeFormatinda);
    tabDegistir('salon-plani');
      
      showSuccess(`"${loadedPlan.name}" planı yüklendi!`);
      
    } catch (error) {
      console.error('❌ Plan yükleme hatası:', error);
      showError(`Plan yüklenirken hata oluştu: ${error.message}`);
    }
  };

  // Migration başlatma - basitleştirilmiş
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        console.log('🔄 Veritabanı başlatılıyor...');
        
        // Migration durumunu kontrol et
        const isMigrated = await migration.checkMigrationStatus();
        
        if (!isMigrated) {
          console.log('📦 localStorage -> IndexedDB migration başlatılıyor...');
          await migration.fullMigration();
          console.log('✅ Migration tamamlandı!');
        } else {
          console.log('✅ Migration zaten tamamlanmış');
        }
        
        setMigrationCompleted(true);
        
      } catch (error) {
        console.error('❌ Migration hatası:', error);
        // Hata olsa bile devam et
        setMigrationCompleted(true);
      }
    };
    
    initializeDatabase();
  }, []);

  // Otomatik backup sistemi
  useEffect(() => {
    if (!migrationCompleted) return;
    
    // Sayfa yüklendiğinde otomatik backup oluştur
    backupManager.createAutoBackup();
    
    // Her 30 saniyede bir otomatik backup
    const interval = setInterval(() => {
      backupManager.createAutoBackup();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [migrationCompleted]);

  // Drag & Drop: Öğrenci taşıma ve masa numarası güncelleme
  const handleStudentMove = useCallback((action, data) => {
    console.log('🏠 AnaSayfa handleStudentMove called:', { action, data });

    if (action === 'update_desk_number') {
      // Masa numarası güncelleme işlemi
      console.log('📝 Masa numarası güncelleme:', data);
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
      const ogrenciToMove = draggedStudent || (yerlestirmeSonucu.salon?.yerlesilemeyenOgrenciler?.[0]);
      if (ogrenciToMove && !toMasa.ogrenci) {
        const updatedSalonUnplaced = (yerlestirmeSonucu.salon?.yerlesilemeyenOgrenciler || []).filter(o => o.id !== ogrenciToMove.id);
        const updatedSalonMasalar = currentSalon.masalar.map(m => 
          m.id === toMasa.id ? { ...m, ogrenci: { ...ogrenciToMove, masaNumarasi: m.id + 1 } } : m
        );
        const updatedSalonOgrenciler = [...currentSalon.ogrenciler, { ...ogrenciToMove, masaNumarasi: toMasa.id + 1 }];
        
        // Güncellenmiş salon
        const updatedSalon = { ...currentSalon, masalar: updatedSalonMasalar, ogrenciler: updatedSalonOgrenciler, yerlesilemeyenOgrenciler: updatedSalonUnplaced };
        
        // tumSalonlar listesini de güncelle
        const updatedTumSalonlar = yerlestirmeSonucu.tumSalonlar.map(salon => 
          salon.id === currentSalon.id ? updatedSalon : salon
        );

        // Global yerleşemeyenleri yeniden hesapla (sadece görünürlük için)
        const updatedGlobalUnplaced = updatedTumSalonlar.reduce((acc, s) => acc.concat(s.yerlesilemeyenOgrenciler || []), []);

        const updatedYerlestirmeSonucu = {
          ...yerlestirmeSonucu,
          salon: updatedSalon,
          tumSalonlar: updatedTumSalonlar,
          yerlesilemeyenOgrenciler: updatedGlobalUnplaced
        };
        
        yerlestirmeGuncelle(updatedYerlestirmeSonucu);
        
        // LocalStorage'a kaydet
        try {
          localStorage.setItem('yerlestirmeSonucu', JSON.stringify(updatedYerlestirmeSonucu));
          console.log('✅ Yerleştirme sonucu LocalStorage\'a kaydedildi');
        } catch (error) {
          console.error('❌ Yerleştirme sonucu LocalStorage\'a kaydedilemedi:', error);
        }
      }
      return;
    }
    
    // Öğrenciyi salondan çıkarma (toMasaId === null)
    if (fromMasa && fromMasa.ogrenci && toMasaId === null) {
      const cikarilanOgrenci = fromMasa.ogrenci;
      
      // Masayı boşalt
      fromMasa.ogrenci = null;
      
      // Öğrenciyi mevcut salonun yerleşmeyen listesine ekle
      const updatedSalonUnplaced = [...(currentSalon.yerlesilemeyenOgrenciler || []), cikarilanOgrenci];
      
      // Salon öğrenci listesinden çıkar
      const updatedSalonOgrenciler = currentSalon.ogrenciler.filter(o => o.id !== cikarilanOgrenci.id);
      
      // Güncellenmiş salon
      const updatedSalon = { ...currentSalon, ogrenciler: updatedSalonOgrenciler, yerlesilemeyenOgrenciler: updatedSalonUnplaced };
      
      // tumSalonlar listesini de güncelle
      const updatedTumSalonlar = yerlestirmeSonucu.tumSalonlar.map(salon => 
        salon.id === currentSalon.id ? updatedSalon : salon
      );

      const updatedGlobalUnplaced = updatedTumSalonlar.reduce((acc, s) => acc.concat(s.yerlesilemeyenOgrenciler || []), []);

      const updatedYerlestirmeSonucu = {
        ...yerlestirmeSonucu,
        salon: updatedSalon,
        tumSalonlar: updatedTumSalonlar,
        yerlesilemeyenOgrenciler: updatedGlobalUnplaced
      };
      
      yerlestirmeGuncelle(updatedYerlestirmeSonucu);
      
      // LocalStorage'a kaydet
      try {
        localStorage.setItem('yerlestirmeSonucu', JSON.stringify(updatedYerlestirmeSonucu));
        console.log('✅ Yerleştirme sonucu LocalStorage\'a kaydedildi');
      } catch (error) {
        console.error('❌ Yerleştirme sonucu LocalStorage\'a kaydedilemedi:', error);
      }
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
        return { ...ogrenci, masaNumarasi: toMasa.id + 1 };
      } else if (toOgrenci && ogrenci.id === toOgrenci.id) {
        return { ...ogrenci, masaNumarasi: fromMasa.id + 1 };
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
    
    // LocalStorage'a kaydet
    try {
      localStorage.setItem('yerlestirmeSonucu', JSON.stringify({
        salon: updatedSalon,
        tumSalonlar: updatedTumSalonlar
      }));
      console.log('✅ Yerleştirme sonucu LocalStorage\'a kaydedildi');
    } catch (error) {
      console.error('❌ Yerleştirme sonucu LocalStorage\'a kaydedilemedi:', error);
    }
  }, [yerlestirmeSonucu, yerlestirmeGuncelle]);

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
          
          // Gelişmiş yerleştirme algoritması kullanılıyor
          sonuc = gelismisYerlestirme(ogrenciler, salonlar, ayarlar);
          
          // CRITICAL DEBUG: Check algorithm output structure
          console.log('🔍 CRITICAL - Algorithm output structure:', {
            sonucKeys: sonuc ? Object.keys(sonuc) : 'null',
            sonucSalonlar: sonuc?.salonlar,
            sonucSalonlarLength: sonuc?.salonlar?.length || 0,
            sonucSalonlarType: typeof sonuc?.salonlar,
            sonucSalonlarIsArray: Array.isArray(sonuc?.salonlar)
          });
          
          // DEBUG: Algoritma sonucunu kontrol et
          console.log('🔍 AnaSayfa - Algoritma sonucu alındı:', {
            sonucVar: !!sonuc,
            salonSayisi: sonuc?.salonlar?.length || 0,
            ilkSalonPlanVar: !!sonuc?.salonlar?.[0]?.plan,
            ilkSalonPlanUzunlugu: sonuc?.salonlar?.[0]?.plan?.length || 0,
            tumSalonlar: sonuc?.salonlar?.map(s => ({
              salonAdi: s.salonAdi,
              planVar: !!s.plan,
              planUzunlugu: s.plan?.length || 0
            }))
          });
          
          // CRITICAL DEBUG: Check algorithm output structure
          console.log('🔍 CRITICAL - Algorithm output structure:', {
            sonucKeys: sonuc ? Object.keys(sonuc) : 'null',
            sonucSalonlar: sonuc?.salonlar,
            sonucSalonlarLength: sonuc?.salonlar?.length || 0,
            sonucSalonlarType: typeof sonuc?.salonlar,
            sonucSalonlarIsArray: Array.isArray(sonuc?.salonlar)
          });
          
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
    // DEBUG: Gelen sonuc verisini kontrol et
    console.log('🔍 formatYerlestirmeSonucu - Gelen sonuc:', {
      sonucTipi: typeof sonuc,
      sonucKeys: sonuc ? Object.keys(sonuc) : 'null',
      salonlarSayisi: sonuc.salonlar?.length || 0,
      tumSalonlarSayisi: sonuc.tumSalonlar?.length || 0,
      ilkSalonPlanVar: !!sonuc.salonlar?.[0]?.plan,
      ilkSalonPlanUzunlugu: sonuc.salonlar?.[0]?.plan?.length || 0,
      ilkSalonPlanTipi: typeof sonuc.salonlar?.[0]?.plan,
      ilkSalonPlanIcerik: sonuc.salonlar?.[0]?.plan?.slice(0, 2)
    });
    
    // Eğer sonuc zaten UI formatındaysa (yüklenen plan), olduğu gibi döndür
    if (sonuc.salon && sonuc.tumSalonlar) {
      console.log('✅ Sonuç zaten UI formatında, olduğu gibi döndürülüyor');
      return sonuc;
    }
    
    // Algoritma çıktısı formatındaysa, UI formatına dönüştür
    // Algoritma sonucu 'salonlar' array'i döndürüyor, 'tumSalonlar' değil
    const salonlar = sonuc.salonlar || [];
    const ilkSalon = salonlar[0];
    
    console.log('🔍 formatYerlestirmeSonucu - Algoritma çıktısı kontrolü:', {
      sonucKeys: Object.keys(sonuc),
      salonlarArray: salonlar.length,
      salonlarIcerik: salonlar.map(s => ({
        salonAdi: s.salonAdi,
        planVar: !!s.plan,
        planUzunlugu: s.plan?.length || 0,
        ogrenciSayisi: s.ogrenciler?.length || 0
      }))
    });
    
    // CRITICAL DEBUG: Check if salonlar is empty
    if (salonlar.length === 0) {
      console.error('❌ CRITICAL: salonlar array is empty!');
      console.error('❌ sonuc.salonlar:', sonuc.salonlar);
      console.error('❌ sonuc keys:', Object.keys(sonuc));
      console.error('❌ sonuc full:', sonuc);
    }
    
    console.log('🔍 formatYerlestirmeSonucu - Sonuç analizi:', {
      sonucKeys: Object.keys(sonuc),
      sonucSalonlar: sonuc.salonlar?.length || 0,
      sonucTumSalonlar: sonuc.tumSalonlar?.length || 0,
      salonlarArray: salonlar.length,
      ilkSalonVar: !!ilkSalon,
      ilkSalonKeys: ilkSalon ? Object.keys(ilkSalon) : 'null'
    });
    
    if (!ilkSalon) {
      console.warn('⚠️ formatYerlestirmeSonucu: Salon bulunamadı, boş salon oluşturuluyor');
      const bosSalon = {
          id: 'A-101',
        salonId: 'A-101',
        salonAdi: 'Sınav Salonu',
          kapasite: ogrenciler.length,
          siraDizilimi: {
            satir: Math.ceil(Math.sqrt(ogrenciler.length)),
            sutun: Math.ceil(ogrenciler.length / Math.ceil(Math.sqrt(ogrenciler.length)))
          },
        ogrenciler: [],
        masalar: [],
        yerlesilemeyenOgrenciler: []
      };
      
      return {
        salon: bosSalon,
        kalanOgrenciler: sonuc.yerlesilemeyenOgrenciler || [],
        yerlesilemeyenOgrenciler: sonuc.yerlesilemeyenOgrenciler || [], // Yerleşmeyen öğrenciler için ayrı property
        istatistikler: sonuc.istatistikler,
        tumSalonlar: [bosSalon] // Boş salonu tumSalonlar'a da ekle
      };
    }

    // Tüm salonları formatla
    const formatlanmisSalonlar = salonlar.map(salon => {
      // Eğer salon zaten UI formatındaysa, olduğu gibi döndür
      if (salon.masalar && salon.salonAdi) {
        console.log('✅ Salon zaten UI formatında:', salon.salonAdi);
        return salon;
      }
      
      // Algoritma çıktısı formatındaysa, UI formatına dönüştür
      const formatlanmisSalon = {
        id: salon.salonId || salon.id, // SalonPlani için id property'si ekle
        salonId: salon.salonId || salon.id,
        salonAdi: salon.salonAdi || salon.ad,
        kapasite: salon.ogrenciler?.length || salon.kapasite || 0,
        siraDizilimi: salon.koltukMatrisi ? {
          satir: salon.koltukMatrisi.satirSayisi,
          sutun: salon.koltukMatrisi.sutunSayisi
        } : salon.siraDizilimi || { satir: 0, sutun: 0 },
        ogrenciler: salon.ogrenciler || [],
        masalar: salon.masalar || [],
        plan: salon.plan || [], // Plan verisini ekle
        yerlesilemeyenOgrenciler: salon.yerlesilemeyenOgrenciler || []
      };

      // Eğer koltukMatrisi varsa (algoritma çıktısı), masaları oluştur
      if (salon.koltukMatrisi && salon.koltukMatrisi.masalar) {
      // Gerçek grup yapısını kullan - koltukMatrisi.masalar'dan
        console.log('📊 Salon formatlanıyor (algoritma çıktısı):', {
        salonId: salon.salonId,
        koltukSayisi: salon.koltukMatrisi.masalar.length,
        ogrenciSayisi: salon.ogrenciler.length,
        ogrenciler: salon.ogrenciler.slice(0, 5).map(o => o.ad),
        planVar: !!salon.plan,
        planUzunlugu: salon.plan?.length || 0
      });
      
      // Plan verisi debug
      if (salon.plan && salon.plan.length > 0) {
        console.log('📋 Plan verisi bulundu:', salon.plan.slice(0, 3));
        console.log('📋 Plan verisi tipi:', typeof salon.plan, 'Uzunluk:', salon.plan.length);
        console.log('📋 Plan verisi örneği:', salon.plan[0]);
      } else {
        console.log('❌ Plan verisi bulunamadı! Plan tipi:', typeof salon.plan, 'Plan içeriği:', salon.plan);
      }
      
      formatlanmisSalon.masalar = salon.koltukMatrisi.masalar.map((koltuk) => {
        // Plan matrisinden öğrenciyi bul (doğru eşleştirme)
        const ogrenci = salon.plan?.find(p => 
          p.satir === koltuk.satir && 
          p.sutun === koltuk.sutun && 
          p.grup === koltuk.grup
        )?.ogrenci || null;
        
          console.log(`🔍 Koltuk ${koltuk.id} (${koltuk.grup}-${koltuk.satir}-${koltuk.sutun}): ${ogrenci?.ad || 'BOŞ'} ${ogrenci?.soyad || ''} (${ogrenci?.numara || 'NO'})`);
        
        return {
          id: koltuk.id,
            masaNumarasi: koltuk.id + 1, // Geçici - sonra yeniden düzenlenecek
          ogrenci: ogrenci,
          satir: koltuk.satir,
          sutun: koltuk.sutun,
          grup: koltuk.grup,
          koltukTipi: koltuk.koltukTipi
        };
        });
      } else {
        // Eğer koltukMatrisi yoksa, masalar zaten mevcut
        console.log('📊 Salon zaten masaları var:', {
          salonId: salon.salonId || salon.id,
          masaSayisi: salon.masalar?.length || 0
        });
      }

      // Masa numaralarını otomatik olarak yeniden düzenle
      // Sıralama: Grup → Sıra → Sol/Sağ sütun
      formatlanmisSalon.masalar.sort((a, b) => {
        // 1. Önce grup sırası
        if (a.grup !== b.grup) {
          return a.grup - b.grup;
        }
        // 2. Sonra sıra (satır)
        if (a.satir !== b.satir) {
          return a.satir - b.satir;
        }
        // 3. Son olarak sütun (sol önce, sağ sonra)
        return a.sutun - b.sutun;
      });

      // Masa numaralarını 1'den başlayarak yeniden ata
      formatlanmisSalon.masalar.forEach((masa, index) => {
        masa.masaNumarasi = index + 1;
      });
      
      // DEBUG: Plan verisinin korunduğunu kontrol et
      console.log('🔍 formatlanmisSalon plan verisi:', {
        planVar: !!formatlanmisSalon.plan,
        planUzunlugu: formatlanmisSalon.plan?.length || 0,
        planTipi: typeof formatlanmisSalon.plan
      });

      return formatlanmisSalon;
    });

    // İlk salonu varsayılan olarak seç
    const varsayilanSalon = formatlanmisSalonlar[0];

    // Debug: tumSalonlar verisini kontrol et
    console.log('📊 formatYerlestirmeSonucu - tumSalonlar oluşturuluyor:', {
      formatlanmisSalonlarSayisi: formatlanmisSalonlar.length,
      ilkSalonPlanVar: !!formatlanmisSalonlar[0]?.plan,
      ilkSalonPlanUzunlugu: formatlanmisSalonlar[0]?.plan?.length || 0,
      tumSalonlarIcerik: formatlanmisSalonlar.map(s => ({
        salonAdi: s.salonAdi,
        masaSayisi: s.masalar?.length || 0,
        ogrenciSayisi: s.ogrenciler?.length || 0
      })),
      sonucSalonlarSayisi: sonuc.salonlar?.length || 0,
      sonucTumSalonlarSayisi: sonuc.tumSalonlar?.length || 0
    });
    
    // CRITICAL DEBUG: Check if formatlanmisSalonlar is empty
    if (formatlanmisSalonlar.length === 0) {
      console.error('❌ CRITICAL: formatlanmisSalonlar is empty!');
      console.error('❌ sonuc.salonlar:', sonuc.salonlar);
      console.error('❌ sonuc keys:', Object.keys(sonuc));
    }

    const finalResult = {
      salon: varsayilanSalon,
      kalanOgrenciler: sonuc.yerlesilemeyenOgrenciler || [],
      yerlesilemeyenOgrenciler: sonuc.yerlesilemeyenOgrenciler || [], // Yerleşmeyen öğrenciler için ayrı property
      istatistikler: sonuc.istatistikler,
      tumSalonlar: formatlanmisSalonlar // Formatlanmış tüm salonları sakla
    };

    console.log('✅ formatYerlestirmeSonucu - Final result:', {
      salonVar: !!finalResult.salon,
      tumSalonlarSayisi: finalResult.tumSalonlar?.length || 0,
      tumSalonlarIcerik: finalResult.tumSalonlar?.map(s => s.salonAdi) || []
    });

    return finalResult;
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
        console.log('🔍 Salon Planı render kontrolü:', { yerlestirmeSonucu: !!yerlestirmeSonucu, ogrenciler: ogrenciler.length });
        return (
          <Box>
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
                  tumSalonlar={yerlestirmeSonucu?.tumSalonlar || []}
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
                />
                
                {/* Yerleşmeyen Öğrenciler Bölümü (Drag & Drop destekli) */}
                {(yerlestirmeSonucu?.salon?.yerlesilemeyenOgrenciler && yerlestirmeSonucu.salon.yerlesilemeyenOgrenciler.length > 0) && (
                  <Card sx={{ mt: 1, border: '2px solid', borderColor: 'warning.main' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'warning.main', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarningIcon />
                        Yerleşmeyen Öğrenciler ({yerlestirmeSonucu.salon.yerlesilemeyenOgrenciler.length})
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Aşağıdaki öğrenciler kısıtlar nedeniyle otomatik yerleştirilemedi. 
                        Kartları salondaki boş koltuklara sürükleyip bırakabilirsiniz.
                      </Typography>
                      <UnplacedStudentsDropZone onStudentMove={(fromMasaId, toMasaId, ogrenci) => handleStudentMove('move', { from: fromMasaId, to: toMasaId, draggedStudent: ogrenci })}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, p: 1 }}>
                          {yerlestirmeSonucu.salon.yerlesilemeyenOgrenciler.map((ogrenci) => (
                            <DraggableUnplacedStudent key={ogrenci.id} ogrenci={ogrenci} />
                        ))}
                      </Box>
                      </UnplacedStudentsDropZone>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
                
                {/* Kaydet FAB */}
                <Fab
                  color="secondary"
                  sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    zIndex: 1000
                  }}
                  onClick={handleSaveClick}
                  title="Planı Kaydet"
                >
                  <SaveIcon />
                </Fab>

                {/* PDF Export FAB */}
                <Fab
                  color="primary"
                  sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 88,
                    zIndex: 1000
                  }}
                  onClick={handlePrintMenuOpen}
                  title="Yazdırma Seçenekleri"
                >
                  <PrintIcon />
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
                      <PeopleIcon fontSize="small" />
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
            
            {/* 52. görseldeki yapı - Salon sekmeleri + Grup düzeni */}
            {!yerlestirmeSonucu && (
              <>
                <Box sx={{ width: '100%' }}>
                  {/* Salon sekmeleri - 52. görseldeki gibi pill-shaped */}
                  <Box sx={{ 
                    backgroundColor: 'grey.100', 
                    borderRadius: '20px', 
                    p: 1, 
                    mb: 1,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                    justifyContent: 'center'
                  }}>
                    {console.log('🔍 Salonlar debug:', salonlar)}
                    {salonlar.map((salon) => (
                      <Box
                        key={salon.id}
                        onClick={() => setSeciliSalonId(salon.id)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 2,
                          py: 1,
                          borderRadius: '20px',
                          cursor: 'pointer',
                          backgroundColor: seciliSalonId === salon.id ? 'primary.main' : 'white',
                          color: seciliSalonId === salon.id ? 'white' : 'text.secondary',
                          border: '1px solid',
                          borderColor: seciliSalonId === salon.id ? 'primary.main' : 'grey.300',
                          fontWeight: seciliSalonId === salon.id ? 600 : 500,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: seciliSalonId === salon.id ? 'primary.dark' : 'grey.200',
                            transform: 'translateY(-1px)',
                            boxShadow: 2
                          }
                        }}
                      >
                        <span>{salon.ad || salon.salonAdi || `Salon ${salon.id}`}</span>
                        <Chip 
                          label={yerlestirmeSonucu ? (yerlestirmeSonucu.salonlar?.find(s => s.salonId === salon.id)?.ogrenciler?.length || 0) : 0} 
                          size="small" 
                          sx={{ 
                            height: 20, 
                            fontSize: '0.75rem',
                            backgroundColor: seciliSalonId === salon.id ? 'rgba(255,255,255,0.2)' : 'primary.main',
                            color: seciliSalonId === salon.id ? 'white' : 'white'
                          }} 
                        />
                      </Box>
                    ))}
                  </Box>


                  {/* Seçili salonun içeriği */}
                  {(() => {
                    const seciliSalon = salonlar.find(salon => salon.id === (seciliSalonId || salonlar[0]?.id));
                    if (!seciliSalon) return null;
                    
                    // Kapasite bilgisini doğru şekilde al
                    const salonKapasite = seciliSalon.kapasite || 0;
                    
                    console.log('🔍 Salon kapasite bilgisi:', {
                      salonId: seciliSalon.id,
                      salonAdi: seciliSalon.salonAdi || seciliSalon.ad,
                      kapasite: salonKapasite,
                      siraTipi: seciliSalon.siraTipi,
                      gruplar: seciliSalon.gruplar
                    });
                    
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
                        ogrenciler={yerlestirmeSonucu ? yerlestirmeSonucu.salon?.ogrenciler || [] : []}
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
                      />
                    );
                  })()}
                </Box>
                
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
            yerlestirmeGuncelle={yerlestirmeGuncelle}
            tabDegistir={tabDegistir}
          />
        );
      
      case 'database-test':
        return <DatabaseTest />;
      
      case 'backup-yonetimi':
        return (
          <BackupManager 
            onPlansUpdated={() => {
              // Planlar güncellendiğinde sayfayı yenile
              window.location.reload();
            }}
          />
        );
      
      case 'raporlar':
        return (
          <AdvancedReports 
            yerlestirmeSonucu={yerlestirmeSonucu}
            ogrenciler={ogrenciler}
            salonlar={salonlar}
            ayarlar={ayarlar}
            performanceData={{
              algorithmTime: 1250,
              dataProcessingTime: 350,
              totalTime: 1600,
              memoryUsage: 45,
              cpuUsage: 23,
              optimizationScore: 8.5
            }}
          />
        );
      
      default:
        return null;
    }
  };

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

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ 
        bgcolor: 'background.default', 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Header 
          baslik="" 
          onHomeClick={() => tabDegistir('genel-ayarlar')}
          onReportsClick={() => tabDegistir('raporlar')}
        />
    
        <Container maxWidth="xl" sx={{ py: 4, px: 0, flex: 1 }}>
          {/* Sayfa Başlığı */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Ortak Sınav Yerleştirme Sistemi
            </Typography>
            <Typography variant="h6" color="text.secondary">
              
            </Typography>
          </Box>

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
          <Paper elevation={1} sx={{ mb: 3 }}>
            <Tabs
              value={aktifTab}
              onChange={(e, newValue) => tabDegistir(newValue)}
              centered
              sx={{ borderBottom: 1, borderColor: 'divider' }}
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
              <Tab 
                icon={<BugReportIcon />} 
                label="Veritabanı Test" 
                value="database-test"
              />
            </Tabs>
          </Paper>

          {/* Tab İçeriği */}
          {renderTabIcerik()}
        </Container>

        <Footer />
      </Box>

      {/* Kaydetme Dialog'u - Completely Isolated */}
      <SaveDialog
        open={saveDialogOpen}
        onClose={handleSaveDialogClose}
        yerlestirmeSonucu={yerlestirmeSonucu}
        memoizedPlanData={memoizedPlanData}
        memoizedToplamOgrenci={memoizedToplamOgrenci}
      />
    </DndProvider>
  );
};

  // Kayıtlı Planlar Bileşeni - IndexedDB ile
  const KayitliPlanlar = ({ yerlestirmeGuncelle, tabDegistir }) => {
    const [kayitliPlanlar, setKayitliPlanlar] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSuccess, showError, showConfirm } = useNotifications();
  
    // Planları yükle
    useEffect(() => {
      loadPlans();
    }, []);
  
    const loadPlans = async () => {
      try {
        setIsLoading(true);
        const plans = await planManager.getAllPlans();
        setKayitliPlanlar(plans);
      } catch (error) {
        console.error('❌ Planlar yüklenirken hata:', error);
        showError('Planlar yüklenirken hata oluştu!');
      } finally {
        setIsLoading(false);
      }
    };
  
    const handlePlanSil = async (planId) => {
      try {
        await planManager.deletePlan(planId);
        showSuccess('Plan silindi!');
        loadPlans();
      } catch (error) {
        console.error('❌ Plan silme hatası:', error);
        showError('Plan silinirken hata oluştu!');
      }
    };
  
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Kayıtlı Planlar
          </Typography>
        </Box>
        
        {isLoading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Planlar yükleniyor...
            </Typography>
          </Box>
        ) : !Array.isArray(kayitliPlanlar) || kayitliPlanlar.length === 0 ? (
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
            alignItems: 'flex-start'
          }}>
            {kayitliPlanlar.map((plan) => (
              <Card key={plan.id} sx={{ 
                maxWidth: 345, 
                minWidth: 300,
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}>
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom>
                    {plan.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {(() => {
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
                    Öğrenci Sayısı: {plan.totalStudents || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Salon Sayısı: {plan.salonCount || 0}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    <Button 
                      variant="contained" 
                      size="small"
                      onClick={async () => {
                        try {
                          console.log('📥 Plan yükleniyor:', plan);
                          
                          const loadedPlan = await planManager.loadPlan(plan.id);
                          console.log('✅ Plan yüklendi:', loadedPlan.name);

                          if (!loadedPlan || !loadedPlan.data) {
                            showError('Plan verisi bulunamadı!');
                            return;
                          }

                          const planData = loadedPlan.data;

                          const yerlestirmeFormatinda = {
                            salon: planData.salon,
                            tumSalonlar: planData.tumSalonlar,
                            kalanOgrenciler: planData.kalanOgrenciler,
                            yerlesilemeyenOgrenciler: planData.yerlesilemeyenOgrenciler,
                            istatistikler: planData.istatistikler
                          };

                          yerlestirmeGuncelle(yerlestirmeFormatinda);
                          tabDegistir('salon-plani');
                          
                          showSuccess(`"${loadedPlan.name}" planı yüklendi!`);
                          
                        } catch (error) {
                          console.error('❌ Plan yükleme hatası:', error);
                          showError(`Plan yüklenirken hata oluştu: ${error.message}`);
                        }
                      }}
                    >
                      Yükle
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="error" 
                      size="small"
                      onClick={() => handlePlanSil(plan.id)}
                    >
                      Sil
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
  );
};

const AnaSayfa = () => {
  return (
    <NotificationProvider>
      <AnaSayfaContent />
    </NotificationProvider>
  );
};

export default AnaSayfa;
