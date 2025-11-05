# 📊 Firestore Öğrenci Bilgileri Güncelleme Raporu

## 🔍 Firestore'a Öğrenci Bilgileri Ne Zaman Güncelleniyor?

### 1. **Otomatik Güncellemeler (Debounced)**

#### `ExamContext.js` - `useEffect` Hook (Satır 821-872)
```javascript
// Öğrenci listesi değiştiğinde otomatik olarak Firestore'a kaydet
useEffect(() => {
  // Debounce timer'ı temizle
  if (saveStudentsTimerRef.current) {
    clearTimeout(saveStudentsTimerRef.current);
  }

  // 500ms debounce ile Firestore'a kaydet
  saveStudentsTimerRef.current = setTimeout(async () => {
    try {
      await db.saveStudents(state.ogrenciler);
    } catch (error) {
      logger.error('Öğrenci kaydetme hatası:', error);
    }
  }, 500);

  // Cleanup
  return () => {
    if (saveStudentsTimerRef.current) {
      clearTimeout(saveStudentsTimerRef.current);
    }
  };
}, [state.ogrenciler]);
```

**Özellikler:**
- `state.ogrenciler` değiştiğinde otomatik tetiklenir
- 500ms debounce ile çok sık kayıt önlenir
- Component unmount olduğunda timer temizlenir

### 2. **Manuel Güncellemeler (Action-based)**

#### `examReducer` içinde `saveToStorage` çağrıları:

#### a) `OGRENCILER_YUKLE` Action (Satır 430-441)
```javascript
case ACTIONS.OGRENCILER_YUKLE:
  // Öğrenci listesi yüklendiğinde
  saveToStorage('exam_ogrenciler', newState.ogrenciler);
```

**Ne zaman:** Excel'den öğrenci listesi yüklendiğinde

#### b) `OGRENCILER_EKLE` Action (Satır 440)
```javascript
case ACTIONS.OGRENCILER_EKLE:
  // Yeni öğrenciler eklendiğinde
  saveToStorage('exam_ogrenciler', newState.ogrenciler);
```

**Ne zaman:** Yeni öğrenciler eklendiğinde

#### c) `OGRENCI_SIL` Action (Satır 460-467)
```javascript
case ACTIONS.OGRENCI_SIL:
  // Öğrenci silindiğinde
  saveToStorage('exam_ogrenciler', newState.ogrenciler);
```

**Ne zaman:** Bir öğrenci silindiğinde

#### d) `OGRENCILER_TEMIZLE` Action (Satır 469-476)
```javascript
case ACTIONS.OGRENCILER_TEMIZLE:
  // Tüm öğrenciler temizlendiğinde
  saveToStorage('exam_ogrenciler', newState.ogrenciler);
```

**Ne zaman:** Tüm öğrenci listesi temizlendiğinde

#### e) `OGRENCI_PIN` Action (Satır 478-492)
```javascript
case ACTIONS.OGRENCI_PIN:
  // Öğrenci sabitlendiğinde (pinned)
  saveToStorage('exam_ogrenciler', newState.ogrenciler);
```

**Ne zaman:** Bir öğrenci belirli bir salona/masaya sabitlendiğinde

#### f) `OGRENCI_UNPIN` Action (Satır 493-507)
```javascript
case ACTIONS.OGRENCI_UNPIN:
  // Öğrenci sabitlemesi kaldırıldığında
  saveToStorage('exam_ogrenciler', newState.ogrenciler);
```

**Ne zaman:** Öğrenci sabitlemesi kaldırıldığında

### 3. **Firestore Kaydetme Akışı**

```
saveToStorage('exam_ogrenciler', value)
  ↓
DatabaseAdapter.saveStudents(students) (src/database/index.js:312)
  ↓
FirestoreClient.saveStudents(students) (src/database/firestoreClient.js:628)
  ↓
Firestore 'students' koleksiyonuna yazma
```

### 4. **FirestoreClient.saveStudents İşlemleri**

#### Kaydetme Süreci (Satır 628-734):
1. **Duplicate Kontrolü**: Aynı ID veya numaraya sahip öğrenciler filtrelenir
2. **Eski Kayıtları Silme**: Yeni listede olmayan öğrenciler Firestore'dan silinir
3. **Batch Kaydetme**: Öğrenciler 500'lük chunk'lar halinde batch write ile kaydedilir
4. **Pinned Bilgileri**: `pinned`, `pinnedSalonId`, `pinnedMasaId` bilgileri de kaydedilir

### 5. **Önemli Notlar**

#### ✅ İyi Yanlar:
- Otomatik senkronizasyon (500ms debounce ile)
- Duplicate kontrolü
- Batch write ile performanslı kayıt
- Pinned bilgileri korunuyor

#### ⚠️ Dikkat Edilmesi Gerekenler:
- **Debounce Süresi**: 500ms - çok hızlı değişikliklerde son değişiklik kaydedilir
- **Firestore Disabled**: Eğer Firestore devre dışıysa (`DISABLE_FIREBASE=true`), kayıt yapılmaz
- **IndexedDB Mirror**: Firestore'a kayıt başarılı olursa IndexedDB'ye de mirror yapılır (offline için)

### 6. **Örnek Senaryolar**

#### Senaryo 1: Excel'den Öğrenci Yükleme
```
1. Kullanıcı Excel dosyası yükler
2. OGRENCILER_YUKLE action dispatch edilir
3. saveToStorage çağrılır → Anında Firestore'a kaydedilir
4. useEffect hook → 500ms sonra tekrar kayıt (redundant ama güvenli)
```

#### Senaryo 2: Öğrenci Silme
```
1. Kullanıcı bir öğrenciyi siler
2. OGRENCI_SIL action dispatch edilir
3. saveToStorage çağrılır → Anında Firestore'a kaydedilir
4. FirestoreClient.saveStudents → Eski öğrenci Firestore'dan silinir
```

#### Senaryo 3: Öğrenci Sabitleme (Pin)
```
1. Kullanıcı bir öğrenciyi belirli bir salona sabitler
2. OGRENCI_PIN action dispatch edilir
3. saveToStorage çağrılır → Anında Firestore'a kaydedilir
4. FirestoreClient.saveStudents → pinned, pinnedSalonId, pinnedMasaId kaydedilir
```

### 7. **Kod Konumları**

| İşlem | Dosya | Satır |
|-------|-------|-------|
| Otomatik Güncelleme (useEffect) | `src/context/ExamContext.js` | 821-872 |
| Manuel Güncellemeler (saveToStorage) | `src/context/ExamContext.js` | 17-58 |
| DatabaseAdapter | `src/database/index.js` | 312-338 |
| FirestoreClient | `src/database/firestoreClient.js` | 628-734 |

### 8. **Sonuç**

Firestore'daki öğrenci bilgileri:
- ✅ Her öğrenci değişikliğinde (ekleme, silme, güncelleme) güncellenir
- ✅ 500ms debounce ile otomatik senkronize edilir
- ✅ Duplicate kontrolü yapılır
- ✅ Pinned bilgileri korunur
- ✅ Eski kayıtlar otomatik temizlenir

**Toplam Güncelleme Noktaları: 7**
1. Otomatik (useEffect - debounced)
2. Öğrenci Yükleme
3. Öğrenci Ekleme
4. Öğrenci Silme
5. Öğrencileri Temizleme
6. Öğrenci Pin
7. Öğrenci Unpin

