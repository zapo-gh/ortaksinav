# 🧹 Firebase Temizlik Rehberi

**Problem:** Firestore'da 527 test planı var, temizlemek gerekiyor

---

## ⚡ HIZLI ÇÖZÜM (5 DAKİKA)

### **Firebase Console ile Manuel Temizlik**

#### **1. Firebase Console'a Git**
```
https://console.firebase.google.com/project/ortak-sinav/firestore
```

#### **2. Plans Collection'ı Aç**
- Sol menüden **"Firestore Database"** tıkla
- **"plans"** collection'ını aç

#### **3. Test Planları Seç ve Sil**

**Yöntem A: Tek tek sil**
- Her plan üzerinde **⋯** (three dots) → **"Delete"**

**Yöntem B: Filter ile sil**
1. Üst kısımda **"Add filter"** tıkla
2. Field: `name`
3. Operator: `array-contains` veya `==`
4. Value: `Test Plan` (veya başka pattern)
5. **"Add"**
6. Filtrelenmiş planları seç
7. **"Delete"** tıkla

**Yöntem C: Tümünü sil (DİKKAT!)**
1. Collection'ı seç
2. Üstte **"All documents"** tıkla
3. **"Delete"** tıkla
4. Onayla

⚠️ **DİKKAT:** Bu işlem **TÜM PLANLARI** siler!

---

## 🤖 OTOMATİK ÇÖZÜM (10 DAKİKA)

### **Firebase Console - kOD ile Filtre**

#### **Yöntem 1: CLI ile Temizlik**

```bash
# Firebase CLI login
firebase login

# Firestore'a bağlan
firebase firestore:indexes
```

**Not:** Firebase CLI ile direkt Firestore delete yapma yok, kod gerekli.

---

### **Yöntem 2: Browser Console'dan Temizlik**

#### **Adımlar:**

**1. Site'e Git**
```
https://ortak-sinav.web.app
```

**2. Console'u Aç**
```
F12 → Console
```

**3. Temizlik Scriptini Çalıştır**

⚠️ **Firebase import sorunları var, daha basit yöntem kullan!**

**YÖNTEM 1: Firebase Console (ÖNERİLEN)**
1. https://console.firebase.google.com → Firestore
2. `plans` collection aç
3. Her test plan için: Checkbox → Delete

**YÖNTEM 2: Tüm Collection'ı Sil ve Yeniden Başla**
1. Firebase Console → Firestore
2. `plans` collection → Delete collection
3. Onayla
4. Yeni plan oluştur

⚠️ **DİKKAT:** Bu tüm planları siler!

**YÖNTEM 3: Manuel Cleanup Script** (Kompleks)

```javascript
// QUICK_CLEANUP.js dosyasını kullan
// Veya FIREBASE_CLEANUP.md dosyasındaki yöntemleri takip et
```

---

## 📋 GÜVENLI TEMİZLİK

### **SADECE Test Planlarını Sil**

Firebase Console'da:

**1. Filter Ekle:**
- Field: `name`
- Operator: `==`
- Value: `Test Plan`

**2. Sonuçları Kontrol Et:**
- Kaç plan var?
- Hepsi test planı mı?

**3. Seç ve Sil:**
- Checkbox ile seç
- **"Delete"** tıkla

**4. Diğer Test Planlarını Sil:**
- Filter'ı değiştir: `Minimal Plan`
- Tekrar sil
- Filter'ı değiştir: `Plan 1`
- Tekrar sil
- Filter'ı değiştir: `Plan 2`
- Tekrar sil
- Filter'ı değiştir: `Valid Plan`
- Tekrar sil

---

## 🔍 TEMİZLİK SONRASI

### **Kontrol:**

```javascript
// Console'da çalıştır
(async () => {
  const { db } = await import('./src/firebase/config.js');
  const { collection, getDocs } = await import('firebase/firestore');
  
  const plansRef = collection(db, 'plans');
  const snapshot = await getDocs(plansRef);
  
  console.log(`📊 Toplam plan: ${snapshot.size}`);
  
  snapshot.docs.forEach(doc => {
    console.log(`- ${doc.data().name}`);
  });
})();
```

---

## 📊 ÖNERİLEN TEMİZLİK STRATEJİSİ

### **Sadece Gerçek Planları Tut**

Firebase Console'da manuel olarak:

1. **İlk 10 planı kontrol et:** Gerçek planlar var mı?
2. **Gerçek planları not et:** İsimlerini yaz
3. **Filter ile test planları seç:**
   - `Test Plan` → Sil
   - `Minimal Plan` → Sil
   - `Plan 1` → Sil
   - `Plan 2` → Sil
   - `Valid Plan` → Sil
4. **Kalan planları kontrol et:** Hepsi gerçek plan mı?
5. **Karışık planları manuel sil:** Tek tek sil

---

## ⚠️ ÖNEMLİ UYARILAR

### **⚠️ YEDEK AL!**

Silmeden önce:
1. Firebase Console → Firestore
2. Export → JSON
3. Indir ve sakla

### **⚠️ İKİ KEZ DÜŞÜN!**

Firestore silme işlemi **geri alınamaz**!

### **⚠️ PRODUCTION'da DİKKAT!**

Production ortamında temizlik yapıyorsan:
1. Yedek al
2. Test ortamında dene
3. Production'da uygula

---

## 🎯 ALTERNATIF: OTOMATİK TEMİZLİK KODU

### **src/utils/firebaseCleanup.js Oluştur:**

```javascript
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/config';
import logger from './logger';

export const cleanupTestPlans = async () => {
  try {
    const plansRef = collection(db, 'plans');
    const snapshot = await getDocs(plansRef);
    
    const testPatterns = [
      'Test Plan',
      'Test',
      'Minimal Plan',
      'Plan 1',
      'Plan 2',
      'Valid Plan'
    ];
    
    const batch = writeBatch(db);
    let deleted = 0;
    
    snapshot.docs.forEach(planDoc => {
      const planName = planDoc.data().name || '';
      const isTestPlan = testPatterns.some(pattern => 
        planName.includes(pattern)
      );
      
      if (isTestPlan) {
        const planDocRef = doc(db, 'plans', planDoc.id);
        batch.delete(planDocRef);
        deleted++;
      }
    });
    
    await batch.commit();
    logger.info(`✅ ${deleted} test planı temizlendi`);
    return deleted;
  } catch (error) {
    logger.error('❌ Temizlik hatası:', error);
    throw error;
  }
};
```

### **Kullanım:**

```javascript
import { cleanupTestPlans } from './utils/firebaseCleanup';

// Console'da
await cleanupTestPlans();
```

---

## 📊 SONUÇ

### **Önerilen Yöntem:**

**Firebase Console manuel temizlik (5 dakika):**

1. https://console.firebase.google.com/project/ortak-sinav/firestore
2. `plans` collection aç
3. Filter ekle: `name == "Test Plan"`
4. Seç ve Sil
5. Diğer test planları için tekrarla

### **Veya:**

**Browser console script (2 dakika):**

1. https://ortak-sinav.web.app aç
2. F12 → Console
3. Yukarıdaki script'i çalıştır
4. Bekle (527 plan silinecek)
5. Sonucu kontrol et

---

**Son Güncelleme:** 2025-11-01

