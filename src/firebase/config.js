import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { DISABLE_FIREBASE, firebaseConfig, createMockFirebase } from '../config/firebaseConfig';

let app, db, auth = null;
let authReadyResolve = () => { };
let authReadyReject = () => { };
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

    // Initialize Firestore with persistent cache
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
      console.debug('✅ Firestore initialized with persistent cache');
    } catch (err) {
      console.warn('⚠️ Firestore persistence initialization failed, falling back to default:', err);
      db = getFirestore(app);
    }

    // Initialize Auth (anonymous session)
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('⚠️ Firebase auth persistence ayarlanamadı:', err);
    });

    onAuthStateChanged(auth, (user) => {
      if (user) {
        console.debug('✅ Firebase Auth hazır - kullanıcı UID:', user.uid);
      } else {
        console.debug('ℹ️ Firebase Auth: oturum açılmamış kullanıcı');
      }
      authReadyResolve(user || null);
    }, (error) => {
      console.error('❌ Auth state error:', error);
      authReadyReject(error);
    });

    // Firebase bağlantı testi
    console.debug('🔥 Firebase App initialized');
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
