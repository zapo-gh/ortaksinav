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
  AccountCircle,
  ExitToApp,
  Login,
  Search as SearchIcon
} from '@mui/icons-material';
import { FaGraduationCap } from 'react-icons/fa';
import { BsClipboardCheck } from 'react-icons/bs';

import QuickSearchModal from './QuickSearchModal';
import LoginDialog from './auth/LoginDialog';
import { useExam } from '../context/ExamContext';

const Header = ({ baslik, kullanici, onHomeClick, onTestDashboardClick, showNav = true }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [showTestDashboard, setShowTestDashboard] = React.useState(false);
  const [lastKeyPress, setLastKeyPress] = React.useState(0);
  const [lastKeyCode, setLastKeyCode] = React.useState(null);
  const [openSearch, setOpenSearch] = React.useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = React.useState(false);

  let examContext = null;
  try {
    examContext = useExam();
  } catch (error) {
    examContext = null;
  }
  const contextUser = examContext?.authUser || null;
  const role = examContext?.role || kullanici?.role || 'public';
  const isWriteAllowed = examContext?.isWriteAllowed ?? (role === 'admin');
  const handleLogoutContext = examContext?.logout;
  const canAuth = Boolean(examContext?.login);
  const currentUser = kullanici || contextUser;
  const displayName =
    currentUser?.displayName ||
    currentUser?.ad ||
    currentUser?.email ||
    (role === 'admin' ? 'Yönetici' : 'Misafir');
  const roleLabel = role === 'admin' ? 'Admin' : 'Misafir';

  // Test Dashboard görünürlüğünü kontrol et
  React.useEffect(() => {
    // Log kaldırıldı - gereksiz console spam'i önlemek için

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
        // Log kaldırıldı - gereksiz console spam'i önlemek için
      } else {
        // URL'de ?test yoksa localStorage'ı temizle ve gizle
        localStorage.removeItem('show_test_dashboard');
        setShowTestDashboard(false);
        // Log kaldırıldı - gereksiz console spam'i önlemek için
      }
    };

    checkTestDashboardVisibility();

    // URL değişikliklerini dinle (popstate ve hashchange)
    const handleUrlChange = () => {
      checkTestDashboardVisibility();
    };

    window.addEventListener('popstate', handleUrlChange);

    // URL parametrelerini düzenli kontrol et - sadece değişiklik olduğunda kontrol et
    let lastUrlState = window.location.search;
    const urlCheckInterval = setInterval(() => {
      const currentUrlState = window.location.search;
      if (currentUrlState !== lastUrlState) {
        lastUrlState = currentUrlState;
        checkTestDashboardVisibility();
      }
    }, 500);

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

      // Ctrl+K: Hızlı arama aç
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpenSearch(true);
        return;
      }

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

  const avatarLetter = (displayName || 'K').charAt(0).toUpperCase();

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    if (!handleLogoutContext) {
      handleClose();
      return;
    }
    await handleLogoutContext();
    handleClose();
  };

  return (
    <>
      <AppBar position="static" sx={{ bgcolor: 'primary.main', boxShadow: 2 }}>
        <Toolbar sx={{ position: 'relative', minHeight: '64px !important' }}>
          {/* Sol taraf - Logo */}
          <Box
            onClick={onHomeClick}
            sx={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1,
              width: 44,
              height: 44,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(25, 118, 210, 0.25), 0 0 0 1px rgba(25, 118, 210, 0.1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-50%) scale(1.08)',
                boxShadow: '0 4px 16px rgba(25, 118, 210, 0.35), 0 0 0 1px rgba(25, 118, 210, 0.15)',
                '& .logo-icon': {
                  transform: 'scale(1.1) rotate(-2deg)',
                }
              }
            }}
          >
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FaGraduationCap
                className="logo-icon"
                style={{
                  fontSize: 26,
                  color: '#1976d2',
                  filter: 'drop-shadow(0 2px 4px rgba(25, 118, 210, 0.3))',
                  transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  zIndex: 2
                }}
              />
              <BsClipboardCheck
                style={{
                  fontSize: 14,
                  color: '#42a5f5',
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  filter: 'drop-shadow(0 1px 2px rgba(66, 165, 245, 0.4))',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  padding: '2px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
            </Box>
          </Box>

          {/* Orta - Başlık (ortalanmış) */}
          <Typography
            variant="h6"
            component="div"
            sx={{
              position: 'absolute',
              left: { xs: 64, sm: '50%' },
              top: '50%',
              transform: { xs: 'translateY(-50%)', sm: 'translate(-50%, -50%)' },
              fontWeight: 'bold',
              fontSize: { xs: '0.85rem', sm: '1rem', md: '1.5rem' },
              textAlign: { xs: 'left', sm: 'center' },
              maxWidth: { xs: 'calc(100% - 140px)', sm: 'calc(100% - 200px)', md: 'none' },
              overflow: 'hidden',
              whiteSpace: { xs: 'normal', sm: 'nowrap' },
              lineHeight: { xs: 1.3, sm: 1.2 },
              display: { xs: 'flex', sm: 'block' },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 0, sm: 0 },
              px: { xs: 0.5, sm: 0 },
              zIndex: 1
            }}
            title={baslik || 'Ortak Sınav Yerleştirme Sistemi'}
          >
            {baslik || (
              <>
                <Box component="span" sx={{ display: { xs: 'block', sm: 'inline' } }}>
                  Ortak Sınav
                </Box>
                <Box component="span" sx={{ display: { xs: 'block', sm: 'inline' } }}>
                  Yerleştirme Sistemi
                </Box>
              </>
            )}
          </Typography>

          {/* Sağ taraf - Tüm Butonlar Birlikte */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.25, sm: 0.5, md: 1.5 }, position: 'absolute', right: { xs: 8, sm: 12, md: 16 }, top: '50%', transform: 'translateY(-50%)' }}>
            {/* Navigasyon metinleri - testlerin beklediği */}
            {showNav && (
              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
                <Button color="inherit" onClick={onHomeClick}>Ana Sayfa</Button>
                <Button color="inherit">Sınavlar</Button>
                <Button color="inherit">Öğrenciler</Button>
                <Button color="inherit">Raporlar</Button>
              </Box>
            )}
            <IconButton color="inherit" size="large" onClick={() => setOpenSearch(true)} title="Öğrenci Ara (Ctrl+K)">
              <SearchIcon />
            </IconButton>
            {/* Test Dashboard Butonu */}
            {showTestDashboard && (
              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
                <Button color="inherit" sx={{ minWidth: 'auto', px: 1.5, mr: 0 }} onClick={onTestDashboardClick}>
                  Test Dashboard
                </Button>
              </Box>
            )}

            {/* Kullanıcı Bölgesi */}
            {currentUser ? (
              <>
                <Chip
                  label={displayName}
                  variant="outlined"
                  sx={{
                    display: { xs: 'none', sm: 'flex' },
                    color: 'white',
                    borderColor: 'white',
                    maxWidth: { sm: 120, md: 'none' },
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    },
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                />
                <Chip
                  label={roleLabel}
                  color={isWriteAllowed ? 'success' : 'warning'}
                  variant="filled"
                  size="small"
                  sx={{
                    display: { xs: 'none', sm: 'flex' },
                    color: isWriteAllowed ? 'white' : 'rgba(0,0,0,0.8)',
                    fontWeight: 600
                  }}
                />
                <IconButton
                  size="large"
                  onClick={handleMenu}
                  color="inherit"
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'white', color: 'primary.main', fontWeight: 600 }}>
                    {avatarLetter}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem disabled>
                    <AccountCircle sx={{ mr: 1 }} />
                    {displayName}
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ExitToApp sx={{ mr: 1 }} />
                    Çıkış Yap
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                color="inherit"
                startIcon={<Login />}
                sx={{
                  minWidth: { xs: 'auto', sm: 'auto' },
                  px: { xs: 0.5, sm: 1.5 },
                  py: { xs: 0.5, sm: 0.75 },
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  },
                  '& .MuiButton-startIcon': {
                    margin: { xs: 0, sm: '0 8px 0 0' }
                  },
                  '& .MuiSvgIcon-root': {
                    fontSize: { xs: '1.2rem', sm: '1.5rem' }
                  }
                }}
                onClick={canAuth ? () => setLoginDialogOpen(true) : undefined}
                disabled={!canAuth}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Giriş Yap
                </Box>
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <QuickSearchModal open={openSearch} onClose={() => setOpenSearch(false)} />
      {canAuth ? (
        <LoginDialog
          open={loginDialogOpen}
          onClose={() => setLoginDialogOpen(false)}
        />
      ) : null}
    </>
  );
};

export default Header;
