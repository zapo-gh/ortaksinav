import React, { useState, memo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
  AlertTitle,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as ContentCopyIcon,
  MeetingRoom as MeetingRoomIcon,
  Person as PersonIcon,
  Chair as ChairIcon,
  DragIndicator as DragIndicatorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Item Component
const SortableSalonItem = ({ form, index, onFormChange, onFormDelete, onFormCopy, yerlesimPlaniVarMi, topluSilmeModu, seciliSalonlar, onSalonSecimi }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: form.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Paper 
      ref={setNodeRef}
      style={style}
      elevation={isDragging ? 8 : 2} 
      sx={{ 
        p: 3, 
        mb: 3, 
        maxWidth: '100%',
        transform: isDragging ? 'rotate(2deg)' : 'none',
        transition: 'all 0.2s ease'
      }}
    >
      <Grid container spacing={2} alignItems="center">
        {/* Toplu Silme Checkbox */}
        {topluSilmeModu && (
          <Grid item xs={1}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input
                type="checkbox"
                checked={seciliSalonlar.includes(form.id)}
                onChange={(e) => onSalonSecimi(form.id, e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
            </Box>
          </Grid>
        )}
        
        {/* Drag Handle */}
        <Grid item xs={1}>
          <Box 
            {...attributes}
            {...listeners}
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: topluSilmeModu ? 'default' : 'grab',
              '&:active': { cursor: topluSilmeModu ? 'default' : 'grabbing' },
              opacity: topluSilmeModu ? 0.5 : 1
            }}
          >
            <DragIndicatorIcon color="action" />
          </Box>
        </Grid>
        
        {/* Salon Adı */}
        <Grid item xs={12} sm={3} md={2}>
          <TextField
            label="Salon Adı"
            value={form.salonAdi}
            onChange={(e) => onFormChange(form.id, 'salonAdi', e.target.value)}
            required
            variant="outlined"
            placeholder="Örn: 9/A"
            size="small"
            sx={{ width: '120px' }}
            disabled={yerlesimPlaniVarMi && yerlesimPlaniVarMi()}
          />
        </Grid>

        {/* Sıra Tipi */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Sıra Tipi</InputLabel>
            <Select
              value={form.siraTipi}
              onChange={(e) => onFormChange(form.id, 'siraTipi', e.target.value)}
              label="Sıra Tipi"
              disabled={yerlesimPlaniVarMi && yerlesimPlaniVarMi()}
            >
              <MenuItem value="tekli">Tekli Sıra</MenuItem>
              <MenuItem value="ikili">İkili Sıra</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Aktif Durumu */}
        <Grid item xs={12} sm={6} md={2}>
          <FormControlLabel
            control={
              <Switch
                checked={form.aktif}
                onChange={(e) => onFormChange(form.id, 'aktif', e.target.checked)}
                color="primary"
              />
            }
            label="Aktif"
          />
        </Grid>

        {/* Grup Sayısı */}
        <Grid item xs={6} sm={4} md={2}>
          <TextField
            fullWidth
            label="Grup Sayısı"
            type="number"
            value={form.grupSayisi}
            onChange={(e) => onFormChange(form.id, 'grupSayisi', parseInt(e.target.value) || 1)}
            required
            variant="outlined"
            inputProps={{ min: 1, max: 10 }}
            size="small"
            disabled={yerlesimPlaniVarMi && yerlesimPlaniVarMi()}
          />
        </Grid>

        {/* Grup Detayları */}
        {form.gruplar?.map((grup) => (
          <Grid key={grup.id} item xs={2} sm={1.5} md={1}>
            <TextField
              fullWidth
              label={`G${grup.id}`}
              type="number"
              value={grup.siraSayisi}
              onChange={(e) => onFormChange(form.id, 'grupSiraSayisi', { grupId: grup.id, siraSayisi: e.target.value })}
              variant="outlined"
              inputProps={{ min: 1, max: 50 }}
              size="small"
              disabled={yerlesimPlaniVarMi && yerlesimPlaniVarMi()}
            />
          </Grid>
        ))}

        {/* Kapasite */}
        <Grid item xs={6} sm={3} md={2}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '40px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              backgroundColor: '#fafafa',
              padding: '0px 2px 0 2px'
            }}
          >
            <ChairIcon variant="outlined" sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {form.gruplar?.reduce((toplam, grup) => {
                return toplam + (grup.siraSayisi * (form.siraTipi === 'tekli' ? 1 : 2));
              }, 0) || 0}
            </Typography>
          </Box>
        </Grid>

        {/* Kopyala ve Sil Butonları */}
        <Grid item xs={12} sm={6} md={2}>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
            <IconButton
              color="primary"
              onClick={() => onFormCopy(form.id)}
              size="small"
              disabled={yerlesimPlaniVarMi && yerlesimPlaniVarMi()}
              sx={{ 
                '&:hover': { 
                  backgroundColor: 'primary.light',
                  color: 'white'
                }
              }}
              title="Salonu Kopyala"
            >
              <ContentCopyIcon />
            </IconButton>
            <IconButton
              color="error"
              onClick={() => onFormDelete(form.id)}
              size="small"
              disabled={yerlesimPlaniVarMi && yerlesimPlaniVarMi()}
              sx={{ 
                '&:hover': { 
                  backgroundColor: 'error.light',
                  color: 'white'
                }
              }}
              title="Salonu Sil"
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

