import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Enable offline persistence (optional)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('⚠️ Firestore offline persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('⚠️ Firestore offline persistence not supported in this browser');
  } else {
    console.warn('⚠️ Firestore offline persistence error:', err);
  }
});

export { db };
export default app;
