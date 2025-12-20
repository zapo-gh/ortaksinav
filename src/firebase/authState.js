/********************************************************************
 * Auth durumu & role yönetimi
 *******************************************************************/
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { auth, authReadyPromise } from './config';

let currentUser = auth?.currentUser ?? null;
let authInitialized = false;
const listeners = new Set();

let cachedRole = null;
let cachedRoleUserId = null;
let cachedRoleTimestamp = 0;
const ROLE_CACHE_TTL = 60 * 1000; // 1 dakika

if (auth) {
  onAuthStateChanged(
    auth,
    (user) => {
      currentUser = user;
      authInitialized = true;
      notifyAuthListeners(user);
    },
    (error) => {
      console.warn('⚠️ Auth state dinleme hatası:', error);
      authInitialized = true;
      notifyAuthListeners(null);
    }
  );
} else {
  authInitialized = true;
}

function notifyAuthListeners(user) {
  listeners.forEach((callback) => {
    try {
      callback(user);
    } catch (err) {
      console.warn('⚠️ Auth listener çalıştırılırken hata:', err);
    }
  });
}

export const waitForAuth = async () => {
  try {
    await authReadyPromise;
  } catch (error) {
    console.warn('⚠️ Auth beklenirken hata oluştu:', error);
  }

  if (authInitialized) {
    return currentUser;
  }

  return new Promise((resolve) => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const getCurrentUser = () => currentUser;

export const getCurrentUserId = () => currentUser?.uid || null;

export const subscribeToAuthChanges = (callback) => {
  if (typeof callback !== 'function') {
    return () => {};
  }

  listeners.add(callback);

  if (authInitialized) {
    callback(currentUser);
  }

  return () => {
    listeners.delete(callback);
  };
};

export const signInWithEmail = async (email, password) => {
  if (!auth) {
    throw new Error('Firebase Auth başlatılamadı.');
  }
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const signOutUser = async () => {
  if (!auth) {
    return;
  }
  await signOut(auth);
};

export const getUserRole = async () => {
  const now = Date.now();
  const userId = getCurrentUserId();

  if (!userId) {
    cachedRole = 'public';
    cachedRoleUserId = null;
    cachedRoleTimestamp = now;
    return cachedRole;
  }

  if (
    cachedRole &&
    cachedRoleUserId === userId &&
    now - cachedRoleTimestamp < ROLE_CACHE_TTL
  ) {
    return cachedRole;
  }

  try {
    const db = getFirestore();
    const roleDocRef = doc(db, 'roles', userId);
    const roleSnap = await getDoc(roleDocRef);
    const role = roleSnap.exists() ? roleSnap.data()?.role || 'public' : 'public';

    cachedRole = role;
    cachedRoleUserId = userId;
    cachedRoleTimestamp = now;

    return role;
  } catch (error) {
    console.warn('⚠️ Rol belirlenirken hata oluştu:', error);
    cachedRole = 'public';
    cachedRoleUserId = userId;
    cachedRoleTimestamp = now;
    return cachedRole;
  }
};

export const clearCachedRole = () => {
  cachedRole = null;
  cachedRoleUserId = null;
  cachedRoleTimestamp = 0;
};

