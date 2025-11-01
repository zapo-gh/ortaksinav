import db from '../database';
import logger from './logger';

/**
 * Geçici drag & drop kayıtlarını temizle
 * Akıllı limit sistemi ile maksimum 5 geçici plan tutar
 */
export const cleanupTempPlans = async () => {
  try {
    console.log('🧹 Geçici planlar temizleniyor...');
    
    // Tüm planları al
    const allPlans = await db.getAllPlans();
    console.log('📋 Tüm planlar alındı:', allPlans.length);
    
    // Geçici planları filtrele
    const tempPlans = allPlans.filter(plan => {
      // plan.id'yi string'e çevir
      const planId = String(plan.id || '');
      const planName = String(plan.name || '');
      
      const isTemp = planName.includes('Geçici Plan') || planId.startsWith('temp_');
      console.log(`🔍 Plan kontrolü: ${planId} - ${planName} - Geçici: ${isTemp}`);
      return isTemp;
    });
    
    console.log(`📊 ${tempPlans.length} geçici plan bulundu`);
    
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
      
      console.log(`🗑️ ${plansToDelete.length} eski geçici plan silinecek (${plansToKeep.length} plan korunacak)`);
      
      for (const plan of plansToDelete) {
        try {
          await db.deletePlan(plan.id);
          console.log(`✅ Eski geçici plan silindi: ${plan.id}`);
        } catch (deleteError) {
          console.error(`❌ Plan silme hatası (${plan.id}):`, deleteError);
          // Tek plan silme hatası tüm işlemi durdurmasın
        }
      }
      
      console.log(`✅ ${plansToDelete.length} eski geçici plan temizlendi, ${plansToKeep.length} plan korundu`);
      
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
      
      console.log(`🗑️ ${plansToDelete.length} plan silinecek (eski sistem)`);
      
      for (const plan of plansToDelete) {
        try {
          await db.deletePlan(plan.id);
          console.log(`✅ Geçici plan silindi: ${plan.id}`);
        } catch (deleteError) {
          console.error(`❌ Plan silme hatası (${plan.id}):`, deleteError);
        }
      }
      
      console.log(`✅ ${plansToDelete.length} geçici plan temizlendi`);
      
      return {
        success: true,
        deletedCount: plansToDelete.length,
        keptCount: 1,
        message: `${plansToDelete.length} geçici plan silindi, 1 plan korundu`
      };
    } else if (tempPlans.length === 1) {
      console.log('ℹ️ Sadece 1 geçici plan var, temizleme gerekmiyor');
      return {
        success: true,
        deletedCount: 0,
        keptCount: 1,
        message: 'Sadece 1 geçici plan var, temizleme gerekmiyor'
      };
    } else {
      console.log('ℹ️ Temizlenecek geçici plan bulunamadı');
      return {
        success: true,
        deletedCount: 0,
        keptCount: 0,
        message: 'Temizlenecek geçici plan bulunamadı'
      };
    }
    
  } catch (error) {
    console.error('❌ Geçici planlar temizlenirken hata:', error);
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
      console.log('🔄 Mevcut geçici plan güncellendi');
      
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
      console.log('✨ Yeni geçici plan oluşturuldu');
      
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
      console.log(`🤖 Otomatik temizlik tetiklendi: ${tempPlans.length} > ${MAX_TEMP_PLANS}`);
      const result = await cleanupTempPlans();
      console.log(`🤖 Otomatik temizlik tamamlandı: ${result.deletedCount} plan silindi`);
    }
  } catch (error) {
    console.error('❌ Otomatik temizlik hatası:', error);
    // Otomatik temizlik hatası ana işlemi durdurmasın
  }
};

