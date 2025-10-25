# 🧪 TEST RAPORU - KELEBEK SINAV SİSTEMİ

## 📋 TEST PLANI

### ✅ YAPILMASI GEREKEN TESTLER

#### 1. Logger Utility Testi
**Amaç:** Logger'ın development/production modlarında doğru çalıştığını doğrula

**Test Adımları:**
1. Tarayıcıda `http://localhost:3000` adresini aç
2. Tarayıcı konsolunu aç (F12)
3. Konsola bak - logger mesajları görünüyor mu?
4. Aşağıdaki mesajları ara:
   - `🧠 Akıllı salon havuzu oluşturuluyor...`
   - `🎯 EŞİT DAĞITIM: X öğrenci, Y salon`
   - `🔄 Context: State güncellendi`

**Beklenen Sonuç:**
- ✅ Development modda (npm start): Tüm logger mesajları görünmeli
- ✅ Production modda (npm run build): Sadece error mesajları görünmeli

**Test Durumu:** ⏳ Bekliyor

---

#### 2. Uygulama Başlatma Testi
**Amaç:** Uygulamanın hatasız başladığını doğrula

**Test Adımları:**
1. Terminal'de `npm start` çalıştır
2. Tarayıcıda `http://localhost:3000` aç
3. Ana sayfa yükleniyor mu?
4. Konsolda hata var mı?

**Beklenen Sonuç:**
- ✅ Uygulama başarıyla yüklenmeli
- ✅ Ana sayfa görünmeli
- ✅ Konsolda kritik hata olmamalı
- ⚠️ Logger mesajları görünmeli (development mod)

**Test Durumu:** ⏳ Bekliyor

---

#### 3. Öğrenci Yükleme Testi
**Amaç:** Excel import fonksiyonunun çalıştığını doğrula

**Test Adımları:**
1. "Öğrenciler" sekmesine git
2. "Excel Yükle" butonuna tıkla
3. Bir Excel dosyası seç (e-Okul formatı)
4. Dosya yükleniyor mu?
5. Öğrenciler listede görünüyor mu?
6. Konsolda logger mesajları var mı?

**Beklenen Sonuç:**
- ✅ Excel dosyası başarıyla yüklenmeli
- ✅ Öğrenciler tabloda görünmeli
- ✅ Konsolda Excel parsing logları görünmeli:
  - `Excel dosyası analiz ediliyor...`
  - `Sütun başlıkları tespit ediliyor...`
  - `Sınıf X dağıtılıyor...`

**Test Durumu:** ⏳ Bekliyor

---

#### 4. Yerleştirme Algoritması Testi
**Amaç:** Algoritmanın logger ile çalıştığını doğrula

**Test Adımları:**
1. Öğrencileri yükle (en az 50 öğrenci)
2. "Salonlar" sekmesinde salonları kontrol et
3. "Ayarlar" sekmesinde ders ekle
4. "Planlama Yap" sekmesine git
5. "Yerleştirme Yap" butonuna tıkla
6. Algoritma çalışıyor mu?
7. Konsolda logger mesajları var mı?

**Beklenen Sonuç:**
- ✅ Yerleştirme başarıyla tamamlanmalı
- ✅ Konsolda algoritma logları görünmeli:
  - `🚀 Gelişmiş yerleştirme algoritması başladı`
  - `🧠 Akıllı salon havuzu oluşturuldu`
  - `🏢 Salon X yerleştirme başladı`
  - `📊 GELİŞMİŞ İSTATİSTİK RAPORU`
- ✅ Yerleştirme sonuçları görünmeli

**Test Durumu:** ⏳ Bekliyor

---

#### 5. Drag & Drop Testi
**Amaç:** Öğrenci taşıma fonksiyonunun çalıştığını doğrula

**Test Adımları:**
1. Yerleştirme yap
2. "Salon Planı" sekmesine git
3. Bir öğrenciyi sürükle
4. Başka bir koltuğa bırak
5. Öğrenci taşındı mı?
6. Konsolda logger mesajları var mı?

