# 🚀 Netlify Deployment Rehberi - GitHub Actions ile

**Tarih:** 2025-10-31  
**Versiyon:** 2.1

---

## 📋 ADIM ADIM DEPLOYMENT

### **ADIM 1: Netlify'da Site Oluştur**

#### **1.1 Netlify'e Git**
1. https://app.netlify.com adresine git
2. "Sign up" veya "Log in" yap (GitHub ile)

#### **1.2 Site Oluştur**
1. Ana sayfada **"Add new site"** → **"Import an existing project"**
2. **GitHub** seç ve repo'nu bağla
3. **Build settings** (önemli!):
   - **Build command:** `npm run build`
   - **Publish directory:** `build`
   - **Base directory:** (boş bırak)
4. **"Deploy site"** tıkla

#### **1.3 İlk Deploy**
- Netlify otomatik deploy yapar
- Site URL'i alınır (örn: `kelebek-sinav.netlify.app`)

---

### **ADIM 2: Netlify Auth Token & Site ID Alma**

#### **2.1 Personal Access Token (ÖNEMLİ!):**
1. Netlify ana sayfa → **Avatar** (sağ üst) → **"User settings"**
2. Sol menü → **"Applications"** tab'ı
3. **"Personal access tokens"** → **"New access token"**
4. **Token adı:** `github-actions-deploy`
5. **"Generate token"** → Token'ı hemen kopyala! (bir daha görünmez)
6. ⚠️ Bu token'ı kaydet, GitHub Secrets'e ekleyeceğiz!

#### **2.2 Site ID Alma:**
1. Netlify ana sayfa
2. Site'ı seç (deploy edilen site)
3. **"Site settings"** (üst menü)
4. **"General"** → **"Site details"**
5. **Site ID** kopyala (örn: `abc123-def456-ghi789`)

---

### **ADIM 3: GitHub Secrets Ekleme**

#### **3.1 GitHub Repo'ya Git**
1. https://github.com → Projene git

