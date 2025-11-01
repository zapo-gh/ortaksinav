# 🚀 Netlify Environment Variable Ekleme Adımları

**Basit ve Detaylı Rehber**

---

## 📋 ADIM ADIM YAPMAN GEREKENLER

### **1. Netlify'a Git**
```
https://app.netlify.com
```

### **2. Site'ı Seç**
- Ana sayfada deploy ettiğin site'ı bul
- Site adına tıkla (örn: `kelebek-sinav.netlify.app`)

### **3. Site Settings Aç**
- Üst menüde **"Site settings"** (⚙️) butonuna tıkla
- Veya site detay sayfasında **"Site settings"** linkine tıkla

### **4. Environment Variables Sekmesi**
Sol menüde şu sekmeleri göreceksin:
```
- General
- Domain management
- Build & deploy
- Environment
- Functions
- Split testing
...
```

**Bu sekmelerden birini seç:**
- **"Environment"** sekmesine tıkla
- **VEYA** **"Build & deploy"** → **"Environment"** alt sekmesine tıkla

### **5. Environment Variables Listesi**
Bir tablo göreceksin:
```
Key                         Value    Scopes     Actions
(boş)                       (boş)    All builds
```

**Eğer hiç environment variable yoksa boş olabilir!**

### **6. "Add a variable" Butonu**
- **"Add a variable"** butonuna tıkla (sağ üstte veya tablo üstünde)

### **7. Variable Bilgilerini Gir**

**Yeni bir form açılacak:**

**Key (Değişken Adı):**
```
REACT_APP_DISABLE_FIREBASE
```
⚠️ **Dikkat:** Büyük/küçük harfe duyarlı! Tam olarak bu şekilde!

**Value (Değer):**
```
false
```
⚠️ **Dikkat:** Küçük harf `false`! Tırnak kullanma!

**Scopes (Kapsam):**
- **"All builds"** seçili olsun
- Veya **"Production"** seçebilirsin

### **8. Save / Add Variable**
- **"Add variable"** veya **"Save"** butonuna tıkla

✅ **Environment variable eklendi!**

---

## 🔄 REDEPLOY YAP (ÇOK ÖNEMLİ!)

Environment variable eklendikten sonra **MUTLAKA** yeniden deploy etmen gerek!

### **Seçenek 1: Otomatik Redeploy (ÖNERİLEN)**

1. Hâlâ Environment variables sayfasındasın
2. Sayfanın üstünde veya tablo üstünde **"Redeploy site"** butonunu ara
3. **"Redeploy site"** tıkla
4. Onayla

### **Seçenek 2: Manuel Redeploy**

1. Netlify ana sayfaya dön
2. **"Deploys"** tab'ına tıkla (üst menü)
3. **"Trigger deploy"** butonunu bul
4. **"Deploy site"** tıkla
5. **"Publish deploy"** tıkla

### **Seçenek 3: GitHub Actions (Otomatik)**

Eğer GitHub Actions kuruluysa:
1. Koduna küçük bir değişiklik yap (örn: README'ye boş satır)
2. Commit ve push et
3. GitHub Actions otomatik deploy yapar

---

## ✅ TEST

### **1. Console Kontrolü**
1. Deploy tamamlandıktan sonra (5-10 dakika)
2. Site'e git: https://your-site.netlify.app
3. **F12** tuşuna bas (Browser Developer Tools)
4. **Console** sekmesine tıkla
5. Şu mesajları ara:

**✅ BAŞARILI:**
```
🔥 Firebase App initialized
🔥 Firestore DB initialized
```

**❌ SORUN:**
```
🔧 Firebase disabled for development
```

**Eğer "Firebase disabled" görüyorsan:**
- Environment variable yanlış eklenmiş olabilir
- Veya redeploy yapılmamış

### **2. Plan Kaydetme Testi**
1. Bir plan oluştur
2. Kaydet
3. Console'da şunu ara:
```
💾 Firestore: Plan meta kaydediliyor...
✅ Firestore: Plan kaydedildi: <planId>
```

### **3. Farklı Cihaz Testi**
1. Telefon/Tablet'ten aynı URL'e git
2. **"Kayıtlı Planlar"** tab'ına tıkla
3. Plan görünüyor mu?

✅ **Görünüyorsa:** Firebase sync çalışıyor!
❌ **Görünmüyorsa:** Tekrar kontrol et

---

## 🔍 SORUN GİDERME

### **Problem 1: "Add variable" Butonu Bulamıyorum**

**Olası Sebepler:**
- Farklı bir sayfadasın
- Permissions eksik

**Çözüm:**
1. Site settings → Environment sekmesine tekrar git
2. Eğer "Environment" sekmesi görünmüyorsa:
   - Netlify Team Owner/Admin yetkisi gerekli
   - Veya farklı Netlify planı gerekebilir

### **Problem 2: Variable Eklenmiyor**

**Olası Sebepler:**
- Yanlış key/value formatı
- Tarayıcı cache sorunu

**Çözüm:**
1. Hard refresh: **Ctrl+F5** (Windows) veya **Cmd+Shift+R** (Mac)
2. Farklı tarayıcı dene
3. Variable'ı tekrar ekle

### **Problem 3: Redeploy Yapamıyorum**

**Olası Sebepler:**
- Deploy zaten çalışıyor
- Permissions eksik

**Çözüm:**
1. Deploys tab'ında mevcut deploayı bekle
2. Deploy bittikten sonra yeniden dene

### **Problem 4: Firebase Hâlâ Devre Dışı**

**Olası Sebepler:**
- Environment variable yanlış
- Redeploy yapılmamış
- Cache sorunu

**Çözüm:**
1. Environment variables listesini kontrol et
2. Key: `REACT_APP_DISABLE_FIREBASE` (büyük/küçük harf duyarlı!)
3. Value: `false` (tırnak yok, küçük harf)
4. Redeploy yap
5. Hard refresh: **Ctrl+F5**

---

## 📝 ÖNEMLİ NOTLAR

### **React Environment Variables**
- Sadece `REACT_APP_` ile başlayanlar build'e alınır
- `DISABLE_FIREBASE` → ❌ Çalışmaz
- `REACT_APP_DISABLE_FIREBASE` → ✅ Çalışır

### **Build vs Runtime**
- Environment variables **build time**'da alınır
- Runtime'da değişiklik yapılamaz
- Her değişiklikte **YENİDEN BUILD** gerekir

### **Value Format**
- String değer: `false`
- Boolean değer: Tırnak kullanma!
- `"false"` → String (YANLIŞ!)
- `false` → Boolean (DOĞRU!)

### **Cache Sorunları**
- Browser cache'i temizle
- Hard refresh: **Ctrl+F5**
- Incognito mode'da test et

---

## 🎯 BAŞARILI AKIŞ

```
1. Netlify'a git
2. Site seç
3. Site settings → Environment
4. "Add a variable"
5. Key: REACT_APP_DISABLE_FIREBASE, Value: false
6. Save
7. REDEPLOY yap (çok önemli!)
8. 5-10 dakika bekle
9. Site'e git, F12 → Console
10. "Firebase initialized" görünmeli
11. Plan kaydet
12. Farklı cihazda test et
13. Plan görünüyor mu? ✅
```

---

## 🔗 BAĞLANTILAR

- **Netlify Dashboard:** https://app.netlify.com
- **Netlify Docs:** https://docs.netlify.com/environment-variables/overview/
- **FIREBASE_NETLIFY_FIX.md** - Detaylı çözüm
- **FIREBASE_TROUBLESHOOTING.md** - Troubleshooting

---

**Son Güncelleme:** 2025-11-01

