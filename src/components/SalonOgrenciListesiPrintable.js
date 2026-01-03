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

  // Yerleştirme sonucundan öğrenci -> { salon, koltuk } eşlemesini hızlı erişim için hazırla
  const ogrenciIdToSalonKoltuk = new Map();
  if (yerlestirmeSonucu?.tumSalonlar) {
    for (const salon of yerlestirmeSonucu.tumSalonlar) {
      const salonAdi = salon.salonAdi || salon.ad || salon.id;
      // Öncelikli kaynak: masalar (tek gerçek oturma kaynağı)
      if (Array.isArray(salon.masalar)) {
        for (const masa of salon.masalar) {
          if (masa?.ogrenci?.id != null) {
            const koltukNo = masa.masaNumarasi || calculateDeskNumberForMasa(masa);
            ogrenciIdToSalonKoltuk.set(masa.ogrenci.id, { salonAdi, salonId: salon.id, koltukNo });
          }
        }
      }
      // Yedek kaynak: salon.ogrenciler (varsa ve masadan işlenmemişse)
      if (Array.isArray(salon.ogrenciler)) {
        for (const ogr of salon.ogrenciler) {
          if (!ogrenciIdToSalonKoltuk.has(ogr.id)) {
            let koltukNo = 'Belirtilmemiş';
            if (Array.isArray(salon.masalar)) {
              const masa = salon.masalar.find(m => m.ogrenci?.id === ogr.id);
              if (masa) {
                koltukNo = masa.masaNumarasi || calculateDeskNumberForMasa(masa);
              }
            }
            if (koltukNo === 'Belirtilmemiş') {
              if (ogr.masaNumarasi) koltukNo = ogr.masaNumarasi;
              else if (ogr.satir !== undefined && ogr.sutun !== undefined) {
                const satirSayisi = salon.siraDizilimi?.sutun || salon.sutun || 5;
                koltukNo = ogr.satir * satirSayisi + ogr.sutun + 1;
              } else {
                koltukNo = ogr.masaNo || ogr.koltukNo || 'Belirtilmemiş';
              }
            }
            ogrenciIdToSalonKoltuk.set(ogr.id, { salonAdi, salonId: salon.id, koltukNo });
          }
        }
      }
    }
  }

  // Yardımcılar: normalize ve parse (önce tanımla, sonra kullan)
  function normalizeClassName(s) {
    if (!s) return '';
    const raw = String(s).trim().toUpperCase();
    // Ayırıcıları tek tipe çevir ("-", " ", "_" -> "/")
    const unified = raw.replace(/[- _]+/g, '/');
    // "11A" gibi durumları "11/A" yap
    const m = unified.match(/^(\d{1,2})\/?\s*([A-ZÇĞİÖŞÜ]+)?$/i);
    if (!m) return unified;
    const level = m[1];
    const section = (m[2] || '').toUpperCase();
    return section ? `${level}/${section}` : `${level}`;
  }

  // Aktif salonlarda yer alan sınıfları belirle (yalnızca seçili/aktif salonlardan gelen sınıflar)
  const aktifSinifSet = new Set();
  const aktifSinifNormalizedSet = new Set(); // Normalize edilmiş sınıf adları için
  const hasValidPlacement = yerlestirmeSonucu?.tumSalonlar && Array.isArray(yerlestirmeSonucu.tumSalonlar) && yerlestirmeSonucu.tumSalonlar.length > 0;
  
  if (hasValidPlacement) {
    for (const salon of yerlestirmeSonucu.tumSalonlar) {
      // Masalardaki öğrencilere bak
      if (Array.isArray(salon.masalar)) {
        salon.masalar.forEach(m => {
          const o = m?.ogrenci;
          if (o?.sinif) {
            aktifSinifSet.add(o.sinif);
            aktifSinifNormalizedSet.add(normalizeClassName(o.sinif));
          }
        });
      }
      // Ek olarak salon.ogrenciler listesini de tara
      if (Array.isArray(salon.ogrenciler)) {
        salon.ogrenciler.forEach(o => { 
          if (o?.sinif) {
            aktifSinifSet.add(o.sinif);
            aktifSinifNormalizedSet.add(normalizeClassName(o.sinif));
          }
        });
      }
    }
  }

  // Yalnızca aktif salonlarda bulunan sınıflardaki öğrencileri dahil et
  // Eğer yerleştirme yoksa veya aktif sınıf seti boşsa, tüm öğrencileri göster
  const filtreliOgrenciler = Array.isArray(ogrenciler)
    ? ogrenciler.filter(o => {
      if (!o) return false;
      const sinif = o.sinif || 'Belirtilmemiş';
      // Eğer geçerli bir yerleştirme var ve aktif sınıf seti boş değilse sadece o sınıfları göster
      // Ama eğer yerleştirme var ama aktif sınıf seti boşsa (salonlarda öğrenci yok), tüm öğrencileri göster
      if (hasValidPlacement && aktifSinifSet.size > 0) {
        // Önce tam eşleşme kontrolü
        if (aktifSinifSet.has(sinif)) return true;
        // Sonra normalize edilmiş eşleşme kontrolü
        const normalizedSinif = normalizeClassName(sinif);
        return aktifSinifNormalizedSet.has(normalizedSinif);
      }
      // Yerleştirme yoksa veya aktif set boşsa (yerleştirme var ama salonlarda öğrenci yok) tümünü göster
      return true;
    })
    : [];

  // Öğrencileri sınıf seviyesine göre grupla ve salon/koltuk bilgilerini ekle
  const ogrencilerBySinif = filtreliOgrenciler.reduce((acc, ogrenci) => {
    const sinif = ogrenci.sinif || 'Belirtilmemiş';
    if (!acc[sinif]) {
      acc[sinif] = [];
    }

    // Salon ve koltuk bilgilerini bul
    let salonBilgisi = 'Belirtilmemiş';
    let koltukNo = 'Belirtilmemiş';

    let eslesmeSalonId = null;
    if (yerlestirmeSonucu?.tumSalonlar) {
      // 1) Doğrudan ID ile (Map)
      let eslesme = ogrenciIdToSalonKoltuk.get(ogrenci.id);
      // 2) Tür farkı olursa ("42" vs 42) zorla sayısal/str dönüşümü ile dene
      if (!eslesme) {
        const idStr = (ogrenci.id ?? '').toString();
        for (const [key, val] of ogrenciIdToSalonKoltuk.entries()) {
          if (key != null && key.toString() === idStr) { eslesme = val; break; }
        }
      }
      // 3) Hâlâ yoksa tüm salonlarda numara veya ad-soyad ile ara (yavaş ama sağlam)
      if (!eslesme) {
        outer: for (const salon of yerlestirmeSonucu.tumSalonlar) {
          // Önce masalarda eşleştir
          if (Array.isArray(salon.masalar)) {
            for (const masa of salon.masalar) {
              const mOgr = masa?.ogrenci;
              if (!mOgr) continue;
              const idEslesmesi = mOgr.id != null && mOgr.id.toString() === (ogrenci.id ?? '').toString();
              const numaraEslesmesi = mOgr.numara && ogrenci.numara && mOgr.numara.toString() === ogrenci.numara.toString();
              if (idEslesmesi || numaraEslesmesi) {
                eslesme = {
                  salonAdi: salon.salonAdi || salon.ad || salon.id,
                  salonId: salon.id,
                  koltukNo: masa.masaNumarasi || calculateDeskNumberForMasa(masa)
                };
                break outer;
              }
            }
          }
          // Son çare: salon.ogrenciler
          if (!eslesme && Array.isArray(salon.ogrenciler)) {
            const bulunan = salon.ogrenciler.find(o =>
              (o.id != null && o.id.toString() === (ogrenci.id ?? '').toString()) ||
              (o.numara && ogrenci.numara && o.numara.toString() === ogrenci.numara.toString())
            );
            if (bulunan) {
              let kNo = 'Belirtilmemiş';
              if (Array.isArray(salon.masalar)) {
                const masa = salon.masalar.find(m => m.ogrenci && (
                  (m.ogrenci.id != null && m.ogrenci.id.toString() === (bulunan.id ?? '').toString()) ||
                  (m.ogrenci.numara && m.ogrenci.numara.toString() === (bulunan.numara ?? '').toString())
                ));
                if (masa) kNo = masa.masaNumarasi || calculateDeskNumberForMasa(masa);
              }
              eslesme = { salonAdi: salon.salonAdi || salon.ad || salon.id, salonId: salon.id, koltukNo: kNo };
            }
          }
        }
      }

      if (eslesme) {
        salonBilgisi = eslesme.salonAdi;
        koltukNo = eslesme.koltukNo;
        eslesmeSalonId = eslesme.salonId ?? null;
      }
    }

    acc[sinif].push({
      ...ogrenci,
      salonBilgisi,
      koltukNo,
      salonId: eslesmeSalonId
    });
    return acc;
  }, {});


  function parseSinif(s) {
    if (!s || typeof s !== 'string') return { seviye: Number.MAX_SAFE_INTEGER, sube: s || '' };
    const norm = normalizeClassName(s);
    const match = norm.match(/(\d+)/);
    const seviye = match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
    // Şube: sayısal kısım sonrası ilk harf/karakter grubu
    const subeMatch = norm.replace(/\d+/g, '').match(/[A-ZÇĞİÖŞÜ]+/i);
    const sube = subeMatch ? subeMatch[0].trim() : '';
    return { seviye, sube };
  }

  function findFirstSalonIndexForClass(sinifAdi) {
    const hedef = normalizeClassName(sinifAdi);
    const sortedSalonlar = (yerlestirmeSonucu?.tumSalonlar || []).sort((a, b) => {
      const aId = parseInt(a.id || a.salonId || 0);
      const bId = parseInt(b.id || b.salonId || 0);
      return aId - bId;
    });
    for (let i = 0; i < sortedSalonlar.length; i++) {
      const salon = sortedSalonlar[i];
      // Önce masalarda ara
      if (Array.isArray(salon?.masalar) && salon.masalar.some(m => normalizeClassName(m?.ogrenci?.sinif) === hedef)) {
        return i;
      }
      // Sonra ogrenciler listesinde ara
      if (Array.isArray(salon?.ogrenciler) && salon.ogrenciler.some(o => normalizeClassName(o?.sinif) === hedef)) {
        return i;
      }
    }
    return Number.MAX_SAFE_INTEGER;
  }

  // Sınıfları PDF'te salon sırasına göre sırala
  // Salonları ID'ye göre sırala (sayısal olarak)
  const sortedSalonlar = (yerlestirmeSonucu?.tumSalonlar || []).sort((a, b) => {
    const aId = parseInt(a.id || a.salonId || 0);
    const bId = parseInt(b.id || b.salonId || 0);
    return aId - bId;
  });

  const salonIdOrder = new Map(sortedSalonlar.map((s, i) => [s.id, i]));

  const salonSiraliSiniflar = [];
  if (sortedSalonlar.length > 0) {
    for (const salon of sortedSalonlar) {
      const sinifSet = new Set();
      if (Array.isArray(salon.masalar)) {
        salon.masalar.forEach(m => {
          const o = m?.ogrenci;
          if (o?.sinif) sinifSet.add(o.sinif);
        });
      }
      if (Array.isArray(salon.ogrenciler)) {
        salon.ogrenciler.forEach(o => { if (o?.sinif) sinifSet.add(o.sinif); });
      }
      // Normalize ederek ogrencilerBySinif anahtarları ile eşleştir
      const keys = Object.keys(ogrencilerBySinif);
      const findKeyForClassName = (target) => {
        const hedef = normalizeClassName(target);
        for (const k of keys) {
          if (normalizeClassName(k) === hedef) return k;
        }
        return null;
      };
      for (const s of sinifSet) {
        const rep = findKeyForClassName(s) || s;
        if (!salonSiraliSiniflar.includes(rep) && Object.prototype.hasOwnProperty.call(ogrencilerBySinif, rep)) {
          salonSiraliSiniflar.push(rep);
        }
      }
    }
  }

  const sinifEntries = Object.entries(ogrencilerBySinif);

  // Artık salonSiraliSiniflar üzerinden kesin sırayı kuracağız; bu nedenle eski karma sıralayıcıyı kullanmıyoruz

  // Sınıfları seviye/şube sırasına göre sırala (9/A, 9/B, 9/C, 10/A, 10/B...)
  const finalSinifList = Object.keys(ogrencilerBySinif).sort((a, b) => {
    const pa = parseSinif(a);
    const pb = parseSinif(b);
    // Önce seviye (9, 10, 11, 12)
    if (pa.seviye !== pb.seviye) return pa.seviye - pb.seviye;
    // Sonra şube (A, B, C, D...)
    return (pa.sube || '').localeCompare(pb.sube || '', 'tr');
  });

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

  // Öğrenci yoksa uygun mesaj göster (yerleştirme yoksa bile öğrencileri göster)
  if (!Array.isArray(ogrenciler) || ogrenciler.length === 0) {
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
          Öğrenci Bulunamadı
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Liste oluşturmak için öğrenci verisi bulunmamaktadır.
        </Typography>
      </Box>
    );
  }

  // Filtrelenmiş öğrenci yoksa uygun mesaj göster
  if (filtreliOgrenciler.length === 0) {
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
          Öğrenci Bulunamadı
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Liste oluşturmak için öğrenci verisi bulunmamaktadır.
        </Typography>
      </Box>
    );
  }

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



      {/* Sınıf Bazında Liste */}
      <Box sx={{ mb: 2 }}>
        {finalSinifList.map((sinif, index) => {
          const sinifOgrencileri = ogrencilerBySinif[sinif] || [];
          return (
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
                  height: '25px'
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
                  maxWidth: '100%',
                  margin: '0 auto'
                }
              }}>
                <Table size="small" sx={{
                  '& .MuiTableCell-root': {
                    padding: '1px 4px',
                    fontSize: '0.9rem',
                    lineHeight: 0.6
                  },
                  '& .MuiTableRow-root': {
                    height: '27px'
                  }
                }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.300' }}>
                      <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '8%' }}><strong>Sıra</strong></TableCell>
                      <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '15%' }}><strong>Öğrenci No</strong></TableCell>
                      <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '45%' }}><strong>Ad Soyad</strong></TableCell>
                      <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '16%' }}><strong>Salon</strong></TableCell>
                      <TableCell sx={{ backgroundColor: 'grey.300', color: 'black', fontWeight: 'bold', width: '16%' }}><strong>Sıra No</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...sinifOgrencileri]
                      .sort((a, b) => {
                        const numA = parseInt((a?.numara ?? a?.number ?? '').toString().replace(/[^0-9]/g, ''), 10);
                        const numB = parseInt((b?.numara ?? b?.number ?? '').toString().replace(/[^0-9]/g, ''), 10);
                        if (!isNaN(numA) && !isNaN(numB)) {
                          return numA - numB;
                        }
                        if (isNaN(numA) && isNaN(numB)) {
                          return (a?.numara ?? a?.number ?? '').toString().localeCompare((b?.numara ?? b?.number ?? '').toString(), 'tr', { sensitivity: 'base' });
                        }
                        if (isNaN(numA)) return 1;
                        if (isNaN(numB)) return -1;
                        return 0;
                      })
                      .map((ogrenci, index) => (
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
                                fontSize: '0.9rem',
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
                                fontSize: '0.9rem',
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
          );
        })}
      </Box>

      {/* Alt bilgi */}
    </Box>
  );
});

SalonOgrenciListesiPrintable.displayName = 'SalonOgrenciListesiPrintable';

export { SalonOgrenciListesiPrintable };