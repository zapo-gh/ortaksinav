# 🚨 Quota Exceeded - Console'da Görünmüyor!

**Sorun:** Firebase Console'da "Quota exceeded" var, plans collection görünmüyor  
**Neden:** Firestore günlük limit aşıldı, UI bloke oldu

---

## ⚡ ÇÖZÜM: Firebase CLI ile Temizlik

Console bloke, CLI ile temizle!

---

## 🔧 ADIM ADIM ÇÖZÜM

### **1. Firebase CLI Login**

```bash
firebase login
```

Browser açılır, Google hesabınla giriş yap.

---

### **2. Firestore'e Bağlan**

```bash
firebase firestore:query plans
```

Bu komut 527 planı gösterir (veya hata verir).

---

### **3. Alternatif: Firestore Export**

CLI ile export yap, sonra import et:

```bash
# Export yap
firebase firestore:export gs://ortak-sinav.appspot.com/backup

# Import et (boş database'e)
firebase firestore:import gs://ortak-sinav.appspot.com/backup
```

⚠️ Bu method çalışmayabilir (quota bloke).

---

## 🎯 EN KOLAY ÇÖZÜM: BEKLE!

### **Firebase Quota Yenilenme**

**Ne Zaman?**
- ⏰ Her gün **00:00 UTC** (Türkiye saati ile **03:00**)
- 📅 Takvim günü bazlı
- 🔄 Otomatik

**Şu An:** 2025-11-01 09:34 UTC  
**Yenilenme:** 2025-11-01 00:00 UTC (14 saat sonra)

---

### **Yarın Yap:**

**Adım 1: Bekle**
- ⏰ 00:00 UTC'yi bekle (yarın)
- 📊 Quota sıfırlanacak

**Adım 2: Console'a Git**
- Firebase Console: https://console.firebase.google.com/project/ortak-sinav/firestore
- "Quota exceeded" kaybolur
- Plans collection görünür

**Adım 3: Temizlik**
- Plans collection aç
- Tüm planları seç
- Delete
- Onayla

---

## 🤔 BAŞKA ÇÖZÜM VAR MI?

### **Seçenek 1: Firebase CLI Delete (Denenecek)**

```bash
# Firestore'e bağlan
firebase firestore:query plans --limit 10

# Sonuç gelirse, delete script yaz
node cleanup-firestore.js
```

**cleanup-firestore.js:**
```javascript
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function cleanup() {
  const plansRef = db.collection('plans');
  const snapshot = await plansRef.get();
  
  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log('✅ 527 plan silindi');
}

cleanup();
```

⚠️ **Firebase Admin SDK gerekli, quota bloke ise çalışmayabilir!**

---

### **Seçenek 2: Firebase Support**

Google Firebase'e destek talebi aç:
1. Firebase Console → Support
2. "Quota exceeded" mesajı
3. "Help me delete test data"

⏳ Cevap: 1-2 gün

---

### **Seçenek 3: Firebase Blaze Plan**

Blaze Plan'a geç → Quota sınırları kalkar:
1. Firebase Console → Usage and Billing
2. "Upgrade to Blaze"
3. Pay-as-you-go

💰 **Ücret:** İlk 50K read/write ücretsiz!

---

## 📊 QUOTA DURUMU

### **Şu Anki Limiti Aşan İşlem:**

**Reads:** 33K / 50K (66%)  
**Writes:** 21K / 20K (⚠️ **105% AŞILMIŞ!**)  
**Deletes:** 1.5K / 20K (7%)

**Sorun:** Writes quota aşılmış → Firestore bloke!

---

## ⏰ BEKLEME SÜRESİ

### **Ne Zaman Çözülür?**

**UTC:** 2025-11-01 00:00 (14 saat 26 dakika)  
**Türkiye:** 2025-11-01 03:00 (sabah)

**Şu An:** 09:34 UTC  
**Kalan:** ~14 saat

---

## 💡 ÖNERİ

### **En Kolay:** BEKLE!

1. ⏰ Yarın 03:00'de uyan (veya sabah kontrol et)
2. 🌐 Firebase Console'a git
3. ✅ "Quota exceeded" kaybolur
4. 🗑️ Plans collection'ı aç, sil
5. 🔥 Firebase'i tekrar aktif et

**Alternatif:**
- Upgrade to Blaze Plan (quota kalkar)
- Firebase Support'a yaz (1-2 gün)

---

## ⚠️ ÖNEMLİ NOTLAR

### **Şu An Ne Yapmalı?**
- ✅ BEKLE - Quota yarın sıfırlanacak
- ✅ Site çalışıyor (Firebase kapalı)
- ⏸️ Firebase işlemleri durdu
- ✅ Veriler IndexedDB'de güvende

### **Yarın Ne Yapacaksın?**
1. Firebase Console → Firestore
2. Plans collection → Delete all
3. `src/config/firebaseConfig.js` → `DISABLE_FIREBASE = false`
4. Deploy

---

**Son Güncelleme:** 2025-11-01  
**Durum:** ⏳ **Quota beklemede (yarın sıfırlanacak)**

