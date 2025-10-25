import React, { useState, memo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Box,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  School as SchoolIcon,
  Book as BookIcon
} from '@mui/icons-material';

const GenelAyarlarFormu = memo(({ ayarlar, onAyarlarDegistir }) => {
  const [formData, setFormData] = useState({
    okulAdi: ayarlar?.okulAdi || 'Akhisar Farabi Mesleki ve Teknik Anadolu Lisesi',
    egitimYili: ayarlar?.egitimYili || '2025-2026',
    donem: ayarlar?.donem || '1',
    sinavDonemi: ayarlar?.sinavDonemi || '1',
    sinavTarihi: ayarlar?.sinavTarihi || '',
    sinavSaati: ayarlar?.sinavSaati || '',
    ...ayarlar
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const yeniFormData = {
      ...formData,
      [name]: value
    };
    
    setFormData(yeniFormData);
    // Anında kaydet
    if (onAyarlarDegistir) {
      onAyarlarDegistir(yeniFormData);
    }
  };

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}>
      <CardContent>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Okul Bilgileri */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <SchoolIcon sx={{ mr: 1 }} />
              Okul Bilgileri
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Box>

          <Box>
            <TextField
              label="Okul Adı"
              name="okulAdi"
              value={formData.okulAdi}
              onChange={handleChange}
              fullWidth
              variant="outlined"
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Eğitim Öğretim Yılı"
              name="egitimYili"
              value={formData.egitimYili}
              onChange={handleChange}
              fullWidth
              variant="outlined"
            />
            <FormControl fullWidth variant="outlined">
              <InputLabel>Dönem</InputLabel>
              <Select
                name="donem"
                value={formData.donem}
                onChange={handleChange}
                label="Dönem"
              >
                <MenuItem value="1">1. Dönem</MenuItem>
                <MenuItem value="2">2. Dönem</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Sınav Bilgileri */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <BookIcon sx={{ mr: 1 }} />
              Sınav Bilgileri
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Sınav Dönemi</InputLabel>
              <Select
                name="sinavDonemi"
                value={formData.sinavDonemi}
                onChange={handleChange}
                label="Sınav Dönemi"
              >
                <MenuItem value="1">1. Ortak Sınav</MenuItem>
                <MenuItem value="2">2. Ortak Sınav</MenuItem>
                <MenuItem value="3">3. Ortak Sınav</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Sınav Tarihi"
              name="sinavTarihi"
              type="date"
              value={formData.sinavTarihi}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Sınav Saati"
              name="sinavSaati"
              type="time"
              value={formData.sinavSaati}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
});

GenelAyarlarFormu.displayName = 'GenelAyarlarFormu';

export default GenelAyarlarFormu;
