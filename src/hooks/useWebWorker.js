/**
 * Custom Hook for Web Worker Management
 * Provides easy-to-use interface for background computations
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { logger } from '../utils/logger';

export const useWebWorker = (workerPath) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const workerRef = useRef(null);
  const callbacksRef = useRef(new Map());

  // Initialize worker
  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL(workerPath, import.meta.url), { type: 'module' });

      workerRef.current.onmessage = (e) => {
        const { type, ...data } = e.data;

        switch (type) {
          case 'WORKER_READY':
            logger.info('Web Worker hazır');
            break;

          case 'PROGRESS':
            setProgress(data.progress);
            setProgressMessage(data.message);
            break;

          case 'ALGORITHM_COMPLETE':
          case 'VALIDATION_COMPLETE':
          case 'PARSE_COMPLETE':
            handleSuccess(type, data);
            break;

          case 'ALGORITHM_ERROR':
          case 'VALIDATION_ERROR':
          case 'PARSE_ERROR':
          case 'ERROR':
            handleError(data.error);
            break;

          default:
            logger.warn('Bilinmeyen worker mesajı:', type);
        }
      };

      workerRef.current.onerror = (error) => {
        logger.error('Worker hatası:', error);
        handleError('Worker execution failed');
      };

    } catch (err) {
      logger.error('Worker oluşturma hatası:', err);
      setError('Web Worker desteklenmiyor');
    }

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [workerPath]);

  const handleSuccess = useCallback((type, data) => {
    setIsLoading(false);
    setProgress(100);
    setProgressMessage('Tamamlandı');

    const callback = callbacksRef.current.get(type);
    if (callback) {
      callback(data.result || data);
      callbacksRef.current.delete(type);
    }

    // Reset progress after short delay
    setTimeout(() => {
      setProgress(0);
      setProgressMessage('');
    }, 2000);
  }, []);

  const handleError = useCallback((errorMessage) => {
    setIsLoading(false);
    setError(errorMessage);
    setProgress(0);
    setProgressMessage('');

    logger.error('Worker error:', errorMessage);
  }, []);

  // Send message to worker
  const sendMessage = useCallback((type, data, callback) => {
    if (!workerRef.current) {
      handleError('Worker not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setProgressMessage('İşleniyor...');

    // Store callback
    if (callback) {
      callbacksRef.current.set(type.replace('_', '_COMPLETE').toUpperCase(), callback);
    }

    // Send message
    workerRef.current.postMessage({
      type,
      data
    });

    logger.debug('Worker mesajı gönderildi:', type);
  }, [handleError]);

  // Algorithm execution
  const runAlgorithm = useCallback((ogrenciler, salonlar, ayarlar, callback) => {
    sendMessage('RUN_ALGORITHM', {
      ogrenciler,
      salonlar,
      ayarlar,
      seed: Date.now()
    }, callback);
  }, [sendMessage]);

  // Data validation
  const validateData = useCallback((students, constraints, callback) => {
    sendMessage('VALIDATE_DATA', {
      students,
      constraints
    }, callback);
  }, [sendMessage]);

  // Excel parsing
  const parseExcel = useCallback((file, options, callback) => {
    sendMessage('PARSE_EXCEL', {
      file,
      options
    }, callback);
  }, [sendMessage]);

  // Terminate worker
  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsLoading(false);
      setError(null);
      setProgress(0);
      setProgressMessage('');
      callbacksRef.current.clear();
    }
  }, []);

  return {
    // State
    isLoading,
    error,
    progress,
    progressMessage,

    // Methods
    runAlgorithm,
    validateData,
    parseExcel,
    terminate,

    // Utilities
    clearError: () => setError(null)
  };
};