**Beklenen Sonuç:**
- ✅ Öğrenci başarıyla taşınmalı
- ✅ Konsolda drag&drop logları görünmeli:
  - `🚀 Drag başladı`
  - `🎯 DroppableSeat drop`
  - `🎭 SalonPlani handleStudentMove`
  - `📞 onOgrenciSec fonksiyonu çağrılıyor`

**Test Durumu:** ⏳ Bekliyor

---

#### 6. LocalStorage Testi
**Amaç:** Veri kalıcılığının çalıştığını doğrula

**Test Adımları:**
1. Öğrencileri yükle
2. Yerleştirme yap
3. Sayfayı yenile (F5)
4. Veriler korundu mu?
5. Konsolda localStorage logları var mı?

**Beklenen Sonuç:**
- ✅ Öğrenciler korunmalı
- ✅ Yerleştirme sonuçları korunmalı
- ⚠️ Konsolda localStorage hatası olmamalı

**Test Durumu:** ⏳ Bekliyor

---

#### 7. Hata Yönetimi Testi
**Amaç:** Error handling'in çalıştığını doğrula

**Test Adımları:**
1. Öğrenci olmadan yerleştirme yapmayı dene
2. Hata mesajı görünüyor mu?
3. Hata mesajı kullanıcı dostu mu?
4. Konsolda error log var mı?

**Beklenen Sonuç:**
- ✅ Kullanıcı dostu hata mesajı görünmeli
- ✅ Konsolda error log görünmeli (logger.error)
- ✅ Uygulama çökmemeli

**Test Durumu:** ⏳ Bekliyor

---

## 📊 TEST SONUÇLARI

### Genel Durum
- **Toplam Test:** 7
- **Başarılı:** 0 ⏳
- **Başarısız:** 0 ⏳
- **Bekleyen:** 7 ⏳

### Kritik Sorunlar
- Henüz test yapılmadı

### Uyarılar
- Henüz test yapılmadı

---

## 🔍 MANUEL TEST TALİMATLARI

### Adım 1: Uygulamayı Başlat
```bash
npm start
```

### Adım 2: Tarayıcıda Aç
```
http://localhost:3000
```

### Adım 3: Konsolu Aç
- Chrome/Edge: F12 veya Ctrl+Shift+I
- Firefox: F12 veya Ctrl+Shift+K

### Adım 4: Testleri Yap
Yukarıdaki test adımlarını sırayla takip et

### Adım 5: Sonuçları Kaydet
Her test için durumu güncelle:
- ✅ Başarılı
- ❌ Başarısız
- ⚠️ Uyarı

---

## 🐛 HATA RAPORLAMA

Eğer bir hata bulursanız, aşağıdaki bilgileri kaydedin:

1. **Hata Açıklaması:** Ne oldu?
2. **Beklenen Davranış:** Ne olmalıydı?
3. **Adımlar:** Hatayı nasıl tekrar oluşturabiliriz?
4. **Konsol Logları:** Konsolda ne yazıyor?
5. **Ekran Görüntüsü:** Varsa ekleyin

---

## 📝 NOTLAR

### Logger Mesajları
Development modda aşağıdaki logger mesajlarını görebilirsiniz:
- `logger.info()` - Mavi renk
- `logger.debug()` - Gri renk
- `logger.warn()` - Sarı renk
- `logger.error()` - Kırmızı renk

### Production Modu Test
Production modda test etmek için:
```bash
npm run build
npx serve -s build
```

Sonra `http://localhost:3000` adresini aç ve konsolda sadece error mesajlarının göründüğünü doğrula.

---

## ✅ TEST TAMAMLAMA KRİTERLERİ

Testler başarılı sayılır eğer:
1. ✅ Uygulama hatasız başlıyor
2. ✅ Tüm logger mesajları development modda görünüyor
3. ✅ Logger mesajları production modda görünmüyor (sadece error)
4. ✅ Öğrenci yükleme çalışıyor
5. ✅ Yerleştirme algoritması çalışıyor
6. ✅ Drag & Drop çalışıyor
7. ✅ LocalStorage çalışıyor
8. ✅ Hata yönetimi çalışıyor

---

**Test Tarihi:** [Tarih eklenecek]  
**Test Eden:** [İsim eklenecek]  
**Versiyon:** 0.1.0
