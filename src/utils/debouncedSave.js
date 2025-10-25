/**
 * Debounced kayıt sistemi
 * Kullanıcı durduktan sonra kayıt yapar
 */
class DebouncedSave {
  constructor() {
    this.saveTimeout = null;
    this.pendingData = null;
    this.saveDelay = 2000; // 2 saniye bekle
  }

  /**
   * Debounced kayıt başlat
   */
  scheduleSave(data, saveFunction) {
    // Önceki timeout'u iptal et
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Yeni veriyi sakla
    this.pendingData = data;

    // Yeni timeout başlat
    this.saveTimeout = setTimeout(async () => {
      try {
        await saveFunction(this.pendingData);
        console.log('✅ Debounced kayıt tamamlandı');
        this.pendingData = null;
      } catch (error) {
        console.error('❌ Debounced kayıt hatası:', error);
      }
    }, this.saveDelay);
  }

  /**
   * Hemen kaydet (zorunlu durumlar için)
   */
  forceSave(saveFunction) {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    if (this.pendingData) {
      saveFunction(this.pendingData);
      this.pendingData = null;
    }
  }

  /**
   * Bekleyen kayıt var mı?
   */
  hasPendingSave() {
    return this.pendingData !== null;
  }
}

// Singleton instance
const debouncedSave = new DebouncedSave();

export default debouncedSave;

