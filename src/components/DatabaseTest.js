import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import db from '../database/database';

const DatabaseTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const addTestResult = (test, status, message, data = null) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runDatabaseTests = async () => {
    setIsLoading(true);
    setError(null);
    setTestResults([]);

    try {
      // Test 1: Veritabanı bağlantısı
      addTestResult('DB Connection', 'running', 'Veritabanı bağlantısı test ediliyor...');
      await db.open();
      addTestResult('DB Connection', 'success', 'Veritabanı bağlantısı başarılı');

      // Test 2: Plan kaydetme
      addTestResult('Save Plan', 'running', 'Plan kaydetme test ediliyor...');
      const testPlan = {
        name: 'Test Plan',
        date: new Date().toISOString(),
        totalStudents: 5,
        salonCount: 1,
        data: {
          salon: { id: 1, name: 'Test Salon', masalar: [] },
          tumSalonlar: [{ id: 1, name: 'Test Salon', masalar: [] }],
          kalanOgrenciler: [],
          yerlesilemeyenOgrenciler: [],
          istatistikler: { toplamOgrenci: 5, yerlesenOgrenci: 5 }
        }
      };
      
      const savedPlan = await db.savePlan(testPlan);
      addTestResult('Save Plan', 'success', `Plan kaydedildi (ID: ${savedPlan})`, testPlan);

      // Test 3: Plan yükleme
      addTestResult('Load Plan', 'running', 'Plan yükleme test ediliyor...');
      const loadedPlan = await db.getPlan(savedPlan);
      addTestResult('Load Plan', 'success', 'Plan başarıyla yüklendi', loadedPlan);

      // Test 4: Öğrenci kaydetme
      addTestResult('Save Students', 'running', 'Öğrenci kaydetme test ediliyor...');
      const testStudents = [
        { id: 1, ad: 'Test', soyad: 'Öğrenci1', numara: '001', sinif: '9/A', cinsiyet: 'E' },
        { id: 2, ad: 'Test', soyad: 'Öğrenci2', numara: '002', sinif: '9/A', cinsiyet: 'K' }
      ];
      
      await db.saveStudents(testStudents);
      addTestResult('Save Students', 'success', `${testStudents.length} öğrenci kaydedildi`, testStudents);

      // Test 5: Öğrenci yükleme
      addTestResult('Load Students', 'running', 'Öğrenci yükleme test ediliyor...');
      const loadedStudents = await db.getAllStudents();
      addTestResult('Load Students', 'success', `${loadedStudents.length} öğrenci yüklendi`, loadedStudents);

      // Test 6: Ayar kaydetme
      addTestResult('Save Settings', 'running', 'Ayar kaydetme test ediliyor...');
      const testSettings = {
        sinavAdi: 'Test Sınavı',
        sinavTarihi: '2024-01-01',
        sinavSaati: '09:00',
        dersler: [{ ders: 'Matematik', siniflar: ['9/A'] }]
      };
      
      await db.saveSettings(testSettings);
      addTestResult('Save Settings', 'success', 'Ayarlar kaydedildi', testSettings);

      // Test 7: Ayar yükleme
      addTestResult('Load Settings', 'running', 'Ayar yükleme test ediliyor...');
      const loadedSettings = await db.getSettings();
      addTestResult('Load Settings', 'success', 'Ayarlar yüklendi', loadedSettings);

      // Test 8: Salon kaydetme
      addTestResult('Save Salons', 'running', 'Salon kaydetme test ediliyor...');
      const testSalons = [
        { id: 1, salonAdi: 'Test Salon 1', kapasite: 30, siraTipi: 'normal' },
        { id: 2, salonAdi: 'Test Salon 2', kapasite: 25, siraTipi: 'normal' }
      ];
      
      await db.saveSalons(testSalons);
      addTestResult('Save Salons', 'success', `${testSalons.length} salon kaydedildi`, testSalons);

      // Test 9: Salon yükleme
      addTestResult('Load Salons', 'running', 'Salon yükleme test ediliyor...');
      const loadedSalons = await db.getAllSalons();
      addTestResult('Load Salons', 'success', `${loadedSalons.length} salon yüklendi`, loadedSalons);

      // Test 10: Plan listesi
      addTestResult('List Plans', 'running', 'Plan listesi test ediliyor...');
      const plans = await db.getAllPlans();
      addTestResult('List Plans', 'success', `${plans.length} plan bulundu`, plans);

      addTestResult('All Tests', 'success', 'Tüm testler başarıyla tamamlandı! 🎉');

    } catch (error) {
      console.error('❌ Veritabanı test hatası:', error);
      setError(error.message);
      addTestResult('Error', 'error', `Test hatası: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearDatabase = async () => {
    try {
      setIsLoading(true);
      await db.clearDatabase();
      setTestResults([]);
      setError(null);
      addTestResult('Clear DB', 'success', 'Veritabanı temizlendi');
    } catch (error) {
      setError(error.message);
      addTestResult('Clear DB', 'error', `Temizleme hatası: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAutoPlans = async () => {
    try {
      setIsLoading(true);
      await db.clearAutoPlans();
      setTestResults([]);
      setError(null);
      addTestResult('Clear Auto Plans', 'success', 'Otomatik kayıt planları temizlendi');
    } catch (error) {
      setError(error.message);
      addTestResult('Clear Auto Plans', 'error', `Temizleme hatası: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success.main';
      case 'error': return 'error.main';
      case 'running': return 'info.main';
      default: return 'text.primary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '🔄';
      default: return 'ℹ️';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Veritabanı Test Paneli
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
              variant="contained"
              onClick={runDatabaseTests}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Testler Çalışıyor...' : 'Veritabanı Testlerini Çalıştır'}
            </Button>
            
            <Button
              variant="outlined"
              color="warning"
              onClick={clearDatabase}
              disabled={isLoading}
            >
              Veritabanını Temizle
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              onClick={clearAutoPlans}
              disabled={isLoading}
            >
              Otomatik Kayıt Planlarını Temizle
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Test Sonuçları
            </Typography>
            
            <List>
              {testResults.map((result, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            component="span"
                            sx={{ color: getStatusColor(result.status) }}
                          >
                            {getStatusIcon(result.status)} {result.test}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({result.timestamp})
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {result.message}
                          </Typography>
                          {result.data && (
                            <Typography variant="caption" color="text.secondary">
                              Veri: {JSON.stringify(result.data, null, 2).substring(0, 100)}...
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < testResults.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default DatabaseTest;
