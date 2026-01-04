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
  DialogActions,
  TextField
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudDownload as CloudDownloadIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  ExpandMore as ExpandMoreIcon,
  BackupTable as BackupTableIcon
} from '@mui/icons-material';
import {
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import ArchiveDialog from './ArchiveDialog';
import planManager from '../utils/planManager';
import { useNotifications } from './NotificationSystem';
import logger from '../utils/logger';
import { cleanupTempPlans } from '../utils/cleanupTempPlans';
import { subscribeToAuthChanges, getUserRole } from '../firebase/authState';

const KayitliPlanlar = ({ onPlanYukle }) => {
  const [kayitliPlanlar, setKayitliPlanlar] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [planToRename, setPlanToRename] = useState(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [planToArchive, setPlanToArchive] = useState(null);
  const { showSuccess, showError } = useNotifications();

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      if (user) {
        try {
          const role = await getUserRole();
          setIsAdmin(role === 'admin');
        } catch (err) {
          console.error('Role check error:', err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

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

      // Sıralama mantığı:
      // 1. Sınav tarihi olanlar önce gelir
      // 2. Sınav tarihi olanlar kendi içinde tarihe göre artan (yakın tarih önce) sıralanır
      // 3. Tarihi aynı olanlar saate göre sıralanır
      // 4. Sınav tarihi olmayanlar en sona atılır ve oluşturulma tarihine göre (yeni olan üstte) sıralanır
      const sortedPlans = filteredPlans.sort((a, b) => {
        const hasDateA = a.sinavTarihi && a.sinavTarihi !== '';
        const hasDateB = b.sinavTarihi && b.sinavTarihi !== '';

        // İkisinin de tarihi varsa tarihe ve saate göre karşılaştır
        if (hasDateA && hasDateB) {
          const dateA = new Date(a.sinavTarihi);
          const dateB = new Date(b.sinavTarihi);

          // Önce tarihe bak
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB; // Artan sıralama (Eski -> Yeni)
          }

          // Tarihler aynıysa saate bak
          const timeA = a.sinavSaati || '00:00';
          const timeB = b.sinavSaati || '00:00';
          return timeA.localeCompare(timeB);
        }

        // Sadece birinin tarihi varsa, tarihi olan önce gelir
        if (hasDateA) return -1;
        if (hasDateB) return 1;

        // İkisinin de tarihi yoksa oluşturulma tarihine göre (Yeniden eskiye)
        const createdAtA = new Date(a.date || a.createdAt || 0);
        const createdAtB = new Date(b.date || b.createdAt || 0);
        return createdAtB - createdAtA; // Azalan sıralama (Yeni -> Eski)
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
        onPlanYukle({
          id: planId,
          name: plan.name || 'İsimsiz Plan',
          date: plan.date || null,
          data: plan.data || plan
        });
        return;
      }

      // Plan objesi var ama data yok, loadPlan çağır
      console.log('📥 Plan verisi yükleniyor, ID:', planId);
      const loadedPlan = await planManager.loadPlan(planId);
      if (loadedPlan && loadedPlan.data) {
        onPlanYukle(loadedPlan);
      } else {
        throw new Error('Plan yüklendi ama veri bulunamadı');
      }
    } catch (error) {
      logger.error('❌ Plan yükleme hatası:', error);
      const errorMessage = error.message || 'Plan yüklenirken hata oluştu!';
      showError(`Plan yüklenirken hata oluştu: ${errorMessage}`);
    }
  };

  const handlePlanSil = async (planId, onCloseCallback) => {
    // Modal'ı hemen kapat - silme işlemi arka planda devam edecek
    setDeleteDialogOpen(false);
    setPlanToDelete(null);
    if (onCloseCallback) {
      onCloseCallback();
    }

    try {
      // planId validation
      if (planId === null || planId === undefined || planId === '') {
        throw new Error('Plan ID geçersiz');
      }

      await planManager.deletePlan(planId);

      // Success mesajını göster (modal zaten kapatıldı)
      showSuccess('Plan başarıyla silindi!');

      // Planları yenile
      await loadPlans();
    } catch (error) {
      logger.error('❌ Plan silme hatası:', error);
      const errorMessage = error.message || 'Plan silinirken hata oluştu!';

      // Hata mesajını göster (modal zaten kapatıldı)
      showError(`Plan silinirken hata oluştu: ${errorMessage}`);
    }
  };

  const handleDeleteClick = (planId) => {
    setPlanToDelete(planId);
    setDeleteDialogOpen(true);
  };

  const handleRenameClick = (plan) => {
    setPlanToRename(plan);
    setNewPlanName(plan.name || '');
    setRenameDialogOpen(true);
  };

  const handleRenameConfirm = async () => {
    if (!planToRename || !newPlanName.trim()) {
      showError('Plan adı boş olamaz!');
      return;
    }

    setIsRenaming(true);

    try {
      // Plan verisini yükle
      const planData = await planManager.loadPlan(planToRename.id);
      if (!planData || !planData.data) {
        throw new Error('Plan verisi yüklenemedi');
      }

      // Planı yeni isimle güncelle
      await planManager.updatePlan(planToRename.id, newPlanName.trim(), planData.data);

      showSuccess(`"${planToRename.name}" planının adı "${newPlanName.trim()}" olarak güncellendi!`);

      // Dialog'u kapat ve state'i temizle
      setRenameDialogOpen(false);
      setPlanToRename(null);
      setNewPlanName('');

      // Planları yeniden yükle
      await loadPlans();
    } catch (error) {
      logger.error('❌ Plan adı güncelleme hatası:', error);
      showError(`Plan adı güncellenirken hata oluştu: ${error.message}`);
    } finally {
      setIsRenaming(false);
    }
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

  const handleArchiveClick = (plan) => {
    setPlanToArchive(plan);
    setArchiveDialogOpen(true);
  };

  const handleArchiveConfirm = async (metadata) => {
    if (!planToArchive) return;
    try {
      setIsLoading(true);
      await planManager.archivePlan(planToArchive.id, metadata);
      showSuccess('Plan başarıyla arşivlendi.');
      await loadPlans();
    } catch (error) {
      showError('Plan arşivlenirken hata oluştu.');
    } finally {
      setIsLoading(false);
      setPlanToArchive(null);
    }
  };

  const handleRestorePlan = async (planId) => {
    try {
      setIsLoading(true);
      await planManager.restorePlan(planId);
      showSuccess('Plan arşivden çıkarıldı.');
      await loadPlans();
    } catch (error) {
      showError('Plan geri yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const groupArchivedPlans = (plans) => {
    const grouped = {};
    plans.forEach(plan => {
      const meta = plan.archiveMetadata || { yil: 'Bilinmeyen Yıl', donem: 'Bilinmeyen Dönem', sinavNo: 'Bilinmeyen Sınav' };
      const { yil, donem, sinavNo } = meta;

      if (!grouped[yil]) grouped[yil] = {};
      if (!grouped[yil][donem]) grouped[yil][donem] = {};
      if (!grouped[yil][donem][sinavNo]) grouped[yil][donem][sinavNo] = [];

      grouped[yil][donem][sinavNo].push(plan);
    });
    return grouped;
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
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <HistoryIcon sx={{ mr: 1, color: 'primary.main', fontSize: { xs: 24, sm: 28 } }} />
              <Typography variant="h6" sx={{
                mb: 0,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                color: 'text.primary',
                fontWeight: 'bold'
              }}>
                Kayıtlı Planlar
              </Typography>
            </Box>
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

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} aria-label="plan tabs">
              <Tab label={`Aktif Planlar (${kayitliPlanlar.filter(p => !p.isArchived).length})`} />
              <Tab label={`Arşiv (${kayitliPlanlar.filter(p => p.isArchived).length})`} />
            </Tabs>
          </Box>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : isRenaming ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
              <CircularProgress size={40} />
              <Typography variant="body1" color="text.secondary">
                Plan adı güncelleniyor...
              </Typography>
            </Box>
          ) : activeTab === 0 ? (
            kayitliPlanlar.filter(p => !p.isArchived).length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                Henüz kayıtlı aktif plan yok.
              </Alert>
            ) : (
              <List>
                {kayitliPlanlar.filter(p => !p.isArchived).map((plan) => {
                  const planId = plan.id;
                  const planName = plan.name || 'İsimsiz Plan';
                  if (!planId) return null;

                  return (
                    <ListItem
                      key={planId}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        mb: 1,
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <ListItemText
                        primaryTypographyProps={{ component: 'div' }}
                        secondaryTypographyProps={{ component: 'div' }}
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.125rem' } }}>
                              {planName}
                            </Typography>
                            <Chip label={`${plan.totalStudents || 0} Öğrenci`} size="small" color="primary" sx={{ fontSize: '0.75rem' }} />
                            <Chip label={`${plan.salonCount || 0} Salon`} size="small" color="secondary" sx={{ fontSize: '0.75rem' }} />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                              <HistoryIcon sx={{ fontSize: '0.875rem', verticalAlign: 'middle', mr: 0.5 }} />
                              {formatDate(plan.date || plan.createdAt)}
                            </Typography>
                            {plan.sinavTarihi && (
                              <Typography component="span" variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                                📅 {new Date(plan.sinavTarihi).toLocaleDateString('tr-TR')}
                                {plan.sinavSaati && ` • 🕐 ${plan.sinavSaati}`}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', gap: { xs: 0.25, sm: 0.5, md: 1 } }}>
                          <IconButton
                            edge="end"
                            color="primary"
                            onClick={() => handlePlanYukle({ ...plan, id: planId })}
                            title="Planı Yükle"
                            sx={{
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                transform: 'scale(1.08)',
                                bgcolor: 'primary.main',
                                color: 'white',
                                boxShadow: 2
                              }
                            }}
                          >
                            <CloudDownloadIcon />
                          </IconButton>
                          {isAdmin && (
                            <>
                              <IconButton
                                edge="end"
                                color="info"
                                onClick={() => handleArchiveClick(plan)}
                                title="Planı Arşivle"
                                sx={{
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    transform: 'scale(1.08)',
                                    bgcolor: 'info.main',
                                    color: 'white',
                                    boxShadow: 2
                                  }
                                }}
                              >
                                <ArchiveIcon />
                              </IconButton>
                              <IconButton
                                edge="end"
                                color="secondary"
                                onClick={() => handleRenameClick(plan)}
                                title="Plan Adını Değiştir"
                                sx={{
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    transform: 'scale(1.08)',
                                    bgcolor: 'secondary.main',
                                    color: 'white',
                                    boxShadow: 2
                                  }
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                edge="end"
                                color="error"
                                onClick={() => handleDeleteClick(planId)}
                                title="Planı Sil"
                                sx={{
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    transform: 'scale(1.08)',
                                    bgcolor: 'error.main',
                                    color: 'white',
                                    boxShadow: 2
                                  }
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </>
                          )}
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
            )
          ) : (
            // ARŞİV TABI
            kayitliPlanlar.filter(p => p.isArchived).length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                Arşivlenmiş plan bulunmamaktadır.
              </Alert>
            ) : (
              <Box sx={{ mt: 2 }}>
                {Object.entries(groupArchivedPlans(kayitliPlanlar.filter(p => p.isArchived))).sort().reverse().map(([yil, donemler]) => (
                  <Accordion key={yil} defaultExpanded sx={{ mb: 1, border: '1px solid', borderColor: 'divider' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                        <BackupTableIcon sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} /> {yil} Eğitim Yılı
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 1 }}>
                      {Object.entries(donemler).sort().map(([donem, sinavlar]) => (
                        <Box key={donem} sx={{ mb: 2, ml: 2 }}>
                          <Typography variant="subtitle2" color="primary" sx={{ mb: 1, borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}>
                            {donem}
                          </Typography>
                          {Object.entries(sinavlar).sort().map(([sinavNo, plans]) => (
                            <Box key={sinavNo} sx={{ mb: 1, ml: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                {sinavNo}
                              </Typography>
                              <List size="small" sx={{ p: 0 }}>
                                {plans.map(plan => (
                                  <ListItem
                                    key={plan.id}
                                    sx={{
                                      py: 0.5,
                                      borderLeft: '2px solid',
                                      borderColor: 'secondary.light',
                                      mb: 0.5,
                                      bgcolor: 'action.hover',
                                      borderRadius: '0 4px 4px 0'
                                    }}
                                  >
                                    <ListItemText
                                      primary={plan.name}
                                      secondary={
                                        <Box component="span">
                                          {`${plan.totalStudents} öğrenci • ${plan.salonCount} salon • ${new Date(plan.date).toLocaleDateString()}`}
                                          {plan.sinavTarihi && (
                                            <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                                              📅 {new Date(plan.sinavTarihi).toLocaleDateString('tr-TR')}
                                              {plan.sinavSaati && ` • 🕐 ${plan.sinavSaati}`}
                                            </Box>
                                          )}
                                        </Box>
                                      }
                                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                                      secondaryTypographyProps={{ variant: 'caption', component: 'div' }}
                                    />
                                    <ListItemSecondaryAction>
                                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <IconButton
                                          size="small"
                                          color="primary"
                                          onClick={() => handlePlanYukle(plan)}
                                          title="Planı Yükle"
                                          sx={{
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                              transform: 'scale(1.15)',
                                              bgcolor: 'primary.main',
                                              color: 'white',
                                              boxShadow: 2
                                            }
                                          }}
                                        >
                                          <CloudDownloadIcon fontSize="small" />
                                        </IconButton>
                                        {isAdmin && (
                                          <IconButton
                                            size="small"
                                            color="warning"
                                            onClick={() => handleRestorePlan(plan.id)}
                                            title="Arşivden Çıkar"
                                            sx={{
                                              transition: 'all 0.2s ease',
                                              '&:hover': {
                                                transform: 'scale(1.15)',
                                                bgcolor: 'warning.main',
                                                color: 'white',
                                                boxShadow: 2
                                              }
                                            }}
                                          >
                                            <UnarchiveIcon fontSize="small" />
                                          </IconButton>
                                        )}
                                      </Box>
                                    </ListItemSecondaryAction>
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          ))}
                        </Box>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )
          )}
        </CardContent>
      </Card >

      <ArchiveDialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        onConfirm={handleArchiveConfirm}
        planName={planToArchive?.name}
      />

      {/* Silme Onay Dialog */}
      < Dialog
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
            onClick={async () => {
              const closeDialog = () => {
                setDeleteDialogOpen(false);
                setPlanToDelete(null);
              };
              try {
                await handlePlanSil(planToDelete, closeDialog);
              } catch (error) {
                // handlePlanSil içinde zaten hata yakalanıyor ve modal kapatılıyor
                closeDialog();
              }
            }}
            color="error"
            variant="contained"
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog >

      {/* İsim Değiştirme Dialog */}
      < Dialog
        open={renameDialogOpen}
        onClose={() => {
          if (!isRenaming) {
            setRenameDialogOpen(false);
            setPlanToRename(null);
            setNewPlanName('');
          }
        }}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={isRenaming}
      >
        <DialogTitle>
          {isRenaming ? 'Plan Adı Güncelleniyor' : 'Plan Adını Değiştir'}
        </DialogTitle>
        <DialogContent>
          {isRenaming ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, gap: 2 }}>
              <CircularProgress size={40} />
              <Typography variant="body1" color="text.secondary">
                Plan adı güncelleniyor, lütfen bekleyin...
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {planToRename?.name} planının yeni adını girin:
              </Typography>
              <TextField
                autoFocus
                fullWidth
                label="Yeni Plan Adı"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isRenaming) {
                    handleRenameConfirm();
                  }
                }}
                variant="outlined"
                sx={{ mt: 1 }}
                disabled={isRenaming}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRenameDialogOpen(false);
              setPlanToRename(null);
              setNewPlanName('');
            }}
            disabled={isRenaming}
          >
            İptal
          </Button>
          {!isRenaming && (
            <Button
              onClick={handleRenameConfirm}
              color="primary"
              variant="contained"
              disabled={!newPlanName.trim() || isRenaming}
            >
              Kaydet
            </Button>
          )}
        </DialogActions>
      </Dialog >
    </Container >
  );
};

export default KayitliPlanlar;

