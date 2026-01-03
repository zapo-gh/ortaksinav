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
import { useNotifications } from './NotificationSystem';
import { useExam } from '../context/ExamContext';
// Basit, sürükle-bıraksız salon kartı bileşeni
const SalonItem = ({ form, index, onFormChange, onFormDelete, onFormCopy, yerlesimPlaniVarMi, topluSilmeModu, seciliSalonlar, onSalonSecimi }) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        maxWidth: '100%',
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

        {/* Drag Handle - artık sadece görsel ikon */}
        <Grid item xs={1}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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

const SalonFormu = memo(({ salonlar = [], onSalonlarDegistir, yerlestirmeSonucu = null, readOnly: readOnlyProp = false }) => {
  // Notification sistemi
  const { showSuccess, showError, showWarning } = useNotifications();
  const { isWriteAllowed } = useExam();
  const readOnly = readOnlyProp || (process.env.NODE_ENV === 'test' ? false : !isWriteAllowed);
  const showReadOnlyMessage = React.useCallback(() => {
    showWarning('Bu işlemi gerçekleştirmek için yönetici olarak giriş yapmanız gerekir.');
  }, [showWarning]);

  // Basit state yönetimi - sadece salonlar listesi
  const [aktifSalonFormlari, setAktifSalonFormlari] = useState([]);
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

  // Ref to track if we're making an internal update (to prevent useEffect loop)
  const isInternalUpdateRef = React.useRef(false);

  // Salonlar prop'u değiştiğinde form verilerini güncelle
  React.useEffect(() => {
    // Skip if this update came from our own handleAnindaKaydet
    if (isInternalUpdateRef.current) {
      console.log('⏭️ SalonFormu: İç güncelleme tespit edildi, useEffect atlanıyor');
      isInternalUpdateRef.current = false;
      return;
    }

    console.log('🔄 SalonFormu: salonlar prop değişti:', {
      salonlarLength: salonlar.length,
      aktifFormlarLength: aktifSalonFormlari.length
    });

    // Eğer salonlar boşsa ve aktif formlar da boşsa, hiçbir şey yapma
    if (salonlar.length === 0 && aktifSalonFormlari.length === 0) {
      return;
    }

    // Eğer salonlar boşsa ama aktif formlar doluysa, kullanıcı silme yapmış demektir
    if (salonlar.length === 0 && aktifSalonFormlari.length > 0) {
      setAktifSalonFormlari([]);
      return;
    }

    // Prop'tan gelen salonları normalize et
    const normalizedPropSalonlar = salonlar.map(salon => ({
      id: salon.id,
      salonAdi: salon.salonAdi || salon.ad || '',
      siraTipi: salon.siraTipi,
      grupSayisi: salon.grupSayisi,
      gruplar: (salon.gruplar || []).map((grup, idx) => ({
        ...grup,
        id: idx + 1
      })),
      aktif: salon.aktif
    }));

    // Mevcut aktif formları normalize et
    const normalizedAktifFormlar = aktifSalonFormlari.map(form => ({
      id: form.id,
      salonAdi: form.salonAdi,
      siraTipi: form.siraTipi,
      grupSayisi: form.grupSayisi,
      gruplar: form.gruplar,
      aktif: form.aktif
    }));

    // Değişiklik olup olmadığını kontrol et (deep comparison)
    const hasChanges = JSON.stringify(normalizedPropSalonlar) !== JSON.stringify(normalizedAktifFormlar);

    if (hasChanges) {
      console.log('✅ SalonFormu: Değişiklik tespit edildi, form verileri güncelleniyor');
      setAktifSalonFormlari(normalizedPropSalonlar);
    }
  }, [salonlar, aktifSalonFormlari]);


  // Yeni salon formu ekleme
  const handleSalonFormEkle = () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showWarning('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    // Eğer boş salon formu varsa yeni ekleme
    const bosFormVar = aktifSalonFormlari.some(form => !form.salonAdi.trim());
    if (bosFormVar) {
      showWarning('⚠️ Lütfen önce mevcut salonun adını girin!');
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
    // Global state'e de ekle (boş adla geçici olarak eklenir, kullanıcı düzenler)
    try {
      const kapasite = yeniForm.gruplar.reduce((t, g) => t + (g.siraSayisi * (yeniForm.siraTipi === 'tekli' ? 1 : 2)), 0);
      const yeniSalon = {
        id: yeniForm.id,
        salonAdi: yeniForm.salonAdi,
        siraTipi: yeniForm.siraTipi,
        grupSayisi: yeniForm.grupSayisi,
        gruplar: yeniForm.gruplar,
        kapasite,
        aktif: true,
        ad: yeniForm.salonAdi,
        satir: Math.ceil(Math.sqrt(kapasite)),
        sutun: Math.ceil(kapasite / Math.ceil(Math.sqrt(kapasite)))
      };
      if (onSalonlarDegistir) {
        onSalonlarDegistir([...(salonlar || []), yeniSalon]);
      }
    } catch (e) { console.debug('Salon ekleme persist hatası:', e); }
  };

  // Salon formu silme - onay dialogu aç
  const handleSalonFormSil = (formId) => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showWarning('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon silinemez. Önce mevcut planı temizleyin.');
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
      showWarning('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon kopyalanamaz. Önce mevcut planı temizleyin.');
      return;
    }

    const kopyalanacakForm = aktifSalonFormlari.find(form => form.id === formId);
    if (!kopyalanacakForm) {
      showError('❌ Kopyalanacak salon bulunamadı!');
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
        id: index + 1, // Basit grup numarası: 1, 2, 3...
        siraSayisi: grup.siraSayisi
      })) || [],
      aktif: true
    };

    setAktifSalonFormlari(prev => [...prev, kopyaForm]);
    // Global state'e de ekle (hemen persist)
    try {
      const kapasite = kopyaForm.gruplar.reduce((t, g) => t + (g.siraSayisi * (kopyaForm.siraTipi === 'tekli' ? 1 : 2)), 0);
      const yeniSalon = {
        id: kopyaForm.id,
        salonAdi: kopyaForm.salonAdi,
        siraTipi: kopyaForm.siraTipi,
        grupSayisi: kopyaForm.grupSayisi,
        gruplar: kopyaForm.gruplar,
        kapasite,
        aktif: true,
        ad: kopyaForm.salonAdi,
        satir: Math.ceil(Math.sqrt(kapasite)),
        sutun: Math.ceil(kapasite / Math.ceil(Math.sqrt(kapasite)))
      };
      if (onSalonlarDegistir) {
        onSalonlarDegistir([...(salonlar || []), yeniSalon]);
      }
    } catch (e) { console.debug('Salon kopyalama persist hatası:', e); }
    showSuccess(`✅ "${kopyalanacakForm.salonAdi}" salonu kopyalandı!`);
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

  // Toplu silme fonksiyonları
  const handleTopluSilmeModuToggle = () => {
    setTopluSilmeModu(!topluSilmeModu);
    setSeciliSalonlar([]);
  };

  const handleTumunuSec = () => {
    const tumSalonIdleri = aktifSalonFormlari.map(salon => salon.id);
    setSeciliSalonlar(tumSalonIdleri);
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
      showWarning('Lütfen silinecek salonları seçin!');
      return;
    }

    setTopluSilmeDialogAcik(true);
  };

  const handleTopluSilmeTamamla = () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showWarning('Mevcut bir yerleştirme planı bulunduğu için salon silinemez. Önce mevcut planı temizleyin.');
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
    const silinenSayi = seciliSalonlar.length;
    setSeciliSalonlar([]);
    setTopluSilmeModu(false);
    setTopluSilmeDialogAcik(false);

    showSuccess(`${silinenSayi} salon başarıyla silindi!`);
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

      // Kapasite hesapla
      const kapasite = guncelForm.gruplar?.reduce((toplam, grup) => {
        return toplam + (grup.siraSayisi * (guncelForm.siraTipi === 'tekli' ? 1 : 2));
      }, 0) || 0;

      // Güncel salon objesini oluştur
      const guncelSalon = {
        id: guncelForm.id,
        salonAdi: guncelForm.salonAdi,
        siraTipi: guncelForm.siraTipi,
        grupSayisi: guncelForm.grupSayisi,
        gruplar: guncelForm.gruplar,
        kapasite: kapasite,
        aktif: guncelForm.aktif,
        ad: guncelForm.salonAdi,
        satir: Math.ceil(Math.sqrt(kapasite)),
        sutun: Math.ceil(kapasite / Math.ceil(Math.sqrt(kapasite)))
      };

      // Salonlar prop'undan yeni liste oluştur (source of truth)
      const yeniSalonlar = salonlar.map(salon => {
        if (salon.id === formId) {
          return guncelSalon;
        }
        return salon;
      });

      console.log('💾 Aktif durum kaydediliyor:', {
        salonId: guncelSalon.id,
        salonAdi: guncelSalon.salonAdi,
        aktif: guncelSalon.aktif
      });

      // Set flag to prevent useEffect from overwriting this change
      isInternalUpdateRef.current = true;

      // ExamContext'e kaydet
      if (onSalonlarDegistir) {
        onSalonlarDegistir(yeniSalonlar);
      }
      return;
    }

    // Diğer değişiklikler için anında kaydetmeyi devre dışı bırak
    console.log('⏳ Anında kaydetme geçici olarak devre dışı bırakıldı');
    return;

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
      showWarning('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon yapısı değiştirilemez. Önce mevcut planı temizleyin.');
      return;
    }

    // ÖZEL DURUM: Aktif durumu değişikliği için senkron güncelleme
    if (field === 'aktif') {
      console.log('🔄 Aktif durumu değişiyor:', { formId, value });

      // Local state'i güncelle
      setAktifSalonFormlari(prev => prev.map(form => {
        if (form.id === formId) {
          return { ...form, aktif: value };
        }
        return form;
      }));

      // Parent state'i de hemen güncelle (salonlar prop'undan)
      const guncelSalonlar = salonlar.map(salon => {
        if (salon.id === formId) {
          // Kapasite hesapla
          const form = aktifSalonFormlari.find(f => f.id === formId);
          const kapasite = form?.gruplar?.reduce((toplam, grup) => {
            return toplam + (grup.siraSayisi * (form.siraTipi === 'tekli' ? 1 : 2));
          }, 0) || salon.kapasite || 0;

          return {
            ...salon,
            aktif: value,
            kapasite: kapasite
          };
        }
        return salon;
      });

      console.log('💾 Aktif durum kaydediliyor (senkron):', {
        formId,
        aktif: value,
        guncelSalonlarLength: guncelSalonlar.length
      });

      // Set flag to prevent useEffect loop
      isInternalUpdateRef.current = true;

      // Parent'ı güncelle
      if (onSalonlarDegistir) {
        onSalonlarDegistir(guncelSalonlar);
      }

      return; // Erken çık, handleAnindaKaydet'i çağırma
    }

    // DİĞER ALANLAR için normal akış
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

        // Anında kaydet (aktif hariç diğer alanlar için)
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
      showWarning('⚠️ Mevcut bir yerleştirme planı bulunduğu için salon yapısı değiştirilemez. Önce mevcut planı temizleyin.');
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

  // readOnly görünümü: hook'lar tanımlandıktan sonra koşullu render
  if (readOnly) {
    return (
      <Card sx={{ maxWidth: 1200, mx: 'auto', mt: 2 }}>
        <CardContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Salon listesi görüntüleme modunda. Düzenleme yapabilmek için yönetici olarak giriş yapın.
          </Alert>
          {Array.isArray(salonlar) && salonlar.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {salonlar.map((salon) => (
                <Paper key={salon.id || salon.salonId} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                    <Chip label={salon.salonAdi || 'İsimsiz Salon'} color="primary" variant="outlined" />
                    <Typography variant="body2" color="text.secondary">
                      Kapasite: {salon.kapasite ?? '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sıra Tipi: {salon.siraTipi || '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Grup Sayısı: {salon.grupSayisi ?? '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Aktif: {salon.aktif === false ? 'Hayır' : 'Evet'}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Henüz salon eklenmemiş
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ maxWidth: 1200, mx: 'auto', mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <MeetingRoomIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="h2" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
              Sınav Salonları Yönetimi
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


          {/* Salon Ekleme ve Toplu Silme Butonları */}
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              size="small"
              onClick={handleSalonFormEkle}
              disabled={yerlesimPlaniVarMi() || readOnly}
            >
              Yeni Salon Ekle
            </Button>

            {aktifSalonFormlari.length > 0 && (
              <>
                <Button
                  variant={topluSilmeModu ? "contained" : "outlined"}
                  color={topluSilmeModu ? "error" : "primary"}
                  startIcon={<DeleteIcon />}
                  size="small"
                  onClick={handleTopluSilmeModuToggle}
                  disabled={yerlesimPlaniVarMi() || readOnly}
                >
                  {topluSilmeModu ? 'İptal' : 'Toplu Sil'}
                </Button>

                {topluSilmeModu && (
                  <>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={handleTumunuSec}
                      disabled={seciliSalonlar.length === aktifSalonFormlari.length}
                      sx={{
                        minWidth: 'auto',
                        px: 2
                      }}
                    >
                      Tümünü Seç
                    </Button>

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
                  </>
                )}
              </>
            )}
          </Box>

          {/* Boş durum metni - yazılabilir modda, salonlar listesi boşken */}
          {Array.isArray(salonlar) && salonlar.length === 0 && aktifSalonFormlari.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Henüz salon eklenmemiş
            </Typography>
          )}

          {/* Salon Formları */}
          {aktifSalonFormlari?.map((form, index) => (
            <SalonItem
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

        </CardContent>
      </Card>


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