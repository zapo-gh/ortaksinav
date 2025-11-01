# 🚨 VERCEL - HEMEN YAPMAN GEREKENLER!

**Sorun:** Planlar farklı cihazlarda görünmüyor  
**Neden:** Firebase devre dışı

---

## ⚡ HIZLI ÇÖZÜM (2 DAKİKA)

### **1. Vercel Dashboard**
https://vercel.com/dashboard

### **2. Project Seç**
1. Ana sayfada deploy ettiğin projeyi bul
2. Project adına tıkla

### **3. Environment Variable Ekle**
1. **Settings** sekmesine tıkla (üst menü)
2. Sol menü → **"Environment Variables"**
3. **"Add New"** butonuna tıkla
4. **Key:** `REACT_APP_DISABLE_FIREBASE`
5. **Value:** `false`
6. **Environment:** Hepsi seçili olsun ✓ ✓ ✓
7. **Save**

### **4. REDEPLOY Yap**
1. **Deployments** sekmesine tıkla
2. En üstteki deploy → **⋯** (three dots)
3. **"Redeploy"** tıkla
4. 2-5 dakika bekle

### **5. Test Et**
1. Site'e git
2. F12 → Console
3. "🔥 Firebase App initialized" görünüyor mu?
4. Bir plan kaydet
5. Telefondan gir, plan görünüyor mu?

---

## 📄 DETAYLI REHBER

**VERCEL_ENV_VAR_STEPS.md** - Adım adım ekran görüntüleri ile

---

**Son Güncelleme:** 2025-11-01

