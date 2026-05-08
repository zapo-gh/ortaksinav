/**
 * Firestore Utility Functions
 * Veri sanitization ve format dönüşümleri için yardımcı fonksiyonlar
 */

/**
 * Firestore için veriyi temizle
 * - undefined değerleri null'a çevir
 * - NaN/Infinity değerleri null'a çevir
 * - Fonksiyonları kaldır
 * - Date nesnelerini koru
 * - Circular referansları kır
 */
export const sanitizeForFirestore = (input) => {
  const seen = new WeakSet();
  
  const walk = (value) => {
    // undefined → null
    if (value === undefined) return null;
    
    // null koru
    if (value === null) return null;
    
    // Fonksiyonları kaldır
    if (typeof value === 'function') return null;
    
    // NaN/Infinity → null
    if (typeof value === 'number' && (!Number.isFinite(value) || Number.isNaN(value))) {
      return null;
    }
    
    // Date nesnelerini koru (Firestore destekler)
    if (value instanceof Date) return value;
    
    // Array'leri işle
    if (Array.isArray(value)) {
      return value.map(walk).filter(item => item !== null);
    }
    
    // Object'leri işle
    if (typeof value === 'object') {
      // Circular referans kontrolü
      if (seen.has(value)) return null;
      seen.add(value);
      
      const result = {};
      for (const [key, val] of Object.entries(value)) {
        const sanitizedValue = walk(val);
        if (sanitizedValue !== null) {
          result[key] = sanitizedValue;
        }
      }
      
      seen.delete(value);
      return result;
    }
    
    // Primitive değerleri koru
    return value;
  };
  
  return walk(input);
};

/**
 * Firestore'dan gelen veriyi temizle
 * Timestamp'leri Date'e çevir
 */
export const sanitizeFromFirestore = (input) => {
  if (!input) return input;
  
  const walk = (value) => {
    // Firestore Timestamp'i Date'e çevir
    if (value && typeof value === 'object' && value.seconds !== undefined) {
      return new Date(value.seconds * 1000);
    }
    
    // Array'leri işle
    if (Array.isArray(value)) {
      return value.map(walk);
    }
    
    // Object'leri işle
    if (typeof value === 'object' && value !== null) {
      const result = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = walk(val);
      }
      return result;
    }
    
    return value;
  };
  
  return walk(input);
};

/**
 * Veri boyutunu kontrol et (Firestore limit: 1MB per document)
 */
export const checkDataSize = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    const sizeInBytes = new Blob([jsonString]).size;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    return {
      sizeInBytes,
      sizeInMB,
      isValid: sizeInMB < 1 // 1MB limit
    };
  } catch (error) {
    return {
      sizeInBytes: 0,
      sizeInMB: 0,
      isValid: false,
      error: error.message
    };
  }
};

/**
 * Veriyi chunk'lara böl (Firestore batch limit: 500 operations)
 */
export const chunkArray = (array, chunkSize = 500) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

export default {
  sanitizeForFirestore,
  sanitizeFromFirestore,
  checkDataSize,
  chunkArray
};
