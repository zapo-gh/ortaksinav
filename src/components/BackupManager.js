/**
 * ============================================================================
 * BACKUP YÖNETİMİ BİLEŞENİ
 * ============================================================================
 * 
 * Kayıtlı planları yedekleme ve geri yükleme arayüzü
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Divider,
  Stack
} from '@mui/material';
import {
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  History as HistoryIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import backupManager from '../utils/backupManager';
import logger from '../utils/logger';
import { useNotifications } from './NotificationSystem';

const BackupManager = ({ onPlansUpdated }) => {
  const [backups, setBackups] = useState([]);
  const [report, setReport] = useState(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const { showPrompt, showSuccess, showError, showConfirm } = useNotifications();
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = () => {
    try {
      const backupList = backupManager.getBackupList();
      const backupReport = backupManager.getBackupReport();
      
      setBackups(backupList);
      setReport(backupReport);
      
      logger.debug('📋 Backup listesi yüklendi:', backupList.length);
    } catch (error) {
      logger.error('❌ Backup listesi yüklenirken hata:', error);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const description = await showPrompt('Backup açıklaması (opsiyonel):', 'Manuel Backup') || 'Manuel Backup';
      const backup = backupManager.createManualBackup(description);
      
      loadBackups();
      showSuccess(`Backup oluşturuldu! Tarih: ${new Date(backup.timestamp).toLocaleString('tr-TR')}, Plan Sayısı: ${backup.plans.length}`);
      
    } catch (error) {
      showError(`Backup oluşturulamadı: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = (backup) => {
    setSelectedBackup(backup);
    setRestoreDialogOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (!selectedBackup) return;
    
    setLoading(true);
    try {
      const result = backupManager.restoreFromBackup(selectedBackup.timestamp);
      
      showSuccess(`Backup geri yüklendi! Plan Sayısı: ${result.restoredPlans}, Tarih: ${new Date(result.backupTime).toLocaleString('tr-TR')}`);
      
      loadBackups();
      if (onPlansUpdated) {
        onPlansUpdated();
      }
      
    } catch (error) {
      showError(`Backup geri yüklenemedi: ${error.message}`);
    } finally {
      setLoading(false);
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
    }
  };

  const handleDeleteBackup = async (backupTimestamp) => {
    const confirmed = await showConfirm('Bu backup\'ı silmek istediğinizden emin misiniz?');
    if (confirmed) {
      try {
        backupManager.deleteBackup(backupTimestamp);
        loadBackups();
        showSuccess('Backup silindi');
      } catch (error) {
        showError(`Backup silinemedi: ${error.message}`);
      }
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('tr-TR');
  };

  const getBackupTypeColor = (backup) => {
    return backup.type === 'manual' ? 'primary' : 'secondary';
  };

  const getBackupTypeIcon = (backup) => {
    return backup.type === 'manual' ? <SaveIcon /> : <HistoryIcon />;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        <BackupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Backup Yönetimi
      </Typography>

      {/* Backup Raporu */}
      {report && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Backup Durumu:</strong> {report.totalBackups} backup, {report.currentPlans} mevcut plan
            {report.lastBackup && (
              <span> • Son backup: {formatDate(report.lastBackup)}</span>
            )}
          </Typography>
        </Alert>
      )}

      {/* Backup Oluştur Butonu */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<BackupIcon />}
          onClick={handleCreateBackup}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          Yeni Backup Oluştur
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<InfoIcon />}
          onClick={loadBackups}
        >
          Yenile
        </Button>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Backup Listesi */}
      {backups.length === 0 ? (
        <Alert severity="warning">
          <Typography variant="body2">
            Henüz backup bulunmuyor. Yeni backup oluşturun.
          </Typography>
        </Alert>
      ) : (
        <List>
          {backups.map((backup, index) => (
            <ListItem key={backup.timestamp} sx={{ mb: 2 }}>
              <Card sx={{ width: '100%' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2} mb={1}>
                    {getBackupTypeIcon(backup)}
                    <Typography variant="h6">
                      {backup.description || 'Otomatik Backup'}
                    </Typography>
                    <Chip
                      label={backup.type === 'manual' ? 'Manuel' : 'Otomatik'}
                      color={getBackupTypeColor(backup)}
                      size="small"
                    />
                  </Stack>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    📅 {formatDate(backup.timestamp)}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary">
                    📋 {backup.plans && Array.isArray(backup.plans) ? backup.plans.length : 0} plan
                  </Typography>
                  
                  {backup.plans && Array.isArray(backup.plans) && backup.plans.length > 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Planlar: {backup.plans.map(p => p.ad).join(', ')}
                    </Typography>
                  )}
                </CardContent>
                
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<RestoreIcon />}
                    onClick={() => handleRestoreClick(backup)}
                    disabled={loading}
                  >
                    Geri Yükle
                  </Button>
                  
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteBackup(backup.timestamp)}
                    disabled={loading}
                  >
                    Sil
                  </Button>
                </CardActions>
              </Card>
            </ListItem>
          ))}
        </List>
      )}

      {/* Geri Yükleme Onay Dialog'u */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Backup Geri Yükle</DialogTitle>
        <DialogContent>
          {selectedBackup && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Bu backup'ı geri yüklemek istediğinizden emin misiniz?
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                <strong>Backup Tarihi:</strong> {formatDate(selectedBackup.timestamp)}
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                <strong>Plan Sayısı:</strong> {selectedBackup.plans && Array.isArray(selectedBackup.plans) ? selectedBackup.plans.length : 0}
              </Typography>
              
              {selectedBackup.plans && Array.isArray(selectedBackup.plans) && selectedBackup.plans.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Planlar:</strong> {selectedBackup.plans.map(p => p.ad).join(', ')}
                </Typography>
              )}
              
              <Alert severity="warning" sx={{ mt: 2 }}>
                ⚠️ Mevcut planlar yedeklenecek ve bu backup ile değiştirilecektir.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>
            İptal
          </Button>
          <Button
            onClick={handleRestoreConfirm}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            Geri Yükle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BackupManager;
