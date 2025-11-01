# 🚀 Vercel Environment Variable Ekleme - HIZLI REHBER

**Basit ve Detaylı Adımlar**

---

## ⚡ 2 DAKİKA ÇÖZÜM

### **1. Vercel Dashboard**
```
https://vercel.com/dashboard
```

### **2. Project'i Seç**
- Ana sayfada deploy ettiğin projeyi bul
- Project adına tıkla

### **3. Settings Aç**
- Üst menüde **"Settings"** sekmesine tıkla

### **4. Environment Variables**
- Sol menüde **"Environment Variables"** sekmesine tıkla
- Veya direkt URL: `https://vercel.com/{username}/{project}/settings/environment-variables`

### **5. "Add New" Butonu**
- Sağ üstte veya tablo üstünde **"Add New"** butonunu bul
- Tıkla

### **6. Variable Bilgilerini Gir**

**Key (Değişken Adı):**
```
REACT_APP_DISABLE_FIREBASE
```
⚠️ **Dikkat:** Büyük/küçük harf duyarlılığı yok, istediğini yazabilirsin!

**Value (Değer):**
```
false
```
⚠️ **Dikkat:** Tırnak kullanma! Sadece `false` yaz

**Environment (Ortam):**
- ✅ **"Production"** → Canlı site için
- ✅ **"Preview"** → Preview build'ler için
- ✅ **"Development"** → Local development için

**Tümünü seç:** ✅ ✅ ✅

---

### **🔴 "ONLY LOWERCASE..." HATASI ALDIN MI?**

**Bu hata 3 sebepten olur:**

#### **Sebepler:**

1. **Yanlış alana yapıştırma:** Value yerine Key'e değer yapıştırmış olabilirsin
2. **Value'da tırnak:** `"false"` yerine `false` yazmalısın
3. **Boşluk:** Sonunda/sonunda boşluk karakteri olabilir

#### **Çözüm:**

**1. Key alanına:**
```
REACT_APP_DISABLE_FIREBASE
```
(Kopyala-yapıştır et, herhangi bir şey ekleme)

**2. Value alanına:**
```
false
```
(Kopyala-yapıştır et, tırnak EKLEME!)

**3. Dosyadan kopyala:**
Bu dosyayı aç, yukarıdaki metni kopyala, Vercel'e yapıştır

**4. Hâlâ çalışmıyorsa:**
- Farklı tarayıcı dene (Chrome/Firefox)
- Hard refresh: **Ctrl+F5**
- Sayfayı yeniden yükle

### **7. Save**
- **"Save"** butonuna tıkla

✅ **Environment variable eklendi!**

---

## 🔄 REDEPLOY YAP (ÇOK ÖNEMLİ!)

Environment variable eklendikten sonra **MUTLAKA** yeniden deploy etmen gerek!

### **Seçenek 1: Otomatik Redeploy (ÖNERİLEN)**

1. Hâlâ Environment Variables sayfasındasın
2. Üstte uyarı mesajı göreceksin:
```
⚠️ These variables will be applied to your next deployment.
```
3. **"Redeploy"** butonuna tıkla (eğer varsa)

### **Seçenek 2: Manuel Redeploy**

