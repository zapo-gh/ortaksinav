import React, { useState, memo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Divider,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  AlertTitle
} from '@mui/material';
import { useNotifications } from './NotificationSystem';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Book as BookIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const AyarlarFormu = memo(({ ayarlar, onAyarlarDegistir, ogrenciler, yerlestirmeSonucu = null }) => {
  const { showError } = useNotifications();
  const [formData, setFormData] = useState({
    sinavAdi: ayarlar?.sinavAdi || '',
    sinavTarihi: ayarlar?.sinavTarihi || '',
    sinavSaati: ayarlar?.sinavSaati || '',
    dersler: ayarlar?.dersler || [],
    ...ayarlar
  });

  const [kaydedildi, setKaydedildi] = useState(false);
  void kaydedildi; // Kullanılmayan state
  const [seciliSiniflar, setSeciliSiniflar] = useState({});

  // Yerleştirme planı kontrolü
  const yerlesimPlaniVarMi = () => {
    return yerlestirmeSonucu && (
      (yerlestirmeSonucu.salonlar && yerlestirmeSonucu.salonlar.length > 0) ||
      (yerlestirmeSonucu.tumSalonlar && yerlestirmeSonucu.tumSalonlar.length > 0) ||
      (yerlestirmeSonucu.salon && yerlestirmeSonucu.salon.ogrenciler && yerlestirmeSonucu.salon.ogrenciler.length > 0)
    );
  };

  // Mevcut öğrencilerden sınıf listesini çıkar - Sınıf seviyesine göre sırala (9, 10, 11...)
  const mevcutSiniflar = [...new Set(ogrenciler?.map(ogrenci => ogrenci.sinif).filter(Boolean))].sort((a, b) => {
    // Sınıf seviyesini çıkar (9, 10, 11, 12...)
    const seviyeA = parseInt(a) || 0;
    const seviyeB = parseInt(b) || 0;
    
    // Önce seviyeye göre sırala
    if (seviyeA !== seviyeB) {
      return seviyeA - seviyeB;
    }
    
    // Aynı seviyedeyse alfabetik sırala
    return a.localeCompare(b);
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    const yeniFormData = {
      ...formData,
      [name]: newValue
    };
    
    setFormData(yeniFormData);
    void handleChange; // Kullanılmayan fonksiyon
    // Anında kaydet
    if (onAyarlarDegistir) {
      onAyarlarDegistir(yeniFormData);
    }
  };

  const handleDersEkle = () => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showError('Mevcut bir yerleştirme planı bulunduğu için ders eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    if (formData.dersler.length >= 4) return;
    
    const yeniDers = {
      id: Date.now(),
      ad: '',
      siniflar: []
    };
    
    const yeniFormData = {
      ...formData,
      dersler: [...formData.dersler, yeniDers]
    };
    
    setFormData(yeniFormData);
    // Anında kaydet
    if (onAyarlarDegistir) {
      onAyarlarDegistir(yeniFormData);
    }
  };

  const handleDersSil = (dersId) => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showError('Mevcut bir yerleştirme planı bulunduğu için ders silinemez. Önce mevcut planı temizleyin.');
      return;
    }

    const yeniFormData = {
      ...formData,
      dersler: formData.dersler.filter(ders => ders.id !== dersId)
    };
    
    setFormData(yeniFormData);
    // Anında kaydet
    if (onAyarlarDegistir) {
      onAyarlarDegistir(yeniFormData);
    }
  };

  const handleDersAdiDegistir = (dersId, yeniAd) => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showError('Mevcut bir yerleştirme planı bulunduğu için ders adı değiştirilemez. Önce mevcut planı temizleyin.');
      return;
    }

    const yeniFormData = {
      ...formData,
      dersler: formData.dersler.map(ders => 
        ders.id === dersId ? { ...ders, ad: yeniAd } : ders
      )
    };
    
    setFormData(yeniFormData);
    // Anında kaydet
    if (onAyarlarDegistir) {
      onAyarlarDegistir(yeniFormData);
    }
  };

  const handleSinifEkle = (dersId, sinif) => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showError('Mevcut bir yerleştirme planı bulunduğu için sınıf eklenemez. Önce mevcut planı temizleyin.');
      return;
    }
    void handleSinifEkle; // Kullanılmayan fonksiyon

    const yeniFormData = {
      ...formData,
      dersler: formData.dersler.map(ders => 
        ders.id === dersId 
          ? { ...ders, siniflar: [...ders.siniflar, sinif] }
          : ders
      )
    };
    
    setFormData(yeniFormData);
    // Anında kaydet
    if (onAyarlarDegistir) {
      onAyarlarDegistir(yeniFormData);
    }
  };

  const handleSinifSecimi = (dersId, siniflar) => {
    setSeciliSiniflar(prev => ({
      ...prev,
      [dersId]: siniflar
    }));
  };

  const handleSinifEkleButon = (dersId) => {
    const secilenSiniflar = seciliSiniflar[dersId] || [];
    if (secilenSiniflar.length === 0) {
      showError('Lütfen önce en az bir sınıf seçin!');
      return;
    }
    
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showError('Mevcut bir yerleştirme planı bulunduğu için sınıf eklenemez. Önce mevcut planı temizleyin.');
      return;
    }

    // Seçilen tüm sınıfları tek seferde ekle
    const yeniFormData = {
      ...formData,
      dersler: formData.dersler.map(ders => 
        ders.id === dersId 
          ? { ...ders, siniflar: [...ders.siniflar, ...secilenSiniflar] }
          : ders
      )
    };
    
    setFormData(yeniFormData);
    // Anında kaydet
    if (onAyarlarDegistir) {
      onAyarlarDegistir(yeniFormData);
    }
    
    // Seçimi temizle
    setSeciliSiniflar(prev => ({
      ...prev,
      [dersId]: []
    }));
  };

  const handleSinifSil = (dersId, sinif) => {
    // Yerleştirme planı kontrolü
    if (yerlesimPlaniVarMi()) {
      showError('Mevcut bir yerleştirme planı bulunduğu için sınıf silinemez. Önce mevcut planı temizleyin.');
      return;
    }

    const yeniFormData = {
      ...formData,
      dersler: formData.dersler.map(ders => 
        ders.id === dersId 
          ? { ...ders, siniflar: ders.siniflar.filter(s => s !== sinif) }
          : ders
      )
    };
    
    setFormData(yeniFormData);
    // Anında kaydet
    if (onAyarlarDegistir) {
      onAyarlarDegistir(yeniFormData);
    }
    
    // Silinen sınıfı seçili sınıflardan da çıkar
    setSeciliSiniflar(prev => ({
      ...prev,
      [dersId]: (prev[dersId] || []).filter(s => s !== sinif)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onAyarlarDegistir) {
      onAyarlarDegistir(formData);
      setKaydedildi(true);
      setTimeout(() => setKaydedildi(false), 3000);
    }
  };

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}>
      <CardContent>
        {/* Yerleştirme Planı Uyarısı */}
        {yerlesimPlaniVarMi() && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            icon={<WarningIcon />}
          >
            <AlertTitle>Yerleştirme Planı Mevcut</AlertTitle>
            <Typography variant="body2">
              Mevcut bir yerleştirme planı bulunduğu için ders bilgilerinde değişiklik yapılamaz. 
              Ders ekleme, silme, ad değiştirme ve sınıf ekleme/çıkarma işlemleri kısıtlanmıştır.
              <br />
              <strong>Önce mevcut planı temizleyin, sonra ders bilgilerini değiştirin.</strong>
            </Typography>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>

            {/* Ders Bilgileri */}
            <Grid xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BookIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ color: 'primary.main' }}>
                    Ders Bilgileri
                  </Typography>
                </Box>
              </Box>
              
              {formData.dersler.map((ders, index) => (
                <Card key={ders.id} sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                        Ders {index + 1}
                      </Typography>
                      <IconButton 
                        onClick={() => handleDersSil(ders.id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Ders Adı"
                          value={ders.ad}
                          onChange={(e) => handleDersAdiDegistir(ders.id, e.target.value)}
                          variant="outlined"
                          placeholder="Örn: Matematik, Türkçe, Fizik"
                        />
                      </Grid>

                      <Grid xs={12} md={6}>
                        <FormControl fullWidth>
                          <InputLabel>Sınıf Seç (Çoklu)</InputLabel>
                          <Select
                            multiple
                            value={seciliSiniflar[ders.id] || []}
                            onChange={(e) => handleSinifSecimi(ders.id, e.target.value)}
                            label="Sınıf Seç (Çoklu)"
                            renderValue={(selected) => {
                              if (selected.length === 0) {
                                return <span style={{ color: '#999' }}>Sınıf seçin...</span>;
                              }
                              return (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: '40px', overflow: 'hidden' }}>
                                  {selected.map((value) => (
                                    <Chip 
                                      key={value} 
                                      label={value} 
                                      size="small" 
                                      color="primary"
                                      variant="outlined"
                                      sx={{ fontSize: '0.75rem' }}
                                    />
                                  ))}
                                </Box>
                              );
                            }}
                            sx={{
                              minWidth: 200,
                              '& .MuiSelect-select': {
                                minWidth: '180px'
                              }
                            }}
                          >
                            {mevcutSiniflar
                              .filter(sinif => {
                                // Bu derse zaten eklenmiş sınıfları filtrele
                                if (ders.siniflar.includes(sinif)) return false;
                                
                                // Diğer derslere eklenmiş sınıfları filtrele
                                const digerDerslerdeKullanilanSiniflar = formData.dersler
                                  .filter(d => d.id !== ders.id)
                                  .flatMap(d => d.siniflar);
                                
                                return !digerDerslerdeKullanilanSiniflar.includes(sinif);
                              })
                              .map(sinif => (
                                <MenuItem 
                                  key={sinif} 
                                  value={sinif}
                                  sx={{
                                    fontWeight: (seciliSiniflar[ders.id] || []).includes(sinif) ? 'bold' : 'normal',
                                    backgroundColor: (seciliSiniflar[ders.id] || []).includes(sinif) 
                                      ? 'rgba(25, 118, 210, 0.15)' 
                                      : 'transparent',
                                    '&.Mui-selected': {
                                      backgroundColor: 'rgba(25, 118, 210, 0.25)',
                                      fontWeight: 'bold',
                                      '&:hover': {
                                        backgroundColor: 'rgba(25, 118, 210, 0.35)',
                                      }
                                    },
                                    '&:hover': {
                                      backgroundColor: (seciliSiniflar[ders.id] || []).includes(sinif)
                                        ? 'rgba(25, 118, 210, 0.25)'
                                        : 'rgba(0, 0, 0, 0.04)',
                                    }
                                  }}
                                >
                                  {sinif}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid xs={12} md={6}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleSinifEkleButon(ders.id)}
                          disabled={mevcutSiniflar.filter(sinif => {
                            // Bu derse zaten eklenmiş sınıfları filtrele
                            if (ders.siniflar.includes(sinif)) return false;
                            
                            // Diğer derslere eklenmiş sınıfları filtrele
                            const digerDerslerdeKullanilanSiniflar = formData.dersler
                              .filter(d => d.id !== ders.id)
                              .flatMap(d => d.siniflar);
                            
                            return !digerDerslerdeKullanilanSiniflar.includes(sinif);
                          }).length === 0}
                          sx={{ 
                            minWidth: '120px',
                            height: '56px',
                            px: 2
                          }}
                        >
                          Ekle
                        </Button>
                      </Grid>

                      {ders.siniflar.length > 0 && (
                        <Grid xs={12}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Bu dersi alan sınıflar:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {ders.siniflar.map(sinif => (
                              <Chip
                                key={sinif}
                                label={sinif}
                                onDelete={() => handleSinifSil(ders.id, sinif)}
                                color="primary"
                                variant="outlined"
                                size="small"
                              />
                            ))}
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              ))}

              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleDersEkle}
                disabled={formData.dersler.length >= 4 || yerlesimPlaniVarMi()}
                sx={{ mt: 1 }}
              >
                Ders Ekle {formData.dersler.length >= 4 && '(Maksimum 4 ders)'}
              </Button>
            </Grid>

          </Grid>
        </form>
      </CardContent>
    </Card>
  );
});

AyarlarFormu.displayName = 'AyarlarFormu';

export default AyarlarFormu;
