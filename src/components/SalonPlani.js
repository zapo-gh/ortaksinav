import React, { memo, useState, useCallback, useEffect, useMemo } from 'react';
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
  TextField,
  Zoom,
  useMediaQuery,
  useTheme
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
  MeetingRoom as MeetingRoomIcon,
  AutoStories as AutoStoriesIcon,
} from '@mui/icons-material';
import TransferButton from './TransferButton';
import InterSalonTransfer from './InterSalonTransfer';
import { useExam } from '../context/ExamContext';

// Yerleşmeyen Öğrenci Seçici Modal Bileşeni
const YerlesmeyenOgrenciSeciciDialog = memo(({ open, onClose, unplacedStudents, onSelect, masaNo }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return unplacedStudents;
    return unplacedStudents.filter(s =>
      `${s.ad} ${s.soyad}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.numara?.toString().includes(searchTerm) ||
      s.sinif?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [unplacedStudents, searchTerm]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" />
          <Typography variant="h6">Öğrenci Yerleştir (Masa {masaNo})</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2, mt: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="İsim, numara veya sınıf ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Box>
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          {filteredStudents.length > 0 ? (
            filteredStudents.map((ogrenci) => {
              const genderColor = (ogrenci.cinsiyet === 'Kız' || ogrenci.cinsiyet === 'K' || ogrenci.cinsiyet === 'k' || ogrenci.cinsiyet === 'kadin' || ogrenci.cinsiyet === 'kadın') ? 'secondary' : 'primary';

              return (
                <ListItem
                  button
                  key={ogrenci.id}
                  onClick={() => onSelect(ogrenci)}
                  sx={{
                    border: '1px solid',
                    borderColor: `${genderColor}.main`,
                    mb: 1,
                    borderRadius: 1,
                    bgcolor: `${genderColor}.50`,
                    '&:hover': { bgcolor: `${genderColor}.100` }
                  }}
                >
                  <ListItemText
                    primary={`${ogrenci.ad} ${ogrenci.soyad}`}
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {ogrenci.sinif} - No: {ogrenci.numara}
                        <Box component="span" sx={{ color: `${genderColor}.main`, fontWeight: 'bold', ml: 1 }}>
                          ({ogrenci.cinsiyet === 'K' ? 'Kız' : 'Erkek'})
                        </Box>
                      </Typography>
                    }
                  />
                  <Button
                    variant="contained"
                    size="small"
                    color={genderColor}
                    sx={{ color: 'white' }}
                  >
                    Seç
                  </Button>
                </ListItem>
              );
            })
          ) : (
            <Typography variant="body2" color="text.secondary" align="center">
              Öğrenci bulunamadı.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
      </DialogActions>
    </Dialog>
  );
});


// Drag & Drop item types
const ITEM_TYPES = {
  STUDENT: 'student'
};

const getSalonYerlesenSayisi = (salon) => {
  if (!salon) return 0;
  const uniqueIds = new Set();

  const addStudent = (ogrenci) => {
    if (ogrenci && ogrenci.id != null) {
      uniqueIds.add(String(ogrenci.id));
    }
  };

  const addFromSeatArray = (koleksiyon) => {
    if (!Array.isArray(koleksiyon)) return;
    koleksiyon.forEach(koltuk => {
      if (!koltuk) return;
      if (koltuk.ogrenci) {
        addStudent(koltuk.ogrenci);
      }
    });
  };

  // KRİTİK DÜZELTME: Sadece masalar array'inden say
  // masalar array'i zaten gerçek yerleşimi gösteriyor
  // ogrenciler array'i duplicate saymaya neden olabilir
  addFromSeatArray(salon.masalar);

  // Fallback: Eğer masalar yoksa diğer kaynaklardan say
  if (!salon.masalar || salon.masalar.length === 0) {
    addFromSeatArray(salon.plan);
    addFromSeatArray(salon?.koltukMatrisi?.masalar);
    addFromSeatArray(salon?.salon?.masalar);

    // Son çare: ogrenciler array'inden say (ama sadece masalar yoksa)
    if (Array.isArray(salon.ogrenciler)) {
      salon.ogrenciler.forEach(addStudent);
    }
  }

  return uniqueIds.size;
};



// Droppable Seat Component - Optimized
const DroppableSeat = memo(({ masa, onStudentMove, children, readOnly = false }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPES.STUDENT,
    drop: (item, monitor) => {
      // Public modda yerleşim planları değiştirilemez
      if (readOnly) {
        return { dropped: false };
      }
      if (item.masaId !== masa.id && onStudentMove) {
        onStudentMove(item.masaId, masa.id, item.ogrenci);
      }
      return { dropped: true };
    },
    canDrop: () => !readOnly,
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

const SalonStatsChips = React.memo(({ mode, toplam, yerlesen, yerlesmeyen }) => {
  if (mode === 'plan') {
    return (
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.5, sm: 1 },
        ml: { xs: 0, sm: 2 },
        flexWrap: 'wrap',
        justifyContent: { xs: 'center', sm: 'flex-start' }
      }}>
        <Chip label={`Toplam: ${toplam}`} color="primary" variant="outlined" size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }} />
        <Chip label={`Yerleşen: ${yerlesen}`} color="success" variant="outlined" size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }} />
        <Chip label={`Yerleşmeyen: ${yerlesmeyen}`} color="warning" variant="outlined" size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }} />
      </Box>
    );
  }

  if (mode === 'list') {
    return (
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.5, sm: 1 },
        ml: { xs: 0, sm: 2 },
        flexWrap: 'wrap',
        justifyContent: { xs: 'center', sm: 'flex-start' }
      }}>
        <Chip label={`Toplam: ${toplam}`} color="primary" variant="outlined" size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }} />
        <Chip label={`Yerleşen: ${yerlesen}`} color="success" variant="outlined" size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }} />
        <Chip label={`Yerleşmeyen: ${yerlesmeyen}`} color="warning" variant="outlined" size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }} />
      </Box>
    );
  }

  return null;
});

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

// Draggable Student Component - Optimized and Color Coordinated
const DraggableStudent = memo(({
  masa,
  getGenderColor,
  onMasaClick,
  onStudentHover,
  onStudentLeave,
  isSecili,
  isHovered,
  onStudentMove,
  onTransferClick,
  currentSalon,
  allSalons,
  readOnly = false,
  sinifDuzeni,
  getConstraintConflictInfo,
  calculateDeskNumberForMasa,
  plan2D,
  conflict // Parent sends 'conflict' object directly
}) => {
  const theme = useTheme();

  // Conflict object is passed directly from parent, no need to recalculate


  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPES.STUDENT,
    item: () => ({
      masaId: masa.id,
      ogrenci: masa.ogrenci
    }),
    canDrag: !!masa.ogrenci && !readOnly,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    options: {
      dragPreviewOptions: {
        anchorX: 0.5,
        anchorY: 0.5,
      },
    },
  });

  // Kısıt durumuna göre stil belirle - Sadece renk ve border
  const conflictStyle = useMemo(() => {
    if (!conflict) return null;
    // Kullanıcı isteği: Yan yana sınıf kısıtı KIRMIZI, Cinsiyet kısıtı TURUNCU olsun
    if (conflict.classSideBySide || conflict.classBackToBack) return {
      borderColor: 'error.main',
      bgcolor: 'error.50',
      glowColor: theme.palette.error.main
    };
    if (conflict.gender) return {
      borderColor: 'warning.main',
      bgcolor: 'warning.50',
      glowColor: theme.palette.warning.main
    };
    return null;
  }, [conflict, theme]);

  return (
    <Box
      ref={drag}
      sx={{
        cursor: masa.ogrenci ? 'grab' : 'default',
        width: '100%',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'rotate(5deg)' : 'rotate(0deg)',
        transition: 'opacity 0.1s ease, background-color 0.1s ease',
        position: 'relative' // Badge için relative
      }}
    >
      <Paper
        elevation={masa.ogrenci ? (isSecili ? 6 : 3) : 1} // Elevation korundu
        onClick={() => onMasaClick(masa, masa.ogrenci)}
        onMouseEnter={() => masa.ogrenci && onStudentHover(masa.ogrenci)}
        onMouseLeave={onStudentLeave}
        sx={{
          p: { xs: 0.5, sm: 1 },
          minHeight: { xs: 60, sm: 80 },
          maxHeight: { xs: 60, sm: 80 },
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',

          // Arkaplan: Kısıt varsa özel renk, yoksa cinsiyet rengi
          bgcolor: masa.ogrenci
            ? (conflictStyle ? conflictStyle.bgcolor : (getGenderColor(masa.ogrenci) === 'secondary' ? 'secondary.50' : 'primary.50'))
            : 'grey.100',

          // Border: Kısıt varsa özel renk, yoksa cinsiyet rengi
          border: masa.ogrenci ? (conflictStyle ? '2px solid' : '2px solid') : '1px solid',
          borderColor: masa.ogrenci
            ? (conflictStyle ? conflictStyle.borderColor : (getGenderColor(masa.ogrenci) === 'secondary' ? 'secondary.main' : 'primary.main'))
            : 'grey.300',

          position: 'relative',
          cursor: 'pointer',
          transition: 'transform 0.1s ease, box-shadow 0.1s ease',
          transform: isSecili ? 'scale(1.05)' : 'scale(1)',

          // Shadow: Kısıt varsa glow efekti
          boxShadow: isSecili
            ? 6
            : (conflictStyle ? `0 0 8px ${conflictStyle.glowColor}80` : (masa.ogrenci ? 3 : 1)),

          zIndex: isSecili ? 10 : 1,

          // Kısıt varsa pulse animasyonu
          ...(conflictStyle && {
            animation: 'pulse-border 2s infinite',
            '@keyframes pulse-border': {
              '0%': { boxShadow: `0 0 0 0 ${conflictStyle.glowColor}40` },
              '70%': { boxShadow: `0 0 0 4px rgba(0,0,0,0)` },
              '100%': { boxShadow: `0 0 0 0 rgba(0,0,0,0)` }
            }
          }),

          '&:hover': {
            transform: isSecili ? 'scale(1.05)' : 'scale(1.02)',
            boxShadow: isSecili ? 8 : (conflictStyle ? `0 0 12px ${conflictStyle.glowColor}` : 4),
            bgcolor: masa.ogrenci
              ? (conflictStyle ? conflictStyle.bgcolor : (getGenderColor(masa.ogrenci) === 'secondary' ? 'secondary.100' : 'primary.100'))
              : 'grey.200',
            zIndex: 10
          },

          // Seçili olma efekti (korunuyor)
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
        {/* Modern Kısıt Badge'i - Layout'u bozmadan overlay olarak ekle - ÇOKLU GÖSTERİM */}
        {conflict && (conflict.gender || conflict.classSideBySide || conflict.classBackToBack) && getConstraintConflictInfo && plan2D && (() => {
          const info = getConstraintConflictInfo(masa, plan2D);
          if (!info.hasConflict) return null;

          return (
            <Tooltip title={info.message} placement="top" arrow>
              <Box
                sx={{
                  position: 'absolute',
                  top: -8, // Biraz daha yukarı taşır
                  right: -8, // Biraz daha dışarı taşır
                  display: 'flex',
                  gap: 0.5, // Badgeler arası boşluk
                  zIndex: 20,
                  flexDirection: 'row-reverse' // Sağdan sola dizersin
                }}
              >
                {/* Sınıf Çakışması Varsa - Kırmızı ! */}
                {(conflict.classSideBySide || conflict.classBackToBack) && (
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'error.main', // Kırmızı
                      borderRadius: '50%',
                      boxShadow: 2,
                      border: '2px solid white'
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '12px', lineHeight: 1 }}>
                      !
                    </Typography>
                  </Box>
                )}

                {/* Cinsiyet Çakışması Varsa - Turuncu C */}
                {conflict.gender && (
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'warning.main', // Turuncu
                      borderRadius: '50%',
                      boxShadow: 2,
                      border: '2px solid white'
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '11px', lineHeight: 1 }}>
                      C
                    </Typography>
                  </Box>
                )}
              </Box>
            </Tooltip>
          );
        })()}

        {/* Orijinal pozisyonunda masa numarası */}
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: { xs: 0.5, sm: 1 },
            left: { xs: 1, sm: 2 },
            fontWeight: 'bold',
            color: 'text.secondary',
            fontSize: { xs: '0.5rem', sm: '0.6rem' },
            cursor: 'default'
          }}
        >
          {masa.masaNumarasi || (calculateDeskNumberForMasa && calculateDeskNumberForMasa(masa))}
        </Typography>

        {masa.ogrenci ? (
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Avatar sx={{ width: { xs: 16, sm: 20 }, height: { xs: 16, sm: 20 }, mx: 'auto', mb: 0.5, bgcolor: `${getGenderColor(masa.ogrenci)}.main` }}>
              <PersonIcon sx={{ fontSize: { xs: 10, sm: 12 } }} />
            </Avatar>
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', fontSize: { xs: '0.55rem', sm: '0.65rem' }, lineHeight: 1 }}>
              {masa.ogrenci.ad} {masa.ogrenci.soyad}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontSize: { xs: '0.5rem', sm: '0.6rem' }, color: 'text.secondary' }}>
              {masa.ogrenci.numara}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', fontSize: { xs: '0.45rem', sm: '0.55rem' }, color: 'text.primary', fontWeight: 'bold' }}>
              {masa.ogrenci.sinif || masa.ogrenci.sube}
            </Typography>
            <Box sx={{ position: 'absolute', bottom: 4, right: 4, opacity: isHovered ? 1 : 0.7, zIndex: 20, '&:hover': { opacity: 1 } }} onClick={e => e.stopPropagation()}>
              <TransferButton student={masa.ogrenci} currentSalon={currentSalon} allSalons={allSalons} onTransferClick={onTransferClick} disabled={isDragging} />
            </Box>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
            <ChairIcon sx={{ fontSize: { xs: 12, sm: 16 }, mb: 0.5 }} />
            <Typography variant="caption" sx={{ fontSize: { xs: '0.5rem', sm: '0.6rem' } }}>Boş</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
});

// Grup bazlı masa numarası hesaplama fonksiyonu - İSTENEN SIRALAMA ALGORİTMASI
// Pure function - outside component
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
    const sortedGrupMasalar = grupMasalar.sort((a, b) => {
      if (a.satir !== b.satir) {
        return a.satir - b.satir;
      }
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

const SalonPlani = memo(({ sinif, ogrenciler, seciliOgrenciId, kalanOgrenciler = [], onOgrenciSec, tumSalonlar, onSalonDegistir, ayarlar = {}, salonlar = [], seciliSalonId, onSeciliSalonDegistir, onStudentTransfer, yerlestirmeSonucu, tumOgrenciSayisi, aktifPlanAdi = '', readOnly = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showConfirm, showSuccess } = useNotifications();

  const [modalAcik, setModalAcik] = useState(false);
  const [seciliOgrenci, setSeciliOgrenci] = useState(null);
  const [seciliMasa, setSeciliMasa] = useState(null);
  const [hoveredOgrenci, setHoveredOgrenci] = useState(null);
  const [transferModalAcik, setTransferModalAcik] = useState(false);
  const [transferOgrenci, setTransferOgrenci] = useState(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false); // Onay dialog state
  const [unplacedModalOpen, setUnplacedModalOpen] = useState(false);
  const { ogrenciler: globalOgrenciler, placementIndex } = useExam();

  // Yerleşmeyen öğrencileri hesapla
  const unplacedStudents = useMemo(() => {
    // Seçili sınıfları tespit et
    const seciliSiniflar = new Set();
    if (ayarlar?.dersler && Array.isArray(ayarlar.dersler)) {
      ayarlar.dersler.forEach(ders => {
        if (ders.siniflar && Array.isArray(ders.siniflar)) {
          ders.siniflar.forEach(sinif => seciliSiniflar.add(sinif));
        }
      });
    }

    // Tüm öğrencilerden yerleşmiş olanları VE seçili sınıfta olmayanları ayıkla
    // placementIndex içinde olanlar yerleşmiştir
    return globalOgrenciler.filter(s => {
      const yerlesmemis = !placementIndex[s.id];
      const sinifiSecili = seciliSiniflar.size === 0 || seciliSiniflar.has(s.sinif);
      return yerlesmemis && sinifiSecili;
    });
  }, [globalOgrenciler, placementIndex, ayarlar?.dersler]);


  // Öğrenciyi listeden çıkarma işlemi
  const handleRemoveStudentClick = useCallback(() => {
    setConfirmationOpen(true);
  }, []);

  const handleConfirmRemove = useCallback(() => {
    if (seciliMasa && seciliMasa.id) {
      if (onOgrenciSec && typeof onOgrenciSec === 'function') {
        // 'move' action with to: null means remove from salon
        onOgrenciSec('move', { from: seciliMasa.id, to: null });
        showSuccess(`${seciliOgrenci?.ad} ${seciliOgrenci?.soyad} listeden çıkarıldı.`);
      }
    }
    setConfirmationOpen(false);
    setModalAcik(false);
    setSeciliOgrenci(null);
    setSeciliMasa(null);
  }, [seciliMasa, seciliOgrenci, onOgrenciSec, showConfirm]);

  const handleCancelRemove = useCallback(() => {
    setConfirmationOpen(false);
  }, []);

  // Cinsiyet bazlı renk fonksiyonu - useCallback ile optimize edildi
  const getGenderColor = useCallback((ogrenci) => {
    if (!ogrenci || !ogrenci.cinsiyet) return 'primary';

    const cinsiyet = ogrenci.cinsiyet.toString().toLowerCase().trim();
    return cinsiyet === 'kız' || cinsiyet === 'kadin' || cinsiyet === 'k' ? 'secondary' : 'primary';
  }, []);

  // Sınıf düzenini oluştur - GRUP BAZLI SALON YAPISINI KULLANAN
  const sinifDuzeni = useMemo(() => {
    if (!sinif) {
      return null;
    }

    // KRITIK: siraDizilimi kontrolü - eksikse varsayılan değerler ekle
    if (!sinif.siraDizilimi || !sinif.siraDizilimi.satir || !sinif.siraDizilimi.sutun) {
      console.warn('⚠️ SalonPlani: sinif.siraDizilimi eksik, varsayılan değerler kullanılıyor');
      const kapasite = sinif.kapasite || 30;
      sinif.siraDizilimi = sinif.siraDizilimi || {};
      sinif.siraDizilimi.satir = sinif.siraDizilimi.satir || Math.ceil(Math.sqrt(kapasite)) || 6;
      sinif.siraDizilimi.sutun = sinif.siraDizilimi.sutun || Math.ceil(kapasite / sinif.siraDizilimi.satir) || 5;
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
    if (sinif.siraTipi && sinif.gruplar && Array.isArray(sinif.gruplar) && sinif.gruplar.length > 0) {
      const { siraTipi, gruplar } = sinif;
      const masalar = [];
      let masaIndex = 0;

      // En fazla sıra sayısını bul - gruplar boş veya geçersizse varsayılan değer kullan
      const siraSayilari = gruplar.map(g => g?.siraSayisi || 0).filter(s => s > 0);
      const maxSiraSayisi = siraSayilari.length > 0 ? Math.max(...siraSayilari) : 6;

      // Grup bazlı masa düzeni oluştur (yerleştirme algoritması ile aynı)
      for (let satir = 0; satir < maxSiraSayisi; satir++) {
        gruplar.forEach((grup, grupIndex) => {
          const grupSiraSayisi = grup?.siraSayisi || 0;
          if (grupSiraSayisi > 0 && satir < grupSiraSayisi) {
            if (siraTipi === 'tekli') {
              masalar.push({
                id: masaIndex++,
                satir: satir,
                sutun: grupIndex,
                grup: grup?.id || (grupIndex + 1),
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
                grup: grup?.id || (grupIndex + 1),
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
                grup: grup?.id || (grupIndex + 1),
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


  // Tek masa için masa numarası hesaplama fonksiyonu
  const calculateDeskNumberForMasa = useCallback((masa) => {
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
  }, [sinifDuzeni]);

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
  }, [onOgrenciSec, sinif, ogrenciler]);

  const handleMasaClick = useCallback((masa, ogrenci) => {
    // Sadece öğrenci varsa modal aç (public modda da görüntüleme için izin ver)
    if (ogrenci) {
      setSeciliMasa(masa);
      setSeciliOgrenci(ogrenci);
      setModalAcik(true);
    } else if (!readOnly) {
      // Boş masa için yerleştirmeyen öğrenciler modalını aç
      setSeciliMasa(masa);
      setUnplacedModalOpen(true);
    }
  }, [readOnly]);

  const handleUnplacedStudentSelect = useCallback((ogrenci) => {
    if (seciliMasa && ogrenci) {
      handleStudentMove(null, seciliMasa.id, ogrenci);
      setUnplacedModalOpen(false);
      setSeciliMasa(null);
    }
  }, [seciliMasa, handleStudentMove]);

  const handleUnplacedModalClose = useCallback(() => {
    setUnplacedModalOpen(false);
    setSeciliMasa(null);
  }, []);




  const handleModalKapat = useCallback(() => {
    setModalAcik(false);
    setSeciliOgrenci(null);
    setSeciliMasa(null);
  }, []);

  // Transfer işlemleri
  const handleTransferClick = useCallback((student, currentSalon, targetSalon) => {
    // Public modda yerleşim planları değiştirilemez
    if (readOnly) {
      return;
    }
    setTransferOgrenci(student);
    setTransferModalAcik(true);
  }, [readOnly]);

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
    setHoveredOgrenci(prev => {
      // Eğer aynı öğrenci ise state güncelleme (referans değişse bile id aynıysa)
      if (prev?.id === ogrenci?.id) return prev;
      return ogrenci;
    });
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

  const getPozisyonLocal = (satir, sutun, satirSayisi, sutunSayisi) => {
    return getPozisyon(satir, sutun, satirSayisi, sutunSayisi);
  };





  // KRİTİK: plan2D'yi bir kez oluştur ve hasConstraintConflict için kullan
  const plan2D = useMemo(() => {
    if (!sinifDuzeni || !sinifDuzeni.masalar || !Array.isArray(sinifDuzeni.masalar)) {
      return null;
    }

    const satirSayisi = sinifDuzeni.satirSayisi || 0;
    const sutunSayisi = sinifDuzeni.sutunSayisi || 0;
    const p2d = Array(satirSayisi).fill(null).map(() => Array(sutunSayisi).fill(null));

    sinifDuzeni.masalar.forEach(m => {
      if (m && m.ogrenci && typeof m.satir === 'number' && typeof m.sutun === 'number') {
        if (m.satir >= 0 && m.satir < satirSayisi && m.sutun >= 0 && m.sutun < sutunSayisi) {
          p2d[m.satir][m.sutun] = { ogrenci: m.ogrenci, grup: m.grup };
        }
      }
    });
    return p2d;
  }, [sinifDuzeni]);




  // Salon sıralamasını memoize et - sıralama her render'da değişmesin
  // KULLANICI DEĞİŞTİRMEDİĞİ SÜRECE SIRALAMA DEĞİŞMESİN
  const sortedTumSalonlar = useMemo(() => {
    if (!tumSalonlar || tumSalonlar.length === 0) return [];
    const unique = new Map();
    tumSalonlar.forEach((salon) => {
      const key = salon?.salonId ?? salon?.id ?? JSON.stringify(salon);
      if (!unique.has(key)) {
        unique.set(key, salon);
      }
    });
    return Array.from(unique.values());
  }, [tumSalonlar]);

  const sortedSalonlar = useMemo(() => {
    if (!salonlar || salonlar.length === 0) return [];
    const unique = new Map();
    salonlar.forEach((salon) => {
      const key = salon?.id ?? salon?.salonId ?? JSON.stringify(salon);
      if (!unique.has(key)) {
        unique.set(key, salon);
      }
    });
    return Array.from(unique.values());
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
            {sinif ? 'Salon yükleniyor...' : 'Salon bilgisi bulunamadı'}
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
            <ChairIcon sx={{ mr: 1, color: 'primary.main', fontSize: { xs: 24, sm: 28 } }} />
            <Typography variant="h6" component="h2" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, color: 'text.primary', fontWeight: 'bold' }}>
              {(sinif?.ad || sinif?.salonAdi) ? `${sinif.ad || sinif.salonAdi} Salon Planı` : 'Salon Planları'}
            </Typography>

            {/* Öğrenci Sayıları */}
            <SalonStatsChips {...useMemo(() => {
              if (yerlestirmeSonucu && Array.isArray(yerlestirmeSonucu.tumSalonlar)) {
                const countFilled = (salonKaydi) => {
                  if (!salonKaydi) return 0;
                  const uniqueStudentIds = new Set();

                  const normalizeId = (value) => {
                    if (value === null || value === undefined) return null;
                    const str = String(value).trim();
                    return str.length > 0 ? str : null;
                  };

                  const addStudent = (ogrenci) => {
                    if (!ogrenci) return;
                    const normalizedId = normalizeId(ogrenci.id);
                    if (normalizedId) {
                      uniqueStudentIds.add(normalizedId);
                    }
                  };

                  const addFromSeatArray = (seatArray) => {
                    if (!Array.isArray(seatArray)) return;
                    seatArray.forEach(seat => {
                      if (!seat) return;
                      if (seat.ogrenci) {
                        addStudent(seat.ogrenci);
                      }
                    });
                  };

                  // KRİTİK DÜZELTME: Sadece masalar array'inden say
                  // masalar array'i zaten gerçek yerleşimi gösteriyor
                  // ogrenciler array'i duplicate saymaya neden olabilir
                  addFromSeatArray(salonKaydi.masalar);

                  // Fallback: Eğer masalar yoksa diğer kaynaklardan say
                  if (!salonKaydi.masalar || salonKaydi.masalar.length === 0) {
                    // gruplar hem obje hem dizi olabiliyor
                    if (salonKaydi.gruplar) {
                      const grupValues = Array.isArray(salonKaydi.gruplar)
                        ? salonKaydi.gruplar
                        : Object.values(salonKaydi.gruplar);
                      grupValues.forEach(grup => addFromSeatArray(grup));
                    }
                    addFromSeatArray(salonKaydi.plan);
                    addFromSeatArray(salonKaydi?.koltukMatrisi?.masalar);
                    addFromSeatArray(salonKaydi?.salon?.masalar);

                    // Son çare: ogrenciler array'inden say (ama sadece masalar yoksa)
                    if (Array.isArray(salonKaydi.ogrenciler)) {
                      salonKaydi.ogrenciler.forEach(addStudent);
                    }
                  }

                  return uniqueStudentIds.size;
                };
                const toplamYerlesen = yerlestirmeSonucu.tumSalonlar.reduce((toplam, s) => toplam + countFilled(s), 0);
                const filteredYerlesilemeyen = (yerlestirmeSonucu.yerlesilemeyenOgrenciler || [])
                  .filter(uOgr => globalOgrenciler.some(gOgr => gOgr.id === uOgr.id));

                const toplamYerlesilemeyen = filteredYerlesilemeyen.length;

                // KRİTİK DÜZELTME: Toplam öğrenci sayısını istatistiklerden al
                // Transfer işlemi sonrasında toplam öğrenci sayısı değişmemeli
                const toplamOgrenci = yerlestirmeSonucu.istatistikler?.toplamOgrenci || (toplamYerlesen + toplamYerlesilemeyen);

                return {
                  mode: 'plan',
                  toplam: toplamOgrenci, // İstatistiklerden al
                  yerlesen: toplamYerlesen,
                  yerlesmeyen: toplamYerlesilemeyen
                };
              }

              if (Array.isArray(ogrenciler) && ogrenciler.length > 0) {
                const seenIds = new Set();
                let yerlesenSayisi = 0;
                let yerlesmeyenSayisi = 0;
                ogrenciler.forEach(o => {
                  if (o && o.id && !seenIds.has(o.id)) {
                    seenIds.add(o.id);
                    if (o.salonId) {
                      yerlesenSayisi += 1;
                    } else {
                      yerlesmeyenSayisi += 1;
                    }
                  }
                });
                return {
                  mode: 'list',
                  toplam: seenIds.size,
                  yerlesen: yerlesenSayisi,
                  yerlesmeyen: yerlesmeyenSayisi
                };
              }
              return { mode: null };
            }, [yerlestirmeSonucu, ogrenciler])} />
          </Box>

          <Box sx={{
            display: 'flex',
            gap: { xs: 0.5, sm: 1 },
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'center', sm: 'flex-start' }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: { xs: '100%', sm: 'auto' }, maxWidth: '100%' }}>
              {aktifPlanAdi ? (
                <Chip
                  label={`Plan: ${aktifPlanAdi}`}
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{
                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                    fontWeight: 500,
                    maxWidth: { xs: '200px', sm: 'none' }, minWidth: 0,
                    textTransform: 'none',
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block'
                    }
                  }}
                  title={`Plan: ${aktifPlanAdi}`}
                />
              ) : null}
              <Tooltip title="Yerleşimi Temizle">
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />}
                  onClick={async () => {
                    const confirmed = await showConfirm('Tüm yerleştirme sonuçlarını temizlemek istediğinizden emin misiniz?');
                    if (confirmed) {
                      if (typeof onOgrenciSec === 'function') {
                        onOgrenciSec('clear');
                      }
                    }
                  }}
                  sx={{
                    flexShrink: 0,

                    bgcolor: 'error.50',
                    borderColor: 'error.200',
                    color: 'error.main',
                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                    px: { xs: 1, sm: 1.5 },
                    py: { xs: 0, sm: 0.75 },
                    height: { xs: 24, sm: 'auto' },
                    minWidth: { xs: 'auto', sm: 'auto' },
                    '& .MuiButton-startIcon': {
                      mr: { xs: 0.5, sm: 1 }
                    },
                    '&:hover': {
                      bgcolor: 'error.100',
                      borderColor: 'error.300'
                    }
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Yerleşimi </Box>Temizle
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Salon sekmeleri - Hem yerleştirme planı varken hem de yokken göster */}
        {((tumSalonlar && tumSalonlar.length > 1) || (salonlar && salonlar.length > 0)) && (
          <Paper elevation={1} sx={{ p: { xs: 1, sm: 2 }, mb: 3, bgcolor: 'grey.50' }}>
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 0.5, sm: 1 },
                flexWrap: { xs: 'nowrap', sm: 'wrap' },
                overflowX: { xs: 'auto', sm: 'visible' },
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: { xs: 'thin', sm: 'auto' },
                '&::-webkit-scrollbar': {
                  height: { xs: 6, sm: 'auto' }
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: { xs: 'rgba(0,0,0,0.05)', sm: 'transparent' }
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: { xs: 'rgba(0,0,0,0.2)', sm: 'transparent' },
                  borderRadius: { xs: 3, sm: 0 }
                },
                justifyContent: { xs: 'flex-start', sm: 'center' },
                alignItems: 'center',
                flexDirection: 'row',
                pb: { xs: 1, sm: 0 }
              }}
            >
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
                        minWidth: { xs: 'auto', sm: 70 },
                        maxWidth: { xs: '110px', sm: 'none' },
                        width: { xs: 'auto', sm: 'auto' },
                        flexShrink: 0,
                        borderRadius: { xs: 2, sm: 3 },
                        textTransform: 'none',
                        fontWeight: isActive ? 'bold' : 'normal',
                        boxShadow: 'none',
                        px: { xs: 0.75, sm: 1.25 },
                        py: { xs: 0.5, sm: 0.5 },
                        minHeight: { xs: 28, sm: 'auto' },
                        height: { xs: 28, sm: 'auto' },
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: { xs: 0.5, sm: 0.75 },
                        '& > *': {
                          display: 'flex',
                          alignItems: 'center'
                        },
                        '&:hover': {
                          boxShadow: 'none',
                          // Transform yerine sadece box-shadow ile hover efekti
                        },
                        transition: 'background-color 0.2s ease',
                        mb: { xs: 0, sm: 0 }
                      }}
                    >
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{
                          fontSize: { xs: '0.7rem', sm: '0.875rem' },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: { xs: '85px', sm: 'none' },
                          title: salon.salonAdi,
                          lineHeight: 1.2,
                          alignSelf: 'center'
                        }}
                      >
                        {salon.salonAdi}
                      </Typography>
                      <Chip
                        label={getSalonYerlesenSayisi(salon)}
                        size="small"
                        title="Bu salonda yerleşen öğrenci sayısı"
                        sx={{
                          ml: 0,
                          mt: 0,
                          height: { xs: 18, sm: 24 },
                          fontSize: { xs: '0.6rem', sm: '0.75rem' },
                          fontWeight: 'bold',
                          backgroundColor: isActive ? 'white' : 'primary.main',
                          color: isActive ? 'primary.main' : 'white',
                          alignSelf: 'center',
                          '& .MuiChip-label': {
                            px: { xs: 0.5, sm: 0.75 }
                          }
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
                        minWidth: { xs: 'auto', sm: 70 },
                        maxWidth: { xs: '110px', sm: 'none' },
                        width: { xs: 'auto', sm: 'auto' },
                        flexShrink: 0,
                        borderRadius: { xs: 2, sm: 3 },
                        textTransform: 'none',
                        fontWeight: isActive ? 'bold' : 'normal',
                        boxShadow: 'none',
                        px: { xs: 0.75, sm: 1.25 },
                        py: { xs: 0.5, sm: 0.5 },
                        minHeight: { xs: 28, sm: 'auto' },
                        height: { xs: 28, sm: 'auto' },
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: { xs: 0.5, sm: 0.75 },
                        '& > *': {
                          display: 'flex',
                          alignItems: 'center'
                        },
                        '&:hover': {
                          boxShadow: 'none',
                          // Transform yerine sadece box-shadow ile hover efekti
                        },
                        transition: 'background-color 0.2s ease',
                        mb: { xs: 0, sm: 0 }
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: { xs: '0.7rem', sm: '0.875rem' },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: { xs: '85px', sm: 'none' },
                          title: salon.ad || salon.salonAdi || `Salon ${salon.id}`,
                          lineHeight: 1.2
                        }}
                      >
                        {salon.ad || salon.salonAdi || `Salon ${salon.id}`}
                      </Typography>
                      <Chip
                        label={getSalonYerlesenSayisi(salon)}
                        size="small"
                        title="Bu salonda yerleşen öğrenci sayısı"
                        sx={{
                          ml: 0,
                          mt: 0,
                          height: { xs: 18, sm: 24 },
                          fontSize: { xs: '0.6rem', sm: '0.75rem' },
                          fontWeight: 'bold',
                          backgroundColor: isActive ? 'white' : 'primary.main',
                          color: isActive ? 'primary.main' : 'white',
                          alignSelf: 'center',
                          '& .MuiChip-label': {
                            px: { xs: 0.5, sm: 0.75 }
                          }
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
          // Grup bazlı görüntüleme - Mobilde 2 sütun, masaüstünde yan yana
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(auto-fit, minmax(280px, 1fr))' },
            gap: { xs: 1.5, sm: 3 },
            justifyContent: 'center',
            alignItems: { xs: 'stretch', sm: 'flex-start' },
            mb: 2,
            width: '100%'
          }}>
            {Object.keys(sinifDuzeni.gruplar).map((grupId, index) => {
              // Güvenlik kontrolü: grupId'nin gruplar'da var olduğundan ve array olduğundan emin ol
              const grupMasalar = sinifDuzeni.gruplar[grupId];
              if (!grupMasalar || !Array.isArray(grupMasalar)) {
                return null; // Geçersiz grup, render etme
              }

              return (
                <Box key={grupId} sx={{
                  minWidth: { xs: 0, sm: '280px' },
                  width: { xs: '100%', sm: 'auto' },
                  maxWidth: { xs: '100%', sm: '25%' }
                }}>
                  <Typography variant="subtitle1" sx={{
                    mb: 1,
                    color: 'primary.main',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }}>
                    Grup {index + 1}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: { xs: 0.3, sm: 0.5 },
                      maxWidth: '100%',
                      mx: 'auto'
                    }}
                  >
                    {grupMasalar.map((masa) => {
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
                          <DroppableSeat masa={masa} onStudentMove={handleStudentMove} readOnly={readOnly}>
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
                              readOnly={readOnly}
                              sinifDuzeni={sinifDuzeni}
                              getConstraintConflictInfo={getConstraintConflictInfo}
                              calculateDeskNumberForMasa={calculateDeskNumberForMasa}
                              plan2D={plan2D}
                              conflict={hasConstraintConflict(masa, plan2D)}
                            />
                          </DroppableSeat>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
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
                    readOnly={readOnly}
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
                      readOnly={readOnly}
                      sinifDuzeni={sinifDuzeni}
                      getConstraintConflictInfo={getConstraintConflictInfo}
                      calculateDeskNumberForMasa={calculateDeskNumberForMasa}
                      plan2D={plan2D}
                      hasConstraintConflict={hasConstraintConflict}
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
            label={`Toplam Kapasite: ${(() => {
              // Önce kapasite property'sini kontrol et (en güvenilir)
              if (sinif?.kapasite && typeof sinif.kapasite === 'number' && sinif.kapasite > 0) {
                return sinif.kapasite;
              }
              // Sonra masalar array'inin uzunluğunu kontrol et
              if (sinif?.masalar && Array.isArray(sinif.masalar) && sinif.masalar.length > 0) {
                return sinif.masalar.length;
              }
              // Sonra koltukMatrisi.masalar array'inin uzunluğunu kontrol et
              if (sinif?.koltukMatrisi?.masalar && Array.isArray(sinif.koltukMatrisi.masalar) && sinif.koltukMatrisi.masalar.length > 0) {
                return sinif.koltukMatrisi.masalar.length;
              }
              // Son olarak siraDizilimi'nden hesapla
              if (sinif?.siraDizilimi) {
                return (sinif.siraDizilimi.satir || 0) * (sinif.siraDizilimi.sutun || 0);
              }
              return 0;
            })()} koltuk`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Yerleşen: ${(() => {
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
          <DialogTitle sx={{
            bgcolor: seciliOgrenci ? `${getGenderColor(seciliOgrenci)}.main` : 'primary.main',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ color: 'white' }} />
              <Typography variant="h6">
                {seciliOgrenci ? 'Öğrenci Detayları' : 'Masa Bilgileri'}
              </Typography>
            </Box>
            {seciliOgrenci && (
              <Chip
                label={seciliOgrenci.cinsiyet === 'K' ? 'Kız' : 'Erkek'}
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
            )}
          </DialogTitle>

          <DialogContent sx={{ mt: 2 }}>
            {seciliOgrenci ? (
              <Box>
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  mb: 3,
                  p: 2,
                  bgcolor: `${getGenderColor(seciliOgrenci)}.50`,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: `${getGenderColor(seciliOgrenci)}.200`
                }}>
                  <Avatar sx={{
                    width: 64,
                    height: 64,
                    bgcolor: `${getGenderColor(seciliOgrenci)}.main`,
                    fontSize: 32,
                    mb: 2
                  }}>
                    {seciliOgrenci.ad ? seciliOgrenci.ad.charAt(0) : ''}
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: `${getGenderColor(seciliOgrenci)}.main` }}>
                    {seciliOgrenci.ad} {seciliOgrenci.soyad}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    {seciliOgrenci.sinif || seciliOgrenci.sube} - {seciliOgrenci.numara}
                  </Typography>
                </Box>

                <Box sx={{
                  display: 'flex',
                  gap: 1.5,
                  flexWrap: 'nowrap', // Force single line
                  alignItems: 'stretch',
                  overflowX: 'auto',
                  pb: 1
                }}>
                  {/* Öğrenci No */}
                  <Box sx={{
                    flex: '1 1 auto',
                    minWidth: '100px',
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'primary.50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'primary.main',
                      flexShrink: 0
                    }}>
                      <SchoolIcon fontSize="small" />
                    </Box>
                    <Box sx={{ overflow: 'hidden' }}>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ lineHeight: 1 }}>
                        Numara
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" noWrap>
                        {seciliOgrenci.numara}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Sınıf */}
                  <Box sx={{
                    flex: '1 1 auto',
                    minWidth: '100px',
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'secondary.50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'secondary.main',
                      flexShrink: 0
                    }}>
                      <MeetingRoomIcon fontSize="small" />
                    </Box>
                    <Box sx={{ overflow: 'hidden' }}>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ lineHeight: 1 }}>
                        Sınıf
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" noWrap>
                        {seciliOgrenci.sinif || seciliOgrenci.sube}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Dersler */}
                  <Box sx={{
                    flex: '2 1 auto', // More space for lessons
                    minWidth: '140px',
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.200',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'success.50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'success.main',
                      flexShrink: 0
                    }}>
                      <AutoStoriesIcon fontSize="small" />
                    </Box>
                    <Box sx={{ overflow: 'hidden' }}>
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ lineHeight: 1 }}>
                        Sınav
                      </Typography>
                      <Tooltip title={(() => {
                        const ogrenciDersleri = getOgrenciDersleri(seciliOgrenci, ayarlar);
                        if (seciliOgrenci.dersler && seciliOgrenci.dersler.length > 0) return seciliOgrenci.dersler.join(', ');
                        if (seciliOgrenci.sinavDersleri && seciliOgrenci.sinavDersleri.length > 0) return seciliOgrenci.sinavDersleri.join(', ');
                        if (seciliOgrenci.ders && seciliOgrenci.ders.length > 0) return seciliOgrenci.ders.join(', ');
                        if (ogrenciDersleri && ogrenciDersleri.length > 0) return ogrenciDersleri.join(', ');
                        return 'Ders bilgisi bulunmuyor';
                      })()}>
                        <Typography variant="body1" fontWeight="bold" noWrap>
                          {(() => {
                            const ogrenciDersleri = getOgrenciDersleri(seciliOgrenci, ayarlar);
                            let text = '';
                            if (seciliOgrenci.dersler && seciliOgrenci.dersler.length > 0) text = seciliOgrenci.dersler.join(', ');
                            else if (seciliOgrenci.sinavDersleri && seciliOgrenci.sinavDersleri.length > 0) text = seciliOgrenci.sinavDersleri.join(', ');
                            else if (seciliOgrenci.ders && seciliOgrenci.ders.length > 0) text = seciliOgrenci.ders.join(', ');
                            else if (ogrenciDersleri && ogrenciDersleri.length > 0) text = ogrenciDersleri.join(', ');
                            else text = 'Ders bilgisi yok';
                            return text;
                          })()}
                        </Typography>
                      </Tooltip>
                    </Box>
                  </Box>
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

          <DialogActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
            {seciliOgrenci && !readOnly ? (
              <Button
                onClick={handleRemoveStudentClick}
                color="error"
                variant="outlined"
                startIcon={<DeleteIcon />}
                size="small"
              >
                Listeden Çıkar
              </Button>
            ) : <Box />}
            <Button onClick={handleModalKapat} color="primary" variant="contained">
              Kapat
            </Button>
          </DialogActions>
        </Dialog>

        {/* Onay Diyaloğu */}
        <Dialog
          open={confirmationOpen}
          onClose={handleCancelRemove}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
            <WarningIcon />
            <Typography variant="h6">Emin misiniz?</Typography>
          </DialogTitle>
          <DialogContent>
            <Typography>
              <strong>{seciliOgrenci?.ad} {seciliOgrenci?.soyad}</strong> isimli öğrenciyi bu salondan çıkarmak istediğinize emin misiniz?
              <br /><br />
              Bu işlem öğrenciyi "Yerleşmeyen Öğrenciler" listesine geri gönderecektir.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancelRemove} color="inherit">
              İptal
            </Button>
            <Button onClick={handleConfirmRemove} color="error" variant="contained" autoFocus>
              Çıkar
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

        {/* Yerleşmeyen Öğrenci Seçici Modal */}
        <YerlesmeyenOgrenciSeciciDialog
          open={unplacedModalOpen}
          onClose={handleUnplacedModalClose}
          unplacedStudents={unplacedStudents}
          onSelect={handleUnplacedStudentSelect}
          masaNo={seciliMasa?.masaNumarasi || (seciliMasa && calculateDeskNumberForMasa(seciliMasa))}
        />
      </Paper>
    </Box >

  );
});

SalonPlani.displayName = 'SalonPlani';

export default SalonPlani;


