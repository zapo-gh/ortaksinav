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
    if (student == null) {
      errors.push('Öğrenci verisi boş olamaz');
      return {
        isValid: false,
        errors,
        warnings,
        hasWarnings: warnings.length > 0,
        errorCount: errors.length,
        warningCount: warnings.length
      };
    }

    // Alan adları farklı gelebilir: ad/adi, soyad/soyadi
    const ad = student.ad ?? student.adi;
    const soyad = student.soyad ?? student.soyadi;
    const numara = student.numara ?? student.no ?? student.ogrNo;
    const cinsiyet = student.cinsiyet ?? student.gender;
    const sinif = student.sinif ?? student.sınıf ?? student.class;

    // Numara kontrolü
    if (!numara || numara.toString().trim().length < 1) {
      errors.push('Öğrenci numarası gerekli');
      logger.warn(`${logPrefix} Öğrenci numarası eksik`);
    } else {
      const numaraStr = numara.toString().trim();

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
    if (!ad || ad.toString().trim().length === 0) {
      errors.push('Öğrenci adı gerekli');
      logger.warn(`${logPrefix} Öğrenci adı gerekli`);
    } else {
      const adiStr = ad.toString().trim();

      if (adiStr.length > 50) {
        errors.push('Ad çok uzun');
        logger.warn(`${logPrefix} Öğrenci adı çok uzun: "${adiStr}"`);
      } else if (/\d/.test(adiStr)) {
        errors.push('Geçersiz ad formatı');
        logger.warn(`${logPrefix} Öğrenci adında rakam var: "${adiStr}"`);
      } else if (adiStr.length < 2) {
        errors.push('Öğrenci adı eksik veya çok kısa');
        logger.warn(`${logPrefix} Öğrenci adı çok kısa: "${adiStr}"`);
      }

      // Özel karakter kontrolü
      if (/[^a-zA-ZçğıöşüÇĞIİÖŞÜ\s]/.test(adiStr)) {
        warnings.push('Öğrenci adında özel karakterler var');
        logger.info(`${logPrefix} Öğrenci adında özel karakterler: "${adiStr}"`);
      }
    }

    // Soyad kontrolü (opsiyonel ama varsa kontrol et)
    if (soyad && soyad.toString().trim().length > 0) {
      const soyadStr = soyad.toString().trim();

      if (soyadStr.length > 30) {
        warnings.push('Öğrenci soyadı uzun (30+ karakter)');
        logger.info(`${logPrefix} Öğrenci soyadı uzun: "${soyadStr}"`);
      }

      // Özel karakter kontrolü
      if (/[^a-zA-ZçğıöşüÇĞIİÖŞÜ\s]/.test(soyadStr)) {
        warnings.push('Öğrenci soyadında özel karakterler var');
        logger.info(`${logPrefix} Öğrenci soyadında özel karakterler: "${soyadStr}"`);
      }
    } else {
      // Soyad yoksa uyarı
      warnings.push('Soyad bilgisi eksik');
      logger.info(`${logPrefix} Soyad bilgisi eksik`);
    }

    // Cinsiyet kontrolü
    if (!cinsiyet) {
      errors.push('Geçersiz cinsiyet');
      logger.info(`${logPrefix} Cinsiyet bilgisi eksik`);
    } else {
      const cinsiyetStr = cinsiyet.toString().trim().toUpperCase();

      if (!['E', 'K'].includes(cinsiyetStr)) {
        errors.push('Geçersiz cinsiyet');
        logger.warn(`${logPrefix} Geçersiz cinsiyet: "${cinsiyetStr}"`);
      }
    }

    // Sınıf kontrolü
    if (!sinif) {
      errors.push('Sınıf bilgisi eksik');
      logger.warn(`${logPrefix} Sınıf bilgisi eksik`);
    } else {
      const sinifStr = sinif.toString().trim();

      if (!/^\d+-[A-Z]$/.test(sinifStr)) {
        errors.push('Geçersiz sınıf formatı');
        logger.warn(`${logPrefix} Geçersiz sınıf formatı: "${sinifStr}"`);
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
      warningsCount: 0,
      errors: [],
      warnings: [],
      students: [],
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
    warningsCount: 0,
    errors: [],
    warnings: [],
    students: [],
    summary: {}
  };

  logger.info(`Öğrenci listesi validasyonu başlatılıyor: ${students.length} öğrenci`);

  // Duplicate numara kontrolü için set
  const seenNumbers = new Map(); // numaraStr -> firstIndex

  students.forEach((student, index) => {
    const validation = validateStudent(student, index);

    results.students.push({
      index,
      student: { ...student },
      errors: validation.errors,
      warnings: validation.warnings,
      isValid: validation.isValid
    });

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
      results.warningsCount++;
      results.warnings.push({
        index,
        student: { ...student },
        warnings: validation.warnings
      });
    }

    // Duplicate kontrolü (numara)
    try {
      const numVal = student?.numara ?? student?.no ?? student?.ogrNo;
      const numStr = (numVal ?? '').toString().trim();
      if (numStr) {
        const currentId = student?.id;
        if (seenNumbers.has(numStr) && seenNumbers.get(numStr)?.id !== currentId) {
          // İlk görülen ve bu kayıt hata alsın
          const { index: firstIndex } = seenNumbers.get(numStr);
          const errMsg = 'Öğrenci numarası zaten kullanılıyor';
          // Mevcut kayda ekle
          const current = results.students[index];
          if (current && !current.errors.includes(errMsg)) {
            current.errors.push(errMsg);
            current.isValid = false;
          }
          // İlk kayda da ekle (eğer henüz eklenmediyse)
          const first = results.students[firstIndex];
          if (first && !first.errors.includes(errMsg)) {
            first.errors.push(errMsg);
            first.isValid = false;
          }
        } else {
          seenNumbers.set(numStr, { index, id: currentId });
        }
      }
    } catch (e) {
      logger.debug('Duplicate kontrolünde hata:', e);
    }
  });

  // Duplicate sonrası invalid sayısını güncelle
  results.invalid = results.students.filter(s => s && s.isValid === false).length;
  results.valid = results.total - results.invalid;

  // Özet oluştur
  results.summary = {
    totalStudents: results.total,
    validStudents: results.valid,
    invalidStudents: results.invalid,
    studentsWithWarnings: results.warningsCount,
    successRate: results.total > 0 ? Number(((results.valid / results.total) * 100).toFixed(2)) : 100,
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
