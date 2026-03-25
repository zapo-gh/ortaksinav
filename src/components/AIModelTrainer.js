/**
 * AI Model Trainer Component
 * Advanced machine learning integration for placement optimization
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  LinearProgress,
  Chip,
  Alert,
  AlertTitle,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import dragDropLearning from '../utils/dragDropLearning';
import learningDataManager from '../utils/learningDataManager';

const AIModelTrainer = ({
  currentPlacement,
  onModelUpdate,
  onPredictionRequest
}) => {
  const [trainingStatus, setTrainingStatus] = useState('idle'); // idle, training, completed, error
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [trainingConfig, setTrainingConfig] = useState({
    epochs: 50,
    learningRate: 0.01,
    batchSize: 32,
    autoTrain: true,
    realTimeLearning: true
  });
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [predictions, setPredictions] = useState([]);

  // Load initial model data
  useEffect(() => {
    loadModelData();
  }, []);

  const loadModelData = async () => {
    try {
      const stats = dragDropLearning.getLearningStats();
      const aiWeights = dragDropLearning.transferToAI();

      setModelMetrics({
        accuracy: stats.confidence * 100,
        totalMoves: stats.totalMoves,
        successRate: stats.successRate * 100,
        weights: aiWeights.weights,
        lastUpdated: new Date().toISOString()
      });

      // Generate initial predictions
      if (currentPlacement) {
        generatePredictions();
      }
    } catch (error) {
      console.error('Model data loading failed:', error);
    }
  };

  // Start training process
  const startTraining = useCallback(async () => {
    setTrainingStatus('training');
    setTrainingProgress(0);

    try {
      // Simulate training process
      for (let i = 0; i <= 100; i += 10) {
        setTrainingProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Update model with new training data
      await performTrainingIteration();

      setTrainingStatus('completed');
      loadModelData(); // Refresh metrics

      if (onModelUpdate) {
        onModelUpdate(modelMetrics);
      }

    } catch (error) {
      console.error('Training failed:', error);
      setTrainingStatus('error');
    }
  }, [trainingConfig, onModelUpdate]);

  // Perform one training iteration
  const performTrainingIteration = async () => {
    // Get current learning data
    const learningData = dragDropLearning.getLearningStats();

    // Update weights based on recent performance
    const newWeights = calculateOptimalWeights(learningData);

    // Apply new weights to the model
    dragDropLearning.setWeights(newWeights);

    // Save to learning data manager
    await learningDataManager.saveLearningData();

    return newWeights;
  };

  // Calculate optimal weights based on performance
  const calculateOptimalWeights = (learningData) => {
    const baseWeights = {
      genderBalance: 0.2,
      classLevelMix: 0.15,
      medicalNeeds: 0.4,
      groupPreservation: 0.25
    };

    // Adjust weights based on success patterns
    if (learningData.successRate > 0.8) {
      // High success - reinforce current weights
      baseWeights.genderBalance *= 1.1;
      baseWeights.classLevelMix *= 1.1;
    } else {
      // Low success - try different approach
      baseWeights.medicalNeeds *= 1.2;
      baseWeights.groupPreservation *= 1.2;
    }

    // Normalize weights
    const total = Object.values(baseWeights).reduce((sum, w) => sum + w, 0);
    Object.keys(baseWeights).forEach(key => {
      baseWeights[key] = baseWeights[key] / total;
    });

    return baseWeights;
  };

  // Generate predictions for current placement
  const generatePredictions = useCallback(() => {
    if (!currentPlacement) return;

    const newPredictions = [];

    // Analyze current placement for improvement suggestions
    const analysis = analyzePlacement(currentPlacement);

    newPredictions.push(...analysis.suggestions);

    setPredictions(newPredictions);

    if (onPredictionRequest) {
      onPredictionRequest(newPredictions);
    }
  }, [currentPlacement, onPredictionRequest]);

  // Analyze placement and generate suggestions
  const analyzePlacement = (placement) => {
    const suggestions = [];
    const metrics = {
      genderViolations: 0,
      classViolations: 0,
      emptySeats: 0,
      totalSeats: 0
    };

    // Analyze each classroom
    placement.tumSalonlar?.forEach(salon => {
      salon.masalar?.forEach(masa => {
        metrics.totalSeats++;

        if (!masa.ogrenci) {
          metrics.emptySeats++;
          return;
        }

        // Check gender constraints
        const neighbors = getNeighborsForAnalysis(salon, masa);
        neighbors.forEach(neighbor => {
          if (neighbor.ogrenci && neighbor.ogrenci.cinsiyet === masa.ogrenci.cinsiyet) {
            metrics.genderViolations++;
          }
        });

        // Check class constraints
        neighbors.forEach(neighbor => {
          if (neighbor.ogrenci) {
            const studentClass = getSinifSeviyesi(masa.ogrenci.sinif);
            const neighborClass = getSinifSeviyesi(neighbor.ogrenci.sinif);
            if (studentClass === neighborClass) {
              metrics.classViolations++;
            }
          }
        });
      });
    });

    // Generate suggestions based on analysis
    if (metrics.genderViolations > 0) {
      suggestions.push({
        type: 'gender_constraint',
        priority: 'high',
        message: `${metrics.genderViolations} cinsiyet kısıt ihlali tespit edildi`,
        action: 'Cinsiyet dengesini iyileştirmek için öğrencileri yeniden yerleştirin'
      });
    }

    if (metrics.classViolations > 0) {
      suggestions.push({
        type: 'class_constraint',
        priority: 'high',
        message: `${metrics.classViolations} sınıf seviyesi kısıt ihlali tespit edildi`,
        action: 'Aynı sınıf seviyesindeki öğrencileri ayırın'
      });
    }

    if (metrics.emptySeats > metrics.totalSeats * 0.2) {
      suggestions.push({
        type: 'capacity_optimization',
        priority: 'medium',
        message: `Salon kapasitesinin %${Math.round((metrics.emptySeats / metrics.totalSeats) * 100)}'i boş`,
        action: 'Kapasiteyi optimize etmek için salon sayısını azaltmayı değerlendirin'
      });
    }

    return { suggestions, metrics };
  };

  // Helper function to get neighbors for analysis
  const getNeighborsForAnalysis = (salon, masa) => {
    const neighbors = [];
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1] // up, down, left, right
    ];

    directions.forEach(([dr, dc]) => {
      const neighborMasa = salon.masalar?.find(m =>
        m.satir === masa.satir + dr && m.sutun === masa.sutun + dc
      );
      if (neighborMasa) {
        neighbors.push(neighborMasa);
      }
    });

    return neighbors;
  };

  // Helper function to get class level
  const getSinifSeviyesi = (sinif) => {
    if (!sinif) return null;
    const match = sinif.match(/^(\d+)/);
    return match ? match[1] : null;
  };

  // Stop training
  const stopTraining = () => {
    setTrainingStatus('idle');
    setTrainingProgress(0);
  };

  // Reset model
  const resetModel = () => {
    dragDropLearning.clearLearningData();
    setModelMetrics(null);
    setPredictions([]);
    loadModelData();
  };

  // Update training config
  const updateConfig = (newConfig) => {
    setTrainingConfig({ ...trainingConfig, ...newConfig });
    setSettingsDialogOpen(false);
  };

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              AI Model Eğitimi
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Ayarlar">
                <IconButton onClick={() => setSettingsDialogOpen(true)}>
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Yenile">
                <IconButton onClick={loadModelData}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Training Status */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Typography variant="body2">Eğitim Durumu:</Typography>
              <Chip
                label={
                  trainingStatus === 'idle' ? 'Hazır' :
                  trainingStatus === 'training' ? 'Eğitimde' :
                  trainingStatus === 'completed' ? 'Tamamlandı' :
                  'Hata'
                }
                color={
                  trainingStatus === 'idle' ? 'default' :
                  trainingStatus === 'training' ? 'primary' :
                  trainingStatus === 'completed' ? 'success' :
                  'error'
                }
                size="small"
              />
            </Box>

            {trainingStatus === 'training' && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="determinate" value={trainingProgress} />
                <Typography variant="caption" color="text.secondary">
                  Eğitim ilerlemesi: %{trainingProgress}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={startTraining}
                disabled={trainingStatus === 'training'}
                size="small"
              >
                Eğitimi Başlat
              </Button>

              {trainingStatus === 'training' && (
                <Button
                  variant="outlined"
                  startIcon={<StopIcon />}
                  onClick={stopTraining}
                  size="small"
                >
                  Durdur
                </Button>
              )}

              <Button
                variant="outlined"
                startIcon={<RestoreIcon />}
                onClick={resetModel}
                size="small"
                color="error"
              >
                Modeli Sıfırla
              </Button>
            </Box>
          </Box>

          {/* Model Metrics */}
          {modelMetrics && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6">{modelMetrics.accuracy.toFixed(1)}%</Typography>
                  <Typography variant="body2" color="text.secondary">Doğruluk</Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <TrendingUpIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6">{modelMetrics.totalMoves}</Typography>
                  <Typography variant="body2" color="text.secondary">Toplam Hareket</Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <PsychologyIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                  <Typography variant="h6">{modelMetrics.successRate.toFixed(1)}%</Typography>
                  <Typography variant="body2" color="text.secondary">Başarı Oranı</Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <LightbulbIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                  <Typography variant="h6">{predictions.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Öneri</Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* AI Predictions */}
      {predictions.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <LightbulbIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              AI Önerileri
            </Typography>

            <List>
              {predictions.map((prediction, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {prediction.priority === 'high' ? <Alert severity="error" sx={{ p: 0 }}>
                      <Typography variant="caption">Y</Typography>
                    </Alert> :
                     prediction.priority === 'medium' ? <Alert severity="warning" sx={{ p: 0 }}>
                      <Typography variant="caption">O</Typography>
                     </Alert> :
                     <Alert severity="info" sx={{ p: 0 }}>
                      <Typography variant="caption">D</Typography>
                     </Alert>}
                  </ListItemIcon>
                  <ListItemText
                    primary={prediction.message}
                    secondary={prediction.action}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Training Configuration Dialog */}
      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>AI Eğitim Ayarları</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Epoch Sayısı"
            type="number"
            value={trainingConfig.epochs}
            onChange={(e) => setTrainingConfig({...trainingConfig, epochs: parseInt(e.target.value)})}
            sx={{ mt: 2 }}
          />

          <TextField
            fullWidth
            label="Öğrenme Oranı"
            type="number"
            step="0.001"
            value={trainingConfig.learningRate}
            onChange={(e) => setTrainingConfig({...trainingConfig, learningRate: parseFloat(e.target.value)})}
            sx={{ mt: 2 }}
          />

          <TextField
            fullWidth
            label="Batch Boyutu"
            type="number"
            value={trainingConfig.batchSize}
            onChange={(e) => setTrainingConfig({...trainingConfig, batchSize: parseInt(e.target.value)})}
            sx={{ mt: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={trainingConfig.autoTrain}
                onChange={(e) => setTrainingConfig({...trainingConfig, autoTrain: e.target.checked})}
              />
            }
            label="Otomatik Eğitim"
            sx={{ mt: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={trainingConfig.realTimeLearning}
                onChange={(e) => setTrainingConfig({...trainingConfig, realTimeLearning: e.target.checked})}
              />
            }
            label="Gerçek Zamanlı Öğrenme"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>İptal</Button>
          <Button onClick={() => updateConfig(trainingConfig)} variant="contained">
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIModelTrainer;
