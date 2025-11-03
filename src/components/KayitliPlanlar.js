import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudDownload as CloudDownloadIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import planManager from '../utils/planManager';
import { useNotifications } from './NotificationSystem';
import logger from '../utils/logger';
import { cleanupTempPlans } from '../utils/cleanupTempPlans';

const KayitliPlanlar = ({ onPlanYukle }) => {
  const [kayitliPlanlar, setKayitliPlanlar] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const { showSuccess, showError } = useNotifications();

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const allPlans = await planManager.getAllPlans();
      
      // Geçici kayıtları filtrele (kullanıcı tarafından kaydedilen planları göster)
      const filteredPlans = allPlans.filter(plan => {
        // ÖNCE: plan.id geçerli mi kontrol et
        if (plan.id === null || plan.id === undefined || plan.id === '') {
          console.warn('⚠️ KayitliPlanlar: Geçersiz ID\'ye sahip plan filtrelendi:', plan);
          return false;
        }
        
        // plan.id'nin string olduğundan emin ol
        const planId = String(plan.id);
        const planName = String(plan.name || '');
        
        return !planName.includes('Geçici Plan') && 
               !planId.startsWith('temp_');
      });
      
      // Son eklenen kayıtlar en sağda olacak şekilde sırala (tarihe göre artan sıralama)
      const sortedPlans = filteredPlans.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0);
        const dateB = new Date(b.date || b.createdAt || 0);
        return dateA - dateB; // Eski tarihler önce, yeni tarihler sonra
      });
      
      setKayitliPlanlar(sortedPlans);
    } catch (error) {
      logger.error('❌ Planlar yüklenirken hata:', error);
      showError('Planlar yüklenirken hata oluştu!');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handlePlanYukle = async (plan) => {
    try {
      console.log('🔍 handlePlanYukle çağrıldı, plan:', plan);
      console.log('🔍 handlePlanYukle - plan tip:', typeof plan);
      console.log('🔍 handlePlanYukle - plan.id:', plan?.id);
      console.log('🔍 handlePlanYukle - plan.id tip:', typeof plan?.id);
      console.log('🔍 handlePlanYukle - plan.keys:', plan ? Object.keys(plan) : 'plan null');
      
      // Plan ID validation - EN ÖNCE
      if (!plan || typeof plan !== 'object') {
        console.error('❌ Plan objesi geçersiz:', plan);
        throw new Error('Plan objesi geçersiz');
      }
      
      // Plan ID'yi güvenli bir şekilde al - hem plan.id hem de plan['id'] kontrol et
      const planId = plan.id ?? plan['id'] ?? null;
      console.log('🔍 Plan ID (normalized):', planId, 'Tip:', typeof planId);
      
      if (planId === null || planId === undefined || planId === '') {
        console.error('❌ Plan ID geçersiz:', planId);
        console.error('❌ Plan objesi:', JSON.stringify(plan, null, 2));
        throw new Error(`Plan ID geçersiz: ${planId} (Plan: ${plan.name || 'İsimsiz'})`);
      }
      
      // Plan objesi zaten yüklenmiş (onPlanYukle prop'undan geliyor)
      if (plan.data) {
        console.log('✅ Plan verisi zaten mevcut, direkt kullanılıyor');
        onPlanYukle(plan.data || plan);
        return;
      }
      
      // Plan objesi var ama data yok, loadPlan çağır
      console.log('📥 Plan verisi yükleniyor, ID:', planId);
      const loadedPlan = await planManager.loadPlan(planId);
      if (loadedPlan && loadedPlan.data) {
        onPlanYukle(loadedPlan.data);
      } else {
        throw new Error('Plan yüklendi ama veri bulunamadı');
      }
    } catch (error) {
      logger.error('❌ Plan yükleme hatası:', error);
      const errorMessage = error.message || 'Plan yüklenirken hata oluştu!';
      showError(`Plan yüklenirken hata oluştu: ${errorMessage}`);
    }
  };

  const handlePlanSil = async (planId) => {
    try {
      // planId validation
      if (planId === null || planId === undefined || planId === '') {
        throw new Error('Plan ID geçersiz');
      }
      
      await planManager.deletePlan(planId);
      
      // Önce modal'ı kapat
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
      
      // Sonra success mesajını göster (modal kapandıktan sonra)
      setTimeout(() => {
        showSuccess('Plan başarıyla silindi!');
      }, 100);
      
      // Planları yenile
      await loadPlans();
    } catch (error) {
      logger.error('❌ Plan silme hatası:', error);
      const errorMessage = error.message || 'Plan silinirken hata oluştu!';
      
      // Hata durumunda da modal'ı kapat
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
      
      // Hata mesajını göster (modal kapandıktan sonra)
      setTimeout(() => {
        showError(`Plan silinirken hata oluştu: ${errorMessage}`);
      }, 100);
    }
  };

  const handleDeleteClick = (planId) => {
    setPlanToDelete(planId);
    setDeleteDialogOpen(true);
  };

  const handleCleanupTempPlans = async () => {
    try {
      setIsLoading(true);
      await cleanupTempPlans();
      showSuccess('Geçici kayıtlar temizlendi!');
      loadPlans();
    } catch (error) {
      logger.error('❌ Geçici kayıtlar temizlenirken hata:', error);
      showError(`Geçici kayıtlar temizlenirken hata oluştu: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString || 'Tarih bilgisi yok';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Card elevation={2}>
        <CardContent>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: { xs: 2, sm: 3 },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 0 }
          }}>
            <Typography variant="h5" gutterBottom sx={{ 
              mb: 0,
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}>
              Kayıtlı Planlar
            </Typography>
            <Button
              variant="outlined"
              color="warning"
              size="small"
              onClick={handleCleanupTempPlans}
              sx={{ 
                ml: { xs: 0, sm: 2 },
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1, sm: 2 }
              }}
            >
              Geçici Kayıtları Temizle
            </Button>
          </Box>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : kayitliPlanlar.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Henüz kayıtlı plan yok. Plan oluşturduktan sonra kaydederek burada görüntüleyebilirsiniz.
            </Alert>
          ) : (
            <List>
              {kayitliPlanlar.map((plan) => {
                // Plan ID'yi güvenli bir şekilde al
                const planId = plan.id;
                const planName = plan.name || 'İsimsiz Plan';
                
                // Eğer plan ID geçersizse bu planı render etme
                if (!planId || planId === null || planId === undefined || planId === '') {
                  console.warn('⚠️ Geçersiz ID\'ye sahip plan render edilmedi:', plan);
                  return null;
                }
                
                return (
                  <ListItem
                    key={planId}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: 'background.paper',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.125rem' } }}>
                            {planName}
                          </Typography>
                          <Chip
                            label={`${plan.totalStudents || 0} Öğrenci`}
                            size="small"
                            color="primary"
                            sx={{ fontSize: '0.75rem' }}
                          />
                          <Chip
                            label={`${plan.salonCount || 0} Salon`}
                            size="small"
                            color="secondary"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                            <HistoryIcon sx={{ fontSize: '0.875rem', verticalAlign: 'middle', mr: 0.5 }} />
                            {formatDate(plan.date || plan.createdAt)}
                          </Typography>
                          {plan.sinavTarihi && (
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                              📅 {new Date(plan.sinavTarihi).toLocaleDateString('tr-TR')}
                              {plan.sinavSaati && ` • 🕐 ${plan.sinavSaati}`}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          edge="end"
                          color="primary"
                          onClick={() => {
                            console.log('🔍 onClick - plan objesi:', plan);
                            console.log('🔍 onClick - plan.id:', plan.id);
                            console.log('🔍 onClick - planId:', planId);
                            // Closure problemini önlemek için planId'yi direkt kullan
                            handlePlanYukle({ ...plan, id: planId });
                          }}
                          title="Planı Yükle"
                          sx={{ 
                            '&:hover': { bgcolor: 'primary.light', color: 'white' }
                          }}
                        >
                          <CloudDownloadIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => handleDeleteClick(planId)}
                          title="Planı Sil"
                          sx={{ 
                            '&:hover': { bgcolor: 'error.light', color: 'white' }
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Silme Onay Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setPlanToDelete(null);
        }}
      >
        <DialogTitle>Planı Sil</DialogTitle>
        <DialogContent>
          <Typography>
            Bu planı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setPlanToDelete(null);
          }}>
            İptal
          </Button>
          <Button
            onClick={() => handlePlanSil(planToDelete)}
            color="error"
            variant="contained"
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default KayitliPlanlar;

