/**
 * Kullanıcı Dostu Hata Mesajları
 * Tüm hata mesajları bu dosyada merkezi olarak yönetilir
 */

export const ERROR_MESSAGES = {
  // Excel Import Hataları
  EXCEL_PARSE_ERROR: {
    title: 'Excel Dosyası Okunamadı',
    message: 'Excel dosyası işlenirken bir hata oluştu. Lütfen e-Okul formatında bir dosya yükleyin.',
    suggestions: [
      'Dosyanın .xlsx veya .xls formatında olduğundan emin olun',
      'e-Okul\'dan "Öğrenci Listesi" raporunu indirin',
      'Dosyanın bozuk olmadığını kontrol edin'
    ]
  },

  VALIDATION_ERROR: {
    title: 'Doğrulama Hatası',
    message: 'Veri doğrulama işlemi başarısız oldu.',
    suggestions: [
      'Girdiğiniz verilerin doğru formatta olduğundan emin olun',
      'Zorunlu alanları doldurun',
      'Veri tiplerini kontrol edin'
    ]
  },

  ALGORITHM_ERROR: {
    title: 'Algoritma Hatası',
    message: 'Yerleştirme algoritması çalışırken bir hata oluştu.',
    suggestions: [
      'Salon ve öğrenci ayarlarını kontrol edin',
      'Kapasite sınırlamalarını gözden geçirin',
      'Daha az kısıtlayıcı ayarlar deneyin'
    ]
  },

  FILE_NOT_FOUND: {
    title: 'Dosya Bulunamadı',
    message: 'İstenen dosya bulunamadı.',
    suggestions: [
      'Dosyanın varlığını kontrol edin',
      'Dosya yolunu doğru girdiğinizden emin olun',
      'Dosya izinlerini kontrol edin'
    ]
  },

  INVALID_FORMAT: {
    title: 'Geçersiz Format',
    message: 'Dosya veya veri formatı desteklenmiyor.',
    suggestions: [
      'Desteklenen formatları kullanın',
      'Dosyayı farklı bir formatta kaydedin',
      'Format belgelerini kontrol edin'
    ]
  },

  PERMISSION_ERROR: {
    title: 'İzin Hatası',
    message: 'İşlem için gerekli izinlere sahip değilsiniz.',
    suggestions: [
      'Yönetici haklarınızla tekrar deneyin',
      'Dosya izinlerini kontrol edin',
      'Sistem yöneticinizle iletişime geçin'
    ]
  },

  TIMEOUT_ERROR: {
    title: 'Zaman Aşımı',
    message: 'İşlem zaman aşımına uğradı.',
    suggestions: [
      'İnternet bağlantınızı kontrol edin',
      'Daha küçük dosyalar kullanın',
      'Tekrar deneyin'
    ]
  },
  
  EXCEL_NO_STUDENTS: {
    title: 'Öğrenci Bulunamadı',
    message: 'Excel dosyasında öğrenci verisi bulunamadı.',
    suggestions: [
      'Dosyada "Öğrenci No", "Adı", "Soyadı" sütunları olduğunu kontrol edin',
      'e-Okul\'dan doğru raporu indirdiğinizden emin olun',
      'Excel\'de birden fazla sayfa varsa doğru sayfayı kontrol edin'
    ]
  },
  
  EXCEL_INVALID_FORMAT: {
    title: 'Geçersiz Dosya Formatı',
    message: 'Yüklenen dosya desteklenen formatta değil.',
    suggestions: [
      'Sadece .xlsx ve .xls dosyaları desteklenmektedir',
      'Dosyayı Excel\'de açıp tekrar kaydetmeyi deneyin'
    ]
  },
  
  EXCEL_COLUMN_NOT_FOUND: {
    title: 'Sütun Başlıkları Bulunamadı',
    message: 'Excel dosyasında gerekli sütun başlıkları tespit edilemedi.',
    suggestions: [
      'Dosyada "Öğrenci No", "Adı", "Soyadı", "Cinsiyet" sütunları olmalı',
      'Sütun başlıklarının ilk satırlarda olduğundan emin olun',
      'e-Okul formatını değiştirmeden kullanın'
    ]
  },

  // Yerleştirme Hataları
  PLACEMENT_NO_STUDENTS: {
    title: 'Öğrenci Listesi Boş',
    message: 'Yerleştirme yapmak için önce öğrenci eklemeniz gerekiyor.',
    suggestions: [
      'Öğrenciler sekmesinden Excel dosyası yükleyin',
      'En az 1 öğrenci eklemeniz gerekiyor'
    ]
  },
  
  PLACEMENT_NO_SALONS: {
    title: 'Salon Bulunamadı',
    message: 'Yerleştirme yapmak için en az bir aktif salon gerekiyor.',
    suggestions: [
      'Salonlar sekmesinden salon ekleyin',
      'Mevcut salonların aktif olduğundan emin olun'
    ]
  },
  
  PLACEMENT_NO_COURSES: {
    title: 'Ders Seçilmedi',
    message: 'Yerleştirme yapmak için en az bir ders seçmeniz gerekiyor.',
    suggestions: [
      'Ayarlar sekmesinden ders ekleyin',
      'Öğrencilerin hangi derslere gireceğini belirleyin'
    ]
  },
  
  PLACEMENT_CAPACITY_ERROR: {
    title: 'Kapasite Yetersiz',
    message: 'Salon kapasitesi öğrenci sayısı için yetersiz.',
    suggestions: [
      'Daha fazla salon ekleyin',
      'Salon kapasitelerini artırın',
      'Öğrenci sayısını azaltın'
    ]
  },
  
  PLACEMENT_FAILED: {
    title: 'Yerleştirme Başarısız',
    message: 'Bazı öğrenciler yerleştirilemedi. Lütfen ayarları kontrol edin.',
    suggestions: [
      'Salon kapasitesini artırın',
      'Kısıtları gevşetmeyi deneyin',
      'Yerleşmeyen öğrencileri manuel olarak yerleştirebilirsiniz'
    ]
  },

  // Genel Hatalar
  NETWORK_ERROR: {
    title: 'Bağlantı Hatası',
    message: 'İnternet bağlantınızı kontrol edin.',
    suggestions: [
      'İnternet bağlantınızın aktif olduğundan emin olun',
      'Sayfayı yenilemeyi deneyin'
    ]
  },
  
  STORAGE_ERROR: {
    title: 'Veri Kaydetme Hatası',
    message: 'Veriler kaydedilirken bir hata oluştu.',
    suggestions: [
      'Tarayıcınızın localStorage özelliğinin aktif olduğundan emin olun',
      'Tarayıcı önbelleğini temizlemeyi deneyin',
      'Farklı bir tarayıcı kullanmayı deneyin'
    ]
  },
  
  UNKNOWN_ERROR: {
    title: 'Beklenmeyen Hata',
    message: 'Bir hata oluştu. Lütfen tekrar deneyin.',
    suggestions: [
      'Sayfayı yenileyin',
      'Tarayıcı önbelleğini temizleyin',
      'Sorun devam ederse destek ekibiyle iletişime geçin'
    ]
  }
};