#### **3.2 Settings → Secrets**
1. **Settings** (repo'da, üst menü)
2. Sol menü → **"Secrets and variables"** → **"Actions"**

#### **3.3 İki Secret Ekle**

**Secret 1: NETLIFY_AUTH_TOKEN**
1. **"New repository secret"**
2. **Name:** `NETLIFY_AUTH_TOKEN`
3. **Value:** (2.1'de kopyaladığın token)
4. **"Add secret"**

**Secret 2: NETLIFY_SITE_ID**
1. Tekrar **"New repository secret"**
2. **Name:** `NETLIFY_SITE_ID`
3. **Value:** (2.2'de kopyaladığın Site ID)
4. **"Add secret"**

✅ **Secrets eklendi!**

---

### **ADIM 4: Workflow Dosyası Hazır**

✅ **Workflow dosyası zaten hazır:**
- `.github/workflows/deploy-netlify.yml`

**Kontrol:**
```bash
ls -la .github/workflows/deploy-netlify.yml
```

---

### **ADIM 5: Commit ve Push**

```bash
# Workflow dosyasını git'e ekle
git add .github/workflows/deploy-netlify.yml NETLIFY_DEPLOYMENT_GUIDE.md

# Commit et
git commit -m "feat: add Netlify deployment with GitHub Actions"

# Push et
git push origin main
```

---

### **ADIM 6: İlk Deploy'i İzle**

#### **6.1 GitHub Actions**
1. GitHub → **"Actions"** tab'ı
2. **"Deploy to Netlify"** workflow'u görünecek
3. Workflow çalışıyor olmalı
4. Logları izle:
   - ✅ Checkout code
   - ✅ Node.js 20
   - ✅ Bağımlılıkları yükle
   - ✅ Production build
   - ✅ Build başarılı!
   - ✅ Deploy to Netlify

#### **6.2 Netlify'da Kontrol**
1. Netlify → **"Deploys"** tab'ı
2. Yeni deploy görünecek (manuel değil, GitHub Actions tarafından)
3. Status: ✅ **Published**

#### **6.3 Site'i Test Et**
1. Site URL'e git (örn: `kelebek-sinav.netlify.app`)
2. Site çalışıyor mu kontrol et
3. Console'da hata var mı?

✅ **İlk deploy başarılı!**

---

### **ADIM 7: Otomatik Deploy Testi**

#### **7.1 Küçük Bir Değişiklik**
```bash
# README.md'ye bir satır ekle
echo "" >> README.md
echo "## Deployed via GitHub Actions" >> README.md
echo "Last deploy: $(date)" >> README.md

# Commit ve push
git add README.md
git commit -m "test: trigger auto-deploy"
git push origin main
```

#### **7.2 Deploy'i İzle**
1. GitHub Actions → workflow çalışıyor
2. ~5-10 dakika bekle
3. Netlify → yeni deploy oluştu
4. Site'da değişiklik görünüyor mu?

✅ **Otomatik deploy çalışıyor!**

---

## 🎯 OTOMATIK DEPLOY AKIŞI

```
GitHub Push (main branch)
    ↓
GitHub Actions Trigger
    ↓
Checkout code
    ↓
Node.js kurulumu & npm ci
    ↓
npm run build
    ↓
Build başarılı → Deploy to Netlify
    ↓
Site Live! ✅
```

**Süre:** ~5-10 dakika

---

## 🔧 SORUN GİDERME

### **Deploy Fail Olursa**

#### **1. GitHub Actions Logları**
```bash
# Actions tab → failed job → logs
# Hata mesajını oku
```

**Yaygın Hatalar:**

**Build Hatası:**
```
❌ Build başarısız - index.html bulunamadı
```
**Çözüm:** Local'de `npm run build` çalışıyor mu kontrol et

**Auth Token Hatası:**
```
Error: Invalid authentication token
```
**Çözüm:** `NETLIFY_AUTH_TOKEN` doğru mu? Token expire olmuş mu?

**Site ID Hatası:**
```
Error: Site not found
```
**Çözüm:** `NETLIFY_SITE_ID` doğru mu? Netlify'da site var mı?

---

### **Workflow Çalışmıyorsa**

**Kontrol Et:**
1. ✅ `deploy-netlify.yml` dosyası commit edildi mi?
2. ✅ GitHub Secrets eklendi mi?
3. ✅ `main` branch'e push edildi mi?
4. ✅ GitHub Actions enabled mi? (Settings → Actions → General)

---

### **Deploy Başarılı Ama Site Çalışmıyor**

**Kontrol Et:**
1. Site URL doğru mu?
2. Console'da hata var mı?
3. Firebase config doğru mu?
4. Network sekmesinde 404/500 var mı?

**Çözüm:**
- Netlify → Deploys → failed deploy'u kontrol et
- Logs sekmesinde hata mesajı var mı?

---

## 🎨 ÖZELLEŞTİRMELER

### **Environment Variables (Opsiyonel)**

Eğer environment variables kullanmak istersen:

**GitHub Secrets'e ekle:**
- `REACT_APP_DISABLE_FIREBASE=false`
- `REACT_APP_DEBUG=false`

**Workflow'da kullan:**
```yaml
env:
  NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
  NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
  REACT_APP_DISABLE_FIREBASE: false
  REACT_APP_DEBUG: false
```

---

### **Deploy Mesajı Özelleştirme**

```yaml
deploy-message: "Deploy from GitHub: ${{ github.event.head_commit.message }}"
```

---

### **Sadece Belirli Branch'lerde Deploy**

```yaml
on:
  push:
    branches: [ main, production ]
```

---

## 📊 DEPLOYMENT MONITORING

### **GitHub Actions**
- Her push'ta otomatik deploy
- Deploy başarı/hata durumu
- Build süreleri
- Logları inceleme

### **Netlify Dashboard**
- Deploy geçmişi
- Site analytics (opsiyonel)
- Environment variables
- Site logs
- Build logs

---

## ✅ BAŞARI KRİTERLERİ

### **Deploy Başarılı İse:**
✅ GitHub Actions: ✅ green check  
✅ Netlify Deploys: Live  
✅ Site URL: Çalışıyor  
✅ Console: No errors

---

## 🔗 ÖNEMLI LİNKLER

- **Netlify Dashboard:** https://app.netlify.com
- **GitHub Actions:** https://github.com/your-repo/actions
- **Netlify Docs:** https://docs.netlify.com
- **Actions Netlify Plugin:** https://github.com/nwtgck/actions-netlify

---

## 📝 NOTLAR

### **İlk Kez Deploy**
- Netlify'da site oluşturulmalı
- GitHub secrets eklenmeli
- Workflow dosyası commit edilmeli

### **Her Push'ta**
- Otomatik deploy yapılır
- Build süresi: ~3-5dk
- Deploy süresi: ~1-2dk

### **Rollback**
- Netlify → Deploys → eski deploy'u "Publish"
- GitHub'dan commit revert et
- Workflow tekrar deploy eder

---

**Son Güncelleme:** 2025-10-31  
**Durum:** ✅ Ready to Deploy
