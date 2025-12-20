/**
 * Custom Hook for Real-time Updates
 * Provides progress tracking and real-time feedback during operations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from '../utils/logger';

export const useRealTimeUpdates = () => {
  const [currentOperation, setCurrentOperation] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, running, completed, error
  const [message, setMessage] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);

  const operationRef = useRef(null);
  const progressHistory = useRef([]);

  // Start operation
  const startOperation = useCallback((operationName, totalSteps = 100) => {
    setCurrentOperation(operationName);
    setProgress(0);
    setStatus('running');
    setMessage(`${operationName} başlatılıyor...`);
    setStartTime(Date.now());
    setEstimatedTime(null);

    operationRef.current = {
      name: operationName,
      totalSteps,
      currentStep: 0,
      startTime: Date.now()
    };

    progressHistory.current = [];

    logger.info(`Operasyon başladı: ${operationName}`);
  }, []);

  // Update progress
  const updateProgress = useCallback((step, message = null, details = null) => {
    if (!operationRef.current) return;

    const op = operationRef.current;
    op.currentStep = step;

    const percentage = Math.min((step / op.totalSteps) * 100, 100);
    setProgress(percentage);

    if (message) {
      setMessage(message);
    }

    // Calculate ETA
    const now = Date.now();
    const elapsed = now - op.startTime;
    progressHistory.current.push({ time: now, progress: percentage });

    if (progressHistory.current.length >= 3) {
      const recent = progressHistory.current.slice(-3);
      const progressDiff = recent[recent.length - 1].progress - recent[0].progress;
      const timeDiff = recent[recent.length - 1].time - recent[0].time;

      if (progressDiff > 0 && timeDiff > 0) {
        const progressPerMs = progressDiff / timeDiff;
        const remainingProgress = 100 - percentage;
        const eta = remainingProgress / progressPerMs;

        setEstimatedTime(Math.max(0, Math.round(eta / 1000))); // seconds
      }
    }

    // Log progress
    if (step % 10 === 0 || step === op.totalSteps) {
      logger.debug(`İlerleme: ${operationName} - ${percentage.toFixed(1)}% - ${message || ''}`);
    }
  }, []);

  // Timeout refs for cleanup
  const timeoutRefs = useRef([]);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => {
        if (timeoutId) clearTimeout(timeoutId);
      });
      timeoutRefs.current = [];
    };
  }, []);

  // Complete operation
  const completeOperation = useCallback((result = null, finalMessage = null) => {
    if (!operationRef.current) return;

    const op = operationRef.current;
    const duration = Date.now() - op.startTime;

    setProgress(100);
    setStatus('completed');
    setMessage(finalMessage || `${op.name} tamamlandı`);

    logger.info(`Operasyon tamamlandı: ${op.name} (${duration}ms)`);

    // Reset after delay
    const timeoutId = setTimeout(() => {
      setCurrentOperation(null);
      setProgress(0);
      setStatus('idle');
      setMessage('');
      setStartTime(null);
      setEstimatedTime(null);
      operationRef.current = null;
      progressHistory.current = [];
      // Remove from refs array
      timeoutRefs.current = timeoutRefs.current.filter(id => id !== timeoutId);
    }, 3000);
    
    timeoutRefs.current.push(timeoutId);
  }, []);

  // Error handling
  const errorOperation = useCallback((errorMessage, details = null) => {
    if (!operationRef.current) return;

    const op = operationRef.current;
    setStatus('error');
    setMessage(`Hata: ${errorMessage}`);

    logger.error(`Operasyon hatası: ${op.name} - ${errorMessage}`, details);

    // Reset after delay
    const timeoutId = setTimeout(() => {
      setCurrentOperation(null);
      setProgress(0);
      setStatus('idle');
      setMessage('');
      setStartTime(null);
      setEstimatedTime(null);
      operationRef.current = null;
      progressHistory.current = [];
      // Remove from refs array
      timeoutRefs.current = timeoutRefs.current.filter(id => id !== timeoutId);
    }, 5000);
    
    timeoutRefs.current.push(timeoutId);
  }, []);

  // Cancel operation
  const cancelOperation = useCallback(() => {
    if (!operationRef.current) return;

    const op = operationRef.current;
    setStatus('idle');
    setMessage(`${op.name} iptal edildi`);

    logger.warn(`Operasyon iptal edildi: ${op.name}`);

    const timeoutId = setTimeout(() => {
      setCurrentOperation(null);
      setProgress(0);
      setStatus('idle');
      setMessage('');
      setStartTime(null);
      setEstimatedTime(null);
      operationRef.current = null;
      progressHistory.current = [];
      // Remove from refs array
      timeoutRefs.current = timeoutRefs.current.filter(id => id !== timeoutId);
    }, 2000);
    
    timeoutRefs.current.push(timeoutId);
  }, []);

  // Format time
  const formatTime = useCallback((seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    } else {
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }
  }, []);

  // Get elapsed time
  const getElapsedTime = useCallback(() => {
    if (!startTime) return 0;
    return Math.round((Date.now() - startTime) / 1000);
  }, [startTime]);

  return {
    // State
    currentOperation,
    progress,
    status,
    message,
    estimatedTime,
    elapsedTime: getElapsedTime(),

    // Methods
    startOperation,
    updateProgress,
    completeOperation,
    errorOperation,
    cancelOperation,

    // Utilities
    formatTime,
    isRunning: status === 'running',
    isCompleted: status === 'completed',
    hasError: status === 'error'
  };
};

// Specialized hooks for common operations

export const useAlgorithmProgress = () => {
  const updates = useRealTimeUpdates();

  const runWithProgress = useCallback(async (algorithmFn, ...args) => {
    updates.startOperation('Yerleştirme Algoritması', 100);

    try {
      // Simulate progress updates
      updates.updateProgress(10, 'Veriler hazırlanıyor...');
      await new Promise(resolve => setTimeout(resolve, 500));

      updates.updateProgress(30, 'Kısıtlar kontrol ediliyor...');
      await new Promise(resolve => setTimeout(resolve, 500));

      updates.updateProgress(60, 'Yerleştirme hesaplanıyor...');
      const result = await algorithmFn(...args);

      updates.updateProgress(90, 'Sonuçlar hazırlanıyor...');
      await new Promise(resolve => setTimeout(resolve, 500));

      updates.completeOperation(result, 'Yerleştirme tamamlandı!');
      return result;

    } catch (error) {
      updates.errorOperation(error.message);
      throw error;
    }
  }, [updates]);

  return {
    ...updates,
    runWithProgress
  };
};

export const useExcelImportProgress = () => {
  const updates = useRealTimeUpdates();

  const importWithProgress = useCallback(async (importFn, file) => {
    updates.startOperation('Excel İçeri Aktarma', 100);

    try {
      updates.updateProgress(10, 'Dosya yükleniyor...');
      await new Promise(resolve => setTimeout(resolve, 300));

      updates.updateProgress(30, 'Veriler parse ediliyor...');
      await new Promise(resolve => setTimeout(resolve, 500));

      updates.updateProgress(60, 'Validasyon yapılıyor...');
      const result = await importFn(file);

      updates.updateProgress(90, 'Sonuçlar hazırlanıyor...');
      await new Promise(resolve => setTimeout(resolve, 300));

      updates.completeOperation(result, `${result.students?.length || 0} öğrenci başarıyla yüklendi!`);
      return result;

    } catch (error) {
      updates.errorOperation(error.message);
      throw error;
    }
  }, [updates]);

  return {
    ...updates,
    importWithProgress
  };
};