1. Ana sayfaya dön (Project overview)
2. Üst menüde **"Deployments"** sekmesine tıkla
3. En üstte (en son deploy'u bul)
4. Sağ üstte **"⋯"** (three dots) menüsüne tıkla
5. **"Redeploy"** seçeneğine tıkla
6. **"Redeploy"** onayla

### **Seçenek 3: GitHub Push**

1. Koduna küçük bir değişiklik yap
2. Commit ve push et:
```bash
git commit --allow-empty -m "trigger redeploy"
git push origin main
```
3. Vercel otomatik deploy yapar

---

## ✅ TEST

### **1. Console Kontrolü**
1. Deploy tamamlandıktan sonra (2-5 dakika)
2. Site'e git: https://your-project.vercel.app
3. **F12** → **Console** sekmesi
4. Şu mesajları ara:

**✅ BAŞARILI:**
```
🔥 Firebase App initialized
🔥 Firestore DB initialized
```

**❌ SORUN:**
```
🔧 Firebase disabled for development
```

### **2. Plan Kaydetme Testi**
1. Bir plan oluştur
2. Kaydet
3. Console'da:
```
💾 Firestore: Plan meta kaydediliyor...
✅ Firestore: Plan kaydedildi: <planId>
```

### **3. Farklı Cihaz Testi**
1. Telefon/Tablet'ten aynı URL'e git
2. **"Kayıtlı Planlar"** sekmesi
3. Plan görünüyor mu?

---

## 🖼️ GÖRSEL REHBER

### **Environment Variables Sayfası**
```
┌─────────────────────────────────────────────────┐
│  Settings  >  Environment Variables             │
├─────────────────────────────────────────────────┤
│                                                  │
│  Environment Variables                          │
│  ┌───────────────────────────────────────┐     │
│  │ Key                Value    Env       │     │
│  │ (boş liste)                            │     │
│  └───────────────────────────────────────┘     │
│                                                  │
│  [ Add New ] ← Bu butona tıkla                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

### **Add Variable Formu**
```
┌─────────────────────────────────────────────────┐
│  Add Environment Variable                       │
├─────────────────────────────────────────────────┤
│                                                  │
│  Key:  [REACT_APP_DISABLE_FIREBASE]           │
│         ↑ Buraya yapıştır                       │
│                                                  │
│  Value: [false]                                 │
│          ↑ Buraya yapıştır (tırnak yok)         │
│                                                  │
│  Environment:                                   │
│  [✓] Production                                 │
│  [✓] Preview                                    │
│  [✓] Development                                │
│  ↑ Hepsi seçili olsun                           │
│                                                  │
│  [ Cancel ]  [ Save ] ← Save tıkla             │
│                                                  │
└─────────────────────────────────────────────────┘
```

### **Deployments Sayfası**
```
┌─────────────────────────────────────────────────┐
│  Deployments                                    │
├─────────────────────────────────────────────────┤
│                                                  │
│  ✓ main@latest    a1b2c3d   2 min ago    [⋯]  │
│                    ↑                            │
│                    En üstteki en son deploy     │
│                    ⋯ → Redeploy                 │
│                                                  │
│  [ Add Domain ]  [ Settings ]  [ Insights ]     │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🔍 SORUN GİDERME

### **Problem 1: "Environment Variables" Sekmesi Göremiyorum**

**Çözüm:**
1. Project sahibi veya Team member olmalısın
2. Settings sekmesinde olmalısın
3. Sol menüyü genişlet (collapsed olabilir)

### **Problem 2: "Add New" Butonu Bulamıyorum**

**Çözüm:**
1. Sayfanın üst kısmına scroll yap
2. Sağ üstteki **"Add New"** butonunu ara
3. Hard refresh: **Ctrl+F5**

### **Problem 3: Variable Eklenmiyor**

**Çözüm:**
1. Key formatı doğru mu kontrol et
2. Value'da tırnak var mı kontrol et
3. Hard refresh yap
4. Farklı tarayıcı dene

### **Problem 4: Redeploy Butonu Yok**

**Çözüm:**
- Manuel redeploy yap:
  1. Deployments sekmesine git
  2. En üstteki deploy'u bul
  3. ⋯ menüsünden "Redeploy"

### **Problem 5: Firebase Hâlâ Devre Dışı**

**Kontrol Listesi:**
- [ ] Key: `REACT_APP_DISABLE_FIREBASE` (büyük/küçük harf duyarlı!)
- [ ] Value: `false` (tırnak yok, küçük harf)
- [ ] Environment: En az "Production" seçili
- [ ] Redeploy yapıldı mı?
- [ ] Build tamamlandı mı? (2-5 dakika bekle)
- [ ] Hard refresh: **Ctrl+F5**

---

## 📝 ÖNEMLİ NOTLAR

### **React Environment Variables**
- Sadece `REACT_APP_` ile başlayanlar build'e alınır
- `DISABLE_FIREBASE` → ❌ Çalışmaz
- `REACT_APP_DISABLE_FIREBASE` → ✅ Çalışır

### **Vercel Build Process**
1. Environment variables yüklenir
2. `npm run build` çalışır
3. Static files oluşturulur
4. Deploy edilir

**Her değişiklikte yeni build gerekir!**

### **Environment Scopes**
- **Production:** Canlı site (production.vercel.app)
- **Preview:** PR/Merge deploys (preview-xxx.vercel.app)
- **Development:** Local development (`vercel dev`)

**ÖNERİ:** Hepsi için `false` kullan!

---

## 🎯 BAŞARILI AKIŞ

```
1. Vercel Dashboard → Project
2. Settings → Environment Variables
3. "Add New"
4. Key: REACT_APP_DISABLE_FIREBASE, Value: false
5. Environment: Production ✓ Preview ✓ Development ✓
6. Save
7. Deployments → En üstteki → ⋯ → Redeploy
8. 2-5 dakika bekle
9. Site'e git, F12 → Console
10. "Firebase initialized" görünmeli
11. Plan kaydet
12. Farklı cihazda test et
13. Plan görünüyor mu? ✅
```

---

## 🔗 BAĞLANTILAR

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Docs:** https://vercel.com/docs/environment-variables
- **Project Settings:** https://vercel.com/{username}/{project}/settings

---

**Son Güncelleme:** 2025-11-01

