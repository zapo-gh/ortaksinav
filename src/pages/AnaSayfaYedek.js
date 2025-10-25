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
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  Save as SaveIcon
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
import { gelismisYerlestirme } from '../algorithms/gelismisYerlestirmeAlgoritmasi';

// Drag & Drop item types
const ITEM_TYPES = {
  STUDENT: 'student'
};


// Kayıtlı Planlar Bileşeni
const KayitliPlanlar = ({ onPlanYukle }) => {
  const [kayitliPlanlar, setKayitliPlanlar] = useState([]);

  useEffect(() => {
    // LocalStorage'dan kayıtlı planları yükle
    const kayitli = JSON.parse(localStorage.getItem('kayitli_planlar') || '[]');
    setKayitliPlanlar(kayitli);
  }, []);

  // Sayfa yüklendiğinde ve kaydetme işleminden sonra planları yenile
  useEffect(() => {
    const handleStorageChange = () => {
      const kayitli = JSON.parse(localStorage.getItem('kayitli_planlar') || '[]');
      setKayitliPlanlar(kayitli);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handlePlanSil = (planId) => {
    const yeniPlanlar = kayitliPlanlar.filter(plan => plan.id !== planId);
    setKayitliPlanlar(yeniPlanlar);
    localStorage.setItem('kayitli_planlar', JSON.stringify(yeniPlanlar));
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Kayıtlı Planlar
      </Typography>
      
      {kayitliPlanlar.length === 0 ? (
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
                  {plan.ad}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Kayıt Tarihi: {(() => {
                    try {
                      const tarih = new Date(plan.tarih);
                      if (isNaN(tarih.getTime())) {
                        return plan.tarih || 'Bilinmiyor';
                      }
                      return tarih.toLocaleDateString('tr-TR');
                    } catch (error) {
                      return plan.tarih || 'Bilinmiyor';
                    }
                  })()}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Toplam Öğrenci: {plan.toplamOgrenci}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Salon Sayısı: {plan.salonSayisi}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Button 
                    variant="contained" 
                    size="small"
                    onClick={() => onPlanYukle(plan)}
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

const AnaSayfa = () => {
  const [seciliSalonId, setSeciliSalonId] = useState(null);
  
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
  const [planAdi, setPlanAdi] = useState('');

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
    setPlanAdi('');
  };

  const handleSavePlan = () => {
    if (!planAdi.trim()) {
      alert('Lütfen plan adı giriniz.');
      return;
    }

    if (!yerlestirmeSonucu) {
      alert('Kaydedilecek plan bulunamadı.');
      return;
    }

    // Plan verisini kaydet
    const planVerisi = {
      id: Date.now(),
      ad: planAdi.trim(),
      tarih: new Date().toISOString(),
      veri: yerlestirmeSonucu,
      toplamOgrenci: (() => {
        if (yerlestirmeSonucu.tumSalonlar && yerlestirmeSonucu.tumSalonlar.length > 0) {
          return yerlestirmeSonucu.tumSalonlar.reduce((toplam, salon) => {
            // Salon.ogrenciler array'i yoksa, masalar array'indeki öğrencileri say
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
      })(),
      salonSayisi: yerlestirmeSonucu.tumSalonlar?.length || 1
    };

    // LocalStorage'a kaydet
    const kayitliPlanlar = JSON.parse(localStorage.getItem('kayitli_planlar') || '[]');
    kayitliPlanlar.push(planVerisi);
    localStorage.setItem('kayitli_planlar', JSON.stringify(kayitliPlanlar));

    alert('Plan başarıyla kaydedildi!');
    handleSaveDialogClose();
    
    // Kayıtlı planlar sekmesini yenile
    if (window.location.hash === '#kayitli-planlar') {
      window.location.reload();
    }
  };



  // Veri yükleme - artık localStorage'dan otomatik yükleniyor
  // useEffect kaldırıldı çünkü ExamContext localStorage'dan veriyi otomatik yüklüyor

  const handleAyarlarDegistir = (yeniAyarlar) => {
    ayarlarGuncelle(yeniAyarlar);
    
    // LocalStorage'a kaydet
    try {
      localStorage.setItem('exam_ayarlar', JSON.stringify(yeniAyarlar));
      console.log('✅ Ayarlar LocalStorage\'a kaydedildi');
    } catch (error) {
      console.error('❌ Ayarlar LocalStorage\'a kaydedilemedi:', error);
    }
  };

  const handleSalonlarDegistir = (yeniSalonlar) => {
    console.log('🔄 Salonlar güncelleniyor:', yeniSalonlar.map(s => ({
      id: s.id,
      salonAdi: s.salonAdi,
      kapasite: s.kapasite,
      siraTipi: s.siraTipi
    })));
    
    salonlarGuncelle(yeniSalonlar);
    
    // LocalStorage'a kaydet
    try {
      localStorage.setItem('salonlar', JSON.stringify(yeniSalonlar));
      console.log('✅ Salonlar LocalStorage\'a kaydedildi:', yeniSalonlar.length, 'salon');
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
      
      console.log('✅ Salon sıralaması yerleştirme sonucunda güncellendi');
    }
  };

  // Yerleştirme sonuçlarını temizle
  const handleYerlestirmeTemizle = () => {
    yerlestirmeTemizle(); // Yerleştirme sonucunu temizle
    tabDegistir('planlama'); // Planlama sekmesine geri dön
  };

  // Plan yükleme fonksiyonu
  const handlePlanYukle = (plan) => {
    yerlestirmeGuncelle(plan.veri);
    tabDegistir('salon-plani');
  };

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
      const ogrenciToMove = draggedStudent || yerlestirmeSonucu.yerlesilemeyenOgrenciler?.[0];
      if (ogrenciToMove && !toMasa.ogrenci) {
        const updatedYerlesilemeyen = yerlestirmeSonucu.yerlesilemeyenOgrenciler.filter(o => o.id !== ogrenciToMove.id);
        const updatedSalonMasalar = currentSalon.masalar.map(m => 
          m.id === toMasa.id ? { ...m, ogrenci: { ...ogrenciToMove, masaNumarasi: m.id + 1 } } : m
        );
        const updatedSalonOgrenciler = [...currentSalon.ogrenciler, { ...ogrenciToMove, masaNumarasi: toMasa.id + 1 }];
        
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
      salonlarSayisi: sonuc.salonlar?.length || 0,
      ilkSalonPlanVar: !!sonuc.salonlar?.[0]?.plan,
      ilkSalonPlanUzunlugu: sonuc.salonlar?.[0]?.plan?.length || 0,
      ilkSalonPlanTipi: typeof sonuc.salonlar?.[0]?.plan,
      ilkSalonPlanIcerik: sonuc.salonlar?.[0]?.plan?.slice(0, 2)
    });
    
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
      const formatlanmisSalon = {
        id: salon.salonId, // SalonPlani için id property'si ekle
        salonId: salon.salonId,
        salonAdi: salon.salonAdi,
        kapasite: salon.ogrenciler.length,
        siraDizilimi: {
          satir: salon.koltukMatrisi.satirSayisi,
          sutun: salon.koltukMatrisi.sutunSayisi
        },
        ogrenciler: salon.ogrenciler,
        masalar: [],
        plan: salon.plan || [] // Plan verisini ekle
      };

      // Gerçek grup yapısını kullan - koltukMatrisi.masalar'dan
      console.log('📊 Salon formatlanıyor:', {
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
        
        console.log(`🔍 Koltuk ${koltuk.id} (${koltuk.grup}-${koltuk.satir}-${koltuk.sutun}): ${ogrenci?.ad || 'BOŞ'}`);
        
        return {
          id: koltuk.id,
          masaNumarasi: koltuk.id + 1,
          ogrenci: ogrenci,
          satir: koltuk.satir,
          sutun: koltuk.sutun,
          grup: koltuk.grup,
          koltukTipi: koltuk.koltukTipi
        };
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
      ilkSalonPlanUzunlugu: formatlanmisSalonlar[0]?.plan?.length || 0
    });

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
        console.log('🔍 Salon Planı render kontrolü:', { yerlestirmeSonucu: !!yerlestirmeSonucu, ogrenciler: ogrenciler.length });
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
                
                {/* Yerleşmeyen Öğrenciler Bölümü */}
                {yerlestirmeSonucu?.yerlesilemeyenOgrenciler && yerlestirmeSonucu.yerlesilemeyenOgrenciler.length > 0 && (
                  <Card sx={{ mt: 1, border: '2px solid', borderColor: 'warning.main' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'warning.main', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarningIcon />
                        Yerleşmeyen Öğrenciler ({yerlestirmeSonucu.yerlesilemeyenOgrenciler.length})
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Aşağıdaki öğrenciler kısıtlar nedeniyle otomatik yerleştirilemedi. 
                        Manuel olarak yerleştirebilirsiniz.
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
                
                {/* Yerleşmeyen Öğrenciler Bölümü */}
                {yerlestirmeSonucu?.yerlesilemeyenOgrenciler && yerlestirmeSonucu.yerlesilemeyenOgrenciler.length > 0 && (
                  <Card sx={{ mt: 1, border: '2px solid', borderColor: 'warning.main' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'warning.main', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <WarningIcon />
                        Yerleşmeyen Öğrenciler ({yerlestirmeSonucu.yerlesilemeyenOgrenciler.length})
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Aşağıdaki öğrenciler kısıtlar nedeniyle otomatik yerleştirilemedi. 
                        Manuel olarak istediğiniz salona sürükleyip bırakabilirsiniz.
                      </Typography>
                      
                      <UnplacedStudentsDropZone onStudentMove={handleStudentMove}>
                        <Box sx={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: 1,
                          p: 2,
                          backgroundColor: 'grey.50',
                          borderRadius: 2,
                          border: '1px dashed',
                          borderColor: 'grey.300'
                        }}>
                        {yerlestirmeSonucu.yerlesilemeyenOgrenciler.map((ogrenci) => (
                          <DraggableUnplacedStudent
                            key={ogrenci.id}
                            ogrenci={ogrenci}
                          />
                        ))}
                        </Box>
                      </UnplacedStudentsDropZone>
                      
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        💡 İpucu: Öğrencileri yukarıdaki salon planına sürükleyip bırakarak manuel yerleştirme yapabilirsiniz.
                      </Typography>
                    </CardContent>
                  </Card>
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
            onPlanYukle={handlePlanYukle}
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
      <Box sx={{ bgcolor: 'background.default', minHeight: 'auto' }}>
        <Header baslik="" />
      
      <Container maxWidth="xl" sx={{ py: 4, px: 0 }}>
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
              icon={<BookIcon />} 
              label="Dersler" 
              value="ayarlar"
            />
            <Tab 
              icon={<PeopleIcon />} 
              label="Öğrenciler" 
              value="ogrenciler"
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
      </Box>

      {/* Kaydetme Dialog'u */}
      <Dialog open={saveDialogOpen} onClose={handleSaveDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Planı Kaydet</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Plan Adı"
            fullWidth
            variant="outlined"
            value={planAdi}
            onChange={(e) => setPlanAdi(e.target.value)}
            placeholder="Örn: 2025-2026 1. Dönem Sınav Planı"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveDialogClose}>İptal</Button>
          <Button onClick={handleSavePlan} variant="contained" color="primary">
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </DndProvider>
  );
};

export default AnaSayfa;