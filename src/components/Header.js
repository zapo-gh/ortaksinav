import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip
} from '@mui/material';
import {
  School as SchoolIcon,
  Menu as MenuIcon,
  AccountCircle,
  ExitToApp,
  Login,
  Home as HomeIcon
} from '@mui/icons-material';

const Header = ({ baslik, kullanici, onHomeClick, onTestDashboardClick }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [showTestDashboard, setShowTestDashboard] = React.useState(false);

  // Test Dashboard görünürlüğünü kontrol et
  React.useEffect(() => {
    console.log('🚀 Header useEffect çalıştı');
    
    const checkTestDashboardVisibility = () => {
      // URL parametresi kontrolü
      const urlParams = new URLSearchParams(window.location.search);
      const showFromUrl = urlParams.get('showTestDashboard') === 'true';
      
      // localStorage kontrolü
      const isVisibleFromStorage = localStorage.getItem('show_test_dashboard') === 'true';
      
      // URL parametresi varsa öncelik ver
      const isVisible = showFromUrl || isVisibleFromStorage;
      
      console.log('📊 Test Dashboard görünürlük durumu:', {
        fromUrl: showFromUrl,
        fromStorage: isVisibleFromStorage,
        final: isVisible
      });
      
      setShowTestDashboard(isVisible);
    };

    checkTestDashboardVisibility();

    // Klavye kısayolu: Ctrl+Alt+T
    const handleKeyDown = (e) => {
      console.log('🔍 Header - Klavye tuşu:', e.key, 'Ctrl:', e.ctrlKey, 'Alt:', e.altKey, 'Meta:', e.metaKey);
      
      // Daha basit test: sadece 't' tuşu
      if (e.key === 't') {
        console.log('🔤 T tuşu basıldı!');
      }
      
      // Türkçe klavye için ₺ sembolü de kontrol et
      if (e.key === '₺') {
        console.log('💰 Türk Lirası sembolü basıldı!');
        console.log('🔍 ₺ sembolü ile Ctrl+Alt kontrolü:', e.ctrlKey, e.altKey);
      }
      
      // Detaylı debug: ₺ sembolü için
      console.log('🔍 Key detayları:', {
        key: e.key,
        keyCode: e.keyCode,
        charCode: e.charCode,
        which: e.which,
        keyLength: e.key.length,
        keyCharCodes: e.key.split('').map(c => c.charCodeAt(0))
      });
      
      // Test Dashboard toggle - sadece bir kez çalışsın
      let shouldToggle = false;
      
      // Geniş kontrol: ₺ sembolü için
      if (e.key.includes('₺') || e.key === '₺' || e.keyCode === 84) {
        console.log('🎯 ₺ sembolü algılandı! Key:', e.key, 'KeyCode:', e.keyCode);
        shouldToggle = true;
      }
      
      // Ctrl+Alt+T kombinasyonu için hem 't' hem '₺' kontrol et
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 't' || e.key === '₺')) {
        e.preventDefault();
        console.log('✅ Header - Ctrl+Alt+T algılandı!');
        shouldToggle = true;
      }
      
      // Sadece bir kez toggle yap
      if (shouldToggle) {
        console.log('🎯 Test Dashboard toggle!');
        setShowTestDashboard(prev => {
          const newVisibility = !prev;
          console.log('🔄 State güncelleniyor:', prev, '→', newVisibility);
          localStorage.setItem('show_test_dashboard', newVisibility.toString());
          console.log('🧪 Header - Test Dashboard görünürlüğü:', newVisibility ? 'Açık' : 'Kapalı');
          return newVisibility;
        });
      }
      
      // Alternatif: Ctrl+Shift+T kombinasyonu
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        console.log('✅ Header - Ctrl+Shift+T algılandı!');
        setShowTestDashboard(prev => {
          const newVisibility = !prev;
          console.log('🔄 State güncelleniyor:', prev, '→', newVisibility);
          localStorage.setItem('show_test_dashboard', newVisibility.toString());
          console.log('🧪 Header - Test Dashboard görünürlüğü:', newVisibility ? 'Açık' : 'Kapalı');
          return newVisibility;
        });
      }
      
      // Alternatif: F12 tuşu
      if (e.key === 'F12') {
        e.preventDefault();
        console.log('✅ Header - F12 algılandı!');
        setShowTestDashboard(prev => {
          const newVisibility = !prev;
          console.log('🔄 State güncelleniyor:', prev, '→', newVisibility);
          localStorage.setItem('show_test_dashboard', newVisibility.toString());
          console.log('🧪 Header - Test Dashboard görünürlüğü:', newVisibility ? 'Açık' : 'Kapalı');
          return newVisibility;
        });
      }
    };

    // Document'a da ekle
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDown);
    
    console.log('📝 Event listener eklendi');
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleKeyDown);
      console.log('🗑️ Event listener kaldırıldı');
    };
  }, []); // Dependency array'i boş bırak

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="static" sx={{ bgcolor: 'primary.main', boxShadow: 2 }}>
      <Toolbar>
        {/* Logo ve Başlık */}
        <SchoolIcon sx={{ mr: 2, fontSize: 32 }} />
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1,
            fontWeight: 'bold',
            fontSize: '1.5rem'
          }}
        >
          {baslik || ''}
        </Typography>

        {/* Menü Butonları */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, mr: 2 }}>
          <Button 
            color="inherit" 
            sx={{ mr: 2 }} 
            onClick={onHomeClick}
            startIcon={<HomeIcon />}
          >
            Ana Sayfa
          </Button>
          {showTestDashboard && (
            <Button color="inherit" sx={{ mr: 2 }} onClick={onTestDashboardClick}>
              Test Dashboard
            </Button>
          )}
          {console.log('🎯 Test Dashboard render kontrolü:', showTestDashboard, 'Type:', typeof showTestDashboard)}
        </Box>

        {/* Kullanıcı Bölgesi */}
        {kullanici ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={`Hoş geldin, ${kullanici.ad}`}
              variant="outlined"
              sx={{ 
                color: 'white', 
                borderColor: 'white',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            />
            <IconButton
              size="large"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleClose}>
                <AccountCircle sx={{ mr: 1 }} />
                Profil
              </MenuItem>
              <MenuItem onClick={handleClose}>
                <ExitToApp sx={{ mr: 1 }} />
                Çıkış
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Button 
            color="inherit" 
            startIcon={<Login />}
            sx={{
              border: '1px solid rgba(255, 255, 255, 0.3)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            Giriş Yap
          </Button>
        )}

        {/* Mobil Menü */}
        <IconButton
          size="large"
          color="inherit"
          sx={{ display: { xs: 'flex', md: 'none' }, ml: 1 }}
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
