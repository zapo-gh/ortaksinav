/**
 * Input Sanitization Utility
 * XSS protection için güvenli string temizleme
 */

/**
 * HTML etiketlerini ve script kodlarını temizler
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') {
    return String(input || '');
  }

  // HTML etiketlerini kaldır
  let sanitized = input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  // Script etiketlerini kaldır
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  
  // Event handler'ları kaldır (onclick, onerror, vb.)
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');

  return sanitized.trim();
};

/**
 * Sayısal input'u temizler ve validate eder
 */
export const sanitizeNumber = (input, options = {}) => {
  const { min, max, allowDecimal = false } = options;
  
  if (input === null || input === undefined || input === '') {
    return null;
  }

  let num;
  if (typeof input === 'string') {
    // Sadece rakamları ve (varsa) ondalık işaretini al
    const cleaned = allowDecimal 
      ? input.replace(/[^\d.]/g, '')
      : input.replace(/[^\d]/g, '');
    num = allowDecimal ? parseFloat(cleaned) : parseInt(cleaned, 10);
  } else {
    num = allowDecimal ? parseFloat(input) : parseInt(input, 10);
  }

  if (isNaN(num)) {
    return null;
  }

  if (min !== undefined && num < min) {
    return min;
  }

  if (max !== undefined && num > max) {
    return max;
  }

  return num;
};

/**
 * Türkçe karakter içeren metin için sanitize
 */
export const sanitizeText = (input, options = {}) => {
  const { 
    maxLength = 100,
    allowNumbers = true,
    allowSpaces = true,
    allowSpecialChars = false
  } = options;

  if (typeof input !== 'string') {
    input = String(input || '');
  }

  let sanitized = input.trim();

  // Türkçe karakterleri koru, sadece izin verilmeyen karakterleri kaldır
  if (!allowSpecialChars) {
    // Sadece harfler, rakamlar, boşluk ve Türkçe karakterler
    sanitized = sanitized.replace(/[^a-zA-ZçğıöşüÇĞIİÖŞÜ\s\d]/g, '');
  }

  if (!allowNumbers) {
    sanitized = sanitized.replace(/\d/g, '');
  }

  if (!allowSpaces) {
    sanitized = sanitized.replace(/\s/g, '');
  }

  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized.trim();
};

/**
 * Sınıf formatını validate eder (örn: 9-A)
 */
export const sanitizeClassName = (input) => {
  if (typeof input !== 'string') {
    input = String(input || '');
  }

  // Boşlukları kaldır
  let sanitized = input.trim().toUpperCase();

  // Sınıf formatını kontrol et: 5-12 arası rakam + tire + A-Z harf
  const classPattern = /^(\d{1,2})[-/]?([A-Z])$/;
  const match = sanitized.match(classPattern);

  if (match) {
    const level = parseInt(match[1]);
    const section = match[2];

    // Sınıf seviyesi kontrolü (5-12 arası)
    if (level >= 5 && level <= 12) {
      return `${level}-${section}`;
    }
  }

  // Pattern uymazsa orijinal string'i döndür (kullanıcı uyarısı verilecek)
  return sanitized;
};

/**
 * URL'yi sanitize eder
 */
export const sanitizeUrl = (input) => {
  if (typeof input !== 'string') {
    return '';
  }

  try {
    const url = new URL(input);
    return url.toString();
  } catch (e) {
    // Geçersiz URL, boş string döndür
    return '';
  }
};

/**
 * Email formatını validate eder (basit kontrol)
 */
export const sanitizeEmail = (input) => {
  if (typeof input !== 'string') {
    return '';
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = input.trim().toLowerCase();

  if (emailPattern.test(trimmed)) {
    return trimmed;
  }

  return '';
};

/**
 * Tüm object'i recursive olarak sanitize eder
 */
export const sanitizeObject = (obj, options = {}) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'number') {
      sanitized[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

