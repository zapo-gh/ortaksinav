/**
 * Session-based geçici veri yönetimi
 * Sadece aktif oturum için geçici kayıt tutar
 */
class SessionManager {
  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.tempData = null;
    this.isActive = true;
    
    // Sayfa kapatılırken temizlik
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * Geçici veri kaydet (sadece memory'de)
   */
  saveTempData(data) {
    this.tempData = {
      ...data,
      sessionId: this.sessionId,
      timestamp: Date.now()
    };
    
    // localStorage'a da kaydet (sayfa yenileme için)
    try {
      localStorage.setItem('temp_session_data', JSON.stringify(this.tempData));
    } catch (error) {
      console.warn('localStorage kayıt hatası:', error);
    }
  }

  /**
   * Geçici veri yükle
   */
  loadTempData() {
    if (this.tempData) {
      return this.tempData;
    }

    // localStorage'dan yükle
    try {
      const stored = localStorage.getItem('temp_session_data');
      if (stored) {
        const data = JSON.parse(stored);
        // 24 saat eski verileri temizle
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          this.tempData = data;
          return data;
        } else {
          this.cleanup();
        }
      }
    } catch (error) {
      console.warn('localStorage okuma hatası:', error);
    }

    return null;
  }

  /**
   * Geçici veri temizle
   */
  cleanup() {
    this.tempData = null;
    this.isActive = false;
    
    try {
      localStorage.removeItem('temp_session_data');
    } catch (error) {
      console.warn('localStorage temizleme hatası:', error);
    }
  }

  /**
   * Session aktif mi?
   */
  isSessionActive() {
    return this.isActive;
  }
}

// Singleton instance
const sessionManager = new SessionManager();

export default sessionManager;

