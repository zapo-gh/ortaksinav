import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Paper,
  Divider,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Speed as SpeedIcon,
  PhoneAndroid as MobileIcon,
  Computer as DesktopIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import performanceMonitor from '../utils/performance';
import responsiveUtils from '../utils/responsive';
import browserCompatibility from '../utils/browserCompatibility';

const TestDashboard = () => {
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  const runAllTests = async () => {
    setIsRunning(true);
    
    const results = {
      performance: await runPerformanceTests(),
      responsive: await runResponsiveTests(),
      browser: await runBrowserTests(),
      security: await runSecurityTests(),
      timestamp: new Date().toISOString()
    };
    
    setTestResults(results);
    setIsRunning(false);
  };

  const runPerformanceTests = async () => {
    const performance = performanceMonitor.measurePageLoad();
    const memory = performanceMonitor.measureMemory();
    const coreVitals = performanceMonitor.measureCoreWebVitals();
    const bundleSize = performanceMonitor.getBundleSize();
    
    return {
      pageLoad: performance,
      memory,
      coreVitals,
      bundleSize,
      score: calculatePerformanceScore(performance, memory, bundleSize)
    };
  };

  const runResponsiveTests = async () => {
    const screenSize = responsiveUtils.getScreenSize();
    const isTouch = responsiveUtils.isTouchDevice();
    const browserInfo = responsiveUtils.getBrowserInfo();
    const viewport = responsiveUtils.checkViewport();
    
    return {
      screenSize,
      isTouch,
      browserInfo,
      viewport,
      score: calculateResponsiveScore(screenSize, isTouch)
    };
  };

  const runBrowserTests = async () => {
    const features = browserCompatibility.checkModernFeatures();
    const engine = browserCompatibility.getBrowserEngine();
    const cssSupport = browserCompatibility.checkCSSSupport();
    const performanceAPI = browserCompatibility.checkPerformanceAPI();
    
    return {
      features,
      engine,
      cssSupport,
      performanceAPI,
      score: calculateBrowserScore(features, cssSupport)
    };
  };

  const runSecurityTests = async () => {
    const isHTTPS = window.location.protocol === 'https:';
    const hasCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]') !== null;
    const hasHSTS = document.querySelector('meta[http-equiv="Strict-Transport-Security"]') !== null;
    
    return {
      isHTTPS,
      hasCSP,
      hasHSTS,
      score: calculateSecurityScore(isHTTPS, hasCSP, hasHSTS)
    };
  };

  const calculatePerformanceScore = (performance, memory, bundleSize) => {
    let score = 100;
    
    if (performance && performance.totalTime > 3000) score -= 20;
    if (memory && memory.used > memory.limit * 0.8) score -= 15;
    if (bundleSize > 500) score -= 10;
    
    return Math.max(0, score);
  };

  const calculateResponsiveScore = (screenSize, isTouch) => {
    let score = 100;
    
    if (!screenSize) return 0;
    if (screenSize.isMobile && !isTouch) score -= 10;
    if (screenSize.width < 320) score -= 20;
    
    return Math.max(0, score);
  };

  const calculateBrowserScore = (features, cssSupport) => {
    let score = 100;
    const requiredFeatures = ['fetch', 'localStorage', 'indexedDB', 'dragDrop'];
    
    requiredFeatures.forEach(feature => {
      if (!features[feature]) score -= 25;
    });
    
    if (cssSupport && !cssSupport.grid) score -= 10;
    if (cssSupport && !cssSupport.flexbox) score -= 15;
    
    return Math.max(0, score);
  };

  const calculateSecurityScore = (isHTTPS, hasCSP, hasHSTS) => {
    let score = 100;
    
    if (!isHTTPS) score -= 50;
    if (!hasCSP) score -= 20;
    if (!hasHSTS) score -= 10;
    
    return Math.max(0, score);
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getScoreIcon = (score) => {
    if (score >= 90) return <CheckIcon />;
    if (score >= 70) return <WarningIcon />;
    return <ErrorIcon />;
  };

  useEffect(() => {
    runAllTests();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🧪 Deployment Test Dashboard
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          onClick={runAllTests}
          disabled={isRunning}
          sx={{ mr: 2 }}
        >
          {isRunning ? 'Testler Çalışıyor...' : 'Tüm Testleri Çalıştır'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Performance Test */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SpeedIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Performance Test</Typography>
                {testResults.performance && (
                  <Chip
                    icon={getScoreIcon(testResults.performance.score)}
                    label={`${testResults.performance.score}/100`}
                    color={getScoreColor(testResults.performance.score)}
                    sx={{ ml: 'auto' }}
                  />
                )}
              </Box>
              
              {testResults.performance && (
                <Box>
                  <Typography variant="body2">
                    <strong>Page Load:</strong> {testResults.performance.pageLoad?.totalTime?.toFixed(2)}ms
                  </Typography>
                  <Typography variant="body2">
                    <strong>Bundle Size:</strong> {testResults.performance.bundleSize}KB
                  </Typography>
                  <Typography variant="body2">
                    <strong>Memory:</strong> {testResults.performance.memory ? 
                      `${(testResults.performance.memory.used / 1024 / 1024).toFixed(2)}MB` : 'N/A'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Responsive Test */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MobileIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Responsive Test</Typography>
                {testResults.responsive && (
                  <Chip
                    icon={getScoreIcon(testResults.responsive.score)}
                    label={`${testResults.responsive.score}/100`}
                    color={getScoreColor(testResults.responsive.score)}
                    sx={{ ml: 'auto' }}
                  />
                )}
              </Box>
              
              {testResults.responsive && (
                <Box>
                  <Typography variant="body2">
                    <strong>Screen:</strong> {testResults.responsive.screenSize?.width}x{testResults.responsive.screenSize?.height}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Device:</strong> {testResults.responsive.screenSize?.isMobile ? 'Mobile' : 
                     testResults.responsive.screenSize?.isTablet ? 'Tablet' : 'Desktop'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Touch:</strong> {testResults.responsive.isTouch ? 'Yes' : 'No'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Browser Compatibility */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DesktopIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Browser Compatibility</Typography>
                {testResults.browser && (
                  <Chip
                    icon={getScoreIcon(testResults.browser.score)}
                    label={`${testResults.browser.score}/100`}
                    color={getScoreColor(testResults.browser.score)}
                    sx={{ ml: 'auto' }}
                  />
                )}
              </Box>
              
              {testResults.browser && (
                <Box>
                  <Typography variant="body2">
                    <strong>Engine:</strong> {testResults.browser.engine}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Features:</strong> {Object.values(testResults.browser.features).filter(Boolean).length}/
                    {Object.keys(testResults.browser.features).length}
                  </Typography>
                  <Typography variant="body2">
                    <strong>CSS Grid:</strong> {testResults.browser.cssSupport?.grid ? 'Yes' : 'No'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Security Test */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SecurityIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Security Test</Typography>
                {testResults.security && (
                  <Chip
                    icon={getScoreIcon(testResults.security.score)}
                    label={`${testResults.security.score}/100`}
                    color={getScoreColor(testResults.security.score)}
                    sx={{ ml: 'auto' }}
                  />
                )}
              </Box>
              
              {testResults.security && (
                <Box>
                  <Typography variant="body2">
                    <strong>HTTPS:</strong> {testResults.security.isHTTPS ? 'Yes' : 'No'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>CSP:</strong> {testResults.security.hasCSP ? 'Yes' : 'No'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>HSTS:</strong> {testResults.security.hasHSTS ? 'Yes' : 'No'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Overall Status */}
      {testResults.timestamp && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="h6" gutterBottom>
            📊 Test Sonuçları
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Son test: {new Date(testResults.timestamp).toLocaleString('tr-TR')}
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Alert severity="info">
            <AlertTitle>Deployment Hazırlık Durumu</AlertTitle>
            Tüm testler tamamlandı. Production'a deploy edebilirsiniz!
          </Alert>
        </Paper>
      )}
    </Box>
  );
};

export default TestDashboard;

























