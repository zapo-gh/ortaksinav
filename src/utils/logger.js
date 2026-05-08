/**
 * Production-safe logger utility
 * Development'ta console.log'ları gösterir, production'da gizler
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isDebug = process.env.REACT_APP_DEBUG === 'true';

export const logger = {
  log: (...args) => {
    if (isDevelopment || isDebug) {
      console.log(...args);
    }
  },
  
  warn: (...args) => {
    if (isDevelopment || isDebug) {
      console.warn(...args);
    }
  },
  
  error: (...args) => {
    // Error'lar her zaman loglanmalı
    console.error(...args);
  },
  
  debug: (...args) => {
    if (isDevelopment || isDebug) {
      console.debug(...args);
    }
  },
  
  info: (...args) => {
    if (isDevelopment || isDebug) {
      console.info(...args);
    }
  }
};

export default logger;