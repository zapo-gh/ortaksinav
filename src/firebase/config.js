import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { DISABLE_FIREBASE, firebaseConfig, createMockFirebase } from '../config/firebaseConfig';

let app, db, auth = null;
let authReadyResolve = () => {};
let authReadyReject = () => {};
const authReadyPromise = new Promise((resolve, reject) => {
  authReadyResolve = resolve;
  authReadyReject = reject;
});

if (DISABLE_FIREBASE) {
  // Development mode - use mock Firebase
  const mockFirebase = createMockFirebase();
  app = mockFirebase.app;
  db = mockFirebase.db;
  authReadyResolve(null);
  console.log('🔧 Firebase disabled for development - using localStorage only');
} else {
  // Production mode - use real Firebase
  try {
    // Initialize Firebase
    app = initializeApp(firebaseConfig);

    // Initialize Firestore
    db = getFirestore(app);

    // Initialize Auth (anonymous session)
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence)
      .catch((err) => {
        console.warn('⚠️ Firebase auth persistence ayarlanamadı:', err);
      })
      .finally(() => {
        signInAnonymously(auth).catch((error) => {
          console.error('❌ Anonymous authentication failed:', error);
          authReadyReject(error);
        });
      });

    onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          console.log('✅ Firebase Auth hazır - kullanıcı UID:', user.uid);
          authReadyResolve(user);
        }
      },
      (error) => {
        console.error('❌ Auth state error:', error);
        authReadyReject(error);
      }
    );

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
    authReadyResolve(null);
  }
}

export { db, auth, authReadyPromise };
export default app;
