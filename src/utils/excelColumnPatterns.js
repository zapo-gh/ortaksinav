/**
 * Excel Sütun Başlığı Desenleri
 * Farklı e-Okul formatlarındaki sütun başlıklarını tanımlar
 */

export const COLUMN_PATTERNS = {
  numara: [
    'öğrenci no', 'numara', 'no', 'öğrenci numarası', 'ogrenci no',
    'student no', 'student number', 's.no', 's no', 'öğr no',
    'ogr no', 'num', 'no:', 'öğrenci no:', 'student id', 'id',
    'öğrenci no', 'ogrenci no', 'öğr no', 'ogr no', 'student no',
    'student number', 's.no', 's no', 'numara', 'no', 'num',
    'ogrenci no', 'ogr no', 'student no', 'student number', 's.no', 's no',
    'ogrenci̇ no', 'ogrenci no', '1 ogrenci no'
  ],

  adi: [
    'adı', 'ad', 'isim', 'öğrenci adı', 'ogrenci adi', 'name',
    'first name', 'ad soyad', 'adı soyadı', 'isim soyisim',
    'adı soyadı', 'full name', 'student name', 'öğr adı',
    'ogr adi', 'ad', 'isim', 'name', 'first name', 'adi',
    '2 adi', '3 adi', '4 adi'
  ],

  soyadi: [
    'soyadı', 'soyad', 'surname', 'last name', 'öğrenci soyadı',
    'soyadı adı', 'soyad adı', 'family name', 'soyisim',
    'soy adı', 'soyadı', 'lastname', 'öğr soyadı', 'ogr soyadi',
    'soyadi', 'soyad', 'surname', 'last name', 'family name',
    'soyad', 'soyadı', '2 soyadi', '3 soyadi', '4 soyadi'
  ],

  cinsiyet: [
    'cinsiyet', 'cins', 'gender', 'sex', 'cinsiyeti', 'cinsiyet bilgisi',
    'cinsiyet', 'gender', 'sex', 'cins', 'cinsiyet', 'erkek/kız',
    'kız/erkek', 'male/female', 'female/male', 'cinsiyet bilgisi',
    'cinsiyet', 'cins', 'gender', 'sex', 'erkek', 'kız', 'male', 'female',
    '2 cinsiyet', '3 cinsiyet', '4 cinsiyet'
  ]
};

/**
 * Sütun başlığını normalize eder
 */
export const normalizeColumnHeader = (header) => {
  if (!header || typeof header !== 'string') return '';

  return header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i') // Büyük İ'yi de dönüştür
    .replace(/\s+/g, ' ') // çoklu boşlukları tek boşluğa çevir
    .replace(/[:.]/g, ''); // nokta ve iki noktayı kaldır
};

/**
 * Verilen başlığın hangi sütun türüne ait olduğunu tespit eder
 */
export const detectColumnType = (header) => {
  const normalized = normalizeColumnHeader(header);

  // En spesifik eşleşmeyi bulmak için pattern'leri uzunluklarına göre sırala
  const sortedEntries = Object.entries(COLUMN_PATTERNS).sort((a, b) => {
    const maxPatternA = Math.max(...a[1].map(p => p.length));
    const maxPatternB = Math.max(...b[1].map(p => p.length));
    return maxPatternB - maxPatternA; // Uzun olanlar önce
  });

  for (const [columnType, patterns] of sortedEntries) {
    for (const pattern of patterns) {
      if (normalized === pattern) {
        return columnType;
      }
    }
  }

  return null;
};

/**
 * Sütun eşleştirmelerini oluşturur
 */
export const createColumnMapping = (headers) => {
  const mapping = {
    numara: undefined,
    adi: undefined,
    soyadi: undefined,
    cinsiyet: undefined
  };

  if (!headers || !Array.isArray(headers)) {
    return mapping;
  }

  headers.forEach((header, index) => {
    const columnType = detectColumnType(header);
    if (columnType && mapping[columnType] === undefined) {
      mapping[columnType] = index;
    }
  });

  return mapping;
};

/**
 * Sütun desenlerini tespit eder
 */
export const detectColumnPatterns = (header) => {
  const patterns = {
    numara: false,
    adi: false,
    soyadi: false,
    cinsiyet: false
  };

  if (!header) return patterns;

  const columnType = detectColumnType(header);
  if (columnType) {
    patterns[columnType] = true;
  }

  return patterns;
};

/**
 * Sütun indeksini döndürür
 */
export const getColumnIndex = (headers, columnName) => {
  if (!headers || !Array.isArray(headers) || !columnName) {
    return -1;
  }

  const normalizedSearch = normalizeColumnHeader(columnName);

  for (let i = 0; i < headers.length; i++) {
    const normalizedHeader = normalizeColumnHeader(headers[i]);
    if (normalizedHeader === normalizedSearch || normalizedHeader.includes(normalizedSearch)) {
      return i;
    }
  }

  return -1;
};
