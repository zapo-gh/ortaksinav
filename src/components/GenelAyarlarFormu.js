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
import { sanitizeText } from '../utils/sanitizer';
import { useExamStore } from '../store/useExamStore';

const defaultGeneralSettings = {
  okulAdi: 'Akhisar Farabi Mesleki ve Teknik Anadolu Lisesi',
  egitimYili: '2025-2026',
  donem: '1',
  sinavDonemi: '1',
  sinavTarihi: '',
  sinavSaati: ''
};

const normalizeGeneralSettings = (ayarlar) => {
  const normalized = {
    ...defaultGeneralSettings,
    ...(ayarlar || {})
  };
  normalized.okulAdi = sanitizeText(normalized.okulAdi || '');
  normalized.egitimYili = sanitizeText(normalized.egitimYili || '');
  normalized.donem = sanitizeText(normalized.donem || '1');
  normalized.sinavDonemi = sanitizeText(normalized.sinavDonemi || '1');
  normalized.sinavTarihi = sanitizeText(normalized.sinavTarihi || '');
  normalized.sinavSaati = sanitizeText(normalized.sinavSaati || '');
  return normalized;
};

const validateGeneralSettings = (settings) => {
  const validationErrors = {};
  if (!sanitizeText(settings.okulAdi || '')) {
    validationErrors.okulAdi = 'Okul adı zorunludur.';
  }
  if (!sanitizeText(settings.egitimYili || '')) {
    validationErrors.egitimYili = 'Eğitim öğretim yılı zorunludur.';
  }
  if (!sanitizeText(settings.sinavTarihi || '')) {
    validationErrors.sinavTarihi = 'Sınav tarihi seçilmelidir.';
  }
  if (!sanitizeText(settings.sinavSaati || '')) {
    validationErrors.sinavSaati = 'Sınav saati seçilmelidir.';
  }
  return validationErrors;
};

const areGeneralSettingsEqual = (prev, next) => {
  try {
    return JSON.stringify(prev) === JSON.stringify(next);
  } catch (error) {
    console.warn('Genel ayarlar karşılaştırması yapılamadı:', error);
    return false;
  }
};

const GenelAyarlarFormu = memo(({ ayarlar, onAyarlarDegistir, readOnly: readOnlyProp = null }) => {
  const role = useExamStore(s => s.role);
  const isWriteAllowed = role === 'admin';
  const readOnly = readOnlyProp !== null ? readOnlyProp : !isWriteAllowed;
  const [formData, setFormData] = useState(() => normalizeGeneralSettings(ayarlar));
  const [errors, setErrors] = useState(() => validateGeneralSettings(normalizeGeneralSettings(ayarlar)));

  // Ayarlar prop'u değiştiğinde formData'yı güncelle (özellikle plan yükleme sonrası)
  React.useEffect(() => {
    const normalized = normalizeGeneralSettings(ayarlar);
    setFormData(prev => {
      if (areGeneralSettingsEqual(prev, normalized)) {
        return prev;
      }
      return normalized;
    });
    setErrors(validateGeneralSettings(normalized));
  }, [ayarlar]);

  const handleChange = (e) => {
    if (readOnly) {
      return;
    }
    const { name, value } = e.target;
    const sanitizedValue = sanitizeText(value);
    const yeniFormData = {
      ...formData,
      [name]: sanitizedValue
    };

    setFormData(yeniFormData);
    setErrors(validateGeneralSettings(yeniFormData));
    // Anında kaydet
    if (onAyarlarDegistir) {
      onAyarlarDegistir(yeniFormData);
    }
  };

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto', mt: 2 }}>
      <CardContent>
        {readOnly && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Bu alanı sadece görüntüleyebilirsiniz. Değişiklik yapmak için yönetici olarak giriş yapın.
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Okul Bilgileri */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'text.primary', fontWeight: 'bold' }}>
              <SchoolIcon sx={{ mr: 1, color: 'primary.main' }} />
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
              error={Boolean(errors.okulAdi)}
              helperText={errors.okulAdi || ''}
              disabled={readOnly}
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
              error={Boolean(errors.egitimYili)}
              helperText={errors.egitimYili || ''}
              disabled={readOnly}
            />
            <FormControl fullWidth variant="outlined" error={Boolean(errors.donem)} disabled={readOnly}>
              <InputLabel>Dönem</InputLabel>
              <Select
                name="donem"
                value={formData.donem}
                onChange={handleChange}
                label="Dönem"
                disabled={readOnly}
              >
                <MenuItem value="1">1. Dönem</MenuItem>
                <MenuItem value="2">2. Dönem</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Sınav Bilgileri */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', color: 'text.primary', fontWeight: 'bold' }}>
              <BookIcon sx={{ mr: 1, color: 'primary.main' }} />
              Sınav Bilgileri
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth variant="outlined" error={Boolean(errors.sinavDonemi)} disabled={readOnly}>
              <InputLabel>Sınav Dönemi</InputLabel>
              <Select
                name="sinavDonemi"
                value={formData.sinavDonemi}
                onChange={handleChange}
                label="Sınav Dönemi"
                disabled={readOnly}
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
              error={Boolean(errors.sinavTarihi)}
              helperText={errors.sinavTarihi || ''}
              disabled={readOnly}
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
              error={Boolean(errors.sinavSaati)}
              helperText={errors.sinavSaati || ''}
              disabled={readOnly}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
});

GenelAyarlarFormu.displayName = 'GenelAyarlarFormu';

export default GenelAyarlarFormu;
