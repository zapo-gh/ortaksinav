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

import { calculateDeskNumberForMasa } from '../utils/placementHelper';

/**
 * Salon İmza Listesi Bileşeni
 * Her salon için masa numarasına göre sıralanmış öğrenci listesi
 * Sınıf, ders ve imza bölümleri içerir
 */
const SalonImzaListesiPrintable = forwardRef(({ yerlestirmeSonucu, ayarlar = {}, tumOgrenciler = [] }, ref) => {
  // calculateDeskNumberForMasa artık dışarıdan alınıyor (import edildi)
  // Wrapper fonksiyon: Sadece salon parametresini kolaylaştırmak için
  const getMasaNo = (masa) => calculateDeskNumberForMasa(masa, yerlestirmeSonucu?.tumSalonlar);


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

  // Dal ismi kısaltma fonksiyonu
  const getShortBranchName = (branchName) => {
    if (!branchName) return '-';
    switch (branchName) {
      case 'Ebe Yardımcılığı':
        return 'Ebe Yard.';
      case 'Hemşire Yardımcılığı':
        return 'Hemş. Yard.';
      case 'Sağlık Bakım Teknisyenliği':
        return 'Sağ. Bak. Tek.';
      default:
        // Eğer bilinen bir kısaltma yoksa, ilk 15 karakteri göster
        return branchName.length > 15 ? branchName.substring(0, 15) + '.' : branchName;
    }
  };

  return (
    <Box
      ref={ref}
      sx={{
        p: 2,
        minHeight: '100vh',
        width: '210mm',
        margin: '0 auto',
        '@media print': {
          p: 0,
          m: 0,
          fontSize: '12px'
        }
      }}
    >
      {/* Tüm salonlar için ayrı sayfalar */}
      {
        tumSalonlar.map((salon, salonIndex) => {
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
                height: '10px',
                '@media print': {
                  height: '15px'
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
                maxWidth: '100%',
                margin: '0 auto',
                '@media print': {
                  width: '98%', // 100% yerine %98 yaparak sağ çizgiyi kurtar
                  maxWidth: '98%',
                  margin: '0 auto'
                }
              }}>
                <Table size="small" sx={{
                  border: '1px solid #ddd',
                  '& .MuiTableCell-root': {
                    padding: '1px 4px',
                    fontSize: '0.8rem',
                    lineHeight: 0.6,
                    border: '1px solid #ddd',
                    textAlign: 'center'
                  },
                  '& .MuiTableRow-root': {
                    height: '26px'
                  },
                  '& .MuiTableCell-root:nth-of-type(2)': {
                    textAlign: 'left !important'
                  }
                }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.300' }}>
                      <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '8%', textAlign: 'center' }}><strong>Masa No</strong></TableCell>
                      <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '25%', textAlign: 'center' }}><strong>Ad Soyad</strong></TableCell>
                      <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '7%', textAlign: 'center' }}><strong>Sınıf</strong></TableCell>
                      <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '12%', textAlign: 'center' }}><strong>Dal</strong></TableCell>
                      <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '30%', textAlign: 'center' }}><strong>Ders</strong></TableCell>
                      <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '18%', textAlign: 'center' }}><strong>Öğrenci Durumu</strong></TableCell>
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
                            {(() => {
                              // Dal bilgisi yoksa güncel listeden bulmaya çalış
                              let dalBilgisi = ogrenci.dal;
                              if (!dalBilgisi && tumOgrenciler && tumOgrenciler.length > 0) {
                                const guncelOgrenci = tumOgrenciler.find(o => o.id === ogrenci.id || o.numara === ogrenci.numara);
                                if (guncelOgrenci) {
                                  dalBilgisi = guncelOgrenci.dal;
                                }
                              }
                              return getShortBranchName(dalBilgisi);
                            })()}
                          </TableCell>

                          <TableCell sx={{
                            textAlign: 'center',
                            fontSize: '0.8rem',
                          }}>
                            {dersBilgisi}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <Box sx={{
                              width: '100%',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: 1.5,
                              fontSize: '0.8rem',
                              fontWeight: 'normal',
                              whiteSpace: 'nowrap'
                            }}>
                              <span>[ &nbsp; ] Geldi</span>
                              <span>[ &nbsp; ] Gelmedi</span>
                            </Box>
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

                      {/* Dal Dağılımı */}
                      {(() => {
                        const dalSayilari = {};
                        sortedStudents.forEach(ogrenci => {
                          let dalBilgisi = ogrenci.dal;
                          if (!dalBilgisi && tumOgrenciler && tumOgrenciler.length > 0) {
                            const guncelOgrenci = tumOgrenciler.find(o => o.id === ogrenci.id || o.numara === ogrenci.numara);
                            if (guncelOgrenci) {
                              dalBilgisi = guncelOgrenci.dal;
                            }
                          }
                          const kisaDal = getShortBranchName(dalBilgisi);
                          if (kisaDal && kisaDal !== '-') {
                            dalSayilari[kisaDal] = (dalSayilari[kisaDal] || 0) + 1;
                          }
                        });

                        const dalDagilimi = Object.entries(dalSayilari);
                        if (dalDagilimi.length > 0) {
                          return (
                            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'bold', mt: 1 }}>
                              Dal Dağılımı: {dalDagilimi.map(([dal, sayi]) => `${dal}: ${sayi}`).join(', ')}
                            </Typography>
                          );
                        }
                        return null;
                      })()}
                    </Box>

                    {/* Sağ: Öğretmen Adı Soyadı / İmza - tabloya hizalı */}
                    <Box sx={{ textAlign: 'right', minWidth: { xs: '220px', sm: '260px' } }}>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 'bold', mb: 1, pr: 0.5 }}>
                        Öğretmen
                      </Typography>
                      {/* Alt alta, aynı soldan hizalı satırlar */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, width: { xs: 260, sm: 300 }, justifyContent: 'flex-start' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary', minWidth: 80, textAlign: 'left' }}>Adı Soyadı:</Typography>
                          <Box sx={{ flex: 1, height: 0, borderBottom: '1px solid #999', position: 'relative', top: '0.25em' }} />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, width: { xs: 260, sm: 300 }, justifyContent: 'flex-start' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'text.secondary', minWidth: 80, textAlign: 'left' }}>İmza:</Typography>
                          <Box sx={{ flex: 1, height: 0, borderBottom: '1px solid #999', position: 'relative', top: '0.25em' }} />
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          );
        })
      }

      {
        (() => {
          // Pinned öğrencileri topla
          let pinned = [];
          try {
            const raw = localStorage.getItem('exam_ogrenciler');
            if (raw) pinned = (JSON.parse(raw) || []).filter(o => o && o.pinned);
          } catch (e) { console.debug('Pinned listesi okunamadı:', e); }
          if (!pinned || pinned.length === 0) return null;
          const salonAdiBul = (sid) => {
            if (!sid) return '-';
            const s = tumSalonlar.find(x => String(x.id) === String(sid) || String(x.salonId) === String(sid) || String(x.ad) === String(sid) || String(x.salonAdi) === String(sid));
            return s ? (s.salonAdi || s.ad || String(sid)) : String(sid);
          };
          // Yerleşimden masa no ve salon adı bul
          const findPlacement = (ogr) => {
            for (const salon of tumSalonlar) {
              const masalar = Array.isArray(salon.masalar) ? salon.masalar : [];
              const masa = masalar.find(m => m?.ogrenci && m.ogrenci.id === ogr.id);
              if (masa) {
                return {
                  salonAdi: salon.salonAdi || salon.ad,
                  masaNo: masa.masaNumarasi || getMasaNo(masa)
                };
              }
            }
            return { salonAdi: null, masaNo: null };
          };

          // Sadece yerleşimi olan pinned öğrencileri filtrele
          const placedPinned = pinned.filter(o => {
            const plc = findPlacement(o);
            return plc.salonAdi !== null;
          });

          if (placedPinned.length === 0) return null;

          return (
            <Box sx={{
              pageBreakBefore: 'always',
              '@media print': { pageBreakBefore: 'always', breakBefore: 'page' }
            }}>
              {/* Üst Boşluk - diğer sayfalarla aynı */}
              <Box sx={{
                height: '30px',
                '@media print': {
                  height: '50px'
                }
              }} />
              {/* Başlık: diğer sayfalar ile aynı */}
              <Box sx={{ textAlign: 'center', mb: 2, '@media print': { mt: 0, mb: 1, pt: 0, pb: 0 } }}>
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
                  Sabit Öğrenciler Listesi
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.2, lineHeight: 1.3, fontSize: '0.9rem', color: 'text.secondary' }}>
                  Toplam: {placedPinned.length}
                </Typography>
              </Box>
              <TableContainer component={Paper} sx={{ mb: 1, width: '100%', maxWidth: '700px', margin: '0 auto', '@media print': { width: '98%', maxWidth: '98%' } }}>
                <Table size="small" sx={{
                  border: '1px solid #ddd',
                  '& .MuiTableCell-root': { padding: '2px 6px', fontSize: '0.8rem', border: '1px solid #ddd', textAlign: 'center' },
                  '& .MuiTableCell-root:nth-of-type(2)': { textAlign: 'left !important' }
                }}>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>#</strong></TableCell>
                      <TableCell><strong>Ad Soyad</strong></TableCell>
                      <TableCell><strong>Sınıf</strong></TableCell>
                      <TableCell><strong>Salon</strong></TableCell>
                      <TableCell><strong>Masa</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {placedPinned.map((o, i) => {
                      const plc = findPlacement(o);
                      const masaStr = plc.masaNo != null ? plc.masaNo : (o.pinnedMasaId ? String(o.pinnedMasaId) : '-');
                      const salonStr = plc.salonAdi || salonAdiBul(o.pinnedSalonId);
                      return (
                        <TableRow key={o.id || i}>
                          <TableCell>{i + 1}</TableCell>
                          <TableCell sx={{ textAlign: 'left !important' }}>{o.ad} {o.soyad}</TableCell>
                          <TableCell>{o.sinif || o.sube || '-'}</TableCell>
                          <TableCell>{salonStr}</TableCell>
                          <TableCell>{masaStr}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          );
        })()
      }
    </Box >
  );
});

SalonImzaListesiPrintable.displayName = 'SalonImzaListesiPrintable';

export { SalonImzaListesiPrintable };
