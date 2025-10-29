import React, { forwardRef } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';

/**
 * Salon İmza Listesi Bileşeni
 * Her salon için masa numarasına göre sıralanmış öğrenci listesi
 * Sınıf, ders ve imza bölümleri içerir
 */
const SalonImzaListesiPrintable = forwardRef(({ yerlestirmeSonucu, ayarlar = {} }, ref) => {
  // Masa numarası hesaplama fonksiyonu
  const calculateDeskNumberForMasa = (masa) => {
    if (!masa || !yerlestirmeSonucu?.tumSalonlar) return masa?.id + 1 || 1;
    
    // Tüm salonları kontrol et
    for (const salon of yerlestirmeSonucu.tumSalonlar) {
      if (salon.masalar && Array.isArray(salon.masalar)) {
        const allMasalar = salon.masalar;
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
      }
    }
    
    return masa.id + 1; // Fallback
  };
  
  // Tüm salonları al - salon sırasına göre sırala
  const tumSalonlar = (yerlestirmeSonucu?.tumSalonlar || []).sort((a, b) => {
    // Salon ID'lerine göre sırala (sayısal olarak)
    const aId = parseInt(a.id || a.salonId || 0);
    const bId = parseInt(b.id || b.salonId || 0);
    return aId - bId;
  });
  
  if (!tumSalonlar || tumSalonlar.length === 0) {
    return (
      <Box ref={ref} sx={{ p: 2 }}>
        <Typography variant="h6" color="text.secondary">
          Henüz yerleştirme yapılmadı
        </Typography>
      </Box>
    );
  }

  // Salon öğrencilerini masa numarasına göre sırala
  const getSortedStudents = (salon) => {
    if (!salon.ogrenciler || salon.ogrenciler.length === 0) return [];
    
    return salon.ogrenciler.map(ogrenci => {
      // Öğrencinin masa numarasını bul
      let masaNo = 'Belirtilmemiş';
      if (salon.masalar && Array.isArray(salon.masalar) && salon.masalar.length > 0) {
        const masa = salon.masalar.find(m => m.ogrenci?.id === ogrenci.id);
        if (masa) {
          masaNo = masa.masaNumarasi || calculateDeskNumberForMasa(masa);
        }
      }
      
      if (masaNo === 'Belirtilmemiş') {
        if (ogrenci.masaNumarasi) {
          masaNo = ogrenci.masaNumarasi;
        } else if (ogrenci.satir !== undefined && ogrenci.sutun !== undefined) {
          const satirSayisi = salon.siraDizilimi?.sutun || salon.sutun || 5;
          masaNo = ogrenci.satir * satirSayisi + ogrenci.sutun + 1;
        } else {
          masaNo = ogrenci.masaNo || ogrenci.koltukNo || 'Belirtilmemiş';
        }
      }
      
      return {
        ...ogrenci,
        masaNo: parseInt(masaNo) || 999 // Sayısal olmayan değerler için büyük sayı
      };
    }).sort((a, b) => a.masaNo - b.masaNo);
  };

  return (
    <Box 
      ref={ref} 
      style={{
        '@media print': {
          '@page': {
            size: 'A4 portrait !important',
            margin: '0 !important',
            padding: '0 !important'
          },
          'body': {
            margin: '0 !important',
            padding: '0 !important'
          }
        }
      }}
      sx={{ 
        p: 2, 
        minHeight: '100vh', 
        width: '210mm', 
        margin: '0 auto',
        '@media print': {
          p: 0,
          pt: 0,
          pb: 0,
          pl: 0,
          pr: 0,
          m: 0,
          mt: 0,
          mb: 0,
          ml: 0,
          mr: 0,
          fontSize: '12px',
          '@page': {
            size: 'A4 portrait !important',
            margin: '0 !important',
            padding: '0 !important'
          }
        }
      }}
    >
      {/* Tüm salonlar için ayrı sayfalar */}
      {tumSalonlar.map((salon, salonIndex) => {
        const sortedStudents = getSortedStudents(salon);
        
        return (
          <Box 
            key={salon.salonId || salonIndex}
            sx={{
              pageBreakBefore: salonIndex > 0 ? 'always' : 'auto',
              '@media print': {
                pageBreakBefore: salonIndex > 0 ? 'always' : 'auto',
                breakBefore: salonIndex > 0 ? 'page' : 'auto',
                pt: 0,
                mt: 0
              }
            }}
          >
            {/* Üst Boşluk */}
            <Box sx={{ 
              height: '30px',
              '@media print': { 
                height: '50px'
              } 
            }} />
            
            {/* Salon Başlığı */}
            <Box sx={{ 
              textAlign: 'center', 
              mb: 2,
              '@media print': {
                mt: 0,
                mb: 1,
                pt: 0,
                pb: 0
              }
            }}>
              <Typography variant="body1" component="h2" sx={{ fontWeight: 'bold', mb: 0.2, lineHeight: 1.3, fontSize: '1.1rem' }}>
                {ayarlar.okulAdi || 'Akhisar Farabi Mesleki ve Teknik Anadolu Lisesi'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.2, lineHeight: 1.3, fontSize: '1.0rem' }}>
                {ayarlar.egitimYili || '2025-2026'} Eğitim Öğretim Yılı
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.2, lineHeight: 1.3, fontSize: '1.0rem' }}>
                {ayarlar.donem || '1'}. Dönem {ayarlar.sinavDonemi || '1'}. Ortak Sınavı
              </Typography>
              <Typography variant="body1" component="h3" sx={{ fontWeight: 'bold', color: 'primary.main', lineHeight: 1.3, fontSize: '1.1rem' }}>
                {salon.salonAdi || salon.ad || `Salon ${salonIndex + 1}`} - İmza Listesi
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.2, lineHeight: 1.3, fontSize: '0.9rem', color: 'text.secondary' }}>
                Sınav Tarihi: {ayarlar.sinavTarihi ? new Date(ayarlar.sinavTarihi).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR')} • Sınav Saati: {ayarlar.sinavSaati || '09:00'}
              </Typography>
            </Box>
            
            {/* Salon İmza Listesi Tablosu */}
            <TableContainer component={Paper} sx={{ 
              mb: 1,
              width: '100%',
              maxWidth: '600px',
              margin: '0 auto',
              '@media print': {
                width: '80%',
                maxWidth: '600px',
                margin: '0 auto'
              }
            }}>
              <Table size="small" sx={{ 
                border: '1px solid #ddd',
                '& .MuiTableCell-root': { 
                  padding: '1px 4px', 
                  fontSize: '0.7rem',
                  lineHeight: 0.6,
                  border: '1px solid #ddd',
                  textAlign: 'center'
                },
                '& .MuiTableRow-root': {
                  height: '24px'
                },
                '& .MuiTableCell-root:nth-of-type(2)': {
                  textAlign: 'left !important'
                }
              }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.300' }}>
                    <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '12%', textAlign: 'center' }}><strong>Masa No</strong></TableCell>
                    <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '30%', textAlign: 'center' }}><strong>Ad Soyad</strong></TableCell>
                    <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '12%', textAlign: 'center' }}><strong>Sınıf</strong></TableCell>
                    <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '30%', textAlign: 'center' }}><strong>Ders</strong></TableCell>
                    <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '16%', textAlign: 'center' }}><strong>İmza</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedStudents.map((ogrenci, index) => {
                    // Öğrencinin sınava gireceği dersi bul
                    let dersBilgisi = '';
                    if (ogrenci.dersler && ogrenci.dersler.length > 0) {
                      dersBilgisi = ogrenci.dersler.join(', ');
                    } else if (ogrenci.sinavDersleri && ogrenci.sinavDersleri.length > 0) {
                      dersBilgisi = ogrenci.sinavDersleri.join(', ');
                    } else if (ogrenci.ders && ogrenci.ders.length > 0) {
                      dersBilgisi = ogrenci.ders.join(', ');
                    } else {
                      const ogrenciSinifi = ogrenci.sinif || ogrenci.sube;
                      if (ogrenciSinifi && ayarlar.dersler && ayarlar.dersler.length > 0) {
                        const ogrenciDersleri = [];
                        ayarlar.dersler.forEach(ders => {
                          if (ders.siniflar && ders.siniflar.includes(ogrenciSinifi)) {
                            ogrenciDersleri.push(ders.ad);
                          }
                        });
                        if (ogrenciDersleri.length > 0) {
                          dersBilgisi = ogrenciDersleri.join(', ');
                        } else {
                          dersBilgisi = 'Ders Yok';
                        }
                      } else {
                        dersBilgisi = 'Ders Yok';
                      }
                    }
                    
                    return (
                      <TableRow key={ogrenci.id || index}>
                        <TableCell sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                          {ogrenci.masaNo === 999 ? 'Belirtilmemiş' : ogrenci.masaNo}
                        </TableCell>
                        <TableCell sx={{ 
                          fontWeight: 'bold', 
                          textAlign: 'left !important',
                          '@media print': {
                            textAlign: 'left !important'
                          }
                        }}>
                          {ogrenci.ad} {ogrenci.soyad}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          {ogrenci.sinif || ogrenci.sube || 'Belirtilmemiş'}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          {dersBilgisi}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Box sx={{ 
                            width: '100%', 
                            height: '20px', 
                            backgroundColor: 'white'
                          }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Salon Özeti ve Öğretmen İmza Bloğu */}
            <Box sx={{ mt: 2 }}>
              <Box sx={{
                width: '100%',
                maxWidth: '600px',
                mx: 'auto',
                '@media print': { width: '80%', maxWidth: '600px', mx: 'auto' }
              }}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 2
              }}>
              {/* Sol: Özet - tablo ile aynı genişlikte sola hizalı */}
              <Box sx={{ textAlign: 'left', flex: 1 }}>
                <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'bold', mb: 1 }}>
                  Toplam Öğrenci: {sortedStudents.length}
                </Typography>
                {(() => {
                  // Sınıf seviyesi dağılımını hesapla
                  const sinifSeviyeleri = {};
                  sortedStudents.forEach(ogrenci => {
                    const sinifBilgisi = ogrenci.sinif || ogrenci.sube;
                    if (sinifBilgisi) {
                      const seviye = sinifBilgisi.match(/\d+/)?.[0];
                      if (seviye && ['9', '10', '11', '12'].includes(seviye)) {
                        sinifSeviyeleri[seviye] = (sinifSeviyeleri[seviye] || 0) + 1;
                      }
                    }
                  });
                  const sinifDagilimi = Object.entries(sinifSeviyeleri)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b));
                  return sinifDagilimi.map(([seviye, sayi]) => (
                    <Typography key={seviye} variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {seviye}. sınıf: {sayi} öğrenci
                    </Typography>
                  ));
                })()}
              </Box>

              {/* Sağ: Öğretmen Adı Soyadı / İmza - tabloya hizalı */}
              <Box sx={{ textAlign: 'right', minWidth: { xs: '220px', sm: '260px' } }}>
                <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 'bold', mb: 1, pr: 0.5 }}>
                  Öğretmen
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Adı Soyadı:</Typography>
                    <Box sx={{ width: { xs: 180, sm: 200 }, height: 0, borderBottom: '1px solid #999' }} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>İmza:</Typography>
                    <Box sx={{ width: { xs: 120, sm: 140 }, height: 0, borderBottom: '1px solid #999' }} />
                  </Box>
                </Box>
              </Box>
              </Box>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
});

SalonImzaListesiPrintable.displayName = 'SalonImzaListesiPrintable';

export { SalonImzaListesiPrintable };
