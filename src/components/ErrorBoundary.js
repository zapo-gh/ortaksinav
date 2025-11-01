import React from 'react';
import { Box, Typography, Button, Paper, Collapse } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import logger from '../utils/logger';
import errorTracker from '../utils/errorTracker';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Enhanced error logging
    const errorData = {
      error: error.toString(),
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      errorMessage: error.message,
      errorName: error.name,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      componentName: this.props.componentName || 'Unknown',
    };

    // Always log error (logger.error always logs)
    logger.error('Error Boundary caught an error:', errorData);

    // Track error with errorTracker
    errorTracker.trackError(error, {
      component: this.props.componentName || 'Unknown',
      action: 'render',
      componentStack: errorInfo.componentStack,
      errorBoundary: true
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails } = this.state;
      const { componentName, fallback } = this.props;
      const isDevelopment = process.env.NODE_ENV === 'development';

      // If custom fallback provided, use it
      if (fallback) {
        return fallback(error, errorInfo);
      }

      // Determine error message based on component
      const getErrorMessage = () => {
        if (componentName) {
          return `${componentName} bileşeninde bir hata oluştu.`;
        }
        return 'Beklenmeyen bir hata oluştu.';
      };

      const getHelpText = () => {
        if (componentName === 'PlanlamaYap') {
          return 'Yerleştirme işlemi sırasında bir sorun oluştu. Lütfen öğrenci ve salon verilerini kontrol edip tekrar deneyin.';
        }
        if (componentName === 'SalonPlani') {
          return 'Salon planı görüntülenirken bir sorun oluştu. Lütfen salon ayarlarını kontrol edin.';
        }
        if (componentName === 'KayitliPlanlar') {
          return 'Kayıtlı planlar yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.';
        }
        if (componentName === 'SabitAtamalar') {
          return 'Sabit atamalar yüklenirken bir sorun oluştu. Lütfen verileri kontrol edin.';
        }
        return 'Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.';
      };

      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: componentName ? '50vh' : '100vh',
            p: 2,
            bgcolor: 'grey.50'
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              maxWidth: 600,
              textAlign: 'center',
              borderRadius: 2,
              width: '100%'
            }}
          >
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="error">
              Bir Hata Oluştu
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              {getErrorMessage()}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {getHelpText()}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={this.handleRefresh}
              >
                Sayfayı Yenile
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleReset}
              >
                Tekrar Dene
              </Button>
              <Button
                variant="outlined"
                onClick={() => window.history.back()}
              >
                Geri Dön
              </Button>
            </Box>

            {(isDevelopment || showDetails) && error && (
              <Box sx={{ mt: 3 }}>
                <Button
                  size="small"
                  onClick={this.toggleDetails}
                  endIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ mb: 1 }}
                >
                  {showDetails ? 'Detayları Gizle' : 'Hata Detaylarını Göster'}
                </Button>
                <Collapse in={showDetails || isDevelopment}>
                  <Box sx={{ 
                    mt: 2, 
                    p: 2, 
                    bgcolor: 'grey.100', 
                    borderRadius: 1, 
                    textAlign: 'left',
                    maxHeight: '400px',
                    overflow: 'auto'
                  }}>
                    <Typography variant="subtitle2" color="error" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Hata Mesajı:
                    </Typography>
                    <Typography variant="caption" component="pre" sx={{ 
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      mb: 2
                    }}>
                      {error.toString()}
                    </Typography>
                    
                    {error.stack && (
                      <>
                        <Typography variant="subtitle2" color="error" sx={{ mb: 1, mt: 2, fontWeight: 'bold' }}>
                          Stack Trace:
                        </Typography>
                        <Typography variant="caption" component="pre" sx={{ 
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          mb: 2
                        }}>
                          {error.stack}
                        </Typography>
                      </>
                    )}
                    
                    {errorInfo && errorInfo.componentStack && (
                      <>
                        <Typography variant="subtitle2" color="error" sx={{ mb: 1, mt: 2, fontWeight: 'bold' }}>
                          Component Stack:
                        </Typography>
                        <Typography variant="caption" component="pre" sx={{ 
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {errorInfo.componentStack}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Collapse>
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
