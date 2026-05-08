import db from '../database';
import logger from './logger';
import { getUserRole, getCurrentUserId, waitForAuth } from '../firebase/authState';
import firestoreClient from '../database/firestoreClient';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

/**
 * Geçici drag & drop kayıtlarını temizle
 * Akıllı limit sistemi ile maksimum 5 geçici plan tutar
 */
export const cleanupTempPlans = async () => {
  try {
    const role = await getUserRole();
    if (role !== 'admin') {
      logger.info('ℹ️ Geçici plan temizliği yalnızca yönetici oturumlarında çalışır. Public oturum, işlem atlandı.');
      return {
        success: true,
        deletedCount: 0,
        keptCount: 0,
        message: 'Public oturumda geçici plan temizliği yapılmadı'
      };
    }

    logger.info('🧹 Geçici planlar temizleniyor...');

    // Tüm planları al
    const allPlans = await db.getAllPlans();
    logger.info('📋 Tüm planlar alındı:', allPlans.length);

    // Geçici planları filtrele
    const tempPlans = allPlans.filter(plan => {
      // plan.id'yi string'e çevir
      const planId = String(plan.id || '');
      const planName = String(plan.name || '');

      const isTemp = planName.includes('Geçici Plan') || planId.startsWith('temp_');
      logger.info(`🔍 Plan kontrolü: ${planId} - ${planName} - Geçici: ${isTemp}`);
      return isTemp;
    });

    logger.info(`📊 ${tempPlans.length} geçici plan bulundu`);

    // Akıllı limit sistemi: Maksimum 5 geçici plan tut
    const MAX_TEMP_PLANS = 5;

    if (tempPlans.length > MAX_TEMP_PLANS) {
      // Tarihe göre sırala (en yeni en son)
      const sortedTempPlans = tempPlans.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0);
        const dateB = new Date(b.date || b.createdAt || 0);
        return dateB - dateA;
      });

      // En yeni 5 planı koru, diğerlerini sil
      const plansToKeep = sortedTempPlans.slice(0, MAX_TEMP_PLANS);
      const plansToDelete = sortedTempPlans.slice(MAX_TEMP_PLANS);

      logger.info(`🗑️ ${plansToDelete.length} eski geçici plan silinecek (${plansToKeep.length} plan korunacak)`);

      for (const plan of plansToDelete) {
        try {
          await db.deletePlan(plan.id);
          logger.info(`✅ Eski geçici plan silindi: ${plan.id}`);
        } catch (deleteError) {
          logger.error(`❌ Plan silme hatası (${plan.id}):`, deleteError);
          // Tek plan silme hatası tüm işlemi durdurmasın
        }
      }

      logger.info(`✅ ${plansToDelete.length} eski geçici plan temizlendi, ${plansToKeep.length} plan korundu`);

      return {
        success: true,
        deletedCount: plansToDelete.length,
        keptCount: plansToKeep.length,
        message: `${plansToDelete.length} eski geçici plan silindi, ${plansToKeep.length} plan korundu`
      };
    } else if (tempPlans.length > 1) {
      // Eski sistem: Sadece 1 plan tut (geriye dönük uyumluluk)
      const sortedTempPlans = tempPlans.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0);
        const dateB = new Date(b.date || b.createdAt || 0);
        return dateB - dateA;
      });

      const plansToDelete = sortedTempPlans.slice(1);

      logger.info(`🗑️ ${plansToDelete.length} plan silinecek (eski sistem)`);

      for (const plan of plansToDelete) {
        try {
          await db.deletePlan(plan.id);
          logger.info(`✅ Geçici plan silindi: ${plan.id}`);
        } catch (deleteError) {
          logger.error(`❌ Plan silme hatası (${plan.id}):`, deleteError);
        }
      }

      logger.info(`✅ ${plansToDelete.length} geçici plan temizlendi`);

      return {
        success: true,
        deletedCount: plansToDelete.length,
        keptCount: 1,
        message: `${plansToDelete.length} geçici plan silindi, 1 plan korundu`
      };
    } else if (tempPlans.length === 1) {
      logger.info('ℹ️ Sadece 1 geçici plan var, temizleme gerekmiyor');
      return {
        success: true,
        deletedCount: 0,
        keptCount: 1,
        message: 'Sadece 1 geçici plan var, temizleme gerekmiyor'
      };
    } else {
      logger.info('ℹ️ Temizlenecek geçici plan bulunamadı');
      return {
        success: true,
        deletedCount: 0,
        keptCount: 0,
        message: 'Temizlenecek geçici plan bulunamadı'
      };
    }

  } catch (error) {
    logger.error('❌ Geçici planlar temizlenirken hata:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Geçici plan oluşturma stratejisini değiştir
 * Mevcut geçici planı güncelle, yeni kayıt oluşturma
 * Otomatik temizlik ile birlikte çalışır
 */
export const updateTempPlan = async (planData) => {
  try {
    // Mevcut geçici planı bul
    const allPlans = await db.getAllPlans();
    const existingTempPlan = allPlans.find(plan => {
      const planId = String(plan.id || '');
      const planName = String(plan.name || '');
      return planName.includes('Geçici Plan') || planId.startsWith('temp_');
    });

    if (existingTempPlan) {
      // Mevcut geçici planı güncelle
      const updatedPlan = {
        ...existingTempPlan,
        data: planData,
        date: new Date().toISOString(),
        totalStudents: planData.salon?.ogrenciler?.length || 0,
        salonCount: planData.tumSalonlar?.length || 1
      };

      await db.savePlan(updatedPlan);
      logger.info('🔄 Mevcut geçici plan güncellendi');

      // Otomatik temizlik kontrolü
      await autoCleanupIfNeeded();

      return updatedPlan;
    } else {
      // Yeni geçici plan oluştur
      const newTempPlan = {
        id: `temp_${Date.now()}`,
        name: 'Geçici Plan (Drag & Drop)',
        data: planData,
        date: new Date().toISOString(),
        totalStudents: planData.salon?.ogrenciler?.length || 0,
        salonCount: planData.tumSalonlar?.length || 1
      };

      await db.savePlan(newTempPlan);
      logger.info('✨ Yeni geçici plan oluşturuldu');

      // Otomatik temizlik kontrolü
      await autoCleanupIfNeeded();

      return newTempPlan;
    }
  } catch (error) {
    logger.error('❌ Geçici plan güncellenirken hata:', error);
    throw error;
  }
};

/**
 * Firestore'da aynı salonun birden fazla kaydını temizle
 * Yalnızca admin oturumunda çalışır
 */
export const cleanupDuplicateSalons = async () => {
  try {
    const role = await getUserRole();
    if (role !== 'admin') {
      logger.info('ℹ️ Salon duplikasyon temizliği yalnızca yönetici oturumlarında çalışır. Public oturum, işlem atlandı.');
      return {
        success: true,
        deletedCount: 0,
        keptCount: 0,
        message: 'Public oturumda salon temizliği yapılmadı'
      };
    }

    await waitForAuth();
    const ownerId = getCurrentUserId();
    if (!ownerId) {
      logger.info('ℹ️ Salon temizliği için geçerli bir kullanıcı bulunamadı.');
      return {
        success: true,
        deletedCount: 0,
        keptCount: 0,
        message: 'Aktif kullanıcı bulunamadı'
      };
    }

    logger.info('🧹 Firestore salon duplikasyon temizliği başlatılıyor...');
    const salonsRef = collection(firestoreClient.db, 'salons');
    const salonsQuery = query(salonsRef, where('ownerId', '==', ownerId));
    const snapshot = await getDocs(salonsQuery);

    if (snapshot.empty) {
      logger.info('ℹ️ Firestore\'da temizlenecek salon bulunamadı.');
      return {
        success: true,
        deletedCount: 0,
        keptCount: 0,
        message: 'Temizlenecek salon bulunamadı'
      };
    }

    const seen = new Map();
    const duplicates = [];
    const scoreSalon = (salon) => {
      if (!salon) return 0;
      const masalar = Array.isArray(salon.masalar) ? salon.masalar.length : 0;
      const ogrenciler = Array.isArray(salon.ogrenciler) ? salon.ogrenciler.length : 0;
      const kapasite = Number.isFinite(salon.kapasite) ? salon.kapasite : 0;
      return (masalar * 10) + ogrenciler + kapasite;
    };

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const key = data.id || data.salonId || data.salonAdi || docSnap.id;
      const entry = {
        ref: docSnap.ref,
        id: docSnap.id,
        key,
        score: scoreSalon(data),
        updatedAt: data.updatedAt
      };

      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, entry);
      } else {
        // Daha yüksek skorlu kayıt kalsın
        if (entry.score > existing.score) {
          duplicates.push(existing);
          seen.set(key, entry);
        } else {
          duplicates.push(entry);
        }
      }
    });

    if (duplicates.length === 0) {
      logger.info('ℹ️ Firestore salon kayıtlarında duplikasyon bulunmadı.');
      return {
        success: true,
        deletedCount: 0,
        keptCount: seen.size,
        message: 'Duplikasyon bulunmadı'
      };
    }

    const batch = writeBatch(firestoreClient.db);
    duplicates.forEach(item => batch.delete(item.ref));
    await batch.commit();

    logger.info(`✅ Firestore salon duplikasyon temizliği tamamlandı. Silinen: ${duplicates.length}, Kalan: ${seen.size}`);
    return {
      success: true,
      deletedCount: duplicates.length,
      keptCount: seen.size,
      message: `${duplicates.length} salon kaydı silindi, ${seen.size} kayıt korundu`
    };
  } catch (error) {
    logger.error('❌ Salon duplikasyon temizliği sırasında hata:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Otomatik temizlik kontrolü
 * Geçici plan sayısı 5'i geçerse otomatik temizlik yapar
 */
const autoCleanupIfNeeded = async () => {
  try {
    const allPlans = await db.getAllPlans();
    const tempPlans = allPlans.filter(plan => {
      const planId = String(plan.id || '');
      const planName = String(plan.name || '');
      return planName.includes('Geçici Plan') || planId.startsWith('temp_');
    });

    const MAX_TEMP_PLANS = 5;

    if (tempPlans.length > MAX_TEMP_PLANS) {
      logger.info(`🤖 Otomatik temizlik tetiklendi: ${tempPlans.length} > ${MAX_TEMP_PLANS}`);
      const result = await cleanupTempPlans();
      logger.info(`🤖 Otomatik temizlik tamamlandı: ${result.deletedCount} plan silindi`);
    }
  } catch (error) {
    logger.error('❌ Otomatik temizlik hatası:', error);
    // Otomatik temizlik hatası ana işlemi durdurmasın
  }
};

