/**
 * Öğrenci Veri Validasyonu
 * Excel'den okunan öğrenci verilerinin doğruluğunu kontrol eder
 */

import logger from './logger';

/**
 * Tek bir öğrencinin verilerini doğrular
 */
export const validateStudent = (student, index = null) => {
  const errors = [];
  const warnings = [];
  const logPrefix = index !== null ? `Öğrenci ${index + 1}:` : 'Öğrenci:';

  try {
    // Numara kontrolü
    if (!student.numara || student.numara.toString().trim().length < 1) {
      errors.push('Öğrenci numarası eksik veya çok kısa');
      logger.warn(`${logPrefix} Öğrenci numarası eksik`);
    } else {
      const numaraStr = student.numara.toString().trim();

      if (numaraStr.length > 10) {
        errors.push('Öğrenci numarası çok uzun (max 10 karakter)');
        logger.warn(`${logPrefix} Öğrenci numarası çok uzun: "${numaraStr}"`);
      } else if (!/^\d+$/.test(numaraStr)) {
        errors.push('Öğrenci numarası sadece rakamlardan oluşmalı');
        logger.warn(`${logPrefix} Öğrenci numarası geçersiz karakter içeriyor: "${numaraStr}"`);
      } else if (numaraStr.length < 3) {
        warnings.push('Öğrenci numarası kısa (3+ hane önerilir)');
        logger.info(`${logPrefix} Öğrenci numarası kısa: "${numaraStr}"`);
      }
    }

    // İsim kontrolü
    if (!student.adi || student.adi.toString().trim().length < 2) {
      errors.push('Öğrenci adı eksik veya çok kısa');
      logger.warn(`${logPrefix} Öğrenci adı eksik veya çok kısa`);
    } else {
      const adiStr = student.adi.toString().trim();

      if (adiStr.length > 30) {
        errors.push('Öğrenci adı çok uzun (max 30 karakter)');
        logger.warn(`${logPrefix} Öğrenci adı çok uzun: "${adiStr}"`);
      } else if (!/[a-zA-ZçğıöşüÇĞIİÖŞÜ]/.test(adiStr)) {
        errors.push('Öğrenci adında Türkçe karakter bulunmalı');
        logger.warn(`${logPrefix} Öğrenci adında Türkçe karakter yok: "${adiStr}"`);
      } else if (adiStr.length < 2) {
        errors.push('Öğrenci adı çok kısa (min 2 karakter)');
        logger.warn(`${logPrefix} Öğrenci adı çok kısa: "${adiStr}"`);
      }

      // Özel karakter kontrolü
      if (/[^a-zA-ZçğıöşüÇĞIİÖŞÜ\s]/.test(adiStr)) {
        warnings.push('Öğrenci adında özel karakterler var');
        logger.info(`${logPrefix} Öğrenci adında özel karakterler: "${adiStr}"`);
      }
    }

    // Soyad kontrolü (opsiyonel ama varsa kontrol et)
    if (student.soyad && student.soyad.toString().trim().length > 0) {
      const soyadStr = student.soyad.toString().trim();

      if (soyadStr.length > 30) {
        warnings.push('Öğrenci soyadı uzun (30+ karakter)');
        logger.info(`${logPrefix} Öğrenci soyadı uzun: "${soyadStr}"`);
      }

      // Özel karakter kontrolü
      if (/[^a-zA-ZçğıöşüÇĞIİÖŞÜ\s]/.test(soyadStr)) {
        warnings.push('Öğrenci soyadında özel karakterler var');
        logger.info(`${logPrefix} Öğrenci soyadında özel karakterler: "${soyadStr}"`);
      }
    }

    // Cinsiyet kontrolü
    if (!student.cinsiyet) {
      warnings.push('Cinsiyet bilgisi eksik, varsayılan olarak "E" atanacak');
      logger.info(`${logPrefix} Cinsiyet bilgisi eksik`);
    } else {
      const cinsiyetStr = student.cinsiyet.toString().trim().toUpperCase();

      if (!['E', 'K'].includes(cinsiyetStr)) {
        errors.push('Cinsiyet "E" (Erkek) veya "K" (Kız) olmalı');
        logger.warn(`${logPrefix} Geçersiz cinsiyet: "${cinsiyetStr}"`);
      }
    }

    // Sınıf kontrolü
    if (!student.sinif) {
      errors.push('Sınıf bilgisi eksik');
      logger.warn(`${logPrefix} Sınıf bilgisi eksik`);
    } else {
      const sinifStr = student.sinif.toString().trim();

      if (!/^\d+-[A-Z]$/.test(sinifStr)) {
        warnings.push('Sınıf formatı standart dışı (örnek: 9-A)');
        logger.info(`${logPrefix} Sınıf formatı standart dışı: "${sinifStr}"`);
      } else {
        const sinifNum = parseInt(sinifStr.split('-')[0]);
        if (sinifNum < 5 || sinifNum > 12) {
          warnings.push('Sınıf numarası alışılmadık (5-12 arası normal)');
          logger.info(`${logPrefix} Sınıf numarası alışılmadık: ${sinifNum}`);
        }
      }
    }

    // Genel veri kalitesi kontrolü
    const filledFields = ['numara', 'adi', 'soyad', 'cinsiyet', 'sinif']
      .filter(field => student[field] && student[field].toString().trim().length > 0);

    if (filledFields.length < 4) {
      warnings.push('Çok fazla alan boş (veri kalitesi düşük)');
      logger.info(`${logPrefix} Veri kalitesi düşük, dolu alan sayısı: ${filledFields.length}`);
    }

  } catch (error) {
    errors.push('Veri validasyonu sırasında hata oluştu');
    logger.error(`${logPrefix} Validasyon hatası:`, error);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasWarnings: warnings.length > 0,
    errorCount: errors.length,
    warningCount: warnings.length
  };
};

