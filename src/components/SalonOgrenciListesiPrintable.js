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
  Paper,
  Chip
} from '@mui/material';

const SalonOgrenciListesiPrintable = forwardRef(({ ogrenciler, yerlestirmeSonucu, ayarlar = {} }, ref) => {
  // DEBUG: Yerleştirme sonucunu logla
  console.log('🔍 DEBUG: yerlestirmeSonucu:', yerlestirmeSonucu);
  if (yerlestirmeSonucu?.tumSalonlar) {
    console.log('🔍 DEBUG: tumSalonlar sayısı:', yerlestirmeSonucu.tumSalonlar.length);
    yerlestirmeSonucu.tumSalonlar.forEach((salon, index) => {
      console.log(`🔍 DEBUG: Salon ${index + 1} (${salon.salonAdi || salon.ad}):`, {
        hasPlan: !!salon.plan,
        planLength: salon.plan?.length || 0,
        hasMasalar: !!salon.masalar,
        masalarLength: salon.masalar?.length || 0,
        hasOgrenciler: !!salon.ogrenciler,
        ogrencilerLength: salon.ogrenciler?.length || 0
      });
    });
  } else {
    console.log('❌ DEBUG: tumSalonlar yok! yerlestirmeSonucu:', yerlestirmeSonucu);
  }
  
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
  
  // Yerleştirme sonucundan öğrenci-salon eşleşmelerini çıkar
  const ogrenciSalonEslesmeleri = [];
  
  if (yerlestirmeSonucu?.tumSalonlar) {
    yerlestirmeSonucu.tumSalonlar.forEach(salon => {
      if (salon.ogrenciler) {
        salon.ogrenciler.forEach(ogrenci => {
          // Koltuk numarasını masalar'dan bul
          let masaNo = 'Belirtilmemiş';
          if (salon.masalar && Array.isArray(salon.masalar) && salon.masalar.length > 0) {
            const masa = salon.masalar.find(m => m.ogrenci?.id === ogrenci.id);
            if (masa) {
              masaNo = masa.masaNumarasi || calculateDeskNumberForMasa(masa);
            }
          }
          
          if (masaNo === 'Belirtilmemiş') {
            // Öğrencinin yerleştirme bilgilerinden masa numarasını hesapla
            if (ogrenci.masaNumarasi) {
              masaNo = ogrenci.masaNumarasi;
            } else if (ogrenci.satir !== undefined && ogrenci.sutun !== undefined) {
              // Satır-sütun bilgisinden masa numarasını hesapla
              const satirSayisi = salon.siraDizilimi?.sutun || salon.sutun || 5; // Varsayılan sütun sayısı
              masaNo = ogrenci.satir * satirSayisi + ogrenci.sutun + 1;
            } else {
              masaNo = ogrenci.masaNo || ogrenci.koltukNo || 'Belirtilmemiş';
            }
          }
          
          ogrenciSalonEslesmeleri.push({
            ...ogrenci,
            salonAdi: salon.salonAdi || salon.ad || salon.id,
            salonId: salon.id,
            masaNo: masaNo
          });
        });
      }
    });
  }

  // Öğrencileri sınıf seviyesine göre grupla ve salon/koltuk bilgilerini ekle
  const ogrencilerBySinif = ogrenciler.reduce((acc, ogrenci) => {
    const sinif = ogrenci.sinif || 'Belirtilmemiş';
    if (!acc[sinif]) {
      acc[sinif] = [];
    }
    
    // Salon ve koltuk bilgilerini bul
    let salonBilgisi = 'Belirtilmemiş';
    let koltukNo = 'Belirtilmemiş';
    
    // YERLEŞTİRME SONUCU KONTROLÜ
    if (yerlestirmeSonucu?.tumSalonlar) {
      for (const salon of yerlestirmeSonucu.tumSalonlar) {
        // DEBUG: Öğrenci ve salon bilgisi
        console.log(`🔍 Öğrenci: ${ogrenci.ad || ogrenci.adSoyad} (ID: ${ogrenci.id}), Salon: ${salon.salonAdi}`);
        
        // ÖNCE PLAN'DAN KONTROL ET
        if (salon.plan && Array.isArray(salon.plan) && salon.plan.length > 0) {
          const planItem = salon.plan.find(p => p.ogrenci?.id === ogrenci.id);
          console.log(`  📋 Plan kontrolü: ${planItem ? 'BULUNDU' : 'BULUNAMADI'}`);
          if (planItem) {
            salonBilgisi = salon.salonAdi || salon.ad || salon.id;
            koltukNo = planItem.masaNumarasi || calculateDeskNumberForMasa(planItem);
            console.log(`  ✅ Plan'den bulundu: Salon=${salonBilgisi}, Koltuk=${koltukNo}`);
            break;
          }
        }
        
        // SONRA MASALAR'DAN KONTROL ET
        if (salon.masalar && Array.isArray(salon.masalar)) {
          const masa = salon.masalar.find(m => m.ogrenci?.id === ogrenci.id);
          console.log(`  🪑 Masalar kontrolü: ${masa ? 'BULUNDU' : 'BULUNAMADI'}`);
          if (masa) {
            salonBilgisi = salon.salonAdi || salon.ad || salon.id;
            koltukNo = masa.masaNumarasi || calculateDeskNumberForMasa(masa);
            console.log(`  ✅ Masalar'dan bulundu: Salon=${salonBilgisi}, Koltuk=${koltukNo}`);
            break;
          }
        }
        
        // SON OLARAK OGRENCILER'DEN KONTROL ET
        if (salon.ogrenciler && Array.isArray(salon.ogrenciler)) {
          const bulunanOgrenci = salon.ogrenciler.find(o => o.id === ogrenci.id);
          console.log(`  👥 Ogrenciler kontrolü: ${bulunanOgrenci ? 'BULUNDU' : 'BULUNAMADI'}`);
          if (bulunanOgrenci) {
            salonBilgisi = salon.salonAdi || salon.ad || salon.id;
            
            // Öğrencinin yerleştirme bilgilerinden masa numarasını hesapla
            if (bulunanOgrenci.masaNumarasi) {
              koltukNo = bulunanOgrenci.masaNumarasi;
              console.log(`  ✅ masaNumarasi'den bulundu: ${koltukNo}`);
            } else if (bulunanOgrenci.satir !== undefined && bulunanOgrenci.sutun !== undefined) {
              // Satır-sütun bilgisinden masa numarasını hesapla
              const sutunSayisi = salon.siraDizilimi?.sutun || salon.sutun || 5;
              koltukNo = bulunanOgrenci.satir * sutunSayisi + bulunanOgrenci.sutun + 1;
              console.log(`  ✅ satir-sutun'dan hesaplandı: ${koltukNo}`);
            } else {
              koltukNo = bulunanOgrenci.masaNo || bulunanOgrenci.koltukNo || 'Belirtilmemiş';
              console.log(`  ✅ diğer alanlardan bulundu: ${koltukNo}`);
            }
            console.log(`  ✅ Ogrenciler'den bulundu: Salon=${salonBilgisi}, Koltuk=${koltukNo}`);
            break;
          }
        }
      }
    }
    
    console.log(`📊 Final: ${ogrenci.ad || ogrenci.adSoyad} -> Salon: ${salonBilgisi}, Koltuk: ${koltukNo}`);
    
    acc[sinif].push({
      ...ogrenci,
      salonBilgisi,
      koltukNo
    });
    return acc;
  }, {});

  // Salon bazında öğrenci grupları (kullanılmıyor, sınıf bazında listeleme yapıyoruz)
  // const salonGruplari = ogrenciSalonEslesmeleri.reduce((acc, ogrenci) => {
  //   const salonId = ogrenci.salonId;
  //   if (!acc[salonId]) {
  //     acc[salonId] = {
  //       salonAdi: ogrenci.salonAdi,
  //       ogrenciler: []
  //     };
  //   }
  //   acc[salonId].ogrenciler.push(ogrenci);
  //   return acc;
  // }, {});

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
          Öğrenci yerleştirme işlemi yapılmadığı için liste oluşturulamadı.
        </Typography>
      </Box>
    );
  }

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



      {/* Sınıf Bazında Liste */}
      <Box sx={{ mb: 2 }}>
        {Object.entries(ogrencilerBySinif).map(([sinif, sinifOgrencileri], index) => (
          <Box key={sinif} sx={{ 
            mb: 1,
            pt: 2,
            pageBreakBefore: index > 0 ? 'always' : 'auto',
            '@media print': {
              pageBreakBefore: index > 0 ? 'always' : 'auto',
              breakBefore: index > 0 ? 'page' : 'auto',
              pt: 0,
              mt: 0
            }
          }}>
            {/* Üst Boşluk - Her sınıf için */}
            <Box sx={{ 
              height: '20px',
              '@media print': { 
                height: '30px'
              } 
            }} />
            
            {/* Sınıf Başlığı */}
            <Box sx={{ 
              textAlign: 'center', 
              mb: 1,
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
                {(() => {
                  // Bu sınıfın dersini bul
                  if (ayarlar.dersler && ayarlar.dersler.length > 0) {
                    const sinifDersi = ayarlar.dersler.find(ders => 
                      ders.siniflar && ders.siniflar.includes(sinif)
                    );
                    if (sinifDersi) {
                      return `${sinifDersi.ad} ${ayarlar.donem || '1'}. Dönem ${ayarlar.sinavDonemi || '1'}. Ortak Sınavı`;
                    }
                  }
                  // Fallback: İlk ders veya varsayılan
                  const dersAdi = ayarlar.dersler && ayarlar.dersler.length > 0 
                    ? ayarlar.dersler[0].ad || 'Ders Adı'
                    : 'Ders Adı';
                  return `${dersAdi} ${ayarlar.donem || '1'}. Dönem ${ayarlar.sinavDonemi || '1'}. Ortak Sınavı`;
                })()}
              </Typography>
              <Typography variant="body1" component="h3" sx={{ fontWeight: 'bold', color: 'primary.main', lineHeight: 1.3, fontSize: '1.1rem' }}>
                {sinif} Sınıfı Listesi
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.2, lineHeight: 1.3, fontSize: '0.9rem', color: 'text.secondary' }}>
                Sınav Tarihi: {ayarlar.sinavTarihi ? new Date(ayarlar.sinavTarihi).toLocaleDateString('tr-TR') : new Date().toLocaleDateString('tr-TR')} • Sınav Saati: {ayarlar.sinavSaati || '09:00'}
              </Typography>
            </Box>
            
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
                '& .MuiTableCell-root': { 
                  padding: '1px 4px', 
                  fontSize: '0.7rem',
                  lineHeight: 0.6
                },
                '& .MuiTableRow-root': {
                  height: '24px'
                }
              }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.300' }}>
                    <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '10%' }}><strong>Sıra</strong></TableCell>
                    <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '15%' }}><strong>Öğrenci No</strong></TableCell>
                    <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '35%' }}><strong>Ad Soyad</strong></TableCell>
                    <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '20%' }}><strong>Salon</strong></TableCell>
                    <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '20%' }}><strong>Sıra No</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sinifOgrencileri.map((ogrenci, index) => (
                    <TableRow key={ogrenci.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{ogrenci.numara}</TableCell>
                      <TableCell>{ogrenci.ad || ogrenci.adSoyad || 'Bilinmeyen'} {ogrenci.soyad || ''}</TableCell>
                      <TableCell>
                        <Chip 
                          label={ogrenci.salonBilgisi} 
                          size="small"
                          color="default"
                          sx={{ 
                            backgroundColor: 'transparent',
                            color: 'black',
                            border: 'none',
                            boxShadow: 'none',
                            fontSize: '0.7rem',
                            height: '20px'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={ogrenci.koltukNo} 
                          size="small"
                          color="default"
                          sx={{ 
                            backgroundColor: 'transparent',
                            color: 'black',
                            border: 'none',
                            boxShadow: 'none',
                            fontSize: '0.7rem',
                            height: '20px'
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))}
      </Box>

      {/* Alt bilgi */}
    </Box>
  );
});

SalonOgrenciListesiPrintable.displayName = 'SalonOgrenciListesiPrintable';

export { SalonOgrenciListesiPrintable };