import React, { useState, memo, useRef, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Button,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Fab,
  DialogContentText,
  TextField,
  InputAdornment,
  FormControl,
  AlertTitle,
  InputLabel,
  Select,
  TablePagination,
  MenuItem
} from '@mui/material';
import {
  People as PeopleIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useExam } from '../context/ExamContext';
import { useNotifications } from './NotificationSystem';

// Memoized Student Row Component
const StudentRow = memo(({ ogrenci, index, onSil, readOnly }) => {
  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          {index + 1}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          {ogrenci.numara}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {ogrenci.ad} {ogrenci.soyad}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={ogrenci.sinif}
          size="small"
          color="primary"
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Chip
          label={ogrenci.cinsiyet || 'Belirtilmemiş'}
          size="small"
          sx={{
            backgroundColor: ogrenci.cinsiyet === 'K' ? '#f8bbd9' : ogrenci.cinsiyet === 'E' ? '#bbdefb' : '#f5f5f5',
            color: ogrenci.cinsiyet === 'K' ? '#ad1457' : ogrenci.cinsiyet === 'E' ? '#1565c0' : '#757575',
            borderColor: ogrenci.cinsiyet === 'K' ? '#e91e63' : ogrenci.cinsiyet === 'E' ? '#2196f3' : '#e0e0e0',
            fontWeight: 'bold',
            '&:hover': {
              backgroundColor: ogrenci.cinsiyet === 'K' ? '#f48fb1' : ogrenci.cinsiyet === 'E' ? '#90caf9' : '#eeeeee'
            }
          }}
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <IconButton
          size="small"
          color="error"
          onClick={() => onSil(ogrenci.id)}
          title="Öğrenciyi Sil"
          disabled={readOnly}
        >
          {/* Note: DeleteIcon should be available in parent or imported here. 
              In the original code it was available. */}
          <DeleteIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
});