/**
 * Öğrenci listesinin tamamını doğrular
 */
export const validateStudentList = (students) => {
  if (!students || !Array.isArray(students)) {
    return {
      total: 0,
      valid: 0,
      invalid: 0,
      warnings: 0,
      errors: [],
      warnings: [],
      summary: {
        totalStudents: 0,
        validStudents: 0,
        invalidStudents: 0,
        studentsWithWarnings: 0,
        successRate: 0,
        hasErrors: false,
        hasWarnings: false
      }
    };
  }

  const results = {
    total: students.length,
    valid: 0,
    invalid: 0,
    warnings: 0,
    errors: [],
    warningsList: [],
    summary: {}
  };

  logger.info(`Öğrenci listesi validasyonu başlatılıyor: ${students.length} öğrenci`);

  students.forEach((student, index) => {
    const validation = validateStudent(student, index);

    if (validation.isValid) {
      results.valid++;
    } else {
      results.invalid++;
      results.errors.push({
        index,
        student: { ...student },
        errors: validation.errors
      });
    }

    if (validation.hasWarnings) {
      results.warnings++;
      results.warnings.push({
        index,
        student: { ...student },
        warnings: validation.warnings
      });
    }
  });

  // Özet oluştur
  results.summary = {
    totalStudents: results.total,
    validStudents: results.valid,
    invalidStudents: results.invalid,
    studentsWithWarnings: results.warnings,
    successRate: results.total > 0 ? ((results.valid / results.total) * 100).toFixed(1) : 0,
    hasErrors: results.errors.length > 0,
    hasWarnings: results.warnings.length > 0
  };

  logger.info(`Validasyon tamamlandı: ${results.valid}/${results.total} geçerli öğrenci`);

  return results;
};

/**
 * Validasyon sonuçlarını özetler
 */
export const summarizeValidationResults = (results) => {
  const summary = {
    status: 'success',
    message: '',
    details: {}
  };

  if (results.summary.hasErrors) {
    summary.status = 'error';
    summary.message = `${results.summary.invalidStudents} öğrenci verisinde hata var`;
  } else if (results.summary.hasWarnings) {
    summary.status = 'warning';
    summary.message = `${results.summary.studentsWithWarnings} öğrenci verisinde uyarı var`;
  } else {
    summary.message = 'Tüm öğrenci verileri geçerli';
  }

  summary.details = {
    ...results.summary,
    topErrors: getTopErrors(results.errors),
    topWarnings: getTopWarnings(results.warnings)
  };

  return summary;
};

/**
 * En sık görülen hataları döndürür
 */
const getTopErrors = (errors) => {
  const errorCounts = {};

  errors.forEach(error => {
    error.errors.forEach(errorMsg => {
      errorCounts[errorMsg] = (errorCounts[errorMsg] || 0) + 1;
    });
  });

  return Object.entries(errorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([error, count]) => ({ error, count }));
};

/**
 * En sık görülen uyarıları döndürür
 */
const getTopWarnings = (warnings) => {
  const warningCounts = {};

  warnings.forEach(warning => {
    warning.warnings.forEach(warningMsg => {
      warningCounts[warningMsg] = (warningCounts[warningMsg] || 0) + 1;
    });
  });

  return Object.entries(warningCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([warning, count]) => ({ warning, count }));
};
