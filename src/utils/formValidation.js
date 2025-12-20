/**
 * Form Validation Utility
 * Tüm form inputları için validation kuralları
 */

import { sanitizeString, sanitizeNumber, sanitizeText, sanitizeClassName } from './sanitization';
import { validateStudent } from './studentValidation';

/**
 * Öğrenci formu validation
 */
export const validateStudentForm = (formData) => {
  const errors = {};
  const warnings = {};

  // Ad validation
  if (!formData.ad || formData.ad.trim().length === 0) {
    errors.ad = 'Ad zorunludur';
  } else {
    const sanitizedAd = sanitizeText(formData.ad, { maxLength: 30, allowNumbers: false });
    if (sanitizedAd.length < 2) {
      errors.ad = 'Ad en az 2 karakter olmalıdır';
    } else if (sanitizedAd.length > 30) {
      errors.ad = 'Ad en fazla 30 karakter olabilir';
    } else if (!/[a-zA-ZçğıöşüÇĞIİÖŞÜ]/.test(sanitizedAd)) {
      errors.ad = 'Ad geçerli karakterler içermelidir';
    }
  }

  // Soyad validation
  if (!formData.soyad || formData.soyad.trim().length === 0) {
    errors.soyad = 'Soyad zorunludur';
  } else {
    const sanitizedSoyad = sanitizeText(formData.soyad, { maxLength: 30, allowNumbers: false });
    if (sanitizedSoyad.length < 2) {
      errors.soyad = 'Soyad en az 2 karakter olmalıdır';
    } else if (sanitizedSoyad.length > 30) {
      errors.soyad = 'Soyad en fazla 30 karakter olabilir';
    }
  }

  // Numara validation
  if (!formData.numara || String(formData.numara).trim().length === 0) {
    errors.numara = 'Öğrenci numarası zorunludur';
  } else {
    const numara = sanitizeNumber(formData.numara, { min: 1 });
    if (!numara) {
      errors.numara = 'Geçerli bir numara giriniz';
    } else if (String(numara).length < 3) {
      warnings.numara = 'Numara çok kısa (3+ hane önerilir)';
    }
  }

  // Sınıf validation
  if (!formData.sinif || formData.sinif.trim().length === 0) {
    errors.sinif = 'Sınıf zorunludur';
  } else {
    const sanitizedSinif = sanitizeClassName(formData.sinif);
    if (!/^\d+-[A-Z]$/.test(sanitizedSinif)) {
      errors.sinif = 'Sınıf formatı hatalı (örn: 9-A)';
    } else {
      const level = parseInt(sanitizedSinif.split('-')[0]);
      if (level < 5 || level > 12) {
        warnings.sinif = 'Sınıf seviyesi 5-12 arası olmalıdır';
      }
    }
  }

  // Cinsiyet validation
  if (!formData.cinsiyet) {
    warnings.cinsiyet = 'Cinsiyet seçilmedi, varsayılan olarak "E" atanacak';
  } else {
    const cinsiyet = String(formData.cinsiyet).trim().toUpperCase();
    if (!['E', 'K'].includes(cinsiyet)) {
      errors.cinsiyet = 'Cinsiyet "E" veya "K" olmalıdır';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
};

/**
 * Salon formu validation
 */
export const validateSalonForm = (formData) => {
  const errors = {};
  const warnings = {};

  // Salon Adı validation
  if (!formData.salonAdi || formData.salonAdi.trim().length === 0) {
    errors.salonAdi = 'Salon adı zorunludur';
  } else {
    const sanitizedAd = sanitizeText(formData.salonAdi, { maxLength: 20, allowSpecialChars: true });
    if (sanitizedAd.length < 1) {
      errors.salonAdi = 'Salon adı geçersiz karakterler içeriyor';
    }
  }

  // Sıra Tipi validation
  if (!formData.siraTipi || !['tekli', 'ikili'].includes(formData.siraTipi)) {
    errors.siraTipi = 'Sıra tipi seçilmelidir';
  }

  // Grup Sayısı validation
  if (formData.grupSayisi === undefined || formData.grupSayisi === null) {
    errors.grupSayisi = 'Grup sayısı zorunludur';
  } else {
    const grupSayisi = sanitizeNumber(formData.grupSayisi, { min: 1, max: 10 });
    if (!grupSayisi) {
      errors.grupSayisi = 'Grup sayısı 1-10 arası olmalıdır';
    } else if (grupSayisi < 1 || grupSayisi > 10) {
      errors.grupSayisi = 'Grup sayısı 1-10 arası olmalıdır';
    }
  }

  // Gruplar validation
  if (!formData.gruplar || !Array.isArray(formData.gruplar) || formData.gruplar.length === 0) {
    errors.gruplar = 'En az bir grup tanımlanmalıdır';
  } else {
    formData.gruplar.forEach((grup, index) => {
      const siraSayisi = sanitizeNumber(grup.siraSayisi, { min: 1, max: 100 });
      if (!siraSayisi) {
        errors[`gruplar.${index}.siraSayisi`] = `Grup ${index + 1} için sıra sayısı geçersiz (1-100 arası)`;
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
};

/**
 * Ayarlar formu validation
 */
export const validateAyarlarForm = (formData) => {
  const errors = {};
  const warnings = {};

  // Okul Adı validation
  if (!formData.okulAdi || formData.okulAdi.trim().length === 0) {
    errors.okulAdi = 'Okul adı zorunludur';
  } else {
    const sanitizedOkulAdi = sanitizeText(formData.okulAdi, { maxLength: 100, allowSpecialChars: true });
    if (sanitizedOkulAdi.length < 3) {
      errors.okulAdi = 'Okul adı en az 3 karakter olmalıdır';
    }
  }

  // Eğitim Yılı validation
  if (!formData.egitimYili || formData.egitimYili.trim().length === 0) {
    errors.egitimYili = 'Eğitim yılı zorunludur';
  } else {
    // Yıl formatı: 2024-2025
    if (!/^\d{4}-\d{4}$/.test(formData.egitimYili.trim())) {
      errors.egitimYili = 'Eğitim yılı formatı hatalı (örn: 2024-2025)';
    }
  }

  // Dersler validation
  if (!formData.dersler || !Array.isArray(formData.dersler) || formData.dersler.length === 0) {
    errors.dersler = 'En az bir ders eklenmelidir';
  } else {
    formData.dersler.forEach((ders, index) => {
      if (!ders.ad || ders.ad.trim().length === 0) {
        errors[`dersler.${index}.ad`] = `Ders ${index + 1} için ders adı zorunludur`;
      } else {
        const sanitizedDersAdi = sanitizeText(ders.ad, { maxLength: 50 });
        if (sanitizedDersAdi.length < 2) {
          errors[`dersler.${index}.ad`] = `Ders ${index + 1} adı en az 2 karakter olmalıdır`;
        }
      }

      if (!ders.siniflar || !Array.isArray(ders.siniflar) || ders.siniflar.length === 0) {
        errors[`dersler.${index}.siniflar`] = `Ders ${index + 1} için en az bir sınıf seçilmelidir`;
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
};

/**
 * Genel ayarlar formu validation
 */
export const validateGenelAyarlarForm = (formData) => {
  const errors = {};
  const warnings = {};

  // Okul Adı
  if (!formData.okulAdi || formData.okulAdi.trim().length === 0) {
    errors.okulAdi = 'Okul adı zorunludur';
  }

  // Eğitim Yılı
  if (!formData.egitimYili || formData.egitimYili.trim().length === 0) {
    errors.egitimYili = 'Eğitim yılı zorunludur';
  } else if (!/^\d{4}-\d{4}$/.test(formData.egitimYili.trim())) {
    errors.egitimYili = 'Eğitim yılı formatı hatalı (örn: 2024-2025)';
  }

  // Dönem
  if (!formData.donem || !['1', '2'].includes(String(formData.donem))) {
    errors.donem = 'Dönem seçilmelidir';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  };
};

/**
 * Real-time validation helper
 * Input değiştiğinde anında validate eder
 */
export const validateOnChange = (value, rules) => {
  const errors = [];
  const warnings = [];

  // Required check
  if (rules.required && (!value || (typeof value === 'string' && value.trim().length === 0))) {
    errors.push(rules.requiredMessage || 'Bu alan zorunludur');
    return { isValid: false, errors, warnings };
  }

  // Type check
  if (rules.type === 'number' && value !== null && value !== undefined && value !== '') {
    const num = sanitizeNumber(value, rules);
    if (num === null) {
      errors.push(rules.typeMessage || 'Geçerli bir sayı giriniz');
    }
  }

  // Length check
  if (rules.minLength && String(value).length < rules.minLength) {
    errors.push(`En az ${rules.minLength} karakter olmalıdır`);
  }

  if (rules.maxLength && String(value).length > rules.maxLength) {
    errors.push(`En fazla ${rules.maxLength} karakter olabilir`);
  }

  // Pattern check
  if (rules.pattern && !rules.pattern.test(String(value))) {
    errors.push(rules.patternMessage || 'Format hatalı');
  }

  // Range check (for numbers)
  if (rules.type === 'number') {
    const num = sanitizeNumber(value, rules);
    if (num !== null) {
      if (rules.min !== undefined && num < rules.min) {
        errors.push(`En az ${rules.min} olmalıdır`);
      }
      if (rules.max !== undefined && num > rules.max) {
        errors.push(`En fazla ${rules.max} olabilir`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

