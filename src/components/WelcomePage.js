import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Avatar,
  Chip,
  Fade,
  Zoom,
  useTheme,
  alpha
} from '@mui/material';
import {
  School as SchoolIcon,
  People as PeopleIcon,
  MeetingRoom as MeetingRoomIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  Star as StarIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';

const WelcomePage = ({ onStart }) => {
  const theme = useTheme();
  const [fadeIn, setFadeIn] = useState(false);
  const [features, setFeatures] = useState(false);

  useEffect(() => {
    setFadeIn(true);
    setTimeout(() => setFeatures(true), 500);
  }, []);

  const featuresList = [
    {
      icon: <PeopleIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      title: 'Akıllı Öğrenci Yerleştirme',
      description: 'Gelişmiş algoritma ile optimal salon yerleştirme',
      color: 'primary'
    },
    {
      icon: <MeetingRoomIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      title: 'Salon Yönetimi',
      description: 'Çoklu salon desteği ve kapasite optimizasyonu',
      color: 'secondary'
    },
    {
      icon: <AssessmentIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      title: 'Raporlama',
      description: 'PDF export ve detaylı analiz raporları',
      color: 'success'
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      title: 'Güvenlik',
      description: 'Kısıt kontrolü ve ihlal tespiti',
      color: 'warning'
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 40, color: 'info.main' }} />,
      title: 'Hızlı İşlem',
      description: 'Drag & drop ile anında düzenleme',
      color: 'info'
    },
    {
      icon: <AutoAwesomeIcon sx={{ fontSize: 40, color: 'purple' }} />,
      title: 'AI Öğrenme',
      description: 'Makine öğrenmesi ile akıllı öneriler',
      color: 'purple'
    }
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
        display: 'flex',
        alignItems: 'center',
        py: 4
      }}
    >
      <Container maxWidth="lg">
        <Fade in={fadeIn} timeout={1000}>
          <Box textAlign="center" mb={6}>
            {/* Logo ve Başlık */}
            <Zoom in={fadeIn} timeout={1200}>
              <Box mb={4}>
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    mx: 'auto',
                    mb: 3,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    boxShadow: theme.shadows[8]
                  }}
                >
                  <SchoolIcon sx={{ fontSize: 60, color: 'white' }} />
                </Avatar>
                
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 2
                  }}
                >
                  Ortak Sınav Yerleştirme Sistemi
                </Typography>
                
                

                {/* Özellik Chips */}
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mb: 4 }}>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="AI Destekli"
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    icon={<StarIcon />}
                    label="Profesyonel"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    icon={<SpeedIcon />}
                    label="Hızlı"
                    color="secondary"
                    variant="outlined"
                  />
                </Box>
              </Box>
            </Zoom>

            {/* Başlat Butonu */}
            <Zoom in={fadeIn} timeout={1400}>
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                onClick={onStart}
                sx={{
                  px: 4,
                  py: 2,
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  borderRadius: 3,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  boxShadow: theme.shadows[8],
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[12],
                    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Sistemi Başlat
              </Button>
            </Zoom>
          </Box>
        </Fade>

        {/* Özellikler Grid */}
        <Fade in={features} timeout={1000}>
          <Box>
                        
            <Grid container spacing={3} justifyContent="center">
              {featuresList.map((feature, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Zoom in={features} timeout={1000 + index * 100}>
                    <Card
                      sx={{
                        height: '100%',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: theme.shadows[8],
                        }
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', p: 3 }}>
                        <Box sx={{ mb: 2 }}>
                          {feature.icon}
                        </Box>
                        <Typography
                          variant="h6"
                          component="h3"
                          sx={{ mb: 1, fontWeight: 600 }}
                        >
                          {feature.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                        >
                          {feature.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Zoom>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Fade>

        {/* Alt Bilgi */}
        <Fade in={features} timeout={1500}>
          <Box textAlign="center" mt={6}>
            <Paper
              sx={{
                p: 3,
                background: alpha(theme.palette.background.paper, 0.8),
                backdropFilter: 'blur(10px)',
                borderRadius: 3
              }}
            >
              <Typography variant="body1" color="text.secondary">
                <strong>Akhisar Farabi Mesleki ve Teknik Anadolu Lisesi Ortak Sınav Yerleştirme Programı</strong>
              </Typography>
            </Paper>
          </Box>
        </Fade>
      </Container>
    </Box>
  );
};

export default WelcomePage;
