import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  LinearProgress,
  Alert,
  AlertTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  School as SchoolIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Info as InfoIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Lightbulb as LightbulbIcon
} from '@mui/icons-material';
import dragDropLearning from '../utils/dragDropLearning';

const LearningStats = () => {
  const [learningStats, setLearningStats] = useState(null);
  const [aiWeights, setAiWeights] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  useEffect(() => {
    loadLearningData();
  }, []);

  const loadLearningData = () => {
    const stats = dragDropLearning.getLearningStats();
    const aiData = dragDropLearning.transferToAI();
    
    setLearningStats(stats);
    setAiWeights(aiData.weights);
    setSuggestions(aiData.suggestions);
  };

  const handleClearLearningData = () => {
    dragDropLearning.clearLearningData();
    loadLearningData();
    setClearDialogOpen(false);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 0.8) return 'Yüksek Güven';
    if (confidence >= 0.6) return 'Orta Güven';
    return 'Düşük Güven';
  };

  if (!learningStats) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            AI Öğrenme Sistemi
          </Typography>
          <Typography color="text.secondary">
            Henüz öğrenme verisi bulunmuyor. Drag & Drop ile öğrenci yerleştirmeleri yaparak sistemi eğitebilirsiniz.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              AI Öğrenme Sistemi
            </Typography>
            <Box>
              <Tooltip title="Verileri Yenile">
                <IconButton onClick={loadLearningData} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Öğrenme Verilerini Temizle">
                <IconButton onClick={() => setClearDialogOpen(true)} size="small" color="error">
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Öğrenme İstatistikleri */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              <TrendingUpIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Öğrenme İstatistikleri
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Toplam Hareket
                </Typography>
                <Typography variant="h4" color="primary">
                  {learningStats.totalMoves}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Başarı Oranı
                </Typography>
                <Typography variant="h4" color="success.main">
                  %{(learningStats.successRate * 100).toFixed(1)}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Öğrenme Güveni
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={learningStats.confidence * 100} 
                    sx={{ flexGrow: 1 }}
                    color={getConfidenceColor(learningStats.confidence)}
                  />
                  <Typography variant="body2" color={`${getConfidenceColor(learningStats.confidence)}.main`}>
                    {getConfidenceText(learningStats.confidence)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* AI Ağırlıkları */}
          {aiWeights && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                AI Ağırlıkları
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip 
                  label={`Cinsiyet Dengesi: ${(aiWeights.genderBalance * 100).toFixed(1)}%`}
                  color="primary"
                  variant="outlined"
                />
                <Chip 
                  label={`Sınıf Çeşitliliği: ${(aiWeights.classLevelMix * 100).toFixed(1)}%`}
                  color="secondary"
                  variant="outlined"
                />
                <Chip 
                  label={`Komşu İzolasyonu: ${(aiWeights.neighborIsolation * 100).toFixed(1)}%`}
                  color="info"
                  variant="outlined"
                />
                <Chip 
                  label={`Risk Kaçınma: ${(aiWeights.riskAvoidance * 100).toFixed(1)}%`}
                  color="warning"
                  variant="outlined"
                />
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Öğrenme Önerileri */}
          {suggestions.length > 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                <LightbulbIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                AI Önerileri
              </Typography>
              
              <List dense>
                {suggestions.map((suggestion, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <InfoIcon color="info" />
                    </ListItemIcon>
                    <ListItemText
                      primary={suggestion.message}
                      secondary={`Güven: %${(suggestion.weight * 100).toFixed(1)}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {/* Bilgi Mesajı */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <AlertTitle>Nasıl Çalışır?</AlertTitle>
            <Typography variant="body2">
              Drag & Drop ile yaptığınız her öğrenci yerleştirmesi AI sistemine öğretilir. 
              Sistem, tercihlerinizi analiz ederek gelecekteki yerleştirmelerde daha iyi sonuçlar üretir.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Temizleme Dialog'u */}
      <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
        <DialogTitle>Öğrenme Verilerini Temizle</DialogTitle>
        <DialogContent>
          <Typography>
            Tüm öğrenme verilerini silmek istediğinizden emin misiniz? 
            Bu işlem geri alınamaz ve AI sistemi sıfırlanacaktır.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>İptal</Button>
          <Button onClick={handleClearLearningData} color="error" variant="contained">
            Temizle
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LearningStats;





























