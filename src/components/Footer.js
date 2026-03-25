import React from 'react';
import {
  Box,
  Typography,
  Container,
  Divider,
  IconButton,
  Tooltip,
  Link,
  Stack,
  Chip
} from '@mui/material';
import {
  School as SchoolIcon,
  Code as CodeIcon,
  Email as EmailIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      className="app-footer"
      sx={{
        py: 1,
        px: 2,
        backgroundColor: 'grey.50',
        borderTop: '1px solid',
        borderColor: 'grey.200',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Dekoratif arka plan */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 50%, #1976d2 100%)',
          opacity: 0.6
        }}
      />
      
      <Container maxWidth="lg">
        <Stack spacing={3} className="footer-icerik">
          {/* Ana içerik */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2
            }}
          >
            {/* Sol taraf - Okul bilgisi */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SchoolIcon 
                sx={{ 
                  color: 'primary.main',
                  fontSize: 28
                }} 
              />
              <Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600,
                    color: 'text.primary',
                    fontSize: '1.1rem'
                  }}
                >
                  Akhisar Farabi Mesleki ve Teknik Anadolu Lisesi
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: '0.85rem'
                  }}
                >
                  Ortak Sınav Yerleştirme Sistemi
                </Typography>
              </Box>
            </Box>

            {/* Sağ taraf - Versiyon ve linkler */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="v2.0"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontSize: '0.75rem' }}
              />
              <Divider orientation="vertical" flexItem />
             
              <Tooltip title="İletişim">
                <IconButton 
                  size="small" 
                  color="inherit"
                  sx={{ 
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' }
                  }}
                >
                  <EmailIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Alt bilgi */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              pt: 1
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <InfoIcon fontSize="small" />
              © {currentYear} Tüm hakları saklıdır.
            </Typography>
            
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <CodeIcon fontSize="small" />
              React + Material-UI ile geliştirilmiştir
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer;
