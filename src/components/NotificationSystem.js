import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';

// Notification Context
const NotificationContext = createContext();

// Notification Provider
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [promptDialog, setPromptDialog] = useState(null);

  // Toast notification
  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    const notification = {
      id,
      message,
      type,
      duration
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove after duration
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  // Success notification
  const showSuccess = useCallback((message, duration = 4000) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  // Error notification
  const showError = useCallback((message, duration = 6000) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  // Warning notification
  const showWarning = useCallback((message, duration = 5000) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  // Info notification
  const showInfo = useCallback((message, duration = 4000) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  // Confirm dialog
  const showConfirm = useCallback((message, title = 'Onay', confirmText = 'Evet', cancelText = 'İptal') => {
    return new Promise((resolve) => {
      setConfirmDialog({
        open: true,
        title,
        message,
        confirmText,
        cancelText,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        }
      });
    });
  }, []);

  // Prompt dialog
  const showPrompt = useCallback((message, title = 'Giriş', placeholder = '', defaultValue = '') => {
    return new Promise((resolve) => {
      setPromptDialog({
        open: true,
        title,
        message,
        placeholder,
        defaultValue,
        onConfirm: (value) => {
          setPromptDialog(null);
          resolve(value);
        },
        onCancel: () => {
          setPromptDialog(null);
          resolve(null);
        }
      });
    });
  }, []);

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const value = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    showPrompt,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Toast Notifications */}
      <Box sx={{ 
        position: 'fixed', 
        top: 20, 
        right: 20, 
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        maxWidth: '400px',
        pointerEvents: 'none' // Box'ın kendisi pointer event'leri engellemesin
      }}>
        {notifications.map((notification) => (
          <Alert
            key={notification.id}
            severity={notification.type}
            onClose={() => removeNotification(notification.id)}
            sx={{ 
              minWidth: 300, 
              width: '100%',
              pointerEvents: 'auto', // Alert'in kendisi pointer event'leri alabilsin
              boxShadow: 3,
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            {notification.message}
          </Alert>
        ))}
      </Box>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <Dialog
          open={confirmDialog.open}
          onClose={confirmDialog.onCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            {confirmDialog.title}
          </DialogTitle>
          <DialogContent>
            <Typography>{confirmDialog.message}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={confirmDialog.onCancel} color="inherit">
              {confirmDialog.cancelText}
            </Button>
            <Button onClick={confirmDialog.onConfirm} variant="contained" color="primary">
              {confirmDialog.confirmText}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Prompt Dialog */}
      {promptDialog && (
        <PromptDialog
          open={promptDialog.open}
          title={promptDialog.title}
          message={promptDialog.message}
          placeholder={promptDialog.placeholder}
          defaultValue={promptDialog.defaultValue}
          onConfirm={promptDialog.onConfirm}
          onCancel={promptDialog.onCancel}
        />
      )}
    </NotificationContext.Provider>
  );
};

// Prompt Dialog Component
const PromptDialog = ({ open, title, message, placeholder, defaultValue, onConfirm, onCancel }) => {
  const [value, setValue] = useState(defaultValue);

  React.useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  const handleConfirm = () => {
    onConfirm(value);
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <InfoIcon color="info" />
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>{message}</Typography>
        <TextField
          autoFocus
          fullWidth
          variant="outlined"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleConfirm();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          İptal
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Tamam
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Hook to use notifications
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider;




