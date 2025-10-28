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
    // localStorage yazımını devre dışı bıraktık (quota hatalarını önlemek için)
  }

  /**
   * Geçici veri yükle
   */
  loadTempData() {
    if (this.tempData) {
      return this.tempData;
    }

    return null;
  }

  /**
   * Geçici veri temizle
   */
  cleanup() {
    this.tempData = null;
    this.isActive = false;
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

