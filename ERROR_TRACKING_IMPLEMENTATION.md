# Error Tracking Implementation

**Tarih:** 2025-10-31  
**Durum:** Tamamlandı ✅

---

## ✅ Yapılanlar

### 1. **Error Tracker Utility**
**Dosya:** `src/utils/errorTracker.js`

Kapsamlı, ücretsiz error tracking sistemi:
- ✅ Global error handling (`window.addEventListener('error')`)
- ✅ Unhandled promise rejection tracking
- ✅ localStorage persistence (son 50 error)
- ✅ Otomatik batching ve flushing
- ✅ Session ve user tracking
- ✅ Error gruplama ve raporlama
- ✅ Environment context bilgileri
- ✅ Production/Development mod desteği

**Özellikler:**
```javascript
// Error track et
errorTracker.trackError(error, { component: 'ComponentName', action: 'actionName' });

// Error raporu al
const report = errorTracker.getErrorReport();

// Error history temizle
errorTracker.clearHistory();
```

### 2. **ErrorBoundary Entegrasyonu**
**Dosya:** `src/components/ErrorBoundary.js`

- ✅ errorTracker entegrasyonu
- ✅ Mevcut logging korundu
- ✅ Component bazlı tracking

### 3. **Global Error Handlers**
**Dosya:** `src/index.js`

- ✅ Window error event listener
- ✅ Unhandled rejection tracking
- ✅ Otomatik error logging

---

## 📊 Error Data Yapısı

```javascript
{
  // Error bilgileri
  message: "Error message",
  name: "ErrorType",
  stack: "Full stack trace",
  
  // Context bilgileri
  context: {
    component: "ComponentName",
    action: "actionName",
    userId: "user_id",
    sessionId: "session_id"
  },
  
  // Environment bilgileri
  environment: {
    url: "https://app.com/page",
    userAgent: "Browser user agent",
    platform: "Platform info",
    language: "tr-TR",
    onLine: true,
    timestamp: "2025-10-31T...",
    timestampMs: 1730390400000
  },
  
  // Uygulama bilgileri
  app: {
    version: "2.0",
    env: "production",
    buildDate: "2025-10-31"
  }
}
```

---

## 🔍 Kullanım Örnekleri

### Manuel Error Tracking

```javascript
import errorTracker from './utils/errorTracker';

try {
  // Risky operation
  performOperation();
} catch (error) {
  errorTracker.trackError(error, {
    component: 'ComponentName',
    action: 'operation',
    additionalData: { /* custom data */ }
  });
}
```

### Error Raporu

```javascript
// Son 20 error'u al
const report = errorTracker.getErrorReport(20);

console.log(report.total); // Toplam error sayısı
console.log(report.byType); // Tip bazında gruplama
console.log(report.byComponent); // Component bazında gruplama
console.log(report.errors); // Detaylı error listesi
console.log(report.lastError); // Son error
```

### Error History

```javascript
// localStorage'dan error'ları al
const errors = errorTracker.getStoredErrors();

// Error history temizle
errorTracker.clearHistory();
```

---

## 🎯 Otomatik Tracking

Error Tracker otomatik olarak şunları track eder:

1. **ErrorBoundary Errors**
   - React component hatası
   - Component stack trace
   - Component adı

2. **Global JavaScript Errors**
   - Catch edilmemiş errors
   - Filename, line, column bilgileri

3. **Promise Rejections**
   - Unhandled promise rejections
   - Async operation hataları

4. **Production Errors**
   - localStorage persistence
   - Otomatik batching
   - Error grouping

---

## 📁 LocalStorage Structure

```json
{
  "error_logs": [
    {
      "message": "Error message",
      "name": "TypeError",
      "stack": "Full stack trace",
      "context": {
        "component": "SalonPlani",
        "action": "render"
      },
      "environment": {
        "url": "https://app.com/salon-plani",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2025-10-31T12:00:00.000Z",
        "timestampMs": 1730390400000
      },
      "app": {
        "version": "2.0",
        "env": "production"
      }
    }
  ]
}
```

---

## 🔧 Configuration

### Environment Variables

```bash
# .env
REACT_APP_DEBUG=false  # Error tracking her zaman aktif
NODE_ENV=production     # Production mode
```

### Customization

Error Tracker'ı özelleştirebilirsiniz:

```javascript
// Dosya: src/utils/errorTracker.js

class ErrorTracker {
  constructor() {
    this.maxQueueSize = 50;        // Kuyruk boyutu
    this.batchSize = 5;            // Toplu gönderim boyutu
    this.flushInterval = 60000;    // Flush interval (ms)
    this.maxStoredErrors = 50;     // localStorage'da saklanan max error
  }
}
```

---

## 🚀 Future Enhancements (Opsiyonel)

### Custom Endpoint Support

```javascript
// errorTracker.js içinde aktif et
async sendToEndpoint(errors) {
  try {
    const response = await fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errors })
    });
    return response.ok;
  } catch (e) {
    logger.error('Failed to send errors:', e);
    return false;
  }
}
```

### Sentry Entegrasyonu

```javascript
// Sentry yükleyin
npm install @sentry/react

// import edin
import * as Sentry from "@sentry/react";

// ErrorTracker'da kullanın
trackError(error, context) {
  Sentry.captureException(error, {
    contexts: { react: { componentStack: context.componentStack } },
    tags: { component: context.component },
    extra: context
  });
}
```

### Firebase Analytics

```javascript
// Firebase Analytics entegrasyonu
import { logEvent } from 'firebase/analytics';

trackError(error, context) {
  logEvent(analytics, 'exception', {
    description: error.message,
    fatal: false,
    custom_key: context.component
  });
}
```

---

## 📁 Değiştirilen Dosyalar

1. ✅ `src/utils/errorTracker.js` - Yeni utility (oluşturuldu)
2. ✅ `src/components/ErrorBoundary.js` - errorTracker entegrasyonu
3. ✅ `src/index.js` - Global error handlers

---

## ✅ Test Sonuçları

- ✅ Build başarılı
- ✅ Lint hatası yok
- ✅ Test sayısı: 199 pass
- ✅ Production-ready

---

## 🎯 Production Deployment

Error Tracking otomatik olarak aktif:
- ✅ Development: Console logging + localStorage
- ✅ Production: localStorage persistence + auto-flush
- ✅ Her hata otomatik olarak kaydedilir
- ✅ No additional configuration needed

**Not:** Error Tracker `src/index.js`'de otomatik initialize ediliyor, ekstra işlem gerekmez.

---

## 📊 Error Report Örneği

```javascript
{
  total: 15,
  recent: 5,
  byType: {
    "TypeError": 8,
    "ReferenceError": 4,
    "Unknown": 3
  },
  byComponent: {
    "SalonPlani": 7,
    "PlanlamaYap": 5,
    "Global": 3
  },
  errors: [ /* Recent errors */ ],
  lastError: { /* Last error details */ }
}
```

