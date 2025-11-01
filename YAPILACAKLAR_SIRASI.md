# 📋 YAPILACAKLAR SIRASI - SADECE ŞİMDİ!

**Durum:** Firebase Console'da "Quota exceeded" var, temizlik yapamıyorsun

---

## ⏰ ŞU AN (BEKLE!)

### **Ne Yapmalı?**

**Cevap:** ❌ **HİÇBİR ŞEY!**  
**Sebep:** Firebase quota aşılmış, yarın sıfırlanacak

---

## 📅 YARIN SABAH (03:00 TÜRKİYE SAATİ)

### **Adım 1: Firebase Console'a Git**

URL: https://console.firebase.google.com/project/ortak-sinav/firestore

**Kontrol:**
- ✅ "Quota exceeded" mesajı gitmeli
- ✅ Firestore database görünmeli
- ✅ Plans collection görünmeli

---

### **Adım 2: Tüm Test Planlarını Sil**

1. Sol menüden **"Firestore Database"** tıkla
2. **"plans"** collection'ı bul
3. Sağ üstte **"All documents"** checkbox'ını tıkla
4. Hepsini seç
5. **"Delete"** butonuna tıkla
6. Onayla

⏱️ **Süre:** 2 dakika

---

### **Adım 3: Firebase'i Yeniden Aktif Et**

**Dosya:** `src/config/firebaseConfig.js`

**Değiştir:**
```javascript
const DISABLE_FIREBASE = false; // Geçici olarak true yapmıştık
```

---

### **Adım 4: Build ve Deploy**

```bash
npm run build
firebase deploy --only hosting
```

⏱️ **Süre:** 5 dakika

---

## ✅ TAMAMLANDI!

**Sonuç:**
- ✅ Firebase aktif
- ✅ Test planları silindi
- ✅ Quota normale döndü
- ✅ Site çalışıyor
- ✅ Multi-device sync çalışır

---

## 🎯 ÖZET

### **Şu An:**
- ⏰ **BEKLE** - Yarın 03:00'ü bekle
- ✅ Site çalışıyor
- ✅ Veriler IndexedDB'de

### **Yarın:**
1. ⏰ 03:00'de uyan (veya sabah)
2. 🌐 Firebase Console → Firestore
3. 🗑️ Plans → Delete all
4. 🔧 Firebase'i aktif et
5. 🚀 Deploy et

**Toplam Süre:** 10 dakika

---

**Detaylar:** `QUOTA_EXCEEDED_TEMIZLIK.md`

