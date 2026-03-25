import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  Alert,
  CircularProgress,
  Divider,
  Paper
} from '@mui/material';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  SwapHoriz as SwapIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowIcon
} from '@mui/icons-material';
import { useNotifications } from './NotificationSystem';

const InterSalonTransfer = ({ 
  open, 
  onClose, 
  student, 
  currentSalon, 
  allSalons, 
  onTransfer,
  onCancel 
}) => {
  const { showSuccess, showError, showWarning } = useNotifications();
  const [selectedTargetSalon, setSelectedTargetSalon] = useState(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferMode] = useState('move'); // Sadece 'move' modu


  // Cinsiyet bazlı renk fonksiyonu
  const getGenderColor = (ogrenci) => {
    if (!ogrenci || !ogrenci.cinsiyet) return 'primary';
    
    const cinsiyet = ogrenci.cinsiyet.toString().toLowerCase().trim();
    return cinsiyet === 'kız' || cinsiyet === 'kadin' || cinsiyet === 'k' ? 'secondary' : 'primary';
  };

  // Hedef salonları filtrele (mevcut salon hariç)
  const availableSalons = useMemo(() => {
    const filtered = allSalons.filter(salon => 
      salon.id !== currentSalon?.id && 
      (salon.durum === 'aktif' || salon.durum === undefined) // Allow undefined durum
    );
    
    
    return filtered;
  }, [allSalons, currentSalon]);

  // Salon kapasitesi kontrolü
  const getSalonCapacity = useCallback((salon) => {
    // Salon kapasitesini daha esnek hesapla - masalar.length'i öncelikle kullan
    let totalCapacity = 0;
    
    // Önce masalar array'ini kontrol et (en güvenilir)
    if (salon.masalar && Array.isArray(salon.masalar) && salon.masalar.length > 0) {
      totalCapacity = salon.masalar.length;
    }
    // Sonra kapasite property'sini kontrol et
    else if (salon.kapasite && typeof salon.kapasite === 'number' && salon.kapasite > 0) {
      totalCapacity = salon.kapasite;
    }
    // Son olarak siraDizilimi'nden hesapla
    else if (salon.siraDizilimi) {
      totalCapacity = (salon.siraDizilimi.satir || 0) * (salon.siraDizilimi.sutun || 0);
    }
    
    // Mevcut öğrenci sayısını hesapla - masalardaki öğrencileri say
    let currentStudents = 0;
    if (salon.masalar && Array.isArray(salon.masalar)) {
      currentStudents = salon.masalar.filter(masa => masa.ogrenci).length;
    } else if (salon.ogrenciler && Array.isArray(salon.ogrenciler)) {
      currentStudents = salon.ogrenciler.length;
    }
    
    return {
      total: totalCapacity,
      used: currentStudents,
      available: totalCapacity - currentStudents
    };
  }, []);

  // Transfer validasyonu
  const validateTransfer = useCallback((targetSalon) => {
    if (!targetSalon) {
      showError('Lütfen hedef salon seçin!');
      return false;
    }

    const capacity = getSalonCapacity(targetSalon);
    if (capacity.available <= 0) {
      showError(`${targetSalon.salonAdi} salonu dolu!`);
      return false;
    }

    // Aynı sınıf seviyesi kontrolü
    const studentClass = student?.sinif;
    const targetSalonStudents = targetSalon.ogrenciler || [];
    const hasSameClass = targetSalonStudents.some(s => s.sinif === studentClass);
    
    if (!hasSameClass) {
      showWarning(`Uyarı: ${targetSalon.salonAdi} salonunda ${studentClass} sınıfından öğrenci yok!`);
    }

    return true;
  }, [student, getSalonCapacity, showError, showWarning]);

  // Modal kapatma
  const handleClose = useCallback(() => {
    setSelectedTargetSalon(null);
    onClose();
  }, [onClose]);

  // Transfer işlemi
  const handleTransfer = useCallback(async () => {
    if (!validateTransfer(selectedTargetSalon)) return;

    setIsTransferring(true);
    try {
      await onTransfer({
        student,
        fromSalon: currentSalon,
        toSalon: selectedTargetSalon,
        mode: transferMode
      });
      
      // Bildirim AnaSayfa'da gönderiliyor, burada tekrar göndermeye gerek yok
      handleClose();
    } catch (error) {
      showError('Transfer işlemi başarısız: ' + error.message);
    } finally {
      setIsTransferring(false);
    }
  }, [student, currentSalon, selectedTargetSalon, transferMode, onTransfer, showError, validateTransfer, handleClose]);

  if (!student || !currentSalon) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapIcon color="primary" />
          <Typography variant="h6">
            Öğrenci Transferi
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Öğrenci Bilgileri */}
        <Card sx={{ 
          mb: 3, 
          bgcolor: getGenderColor(student) === 'secondary' ? 'secondary.50' : 'primary.50',
          border: `2px solid ${getGenderColor(student) === 'secondary' ? '#e91e63' : '#2196f3'}`
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ 
                bgcolor: getGenderColor(student) === 'secondary' ? '#e91e63' : '#2196f3'
              }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{
                  color: getGenderColor(student) === 'secondary' ? '#ad1457' : '#1565c0'
                }}>
                  {student.ad} {student.soyad}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {student.sinif} • {student.numara}
                </Typography>
                <Chip 
                  label={`Mevcut Salon: ${currentSalon.salonAdi}`}
                  color={getGenderColor(student)}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>


        {/* Hedef Salon Seçimi */}
        <Typography variant="subtitle1" gutterBottom>
          Hedef Salon Seçin
        </Typography>

        {availableSalons.length === 0 ? (
          <Alert severity="warning">
            Transfer edilebilecek aktif salon bulunmuyor.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {availableSalons.map((salon) => {
              const capacity = getSalonCapacity(salon);
              const isSelected = selectedTargetSalon?.id === salon.id;
              const isFull = capacity.available <= 0;
              

              return (
                <Grid item xs={12} sm={6} md={4} key={salon.id}>
                  <Card
                    sx={{
                      cursor: isFull ? 'not-allowed' : 'pointer',
                      opacity: isFull ? 0.6 : 1,
                      border: isSelected ? 2 : 1,
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      '&:hover': !isFull ? {
                        borderColor: 'primary.main',
                        boxShadow: 2
                      } : {}
                    }}
                    onClick={() => !isFull && setSelectedTargetSalon(salon)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <SchoolIcon color="primary" />
                        <Typography variant="subtitle2">
                          {salon.salonAdi}
                        </Typography>
                        {isSelected && <CheckIcon color="primary" />}
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        <Chip
                          label={`${capacity.used}/${capacity.total}`}
                          color={isFull ? 'error' : 'default'}
                          size="small"
                        />
                        <Chip
                          label={`${capacity.available} boş`}
                          color={capacity.available > 0 ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>

                      {isFull && (
                        <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                          Salon Dolu!
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Seçilen Hedef Salon Detayları */}
        {selectedTargetSalon && (
          <Paper sx={{ 
            mt: 3, 
            p: 2, 
            bgcolor: getGenderColor(student) === 'secondary' ? '#fce4ec' : '#e3f2fd',
            border: `2px solid ${getGenderColor(student) === 'secondary' ? '#e91e63' : '#2196f3'}`
          }}>
            <Typography variant="subtitle2" gutterBottom sx={{
              color: getGenderColor(student) === 'secondary' ? '#ad1457' : '#1565c0'
            }}>
              Transfer Özeti
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ArrowIcon sx={{ 
                color: getGenderColor(student) === 'secondary' ? '#e91e63' : '#2196f3'
              }} />
              <Typography sx={{
                color: getGenderColor(student) === 'secondary' ? '#ad1457' : '#1565c0'
              }}>
                {student.ad} {student.soyad} → {selectedTargetSalon.salonAdi}
              </Typography>
            </Box>
          </Paper>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={isTransferring}>
          İptal
        </Button>
        <Button
          onClick={handleTransfer}
          variant="contained"
          disabled={!selectedTargetSalon || isTransferring}
          startIcon={isTransferring ? <CircularProgress size={16} /> : <SwapIcon />}
        >
          {isTransferring ? 'Transfer Ediliyor...' : 'Transfer Et'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InterSalonTransfer;
