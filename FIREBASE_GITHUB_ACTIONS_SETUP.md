# 🔥 Firebase GitHub Actions Otomatik Deploy Kurulumu

## ✅ Workflow Dosyası Hazır!

`.github/workflows/deploy-firebase.yml` dosyası oluşturuldu. Artık her `main` branch'ine push yaptığınızda otomatik olarak Firebase'e deploy edilecek.

---

## 🔑 GEREKLİ ADIM: GitHub Secret Ekleme

Workflow'un çalışması için GitHub repository'nize Firebase token eklemeniz gerekiyor.

### Adım 1: Firebase Token Oluşturma

**Terminal'de çalıştırın:**
```bash
firebase login:ci
```

Bu komut sizin için bir token oluşturacak. Çıktı şuna benzer olacak:
```
✔  Success! Use this token to authenticate on CI servers:

1/abc123xyz456...very-long-token-here...

Example: firebase deploy --token "$FIREBASE_TOKEN"
```

### Adım 2: GitHub Secret Ekleme

1. **GitHub repository'nize gidin:** https://github.com/zapo-gh/ortaksinav
2. **Settings** sekmesine tıklayın
3. Sol menüden **Secrets and variables** → **Actions** seçin
4. **New repository secret** butonuna tıklayın
5. **Name:** `FIREBASE_TOKEN` yazın
6. **Secret:** Firebase token'ınızı yapıştırın (Adım 1'den aldığınız token)
7. **Add secret** butonuna tıklayın

✅ **Secret eklendi!**

---

## 🚀 Nasıl Çalışır?

### Otomatik Deploy:
- Her `main` branch'ine push yaptığınızda:
  1. Kod build edilir (`npm run build`)
  2. Build dosyaları kontrol edilir
  3. Firebase'e otomatik deploy edilir

### Manuel Deploy:
- GitHub Actions sekmesine gidin
- **Deploy to Firebase** workflow'unu bulun
- **Run workflow** butonuna tıklayın

---

## 🔍 Deploy Durumunu Kontrol Etme

1. GitHub repository'de **Actions** sekmesine gidin
2. **Deploy to Firebase** workflow'unu bulun
3. Deploy durumunu görebilirsiniz:
   - 🟢 Yeşil: Başarılı deploy
   - 🔴 Kırmızı: Deploy hatası (loglara bakın)

---

## 🐛 Sorun Giderme

### Problem 1: "FIREBASE_TOKEN not found"

**Sebep:** GitHub secret eklenmemiş

**Çözüm:**
- Yukarıdaki Adım 2'yi tamamlayın
- Token'ın doğru kopyalandığından emin olun

---

### Problem 2: "Permission denied"

**Sebep:** Firebase token geçersiz veya süresi dolmuş

**Çözüm:**
```bash
# Yeni token oluştur
firebase login:ci

# GitHub'da secret'ı güncelle
```

---

### Problem 3: "Build failed"

**Sebep:** npm build hatası

**Çözüm:**
- GitHub Actions loglarına bakın
- Local'de `npm run build` çalıştırarak test edin

---

## 📋 Workflow Detayları

Workflow şu adımları çalıştırır:

1. ✅ **Checkout code** - Repository'yi alır
2. ✅ **Node.js 20** - Node.js kurulumu
3. ✅ **Dependencies yükle** - `npm ci` çalıştırır
4. ✅ **Production build** - `npm run build` çalıştırır
5. ✅ **Build kontrolü** - Build dosyalarını kontrol eder
6. ✅ **Firebase CLI** - Firebase CLI kurulumu
7. ✅ **Firebase deploy** - Hosting'e deploy eder

---

## 🔗 Bağlantılar

- **Firebase Console:** https://console.firebase.google.com/project/ortak-sinav
- **Hosting URL:** https://ortak-sinav.web.app
- **GitHub Actions:** https://github.com/zapo-gh/ortaksinav/actions

---

## ✨ Özellikler

- ✅ Otomatik deploy (main branch push'unda)
- ✅ Manuel deploy (workflow_dispatch ile)
- ✅ Build kontrolü
- ✅ Hata yönetimi
- ✅ Deploy logları

---

**Son Güncelleme:** 2025-01-14  
**Durum:** ✅ **KURULUM HAZIR** - Sadece FIREBASE_TOKEN secret'ı eklenmesi gerekiyor!

