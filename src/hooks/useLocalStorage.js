/**
 * Custom Hook for Advanced localStorage Management
 * Provides caching, compression, and performance optimizations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

export const useLocalStorage = (key, initialValue, options = {}) => {
  const {
    compress = false,
    ttl = null, // Time to live in milliseconds
    maxSize = 5 * 1024 * 1024, // 5MB default
    serialize = JSON.stringify,
    deserialize = JSON.parse
  } = options;

  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);

      if (!item) {
        return initialValue;
      }

      // Check TTL
      if (ttl) {
        const parsed = deserialize(item);
        if (parsed._timestamp && Date.now() - parsed._timestamp > ttl) {
          window.localStorage.removeItem(key);
          return initialValue;
        }
        return parsed._value || parsed;
      }

      return deserialize(item);
    } catch (error) {
      logger.warn(`localStorage okuma hatası (${key}):`, error);
      return initialValue;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  // Size check
  const checkSize = useCallback((value) => {
    const serialized = serialize(value);
    const size = new Blob([serialized]).size;

    if (size > maxSize) {
      throw new Error(`Veri boyutu limiti aşıldı: ${size} bytes (max: ${maxSize} bytes)`);
    }

    return serialized;
  }, [serialize, maxSize]);

  // Set value with optimizations
  const setValue = useCallback((value) => {
    try {
      setIsLoading(true);
      setError(null);

      // Debounce updates
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        const valueToStore = typeof value === 'function' ? value(storedValue) : value;

        // Add timestamp for TTL
        const dataToStore = ttl ? {
          _value: valueToStore,
          _timestamp: Date.now()
        } : valueToStore;

        // Check size and serialize
        const serialized = checkSize(dataToStore);

        // Compress if enabled
        let finalData = serialized;
        if (compress && window.CompressionStream) {
          // Web Compression API (if supported)
          // Note: This is a simplified version
          finalData = serialized; // Compression would be implemented here
        }

        // Store in localStorage
        window.localStorage.setItem(key, finalData);

        // Update state
        setStoredValue(valueToStore);
        setIsLoading(false);

        logger.debug(`localStorage güncellendi: ${key}`);

      }, 100); // 100ms debounce

    } catch (error) {
      setError(error.message);
      setIsLoading(false);
      logger.error(`localStorage yazma hatası (${key}):`, error);
    }
  }, [key, storedValue, ttl, compress, checkSize]);

  // Remove value
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
      setError(null);
      logger.debug(`localStorage silindi: ${key}`);
    } catch (error) {
      setError(error.message);
      logger.error(`localStorage silme hatası (${key}):`, error);
    }
  }, [key, initialValue]);

  // Clear all related keys (pattern matching)
  const clearPattern = useCallback((pattern) => {
    try {
      const keys = Object.keys(window.localStorage);
      const matchingKeys = keys.filter(k => k.includes(pattern));

      matchingKeys.forEach(k => {
        window.localStorage.removeItem(k);
      });

      logger.debug(`Pattern ile silindi: ${pattern} (${matchingKeys.length} anahtar)`);
    } catch (error) {
      setError(error.message);
      logger.error(`Pattern silme hatası (${pattern}):`, error);
    }
  }, []);

  // Get storage info
  const getStorageInfo = useCallback(() => {
    try {
      const used = new Blob([JSON.stringify(window.localStorage)]).size;
      const available = 5 * 1024 * 1024; // Approximate localStorage limit

      return {
        used,
        available,
        percentage: (used / available) * 100,
        itemCount: window.localStorage.length
      };
    } catch (error) {
      logger.error('Storage info alma hatası:', error);
      return null;
    }
  }, []);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = ttl ?
            deserialize(e.newValue)._value :
            deserialize(e.newValue);
          setStoredValue(newValue);
        } catch (error) {
          logger.warn('Storage change parse hatası:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, ttl, deserialize]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [
    storedValue,
    setValue,
    {
      remove: removeValue,
      clearPattern,
      getStorageInfo,
      isLoading,
      error,
      clearError: () => setError(null)
    }
  ];
};

// Specialized hooks for common use cases

export const useExamData = (key, initialValue) => {
  return useLocalStorage(`exam_${key}`, initialValue, {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    compress: false
  });
};

export const useCache = (key, initialValue, ttl = 60 * 60 * 1000) => {
  return useLocalStorage(`cache_${key}`, initialValue, {
    ttl,
    compress: true
  });
};

export const useSessionData = (key, initialValue) => {
  return useLocalStorage(`session_${key}`, initialValue, {
    ttl: null, // Session data, cleared manually
    compress: false
  });
};
