# ℹ️ Firebase Project ID Değiştirilemez

**Soru:** Proje adını "ortaksinav" yaptım ama domain hâlâ "ortak-sinav", değiştirebilir miyim?  
**Cevap:** ❌ **HAYIR!** Project ID değiştirilemez!

---

## 🔍 NEDEN?

### **Firebase Kuralları:**

**Project Name:**
- ✅ Değiştirilebilir
- ✅ Sadece görünüm
- ✅ Firebase Console'da görünür

**Project ID:**
- ❌ **DEĞİŞTİRİLEMEZ!**
- 🔒 Oluşturulduktan sonra sabit
- 🌐 URL'de kullanılır

---

## 📊 FARK NEDİR?

### **Project Name vs Project ID:**

| Özellik | Project Name | Project ID |
|---------|-------------|------------|
| **Değişir mi?** | ✅ Evet | ❌ Hayır |
| **Kullanım** | Görünüm | URL, Domain |
| **Firebase Console** | "ortaksinav" | "ortak-sinav" |
| **URL'de görünür** | ❌ Hayır | ✅ Evet |

### **Mevcut Durum:**

**Project Name:** ortaksinav (görünüme göre)  
**Project ID:** ortak-sinav (domain)  
**URL:** https://ortak-sinav.web.app

---

## 🚨 ÖNEMLİ: SORUN YOK!

### **Bu Normal ve Doğru:**

- ✅ Project name değiştirmek yeterli
- ✅ ID "ortak-sinav" kalabilir
- ✅ Site çalışıyor
- ✅ Firestore bağlantısı var

**Neden endişelenmeyelim?**
- ID değiştirmek gereksiz
- Mevcut yapılandırma çalışıyor
- Tüm bağlantılar "ortak-sinav" ID'sini kullanıyor

---

## 🤔 DEĞİŞTİRMEK ZORUNDA MISIN?

### **Hayır! İşte Neden:**

**Mevcut Yapı:**
```
Project Name: ortaksinav (Firebase Console'da görünür)
Project ID: ortak-sinav (Teknik olarak kullanılır)
URL: https://ortak-sinav.web.app ✅
Database: ortak-sinav ✅
```

**SORUN YOK!** Her şey çalışıyor.

---

## 💡 ID DEĞİŞTİRMEK GERÇEKTEN İSTİYORSAN

### **⚠️ ÇOK ZOR VE RİSKLİ!**

**Seçenek 1: Yeni Proje Oluştur**

**Adım Adım:**

1. **Yeni Firebase Projesi:**
   - Firebase Console → Add project
   - Project ID: "ortaksinav" (arzu ettiğin ID)
   - Konum: Aynı bölge

2. **Yeni Config:**
   - `src/config/firebaseConfig.js` güncelle
   - Tüm config'leri değiştir

3. **Veri Migrasyonu:**
   - Firestore Rules → Copy
   - Tüm koleksiyonları export/import et
   - Tüm planları manuel olarak yeniden oluştur

4. **Deploy:**
   - Yeni projeye deploy et
   - Custom domain yeniden bağla (eğer varsa)

**⏱️ Süre:** 2-3 saat  
**⚠️ Risk:** Veri kaybı!  
**💰 Maliyet:** Sabaha kadar uğraş!

---

## ✅ ÖNERİ: DEĞİŞTİRME!

### **Neden?**
- ✅ Şu an her şey çalışıyor
- ✅ ID değiştirmek gereksiz
- ✅ Risk ve zaman kaybı
- ✅ Veri kaybı riski

### **Alternatif:**

**Custom Domain Kullan:**
- Kendi domain'in varsa
- Firebase'e bağla
- `kelebek-sinav.com` gibi olur
- URL daha güzel görünür

**Nasıl?**
1. Firebase Console → Hosting
2. Add custom domain
3. DNS kayıtlarını ekle
4. SSL otomatik aktif

---

## 🎯 SONUÇ

### **Şu Anki Durum:**
- ✅ **DOĞRU!** ID değiştirmene gerek yok
- ✅ Project name yeterli
- ✅ Her şey çalışıyor

### **Değiştirmek İstiyorsan:**
- ⚠️ Yeni proje oluştur
- ⚠️ Tüm veriyi taşı
- ⚠️ 2-3 saat uğraş
- ❌ **ÖNERMEM!**

### **En İyisi:**
- ✅ Custom domain ekle
- ✅ URL daha profesyonel olur
- ✅ ID değiştirmeye gerek yok

---

## 📝 ÖNEMLİ NOTLAR

### **Project ID:**
- Proje oluştururken verilir
- Sonradan değiştirilemez
- Firebase'in kuralı
- Google'ın kuralı

### **URL'ler:**
```
https://ortak-sinav.web.app        ← Mevcut URL
https://ortak-sinav.firebaseapp.com ← Alternatif URL
```

Her ikisi de aynı siteyi gösterir, fark yok!

---

**Sonuç:** ❌ **Project ID'yi değiştirme, gereksiz!** Her şey çalışıyor. 👍

---

**Son Güncelleme:** 2025-11-01  
**Durum:** ✅ **Her Şey Normal**

