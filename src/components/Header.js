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
  const [lastKeyCode, setLastKeyCode] = React.useState(null);
  const [logoError, setLogoError] = React.useState(false);

  // Test Dashboard görünürlüğünü kontrol et
  React.useEffect(() => {
    console.log('🚀 Header v2.1 - useEffect çalıştı (Debounce ile)');
    
    const checkTestDashboardVisibility = () => {
      // URL parametresi kontrolü - basit ?test
      const urlParams = new URLSearchParams(window.location.search);
      const showFromUrl = urlParams.has('test') || urlParams.get('showTestDashboard') === 'true';
      
      // KRİTİK DÜZELTME: Sadece URL parametresi varsa göster
      // URL parametresi yoksa localStorage'ı temizle ve gizle
      if (showFromUrl) {
        // URL'de ?test varsa localStorage'a kaydet ve göster
        localStorage.setItem('show_test_dashboard', 'true');
        setShowTestDashboard(true);
        console.log('✅ Test Dashboard görünür yapıldı (URL parametresi: ?test)');
      } else {
        // URL'de ?test yoksa localStorage'ı temizle ve gizle
        localStorage.removeItem('show_test_dashboard');
        setShowTestDashboard(false);
        console.log('❌ Test Dashboard gizlendi (URL parametresi yok)');
      }
    };

    checkTestDashboardVisibility();
    
    // URL değişikliklerini dinle (popstate ve hashchange)
    const handleUrlChange = () => {
      checkTestDashboardVisibility();
    };
    
    window.addEventListener('popstate', handleUrlChange);
    
    // URL değişikliklerini manuel olarak kontrol et (her 500ms)
    const urlCheckInterval = setInterval(checkTestDashboardVisibility, 500);

    // Space tuşunu globalde (form alanları hariç) engelle
    const preventSpaceToggle = (e) => {
      const isEditable = (el) => {
        if (!el) return false;
        const tag = (el.tagName || '').toLowerCase();
        const editableTags = ['input', 'textarea', 'select'];
        const isContentEditable = el.isContentEditable === true;
        return editableTags.includes(tag) || isContentEditable;
      };
      if ((e.key === ' ' || e.code === 'Space' || e.keyCode === 32) && !isEditable(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Klavye kısayolu handler - debounced
    const handleKeyDown = (e) => {
      const now = Date.now();
      // Space tuşunu tamamen görmezden gel
      if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
        return;
      }
      
      // Debounce: 1000ms içinde aynı tuş basılırsa ignore et
      if (now - lastKeyPress < 1000 && e.keyCode === lastKeyCode) {
        console.log('⏰ Debounce: Aynı tuş çok yakın zamanda basıldı, ignore ediliyor', e.keyCode);
        return;
      }
      
      // Test Dashboard toggle fonksiyonu - SADECE URL PARAMETRESİ İLE ÇALIŞIR
      const toggleTestDashboard = (keyName) => {
        console.log(`✅ ${keyName} algılandı! (Debounce geçildi)`);
        setLastKeyPress(now);
        setLastKeyCode(e.keyCode);
        
        // URL parametresini ekle/kaldır
        const urlParams = new URLSearchParams(window.location.search);
        const hasTestParam = urlParams.has('test') || urlParams.get('showTestDashboard') === 'true';
        
        if (hasTestParam) {
          // URL'den ?test parametresini kaldır
          urlParams.delete('test');
          urlParams.delete('showTestDashboard');
          const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
          window.history.pushState({}, '', newUrl);
          setShowTestDashboard(false);
          localStorage.removeItem('show_test_dashboard');
          console.log(`🧪 ${keyName} - Test Dashboard: KAPALI (URL parametresi kaldırıldı)`);
        } else {
          // URL'ye ?test parametresi ekle
          urlParams.set('test', '1');
          const newUrl = window.location.pathname + '?' + urlParams.toString();
          window.history.pushState({}, '', newUrl);
          setShowTestDashboard(true);
          localStorage.setItem('show_test_dashboard', 'true');
          console.log(`🧪 ${keyName} - Test Dashboard: AÇIK (URL parametresi eklendi)`);
        }
      };
      
      // Sadece Ctrl+Alt+T kombinasyonu ile toggle
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 't' || e.key === '₺')) {
        e.preventDefault();
        toggleTestDashboard('Ctrl+Alt+T');
      }
      // Diğer tüm tuşlar DEVRE DIŞI
    };

    // Event listener'ı sadece document'a ekle (window'a gerek yok)
    document.addEventListener('keydown', handleKeyDown);
    // Capture aşamasında space'i engelle
    document.addEventListener('keydown', preventSpaceToggle, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', preventSpaceToggle, true);
      window.removeEventListener('popstate', handleUrlChange);
      clearInterval(urlCheckInterval);
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
      <Toolbar sx={{ position: 'relative', minHeight: '64px !important' }}>
        {/* Sol taraf - Logo */}
        {!logoError ? (
          <Box 
            component="img"
            src="/header-logo.svg"
            alt="Logo"
            onError={() => setLogoError(true)}
            sx={{ 
              height: 32,
              width: 'auto',
              position: 'absolute', 
              left: 16, 
              top: '50%', 
              transform: 'translateY(-50%)', 
              zIndex: 1,
              cursor: 'pointer'
            }} 
          />
        ) : (
          <SchoolIcon 
            sx={{ 
              fontSize: 32, 
              position: 'absolute', 
              left: 16, 
              top: '50%', 
              transform: 'translateY(-50%)', 
              zIndex: 1
            }} 
          />
        )}
        
        {/* Orta - Başlık (ortalanmış) */}
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontWeight: 'bold',
            fontSize: '1.5rem',
            textAlign: 'center'
          }}
        >
          {baslik || 'Ortak Sınav Yerleştirme Sistemi'}
        </Typography>

        {/* Sağ taraf - Tüm Butonlar Birlikte */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 1.5 }, position: 'absolute', right: { xs: 80, md: 16 }, top: '50%', transform: 'translateY(-50%)' }}>
          {/* Ana Sayfa Butonu */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
            <Button 
              color="inherit" 
              sx={{ minWidth: 'auto', px: 1.5, mr: 0 }} 
              onClick={onHomeClick}
              startIcon={<HomeIcon />}
            >
              Ana Sayfa
            </Button>
            {showTestDashboard && (
              <Button color="inherit" sx={{ minWidth: 'auto', px: 1.5, mr: 0 }} onClick={onTestDashboardClick}>
                Test Dashboard
              </Button>
            )}
          </Box>

          {/* Kullanıcı Bölgesi */}
          {kullanici ? (
            <>
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
            </>
          ) : (
            <Button 
              color="inherit" 
              startIcon={<Login />}
              sx={{
                minWidth: 'auto',
                px: 1.5,
                border: '1px solid rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Giriş Yap
            </Button>
          )}
        </Box>

        {/* Mobil Menü */}
        <IconButton
          size="large"
          color="inherit"
          sx={{ 
            display: { xs: 'flex', md: 'none' }, 
            position: 'absolute', 
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
