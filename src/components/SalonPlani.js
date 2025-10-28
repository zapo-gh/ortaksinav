import React, { memo, useState, useCallback, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getSinifSeviyesi, getOgrenciDersleri, isGenderValid, isClassLevelValid } from '../algorithms/gelismisYerlestirmeAlgoritmasi';
import { isBackToBackClassLevelValid } from '../algorithms/validation/constraints';
import { getNeighbors } from '../algorithms/utils/helpers';
import dragDropLearning from '../utils/dragDropLearning';
import { useNotifications } from './NotificationSystem';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  Avatar,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItem,
  ListItemText,
  ListItemIcon,
  Zoom
} from '@mui/material';
import {
  Chair as ChairIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  School as SchoolIcon,
  Grade as GradeIcon,
  Book as BookIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import TransferButton from './TransferButton';
import InterSalonTransfer from './InterSalonTransfer';

// Drag & Drop item types
const ITEM_TYPES = {
  STUDENT: 'student'
};



// Droppable Seat Component - Optimized
const DroppableSeat = memo(({ masa, onStudentMove, children }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPES.STUDENT,
    drop: (item, monitor) => {
      if (item.masaId !== masa.id && onStudentMove) {
        onStudentMove(item.masaId, masa.id, item.ogrenci);
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

  return (
    <Box
      ref={drop}
      sx={{
        width: '100%',
        opacity: isOver ? 0.8 : 1,
        backgroundColor: isOver ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
        border: isOver ? '2px dashed #4CAF50' : '2px solid transparent',
        borderRadius: 1,
        transition: 'opacity 0.1s ease, background-color 0.1s ease'
      }}
    >
      {children}
    </Box>
  );
});

const SalonPlani = memo(({ sinif, ogrenciler, seciliOgrenciId, kalanOgrenciler = [], onOgrenciSec, tumSalonlar, onSalonDegistir, ayarlar = {}, salonlar = [], seciliSalonId, onSeciliSalonDegistir, onStudentTransfer, yerlestirmeSonucu, tumOgrenciSayisi }) => {
  const { showConfirm } = useNotifications();

  const [modalAcik, setModalAcik] = useState(false);
  const [seciliOgrenci, setSeciliOgrenci] = useState(null);
  const [seciliMasa, setSeciliMasa] = useState(null);
  const [hoveredOgrenci, setHoveredOgrenci] = useState(null);
  const [transferModalAcik, setTransferModalAcik] = useState(false);
  const [transferOgrenci, setTransferOgrenci] = useState(null);

  // Cinsiyet bazlı renk fonksiyonu
  const getGenderColor = (ogrenci) => {
    if (!ogrenci || !ogrenci.cinsiyet) return 'primary';
    
    const cinsiyet = ogrenci.cinsiyet.toString().toLowerCase().trim();
    return cinsiyet === 'kız' || cinsiyet === 'kadin' || cinsiyet === 'k' ? 'secondary' : 'primary';
  };

  // Tek masa için masa numarası hesaplama fonksiyonu
  const calculateDeskNumberForMasa = (masa) => {
    if (!masa || !sinifDuzeni?.masalar) return masa?.id + 1 || 1;
    
    // Tüm masaları al ve grup bazlı sıralama yap
    const allMasalar = sinifDuzeni.masalar;
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
  };

  // Grup bazlı masa numarası hesaplama fonksiyonu - İSTENEN SIRALAMA ALGORİTMASI
  const calculateGroupBasedDeskNumbers = (masalar) => {
    if (!masalar || masalar.length === 0) return masalar;
    
    // Grupları ayır
    const gruplar = {};
    masalar.forEach(masa => {
      const grup = masa.grup || 1;
      if (!gruplar[grup]) {
        gruplar[grup] = [];
      }
      gruplar[grup].push(masa);
    });
    
    // Her grup için masa numaralarını hesapla
    let masaNumarasi = 1;
    const guncellenmisMasalar = [];
    
    // Grup numaralarına göre sırala (1, 2, 3, 4...)
    const sortedGruplar = Object.keys(gruplar).sort((a, b) => parseInt(a) - parseInt(b));
    
    sortedGruplar.forEach(grupId => {
      const grupMasalar = gruplar[grupId];
      
      // İSTENEN SIRALAMA: Her grup için satır-sütun sıralaması
      // 1.grup: Sıra1-Sol(1), Sıra1-Sağ(2), Sıra2-Sol(3), Sıra2-Sağ(4)...
      // 2.grup: Sıra1-Sol(5), Sıra1-Sağ(6), Sıra2-Sol(7), Sıra2-Sağ(8)...
      const sortedGrupMasalar = grupMasalar.sort((a, b) => {
        // Önce satıra göre sırala (1. sıra, 2. sıra, 3. sıra...)
        if (a.satir !== b.satir) {
          return a.satir - b.satir;
        }
        
        // Aynı satırda ise sütuna göre sırala (sol -> sağ)
        return a.sutun - b.sutun;
      });
      
      // Bu grup için masa numaralarını ata
      sortedGrupMasalar.forEach(masa => {
        guncellenmisMasalar.push({
          ...masa,
          masaNumarasi: masaNumarasi++
        });
      });
    });
    
    return guncellenmisMasalar;
  };



  // Drag & Drop handlers - Optimized for performance
  const handleStudentMove = useCallback((fromMasaId, toMasaId, draggedStudent = null) => {
    // AI öğrenme sistemi - Drag & Drop hareketini kaydet
    if (draggedStudent && fromMasaId !== toMasaId) {
      const learningContext = {
        salonId: sinif?.id || 'unknown',
        salonAdi: sinif?.salonAdi || 'Unknown Salon',
        totalStudents: ogrenciler?.length || 0,
        currentPlan: sinif?.masalar || []
      };
      
      dragDropLearning.recordMove(fromMasaId, toMasaId, draggedStudent, learningContext);
    }
    
    if (onOgrenciSec && typeof onOgrenciSec === 'function') {
      onOgrenciSec('move', { from: fromMasaId, to: toMasaId, draggedStudent });
    }
  }, [onOgrenciSec, sinif]);

  const handleMasaClick = useCallback((masa, ogrenci) => {
    // Sadece öğrenci varsa modal aç
    if (ogrenci) {
      setSeciliMasa(masa);
      setSeciliOgrenci(ogrenci);
      setModalAcik(true);
    }
    // Boş masa için modal açma
  }, []);

  

  const handleModalKapat = useCallback(() => {
    setModalAcik(false);
    setSeciliOgrenci(null);
    setSeciliMasa(null);
  }, []);

  // Transfer işlemleri
  const handleTransferClick = useCallback((student, currentSalon, targetSalon) => {
    setTransferOgrenci(student);
    setTransferModalAcik(true);
  }, []);

  const handleTransferClose = useCallback(() => {
    setTransferModalAcik(false);
    setTransferOgrenci(null);
  }, []);

  const handleTransferExecute = useCallback(async (transferData) => {
    try {
      if (onStudentTransfer) {
        await onStudentTransfer(transferData);
      }
      setTransferModalAcik(false);
      setTransferOgrenci(null);
    } catch (error) {
      console.error('Transfer hatası:', error);
    }
  }, [onStudentTransfer]);

  const handleOgrenciHover = useCallback((ogrenci) => {
    setHoveredOgrenci(ogrenci);
  }, []);

  const handleOgrenciLeave = useCallback(() => {
    setHoveredOgrenci(null);
  }, []);

  const getRiskColor = (kategori) => {
    switch (kategori) {
      case 'yuksek-risk':
        return 'error';
      case 'orta-risk':
        return 'warning';
      case 'dusuk-risk':
        return 'success';
      default:
        return 'default';
    }
  };

  const getRiskIcon = (kategori) => {
    switch (kategori) {
      case 'yuksek-risk':
        return <WarningIcon />;
      case 'dusuk-risk':
        return <CheckCircleIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getPozisyon = (satir, sutun, satirSayisi, sutunSayisi) => {
    if ((satir === 0 || satir === satirSayisi - 1) && 
        (sutun === 0 || sutun === sutunSayisi - 1)) {
      return 'kose';
    } else if (satir === 0 || satir === satirSayisi - 1 || 
               sutun === 0 || sutun === sutunSayisi - 1) {
      return 'kenar';
    }
    return 'merkez';
  };

  

  // Draggable Student Component - Optimized
const DraggableStudent = memo(({ masa, getGenderColor, onMasaClick, onStudentHover, onStudentLeave, isSecili, isHovered, onStudentMove, conflict, onTransferClick, currentSalon, allSalons }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPES.STUDENT,
    item: () => ({ 
      masaId: masa.id,
      ogrenci: masa.ogrenci 
    }),
    canDrag: !!masa.ogrenci,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    options: {
      // Drag sensitivity'yi artır
      dragPreviewOptions: {
        anchorX: 0.5,
        anchorY: 0.5,
      },
    },
  });

  return (
    <Box
      ref={drag}
      sx={{
        cursor: masa.ogrenci ? 'grab' : 'default',
        width: '100%',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'rotate(5deg)' : 'rotate(0deg)',
        transition: 'opacity 0.1s ease, background-color 0.1s ease'
      }}
    >
      <Paper
        elevation={masa.ogrenci ? 3 : 1}
        onClick={() => onMasaClick(masa, masa.ogrenci)}
        onMouseEnter={() => masa.ogrenci && onStudentHover(masa.ogrenci)}
        onMouseLeave={onStudentLeave}
        sx={{
          p: 1,
          minHeight: 80,
          maxHeight: 80,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: masa.ogrenci ? (getGenderColor(masa.ogrenci) === 'secondary' ? 'secondary.50' : 'primary.50') : 'grey.100',
          border: masa.ogrenci ? '2px solid' : '1px solid',
          borderColor: masa.ogrenci ? (getGenderColor(masa.ogrenci) === 'secondary' ? 'secondary.main' : 'primary.main') : 'grey.300',
          position: 'relative',
          cursor: 'pointer',
          transition: 'transform 0.1s ease, box-shadow 0.1s ease',
          transform: isSecili ? 'scale(1.05)' : 'scale(1)',
          boxShadow: isSecili ? 6 : masa.ogrenci ? 3 : 1,
          zIndex: isSecili ? 10 : 1,
          '&:hover': {
            transform: isSecili ? 'scale(1.05)' : 'scale(1.02)',
            boxShadow: isSecili ? 8 : 4,
            bgcolor: masa.ogrenci ? (getGenderColor(masa.ogrenci) === 'secondary' ? 'secondary.100' : 'primary.100') : 'grey.200',
            zIndex: 10
          },
          ...(isSecili && {
            bgcolor: 'warning.100',
            borderColor: 'warning.main',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              border: '3px solid',
              borderColor: 'warning.main',
              borderRadius: 'inherit',
              animation: 'pulse 2s infinite'
            }
          })
        }}
      >
        {/* Masa Numarası */}
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: 1,
            left: 2,
            fontWeight: 'bold',
            color: 'text.secondary',
            fontSize: '0.6rem',
            cursor: 'default'
          }}
          
        >
        {(conflict?.gender || conflict?.classSideBySide || conflict?.classBackToBack) && (() => {
          // Conflict detay mesajını hesapla
          const plan2D = Array(sinifDuzeni?.satirSayisi || 0).fill(null).map(() => Array(sinifDuzeni?.sutunSayisi || 0).fill(null));
          if (sinifDuzeni?.masalar) {
            sinifDuzeni.masalar.forEach(m => {
              if (m.ogrenci) {
                plan2D[m.satir][m.sutun] = { ogrenci: m.ogrenci, grup: m.grup };
              }
            });
          }
          const info = getConstraintConflictInfo(masa, plan2D);
          
          return (
            <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.5, flexDirection: 'column' }}>
              {/* Cinsiyet kısıt ihlali - Sarı kare içinde X */}
              {conflict.gender && (
                <Tooltip title={`Cinsiyet kısıtı: ${info.message.split('•')[0]?.trim() || 'Farklı cinsiyet yan yana'}`} placement="top">
                  <Box 
                    sx={{ 
                      color: 'warning.main',
                      width: 18,
                      height: 18,
                      backgroundColor: 'warning.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      borderRadius: 1
                    }}
                  >
                    ✕
                  </Box>
                </Tooltip>
              )}
              
              {/* Yan yana sınıf seviyesi kısıt ihlali - Turuncu üçgen */}
              {conflict.classSideBySide && (
                <Tooltip title={`Yan yana sınıf kısıtı: ${info.message.split('•')[1]?.trim() || 'Aynı seviye yan yana'}`} placement="top">
                  <Box 
                    sx={{ 
                      color: 'warning.main',
                      width: 0,
                      height: 0,
                      borderLeft: '9px solid transparent',
                      borderRight: '9px solid transparent',
                      borderBottom: '18px solid',
                      borderBottomColor: 'warning.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative'
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '6px',
                        left: '-6px',
                        color: 'warning.main',
                        fontSize: '8px',
                        fontWeight: 'bold'
                      }}
                    >
                      =
                    </Box>
                  </Box>
                </Tooltip>
              )}
              
              {/* Arka arkaya sınıf seviyesi kısıt ihlali - Yeşil daire */}
              {conflict.classBackToBack && (
                <Tooltip title={`Arka arkaya sınıf kısıtı: ${info.message.split('•')[2]?.trim() || 'Aynı seviye arka arkaya'}`} placement="top">
                  <Box 
                    sx={{ 
                      color: 'success.main',
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      backgroundColor: 'success.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                  >
                    !
                  </Box>
                </Tooltip>
              )}
            </Box>
          );
        })()}
          {/* GÜNCELLENMİŞ MASA NUMARASI GÖSTERİMİ */}
          {masa.masaNumarasi || calculateDeskNumberForMasa(masa)}
        </Typography>

        {/* Öğrenci Bilgileri */}
        {masa.ogrenci ? (
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Avatar 
              sx={{ 
                width: 20, 
                height: 20, 
                mx: 'auto', 
                mb: 0.5,
                bgcolor: `${getGenderColor(masa.ogrenci)}.main`
              }}
            >
              <PersonIcon sx={{ fontSize: 12 }} />
            </Avatar>
            
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block',
                fontWeight: 'bold',
                fontSize: '0.65rem',
                lineHeight: 1
              }}
            >
              {masa.ogrenci.ad} {masa.ogrenci.soyad}
            </Typography>
            
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block',
                fontSize: '0.6rem',
                color: 'text.secondary'
              }}
            >
              {masa.ogrenci.numara}
            </Typography>

            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block',
                fontSize: '0.55rem',
                color: 'text.primary',
                fontWeight: 'bold',
                mt: 0.25
              }}
            >
              {masa.ogrenci.sinif || masa.ogrenci.sube}
            </Typography>

            {/* Transfer Butonu */}
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 4, 
                right: 4,
                opacity: isHovered ? 1 : 0.7, // Her zaman biraz görünür olsun
                transition: 'opacity 0.1s ease',
                zIndex: 20,
                '&:hover': {
                  opacity: 1
                }
              }}
              onClick={(e) => {
                e.stopPropagation(); // Event bubbling'i durdur
              }}
            >
              <TransferButton
                student={masa.ogrenci}
                currentSalon={currentSalon}
                allSalons={allSalons}
                onTransferClick={onTransferClick}
                disabled={isDragging}
              />
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
            <ChairIcon sx={{ fontSize: 16, mb: 0.5 }} />
            <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
              Boş
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
});

  // Sınıf düzenini oluştur - GRUP BAZLI SALON YAPISINI KULLANAN
  const sinifDuzeni = React.useMemo(() => {
    if (!sinif) {
      return null;
    }
    
    // Eğer sinif.masalar varsa, grup bazlı salon yapısını kullan
    if (sinif.masalar && sinif.masalar.length > 0) {
      // Masaları gruplara göre ayır
      const gruplar = {};
      sinif.masalar.forEach(masa => {
        if (!gruplar[masa.grup]) {
          gruplar[masa.grup] = [];
        }
        gruplar[masa.grup].push({
          ...masa,
          pozisyon: getPozisyon(masa.satir, masa.sutun, sinif.siraDizilimi.satir, sinif.siraDizilimi.sutun)
        });
      });
      
      return {
        satirSayisi: sinif.siraDizilimi.satir,
        sutunSayisi: sinif.siraDizilimi.sutun,
        masalar: sinif.masalar.map(masa => ({
          ...masa,
          pozisyon: getPozisyon(masa.satir, masa.sutun, sinif.siraDizilimi.satir, sinif.siraDizilimi.sutun)
        })),
        gruplar: gruplar
      };
    }
    
    // Eğer sinif.siraTipi ve sinif.gruplar varsa, grup bazlı düzen oluştur
    if (sinif.siraTipi && sinif.gruplar) {
      const { siraTipi, gruplar } = sinif;
      const masalar = [];
      let masaIndex = 0;
      
      // En fazla sıra sayısını bul
      const maxSiraSayisi = Math.max(...gruplar.map(g => g.siraSayisi));
      
      // Grup bazlı masa düzeni oluştur (yerleştirme algoritması ile aynı)
      for (let satir = 0; satir < maxSiraSayisi; satir++) {
        gruplar.forEach((grup, grupIndex) => {
          if (satir < grup.siraSayisi) {
            if (siraTipi === 'tekli') {
              masalar.push({
                id: masaIndex++,
                satir: satir,
                sutun: grupIndex,
                grup: grup.id,
                koltukTipi: 'tekli',
                grupSira: grupIndex,
                ogrenci: ogrenciler[masaIndex - 1] || null,
                pozisyon: getPozisyon(satir, grupIndex, maxSiraSayisi, gruplar.length)
              });
            } else { // ikili
              // Sol koltuk
              masalar.push({
                id: masaIndex++,
                satir: satir,
                sutun: grupIndex * 2,
                grup: grup.id,
                koltukTipi: 'ikili-sol',
                grupSira: grupIndex,
                ogrenci: ogrenciler[masaIndex - 1] || null,
                pozisyon: getPozisyon(satir, grupIndex * 2, maxSiraSayisi, gruplar.length * 2)
              });
              
              // Sağ koltuk
              masalar.push({
                id: masaIndex++,
                satir: satir,
                sutun: grupIndex * 2 + 1,
                grup: grup.id,
                koltukTipi: 'ikili-sag',
                grupSira: grupIndex,
                ogrenci: ogrenciler[masaIndex - 1] || null,
                pozisyon: getPozisyon(satir, grupIndex * 2 + 1, maxSiraSayisi, gruplar.length * 2)
              });
            }
          }
        });
      }
      
      // Grupları oluştur
      const grupMasalar = {};
      masalar.forEach(masa => {
        if (!grupMasalar[masa.grup]) {
          grupMasalar[masa.grup] = [];
        }
        grupMasalar[masa.grup].push(masa);
      });
      
      // Grup bazlı masa numaralarını hesapla
      const masalarWithGroupNumbers = calculateGroupBasedDeskNumbers(masalar);
      
      return {
        satirSayisi: maxSiraSayisi,
        sutunSayisi: siraTipi === 'tekli' ? gruplar.length : gruplar.length * 2,
        masalar: masalarWithGroupNumbers,
        gruplar: grupMasalar
      };
    }
    
    // Fallback: Basit matris (eski sistem)
    const satirSayisi = sinif.siraDizilimi?.satir || Math.ceil(Math.sqrt(sinif.kapasite));
    const sutunSayisi = sinif.siraDizilimi?.sutun || Math.ceil(sinif.kapasite / satirSayisi);
    
    const masalar = [];
    for (let i = 0; i < satirSayisi; i++) {
      for (let j = 0; j < sutunSayisi; j++) {
        const masaIndex = i * sutunSayisi + j;
        const ogrenci = ogrenciler[masaIndex];
        
        masalar.push({
          id: masaIndex,
          masaNumarasi: masaIndex + 1,
          satir: i,
          sutun: j,
          grup: 1,
          koltukTipi: 'normal',
          ogrenci: ogrenci || null,
          pozisyon: getPozisyon(i, j, satirSayisi, sutunSayisi)
        });
      }
    }
    
    // Grup bazlı masa numaralarını hesapla
    const masalarWithGroupNumbers = calculateGroupBasedDeskNumbers(masalar);
    
    return { satirSayisi, sutunSayisi, masalar: masalarWithGroupNumbers };
  }, [sinif, ogrenciler]);



  // Salon sıralamasını memoize et - sıralama her render'da değişmesin
  const sortedTumSalonlar = React.useMemo(() => {
    if (!tumSalonlar || tumSalonlar.length === 0) return [];
    // Sıralama fonksiyonunu daha stabil hale getir
    return [...tumSalonlar].sort((a, b) => {
      const salonAdiA = (a.salonAdi || '').toString().trim();
      const salonAdiB = (b.salonAdi || '').toString().trim();
      
      // Önce salon ID'sine göre sırala (daha stabil)
      if (a.salonId !== b.salonId) {
        return (a.salonId || '').toString().localeCompare((b.salonId || '').toString(), 'tr', { numeric: true });
      }
      
      // Sonra salon adına göre sırala
      return salonAdiA.localeCompare(salonAdiB, 'tr', { numeric: true });
    });
  }, [tumSalonlar]);

  const sortedSalonlar = React.useMemo(() => {
    if (!salonlar || salonlar.length === 0) return [];
    // Sıralama fonksiyonunu daha stabil hale getir
    return [...salonlar].sort((a, b) => {
      const salonAdiA = (a.salonAdi || a.ad || '').toString().trim();
      const salonAdiB = (b.salonAdi || b.ad || '').toString().trim();
      
      // Önce salon ID'sine göre sırala (daha stabil)
      if (a.id !== b.id) {
        return (a.id || '').toString().localeCompare((b.id || '').toString(), 'tr', { numeric: true });
      }
      
      // Sonra salon adına göre sırala
      return salonAdiA.localeCompare(salonAdiB, 'tr', { numeric: true });
    });
  }, [salonlar]);



  // Yardımcı: Komşu kısıt ihlali kontrolü (sinifDuzeni oluşturulduktan sonra tanımlanır)
  const hasConstraintConflict = useCallback((masa, plan2D) => {
    if (!sinifDuzeni || !masa?.ogrenci || !plan2D) return { gender: false, classSideBySide: false, classBackToBack: false };
    const komsular = getNeighbors(
      masa.satir,
      masa.sutun,
      sinifDuzeni.satirSayisi,
      sinifDuzeni.sutunSayisi
    );
    const genderOK = isGenderValid(masa.ogrenci, komsular, plan2D, masa.grup);
    const classSideBySideOK = isClassLevelValid(masa.ogrenci, komsular, plan2D, masa.grup);
    const classBackToBackOK = isBackToBackClassLevelValid(masa.ogrenci, masa, plan2D, masa.grup);
    return { 
      gender: !genderOK, 
      classSideBySide: !classSideBySideOK, 
      classBackToBack: !classBackToBackOK 
    };
  }, [sinifDuzeni]);

  // Yardımcı: İhlal açıklamasını detaylı üret
  const getConstraintConflictInfo = useCallback((masa, plan2D) => {
    if (!sinifDuzeni || !masa?.ogrenci || !plan2D) return { hasConflict: false, message: '' };
    const komsular = getNeighbors(
      masa.satir,
      masa.sutun,
      sinifDuzeni.satirSayisi,
      sinifDuzeni.sutunSayisi
    );
    const reasons = [];

    // Cinsiyet ihlali: farklı cinsiyet yan yana yasak
    const genderValid = isGenderValid(masa.ogrenci, komsular, plan2D, masa.grup);
    if (!genderValid) {
      const offenders = [];
      komsular.forEach(([s, su]) => {
        const nb = plan2D[s]?.[su]?.ogrenci;
        if (nb?.cinsiyet && masa.ogrenci?.cinsiyet) {
          const a = masa.ogrenci.cinsiyet.toString().trim();
          const b = nb.cinsiyet.toString().trim();
          if (a && b && a.charAt(0).toUpperCase() !== b.charAt(0).toUpperCase()) {
            offenders.push(`${nb.ad} ${nb.soyad || ''}`.trim());
          }
        }
      });
      reasons.push(`Cinsiyet kısıtı: farklı cinsiyet yan yana (${offenders.slice(0, 3).join(', ')})`);
    }

    // Yan yana sınıf seviyesi ihlali: aynı seviye yan yana yasak
    const classSideBySideValid = isClassLevelValid(masa.ogrenci, komsular, plan2D, masa.grup);
    if (!classSideBySideValid) {
      const offenders = [];
      const ogrSeviye = getSinifSeviyesi(masa.ogrenci.sinif);
      komsular.forEach(([s, su]) => {
        const nb = plan2D[s]?.[su]?.ogrenci;
        if (nb?.sinif) {
          const nbSeviye = getSinifSeviyesi(nb.sinif);
          if (ogrSeviye && nbSeviye && ogrSeviye === nbSeviye) {
            offenders.push(`${nb.ad} ${nb.soyad || ''}`.trim());
          }
        }
      });
      reasons.push(`Yan yana sınıf kısıtı: aynı seviye yan yana (${ogrSeviye}. sınıf) (${offenders.slice(0, 3).join(', ')})`);
    }

    // Arka arkaya sınıf seviyesi ihlali: aynı seviye arka arkaya yasak
    const classBackToBackValid = isBackToBackClassLevelValid(masa.ogrenci, masa, plan2D, masa.grup);
    if (!classBackToBackValid) {
      const offenders = [];
      const ogrSeviye = getSinifSeviyesi(masa.ogrenci.sinif);
      const satir = masa.satir;
      const sutun = masa.sutun;
      
      // Üst komşu kontrolü
      if (satir > 0) {
        const ustCell = plan2D[satir - 1] && plan2D[satir - 1][sutun];
        const ustOgrenci = ustCell?.ogrenci;
        if (ustOgrenci && ustCell?.grup === masa.grup) {
          const ustSeviye = getSinifSeviyesi(ustOgrenci.sinif);
          if (ogrSeviye && ustSeviye && ogrSeviye === ustSeviye) {
            offenders.push(`üstte ${ustOgrenci.ad} ${ustOgrenci.soyad || ''}`.trim());
          }
        }
      }
      
      // Alt komşu kontrolü
      if (satir < plan2D.length - 1) {
        const altCell = plan2D[satir + 1] && plan2D[satir + 1][sutun];
        const altOgrenci = altCell?.ogrenci;
        if (altOgrenci && altCell?.grup === masa.grup) {
          const altSeviye = getSinifSeviyesi(altOgrenci.sinif);
          if (ogrSeviye && altSeviye && ogrSeviye === altSeviye) {
            offenders.push(`altta ${altOgrenci.ad} ${altOgrenci.soyad || ''}`.trim());
          }
        }
      }
      
      if (offenders.length > 0) {
        reasons.push(`Arka arkaya sınıf kısıtı: aynı seviye arka arkaya (${ogrSeviye}. sınıf) (${offenders.slice(0, 2).join(', ')})`);
      }
    }

    return { hasConflict: reasons.length > 0, message: reasons.join(' • ') };
  }, [sinifDuzeni]);
  if (!sinifDuzeni) {
    return (
        <Card sx={{ maxWidth: 1400, mx: 'auto' }}>
          <CardContent>
          <Typography variant="h6" color="text.secondary" textAlign="center">
            Salon yükleniyor...
                </Typography>
          </CardContent>
        </Card>
    );
  }

  // Bu kısım kaldırıldı - ana salon planı render edilecek

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <Paper elevation={1} sx={{ p: { xs: 1, sm: 2 }, maxWidth: { xs: '100%', sm: 1400 }, mx: 'auto' }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            mb: 1,
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: { xs: 1, sm: 2 },
              flexWrap: 'wrap'
            }}>
            <ChairIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h5" component="h2" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              Sınıf Planı
            </Typography>
            
            {/* Öğrenci Sayıları */}
            {(() => {
              // Yerleştirme sonucu varsa, tüm salonlardaki öğrencileri say
              if (yerlestirmeSonucu && yerlestirmeSonucu.tumSalonlar) {
                // GÜNCEL: Öncelik gruplar > masalar
                const countFilled = (s) => {
                  if (s && s.gruplar) {
                    let c = 0;
                    Object.values(s.gruplar).forEach(grup => {
                      grup.forEach(m => { if (m && m.ogrenci) c++; });
                    });
                    return c;
                  }
                  if (Array.isArray(s?.masalar)) {
                    return s.masalar.filter(m => m && m.ogrenci).length;
                  }
                  if (Array.isArray(s?.ogrenciler)) {
                    const ids = new Set(s.ogrenciler.filter(o => o && o.id != null).map(o => o.id));
                    return ids.size;
                  }
                  return 0;
                };
                const toplamYerlesen = yerlestirmeSonucu.tumSalonlar.reduce((toplam, s) => toplam + countFilled(s), 0);
                const toplamYerlesilemeyen = yerlestirmeSonucu.yerlesilemeyenOgrenciler ? yerlestirmeSonucu.yerlesilemeyenOgrenciler.length : 0;
                const toplamOgrenci = toplamYerlesen + toplamYerlesilemeyen;
                
                return (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: { xs: 0.5, sm: 1 }, 
                    ml: { xs: 0, sm: 2 },
                    flexWrap: 'wrap',
                    justifyContent: { xs: 'center', sm: 'flex-start' }
                  }}>
                    <Chip 
                      label={`Toplam: ${toplamOgrenci}`}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    />
                    <Chip 
                      label={`Yerleşen: ${toplamYerlesen}`}
                      color="success"
                      variant="outlined"
                      size="small"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    />
                    <Chip 
                      label={`Yerleşmeyen: ${toplamYerlesilemeyen}`}
                      color="warning"
                      variant="outlined"
                      size="small"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    />
                  </Box>
                );
              }
              
              // Yerleştirme sonucu yoksa, mevcut öğrenci listesini kullan
              if (ogrenciler && ogrenciler.length > 0) {
                // GÜVENLİK: Benzersiz öğrenci sayılarını hesapla
                const uniqueOgrenciler = [];
                const seenIds = new Set();
                ogrenciler.forEach(o => {
                  if (o && o.id && !seenIds.has(o.id)) {
                    uniqueOgrenciler.push(o);
                    seenIds.add(o.id);
                  }
                });
                
                const yerlesenSayisi = uniqueOgrenciler.filter(o => o.salonId).length;
                const yerlesilemeyenSayisi = uniqueOgrenciler.filter(o => !o.salonId).length;
                
                return (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: { xs: 0.5, sm: 1 }, 
                    ml: { xs: 0, sm: 2 },
                    flexWrap: 'wrap',
                    justifyContent: { xs: 'center', sm: 'flex-start' }
                  }}>
                    <Chip 
                      label={`Toplam: ${uniqueOgrenciler.length}`}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    />
                    <Chip 
                      label={`Yerleşen: ${yerlesenSayisi}`}
                      color="success"
                      variant="outlined"
                      size="small"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    />
                    <Chip 
                      label={`Yerleşmeyen: ${yerlesilemeyenSayisi}`}
                      color="warning"
                      variant="outlined"
                      size="small"
                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                    />
                  </Box>
                );
              }
              
              return null;
            })()}
          </Box>

          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 0.5, sm: 1 },
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'center', sm: 'flex-start' }
          }}>
            <Tooltip title="Dağıtımı Sil">
              <IconButton 
                color="error" 
                onClick={async () => {
                  const confirmed = await showConfirm('Tüm yerleştirme sonuçlarını silmek istediğinizden emin misiniz?');
                  if (confirmed) {
                    // Yerleştirme sonuçlarını temizle
                    if (typeof onOgrenciSec === 'function') {
                      onOgrenciSec('clear'); // Context'e temizleme sinyali gönder
                    }
                  }
                }}
                sx={{ 
                  bgcolor: 'error.50',
                  '&:hover': {
                    bgcolor: 'error.100'
                  },
                  size: { xs: 'small', sm: 'medium' }
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Salon sekmeleri - Hem yerleştirme planı varken hem de yokken göster */}
        {((tumSalonlar && tumSalonlar.length > 1) || (salonlar && salonlar.length > 0)) && (
          <Paper elevation={1} sx={{ p: { xs: 1, sm: 2 }, mb: 3, bgcolor: 'grey.50' }}>
            <Box sx={{ 
              display: 'flex', 
              gap: { xs: 0.5, sm: 1 }, 
              flexWrap: 'wrap', 
              justifyContent: 'center', 
              alignItems: 'center',
              flexDirection: { xs: 'column', sm: 'row' }
            }}>
              {/* Yerleştirme planı varken - tumSalonlar kullan */}
              {sortedTumSalonlar && sortedTumSalonlar.length > 0 && sortedTumSalonlar
                .map((salon) => {
                const isActive = sinif?.salonId === salon.salonId;
                return (
                  <Button
                    key={salon.salonId}
                    variant={isActive ? 'contained' : 'outlined'}
                    onClick={() => {
                      if (onSalonDegistir) {
                        onSalonDegistir(salon);
                      }
                    }}
                    sx={{ 
                      minWidth: { xs: '100%', sm: 100 },
                      width: { xs: '100%', sm: 'auto' },
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: isActive ? 'bold' : 'normal',
                      boxShadow: isActive ? 3 : 1,
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-1px)'
                      },
                      transition: 'opacity 0.1s ease, background-color 0.1s ease',
                      mb: { xs: 0.5, sm: 0 }
                    }}
                  >
                    <Typography variant="body2">
                      {salon.salonAdi}
                    </Typography>
                    <Chip 
                      label={(() => {
                        // En sağlıklı yöntem: masalar üzerinde dolu koltukları say
                        if (Array.isArray(salon.masalar)) {
                          // DOLU KOLTUK: ogrenci nesnesi var ise dolu kabul et (id eksik olabilir)
                          return salon.masalar.filter(m => m && m.ogrenci).length;
                        }
                        // Yedek: ogrenciler listesinden benzersiz id sayısı
                        if (Array.isArray(salon.ogrenciler)) {
                          const uniqueIds = new Set(
                            salon.ogrenciler
                              .filter(o => o && o.id != null)
                              .map(o => o.id)
                          );
                          return uniqueIds.size;
                        }
                        return 0;
                      })()} 
                      size="small" 
                      title="Bu salonun toplam öğrenci sayısı (tüm sınıflardan)"
                      sx={{ 
                        ml: 1,
                        fontWeight: 'bold',
                        backgroundColor: isActive ? 'white' : 'primary.main',
                        color: isActive ? 'primary.main' : 'white'
                      }}
                    />
                  </Button>
                );
              })}
              
              {/* Yerleştirme planı yokken - salonlar kullan */}
              {(!tumSalonlar || tumSalonlar.length === 0) && sortedSalonlar && sortedSalonlar
                .map((salon) => {
                const isActive = seciliSalonId === salon.id;
                return (
                  <Button
                    key={salon.id}
                    variant={isActive ? 'contained' : 'outlined'}
                    onClick={() => onSeciliSalonDegistir && onSeciliSalonDegistir(salon.id)}
                    sx={{ 
                      minWidth: { xs: '100%', sm: 100 },
                      width: { xs: '100%', sm: 'auto' },
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: isActive ? 'bold' : 'normal',
                      boxShadow: isActive ? 3 : 1,
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-1px)'
                      },
                      transition: 'opacity 0.1s ease, background-color 0.1s ease',
                      mb: { xs: 0.5, sm: 0 }
                    }}
                  >
                    <Typography variant="body2">
                      {salon.ad || salon.salonAdi || `Salon ${salon.id}`}
                    </Typography>
                    <Chip 
                      label={0} 
                      size="small" 
                      sx={{ 
                        ml: 1,
                        fontWeight: 'bold',
                        backgroundColor: isActive ? 'white' : 'primary.main',
                        color: isActive ? 'primary.main' : 'white'
                      }}
                    />
                  </Button>
                );
              })}
            </Box>
          </Paper>
        )}



        {/* Grup Bazlı Masalar */}
        {sinifDuzeni.gruplar ? (
          // Grup bazlı görüntüleme - YAN YANA
          <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, flexWrap: 'nowrap', justifyContent: 'center', mb: 2 }}>
            {Object.keys(sinifDuzeni.gruplar).map((grupId, index) => (
              <Box key={grupId} sx={{ minWidth: '280px', flex: '1 1 0', maxWidth: '25%' }}>
                <Typography variant="subtitle1" sx={{ mb: 1, color: 'primary.main', fontWeight: 'bold', textAlign: 'center' }}>
                  Grup {index + 1}
                </Typography>
                <Box 
                  sx={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 0.5,
                    maxWidth: '100%',
                    mx: 'auto'
                  }}
                >
                  {sinifDuzeni.gruplar[grupId].map((masa) => {
                    const isSecili = seciliOgrenciId && masa.ogrenci?.id === seciliOgrenciId;
                    const isHovered = hoveredOgrenci && masa.ogrenci?.id === hoveredOgrenci.id;
                    
                    return (
                      <Tooltip 
                        key={masa.id}
                        title={
                          masa.ogrenci ? (
                            <Box sx={{ p: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                {masa.ogrenci.ad} {masa.ogrenci.soyad}
                              </Typography>
                              <Typography variant="caption" display="block">
                                <strong>Okul No:</strong> {masa.ogrenci.numara || masa.ogrenci.okulNo}
                              </Typography>
                              <Typography variant="caption" display="block">
                                <strong>Şube:</strong> {masa.ogrenci.sinif || masa.ogrenci.sube}
                              </Typography>
                              {masa.ogrenci.kitapcik && (
                                <Typography variant="caption" display="block">
                                  <strong>Kitapçık:</strong> {masa.ogrenci.kitapcik}
                                </Typography>
                              )}
                              {masa.ogrenci.dersler && masa.ogrenci.dersler.length > 0 && (
                                <Typography variant="caption" display="block">
                                  <strong>Dersler:</strong> {masa.ogrenci.dersler.join(', ')}
                                </Typography>
                              )}
                              {masa.ogrenci.ozelDurum && (
                                <Typography variant="caption" display="block" color="warning.main">
                                  <strong>Özel Durum:</strong> {masa.ogrenci.ozelDurum}
                                </Typography>
                              )}
                              {masa.ogrenci.esnekYerlestirme && (
                                <Typography variant="caption" display="block" color="info.main">
                                  <strong>Esnek Yerleştirme:</strong> {masa.ogrenci.kuralIhlali || 'Kurallar esnetildi'}
                                </Typography>
                              )}
                            </Box>
                          ) : 'Boş masa'
                        }
                        arrow
                        TransitionComponent={Zoom}
                        enterDelay={300}
                        leaveDelay={100}
                      >
                        <DroppableSeat masa={masa} onStudentMove={handleStudentMove}>
                          <DraggableStudent
                            masa={masa}
                            getGenderColor={getGenderColor}
                            onMasaClick={handleMasaClick}
                            onStudentHover={handleOgrenciHover}
                            onStudentLeave={handleOgrenciLeave}
                            isSecili={isSecili}
                            isHovered={isHovered}
                            onStudentMove={handleStudentMove}
                            onTransferClick={handleTransferClick}
                            currentSalon={sinif}
                            allSalons={tumSalonlar || []}
                            conflict={(() => {
                              const plan2D = Array(sinifDuzeni.satirSayisi).fill(null).map(() => Array(sinifDuzeni.sutunSayisi).fill(null));
                              sinifDuzeni.masalar.forEach(m => {
                                if (m.ogrenci) {
                                  plan2D[m.satir][m.sutun] = { ogrenci: m.ogrenci, grup: m.grup };
                                }
                              });
                              return hasConstraintConflict(masa, plan2D);
                            })()}
                          />
                        </DroppableSeat>
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          // Fallback: Normal grid görüntüleme
          <Box 
          sx={{ 
            display: 'grid',
            gridTemplateColumns: `repeat(${sinifDuzeni.sutunSayisi}, 1fr)`,
            gap: 1,
            maxWidth: '100%',
            mx: 'auto',
            mb: 2
          }}
        >
          {sinifDuzeni.masalar.map((masa) => {
            const isSecili = seciliOgrenciId && masa.ogrenci?.id === seciliOgrenciId;
            const isHovered = hoveredOgrenci && masa.ogrenci?.id === hoveredOgrenci.id;
            
            return (
              <Tooltip 
                key={masa.id}
                title={
                  masa.ogrenci ? (
                    <Box sx={{ p: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {masa.ogrenci.ad} {masa.ogrenci.soyad}
                      </Typography>
                      <Typography variant="caption" display="block">
                        <strong>Okul No:</strong> {masa.ogrenci.numara || masa.ogrenci.okulNo}
                      </Typography>
                      <Typography variant="caption" display="block">
                        <strong>Şube:</strong> {masa.ogrenci.sinif || masa.ogrenci.sube}
                      </Typography>
                      {masa.ogrenci.kitapcik && (
                        <Typography variant="caption" display="block">
                          <strong>Kitapçık:</strong> {masa.ogrenci.kitapcik}
                        </Typography>
                      )}
                      {masa.ogrenci.dersler && masa.ogrenci.dersler.length > 0 && (
                        <Typography variant="caption" display="block">
                          <strong>Dersler:</strong> {masa.ogrenci.dersler.join(', ')}
                        </Typography>
                      )}
                      {masa.ogrenci.ozelDurum && (
                        <Typography variant="caption" display="block" color="warning.main">
                          <strong>Özel Durum:</strong> {masa.ogrenci.ozelDurum}
                        </Typography>
                      )}
                      {masa.ogrenci.esnekYerlestirme && (
                        <Typography variant="caption" display="block" color="info.main">
                          <strong>Esnek Yerleştirme:</strong> {masa.ogrenci.kuralIhlali || 'Kurallar esnetildi'}
                        </Typography>
                      )}
                    </Box>
                  ) : 'Boş masa'
                }
                arrow
                TransitionComponent={Zoom}
                enterDelay={300}
                leaveDelay={100}
              >
                <DroppableSeat 
                  masa={masa} 
                  onStudentMove={handleStudentMove}
                >
                  <DraggableStudent
                    masa={masa}
                    getGenderColor={getGenderColor}
                    onMasaClick={handleMasaClick}
                    onStudentHover={handleOgrenciHover}
                    onStudentLeave={handleOgrenciLeave}
                    isSecili={isSecili}
                    isHovered={isHovered}
                    onStudentMove={handleStudentMove}
                    onTransferClick={handleTransferClick}
                    currentSalon={sinif}
                    allSalons={tumSalonlar || []}
                    conflict={(() => {
                      const plan2D = Array(sinifDuzeni.satirSayisi).fill(null).map(() => Array(sinifDuzeni.sutunSayisi).fill(null));
                      sinifDuzeni.masalar.forEach(m => {
                        if (m.ogrenci) {
                          plan2D[m.satir][m.sutun] = { ogrenci: m.ogrenci, grup: m.grup };
                        }
                      });
                      return hasConstraintConflict(masa, plan2D);
                    })()}
                  />
                </DroppableSeat>
            </Tooltip>
            );
          })}
        </Box>
        )}


        {/* İstatistikler */}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Chip 
            label={`Toplam Kapasite: ${sinif?.koltukMatrisi?.masalar?.length || 42} koltuk`}
            color="primary"
            variant="outlined"
          />
          <Chip 
            label={`Yerleşen: ${(() => {
              // GÜVENLİK: Benzersiz öğrenci sayısını hesapla
              if (!Array.isArray(ogrenciler)) return 0;
              const uniqueIds = new Set(ogrenciler.map(o => o.id));
              return uniqueIds.size;
            })()} öğrenci`}
            color="success"
            variant="outlined"
          />
          {(() => {
            // Tüm öğrencilerden sınıf seviyelerini hesapla (yerleşen + yerleşmeyen)
            const sinifSeviyeleri = {};
            
            // GÜVENLİK: Önce duplicate öğrencileri temizle
            const uniqueOgrenciler = [];
            const seenIds = new Set();
            
            if (Array.isArray(ogrenciler)) {
              ogrenciler.forEach(ogrenci => {
                if (!seenIds.has(ogrenci.id)) {
                  uniqueOgrenciler.push(ogrenci);
                  seenIds.add(ogrenci.id);
                }
              });
              
              // Benzersiz öğrencilerden sınıf seviyelerini hesapla
              uniqueOgrenciler.forEach(ogrenci => {
                // Sınıf bilgisini sinif veya sube'den al
                const sinifBilgisi = ogrenci.sinif || ogrenci.sube;
                if (sinifBilgisi) {
                  const seviye = getSinifSeviyesi(sinifBilgisi); // 9, 10, 11, 12
                  if (seviye) {
                    sinifSeviyeleri[seviye] = (sinifSeviyeleri[seviye] || 0) + 1;
                  }
                }
              });
            }
            
            
            
            // Sadece 9, 10, 11, 12. sınıfları göster (1. sınıf gibi hatalı değerleri filtrele)
            const gecerliSeviyeler = ['9', '10', '11', '12'];
            
            return Object.entries(sinifSeviyeleri)
              .filter(([seviye]) => gecerliSeviyeler.includes(seviye))
              .sort(([a], [b]) => parseInt(a) - parseInt(b)) // Sırala: 9, 10, 11, 12
              .map(([seviye, sayi]) => (
          <Chip 
                  key={seviye}
                  label={`${seviye}. Sınıf: ${sayi} öğrenci`}
                  color={seviye === '9' ? 'primary' : seviye === '10' ? 'secondary' : seviye === '11' ? 'success' : 'warning'}
            variant="outlined"
          />
              ));
          })()}
        </Box>

        

        {/* Öğrenci Detay Modal */}
        <Dialog
          open={modalAcik}
          onClose={handleModalKapat}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color="primary" />
              <Typography variant="h6">
                {seciliOgrenci ? 'Öğrenci Bilgileri' : 'Masa Bilgileri'}
              </Typography>
            </Box>
          </DialogTitle>
          
          <DialogContent>
            {seciliOgrenci ? (
              <Box>
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
                    {seciliOgrenci.ad} {seciliOgrenci.soyad}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <ListItem disablePadding>
                        <ListItemIcon>
                          <SchoolIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Öğrenci Numarası"
                          secondary={seciliOgrenci.numara}
                        />
                      </ListItem>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <ListItem disablePadding>
                        <ListItemIcon>
                          <GradeIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Sınıf"
                          secondary={seciliOgrenci.sinif}
                        />
                      </ListItem>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <ListItem disablePadding>
                        <ListItemIcon>
                          <BookIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Sınava Gireceği Dersler"
                          secondary={(() => {
                            // Öğrencinin ders bilgisini hesapla
                            const ogrenciDersleri = getOgrenciDersleri(seciliOgrenci, ayarlar);
                            
                            // Eğer öğrenci objesinde dersler varsa onu kullan
                            if (seciliOgrenci.dersler && seciliOgrenci.dersler.length > 0) {
                              return seciliOgrenci.dersler.join(', ');
                            } else if (seciliOgrenci.sinavDersleri && seciliOgrenci.sinavDersleri.length > 0) {
                              return seciliOgrenci.sinavDersleri.join(', ');
                            } else if (seciliOgrenci.ders && seciliOgrenci.ders.length > 0) {
                              return seciliOgrenci.ders.join(', ');
                            } else if (ogrenciDersleri && ogrenciDersleri.length > 0) {
                              return ogrenciDersleri.join(', ');
                            } else {
                              return 'Ders bilgisi bulunmuyor';
                            }
                          })()}
                        />
                      </ListItem>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Boş Masa
                </Typography>
                {seciliMasa && (
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      Masa Konumu:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        label={`Masa: ${seciliMasa.masaNumarasi || calculateDeskNumberForMasa(seciliMasa)}`}
                        variant="outlined"
                        size="small"
                        color="primary"
                      />
                      <Chip 
                        label={`Satır: ${seciliMasa.satir + 1}`}
                        variant="outlined"
                        size="small"
                      />
                      <Chip 
                        label={`Sütun: ${seciliMasa.sutun + 1}`}
                        variant="outlined"
                        size="small"
                      />
                      <Chip 
                        label={`Pozisyon: ${seciliMasa.pozisyon}`}
                        color={seciliMasa.pozisyon === 'merkez' ? 'primary' : 'secondary'}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          
          <DialogActions>
            <Button onClick={handleModalKapat} color="primary">
              Kapat
            </Button>
          </DialogActions>
        </Dialog>

        {/* Transfer Modal */}
        <InterSalonTransfer
          open={transferModalAcik}
          onClose={handleTransferClose}
          student={transferOgrenci}
          currentSalon={sinif}
          allSalons={tumSalonlar || []}
          onTransfer={handleTransferExecute}
        />
      </Paper>
    </Box>
  );
});

SalonPlani.displayName = 'SalonPlani';

export default SalonPlani;
