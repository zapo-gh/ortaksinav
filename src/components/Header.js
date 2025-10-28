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
      const isVisible = localStorage.getItem('show_test_dashboard') === 'true';
      console.log('📊 Test Dashboard görünürlük durumu:', isVisible);
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
      
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 't') {
        e.preventDefault();
        console.log('✅ Header - Ctrl+Alt+T algılandı!');
        setShowTestDashboard(prev => {
          const newVisibility = !prev;
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