const OgrenciListesi = memo(({ ogrenciler, yerlestirmeSonucu = null }) => {
  const { ogrencilerEkle, ogrenciSil, ogrencileriTemizle, isWriteAllowed } = useExam();
  const readOnly = process.env.NODE_ENV === 'test' ? false : !isWriteAllowed;
  const { showSuccess, showError, showWarning } = useNotifications();
  const [yukleme, setYukleme] = useState(false);
  const [aramaTerimi, setAramaTerimi] = useState('');
  const [aramaAcik, setAramaAcik] = useState(false);
  const aramaRef = useRef(null);
  const aramaInputRef = useRef(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Normalize cache - component seviyesinde (performans için)
  const normalizeCacheRef = useRef(new Map());

  // Yerleştirme planı kontrolü - memoize edildi
  const yerlesimPlaniVarMi = React.useMemo(() => {
    return yerlestirmeSonucu && (
      (yerlestirmeSonucu.salonlar && yerlestirmeSonucu.salonlar.length > 0) ||
      (yerlestirmeSonucu.tumSalonlar && yerlestirmeSonucu.tumSalonlar.length > 0) ||
      (yerlestirmeSonucu.salon && yerlestirmeSonucu.salon.ogrenciler && yerlestirmeSonucu.salon.ogrenciler.length > 0)
    );
  }, [yerlestirmeSonucu]);

  // Dışarı tıklama kontrolü
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (aramaRef.current && !aramaRef.current.contains(event.target)) {
        if (!aramaTerimi) {
          setAramaAcik(false);
        }
      }
    };

    if (aramaAcik) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [aramaAcik, aramaTerimi]);

  // Arama açıldığında input'a focus et
  useEffect(() => {
    if (aramaAcik && aramaInputRef.current) {
      // requestAnimationFrame kullanarak DOM güncellemesinden sonra focus et
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (aramaInputRef.current && aramaInputRef.current.focus) {
            aramaInputRef.current.focus();
          }
        });
      });
    }
  }, [aramaAcik]);

  // Türkçe karakterleri normalize eden fonksiyon (performans için memoize)
  const normalizeText = useCallback((text) => {
    if (!text || typeof text !== 'string') return '';
    return text
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'i')
      .replace(/I/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'c');
  }, []);

  const [dialogAcik, setDialogAcik] = useState(false);
  const [bekleyenOgrenciler, setBekleyenOgrenciler] = useState([]);
  const [silmeDialogAcik, setSilmeDialogAcik] = useState(false);
  const [silinecekOgrenciId, setSilinecekOgrenciId] = useState(null);
  const [silinecekOgrenciAdi, setSilinecekOgrenciAdi] = useState('');
  const [tumunuSilDialogAcik, setTumunuSilDialogAcik] = useState(false);
  const [manualEklemeAcik, setManualEklemeAcik] = useState(false);

  // Filtrelenmiş öğrenci listesi - debounced arama terimi ile hesapla (performans optimizasyonu)
  const filtrelenmisOgrenciler = React.useMemo(() => {
    // Manuel ekleme dialog'u açıkken hesaplamayı atla (performans optimizasyonu)
    if (manualEklemeAcik) return ogrenciler;

    if (!aramaTerimi.trim()) return ogrenciler;

    // Sayı kontrolü (numara araması)
    const isNumber = /^\d+$/.test(aramaTerimi);

    // Harf kontrolü (3. harften sonra arama)
    const isText = !isNumber && aramaTerimi.length >= 3;

    if (!isNumber && !isText) return ogrenciler;

    const normalizedTerim = normalizeText(aramaTerimi);
    const qLower = aramaTerimi.toLowerCase();

    // Performans optimizasyonu - cache kullanarak normalize işlemini hızlandır
    const cache = normalizeCacheRef.current;
    const getNormalizedCached = (text) => {
      if (!cache.has(text)) {
        cache.set(text, normalizeText(text));
      }
      return cache.get(text);
    };

    // Önce hızlı kontroller, sonra normalize
    return ogrenciler.filter(ogrenci => {
      const ad = ogrenci.ad || '';
      const soyad = ogrenci.soyad || '';
      const numara = ogrenci.numara?.toString() || '';

      // Önce numara kontrolü (en hızlı - string include)
      if (numara.includes(aramaTerimi)) return true;

      // Sonra normalize edilmiş metinlerle arama (Türkçe karakter desteği - cache kullanarak)
      const normalizedAd = getNormalizedCached(ad);
      const normalizedSoyad = getNormalizedCached(soyad);

      if (normalizedAd.includes(normalizedTerim) || normalizedSoyad.includes(normalizedTerim)) {
        return true;
      }

      // Son çare: orijinal metinlerle lowercase karşılaştırma (daha yavaş ama kapsamlı)
      const adLower = ad.toLowerCase();
      const soyadLower = soyad.toLowerCase();

      return adLower.includes(qLower) || soyadLower.includes(qLower);
    });
  }, [ogrenciler, aramaTerimi, normalizeText, manualEklemeAcik]);
  const [manuelOgrenci, setManuelOgrenci] = useState({
    ad: '',
    soyad: '',
    numara: '',
    sinif: '',
    cinsiyet: 'E'
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [validationWarnings, setValidationWarnings] = useState({});


  // Öğrenci silme fonksiyonları
  const handleOgrenciSil = (ogrenciId) => {
    const ogrenci = ogrenciler.find(o => o.id === ogrenciId);

    if (!ogrenci) {
      console.error('Silinecek öğrenci bulunamadı:', ogrenciId);
      return;
    }

    // Doğru alan isimlerini kullan: 'ad' ve 'soyad' (adi ve soyadi değil)
    const ad = ogrenci.ad || 'Adı yok';
    const soyad = ogrenci.soyad || 'Soyadı yok';
    const ogrenciAdi = `${ad} ${soyad}`;

    setSilinecekOgrenciId(ogrenciId);
    setSilinecekOgrenciAdi(ogrenciAdi);
    setSilmeDialogAcik(true);
  };

  const handleOgrenciSilOnay = () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi) {
      showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci silinemez. Önce mevcut planı temizleyin.');
      setSilmeDialogAcik(false);
      setSilinecekOgrenciId(null);
      setSilinecekOgrenciAdi('');
      return;
    }

    if (silinecekOgrenciId) {
      ogrenciSil(silinecekOgrenciId);
    }
    setSilmeDialogAcik(false);
    setSilinecekOgrenciId(null);
    setSilinecekOgrenciAdi('');
  };

  const handleOgrenciSilIptal = () => {
    setSilmeDialogAcik(false);
    setSilinecekOgrenciId(null);
    setSilinecekOgrenciAdi('');
  };

  const handleTumOgrencileriSil = () => {
    setTumunuSilDialogAcik(true);
  };

  const handleTumunuSilOnay = () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi) {
      showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci listesi temizlenemez. Önce mevcut planı temizleyin.');
      setTumunuSilDialogAcik(false);
      return;
    }

    ogrencileriTemizle();

    // File input'ı da temizle ve state'i sıfırla
    const excelInput = document.getElementById('excel-file-input');
    if (excelInput) {
      excelInput.value = '';
      excelInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Hata ve yükleme durumlarını da temizle
    setYukleme(false);
    setDialogAcik(false);
    setBekleyenOgrenciler([]);

    setTumunuSilDialogAcik(false);
  };

  const handleTumunuSilIptal = () => {
    setTumunuSilDialogAcik(false);
  };

  // Manuel öğrenci ekleme fonksiyonları - her alan için ayrı handler
  const handleManuelOgrenciChange = useCallback((field, value) => {
    setManuelOgrenci(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Her alan için optimize edilmiş handler'lar + real-time validation
  const handleAdChange = useCallback((e) => {
    const value = e.target.value;
    handleManuelOgrenciChange('ad', value);
    // Real-time validation
    const { validateOnChange } = require('../utils/formValidation');
    const validation = validateOnChange(value, {
      required: true,
      requiredMessage: 'Ad zorunludur',
      minLength: 2,
      maxLength: 30,
      type: 'string'
    });
    setValidationErrors(prev => ({ ...prev, ad: validation.errors[0] || null }));
  }, [handleManuelOgrenciChange]);

  const handleSoyadChange = useCallback((e) => {
    const value = e.target.value;
    handleManuelOgrenciChange('soyad', value);
    // Real-time validation
    const { validateOnChange } = require('../utils/formValidation');
    const validation = validateOnChange(value, {
      required: true,
      requiredMessage: 'Soyad zorunludur',
      minLength: 2,
      maxLength: 30,
      type: 'string'
    });
    setValidationErrors(prev => ({ ...prev, soyad: validation.errors[0] || null }));
  }, [handleManuelOgrenciChange]);

  const handleNumaraChange = useCallback((e) => {
    const value = e.target.value;
    handleManuelOgrenciChange('numara', value);
    // Real-time validation
    const { validateOnChange } = require('../utils/formValidation');
    const validation = validateOnChange(value, {
      required: true,
      requiredMessage: 'Öğrenci numarası zorunludur',
      type: 'number',
      min: 1
    });
    setValidationErrors(prev => ({ ...prev, numara: validation.errors[0] || null }));
    if (value && String(value).length < 3) {
      setValidationWarnings(prev => ({ ...prev, numara: 'Numara çok kısa (3+ hane önerilir)' }));
    } else {
      setValidationWarnings(prev => ({ ...prev, numara: null }));
    }
  }, [handleManuelOgrenciChange]);

  const handleSinifChange = useCallback((e) => {
    const value = e.target.value.toUpperCase(); // Otomatik büyük harfe çevir
    handleManuelOgrenciChange('sinif', value);
    // Real-time validation
    const { validateOnChange } = require('../utils/formValidation');
    const validation = validateOnChange(value, {
      required: true,
      requiredMessage: 'Sınıf zorunludur',
      pattern: /^\d+-[A-Z]$/,
      patternMessage: 'Sınıf formatı hatalı (örn: 9-A)'
    });
    setValidationErrors(prev => ({ ...prev, sinif: validation.errors[0] || null }));
    // Sınıf seviyesi kontrolü (uyarı)
    if (value && /^\d+-[A-Z]$/.test(value)) {
      const level = parseInt(value.split('-')[0]);
      if (level < 5 || level > 12) {
        setValidationWarnings(prev => ({ ...prev, sinif: 'Sınıf seviyesi 5-12 arası olmalıdır' }));
      } else {
        setValidationWarnings(prev => ({ ...prev, sinif: null }));
      }
    } else {
      setValidationWarnings(prev => ({ ...prev, sinif: null }));
    }
  }, [handleManuelOgrenciChange]);

  const handleCinsiyetChange = useCallback((e) => {
    handleManuelOgrenciChange('cinsiyet', e.target.value);
  }, [handleManuelOgrenciChange]);

  const handleManuelOgrenciEkle = () => {
    // Validation kullanarak kontrol et
    const { validateStudentForm } = require('../utils/formValidation');
    const { sanitizeText, sanitizeNumber, sanitizeClassName } = require('../utils/sanitization');

    // Önce sanitize et
    const sanitizedFormData = {
      ad: sanitizeText(manuelOgrenci.ad || '', { maxLength: 30, allowNumbers: false }),
      soyad: sanitizeText(manuelOgrenci.soyad || '', { maxLength: 30, allowNumbers: false }),
      numara: sanitizeNumber(manuelOgrenci.numara || '', { min: 1 }),
      sinif: sanitizeClassName(manuelOgrenci.sinif || ''),
      cinsiyet: manuelOgrenci.cinsiyet || 'E'
    };

    // Validation yap
    const validation = validateStudentForm(sanitizedFormData);

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      showError(firstError);
      return;
    }

    // Öğrenci numarası kontrolü (duplicate check)
    const mevcutNumara = ogrenciler.find(o => String(o.numara) === String(sanitizedFormData.numara));
    if (mevcutNumara) {
      showError('Bu öğrenci numarası zaten kullanılıyor!');
      return;
    }

    const yeniOgrenci = {
      id: Date.now(),
      ad: sanitizedFormData.ad,
      soyad: sanitizedFormData.soyad,
      numara: String(sanitizedFormData.numara),
      sinif: sanitizedFormData.sinif,
      cinsiyet: sanitizedFormData.cinsiyet,
      gecmisSkor: Math.floor(Math.random() * 40) + 60,
      ozelDurum: false
    };

    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi) {
      showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    ogrencilerEkle([yeniOgrenci]);
    showSuccess(`✅ ${yeniOgrenci.ad} ${yeniOgrenci.soyad} başarıyla eklendi!`);

    // Formu temizle
    setManuelOgrenci({
      ad: '',
      soyad: '',
      numara: '',
      sinif: '',
      cinsiyet: 'E'
    });
    setManualEklemeAcik(false);
    // Validation state'lerini temizle
    setValidationErrors({});
    setValidationWarnings({});
  };

  const handleManuelEklemeIptal = useCallback(() => {
    setManualEklemeAcik(false);
    setManuelOgrenci({
      ad: '',
      soyad: '',
      numara: '',
      sinif: '',
      cinsiyet: 'E'
    });
    // Validation state'lerini temizle
    setValidationErrors({});
    setValidationWarnings({});
  }, []);

  // 12. sınıf dialog handler'ları
  const handleOnikinciSinifKabul = () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi) {
      showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    ogrencilerEkle(bekleyenOgrenciler);
    setDialogAcik(false);
    const ogrenciSayisi = bekleyenOgrenciler.length;
    setBekleyenOgrenciler([]);
    showSuccess(`✅ ${ogrenciSayisi} öğrenci başarıyla yüklendi!`);
  };

  const handleOnikinciSinifRed = () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi) {
      showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    const digerOgrenciler = bekleyenOgrenciler.filter(ogrenci => !ogrenci.sinif.startsWith('12-'));
    ogrencilerEkle(digerOgrenciler);
    setDialogAcik(false);
    const ogrenciSayisi = digerOgrenciler.length;
    setBekleyenOgrenciler([]);
    showSuccess(`✅ ${ogrenciSayisi} öğrenci başarıyla yüklendi!`);
  };

  // CSV dosyası yükleme kaldırıldı - sadece Excel desteği var

  // Excel dosyası yükleme (e-Okul formatı)
  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Admin kontrolü - Public modda Excel yükleme engellenir
    if (readOnly) {
      showError('Excel ile öğrenci yüklemek için yönetici olarak giriş yapmalısınız.');
      event.target.value = ''; // File input'u temizle
      return;
    }

    // Mevcut öğrenci listesi kontrolü - Liste varsa yeni liste yüklenemez
    const mevcutOgrenciSayisi = Array.isArray(ogrenciler) ? ogrenciler.length : 0;
    if (mevcutOgrenciSayisi > 0) {
      console.log('⚠️ Mevcut öğrenci listesi tespit edildi:', mevcutOgrenciSayisi, 'öğrenci');
      // showError kullan - daha görünür olsun
      showError(`Mevcut bir öğrenci listesi bulunmaktadır (${mevcutOgrenciSayisi} öğrenci). Yeni liste yüklemek için önce mevcut listeyi temizlemeniz gerekmektedir.`);
      event.target.value = ''; // File input'u temizle
      return;
    }

    setYukleme(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // e-Okul formatında öğrenci verileri genellikle 4. satırdan başlar
        // Sütun başlıkları tespit edilecek ve dinamik olarak eşleştirilecek

        // Öğrenci gruplarını ve sütun başlıklarını tespit et
        const ogrenciGruplari = [];
        let mevcutSinif = '9-A'; // varsayılan
        let sonTCSatiri = -1;
        let sutunBasliklari = {}; // Sütun başlıkları ve indeksleri

        // Excel veri yapısını kontrol et
        console.log('Excel dosyası analiz ediliyor...');
        console.log('Toplam satır sayısı:', jsonData.length);

        // Sütun başlıklarını tespit et (genellikle 2-4. satırlarda)
        const sutunBasliklariniTespitEt = () => {
          console.log('Sütun başlıkları tespit ediliyor...');

          for (let satir = 1; satir < Math.min(5, jsonData.length); satir++) {
            const row = jsonData[satir];
            if (!row) {
              console.log(`  Satır ${satir}: Boş satır`);
              continue;
            }

            console.log(`  Satır ${satir} kontrol ediliyor:`, row);

            for (let sutun = 0; sutun < row.length; sutun++) {
              const cell = row[sutun];
              if (cell && cell.toString().trim()) {
                const cellValue = cell.toString().trim().toLowerCase();

                // Sadece temel sütun başlıklarını tespit et
                if ((cellValue.includes('öğrenci no') || cellValue.includes('numara')) && !cellValue.includes('s.no')) {
                  sutunBasliklari.numara = sutun;
                  console.log(`    Sütun ${sutun}: Numara başlığı bulundu - "${cell.toString().trim()}"`);
                } else if (cellValue.includes('adı') && !cellValue.includes('soyadı')) {
                  sutunBasliklari.adi = sutun;
                  console.log(`    Sütun ${sutun}: Ad başlığı bulundu - "${cell.toString().trim()}"`);
                } else if (cellValue.includes('soyadı') || cellValue.includes('soyad')) {
                  sutunBasliklari.soyadi = sutun;
                  console.log(`    Sütun ${sutun}: Soyad başlığı bulundu - "${cell.toString().trim()}"`);
                } else if (cellValue.includes('cinsiyet')) {
                  sutunBasliklari.cinsiyet = sutun;
                  console.log(`    Sütun ${sutun}: Cinsiyet başlığı bulundu - "${cell.toString().trim()}"`);
                }
              }
            }

            // Eğer önemli sütunlar bulunduysa dur
            if (sutunBasliklari.numara !== undefined && sutunBasliklari.adi !== undefined) {
              console.log(`  Satır ${satir}'de yeterli sütun başlığı bulundu, duruluyor.`);
              break;
            }
          }

          console.log('Tespit edilen sütun başlıkları:', sutunBasliklari);
          return sutunBasliklari;
        };

        sutunBasliklariniTespitEt();

        // Önce tüm T.C. satırlarını bul ve sınıf bilgilerini çıkar
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];

          if (row && row[0] && row[0].toString().includes('T.C.')) {
            const baslik = row[0].toString();

            // Farklı sınıf formatlarını tespit et
            let sinifBilgisi = null;

            // Format 1: "9. Sınıf / A Şubesi"
            let sinifMatch = baslik.match(/(\d+)\.\s*Sınıf\s*\/\s*(\w+)\s*Şubesi/);
            if (sinifMatch) {
              sinifBilgisi = `${sinifMatch[1]}-${sinifMatch[2]}`;
            }

            // Format 2: "11. Sınıf A Şubesi" (nokta ve slash olmadan)
            if (!sinifBilgisi) {
              sinifMatch = baslik.match(/(\d+)\.\s*Sınıf\s+(\w+)\s+Şubesi/);
              if (sinifMatch) {
                sinifBilgisi = `${sinifMatch[1]}-${sinifMatch[2]}`;
              }
            }

            // Format 3: "11/A Şubesi" (sadece sayı ve harf)
            if (!sinifBilgisi) {
              sinifMatch = baslik.match(/(\d+)\/(\w+)\s*Şubesi/);
              if (sinifMatch) {
                sinifBilgisi = `${sinifMatch[1]}-${sinifMatch[2]}`;
              }
            }

            // Format 4: "11-A" (direkt format)
            if (!sinifBilgisi) {
              sinifMatch = baslik.match(/(\d+)-(\w+)/);
              if (sinifMatch) {
                sinifBilgisi = `${sinifMatch[1]}-${sinifMatch[2]}`;
              }
            }

            if (sinifBilgisi) {
              console.log(`Sınıf tespit edildi: ${baslik} -> ${sinifBilgisi}`);

              // Eğer daha önce bir T.C. satırı varsa, önceki grubu kaydet
              if (sonTCSatiri >= 0) {
                ogrenciGruplari.push({
                  sinif: mevcutSinif,
                  baslangicSatir: sonTCSatiri + 4, // T.C. satırından 4 satır sonra öğrenci verileri
                  bitisSatir: i - 1
                });
              }

              mevcutSinif = sinifBilgisi;
              sonTCSatiri = i;
            }
          }
        }

        // Son grubu da ekle
        if (sonTCSatiri >= 0) {
          ogrenciGruplari.push({
            sinif: mevcutSinif,
            baslangicSatir: sonTCSatiri + 4,
            bitisSatir: jsonData.length - 1
          });
        }

        console.log('Tespit edilen gruplar:', ogrenciGruplari);

        // Her grup için öğrencileri işle
        const yeniOgrenciler = [];

        console.log('Toplam grup sayısı:', ogrenciGruplari.length);

        ogrenciGruplari.forEach((grup, grupIndex) => {
          const grupVerileri = jsonData.slice(grup.baslangicSatir, grup.bitisSatir + 1);

          console.log(`Grup ${grupIndex + 1} (${grup.sinif}): ${grup.baslangicSatir}-${grup.bitisSatir}, ${grupVerileri.length} satır`);

          let reddedilenSatirSayisi = 0;
          const grupOgrencileri = grupVerileri
            .filter((row, rowIndex) => {
              // Debug için filtreleme sürecini logla
              if (process.env.NODE_ENV === 'development' && rowIndex < 5) {
                console.log(`Filtreleme kontrolü - Satır ${rowIndex}:`, row);
              }

              // Daha esnek filtreleme - öğrenci verisi olup olmadığını kontrol et
              if (!row || row.length < 3) {
                if (process.env.NODE_ENV === 'development' && rowIndex < 5) {
                  console.log(`  ❌ Satır çok kısa: ${row ? row.length : 'null'} sütun`);
                }
                return false;
              }

              // Excel formatına göre özel kontrol
              // Sütun başlıklarına göre doğru sütunları kullan
              const numara = sutunBasliklari.numara !== undefined ? row[sutunBasliklari.numara] : row[1];
              const ad = sutunBasliklari.adi !== undefined ? row[sutunBasliklari.adi] : row[2];

              if (process.env.NODE_ENV === 'development' && rowIndex < 5) {
                console.log(`  📊 Veriler: Numara=${numara}, Ad=${ad}`);
              }

              // Geçersiz satırları filtrele
              if (!numara || !ad) {
                if (process.env.NODE_ENV === 'development' && rowIndex < 5) {
                  console.log(`  ❌ Eksik veri: Numara=${!!numara}, Ad=${!!ad}`);
                }
                return false;
              }

              const numaraStr = numara.toString().trim();
              const adStr = ad.toString().trim();

              if (process.env.NODE_ENV === 'development' && rowIndex < 5) {
                console.log(`  📝 Temizlenmiş: Numara="${numaraStr}", Ad="${adStr}"`);
              }

              // Geçersiz başlık satırları (daha spesifik kontrol)
              if (adStr.includes('Sınıf') || adStr.includes('Şubesi') ||
                (adStr.includes('Öğrenci') && adStr.includes('No')) ||
                adStr.includes('Numara') ||
                adStr.includes('Adı') || adStr.includes('Soyadı') ||
                adStr.includes('Toplam') || adStr.includes('Özet') ||
                adStr.includes('S.No') || adStr.includes('Cinsiyet')) {
                if (process.env.NODE_ENV === 'development' && rowIndex < 5) {
                  console.log(`  ❌ Başlık satırı: "${adStr}"`);
                }
                return false;
              }

              // Öğrenci numarası sayısal olmalı (1+ haneli - çok esnek)
              // Sayısal değer kontrolü daha esnek olsun
              const numaraValid = !isNaN(numaraStr) && numaraStr.length >= 1 && numaraStr.length <= 10 && numaraStr.trim() !== '';
              const adValid = adStr.match(/[a-zA-ZçğıöşüÇĞIİÖŞÜ]/) && adStr.length >= 2;

              if (process.env.NODE_ENV === 'development') {
                if (rowIndex < 5) {
                  console.log(`  ✅ Validasyon: Numara=${numaraValid}, Ad=${adValid}`);
                }
                // Reddedilen satırları da logla (ilk 3 reddedilen)
                if (!numaraValid || !adValid) {
                  console.log(`  ❌ Reddedilen satır ${rowIndex}: Numara="${numaraStr}", Ad="${adStr}"`);
                }
              }

              if (numaraValid && adValid) {
                if (process.env.NODE_ENV === 'development' && rowIndex < 5) {
                  console.log(`  ✅ Geçerli öğrenci satırı kabul edildi`);
                }
                return true;
              }

              reddedilenSatirSayisi++;
              if (process.env.NODE_ENV === 'development' && rowIndex < 5) {
                console.log(`  ❌ Geçersiz öğrenci satırı reddedildi`);
              }

              return false;
            });

          console.log(`${grup.sinif} grubu için filtrelenmiş satır sayısı: ${grupOgrencileri.length}`);
          console.log(`${grup.sinif} grubu için reddedilen satır sayısı: ${reddedilenSatirSayisi}`);

          const islenmisOgrenciler = grupOgrencileri.map((row, index) => {
            // Öğrenci verilerini sütun başlıklarına göre çıkar
            let ogrenciNo = '';
            let adi = '';
            let soyadi = '';
            let cinsiyet = '';

            // Debug için satır verilerini logla (sadece development)
            if (process.env.NODE_ENV === 'development') {
              console.log(`Satır ${grup.baslangicSatir + index}:`, row);
            }

            // Sütun başlıkları tespit edilmişse, direkt o sütunları kullan
            if (sutunBasliklari.numara !== undefined && row[sutunBasliklari.numara]) {
              ogrenciNo = row[sutunBasliklari.numara].toString().trim();
            }
            if (sutunBasliklari.adi !== undefined && row[sutunBasliklari.adi]) {
              adi = row[sutunBasliklari.adi].toString().trim();
            }
            if (sutunBasliklari.soyadi !== undefined && row[sutunBasliklari.soyadi]) {
              soyadi = row[sutunBasliklari.soyadi].toString().trim();
            }
            if (sutunBasliklari.cinsiyet !== undefined && row[sutunBasliklari.cinsiyet]) {
              const cinsiyetValue = row[sutunBasliklari.cinsiyet].toString().trim().toLowerCase();
              // Cinsiyet değerini standardize et
              if (cinsiyetValue === 'k' || cinsiyetValue === 'kız' || cinsiyetValue === 'kadın' ||
                cinsiyetValue === 'kadin' || cinsiyetValue === 'bayan') {
                cinsiyet = 'K';
              } else if (cinsiyetValue === 'e' || cinsiyetValue === 'erkek' || cinsiyetValue === 'bay') {
                cinsiyet = 'E';
              }
            }

            // Debug: Eğer sütun başlıkları bulunamadıysa, manuel sütun eşleştirmesi yap
            if (!ogrenciNo || !adi) {
              // Excel formatına göre manuel eşleştirme (debug loglarından tespit edilen format)
              if (row.length > 11) {
                // Sütun 1: Öğrenci numarası (index 1) - 1+ haneli sayılar
                if (!ogrenciNo && row[1] && !isNaN(row[1].toString().trim())) {
                  const numaraStr = row[1].toString().trim();
                  if (numaraStr.length >= 1 && numaraStr.length <= 10) {
                    ogrenciNo = numaraStr;
                  }
                }
                // Sütun 3: Ad (index 3)
                if (!adi && row[3] && row[3].toString().trim()) {
                  adi = row[3].toString().trim();
                }
                // Sütun 7: Soyad (index 7)
                if (!soyadi && row[7] && row[7].toString().trim()) {
                  soyadi = row[7].toString().trim();
                }
                // Sütun 11: Cinsiyet (index 11)
                if (!cinsiyet && row[11] && row[11].toString().trim()) {
                  const cinsiyetValue = row[11].toString().trim().toLowerCase();
                  if (cinsiyetValue === 'k' || cinsiyetValue === 'kız' || cinsiyetValue === 'kadın' || cinsiyetValue === 'kadin' || cinsiyetValue === 'bayan') {
                    cinsiyet = 'K';
                  } else if (cinsiyetValue === 'e' || cinsiyetValue === 'erkek' || cinsiyetValue === 'bay') {
                    cinsiyet = 'E';
                  }
                }
              }

              // Eğer hala veri bulunamadıysa, tüm sütunları tarayarak bul
              if (!ogrenciNo || !adi) {
                for (let i = 0; i < row.length; i++) {
                  const cell = row[i];
                  if (cell && cell.toString().trim()) {
                    const cellValue = cell.toString().trim();

                    // Sayısal değer ise öğrenci numarası olabilir
                    if (!ogrenciNo && !isNaN(cellValue) && cellValue.length >= 1 && cellValue.length <= 10) {
                      ogrenciNo = cellValue;
                    }
                    // Metin değeri ise isim olabilir
                    else if (cellValue.match(/[a-zA-ZçğıöşüÇĞIİÖŞÜ]/) && cellValue.length >= 2 && cellValue.length <= 30) {
                      if (cellValue.match(/^[a-zA-ZçğıöşüÇĞIİÖŞÜ\s]+$/)) {
                        if (!adi) {
                          adi = cellValue;
                        } else if (!soyadi) {
                          soyadi = cellValue;
                        }
                      }
                    }
                  }
                }
              }
            }

            // Eğer sütun başlıkları tespit edilemediyse, eski yöntemi kullan
            if (!ogrenciNo || !adi) {
              for (let i = 1; i < row.length; i++) {
                const cell = row[i];
                if (cell && cell.toString().trim()) {
                  const cellValue = cell.toString().trim();

                  // Sayısal değer ise öğrenci numarası olabilir (3+ haneli sayılar)
                  if (!ogrenciNo && !isNaN(cellValue) && cellValue.length >= 3 && cellValue.length <= 10) {
                    ogrenciNo = cellValue;
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`  Sütun ${i}: Öğrenci No = ${cellValue}`);
                    }
                  }
                  // Metin değeri ise isim olabilir (Türkçe karakterler içeriyorsa ve geçerli uzunlukta)
                  else if (cellValue.match(/[a-zA-ZçğıöşüÇĞIİÖŞÜ]/) && cellValue.length >= 2 && cellValue.length <= 30) {
                    // İsim olup olmadığını kontrol et (sadece harf içermeli)
                    if (cellValue.match(/^[a-zA-ZçğıöşüÇĞIİÖŞÜ\s]+$/)) {
                      if (!adi) {
                        adi = cellValue;
                        if (process.env.NODE_ENV === 'development') {
                          console.log(`  Sütun ${i}: Ad = ${cellValue}`);
                        }
                      } else if (!soyadi) {
                        soyadi = cellValue;
                        if (process.env.NODE_ENV === 'development') {
                          console.log(`  Sütun ${i}: Soyad = ${cellValue}`);
                        }
                      }
                    }
                  }
                  // Cinsiyet kontrolü - e-Okul formatında genellikle K/E harfi
                  else if (!cinsiyet && (cellValue.toLowerCase() === 'k' || cellValue.toLowerCase() === 'e' ||
                    cellValue.toLowerCase() === 'kız' || cellValue.toLowerCase() === 'erkek' ||
                    cellValue.toLowerCase() === 'kadın' || cellValue.toLowerCase() === 'kadin' ||
                    cellValue.toLowerCase() === 'bay' || cellValue.toLowerCase() === 'bayan')) {
                    // Cinsiyet değerini standardize et
                    const cinsiyetValue = cellValue.toLowerCase();
                    if (cinsiyetValue === 'k' || cinsiyetValue === 'kız' || cinsiyetValue === 'kadın' ||
                      cinsiyetValue === 'kadin' || cinsiyetValue === 'bayan') {
                      cinsiyet = 'K';
                    } else if (cinsiyetValue === 'e' || cinsiyetValue === 'erkek' || cinsiyetValue === 'bay') {
                      cinsiyet = 'E';
                    }
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`  Sütun ${i}: Cinsiyet = ${cellValue} -> ${cinsiyet}`);
                    }
                  }
                }
              }
            }

            // Özel durum varsayılan olarak false
            let ozelDurum = false;

            const ogrenci = {
              id: ogrenciler.length + yeniOgrenciler.length + index + 1,
              ad: adi,
              soyad: soyadi || '', // Soyad yoksa boş string
              numara: ogrenciNo,
              sinif: grup.sinif, // Her grubun kendi sınıfı
              cinsiyet: cinsiyet || 'E', // Cinsiyet yoksa varsayılan olarak Erkek
              gecmisSkor: Math.floor(Math.random() * 40) + 60, // 60-100 arası rastgele
              ozelDurum: ozelDurum
            };

            if (process.env.NODE_ENV === 'development') {
              console.log(`  Öğrenci oluşturuldu:`, ogrenci);
              console.log(`    Raw data - No: ${row[1] || 'N/A'}, Ad: ${row[3] || 'N/A'}, Soyad: ${row[7] || 'N/A'}, Cinsiyet: ${row[11] || 'N/A'}`);
              console.log(`    İşlenmiş cinsiyet: ${cinsiyet}`);
            }
            return ogrenci;
          });

          const gecerliOgrenciler = islenmisOgrenciler.filter(ogrenci => {
            const gecerli = ogrenci.ad && ogrenci.numara; // Soyad opsiyonel olabilir
            if (!gecerli && process.env.NODE_ENV === 'development') {
              console.log(`  ❌ Geçersiz öğrenci objesi:`, ogrenci);
            }
            return gecerli;
          }); // Boş kayıtları filtrele

          console.log(`${grup.sinif} grubu işleme sonuçları:`);
          console.log(`  - Toplam satır: ${grupVerileri.length}`);
          console.log(`  - Filtrelenmiş satır: ${grupOgrencileri.length}`);
          console.log(`  - İşlenmiş öğrenci: ${islenmisOgrenciler.length}`);
          console.log(`  - Geçerli öğrenci: ${gecerliOgrenciler.length}`);
          console.log(`  - Reddedilen öğrenci: ${islenmisOgrenciler.length - gecerliOgrenciler.length}`);

          // Tüm gruplar için detaylı analiz
          console.log(`  📊 ${grup.sinif} detaylı analiz:`);
          console.log(`    - Başlangıç satırı: ${grup.baslangicSatir}`);
          console.log(`    - Bitiş satırı: ${grup.bitisSatir}`);
          console.log(`    - Toplam satır aralığı: ${grup.bitisSatir - grup.baslangicSatir + 1}`);
          console.log(`    - Eksik satır sayısı: ${grupVerileri.length - gecerliOgrenciler.length}`);

          // 12-D grubu için özel analiz
          if (grup.sinif === '12-D' && (grupVerileri.length - gecerliOgrenciler.length) > 0) {
            console.log(`  🔍 12-D grubu eksik öğrenci analizi:`);
            console.log(`    - İşlenmiş öğrenci: ${islenmisOgrenciler.length}`);
            console.log(`    - Geçerli öğrenci: ${gecerliOgrenciler.length}`);
            console.log(`    - Reddedilen öğrenci: ${islenmisOgrenciler.length - gecerliOgrenciler.length}`);
          }

          yeniOgrenciler.push(...gecerliOgrenciler);
        });

        console.log('Toplam yeni öğrenci sayısı:', yeniOgrenciler.length);

        // Öğrenci verisi kontrolü
        if (yeniOgrenciler.length === 0) {
          setYukleme(false);
          const tespitEdilenSiniflar = ogrenciGruplari.map(g => g.sinif).join(', ');

          showError(`❌ Excel dosyasında öğrenci verisi bulunamadı!

🔍 Analiz Sonucu:
• Tespit edilen sınıf sayısı: ${ogrenciGruplari.length}
• Tespit edilen sınıflar: ${tespitEdilenSiniflar || 'Hiçbiri'}
• Toplam Excel satır sayısı: ${jsonData.length}
• Tespit edilen sütun başlıkları: ${Object.keys(sutunBasliklari).length > 0 ? Object.keys(sutunBasliklari).join(', ') : 'Hiçbiri'}

📋 Detaylı Analiz:
• Excel dosyası başarıyla okundu
• Sınıf başlıkları tespit edildi
• Sütun başlıkları arandı: ${Object.keys(sutunBasliklari).length > 0 ? 'Bazıları bulundu' : 'Hiçbiri bulunamadı'}
• Ancak öğrenci verileri (ad, soyad, numara) bulunamadı

✅ Çözüm Önerileri:
• Excel dosyasının doğru format olduğundan emin olun
• Dosyada "Öğrenci No", "Adı", "Soyadı", "Cinsiyeti" sütun başlıkları olduğunu kontrol edin
• e-Okul'dan "Öğrenci Listesi" raporunu indirin (Sınıf Özeti değil)
• Excel'de birden fazla sayfa varsa diğer sayfaları kontrol edin
• Cinsiyet sütununda "Kız" veya "Erkek" yazıldığından emin olun

💡 İpucu: Tarayıcının geliştirici konsolunu açın (F12) ve "Console" sekmesinde detaylı analiz bilgilerini görebilirsiniz.`);
          return;
        }

        // 12. sınıf kontrolü
        const onikinciSinifOgrenciler = yeniOgrenciler.filter(ogrenci => ogrenci.sinif.startsWith('12-'));
        const digerOgrenciler = yeniOgrenciler.filter(ogrenci => !ogrenci.sinif.startsWith('12-'));

        console.log('12. sınıf analizi:');
        console.log(`- Toplam yeni öğrenci: ${yeniOgrenciler.length}`);
        console.log(`- 12. sınıf öğrencileri: ${onikinciSinifOgrenciler.length}`);
        console.log(`- Diğer sınıf öğrencileri: ${digerOgrenciler.length}`);

        // 12. sınıf gruplarını detaylı analiz et
        const onikinciSinifGruplari = {};
        onikinciSinifOgrenciler.forEach(ogrenci => {
          if (!onikinciSinifGruplari[ogrenci.sinif]) {
            onikinciSinifGruplari[ogrenci.sinif] = 0;
          }
          onikinciSinifGruplari[ogrenci.sinif]++;
        });
        console.log('- 12. sınıf grup dağılımı:', onikinciSinifGruplari);

        if (onikinciSinifOgrenciler.length > 0) {
          // 12. sınıf öğrencileri var, kullanıcıya sor
          setBekleyenOgrenciler(yeniOgrenciler);
          setDialogAcik(true);
          setYukleme(false);
        } else {
          // 12. sınıf yok, direkt yükle
          // Yerleştirme planı kontrolü
          if (yerlesimPlaniVarMi) {
            showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci eklenemez. Önce mevcut planı temizleyin.');
            setYukleme(false);
            return;
          }

          ogrencilerEkle(yeniOgrenciler);
          setYukleme(false);
          showSuccess(`✅ ${yeniOgrenciler.length} öğrenci başarıyla yüklendi!`);
        }
      } catch (error) {
        showError('Excel dosyası işlenirken hata oluştu: ' + error.message);
        setYukleme(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Örnek indirme kaldırıldı

  return (
    <>
      <Card sx={{ maxWidth: 1200, mx: 'auto', mt: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="h2" sx={{ color: 'text.primary', fontWeight: 'bold' }}>
              Öğrenci Listesi ve Seçimi
            </Typography>
          </Box>

          {/* Yerleştirme Planı Uyarısı */}
          {yerlesimPlaniVarMi && (
            <Alert
              severity="warning"
              sx={{ mb: 3 }}
              icon={<WarningIcon />}
            >
              <AlertTitle>Yerleştirme Planı Mevcut</AlertTitle>
              <Typography variant="body2">
                Mevcut bir yerleştirme planı bulunduğu için öğrenci listesinde değişiklik yapılamaz.
                Öğrenci ekleme, silme ve listeyi temizleme işlemleri kısıtlanmıştır.
                <br />
                <strong>Önce mevcut planı temizleyin, sonra öğrenci listesini değiştirin.</strong>
              </Typography>
            </Alert>
          )}


          {/* Yükleme Göstergesi */}
          {yukleme && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Dosya işleniyor...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Dosya Yükleme Bölümü */}
          <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: 'grey.50' }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                component="label"
                size="small"
              >
                Excel Yükle
                <input
                  id="excel-file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  hidden
                  onChange={handleExcelUpload}
                />
              </Button>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                size="small"
                onClick={() => setManualEklemeAcik(true)}
                disabled={readOnly}
              >
                Öğrenci Ekle
              </Button>

              <Typography variant="body2" color="text.secondary">
                e-Okul'dan indirdiğiniz Excel dosyasını yükleyebilir veya manuel olarak öğrenci ekleyebilirsiniz.
              </Typography>
            </Box>
          </Paper>

          {/* İstatistikler ve Arama */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              icon={<PeopleIcon />}
              label={`Toplam: ${ogrenciler.length} öğrenci`}
              color="primary"
              variant="outlined"
            />

            {/* Arama Butonu/Input - Tek Element */}
            <Box
              ref={aramaRef}
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                height: 40, // Sabit yükseklik
                overflow: 'hidden'
              }}
            >
              <TextField
                inputRef={aramaInputRef}
                size="small"
                placeholder={aramaAcik ? "Öğrenci ara (3+ harf veya numara)..." : ""}
                value={aramaTerimi}
                onChange={(e) => {
                  // Throttle ile performans iyileştirmesi
                  const value = e.target.value;
                  setAramaTerimi(value);
                }}
                onFocus={() => setAramaAcik(true)}
                autoComplete="off"
                sx={{
                  width: aramaAcik ? 280 : 40,
                  height: 40,
                  transition: 'all 0.2s ease',
                  '& .MuiOutlinedInput-root': {
                    height: 40,
                    borderRadius: '50px',
                    bgcolor: 'white',
                    transition: 'all 0.2s ease',
                    '& fieldset': {
                      borderColor: aramaAcik ? 'primary.main' : 'grey.300',
                      transition: 'all 0.3s ease'
                    },
                    '&:hover fieldset': {
                      borderColor: 'primary.main'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.main',
                      boxShadow: 'none'
                    }
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: aramaAcik ? 'primary.50' : 'transparent',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!aramaAcik) {
                            setAramaAcik(true);
                            // Focus işlemi useEffect'te yapılıyor (requestAnimationFrame ile)
                          } else if (aramaInputRef.current) {
                            // Zaten açıksa direkt focus et
                            aramaInputRef.current.focus();
                          }
                        }}
                      >
                        <SearchIcon
                          color={aramaAcik ? "primary" : "action"}
                          sx={{
                            fontSize: 20,
                            transition: 'all 0.3s ease',
                            display: 'block',
                            margin: 'auto',
                            transform: 'translate(-8px, 0px)' // SearchIcon'u görsel olarak merkeze hizala
                          }}
                        />
                      </Box>
                    </InputAdornment>
                  ),
                  endAdornment: aramaAcik && aramaTerimi && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setAramaTerimi('');
                          setAramaAcik(false);
                        }}
                        edge="end"
                        sx={{
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'error.50',
                            color: 'error.main',
                            transform: 'scale(1.2) rotate(90deg)'
                          }
                        }}
                      >
                        ✕
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            {ogrenciler.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteIcon />}
                onClick={handleTumOgrencileriSil}
                sx={{ ml: 'auto' }}
                disabled={readOnly}
              >
                Tümünü Sil
              </Button>
            )}
          </Box>

          {/* Öğrenci Tablosu - Dialog açıkken render etme (performans optimizasyonu) */}
          {!manualEklemeAcik && (
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Sıra</TableCell>
                    <TableCell>Öğrenci No</TableCell>
                    <TableCell>Ad Soyad</TableCell>
                    <TableCell>Sınıf</TableCell>
                    <TableCell>Cinsiyet</TableCell>
                    <TableCell>İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtrelenmisOgrenciler
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((ogrenci, index) => (
                      <StudentRow
                        key={ogrenci.id}
                        ogrenci={ogrenci}
                        index={page * rowsPerPage + index}
                        onSil={handleOgrenciSil}
                        readOnly={readOnly}
                      />
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filtrelenmisOgrenciler.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Sayfa başına satır:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
              />
            </TableContainer>
          )}

          {/* Arama sonucu bulunamadığında */}
          {!manualEklemeAcik && aramaTerimi && filtrelenmisOgrenciler.length === 0 && ogrenciler.length > 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Arama sonucu bulunamadı
              </Typography>
              <Typography variant="body2" color="text.secondary">
                "{aramaTerimi}" için hiçbir öğrenci bulunamadı
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setAramaTerimi('')}
                sx={{ mt: 2 }}
                disabled={readOnly}
              >
                Aramayı Temizle
              </Button>
            </Box>
          )}

          {/* Hiç öğrenci yoksa */}
          {ogrenciler.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <PeopleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Henüz öğrenci bulunmuyor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                CSV veya Excel dosyası yükleyerek öğrenci listesini içe aktarın
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 12. Sınıf Onay Dialog'u */}
      <Dialog
        open={dialogAcik}
        onClose={() => setDialogAcik(false)}
        aria-labelledby="onikinci-sinif-dialog-title"
        aria-describedby="onikinci-sinif-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="onikinci-sinif-dialog-title">
          12. Sınıf Öğrencileri Tespit Edildi
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="onikinci-sinif-dialog-description">
            Excel dosyasında {bekleyenOgrenciler.filter(o => o.sinif.startsWith('12-')).length} adet 12. sınıf öğrencisi bulundu.
            <br /><br />
            12. sınıf öğrencilerini sisteme yüklemek istiyor musunuz?
          </DialogContentText>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              12. Sınıf Öğrencileri:
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {bekleyenOgrenciler
                .filter(o => o.sinif.startsWith('12-'))
                .map((ogrenci, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                    • {ogrenci.ad} {ogrenci.soyad} ({ogrenci.sinif}) - No: {ogrenci.numara}
                  </Typography>
                ))
              }
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleOnikinciSinifRed} color="secondary">
            Hayır, 12. Sınıfları Yükleme
          </Button>
          <Button onClick={handleOnikinciSinifKabul} variant="contained" color="primary">
            Evet, Tüm Öğrencileri Yükle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Öğrenci Silme Onay Dialogu */}
      <Dialog
        open={silmeDialogAcik}
        onClose={handleOgrenciSilIptal}
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
          Öğrenci Silme Onayı
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>"{silinecekOgrenciAdi}"</strong> öğrencisini silmek istediğinizden emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bu işlem geri alınamaz ve öğrenci tüm verileriyle birlikte kalıcı olarak silinecektir.
          </Typography>
        </DialogContent>
        <DialogActions sx={{
          justifyContent: 'center',
          gap: 2,
          pb: 3,
          px: 3
        }}>
          <Button
            onClick={handleOgrenciSilIptal}
            variant="outlined"
            sx={{
              borderRadius: '8px',
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: 500
            }}
            disabled={readOnly}
          >
            İptal
          </Button>
          <Button
            onClick={handleOgrenciSilOnay}
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
            disabled={readOnly}
          >
            Evet, Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tüm Öğrencileri Silme Onay Dialogu */}
      <Dialog
        open={tumunuSilDialogAcik}
        onClose={handleTumunuSilIptal}
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
          Tüm Öğrencileri Silme Onayı
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>Tüm öğrencileri</strong> silmek istediğinizden emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Bu işlem geri alınamaz ve tüm öğrenci verileri kalıcı olarak silinecektir.
          </Typography>
          <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
            ⚠️ Bu işlem sistemdeki tüm öğrenci bilgilerini silecektir!
          </Typography>
        </DialogContent>
        <DialogActions sx={{
          justifyContent: 'center',
          gap: 2,
          pb: 3,
          px: 3
        }}>
          <Button
            onClick={handleTumunuSilIptal}
            variant="outlined"
            sx={{
              borderRadius: '8px',
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: 500
            }}
            disabled={readOnly}
          >
            İptal
          </Button>
          <Button
            onClick={handleTumunuSilOnay}
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
            disabled={readOnly}
          >
            Evet, Tümünü Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manuel Öğrenci Ekleme Dialog'u */}
      <Dialog
        open={manualEklemeAcik}
        onClose={handleManuelEklemeIptal}
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
          color: 'primary.main',
          pb: 1,
          pt: 3,
          px: 3
        }}>
          Manuel Öğrenci Ekleme
        </DialogTitle>
        <DialogContent sx={{ pt: 5, pb: 3, px: 3, overflow: 'visible' }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Ad *"
                value={manuelOgrenci.ad}
                onChange={handleAdChange}
                required
                variant="outlined"
                size="medium"
                error={!!validationErrors?.ad}
                helperText={validationErrors?.ad}
                inputProps={{ maxLength: 30 }}
                InputLabelProps={{
                  sx: {
                    backgroundColor: 'white',
                    px: 0.5
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Soyad *"
                value={manuelOgrenci.soyad}
                onChange={handleSoyadChange}
                required
                variant="outlined"
                size="medium"
                error={!!validationErrors?.soyad}
                helperText={validationErrors?.soyad}
                inputProps={{ maxLength: 30 }}
                InputLabelProps={{
                  sx: {
                    backgroundColor: 'white',
                    px: 0.5
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Öğrenci No *"
                value={manuelOgrenci.numara}
                onChange={handleNumaraChange}
                required
                variant="outlined"
                size="medium"
                type="number"
                error={!!validationErrors?.numara}
                helperText={validationErrors?.numara || validationWarnings?.numara}
                inputProps={{ min: 1, max: 9999999999 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sınıf *"
                value={manuelOgrenci.sinif}
                onChange={handleSinifChange}
                required
                variant="outlined"
                size="medium"
                placeholder="Örn: 9-A, 10-B"
                error={!!validationErrors?.sinif}
                helperText={validationErrors?.sinif || validationWarnings?.sinif}
                inputProps={{ pattern: '^\\d+-[A-Z]$', maxLength: 5 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="medium">
                <InputLabel>Cinsiyet</InputLabel>
                <Select
                  value={manuelOgrenci.cinsiyet}
                  onChange={handleCinsiyetChange}
                  label="Cinsiyet"
                >
                  <MenuItem value="E">Erkek</MenuItem>
                  <MenuItem value="K">Kız</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{
          justifyContent: 'flex-end',
          gap: 2,
          pb: 3,
          pt: 2,
          px: 3
        }}>
          <Button
            onClick={handleManuelEklemeIptal}
            variant="outlined"
            sx={{
              borderRadius: '8px',
              px: 3,
              py: 1.25,
              textTransform: 'none',
              fontWeight: 500,
              minWidth: 100
            }}
            disabled={readOnly}
          >
            İptal
          </Button>
          <Button
            onClick={handleManuelOgrenciEkle}
            variant="contained"
            color="primary"
            sx={{
              borderRadius: '8px',
              px: 3,
              py: 1.25,
              textTransform: 'none',
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
              minWidth: 140
            }}
            disabled={readOnly}
          >
            Öğrenci Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});

OgrenciListesi.displayName = 'OgrenciListesi';

export default OgrenciListesi;
