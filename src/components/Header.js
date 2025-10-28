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
  const [lastKeyPress, setLastKeyPress] = React.useState(0);

  // Test Dashboard görünürlüğünü kontrol et
  React.useEffect(() => {
    const checkTestDashboardVisibility = () => {
      // URL parametresi kontrolü - basit ?test
      const urlParams = new URLSearchParams(window.location.search);
      const showFromUrl = urlParams.has('test') || urlParams.get('showTestDashboard') === 'true';
      
      // localStorage kontrolü
      const isVisibleFromStorage = localStorage.getItem('show_test_dashboard') === 'true';
      
      // URL parametresi varsa öncelik ver
      const isVisible = showFromUrl || isVisibleFromStorage;
      
      setShowTestDashboard(isVisible);
    };

    checkTestDashboardVisibility();

    // Klavye kısayolu handler - debounced
    const handleKeyDown = (e) => {
      const now = Date.now();
      
      // Debounce: 500ms içinde aynı tuş basılırsa ignore et
      if (now - lastKeyPress < 500) {
        return;
      }
      
      // Test Dashboard toggle fonksiyonu
      const toggleTestDashboard = (keyName) => {
        console.log(`✅ ${keyName} algılandı!`);
        setLastKeyPress(now);
        setShowTestDashboard(prev => {
          const newVisibility = !prev;
          localStorage.setItem('show_test_dashboard', newVisibility.toString());
          console.log(`🧪 ${keyName} - Test Dashboard:`, newVisibility ? 'Açık' : 'Kapalı');
          return newVisibility;
        });
      };
      
      // Ctrl+Alt+T kombinasyonu
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 't' || e.key === '₺')) {
        e.preventDefault();
        toggleTestDashboard('Ctrl+Alt+T');
      }
      
      // Ctrl+Shift+T kombinasyonu
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        toggleTestDashboard('Ctrl+Shift+T');
      }
      
      // F12 tuşu - preventDefault() olmadan (console açılsın)
      else if (e.key === 'F12' || e.keyCode === 123) {
        toggleTestDashboard('F12');
      }
      
      // Escape tuşu
      else if (e.key === 'Escape') {
        toggleTestDashboard('Escape');
      }
      
      // Space tuşu (alternatif)
      else if (e.key === ' ') {
        e.preventDefault();
        toggleTestDashboard('Space');
      }
    };

    // Event listener'ları ekle
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleKeyDown);
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
