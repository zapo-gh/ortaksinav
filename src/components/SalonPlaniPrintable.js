import React, { forwardRef } from 'react';
import {
  Box,
  Typography,
  Paper
} from '@mui/material';

/**
 * Yazdırılabilir Salon Planı Bileşeni
 * PDF export için özel olarak tasarlanmıştır
 * Tüm salonlar için ayrı sayfalarda salon yerleşim planları
 */
export const SalonPlaniPrintable = forwardRef(({ yerlestirmeSonucu, ayarlar = {} }, ref) => {
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

  // Yerleştirme yoksa uygun mesaj göster
  if (!yerlestirmeSonucu || !yerlestirmeSonucu.tumSalonlar || yerlestirmeSonucu.tumSalonlar.length === 0) {
    return (
      <Box
        ref={ref}
        sx={{
          p: 4,
          textAlign: 'center',
          minHeight: '100vh',
          width: '210mm',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Typography variant="h4" sx={{ mb: 2, color: 'text.secondary' }}>
          Herhangi Bir Yerleştirme Yapılmadı
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Öğrenci yerleştirme işlemi yapılmadığı için salon planı oluşturulamadı.
        </Typography>
      </Box>
    );
  }

  const getRiskColor = (kategori) => {
    switch (kategori) {
      case 'yuksek-risk':
        return '#f44336';
      case 'orta-risk':
        return '#ff9800';
      case 'dusuk-risk':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

  const getKitapcikColor = (kitapcik) => {
    switch (kitapcik) {
      case 'A':
        return '#2196f3';
      case 'B':
        return '#ff9800';
      case 'C':
        return '#4caf50';
      case 'D':
        return '#9c27b0';
      default:
        return '#9e9e9e';
    }
  };

  // Sınıf seviyesi çıkarma fonksiyonu
  const getSinifSeviyesi = (sinifAdi) => {
    if (!sinifAdi) return 'Bilinmeyen';

    // Sınıf adından seviyeyi çıkar (9A -> 9, 10B -> 10, 11C -> 11)
    const match = sinifAdi.match(/^(\d+)/);
    if (match) {
      return `${match[1]}. sınıf`;
    }

    return 'Bilinmeyen';
  };

  // Salon özeti hesaplama fonksiyonu
  const getSalonOzeti = (salon) => {
    const ogrenciler = [];

    // Grup bazlı görüntüleme için
    if (salon.gruplar) {
      Object.values(salon.gruplar).forEach(grup => {
        grup.forEach(masa => {
          if (masa.ogrenci) {
            ogrenciler.push(masa.ogrenci);
          }
        });
      });
    } else {
      // Fallback görüntüleme için
      salon.masalar.forEach(masa => {
        if (masa.ogrenci) {
          ogrenciler.push(masa.ogrenci);
        }
      });
    }

    // Sınıf seviyesi dağılımını hesapla
    const sinifDagilimi = {};
    ogrenciler.forEach(ogrenci => {
      const sinifAdi = ogrenci.sinif || ogrenci.sube || 'Bilinmeyen';
      const sinifSeviyesi = getSinifSeviyesi(sinifAdi);
      sinifDagilimi[sinifSeviyesi] = (sinifDagilimi[sinifSeviyesi] || 0) + 1;
    });

    return {
      toplamOgrenci: ogrenciler.length,
      sinifDagilimi
    };
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

  // Salon düzenini oluştur
  const getSalonDuzeni = (salon) => {
    if (!salon || !Array.isArray(salon.ogrenciler)) return null;

    // Eğer salon.masalar varsa, grup bazlı salon yapısını kullan
    if (salon.masalar && salon.masalar.length > 0) {
      // Grupları oluştur
      const gruplar = {};
      salon.masalar.forEach(masa => {
        const grupId = masa.grup || '1';
        if (!gruplar[grupId]) {
          gruplar[grupId] = [];
        }
        gruplar[grupId].push(masa);
      });

      return {
        satirSayisi: salon.siraDizilimi?.satir || Math.ceil(Math.sqrt(salon.kapasite)),
        sutunSayisi: salon.siraDizilimi?.sutun || Math.ceil(salon.kapasite / (salon.siraDizilimi?.satir || Math.ceil(Math.sqrt(salon.kapasite)))),
        masalar: salon.masalar,
        gruplar: gruplar
      };
    }

    // Fallback: Basit matris - Tüm kapasiteyi kullan
    const satirSayisi = salon.siraDizilimi?.satir || Math.ceil(Math.sqrt(salon.kapasite));
    const sutunSayisi = salon.siraDizilimi?.sutun || Math.ceil(salon.kapasite / satirSayisi);

    const masalar = [];
    // Tüm kapasiteyi kullan - sadece öğrenci sayısı değil
    const toplamKoltuk = satirSayisi * sutunSayisi;

    for (let i = 0; i < toplamKoltuk; i++) {
      const satir = Math.floor(i / sutunSayisi);
      const sutun = i % sutunSayisi;
      const ogrenci = salon.ogrenciler[i] || null;

      masalar.push({
        id: i,
        satir: satir,
        sutun: sutun,
        ogrenci: ogrenci
      });
    }

    return { satirSayisi, sutunSayisi, masalar };
  };

  return (
    <Box
      ref={ref}
      sx={{
        p: 3,
        bgcolor: 'white',
        '@media print': {
          p: 1,
          fontSize: '12px'
        }
      }}
    >
      {/* Tüm salonlar için ayrı sayfalar */}
      {tumSalonlar.map((salon, salonIndex) => {
        const salonDuzeni = getSalonDuzeni(salon);

        if (!salonDuzeni) return null;

        return (
          <Box
            key={salon.salonId || salonIndex}
            sx={{
              pageBreakBefore: salonIndex > 0 ? 'always' : 'auto',
              '@media print': {
                pageBreakBefore: salonIndex > 0 ? 'always' : 'auto',
                breakBefore: salonIndex > 0 ? 'page' : 'auto'
              }
            }}
          >
            {/* Salon Başlığı */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="body1" component="h1" sx={{ fontWeight: 'bold', mb: 0.2, lineHeight: 1.3, fontSize: '1.1rem' }}>
                {ayarlar.okulAdi || 'Akhisar Farabi Mesleki ve Teknik Anadolu Lisesi'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.2, lineHeight: 1.3, fontSize: '1.0rem' }}>
                {ayarlar.egitimYili || '2025-2026'} Eğitim Öğretim Yılı
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.2, lineHeight: 1.3, fontSize: '1.0rem' }}>
                {ayarlar.donem || '1. Dönem'}. Dönem {ayarlar.sinavDonemi || '1. Ortak Sınavı'}. Ortak Sınavı
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.2, lineHeight: 1.3, fontSize: '1.0rem', fontWeight: 'bold' }}>
                {salon.salonAdi || salon.ad || `Salon ${salonIndex + 1}`} Salon Yerleşim Planı
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.2, lineHeight: 1.3, fontSize: '0.9rem' }}>
                Sınav Tarihi: {ayarlar.sinavTarihi ? new Date(ayarlar.sinavTarihi).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR')}
                {ayarlar.sinavSaati && ` | Sınav Saati: ${ayarlar.sinavSaati}`}
              </Typography>
            </Box>


            {/* Öğretmen Masası ve Ders Tahtası */}
            <Box sx={{ mb: 3, px: 2 }}>
              {/* Ders Tahtası - Üstte ortaya hizalı */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Paper
                  elevation={2}
                  sx={{
                    width: 280,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'white',
                    color: 'black',
                    borderRadius: 1,
                    border: '2px solid',
                    borderColor: 'grey.400'
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                    DERS TAHTASI
                  </Typography>
                </Paper>
              </Box>

              {/* Öğretmen Masası - Altta sola hizalı */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Paper
                  elevation={3}
                  sx={{
                    width: 160,
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'secondary.50',
                    border: '2px solid',
                    borderColor: 'secondary.main',
                    borderRadius: 1
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.7rem', textAlign: 'center' }}>
                    ÖĞRETMEN<br />MASASI
                  </Typography>
                </Paper>
              </Box>
            </Box>

            {/* Grup Bazlı Masalar */}
            {salonDuzeni.gruplar ? (
              // Grup bazlı görüntüleme - YAN YANA
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 4, flexWrap: 'nowrap', justifyContent: 'center', mb: 3 }}>
                {Object.keys(salonDuzeni.gruplar).map(grupId => (
                  <Box key={grupId} sx={{ minWidth: '200px', flex: '1 1 0', maxWidth: '25%' }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 0.2,
                        rowGap: 0.9,
                        maxWidth: '100%',
                        mx: 'auto'
                      }}
                    >
                      {salonDuzeni.gruplar[grupId].map((masa) => (
                        <Paper
                          key={masa.id}
                          elevation={masa.ogrenci ? 2 : 1}
                          sx={{
                            p: 0.3,
                            width: '100px',
                            height: '50px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: masa.ogrenci ? 'primary.50' : 'grey.100',
                            border: masa.ogrenci ? '2px solid' : '1px solid',
                            borderColor: masa.ogrenci ? 'primary.main' : 'grey.300',
                            fontSize: '0.5rem',
                            position: 'relative',
                            overflow: 'hidden'
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
                              fontSize: '0.6rem'
                            }}
                          >
                            {masa.masaNumarasi || calculateDeskNumberForMasa(masa)}
                          </Typography>

                          {/* Öğrenci Bilgileri */}
                          {masa.ogrenci ? (
                            <Box sx={{ textAlign: 'center', width: '100%', px: 0.5 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  fontWeight: 'bold',
                                  fontSize: '0.5rem',
                                  lineHeight: 1.1,
                                  mb: 0.1,
                                  overflow: 'hidden',
                                  textAlign: 'center',
                                  wordBreak: 'break-word'
                                }}
                              >
                                {masa.ogrenci.ad} {masa.ogrenci.soyad}
                              </Typography>

                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  fontSize: '0.4rem',
                                  color: 'text.secondary',
                                  mb: 0.1,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {masa.ogrenci.sinif} - {masa.ogrenci.numara}
                              </Typography>

                            </Box>
                          ) : (
                            <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
                              <Typography variant="caption" sx={{ fontSize: '0.5rem' }}>
                                Boş
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              // Fallback: Normal grid görüntüleme
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${salonDuzeni.sutunSayisi}, 1fr)`,
                  gap: 0.2,
                  rowGap: 0.4,
                  maxWidth: '100%',
                  mx: 'auto',
                  mb: 3
                }}
              >
                {salonDuzeni.masalar.map((masa) => (
                  <Paper
                    key={masa.id}
                    elevation={masa.ogrenci ? 2 : 1}
                    sx={{
                      p: 0.3,
                      width: '100px',
                      height: '50px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: masa.ogrenci ? '#e3f2fd' : '#f5f5f5',
                      border: masa.ogrenci ? '2px solid' : '1px solid',
                      borderColor: masa.ogrenci ? getKitapcikColor(masa.ogrenci.kitapcik) : '#e0e0e0',
                      position: 'relative',
                      overflow: 'hidden',
                      '@media print': {
                        width: '100px',
                        height: '50px',
                        p: 0.3
                      }
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
                        fontSize: '0.6rem'
                      }}
                    >
                      {masa.masaNumarasi || calculateDeskNumberForMasa(masa)}
                    </Typography>

                    {/* Öğrenci Bilgileri */}
                    {masa.ogrenci ? (
                      <Box sx={{ textAlign: 'center', width: '100%', px: 0.5 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            fontWeight: 'bold',
                            fontSize: '0.5rem',
                            lineHeight: 1.1,
                            mb: 0.1,
                            overflow: 'hidden',
                            textAlign: 'center',
                            wordBreak: 'break-word'
                          }}
                        >
                          {masa.ogrenci.ad} {masa.ogrenci.soyad}
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            fontSize: '0.4rem',
                            color: 'text.secondary',
                            mb: 0.1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {masa.ogrenci.numara}
                        </Typography>


                        {/* Kitapçık Göstergesi */}
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: getKitapcikColor(masa.ogrenci.kitapcik),
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.3rem',
                            fontWeight: 'bold',
                            mx: 'auto'
                          }}
                        >
                          {masa.ogrenci.kitapcik}
                        </Box>

                        {/* Risk Göstergesi */}
                        <Box
                          sx={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            bgcolor: getRiskColor(masa.ogrenci.kategori),
                            mx: 'auto',
                            mt: 0.1
                          }}
                        />
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: 'center', color: 'text.disabled' }}>
                        <Typography variant="caption" sx={{ fontSize: '0.4rem' }}>
                          Boş
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>
            )}

            {/* Salon Özeti */}
            {(() => {
              const ozet = getSalonOzeti(salonDuzeni);
              // Sınıf seviyelerini önceden tanımla ve sırala
              const sinifSeviyeleri = ['9. sınıf', '10. sınıf', '11. sınıf', '12. sınıf'];
              const sinifListesi = sinifSeviyeleri
                .filter(seviye => ozet.sinifDagilimi[seviye])
                .map(seviye => `${seviye}: ${ozet.sinifDagilimi[seviye]}`)
                .join(', ');

              return (
                <Box sx={{
                  mt: 2,
                  p: 1,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.300'
                }}>
                  <Typography variant="body2" sx={{
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: 'text.primary'
                  }}>
                    Toplam Öğrenci: {ozet.toplamOgrenci} | Sınıf Dağılımı: {sinifListesi}
                  </Typography>
                </Box>
              );
            })()}

          </Box>
        );
      })}
    </Box>
  );
});

SalonPlaniPrintable.displayName = 'SalonPlaniPrintable';

export default SalonPlaniPrintable;