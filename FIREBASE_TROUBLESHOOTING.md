# 🔥 Firebase Sorun Giderme Rehberi

**Durum:** Planlar farklı cihazlarda görünmüyor  
**Tarih:** 2025-10-31

---

## 📋 ADIM ADIM DİAGNOSTİK

### **ADIM 1: Browser Console Kontrolü**

1. Netlify site'e git (deploy edilen URL)
2. **F12** → **Console**
3. Şu mesajları ara:

**✅ Firebase Aktif (Normal):**
```
🔥 Firebase App initialized
🔥 Firestore DB initialized
```

**❌ Firebase Devre Dışı (SORUN!):**
```
🔧 Firebase disabled for development - using localStorage only
```

**Eğer "Firebase disabled" görünüyorsa:** Environment variable eksik!

---

### **ADIM 2: Environment Variable Kontrolü**

1. Netlify → Site settings → **Environment variables**
2. Aşağıdaki değişken var mı?

| Key | Value |
|-----|-------|
| `REACT_APP_DISABLE_FIREBASE` | `false` |

**Yoksa ekle:**
1. **"Add a variable"** tıkla
2. Key: `REACT_APP_DISABLE_FIREBASE`
3. Value: `false`
4. **"Add variable"**
5. **"Deploy settings"** → **"Trigger deploy"** → **"Deploy site"**

---

### **ADIM 3: Yeniden Deploy**

Environment variable ekledikten sonra:

1. Netlify → **Deploys** tab'ı
2. **"Trigger deploy"** → **"Deploy site"**
3. ~5 dakika bekle
4. Site'e git
5. Console'da tekrar kontrol et

---

### **ADIM 4: Firebase Console Kontrolü**

1. https://console.firebase.google.com/project/ortak-sinav/firestore
2. **Firestore Database** → **Data**
3. Koleksiyonları kontrol et:
   - `plans` - Planlar burada mı?
   - `students` - Öğrenciler burada mı?
   - `salons` - Salonlar burada mı?
   - `settings` - Ayarlar burada mı?

**Eğer boşsa:** Environment variable hâlâ devrede değil veya Firestore rules engelliyor!

---

### **ADIM 5: Firestore Rules Kontrolü**

1. Firebase Console → Firestore Database → **Rules**
2. Şu kurallar olmalı:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Eğer farklıysa:** `firestore.rules` dosyasını deploy et:
```bash
firebase deploy --only firestore:rules
```

---

### **ADIM 6: Test Planı Oluştur**

1. Site'e git
2. Birkaç öğrenci ekle
3. Bir plan oluştur
4. **"Planı Kaydet"** → Plan adı gir
5. Console'da şunu ara:

**✅ Başarılı:**
```
💾 Firestore: Plan meta kaydediliyor...
✅ Firestore: Plan kaydedildi: <planId>
```

**❌ Başarısız:**
```
🔧 Firebase disabled - savePlan skipped
```

---

### **ADIM 7: Farklı Cihaz Testi**

1. Telefon/Tablet'ten aynı URL'e git
2. **"Kayıtlı Planlar"** tab'ı
3. Plan görünüyor mu?

**✅ Görünüyorsa:** Firebase sync çalışıyor!  
**❌ Görünmüyorsa:** Firebase hâlâ devre dışı!

---

## 🔍 SORUN TESPİTİ

### **Problem 1: Environment Variable Build'e Yansımıyor**

**Semptomlar:**
- Console'da "Firebase disabled"
- Firebase Console'da veri yok

**Çözüm:**
1. Netlify → Environment variables
2. `REACT_APP_DISABLE_FIREBASE` yoksa ekle
3. Değer `false` olmalı
4. **Trigger deploy**

---

### **Problem 2: Firestore Rules Engelliyor**

**Semptomlar:**
- Console'da Firebase başlatıldı
- Firebase Console'da veri var
- Ama farklı cihazda göremiyorsun

**Çözüm:**
1. Firebase Console → Rules
2. Rules'ı kontrol et
3. Eğer kısıtlıysa, `firestore.rules` deploy et:
```bash
firebase deploy --only firestore:rules
```

---

### **Problem 3: Database Import Karışıklığı**

**Semptomlar:**
- `planManager` IndexedDB kullanıyor
- Firestore kullanmıyor

**Durum:** ✅ **DÜZELTILDI**
- `src/utils/planManager.js` → `import db from '../database'` (Firestore adapter)

---

### **Problem 4: Mock Firebase Kullanılıyor**

**Semptomlar:**
- Console'da "using localStorage only"
- `db.mock = true`

**Neden:**
- `DISABLE_FIREBASE === true`
- veya Firebase initialize failed

**Çözüm:**
1. Environment variable kontrolü
2. Firebase Console'da project aktif mi?
3. API keys doğru mu?

---

## 🎯 HIZLI ÇÖZÜM

Eğer hiçbir şey işe yaramadıysa:

1. **Netlify → Environment variables** → Sil ve yeniden ekle:
   - `REACT_APP_DISABLE_FIREBASE` → `false`
2. **Trigger deploy**
3. Console'da kontrol et
4. Firebase Console'da kontrol et
5. Farklı cihazda test et

---

## 📝 NOTLAR

### **React Build Environment Variables**

React environment variables `REACT_APP_` prefix gerektirir:
- ✅ `REACT_APP_DISABLE_FIREBASE`
- ❌ `DISABLE_FIREBASE`

### **Build Time vs Runtime**

Environment variables **build time**'da alınır, **runtime**'da değil!

**Yani:**
- Environment variable ekle
- **YENİDEN BUILD** et
- Deploy et

---

## 🔗 ÖNEMLI BAĞLANTILAR

- **Firebase Console:** https://console.firebase.google.com/project/ortak-sinav
- **Netlify Dashboard:** https://app.netlify.com
- **Netlify Deploys:** https://app.netlify.com/sites/YOUR_SITE/deploys

---

**Son Güncelleme:** 2025-10-31

