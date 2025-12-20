/**
 * Firebase Configuration with Development Mode Support
 * 
 * This file allows disabling Firebase in development to avoid quota issues
 */

// Environment variable to disable Firebase (set in .env.local)
// TEMPORARY: Disabled to avoid quota exceeded errors
// Firestore aktif - planlar Firestore'a kaydedilecek
const DISABLE_FIREBASE = false; // process.env.REACT_APP_DISABLE_FIREBASE === 'true';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD_JswuXY8RpjpKdl1PFMC0KjNKVdKeSRM",
  authDomain: "ortak-sinav.firebaseapp.com",
  projectId: "ortak-sinav",
  storageBucket: "ortak-sinav.firebasestorage.app",
  messagingSenderId: "934298174753",
  appId: "1:934298174753:web:f180f6fc6c1325c462aa60",
  measurementId: "G-LNTKBMG6HN"
};

// Mock Firebase functions for development
const createMockFirebase = () => {
  console.log('🔧 Firebase disabled - using mock functions for development');
  
  return {
    db: {
      // Mock database object
      mock: true
    },
    app: {
      // Mock app object
      mock: true
    }
  };
};

// Export configuration
export { DISABLE_FIREBASE, firebaseConfig, createMockFirebase };
