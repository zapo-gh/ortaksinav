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

  // Plan manager ile planlarÄ± yÃ¼kle
  const loadPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('ğŸ“¥ Planlar yÃ¼kleniyor...');
      
      const plans = await planManager.getAllPlans();
      setKayitliPlanlar(plans);
      console.log('âœ… Planlar yÃ¼klendi:', plans.length);
      
      // VeritabanÄ± istatistiklerini al
      const stats = await db.getDatabaseStats();
      if (stats) {
        setStorageReport({
          totalSize: stats.total * 1000, // YaklaÅŸÄ±k boyut
          maxSize: 50 * 1024 * 1024, // 50MB IndexedDB limit
          usagePercent: (stats.total * 1000) / (50 * 1024 * 1024) * 100,
          needsCleanup: stats.total > 1000,
          stats: stats
        });
      }
      
    } catch (error) {
      console.error('âŒ Planlar yÃ¼klenirken hata:', error);
      setKayitliPlanlar([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Plan kaydedildiÄŸinde listeyi yenile
  useEffect(() => {
    const handlePlanSaved = (event) => {
      console.log('ğŸ“¡ Plan kaydedildi eventi alÄ±ndÄ±:', event.detail);
      loadPlans(); // IndexedDB'den planlarÄ± yenile
    };

    window.addEventListener('planSaved', handlePlanSaved);
    
    return () => {
      window.removeEventListener('planSaved', handlePlanSaved);
    };
  }, [loadPlans]);

  // IndexedDB temizleme fonksiyonu
  const handleStorageTemizle = async () => {
    const confirmed = await showConfirm(
      'TÃ¼m kayÄ±tlÄ± planlarÄ± silmek istediÄŸinizden emin misiniz?',
      'PlanlarÄ± Sil',
      'Evet, Sil',
      'Ä°ptal'
    );
    
    if (confirmed) {
      try {
        await db.clearDatabase();
        await loadPlans();
      showSuccess('TÃ¼m kayÄ±tlÄ± planlar silindi!');
      } catch (error) {
        console.error('âŒ Plan silme hatasÄ±:', error);
        showError('Planlar silinirken hata oluÅŸtu!');
      }
    }
  };

  // Storage temizlik fonksiyonu - son 5 planÄ± koru
  const handleStorageCleanup = async () => {
    const confirmed = await showConfirm(
      'Storage temizliÄŸi yapmak istiyor musunuz?\n\nBu iÅŸlem:\n- Son 5 planÄ± korur\n- DiÄŸer tÃ¼m planlarÄ± siler\n- Gereksiz verileri temizler',
      'Storage Temizle',
      'Evet, Temizle',
      'Ä°ptal'
    );
    
    if (confirmed) {
      try {
        const plans = await db.getAllPlans();
        if (plans.length > 5) {
          // Son 5 planÄ± koru, diÄŸerlerini sil
          const plansToKeep = plans.slice(-5);
          const plansToDelete = plans.slice(0, -5);
          
          for (const plan of plansToDelete) {
            await db.deletePlan(plan.id);
          }
          
          console.log('âœ… Storage temizlendi, son 5 plan korundu');
          showSuccess('Storage temizlendi! Son 5 plan korundu.');
        } else {
          showSuccess('Zaten 5 veya daha az plan var, temizlik gerekmiyor.');
        }
        
        await loadPlans();
        
      } catch (error) {
        console.error('âŒ Storage temizlik hatasÄ±:', error);
        showError('Storage temizlenirken hata oluÅŸtu!');
      }
    }
  };

  // Eski planlarÄ± temizleme fonksiyonu - eksik veri sorunu iÃ§in
  const handleEskiPlanlariTemizle = async () => {
    const confirmed = await showConfirm(
      'Eski planlarÄ± temizlemek istiyor musunuz?\n\nBu iÅŸlem:\n- TÃ¼m kayÄ±tlÄ± planlarÄ± siler\n- Eksik Ã¶ÄŸrenci verileri olan planlarÄ± temizler\n- Yeni planlar kaydedebilirsiniz',
      'Eski PlanlarÄ± Temizle',
      'Evet, Temizle',
      'Ä°ptal'
    );
    
    if (confirmed) {
      try {
        await db.clearDatabase();
        await loadPlans();
        console.log('âœ… TÃ¼m kayÄ±tlÄ± planlar temizlendi');
        showSuccess('Eski planlar temizlendi! ArtÄ±k yeni planlar kaydedebilirsiniz.');
      } catch (error) {
        console.error('âŒ Plan temizlik hatasÄ±:', error);
        showError('Planlar temizlenirken hata oluÅŸtu!');
      }
    }
  };

  const handlePlanSil = async (planId) => {
    // Silinecek planÄ± bul
    const silinecekPlan = kayitliPlanlar.find(plan => plan.id === planId);
    if (!silinecekPlan) {
      console.warn('âš ï¸ Silinecek plan bulunamadÄ±:', planId);
      return;
    }
    
    // Onay dialog'u
    const onay = await showConfirm(
      `"${silinecekPlan.name}" planÄ±nÄ± silmek istediÄŸinizden emin misiniz?\n\nBu iÅŸlem geri alÄ±namaz.`,
      'PlanÄ± Sil',
      'Evet, Sil',
      'Ä°ptal'
    );
    
    if (!onay) {
      console.log('âŒ Plan silme iÅŸlemi iptal edildi');
      return;
    }
    
    try {
    console.log('ğŸ—‘ï¸ Plan siliniyor:', { 
      planId, 
        planAd: silinecekPlan.name,
      mevcutPlanlar: kayitliPlanlar.length 
    });
    
      // Plan manager ile sil
      await planManager.deletePlan(planId);
      console.log('âœ… Plan IndexedDB\'den silindi');
      
      // Listeyi yenile
      await loadPlans();
      
      showSuccess('Plan baÅŸarÄ±yla silindi!');
      
    } catch (error) {
      console.error('âŒ Plan silme hatasÄ±:', error);
      showError('Plan silinirken hata oluÅŸtu!');
    }
  };

  // KayÄ±tlÄ± Planlar bileÅŸeni - AnaSayfaContent iÃ§inde tanÄ±mlanmÄ±ÅŸ
  const KayitliPlanlar = ({ yerlestirmeGuncelle, tabDegistir }) => {
    const [kayitliPlanlar, setKayitliPlanlar] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showSuccess, showError, showConfirm } = useNotifications();
  
    // PlanlarÄ± yÃ¼kle
    useEffect(() => {
      loadPlans();
    }, []);
  
    const loadPlans = async () => {
      try {
        setIsLoading(true);
        const plans = await planManager.getAllPlans();
        setKayitliPlanlar(plans);
    } catch (error) {
        console.error('âŒ Planlar yÃ¼klenirken hata:', error);
        showError('Planlar yÃ¼klenirken hata oluÅŸtu!');
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
        console.error('âŒ Plan silme hatasÄ±:', error);
      showError('Plan silinirken hata oluÅŸtu!');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          KayÄ±tlÄ± Planlar
        </Typography>
      </Box>
      
        {isLoading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Planlar yÃ¼kleniyor...
          </Typography>
        </Box>
        ) : !Array.isArray(kayitliPlanlar) || kayitliPlanlar.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            HenÃ¼z kayÄ±tlÄ± plan bulunmuyor
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Salon PlanÄ± sekmesinde bir plan oluÅŸturup kaydedebilirsiniz
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
                    Ã–ÄŸrenci SayÄ±sÄ±: {plan.totalStudents || 0}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    Salon SayÄ±sÄ±: {plan.salonCount || 0}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Button 
                    variant="contained" 
                    size="small"
                      onClick={async () => {
                        try {
                          console.log('ğŸ“¥ Plan yÃ¼kleniyor:', plan);
                          
                          const loadedPlan = await planManager.loadPlan(plan.id);
                          console.log('âœ… Plan yÃ¼klendi:', loadedPlan.name);

                          if (!loadedPlan || !loadedPlan.data) {
                            showError('Plan verisi bulunamadÄ±!');
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
                          
                          showSuccess(`"${loadedPlan.name}" planÄ± yÃ¼klendi!`);
                          
                        } catch (error) {
                          console.error('âŒ Plan yÃ¼kleme hatasÄ±:', error);
                          showError(`Plan yÃ¼klenirken hata oluÅŸtu: ${error.message}`);
                        }
                      }}
                  >
                    YÃ¼kle
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
      console.log('ğŸ¯ UnplacedStudentsDropZone drop:', { 
        fromMasaId: item.masaId, 
        fromOgrenci: item.ogrenci?.ad,
        toMasaId: null // YerleÅŸmeyen listesine ekleme
      });
      
      if (item.masaId !== null && onStudentMove) { // Salon masasÄ±ndan geliyorsa
        console.log('âœ… Ã–ÄŸrenci salondan Ã§Ä±karÄ±lÄ±yor...');
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
    backgroundColor = 'rgba(255, 193, 7, 0.1)'; // SarÄ± vurgu
  } else if (canDrop) {
    backgroundColor = 'rgba(255, 193, 7, 0.05)'; // Hafif sarÄ± vurgu
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
      masaId: null, // YerleÅŸmeyen Ã¶ÄŸrenci iÃ§in masaId null
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
      title={`${ogrenci.ad} - ${ogrenci.sinif} - ${ogrenci.cinsiyet || 'Cinsiyet belirtilmemiÅŸ'}`}
    />
  );
};

// Unplaced Students Drop Zone Component
const UnplacedStudentsDropZone = ({ children, onStudentMove }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPES.STUDENT,
    drop: (item, monitor) => {
      console.log('ğŸ¯ UnplacedStudentsDropZone drop:', { 
        fromMasaId: item.masaId, 
        fromOgrenci: item.ogrenci?.ad,
        toMasaId: null // YerleÅŸmeyen listesine ekleme
      });
      
      if (item.masaId !== null && onStudentMove) { // Salon masasÄ±ndan geliyorsa
        console.log('âœ… Ã–ÄŸrenci salondan Ã§Ä±karÄ±lÄ±yor...');
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
    backgroundColor = 'rgba(255, 193, 7, 0.1)'; // SarÄ± vurgu
  } else if (canDrop) {
    backgroundColor = 'rgba(255, 193, 7, 0.05)'; // Hafif sarÄ± vurgu
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
