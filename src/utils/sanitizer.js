import DOMPurify from 'dompurify';

const PURIFY_OPTIONS = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: []
};

export const sanitizeText = (value, options = {}) => {
  if (typeof value !== 'string') {
    return value;
  }
  const { trim = true } = options;

  let workingValue = trim ? value.trim() : value;

  const sanitized = DOMPurify.sanitize(workingValue, PURIFY_OPTIONS);

  if (trim) {
    return sanitized ? sanitized.trim() : '';
  }

  return sanitized ?? '';
};

export const sanitizeStringArray = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map(item => sanitizeText(typeof item === 'string' ? item : String(item ?? '')))
    .filter(Boolean);
};

export const sanitizeStudentRecord = (student = {}) => {
  if (!student || typeof student !== 'object') {
    return {};
  }
  const sanitized = { ...student };
  sanitized.ad = sanitizeText(student.ad || student.name || '');
  sanitized.soyad = sanitizeText(student.soyad || student.surname || '');
  sanitized.numara = sanitizeText(
    student.numara !== undefined
      ? String(student.numara)
      : student.number !== undefined
        ? String(student.number)
        : ''
  );
  sanitized.sinif = sanitizeText(student.sinif || '');
  sanitized.cinsiyet = sanitizeText(student.cinsiyet || '');
  sanitized.pinned = !!student.pinned;
  sanitized.pinnedSalonId = sanitizeText(student.pinnedSalonId || '');
  sanitized.pinnedMasaId = sanitizeText(student.pinnedMasaId || '');
  return sanitized;
};

const sanitizeArrayDeep = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((item) => {
      if (typeof item === 'string') {
        return sanitizeText(item);
      }
      if (Array.isArray(item)) {
        return sanitizeArrayDeep(item);
      }
      if (item && typeof item === 'object') {
        return sanitizeSettingsMap(item);
      }
      return item;
    })
    .filter((item) => {
      if (typeof item === 'string') {
        return item.length > 0;
      }
      return item !== undefined && item !== null;
    });
};

export const sanitizeSettingsMap = (settings = {}) => {
  if (!settings || typeof settings !== 'object') {
    return {};
  }
  const result = {};
  Object.entries(settings).forEach(([key, value]) => {
    if (typeof value === 'string') {
      result[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      result[key] = sanitizeArrayDeep(value);
    } else if (value && typeof value === 'object') {
      result[key] = sanitizeSettingsMap(value);
    } else {
      result[key] = value;
    }
  });
  return result;
};

export const sanitizeSalonRecord = (salon = {}) => {
  if (!salon || typeof salon !== 'object') {
    return {};
  }
  const sanitized = { ...salon };
  sanitized.salonAdi = sanitizeText(salon.salonAdi || salon.ad || '');
  sanitized.ad = sanitizeText(salon.ad || '');
  sanitized.gruplar = Array.isArray(salon.gruplar)
    ? sanitizeArrayDeep(salon.gruplar)
    : [];
  sanitized.masalar = Array.isArray(salon.masalar)
    ? sanitizeArrayDeep(salon.masalar)
    : [];
  return sanitized;
};

export const sanitizePlanMeta = (plan = {}) => {
  if (!plan || typeof plan !== 'object') {
    return {};
  }
  const sanitized = { ...plan };
  sanitized.name = sanitizeText(plan.name || '');
  sanitized.sinavTarihi = sanitizeText(plan.sinavTarihi || '');
  sanitized.sinavSaati = sanitizeText(plan.sinavSaati || '');
  sanitized.sinavDonemi = sanitizeText(plan.sinavDonemi || '');
  sanitized.donem = sanitizeText(plan.donem || '');
  return sanitized;
};



/**
 * Firestore için veriyi temizle: undefined değerleri kaldır veya null'a çevir,
 * Date nesnelerini toString yapma, fonksiyonları drop et, NaN/Infinity'yi null yap.
 */
export const sanitizeForFirestore = (input) => {
  const seen = new WeakSet();
  const walk = (value) => {
    if (value === undefined) return null; // Firestore undefined desteklemez
    if (value === null) return null;
    if (typeof value === 'function') return null;
    if (typeof value === 'number' && (!Number.isFinite(value) || Number.isNaN(value))) return null;
    if (value instanceof Date) return value; // native Date desteklenir
    if (Array.isArray(value)) return value.map(walk);
    if (typeof value === 'object') {
      if (seen.has(value)) return null; // döngüsel referansı kır
      seen.add(value);
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        // Anahtar her zaman string; değeri sanitize et
        const sv = walk(v);
        if (sv !== undefined) out[k] = sv;
      }
      return out;
    }
    return value;
  };
  return walk(input);
};
