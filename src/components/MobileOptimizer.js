/**
 * Mobile Optimizer Component
 * Provides mobile-specific optimizations and responsive features
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Fab,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  TouchApp as TouchIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RotateLeft as RotateLeftIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Save as SaveIcon,
  Print as PrintIcon
} from '@mui/icons-material';

const MobileOptimizer = ({
  children,
  onSave,
  onPrint,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleFullscreen
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [touchMode, setTouchMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreenSize = window.innerWidth < 768;

    if (isMobileDevice || isSmallScreenSize) {
      setShowMobileWarning(true);
      setTouchMode(true);
    }
  }, []);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Touch gesture handling
  useEffect(() => {
    if (!touchMode) return;

    let startX = 0;
    let startY = 0;
    let isDragging = false;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = false;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1 && startX && startY) {
        const deltaX = Math.abs(e.touches[0].clientX - startX);
        const deltaY = Math.abs(e.touches[0].clientY - startY);

        if (deltaX > 10 || deltaY > 10) {
          isDragging = true;
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (!isDragging && e.changedTouches.length === 1) {
        // This was a tap, not a drag
        const touch = e.changedTouches[0];
        // Handle tap gestures here if needed
      }

      startX = 0;
      startY = 0;
      isDragging = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchMode]);

  // Zoom controls
  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + 0.25, 2);
    setZoomLevel(newZoom);
    onZoomIn?.(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - 0.25, 0.5);
    setZoomLevel(newZoom);
    onZoomOut?.(newZoom);
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    onResetZoom?.(1);
  };

  // Fullscreen toggle
  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
      onToggleFullscreen?.(!isFullscreen);
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  // Mobile menu items
  const menuItems = [
    {
      text: 'Kaydet',
      icon: <SaveIcon />,
      action: onSave,
      disabled: !onSave
    },
    {
      text: 'Yazdır',
      icon: <PrintIcon />,
      action: onPrint,
      disabled: !onPrint
    },
    {
      text: 'Yakınlaştır',
      icon: <ZoomInIcon />,
      action: handleZoomIn
    },
    {
      text: 'Uzaklaştır',
      icon: <ZoomOutIcon />,
      action: handleZoomOut
    },
    {
      text: 'Yakınlaştırmayı Sıfırla',
      icon: <RotateLeftIcon />,
      action: handleResetZoom
    },
    {
      text: isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran',
      icon: isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />,
      action: handleToggleFullscreen
    }
  ];

  if (!isMobile) {
    return children;
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Mobile Warning Dialog */}
      <Dialog
        open={showMobileWarning}
        onClose={() => setShowMobileWarning(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Mobil Cihaz Tespit Edildi</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Mobil cihazda daha iyi deneyim için bazı optimizasyonlar aktif edildi.
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              • Dokunmatik kontroller aktif
              • Basitleştirilmiş menüler
              • Mobil uyumlu düzen
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMobileWarning(false)}>
            Anladım
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mobile Content */}
      <Box
        sx={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top center',
          transition: 'transform 0.3s ease',
          width: `${100 / zoomLevel}%`,
          height: zoomLevel > 1 ? 'auto' : '100%'
        }}
      >
        {children}
      </Box>

      {/* Mobile FAB Menu */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000
        }}
        onClick={() => setDrawerOpen(true)}
      >
        <MenuIcon />
      </Fab>

      {/* Mobile Drawer Menu */}
      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '60vh'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Menü</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <List>
            {menuItems.map((item, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton
                  onClick={() => {
                    item.action?.();
                    setDrawerOpen(false);
                  }}
                  disabled={item.disabled}
                >
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>

          {/* Touch Mode Indicator */}
          {touchMode && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TouchIcon fontSize="small" />
                Dokunmatik mod aktif - Öğeleri sürüklemek için basılı tutun
              </Typography>
            </Box>
          )}

          {/* Zoom Level Indicator */}
          {zoomLevel !== 1 && (
            <Box sx={{ mt: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Yakınlaştırma: {Math.round(zoomLevel * 100)}%
              </Typography>
            </Box>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default MobileOptimizer;
