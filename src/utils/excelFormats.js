/**
 * Excel Format Tanımları
 * Farklı e-Okul ve okul yönetim sistemi formatlarını tanımlar
 */

export const EXCEL_FORMATS = {
  E_OKUL_CLASSIC: {
    name: 'Klasik e-Okul Formatı',
    description: 'Eski e-Okul sisteminden indirilen öğrenci listesi',
    headerRow: 3, // Başlıkların bulunduğu satır (0-indexed)
    dataStartRow: 4, // Veri başlangıç satırı (0-indexed)
    columns: { numara: 1, adi: 2, soyadi: 6, cinsiyet: 10 },
    classHeaderPattern: /T\.C\./, // Sınıf başlığı tespit deseni
    classExtractPattern: /(\d+)\.\s*Sınıf\s*\/\s*(\w+)\s*Şubesi/, // Sınıf bilgisi çıkarma deseni
    priority: 1 // Tespit önceliği (düşük sayı = yüksek öncelik)
  },

  E_OKUL_NEW: {
    name: 'Yeni e-Okul Formatı',
    description: 'Güncel e-Okul sisteminden indirilen öğrenci listesi',
    headerRow: 2,
    dataStartRow: 3,
    columns: { numara: 0, adi: 1, soyadi: 2, cinsiyet: 3 },
    classHeaderPattern: /Sınıf:/,
    classExtractPattern: /(\d+)-(\w+)/,
    priority: 2
  },

  ALTERNATIVE_FORMAT: {
    name: 'Alternatif Format',
    description: 'Bazı okullarda kullanılan alternatif öğrenci listesi formatı',
    headerRow: 1,
    dataStartRow: 2,
    columns: { numara: 2, adi: 3, soyadi: 4, cinsiyet: 5 },
    classHeaderPattern: /Sınıf\s*Listesi/,
    classExtractPattern: /(\d+)\s*\/\s*(\w+)/,
    priority: 3
  },

  COMPACT_FORMAT: {
    name: 'Kompakt Format',
    description: 'Sadece temel bilgiler içeren kompakt liste',
    headerRow: 0,
    dataStartRow: 1,
    columns: { numara: 0, adi: 1, soyadi: 2, cinsiyet: 3 },
    classHeaderPattern: /(^\d+-[A-Z]$)/,
    classExtractPattern: /(\d+)-(\w+)/,
    priority: 4
  },

  MANUAL_FORMAT: {
    name: 'Manuel Format',
    description: 'Otomatik tespit edilemeyen manuel oluşturulan liste',
    autoDetect: true,
    minHeaders: 3,
    flexibleColumns: true,
    headerRow: 0,
    dataStartRow: 1,
    priority: 5
  }
};

/**
 * Excel dosyasındaki formatı tespit eder
 */
export const detectExcelFormat = (jsonData) => {
  // Öncelik sırasına göre formatları dene
  const sortedFormats = Object.entries(EXCEL_FORMATS)
    .sort(([,a], [,b]) => a.priority - b.priority);

  for (const [formatKey, format] of sortedFormats) {
    if (isFormatMatch(jsonData, format)) {
      return { ...format, key: formatKey };
    }
  }

  // Hiçbiri uymazsa manuel formatı döndür
  return { ...EXCEL_FORMATS.MANUAL_FORMAT, key: 'MANUAL_FORMAT' };
};

/**
 * Verilen formatın veriye uyup uymadığını kontrol eder
 */
const isFormatMatch = (jsonData, format) => {
  try {
    // Veri kontrolü
    if (!jsonData || jsonData.length < format.dataStartRow + 1) {
      return false;
    }

    // Başlık satırı kontrolü
    const headerRow = jsonData[format.headerRow];
    if (!headerRow || headerRow.length < 3) {
      return false;
    }

    // Sınıf başlığı tespiti
    if (format.classHeaderPattern) {
      let hasClassHeader = false;
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && row[0] && format.classHeaderPattern.test(row[0].toString())) {
          hasClassHeader = true;
          break;
        }
      }
      if (!hasClassHeader) return false;
    }

    // Temel sütunların varlığı kontrolü
    const sampleDataRow = jsonData[format.dataStartRow];
    if (!sampleDataRow || sampleDataRow.length < 3) {
      return false;
    }

    // En azından numara ve ad sütunlarının veri içermesi
    const numaraCol = format.columns.numara;
    const adiCol = format.columns.adi;

    if (numaraCol !== undefined && adiCol !== undefined) {
      const numaraValue = sampleDataRow[numaraCol];
      const adiValue = sampleDataRow[adiCol];

      if (!numaraValue || !adiValue) return false;

      // Basit validasyon
      const numaraStr = numaraValue.toString().trim();
      const adiStr = adiValue.toString().trim();

      if (numaraStr.length < 1 || adiStr.length < 2) return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Format bilgilerini döndürür
 */
export const getFormatInfo = (formatKey) => {
  return EXCEL_FORMATS[formatKey] || EXCEL_FORMATS.MANUAL_FORMAT;
};

/**
 * Tüm desteklenen formatları listeler
 */
export const getSupportedFormats = () => {
  return Object.entries(EXCEL_FORMATS)
    .filter(([, format]) => !format.autoDetect)
    .map(([key, format]) => ({
      key,
      name: format.name,
      description: format.description,
      priority: format.priority
    }))
    .sort((a, b) => a.priority - b.priority);
};
