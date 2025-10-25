import db from '../database/database';
import logger from './logger';

/**
 * Geçici drag & drop kayıtlarını temizle
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
    
    // En son geçici planı hariç tut, diğerlerini sil
    if (tempPlans.length > 1) {
      // Tarihe göre sırala (en yeni en son)
      const sortedTempPlans = tempPlans.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0);
        const dateB = new Date(b.date || b.createdAt || 0);
        return dateB - dateA;
      });
      
      // En son geçici planı koru, diğerlerini sil
      const plansToDelete = sortedTempPlans.slice(1);
      
      console.log(`🗑️ ${plansToDelete.length} plan silinecek`);
      
      for (const plan of plansToDelete) {
        try {
          await db.deletePlan(plan.id);
          console.log(`✅ Geçici plan silindi: ${plan.id}`);
        } catch (deleteError) {
          console.error(`❌ Plan silme hatası (${plan.id}):`, deleteError);
          // Tek plan silme hatası tüm işlemi durdurmasın
        }
      }
      
      console.log(`✅ ${plansToDelete.length} geçici plan temizlendi`);
    } else if (tempPlans.length === 1) {
      console.log('ℹ️ Sadece 1 geçici plan var, temizleme gerekmiyor');
    } else {
      console.log('ℹ️ Temizlenecek geçici plan bulunamadı');
    }
    
    return {
      success: true,
      deletedCount: tempPlans.length > 1 ? tempPlans.length - 1 : 0,
      keptCount: tempPlans.length > 0 ? 1 : 0
    };
    
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
      return newTempPlan;
    }
  } catch (error) {
    logger.error('❌ Geçici plan güncellenirken hata:', error);
    throw error;
  }
};

