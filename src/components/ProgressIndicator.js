/**
 * Progress Indicator Component
 * Real-time progress display with animations and details
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  LinearProgress,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Fade,
  Zoom,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Timer as TimerIcon
} from '@mui/icons-material';

const ProgressIndicator = ({
  progress,
  message,
  status = 'running',
  estimatedTime,
  elapsedTime,
  showDetails = true,
  size = 'medium',
  variant = 'linear'
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Smooth progress animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);

    return () => clearTimeout(timer);
  }, [progress]);

  // Format time display
  const formatTime = (seconds) => {
    if (!seconds || seconds <= 0) return '--';

    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    } else {
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }
  };

  // Get status icon and color
  const getStatusInfo = () => {
    switch (status) {
      case 'running':
        return {
          icon: <CircularProgress size={20} />,
          color: 'primary',
          bgColor: 'primary.50'
        };
      case 'completed':
        return {
          icon: <CheckCircleIcon />,
          color: 'success',
          bgColor: 'success.50'
        };
      case 'error':
        return {
          icon: <ErrorIcon />,
          color: 'error',
          bgColor: 'error.50'
        };
      case 'warning':
        return {
          icon: <WarningIcon />,
          color: 'warning',
          bgColor: 'warning.50'
        };
      default:
        return {
          icon: <InfoIcon />,
          color: 'info',
          bgColor: 'info.50'
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Size configurations
  const sizeConfig = {
    small: {
      height: 4,
      fontSize: '0.75rem',
      padding: 1,
      borderRadius: 1
    },
    medium: {
      height: 8,
      fontSize: '0.875rem',
      padding: 2,
      borderRadius: 2
    },
    large: {
      height: 12,
      fontSize: '1rem',
      padding: 3,
      borderRadius: 3
    }
  };

  const config = sizeConfig[size];

  if (variant === 'circular') {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={1}
        p={config.padding}
      >
        <Box position="relative" display="inline-flex">
          <CircularProgress
            variant="determinate"
            value={animatedProgress}
            size={60}
            thickness={4}
            color={statusInfo.color}
          />
          <Box
            top={0}
            left={0}
            bottom={0}
            right={0}
            position="absolute"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Typography
              variant="caption"
              component="div"
              color="text.secondary"
              fontWeight="bold"
            >
              {`${Math.round(animatedProgress)}%`}
            </Typography>
          </Box>
        </Box>

        {message && (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            sx={{ maxWidth: 200 }}
          >
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Fade in={true} timeout={300}>
      <Paper
        elevation={status === 'running' ? 4 : 1}
        sx={{
          p: config.padding,
          borderRadius: config.borderRadius,
          backgroundColor: statusInfo.bgColor,
          border: status !== 'running' ? `1px solid` : 'none',
          borderColor: `${statusInfo.color}.main`,
          transition: 'all 0.3s ease'
        }}
      >
        <Box display="flex" alignItems="center" gap={2} mb={showDetails ? 1 : 0}>
          <Box color={`${statusInfo.color}.main`}>
            {statusInfo.icon}
          </Box>

          <Box flex={1}>
            <Typography
              variant="body2"
              fontWeight="medium"
              color="text.primary"
              sx={{ fontSize: config.fontSize }}
            >
              {message || 'İşlem devam ediyor...'}
            </Typography>
          </Box>

          <Chip
            label={`${Math.round(animatedProgress)}%`}
            size="small"
            color={statusInfo.color}
            variant={status === 'running' ? 'filled' : 'outlined'}
          />
        </Box>

        {showDetails && (
          <Box>
            <LinearProgress
              variant="determinate"
              value={animatedProgress}
              sx={{
                height: config.height,
                borderRadius: 1,
                mb: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 1,
                  backgroundColor: status === 'running' ?
                    `${statusInfo.color}.main` :
                    `${statusInfo.color}.dark`
                }
              }}
            />

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <TimerIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  Geçen: {formatTime(elapsedTime)}
                </Typography>
              </Box>

              {estimatedTime && status === 'running' && (
                <Typography variant="caption" color="text.secondary">
                  Tahmini: {formatTime(estimatedTime)}
                </Typography>
              )}

              {status === 'completed' && (
                <Typography variant="caption" color="success.main" fontWeight="medium">
                  ✓ Tamamlandı
                </Typography>
              )}

              {status === 'error' && (
                <Typography variant="caption" color="error.main" fontWeight="medium">
                  ✗ Hata oluştu
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Paper>
    </Fade>
  );
};

// Specialized progress indicators

export const AlgorithmProgress = ({ progress, message, estimatedTime, elapsedTime }) => (
  <ProgressIndicator
    progress={progress}
    message={message}
    status="running"
    estimatedTime={estimatedTime}
    elapsedTime={elapsedTime}
    variant="linear"
    size="large"
  />
);

export const ExcelImportProgress = ({ progress, message, status = 'running' }) => (
  <ProgressIndicator
    progress={progress}
    message={message}
    status={status}
    variant="circular"
    size="medium"
    showDetails={false}
  />
);

export const QuickProgress = ({ progress, message }) => (
  <ProgressIndicator
    progress={progress}
    message={message}
    variant="linear"
    size="small"
    showDetails={false}
  />
);

export default ProgressIndicator;
