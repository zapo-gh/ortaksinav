/**
 * Session-based geçici veri yönetimi
 * Sadece aktif oturum için geçici kayıt tutar
 */
class SessionManager {
  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.tempData = null;
    this.isActive = true;
    this.beforeUnloadHandler = null; // Event listener referansı (cleanup için)
    
    // Sayfa kapatılırken temizlik
    this.beforeUnloadHandler = () => {
      this.cleanup();
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }
  
  /**
   * Cleanup event listener (memory leak önleme)
   */
  removeEventListener() {
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
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
    // Event listener'ı da temizle
    this.removeEventListener();
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

