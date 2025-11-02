import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { DISABLE_FIREBASE, firebaseConfig, createMockFirebase } from '../config/firebaseConfig';

let app, db;

if (DISABLE_FIREBASE) {
  // Development mode - use mock Firebase
  const mockFirebase = createMockFirebase();
  app = mockFirebase.app;
  db = mockFirebase.db;
  console.log('🔧 Firebase disabled for development - using localStorage only');
} else {
  // Production mode - use real Firebase
  try {
    // Initialize Firebase
    app = initializeApp(firebaseConfig);

    // Initialize Firestore
    db = getFirestore(app);

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

    // Firebase bağlantı testi
    console.log('🔥 Firebase App initialized:', app);
    console.log('🔥 Firestore DB initialized:', db);
    console.log('🔥 Firebase Config:', firebaseConfig);
    console.log('🔥 Firestore DB mock durumu:', db?.mock);
    console.log('🔥 DISABLE_FIREBASE:', DISABLE_FIREBASE);
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    console.log('🔧 Falling back to mock Firebase for development');
    const mockFirebase = createMockFirebase();
    app = mockFirebase.app;
    db = mockFirebase.db;
  }
}

export { db };
export default app;
