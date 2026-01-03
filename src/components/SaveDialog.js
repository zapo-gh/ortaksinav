import React, { useState, useCallback, memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button
} from '@mui/material';
import { useNotifications } from './NotificationSystem';
import planManager from '../utils/planManager';

// Tamamen izole SaveDialog component - IndexedDB ile
const SaveDialog = memo(({ 
  open, 
  onClose, 
  onSave, 
  yerlestirmeSonucu,
  memoizedPlanData,
  memoizedToplamOgrenci
}) => {
  // TextField state tamamen izole - AnaSayfa hiç etkilenmez
  const [textValue, setTextValue] = useState('');
  const { showSuccess, showError } = useNotifications();
  
  // Dialog açıldığında state'i temizle
  React.useEffect(() => {
    if (open) {
      setTextValue('');
    }
  }, [open]);
  
  // Kaydetme fonksiyonu - IndexedDB ile
  const handleSave = useCallback(async () => {
    console.log('🔍 SaveDialog handleSave başlıyor (IndexedDB)...');
    console.log('📋 Props kontrolü:', {
      textValue: textValue,
      memoizedPlanData: memoizedPlanData,
      yerlestirmeSonucu: yerlestirmeSonucu,
      memoizedToplamOgrenci: memoizedToplamOgrenci
    });

    if (!textValue.trim()) {
      console.log('❌ Text value boş');
      showError('Lütfen plan adı giriniz.');
      return;
    }

    if (!memoizedPlanData) {
      console.error('❌ memoizedPlanData null:', { 
        memoizedPlanData, 
        yerlestirmeSonucu,
        yerlestirmeSonucuType: typeof yerlestirmeSonucu,
        yerlestirmeSonucuKeys: yerlestirmeSonucu ? Object.keys(yerlestirmeSonucu) : 'null'
      });
      showError('Kaydedilecek plan bulunamadı. Lütfen önce yerleştirme yapın.');
      return;
    }

    try {
      // Yeni plan manager ile kaydet
      const planId = await planManager.savePlan(textValue.trim(), memoizedPlanData);
      console.log('✅ Plan kaydedildi:', planId);
      
      showSuccess('Plan başarıyla kaydedildi!');
      onClose();
      
      // Custom event dispatch et (plan listesini güncellemek için)
      window.dispatchEvent(new CustomEvent('planSaved', {
        detail: { planId: planId, planName: textValue.trim() }
      }));
      
    } catch (error) {
      console.error('❌ Plan kaydetme hatası:', error);
      console.error('❌ Hata detayları:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      showError(`Plan kaydedilirken hata oluştu: ${error.message}`);
    }
  }, [textValue, memoizedPlanData, memoizedToplamOgrenci, yerlestirmeSonucu, onClose, showError, showSuccess]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={false}
      disableBackdropClick={false}
      transitionDuration={0}
    >
      <DialogTitle sx={{ pb: 1 }}>Planı Kaydet</DialogTitle>
      <DialogContent sx={{ py: 2 }}>
        <TextField
          autoFocus
          margin="dense"
          label="Plan Adı"
          fullWidth
          variant="outlined"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="Örn: 2025-2026 1. Dönem Sınav Planı"
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '14px'
            }
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={onClose}
          color="inherit"
        >
          İptal
        </Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={!textValue.trim()}
        >
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
});

SaveDialog.displayName = 'SaveDialog';

export default SaveDialog;