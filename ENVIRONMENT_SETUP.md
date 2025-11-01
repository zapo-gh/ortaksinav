# Environment Variables Setup

**Tarih:** 2025-10-31  
**Status:** ✅ Configured

---

## 📋 Environment Variables Kullanımı

### 1. **Development Mode**

```bash
# .env.local dosyası oluşturun
cp .env.example .env.local

# Development için Firebase'i disable edebilirsiniz
REACT_APP_DISABLE_FIREBASE=true
REACT_APP_DEBUG=true
```

### 2. **Production Mode**

```bash
# .env dosyası oluşturun
cp .env.example .env

# Production için Firebase aktif
REACT_APP_DISABLE_FIREBASE=false
REACT_APP_DEBUG=false
REACT_APP_VERSION=2.1
```

---

## 🔐 Gereken Environment Variables

### **Zorunlu (Production)**

| Variable | Description | Production Value |
|----------|-------------|------------------|
| `NODE_ENV` | Environment mode | `production` (auto) |
| `REACT_APP_DISABLE_FIREBASE` | Firebase disable flag | `false` |

### **Opsiyonel**

| Variable | Description | Default | Development |
|----------|-------------|---------|-------------|
| `REACT_APP_DEBUG` | Debug mode | `false` | `true` |
| `REACT_APP_VERSION` | App version | `2.0` | `2.1` |
| `REACT_APP_BUILD_DATE` | Build date | Auto | Auto |
| `REACT_APP_ENABLE_WEB_VITALS` | Web Vitals tracking | `true` | `true` |
| `REACT_APP_ENABLE_ERROR_TRACKING` | Error tracking | `true` | `true` |
| `REACT_APP_ENABLE_ANALYTICS` | Analytics | `false` | `false` |

---

## 🔥 Firebase Configuration

Firebase API keys **hardcoded** in `src/config/firebaseConfig.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD_JswuXY8RpjpKdl1PFMC0KjNKVdKeSRM",
  authDomain: "ortak-sinav.firebaseapp.com",
  projectId: "ortak-sinav",
  storageBucket: "ortak-sinav.firebasestorage.app",
  messagingSenderId: "934298174753",
  appId: "1:934298174753:web:f180f6fc6c1325c462aa60",
  measurementId: "G-LNTKBMG6HN"
};
```

**Not:** Firebase API keys client-side'da public olduğu için environment variables'a taşınmasına gerek yok.

---

## 🚀 Deployment Configuration

### **Netlify**

1. **Netlify Dashboard** → **Site Settings** → **Environment variables**
2. Set the following:
   ```
   REACT_APP_DISABLE_FIREBASE=false
   REACT_APP_DEBUG=false
   REACT_APP_VERSION=2.1
   ```
3. **Build command:** `npm run build`
4. **Publish directory:** `build`

### **Firebase Hosting**

1. **Firebase Console** → **Project Settings** → **Your apps**
2. Environment variables Netlify benzeri yapılandırılır
3. **Deploy command:** `firebase deploy --only hosting`

---

## 📝 Dosya Yapısı

```
kelebek-sinav-sistemi/
├── .env                    # Production environment (git ignore)
├── .env.local              # Development environment (git ignore)
├── .env.example            # Example file (git tracked)
├── .gitignore              
├── package.json
├── src/
│   ├── config/
│   │   ├── firebaseConfig.js   # Firebase keys (hardcoded)
│   │   └── production.js       # Production config
│   ├── utils/
│   │   ├── logger.js          # Uses NODE_ENV, REACT_APP_DEBUG
│   │   ├── errorTracker.js    # Uses NODE_ENV, REACT_APP_VERSION
│   │   └── webVitalsTracker.js # Uses NODE_ENV
│   └── index.js              # Global error handlers
```

---

## ✅ Environment Check List

### **Development**
- [x] `.env.example` dosyası mevcut
- [x] `.gitignore` içinde `.env` ve `.env.local` var
- [x] Firebase config hardcoded
- [x] `REACT_APP_DEBUG` çalışıyor
- [x] `NODE_ENV=development` otomatik set

### **Production**
- [x] Build başarılı (NODE_ENV=production)
- [x] Firebase aktif (REACT_APP_DISABLE_FIREBASE=false)
- [x] Web Vitals tracking aktif
- [x] Error tracking aktif
- [x] Logger production-safe

---

## 🧪 Testing Environment Variables

```bash
# Development mode
npm start
# NODE_ENV=development, REACT_APP_DEBUG görünür

# Production mode
npm run build
# NODE_ENV=production, sadece error'lar görünür

# Test mode
npm test
# NODE_ENV=test, logger muted
```

---

## 🔍 Environment Usage

### **1. Logger (src/utils/logger.js)**
```javascript
const isDevelopment = process.env.NODE_ENV === 'development';
const isDebug = process.env.REACT_APP_DEBUG === 'true';
```

### **2. Error Tracker (src/utils/errorTracker.js)**
```javascript
this.isEnabled = process.env.NODE_ENV === 'production';
version: process.env.REACT_APP_VERSION || '2.0'
env: process.env.NODE_ENV
```

### **3. Firebase Config (src/config/firebaseConfig.js)**
```javascript
const DISABLE_FIREBASE = process.env.REACT_APP_DISABLE_FIREBASE === 'true';
```

### **4. Web Vitals (src/utils/webVitalsTracker.js)**
```javascript
if (process.env.NODE_ENV === 'development') {
  logger.info(`📊 Web Vitals: ${metric.name}`);
}
```

---

## 🚨 Güvenlik Notları

1. ✅ **Firebase API keys public'dir** - Client-side'da hardcoded olması normal
2. ✅ **.env dosyası .gitignore içinde** - Hassas bilgiler git'e push edilmez
3. ✅ **Production build** - Environment variables build-time'da inject edilir
4. ✅ **Firebase Rules** - Firestore güvenlik kuralları aktif

---

**Son Güncelleme:** 2025-10-31  
**Status:** ✅ Complete

