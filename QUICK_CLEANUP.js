// Firebase Test Planları Temizleme Script
// Kullanım: Browser console'da çalıştır (https://ortak-sinav.web.app açıkken)

(async () => {
  console.log('🧹 Firestore temizliği başlatılıyor...');
  
  try {
    // Firebase modüllerini dinamik import et
    const { collection, getDocs, deleteDoc, doc, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    
    // Firebase config
    const firebaseConfig = {
      apiKey: "AIzaSyD_JswuXY8RpjpKdl1PFMC0KjNKVdKeSRM",
      authDomain: "ortak-sinav.firebaseapp.com",
      projectId: "ortak-sinav",
      storageBucket: "ortak-sinav.firebasestorage.app",
      messagingSenderId: "934298174753",
      appId: "1:934298174753:web:f180f6fc6c1325c462aa60",
      measurementId: "G-LNTKBMG6HN"
    };
    
    // Firebase initialize
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    // Plans collection al
    const plansRef = collection(db, 'plans');
    const snapshot = await getDocs(plansRef);
    
    console.log(`📊 Toplam ${snapshot.size} plan bulundu`);
    
    // Test plan pattern'leri
    const testPatterns = [
      'Test Plan',
      'Test',
      'Minimal Plan',
      'Plan 1',
      'Plan 2',
      'Valid Plan'
    ];
    
    const plansToDelete = [];
    const plansToKeep = [];
    
    snapshot.docs.forEach(planDoc => {
      const plan = planDoc.data();
      const planName = plan.name || '';
      
      // Test plan mı kontrol et
      const isTestPlan = testPatterns.some(pattern => 
        planName.includes(pattern)
      );
      
      if (isTestPlan) {
        plansToDelete.push({ id: planDoc.id, name: planName });
      } else {
        plansToKeep.push({ id: planDoc.id, name: planName });
      }
    });
    
    console.log(`🗑️ Silinecek: ${plansToDelete.length} plan`);
    console.log(`✅ Tutulacak: ${plansToKeep.length} plan`);
    
    if (plansToKeep.length > 0) {
      console.log('\n✅ Tutulacak planlar:');
      plansToKeep.forEach(p => console.log(`  - ${p.name}`));
    }
    
    // Onay iste
    const confirmed = confirm(
      `🔴 DİKKAT: ${plansToDelete.length} test planı silinecek!\n\n` +
      `Silinecek: ${plansToDelete.length}\n` +
      `Tutulacak: ${plansToKeep.length}\n\n` +
      `Devam etmek istiyor musun?`
    );
    
    if (!confirmed) {
      console.log('❌ İşlem iptal edildi');
      return;
    }
    
    // Batch delete (Firestore limit: 500 operations per batch)
    const BATCH_SIZE = 500;
    let totalDeleted = 0;
    
    for (let i = 0; i < plansToDelete.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = plansToDelete.slice(i, i + BATCH_SIZE);
      
      chunk.forEach(plan => {
        const planDocRef = doc(db, 'plans', plan.id);
        batch.delete(planDocRef);
      });
      
      await batch.commit();
      totalDeleted += chunk.length;
      
      console.log(`✅ ${totalDeleted}/${plansToDelete.length} plan silindi`);
    }
    
    console.log(`\n🎉 Tamamlandı! ${totalDeleted} test planı temizlendi`);
    
  } catch (error) {
    console.error('❌ Hata:', error);
    alert('Temizlik hatası: ' + error.message);
  }
})();