/**
 * Hata mesajını formatlar
 * @param {string} errorKey - ERROR_MESSAGES içindeki key
 * @param {string} additionalInfo - Ek bilgi (opsiyonel)
 * @returns {Error} Formatlanmış hata objesi
 */
export const formatError = (errorKey, additionalInfo = '') => {
  const error = ERROR_MESSAGES[errorKey] || ERROR_MESSAGES.UNKNOWN_ERROR;

  const errorMessage = additionalInfo
    ? `${errorKey}: ${error.title} - ${error.message}\n\n${additionalInfo}`
    : `${errorKey}: ${error.title} - ${error.message}`;

  const errorObj = new Error(errorMessage);
  errorObj.title = error.title;
  errorObj.suggestions = error.suggestions;
  errorObj.additionalInfo = additionalInfo;

  return errorObj;
};

/**
 * Hata mesajını string olarak döndürür
 * @param {string} errorKey - ERROR_MESSAGES içindeki key
 * @param {string} additionalInfo - Ek bilgi (opsiyonel)
 * @returns {string} Formatlanmış hata mesajı
 */
export const getErrorMessage = (errorKey, additionalInfo = '') => {
  const error = formatError(errorKey, additionalInfo);
  
  let message = `❌ ${error.title}\n\n${error.message}`;
  
  if (error.suggestions && error.suggestions.length > 0) {
    message += '\n\n✅ Çözüm Önerileri:\n';
    error.suggestions.forEach((suggestion, index) => {
      message += `${index + 1}. ${suggestion}\n`;
    });
  }
  
  return message;
};

export default ERROR_MESSAGES;
