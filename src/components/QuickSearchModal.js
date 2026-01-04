import React from 'react';
import { Dialog, DialogTitle, DialogContent, TextField, List, ListItemButton, ListItemText, Box, Typography, Alert } from '@mui/material';
import ExamContext from '../context/ExamContext';
import { getPlacementMap, resolveStudentPlacement } from '../utils/placementHelper';

const QuickSearchModal = ({ open, onClose }) => {
  // ExamProvider olmadan render edilirse testlerde hata vermemesi için güvenli context erişimi
  const exam = React.useContext(ExamContext) || {};
  const { ogrenciler, placementIndex, yerlestirmeSonucu, yerlestirmeGuncelle, tabDegistir } = exam;
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) {
      setQuery('');
    } else {
      // Modal açıldığında input'a focus et
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100); // Modal animasyonunun tamamlanması için kısa bir gecikme

      return () => clearTimeout(timer);
    }
  }, [open]);

  /* 
   * yerlestirmeSonucu güncellendiğinde placementMap'i bir kez oluştur.
   * Bu işlem render maliyetini düşürür ve merkezi mantığı kullanır.
   */
  const placementMap = React.useMemo(() => {
    // getPlacementMap fonksiyonunu kullanarak haritayı oluştur
    // Ancak bunu import etmemiz lazım, dosyanın başına import ekleyeceğim
    // Şimdilik buradaki mantığı placementHelper'dan gelen fonksiyonlarla değiştirelim.
    // NOT: Bu dosyanın en üstüne import eklemem gerekiyor, replace_file_content ile bunu tek seferde yapamam.
    // Dolayısıyla önce importları ve getPlacementMap kullanımını ekleyen daha geniş bir değişiklik yapmalıyım.
    // Ancak bu tool çağrısı sadece belirli satırları değiştiriyor.
    return getPlacementMap(yerlestirmeSonucu?.tumSalonlar);
  }, [yerlestirmeSonucu]);

  const results = React.useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return [];
    const base = ogrenciler || [];
    return base
      .filter(o => (
        `${o.ad} ${o.soyad}`.toLocaleLowerCase('tr-TR').includes(q) || String(o.numara || '').includes(q)
      ))
      .slice(0, 30)
      .map(o => {
        // GÜNCELLEME: Artık placementHelper'daki güvenli çözücüyü kullanıyoruz
        // placementIndex (varsa) veya placementMap üzerinden çözümleme yap

        let plc = {};

        // 1. placementHelper ile kontrol et (En güvenilir yöntem)
        const info = resolveStudentPlacement(placementMap, o);
        if (info) {
          plc = {
            salonAdi: info.salonAdi,
            salonId: info.salonId,
            masaNo: info.koltukNo
          };
        } else if (placementIndex?.[o.id] && placementIndex[o.id].salonAdi) {
          // 2. placementIndex (varsa yedek)
          plc = placementIndex[o.id];
        }

        return { id: o.id, ad: o.ad, soyad: o.soyad, numara: o.numara, sinif: o.sinif || o.sube, ...plc };
      });
  }, [query, ogrenciler, placementIndex, placementMap]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Öğrenci Ara (Ctrl+K)</DialogTitle>
      <DialogContent>
        {!yerlestirmeSonucu && (
          <Alert severity="info" sx={{ mb: 1 }}>
            Henüz yerleştirme yapılmadı. Öğrencilerin salon/masa bilgisi bu nedenle boş olabilir.
          </Alert>
        )}
        <TextField
          inputRef={inputRef}
          autoFocus
          fullWidth
          placeholder="Ad, Soyad veya Numara"
          value={query}
          onChange={e => setQuery(e.target.value)}
          size="small"
        />
        {query && (
          <List dense>
            {results.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">Sonuç yok</Typography>
              </Box>
            ) : results.map(r => (
              <ListItemButton key={r.id} onClick={() => {
                try {
                  const tumSalonlar = yerlestirmeSonucu?.tumSalonlar || [];
                  const hedefSalon = tumSalonlar.find(s => String(s.id || s.salonId) === String(r.salonId) || (s.salonAdi || s.ad) === r.salonAdi);
                  if (hedefSalon) {
                    yerlestirmeGuncelle({ salon: hedefSalon });
                    tabDegistir('salon-plani');
                  } else {
                    tabDegistir('salon-plani');
                  }
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.debug('QuickSearch navigate error:', e);
                }
                onClose();
              }}>
                <ListItemText
                  primary={`${r.ad} ${r.soyad} ${r.numara ? `• ${r.numara}` : ''}`}
                  secondary={`${r.sinif || '-'} • ${r.salonAdi || 'Salon yok'} • Masa ${r.masaNo != null ? r.masaNo : '-'}`}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuickSearchModal;


