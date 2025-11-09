import { auth, authReadyPromise } from './config';

export const waitForAuth = async () => {
  try {
    return await authReadyPromise;
  } catch (error) {
    console.warn('⚠️ Auth hazır beklenirken hata oluştu:', error);
    return null;
  }
};

export const getCurrentUser = () => {
  return auth?.currentUser || null;
};

export const getCurrentUserId = () => {
  const user = getCurrentUser();
  return user?.uid || null;
};

