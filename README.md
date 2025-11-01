# Kelebek Sınav Sistemi – Üretim Hazırlığı ve Kurulum

Bu belge, sistemi gerçek kullanıma almadan önce gereken tüm adımları ve pratikleri içerir.

## 1) Hızlı Başlangıç

```bash
# Gerekli sürümler: Node 18+
npm ci
npm run build
npm start # geliştirme
```

## 2) Ortam Değişkenleri (.env)
`.env.example` içeriğini `.env` olarak kopyalayın ve yapılandırın:

**Zorunlu:**
- `REACT_APP_DISABLE_FIREBASE` - Firebase'i devre dışı bırak (development için)
  - Production: `false`
  - Development: `true` (quotayı korumak için)

**Opsiyonel:**
- `REACT_APP_DEBUG` - Debug modunu aç/kapat
  - Production: `false`
  - Development: `true`

**Not:** Firebase API keys `src/config/firebaseConfig.js` içinde hardcoded'dur (client-side olduğu için güvenlik sorunu yok).

## 3) Veri Kalıcılığı
- IndexedDB (Dexie) birincil kalıcı depolama.
- Firestore varsa otomatik senkronizasyon yapılır; kota aşımlarında IndexedDB’ye düşer.
- Otomatik temizlik: Uygulama açılışında boş/geçici planlar temizlenir.

## 4) Yayın (Deploy)
1. `npm run build`
2. Çıktıyı (`build/`) static host’a (Firebase Hosting, Netlify, Vercel, Nginx) yükleyin.
3. CDN/Proxy’de `Cache-Control: public, max-age=31536000, immutable` (hash’li dosyalar) önerilir.

## 5) Baskı/Çıktı İpuçları
- Salon İmza Listesi, Sınıf Listeleri ve Salon Planı yazdırma için sayfa kenar boşlukları “None”/“Minimum” seçilmelidir.
- A4 portre/landscape seçimleri bileşen içinde ayarlıdır.

## 6) Bakım ve Yedekleme
- Planlar IndexedDB’de saklanır; “Kayıtlı Planlar” bölümünden manuel yedekleme/temizlik yapın.
- Geçici/boş planlar açılışta otomatik temizlenir.

## 7) Sorun Giderme
- Firestore kota hatası: Sistem IndexedDB’ye otomatik düşer. İnternet geri geldiğinde planlar yüklenebilir.
- Sayfa yenileyince veri kaybı: `localStorage exam_*` anahtarları ve IndexedDB erişimi kontrol edin. Gizli modu kapatın.
- Loglar: Konsolda yerleştirme adımları, hedef salon/masa bilgileri detaylı yazdırılır.

## 8) Kalite Kontrolleri
- npm ci / build hatasız
- “Yerleşemeyen öğrenciler” için ek yerleştirme sonrası UI senkronu (plan/masalar) doğrulanır
- Kayıtlı Planlar’da boş kayıt yok
- İmza bölümü hizalamaları (metin-alt çizgi) gözle kontrol

## 9) Sürümleme
- `package.json` → version: 1.0.0
- Değişiklik özeti: IndexedDB fallback’leri; plan senkronizasyonu; imza listesi düzenleri; boş plan temizliği; log iyileştirmeleri.

## 10) Güvenlik Notları
- Firebase anahtarları `src/config/firebaseConfig.js` içinde hardcoded'dur (client-side uygulamalarda normal).
- Firestore Rules aktif (`firestore.rules` - 1MB document size limit).
- Tarayıcıda saklanan veriler yereldir; çok kullanıcılı cihazlarda planları dışa aktarın ve local verileri temizleyin.

---
Sorular için: repo Issues veya proje iletişim kanalı.