const SalonFormu = memo(({ salonlar = [], onSalonlarDegistir, yerlestirmeSonucu = null }) => {
  // Basit state yönetimi - sadece salonlar listesi
  const [aktifSalonFormlari, setAktifSalonFormlari] = useState([]);
  const [uyariAcik, setUyariAcik] = useState(false);
  const [uyariMesaji, setUyariMesaji] = useState('');
  const [basarili, setBasarili] = useState(null);
  const [onayDialogAcik, setOnayDialogAcik] = useState(false);
  const [silinecekSalonId, setSilinecekSalonId] = useState(null);
  const [silinecekSalonAdi, setSilinecekSalonAdi] = useState('');
  
  // Toplu silme için state'ler
  const [topluSilmeModu, setTopluSilmeModu] = useState(false);
  const [seciliSalonlar, setSeciliSalonlar] = useState([]);
  const [topluSilmeDialogAcik, setTopluSilmeDialogAcik] = useState(false);

  // Yerleştirme planı kontrolü
  const yerlesimPlaniVarMi = () => {
    return yerlestirmeSonucu && (
      (yerlestirmeSonucu.salonlar && yerlestirmeSonucu.salonlar.length > 0) ||
      (yerlestirmeSonucu.tumSalonlar && yerlestirmeSonucu.tumSalonlar.length > 0) ||
      (yerlestirmeSonucu.salon && yerlestirmeSonucu.salon.ogrenciler && yerlestirmeSonucu.salon.ogrenciler.length > 0)
    );
  };

  // Salonlar prop'u değiştiğinde form verilerini güncelle - SADECE İLK YÜKLEMEDE
  React.useEffect(() => {
    console.log('🔄 SalonFormu: salonlar prop değişti:', {
      salonlarLength: salonlar.length,
      aktifFormlarLength: aktifSalonFormlari.length
    });
    
    // SADECE İLK YÜKLEMEDE veya salonlar boşsa güncelle
    if (salonlar.length > 0 && aktifSalonFormlari.length === 0) {
      const yeniFormlar = salonlar.map(salon => ({
        id: salon.id,
        salonAdi: salon.salonAdi,
        siraTipi: salon.siraTipi,
        grupSayisi: salon.grupSayisi,
        gruplar: salon.gruplar || [],
        aktif: salon.aktif
      }));
      
      console.log('✅ SalonFormu: Form verileri güncellendi:', yeniFormlar.length, 'salon');
      setAktifSalonFormlari(yeniFormlar);
    }
  }, [salonlar]);

  const uyariGoster = (mesaj) => {
    setUyariMesaji(mesaj);
    setUyariAcik(true);
  };

  const uyariKapat = () => {
    setUyariAcik(false);
  };

  const basariliMesajGoster = (mesaj) => {
    setBasarili(mesaj);
    // 4 saniye sonra otomatik kapat
    setTimeout(() => {
      setBasarili(null);
    }, 4000);
  };

  // Yeni salon formu ekleme
  const handleSalonFormEkle = () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      uyariGoster('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    // Eğer boş salon formu varsa yeni ekleme
    const bosFormVar = aktifSalonFormlari.some(form => !form.salonAdi.trim());
    if (bosFormVar) {
      basariliMesajGoster('⚠️ Lütfen önce mevcut salonun adını girin!');
      return;
    }

    // Daha stabil ID oluştur - mevcut salonların maksimum ID'sini al ve 1 ekle
    const mevcutSalonlar = salonlar || [];
    const aktifFormlar = aktifSalonFormlari || [];
    const tumSalonlar = [...mevcutSalonlar, ...aktifFormlar];
    
    let yeniId = 1;
    if (tumSalonlar.length > 0) {
      const mevcutIdler = tumSalonlar.map(s => {
        const id = parseInt(s.id);
        return isNaN(id) ? 0 : id;
      });
      yeniId = Math.max(...mevcutIdler) + 1;
    }
    
    const yeniForm = {
      id: yeniId,
      salonAdi: '',
      siraTipi: 'tekli',
      grupSayisi: 1,
      gruplar: [{ id: 1, siraSayisi: 1 }],
      aktif: true
    };
    setAktifSalonFormlari(prev => [...prev, yeniForm]);
  };

  // Salon formu silme - onay dialogu aç
  const handleSalonFormSil = (formId) => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      uyariGoster('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon silinemez. Önce mevcut planı temizleyin.');
      return;
    }

    const silinecekSalon = aktifSalonFormlari.find(form => form.id === formId);
    const salonAdi = silinecekSalon ? silinecekSalon.salonAdi : 'Bu salon';
    
    setSilinecekSalonId(formId);
    setSilinecekSalonAdi(salonAdi);
    setOnayDialogAcik(true);
  };

  // Salon formu kopyalama
  const handleSalonFormKopyala = (formId) => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      uyariGoster('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon kopyalanamaz. Önce mevcut planı temizleyin.');
      return;
    }

    const kopyalanacakForm = aktifSalonFormlari.find(form => form.id === formId);
    if (!kopyalanacakForm) {
      uyariGoster('❌ Kopyalanacak salon bulunamadı!');
      return;
    }

    // Daha stabil ID oluştur - mevcut salonların maksimum ID'sini al ve 1 ekle
    const mevcutSalonlar = salonlar || [];
    const aktifFormlar = aktifSalonFormlari || [];
    const tumSalonlar = [...mevcutSalonlar, ...aktifFormlar];
    
    let yeniId = 1;
    if (tumSalonlar.length > 0) {
      const mevcutIdler = tumSalonlar.map(s => {
        const id = parseInt(s.id);
        return isNaN(id) ? 0 : id;
      });
      yeniId = Math.max(...mevcutIdler) + 1;
    }
    
    const kopyaForm = {
      id: yeniId, // Gerçekten benzersiz ID
      salonAdi: `${kopyalanacakForm.salonAdi} (Kopya)`,
      siraTipi: kopyalanacakForm.siraTipi,
      grupSayisi: kopyalanacakForm.grupSayisi,
      gruplar: kopyalanacakForm.gruplar?.map((grup, index) => ({
        id: `${yeniId}_grup_${index}`, // Stabil grup ID
        siraSayisi: grup.siraSayisi
      })) || [],
      aktif: true
    };

    setAktifSalonFormlari(prev => [...prev, kopyaForm]);
    basariliMesajGoster(`✅ "${kopyalanacakForm.salonAdi}" salonu kopyalandı!`);
  };

  // Onay dialogu - silme işlemini gerçekleştir
  const handleOnaySil = () => {
    if (silinecekSalonId) {
      // Aktif formlardan sil
      setAktifSalonFormlari(prev => prev.filter(form => form.id !== silinecekSalonId));
      
      // Global state'den de sil (eğer salon kaydedilmişse)
      if (salonlar && salonlar.length > 0) {
        const guncelSalonlar = salonlar.filter(s => s.id !== silinecekSalonId);
        if (onSalonlarDegistir && typeof onSalonlarDegistir === 'function') {
          onSalonlarDegistir(guncelSalonlar);
        }
      }
    }
    
    // Dialog'u kapat
    setOnayDialogAcik(false);
    setSilinecekSalonId(null);
    setSilinecekSalonAdi('');
  };

  // Onay dialogu - iptal
  const handleOnayIptal = () => {
    setOnayDialogAcik(false);
    setSilinecekSalonId(null);
    setSilinecekSalonAdi('');
  };

  // Drag and Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag and Drop handler - salon sıralamasını değiştir
  const handleDragEnd = (event) => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      uyariGoster('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon sıralaması değiştirilemez. Önce mevcut planı temizleyin.');
      return;
    }

    const { active, over } = event;

    if (active.id !== over.id) {
      setAktifSalonFormlari((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Global state'i de güncelle
        if (onSalonlarDegistir && typeof onSalonlarDegistir === 'function') {
          onSalonlarDegistir(newItems);
        }
        
        return newItems;
      });
    }
  };

  // Toplu silme fonksiyonları
  const handleTopluSilmeModuToggle = () => {
    setTopluSilmeModu(!topluSilmeModu);
    setSeciliSalonlar([]);
  };

  const handleSalonSecimi = (salonId, secili) => {
    if (secili) {
      setSeciliSalonlar(prev => [...prev, salonId]);
    } else {
      setSeciliSalonlar(prev => prev.filter(id => id !== salonId));
    }
  };

  const handleTopluSilmeOnay = () => {
    if (seciliSalonlar.length === 0) {
      uyariGoster('Lütfen silinecek salonları seçin!');
      return;
    }

    setTopluSilmeDialogAcik(true);
  };

  const handleTopluSilmeTamamla = () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      uyariGoster('Mevcut bir yerleştirme planı bulunduğu için salon silinemez. Önce mevcut planı temizleyin.');
      setTopluSilmeDialogAcik(false);
      return;
    }

    // Seçili salonları sil
    const yeniSalonlar = aktifSalonFormlari.filter(salon => !seciliSalonlar.includes(salon.id));
    setAktifSalonFormlari(yeniSalonlar);
    
    // Global state'i güncelle
    if (onSalonlarDegistir && typeof onSalonlarDegistir === 'function') {
      onSalonlarDegistir(yeniSalonlar);
    }

    // State'leri temizle
    setSeciliSalonlar([]);
    setTopluSilmeModu(false);
    setTopluSilmeDialogAcik(false);
    
    setBasarili(`${seciliSalonlar.length} salon başarıyla silindi!`);
  };

  const handleTopluSilmeIptal = () => {
    setTopluSilmeDialogAcik(false);
    setSeciliSalonlar([]);
    setTopluSilmeModu(false);
  };

  // Anında kaydetme sistemi
  const handleAnindaKaydet = (formId, guncelForm) => {
    // Aktif durumu değişikliklerini hemen kaydet
    if (guncelForm.hasOwnProperty('aktif')) {
      console.log('🔄 Salon aktif durumu değişiyor:', guncelForm.salonAdi, guncelForm.aktif);
      
      // Tüm salonları güncelle
      const yeniSalonlar = aktifSalonFormlari.map(form => {
        if (form.id === formId) {
          return guncelForm;
        }
        return form;
      });
      
      // ExamContext'e kaydet
      if (onSalonlarDegistir) {
        onSalonlarDegistir(yeniSalonlar);
      }
      return;
    }
    
    // Diğer değişiklikler için anında kaydetmeyi devre dışı bırak
    console.log('⏳ Anında kaydetme geçici olarak devre dışı bırakıldı');
    
    // Kopyalama sırasında anında kaydetmeyi geciktir - SADECE (Kopya) ile bitenler için
    if (guncelForm.salonAdi && guncelForm.salonAdi.includes('(Kopya)') && guncelForm.salonAdi.endsWith('(Kopya)')) {
      console.log('⏳ Kopyalanan salon kaydetme geciktiriliyor...');
      return; // Kopyalanan salonları hemen kaydetme
    }
    
    // Eğer salon adı dolu ise anında kaydet
    if (guncelForm.salonAdi.trim()) {
      const kapasite = guncelForm.gruplar?.reduce((toplam, grup) => {
        return toplam + (grup.siraSayisi * (guncelForm.siraTipi === 'tekli' ? 1 : 2));
      }, 0) || 0;

      // Benzersiz ID kontrolü - eğer ID çakışıyorsa yeni ID oluştur
      let salonId = guncelForm.id;
      const mevcutSalonlar = salonlar || [];
      const aktifFormlar = aktifSalonFormlari || [];
      
      // Hem salonlar hem de aktif formlarda ID çakışması kontrolü
      if (mevcutSalonlar.some(s => s.id === salonId) || aktifFormlar.some(f => f.id === salonId && f.id !== formId)) {
        salonId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('⚠️ ID çakışması tespit edildi, yeni ID oluşturuluyor:', salonId);
        
        // Form ID'sini de güncelle
        setAktifSalonFormlari(prev => prev.map(form => 
          form.id === formId ? { ...form, id: salonId } : form
        ));
      }

      const salon = {
        id: salonId,
        salonAdi: guncelForm.salonAdi,
        siraTipi: guncelForm.siraTipi,
        grupSayisi: guncelForm.grupSayisi,
        gruplar: guncelForm.gruplar,
        kapasite: kapasite,
        aktif: guncelForm.aktif,
        // SalonFormu formatından gelen ek bilgiler
        ad: guncelForm.salonAdi, // Eski format uyumluluğu için
        satir: Math.ceil(Math.sqrt(kapasite)), // Fallback için
        sutun: Math.ceil(kapasite / Math.ceil(Math.sqrt(kapasite))) // Fallback için
      };

      console.log('💾 Salon kaydediliyor:', {
        salonId: salon.id,
        salonAdi: salon.salonAdi,
        kapasite: salon.kapasite,
        siraTipi: salon.siraTipi,
        gruplar: salon.gruplar
      });

      // Global salonlar listesine ekle veya güncelle - SIRALAMA KORUNARAK
      let guncelSalonlar;
      
      // Eğer salon mevcut ise, sıralamayı koruyarak güncelle
      const salonMevcut = salonlar.some(s => s.id === salon.id);
      if (salonMevcut) {
        guncelSalonlar = salonlar.map(s => {
          if (s.id === salon.id) {
            return salon; // Mevcut salonu güncelle
          }
          return s; // Diğer salonları olduğu gibi bırak
        });
      } else {
        // Yeni salon ise, sıralamayı koruyarak sona ekle
        guncelSalonlar = [...salonlar, salon];
      }

      if (onSalonlarDegistir && typeof onSalonlarDegistir === 'function') {
        console.log('🔄 Salon güncelleniyor (sıralama korunuyor):', {
          salonId: salon.id,
          salonAdi: salon.salonAdi,
          eskiSiralama: salonlar.map(s => ({ id: s.id, ad: s.salonAdi })),
          yeniSiralama: guncelSalonlar.map(s => ({ id: s.id, ad: s.salonAdi }))
        });
        
        onSalonlarDegistir(guncelSalonlar);
        console.log('✅ Salon global state\'e kaydedildi (sıralama korundu)');
      }
    }
  };

  // Salon form değişikliği
  const handleSalonFormChange = (formId, field, value) => {
    // Yerleştirme planı kontrolü - sadece kritik alanlar için
    const kritikAlanlar = ['grupSayisi', 'grupSiraSayisi', 'siraTipi'];
    if (kritikAlanlar.includes(field) && yerlesimPlaniVarMi()) {
      uyariGoster('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon yapısı değiştirilemez. Önce mevcut planı temizleyin.');
      return;
    }

    setAktifSalonFormlari(prev => prev.map(form => {
      if (form.id === formId) {
        let guncelForm;
        
        // Grup sıra sayısı değişikliği için özel işlem
        if (field === 'grupSiraSayisi') {
          const yeniGruplar = form.gruplar?.map(grup => 
            grup.id === value.grupId ? { ...grup, siraSayisi: parseInt(value.siraSayisi) || 1 } : grup
          ) || [];
          guncelForm = { ...form, gruplar: yeniGruplar };
        } 
        // Grup sayısı değişikliği için özel işlem
        else if (field === 'grupSayisi') {
          const yeniGruplar = [];
          for (let i = 1; i <= value; i++) {
            const mevcutGrup = form.gruplar.find(g => g.id === i);
            yeniGruplar.push({
              id: i,
              siraSayisi: mevcutGrup ? mevcutGrup.siraSayisi : 1
            });
          }
          guncelForm = { ...form, grupSayisi: value, gruplar: yeniGruplar };
        } 
        else {
          guncelForm = { ...form, [field]: value };
        }
        
        // Anında kaydet
        handleAnindaKaydet(formId, guncelForm);
        return guncelForm;
      }
      return form;
    }));
  };


  // Grup sıra sayısı değişikliği
  const handleGrupSiraSayisiChange = (formId, grupId, siraSayisi) => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      uyariGoster('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon yapısı değiştirilemez. Önce mevcut planı temizleyin.');
      return;
    }

    setAktifSalonFormlari(prev => prev.map(form => {
      if (form.id === formId) {
        const yeniGruplar = form.gruplar?.map(grup => 
          grup.id === grupId ? { ...grup, siraSayisi: parseInt(siraSayisi) || 1 } : grup
        ) || [];
        const guncelForm = { ...form, gruplar: yeniGruplar };
        // Anında kaydet
        handleAnindaKaydet(formId, guncelForm);
        return guncelForm;
      }
      return form;
    }));
  };

  // Kapasite hesaplama
  const kapasiteHesapla = (siraTipi, gruplar) => {
    return gruplar?.reduce((toplam, grup) => {
      return toplam + (grup.siraSayisi * (siraTipi === 'tekli' ? 1 : 2));
    }, 0) || 0;
  };

  return (
    <>
      <Card sx={{ maxWidth: 1200, mx: 'auto', mt: 2 }}>
        <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <MeetingRoomIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h5" component="h2" gutterBottom>
            Sınav Salonları
          </Typography>
        </Box>

        {/* Yerleştirme Planı Uyarısı */}
        {yerlesimPlaniVarMi() && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            icon={<WarningIcon />}
          >
            <AlertTitle>Yerleştirme Planı Mevcut</AlertTitle>
            <Typography variant="body2">
              Mevcut bir yerleştirme planı bulunduğu için salon yapısında değişiklik yapılamaz. 
              Salon ekleme, silme, grup sayısı değiştirme ve sıra sayısı değiştirme işlemleri kısıtlanmıştır.
              <br />
              <strong>Önce mevcut planı temizleyin, sonra salon yapısını değiştirin.</strong>
            </Typography>
          </Alert>
        )}

        {/* Başarı Mesajı */}
        {basarili && (
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 3, 
              borderRadius: '8px'
            }} 
            onClose={() => setBasarili(null)}
          >
            {basarili}
          </Alert>
        )}

          {/* Salon Ekleme ve Toplu Silme Butonları */}
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              size="small"
              onClick={handleSalonFormEkle}
              disabled={yerlesimPlaniVarMi()}
            >
              Salon Ekle
            </Button>
            
            {aktifSalonFormlari.length > 0 && (
              <>
                <Button
                  variant={topluSilmeModu ? "contained" : "outlined"}
                  color={topluSilmeModu ? "error" : "primary"}
                  startIcon={<DeleteIcon />}
                  size="small"
                  onClick={handleTopluSilmeModuToggle}
                  disabled={yerlesimPlaniVarMi()}
                >
                  {topluSilmeModu ? 'İptal' : 'Toplu Sil'}
                </Button>
                
                {topluSilmeModu && (
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DeleteIcon />}
                    size="small"
                    onClick={handleTopluSilmeOnay}
                    disabled={seciliSalonlar.length === 0}
                  >
                    Seçili Salonları Sil ({seciliSalonlar.length})
                  </Button>
                )}
              </>
            )}
          </Box>

          {/* Salon Formları */}
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={aktifSalonFormlari?.map(form => form.id) || []}
              strategy={verticalListSortingStrategy}
            >
              {aktifSalonFormlari?.map((form, index) => (
                <SortableSalonItem
                  key={form.id}
                  form={form}
                  index={index}
                  onFormChange={handleSalonFormChange}
                  onFormDelete={handleSalonFormSil}
                  onFormCopy={handleSalonFormKopyala}
                  yerlesimPlaniVarMi={yerlesimPlaniVarMi}
                  topluSilmeModu={topluSilmeModu}
                  seciliSalonlar={seciliSalonlar}
                  onSalonSecimi={handleSalonSecimi}
                />
              ))}
            </SortableContext>
          </DndContext>

        </CardContent>
      </Card>

      {/* Modern Uyarı Sistemi */}
      <Snackbar
        open={uyariAcik}
        autoHideDuration={4000}
        onClose={uyariKapat}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={uyariKapat} 
          severity="warning" 
          variant="filled"
          sx={{ 
            width: '100%',
            '& .MuiAlert-message': {
              fontSize: '0.95rem',
              fontWeight: 500
            }
          }}
        >
          {uyariMesaji}
        </Alert>
      </Snackbar>

      {/* Modern Onay Dialogu */}
      <Dialog
        open={onayDialogAcik}
        onClose={handleOnayIptal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ 
          textAlign: 'center', 
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'error.main',
          pb: 1
        }}>
          Salon Silme Onayı
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>"{silinecekSalonAdi}"</strong> salonunu silmek istediğinizden emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bu işlem geri alınamaz ve salon tüm verileriyle birlikte kalıcı olarak silinecektir.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ 
          justifyContent: 'center', 
          gap: 2, 
          pb: 3,
          px: 3
        }}>
          <Button
            onClick={handleOnayIptal}
            variant="outlined"
            sx={{
              borderRadius: '8px',
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            İptal
          </Button>
          <Button
            onClick={handleOnaySil}
            variant="contained"
            color="error"
            sx={{
              borderRadius: '8px',
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(211, 47, 47, 0.3)'
            }}
          >
            Evet, Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toplu Silme Onay Dialogu */}
      <Dialog
        open={topluSilmeDialogAcik}
        onClose={handleTopluSilmeIptal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ 
          textAlign: 'center', 
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'error.main',
          pb: 1
        }}>
          🗑️ Toplu Salon Silme
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>{seciliSalonlar.length} salon</strong> silmek istediğinizden emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bu işlem geri alınamaz ve seçili salonlar tüm verileriyle birlikte kalıcı olarak silinecektir.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ 
          justifyContent: 'center', 
          gap: 2, 
          pb: 3,
          px: 3
        }}>
          <Button
            variant="outlined"
            onClick={handleTopluSilmeIptal}
            sx={{ 
              minWidth: 100,
              borderRadius: 2
            }}
          >
            İptal
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleTopluSilmeTamamla}
            sx={{ 
              minWidth: 100,
              borderRadius: 2
            }}
          >
            Evet, Sil
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});

SalonFormu.displayName = 'SalonFormu';

export default SalonFormu;