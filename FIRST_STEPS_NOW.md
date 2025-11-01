# 🚨 HEMEN YAPMAN GEREKENLER!

**Sorun:** Planlar farklı cihazlarda görünmüyor  
**Neden:** Firebase devre dışı

---

## ⚡ HIZLI ÇÖZÜM (2 DAKİKA)

### **1. Netlify'a Git**
https://app.netlify.com

### **2. Environment Variable Ekle**
1. Site'ı seç
2. Site settings → **Environment variables**
3. **"Add a variable"** tıkla
4. **Key:** `REACT_APP_DISABLE_FIREBASE`
5. **Value:** `false`
6. Save

### **3. REDEPLOY Yap**
1. Deploys tab
2. **"Trigger deploy"** → **"Deploy site"**

### **4. Test Et**
1. Site'e git
2. F12 → Console
3. "🔥 Firebase App initialized" görünüyor mu?
4. Bir plan kaydet
5. Telefondan gir, plan görünüyor mu?

---

## 📄 DETAYLI REHBERLER

- **FIREBASE_NETLIFY_FIX.md** - Detaylı çözüm adımları
- **NETLIFY_DEPLOYMENT_GUIDE.md** - Deployment guide
- **FIREBASE_TROUBLESHOOTING.md** - Troubleshooting

---

**Son Güncelleme:** 2025-10-31

