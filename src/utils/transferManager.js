import logger from './logger';

class TransferManager {
  constructor() {
    this.transferHistory = [];
  }

  // Transfer işlemi
  async executeTransfer(transferData) {
    const { student, fromSalon, toSalon, mode = 'move' } = transferData;
    
    try {
      // Validasyon
      this.validateTransfer(student, fromSalon, toSalon, mode);
      
      // Transfer işlemi
      const result = await this.performTransfer(student, fromSalon, toSalon, mode);
      
      // Geçmişe kaydet
      this.addToHistory({
        ...transferData,
        timestamp: new Date(),
        success: true
      });
      
      logger.info(`✅ Transfer başarılı: ${student.ad} ${student.soyad} → ${toSalon.salonAdi}`);
      
      return result;
    } catch (error) {
      logger.error('❌ Transfer hatası:', error);
      throw error;
    }
  }

  // Transfer validasyonu
  validateTransfer(student, fromSalon, toSalon, mode) {
    if (!student || !fromSalon || !toSalon) {
      throw new Error('Transfer verileri eksik!');
    }

    if (fromSalon.id === toSalon.id) {
      throw new Error('Aynı salona transfer yapılamaz!');
    }

    // Hedef salon kapasitesi kontrolü
    const toSalonCapacity = this.getSalonCapacity(toSalon);
    if (toSalonCapacity.available <= 0) {
      throw new Error(`${toSalon.salonAdi} salonu dolu!`);
    }

    // Öğrenci mevcut salonda var mı?
    const studentInFromSalon = this.findStudentInSalon(student, fromSalon);
    if (!studentInFromSalon && mode === 'move') {
      throw new Error('Öğrenci mevcut salonda bulunamadı!');
    }

    // Hedef salonda aynı öğrenci var mı?
    const studentInToSalon = this.findStudentInSalon(student, toSalon);
    if (studentInToSalon) {
      throw new Error('Öğrenci zaten hedef salonda!');
    }
  }

  // Transfer işlemini gerçekleştir
  async performTransfer(student, fromSalon, toSalon, mode) {
    // Deep copy yap - masalar array'ini de kopyala
    const updatedFromSalon = {
      ...fromSalon,
      ogrenciler: [...(fromSalon.ogrenciler || [])],
      masalar: fromSalon.masalar ? fromSalon.masalar.map(masa => ({
        ...masa,
        ogrenci: masa.ogrenci ? { ...masa.ogrenci } : null
      })) : []
    };
    
    const updatedToSalon = {
      ...toSalon,
      ogrenciler: [...(toSalon.ogrenciler || [])],
      masalar: toSalon.masalar ? toSalon.masalar.map(masa => ({
        ...masa,
        ogrenci: masa.ogrenci ? { ...masa.ogrenci } : null
      })) : []
    };

    // Hedef salona öğrenci ekle
    updatedToSalon.ogrenciler = [...updatedToSalon.ogrenciler, student];
    
    // Hedef salondaki masalara öğrenci yerleştir - Immutable update
    const availableSeatIndex = updatedToSalon.masalar.findIndex(masa => !masa.ogrenci);
    if (availableSeatIndex !== -1) {
      updatedToSalon.masalar = updatedToSalon.masalar.map((masa, index) => {
        if (index === availableSeatIndex) {
          return { ...masa, ogrenci: student };
        }
        return masa;
      });
    }

    // Move modunda kaynak salondan kaldır
    if (mode === 'move') {
      // Öğrenciyi ogrenciler array'inden çıkar
      updatedFromSalon.ogrenciler = updatedFromSalon.ogrenciler.filter(
        s => s.id !== student.id
      );
      
      // Kaynak salondaki masayı boşalt
      updatedFromSalon.masalar = updatedFromSalon.masalar.map(masa => {
        if (masa.ogrenci && masa.ogrenci.id === student.id) {
          return { ...masa, ogrenci: null };
        }
        return masa;
      });
    }

    return {
      fromSalon: updatedFromSalon,
      toSalon: updatedToSalon,
      student,
      mode
    };
  }

  // Salon kapasitesi hesapla
  getSalonCapacity(salon) {
    // Salon kapasitesini daha esnek hesapla - masalar.length'i öncelikle kullan
    let totalCapacity = 0;
    
    // Önce masalar array'ini kontrol et (en güvenilir)
    if (salon.masalar && Array.isArray(salon.masalar) && salon.masalar.length > 0) {
      totalCapacity = salon.masalar.length;
    }
    // Sonra kapasite property'sini kontrol et
    else if (salon.kapasite && typeof salon.kapasite === 'number' && salon.kapasite > 0) {
      totalCapacity = salon.kapasite;
    }
    // Son olarak siraDizilimi'nden hesapla
    else if (salon.siraDizilimi) {
      totalCapacity = (salon.siraDizilimi.satir || 0) * (salon.siraDizilimi.sutun || 0);
    }
    
    // Mevcut öğrenci sayısını hesapla - masalardaki öğrencileri say
    let currentStudents = 0;
    if (salon.masalar && Array.isArray(salon.masalar)) {
      currentStudents = salon.masalar.filter(masa => masa.ogrenci).length;
    } else if (salon.ogrenciler && Array.isArray(salon.ogrenciler)) {
      currentStudents = salon.ogrenciler.length;
    }
    
    return {
      total: totalCapacity,
      used: currentStudents,
      available: totalCapacity - currentStudents
    };
  }

  // Salonda öğrenci bul
  findStudentInSalon(student, salon) {
    return (salon.ogrenciler || []).find(s => s.id === student.id);
  }

  // Boş masa bul
  findAvailableSeat(salon) {
    if (!salon.masalar) return null;
    
    return salon.masalar.find(masa => !masa.ogrenci);
  }

  // Öğrenciyi masalardan temizle
  clearStudentFromSeats(student, salon) {
    if (!salon.masalar) return;
    
    salon.masalar.forEach(masa => {
      if (masa.ogrenci && masa.ogrenci.id === student.id) {
        masa.ogrenci = null;
      }
    });
  }

  // Transfer geçmişine ekle
  addToHistory(transferData) {
    this.transferHistory.unshift(transferData);
    
    // Son 50 transferi tut
    if (this.transferHistory.length > 50) {
      this.transferHistory = this.transferHistory.slice(0, 50);
    }
  }

  // Transfer geçmişini al
  getTransferHistory(limit = 10) {
    return this.transferHistory.slice(0, limit);
  }

  // Transfer geçmişini temizle
  clearHistory() {
    this.transferHistory = [];
  }

  // Toplu transfer
  async executeBulkTransfer(transfers) {
    const results = [];
    
    for (const transfer of transfers) {
      try {
        const result = await this.executeTransfer(transfer);
        results.push({ success: true, result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    
    return results;
  }

  // Transfer istatistikleri
  getTransferStats() {
    const total = this.transferHistory.length;
    const successful = this.transferHistory.filter(t => t.success).length;
    const failed = total - successful;
    
    const modeStats = this.transferHistory.reduce((acc, transfer) => {
      acc[transfer.mode] = (acc[transfer.mode] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      modeStats
    };
  }
}

const transferManager = new TransferManager();
export default transferManager;
