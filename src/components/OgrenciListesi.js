import React, { useState, memo, useRef, useEffect } from 'react';
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

const OgrenciListesi = memo(({ ogrenciler, yerlestirmeSonucu = null }) => {
const { ogrencilerEkle, ogrenciSil, ogrencileriTemizle } = useExam();
  const { showError } = useNotifications();
  const [yukleme, setYukleme] = useState(false);
  const [hata, setHata] = useState(null);
  const [aramaTerimi, setAramaTerimi] = useState('');
  const [aramaAcik, setAramaAcik] = useState(false);
  const aramaRef = useRef(null);

  // Yerleştirme planı kontrolü
  const yerlesimPlaniVarMi = () => {
    return yerlestirmeSonucu && (
      (yerlestirmeSonucu.salonlar && yerlestirmeSonucu.salonlar.length > 0) ||
      (yerlestirmeSonucu.tumSalonlar && yerlestirmeSonucu.tumSalonlar.length > 0) ||
      (yerlestirmeSonucu.salon && yerlestirmeSonucu.salon.ogrenciler && yerlestirmeSonucu.salon.ogrenciler.length > 0)
    );
  };

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

  // Türkçe karakterleri normalize eden fonksiyon
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');
  };

  // Filtrelenmiş öğrenci listesi
  const filtrelenmisOgrenciler = React.useMemo(() => {
    if (!aramaTerimi.trim()) return ogrenciler;
    
    // Sayı kontrolü (numara araması)
    const isNumber = /^\d+$/.test(aramaTerimi);
    
    // Harf kontrolü (3. harften sonra arama)
    const isText = !isNumber && aramaTerimi.length >= 3;
    
    if (!isNumber && !isText) return ogrenciler;
    
    const normalizedTerim = normalizeText(aramaTerimi);
    
    return ogrenciler.filter(ogrenci => {
      const ad = ogrenci.ad || '';
      const soyad = ogrenci.soyad || '';
      const numara = ogrenci.numara?.toString() || '';
      
      // Normalize edilmiş metinlerle karşılaştır
      const normalizedAd = normalizeText(ad);
      const normalizedSoyad = normalizeText(soyad);
      
      // Hem normalize edilmiş hem de orijinal metinlerle arama yap
      return normalizedAd.includes(normalizedTerim) || 
             normalizedSoyad.includes(normalizedTerim) ||
             ad.toLowerCase().includes(aramaTerimi.toLowerCase()) ||
             soyad.toLowerCase().includes(aramaTerimi.toLowerCase()) ||
             numara.includes(aramaTerimi);
    });
  }, [ogrenciler, aramaTerimi]);
  const [basarili, setBasarili] = useState(null);
  const [dialogAcik, setDialogAcik] = useState(false);
  const [bekleyenOgrenciler, setBekleyenOgrenciler] = useState([]);
  const [silmeDialogAcik, setSilmeDialogAcik] = useState(false);
  const [silinecekOgrenciId, setSilinecekOgrenciId] = useState(null);
  const [silinecekOgrenciAdi, setSilinecekOgrenciAdi] = useState('');
  const [tumunuSilDialogAcik, setTumunuSilDialogAcik] = useState(false);
  const [manualEklemeAcik, setManualEklemeAcik] = useState(false);
  const [manuelOgrenci, setManuelOgrenci] = useState({
    ad: '',
    soyad: '',
    numara: '',
    sinif: '',
    cinsiyet: 'E'
  });

  // Başarı mesajını göster ve otomatik kaybolsun
  const basariliMesajGoster = (mesaj) => {
    setBasarili(mesaj);
    setTimeout(() => {
      setBasarili(null);
    }, 4000); // 4 saniye sonra kaybol
  };

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
    if (yerlesimPlaniVarMi()) {
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
    if (yerlesimPlaniVarMi()) {
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
    setHata(null);
    setBasarili(null);
    setYukleme(false);
    setDialogAcik(false);
    setBekleyenOgrenciler([]);
    
    setTumunuSilDialogAcik(false);
  };

  const handleTumunuSilIptal = () => {
    setTumunuSilDialogAcik(false);
  };

  // Manuel öğrenci ekleme fonksiyonları
  const handleManuelOgrenciChange = (field, value) => {
    setManuelOgrenci(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleManuelOgrenciEkle = () => {
    // Validasyon
    if (!manuelOgrenci.ad.trim() || !manuelOgrenci.soyad.trim() || !manuelOgrenci.numara.trim() || !manuelOgrenci.sinif.trim()) {
      setHata('Lütfen tüm alanları doldurun!');
      return;
    }

    // Öğrenci numarası kontrolü
    const mevcutNumara = ogrenciler.find(o => o.numara === manuelOgrenci.numara);
    if (mevcutNumara) {
      setHata('Bu öğrenci numarası zaten kullanılıyor!');
      return;
    }

    const yeniOgrenci = {
      id: Date.now(),
      ad: manuelOgrenci.ad.trim(),
      soyad: manuelOgrenci.soyad.trim(),
      numara: manuelOgrenci.numara.trim(),
      sinif: manuelOgrenci.sinif,
      cinsiyet: manuelOgrenci.cinsiyet,
      gecmisSkor: Math.floor(Math.random() * 40) + 60,
      ozelDurum: false
    };

    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    ogrencilerEkle([yeniOgrenci]);
    basariliMesajGoster(`✅ ${yeniOgrenci.ad} ${yeniOgrenci.soyad} başarıyla eklendi!`);
    
    // Formu temizle
    setManuelOgrenci({
      ad: '',
      soyad: '',
      numara: '',
      sinif: '',
      cinsiyet: 'E'
    });
    setManualEklemeAcik(false);
  };

  const handleManuelEklemeIptal = () => {
    setManualEklemeAcik(false);
    setManuelOgrenci({
      ad: '',
      soyad: '',
      numara: '',
      sinif: '',
      cinsiyet: 'E'
    });
  };

  // 12. sınıf dialog handler'ları
  const handleOnikinciSinifKabul = () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    ogrencilerEkle(bekleyenOgrenciler);
    setDialogAcik(false);
    setBekleyenOgrenciler([]);
    basariliMesajGoster(`✅ ${bekleyenOgrenciler.length} öğrenci başarıyla yüklendi!`);
  };

  const handleOnikinciSinifRed = () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    const digerOgrenciler = bekleyenOgrenciler.filter(ogrenci => !ogrenci.sinif.startsWith('12-'));
    ogrencilerEkle(digerOgrenciler);
    setDialogAcik(false);
    setBekleyenOgrenciler([]);
    basariliMesajGoster(`✅ ${digerOgrenciler.length} öğrenci başarıyla yüklendi!`);
  };

  // CSV dosyası yükleme kaldırıldı - sadece Excel desteği var

  // Excel dosyası yükleme (e-Okul formatı)
  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setYukleme(true);
    setHata(null);

    // File input değerini temizle (aynı dosyayı tekrar yükleyebilmek için)
    event.target.value = '';

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
          
          setHata(`❌ Excel dosyasında öğrenci verisi bulunamadı!

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
          if (yerlesimPlaniVarMi()) {
            showError('Mevcut bir yerleştirme planı bulunduğu için öğrenci eklenemez. Önce mevcut planı temizleyin.');
            setYukleme(false);
            return;
          }

          ogrencilerEkle(yeniOgrenciler);
          setYukleme(false);
          basariliMesajGoster(`✅ ${yeniOgrenciler.length} öğrenci başarıyla yüklendi!`);
        }
      } catch (error) {
        setHata('Excel dosyası işlenirken hata oluştu: ' + error.message);
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
          <Typography variant="h5" component="h2" gutterBottom>
            Öğrenci Listesi ve Seçimi
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
              Mevcut bir yerleştirme planı bulunduğu için öğrenci listesinde değişiklik yapılamaz. 
              Öğrenci ekleme, silme ve listeyi temizleme işlemleri kısıtlanmıştır.
              <br />
              <strong>Önce mevcut planı temizleyin, sonra öğrenci listesini değiştirin.</strong>
            </Typography>
          </Alert>
        )}

        {/* Hata Mesajı */}
        {hata && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setHata(null)}>
            {hata}
          </Alert>
        )}

        {/* Başarı Mesajı */}
        {basarili && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setBasarili(null)}>
            {basarili}
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
                >
                  Öğrenci Ekle
                </Button>
                
              <Typography variant="body2" color="text.secondary">
              Excel dosyası yükleyebilir veya manuel olarak öğrenci ekleyebilirsiniz.
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
              size="small"
              placeholder={aramaAcik ? "Öğrenci ara (3+ harf veya numara)..." : ""}
              value={aramaTerimi}
              onChange={(e) => setAramaTerimi(e.target.value)}
              onFocus={() => setAramaAcik(true)}
              sx={{ 
                width: aramaAcik ? 280 : 40,
                height: 40,
                transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                '& .MuiOutlinedInput-root': {
                  height: 40,
                  borderRadius: '50px',
                  bgcolor: 'white',
                  transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  '& fieldset': {
                    borderColor: aramaAcik ? 'primary.main' : 'grey.300',
                    transition: 'all 0.3s ease'
                  },
                  '&:hover fieldset': {
                    borderColor: 'primary.main'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                    boxShadow: '0 0 0 4px rgba(25, 118, 210, 0.15)'
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
                      onClick={() => !aramaAcik && setAramaAcik(true)}
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
            >
              Tümünü Sil
            </Button>
          )}
        </Box>

        {/* Öğrenci Tablosu */}
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
              {filtrelenmisOgrenciler.map((ogrenci, index) => {
                return (
                  <TableRow 
                    key={ogrenci.id} 
                    hover
                  >
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
                        onClick={() => handleOgrenciSil(ogrenci.id)}
                        title="Öğrenciyi Sil"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Arama sonucu bulunamadığında */}
        {aramaTerimi && filtrelenmisOgrenciler.length === 0 && ogrenciler.length > 0 && (
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
        pb: 1
      }}>
        Manuel Öğrenci Ekleme
      </DialogTitle>
      <DialogContent sx={{ py: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Ad"
              value={manuelOgrenci.ad}
              onChange={(e) => handleManuelOgrenciChange('ad', e.target.value)}
              required
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Soyad"
              value={manuelOgrenci.soyad}
              onChange={(e) => handleManuelOgrenciChange('soyad', e.target.value)}
              required
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Öğrenci No"
              value={manuelOgrenci.numara}
              onChange={(e) => handleManuelOgrenciChange('numara', e.target.value)}
              required
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Sınıf"
              value={manuelOgrenci.sinif}
              onChange={(e) => handleManuelOgrenciChange('sinif', e.target.value)}
              required
              variant="outlined"
              size="small"
              placeholder="Örn: 9-A, 10-B"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth size="small">
              <InputLabel>Cinsiyet</InputLabel>
              <Select
                value={manuelOgrenci.cinsiyet}
                onChange={(e) => handleManuelOgrenciChange('cinsiyet', e.target.value)}
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
        justifyContent: 'center', 
        gap: 2, 
        pb: 3,
        px: 3
      }}>
        <Button
          onClick={handleManuelEklemeIptal}
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
          onClick={handleManuelOgrenciEkle}
          variant="contained"
          color="primary"
          sx={{
            borderRadius: '8px',
            px: 3,
            py: 1,
            textTransform: 'none',
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)'
          }}
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
