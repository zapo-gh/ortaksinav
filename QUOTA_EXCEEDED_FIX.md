# 🚨 Firestore Quota Exceeded - ÇÖZÜM

**Problem:** "Quota exceeded" hatası alıyorsun  
**Sebep:** 527 test planı Firestore'daki günlük quota'yı aşmış

---

## ⚡ ACİL ÇÖZÜM (HEMEN!)

### **1. Firebase Console'a Git**
```
https://console.firebase.google.com/project/ortak-sinav/usage
```

### **2. Quota Durumunu Kontrol Et**
- Üst menüden **"Usage"** sekmesine tıkla
- **"Firestore"** bölümünü aç
- Hangisi quota'yı aşıyor?
  - Reads: 50,000/day
  - Writes: 20,000/day
  - Deletes: 20,000/day

### **3. Test Planlarını Temizle**

**Hızlı Çözüm:**
1. Firebase Console → **Firestore Database**
2. `plans` collection aç
3. **"All documents"** tıkla
4. **Select all** → **Delete**
5. Onayla

⚠️ **DİKKAT:** Bu işlem **TÜM PLANLARI** siler!

---

## 🛠️ ALTERNATİF ÇÖZÜMLER

### **Yöntem 1: IndexedDB Kullan (Geçici)**

Firebase'yi geçici olarak kapat, sadece IndexedDB kullan:

**Local ortamda (.env.local dosyası oluştur):**
```bash
REACT_APP_DISABLE_FIREBASE=true
```

**Production'da:**
Firebase Hosting'de environment variable ekleyemeyiz, bu yüzden kodu geçici olarak değiştirmek gerekiyor.

### **Yöntem 2: Firebase Tarife Yükselt**

1. Firebase Console → **Project Settings** → **Usage and Billing**
2. **Blaze Plan**'a upgrade et
3. Pay-as-you-go

**Ücretsiz Limitler:**
- Firestore Reads: 50,000/day
- Firestore Writes: 20,000/day
- Storage: 5GB

### **Yöntem 3: Temizlik Scripti**

Firebase Console'dan test planlarını temizle:

**Adım Adım:**
1. https://console.firebase.google.com/project/ortak-sinav/firestore
2. `plans` collection aç
3. Tüm planları seç
4. Delete

---

## 📊 QUOTA DURUMU

### **Firestore Quota Limits (Free Tier)**

| İşlem | Günlük Limit | Sınır Aşımı |
|-------|-------------|-------------|
| Reads | 50,000 | ✅ 527 plan * 10 read ≈ 5,270 |
| Writes | 20,000 | ⚠️ 527 plan oluşturma çok fazla |
| Deletes | 20,000 | ✅ Temizlik için yeterli |
| Storage | 1GB | ⚠️ 527 plan çok yer kaplar |

### **Sorun Analizi:**

527 test plan her açılışta:
- Her plan için `getDocs()` call → **527 read**
- Eğer her plan için salonlar yükleniyorsa → **527 * sayı read**
- Total: **5,000+ read per load!**

**Çözüm:** Test planları sil, quota normale döner.

---

## ✅ KALICI ÇÖZÜM

### **1. Firebase Temizliği Yap**
Firebase Console → Firestore → plans → Delete all

### **2. Temizlik Politikası Ekle**
```javascript
// Geçici planları otomatik temizle
- 7 günden eski planlar
- "Test" içeren planlar
- Boş planlar
```

### **3. Firestore Optimizasyonu**
- Gereksiz read'leri azalt
- Cache kullan
- Batch operations

---

## 🔄 SONRAKI ADIMLAR

### **Hemen:**
1. Firebase Console → Firestore
2. Test planları sil
3. Quota normale döner

### **Uzun Vadede:**
1. Temizlik politikası ekle
2. Otomatik silme sistemi
3. Firebase Blaze Plan (opsiyonel)

---

## 📝 NOTLAR

### **Firebase Free Tier Yeterli mi?**

**Şu anki Durum:**
- 500+ öğrenci
- 12 salon
- Yerleşik planları

**Hesaplama:**
- Her plan: ~5-10 read
- Günlük 50,000 read limit
- Yaklaşık 5,000-10,000 plan yükleyebilirsin (faizli)

**SORUN:** 527 test plan + 7 açılış = 3,689 read

**ÇÖZÜM:** Test planları sil → Limit normale döner

---

**Son Güncelleme:** 2025-11-01

