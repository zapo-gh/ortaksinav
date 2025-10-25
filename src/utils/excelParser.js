/**
 * Excel Parser Sınıfı
 * Excel dosyalarını parse etmek için modüler ve test edilebilir yapı
 */

import * as XLSX from 'xlsx';
import { logger } from './logger';
import { formatError } from './errorMessages';
import { detectExcelFormat } from './excelFormats';
import { createColumnMapping } from './excelColumnPatterns';
import { validateStudentList } from './studentValidation';

export class ExcelParser {
  constructor(file) {
    this.file = file;
    this.workbook = null;
    this.data = [];
    this.format = null;
    this.columns = {};
    this.groups = [];
    this.students = [];
    this.validationResults = null;
  }

  /**
   * Ana parse fonksiyonu
   */
  async parse() {
    try {
      logger.info('Excel parsing başlatılıyor...');

      await this.loadWorkbook();
      this.detectFormat();
      this.extractColumnMappings();
      this.extractClassGroups();
      this.parseStudents();
      this.validateData();

      logger.info(`Excel parsing tamamlandı: ${this.students.length} öğrenci, ${this.groups.length} grup`);

      return this.formatResult();
    } catch (error) {
      logger.error('Excel parsing hatası:', error);
      throw formatError('EXCEL_PARSE_ERROR', error.message);
    }
  }

  /**
   * Excel dosyasını yükler
   */
  async loadWorkbook() {
    logger.debug('Excel dosyası yükleniyor...');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          this.workbook = XLSX.read(data, { type: 'array' });

          const sheetName = this.workbook.SheetNames[0];
          const worksheet = this.workbook.Sheets[sheetName];
          this.data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          logger.info(`Excel dosyası yüklendi: ${this.data.length} satır, ${sheetName} sayfası`);
          resolve();
        } catch (error) {
          logger.error('Excel dosya yükleme hatası:', error);
          reject(new Error('Excel dosyası okunamadı'));
        }
      };

      reader.onerror = () => {
        logger.error('FileReader hatası');
        reject(new Error('Dosya okuma hatası'));
      };

      reader.readAsArrayBuffer(this.file);
    });
  }

  /**
   * Excel formatını tespit eder
   */
  detectFormat() {
    logger.debug('Excel formatı tespit ediliyor...');

    this.format = detectExcelFormat(this.data);

    logger.info(`Tespit edilen format: ${this.format.name} (${this.format.key})`);
  }

  /**
   * Sütun eşleştirmelerini çıkarır
   */
  extractColumnMappings() {
    logger.debug('Sütun eşleştirmeleri çıkarılıyor...');

    if (this.format.flexibleColumns) {
      // Manuel format için dinamik eşleştirme
      const headers = this.data[this.format.headerRow] || [];
      this.columns = createColumnMapping(headers);
      logger.debug('Dinamik sütun eşleştirmesi:', this.columns);
    } else {
      // Ön tanımlı format için sabit eşleştirme
      this.columns = { ...this.format.columns };
      logger.debug('Sabit sütun eşleştirmesi:', this.columns);
    }

    // Gerekli sütunların varlığını kontrol et
    const requiredColumns = ['numara', 'adi'];
    const missingColumns = requiredColumns.filter(col => this.columns[col] === undefined);

    if (missingColumns.length > 0) {
      logger.warn(`Eksik sütunlar: ${missingColumns.join(', ')}`);
      throw new Error(`Gerekli sütunlar bulunamadı: ${missingColumns.join(', ')}`);
    }
  }

  /**
   * Sınıf gruplarını çıkarır
   */
  extractClassGroups() {
    logger.debug('Sınıf grupları çıkarılıyor...');

    this.groups = [];
    let currentClass = null;
    let classStartRow = -1;

    // Manuel format için sınıf grupları oluşturma
    if (this.format.key === 'MANUAL_FORMAT') {
      // Tüm veriyi tek bir grup olarak işle
      this.groups.push({
        sinif: 'MANUAL_FORMAT',
        baslangicSatir: this.format.dataStartRow,
        bitisSatir: this.data.length - 1
      });
      logger.info('Manuel format için tek grup oluşturuldu');
      return;
    }

    for (let i = 0; i < this.data.length; i++) {
      const row = this.data[i];

      if (!row || row.length === 0) continue;

      const firstCell = row[0]?.toString().trim();

      if (firstCell && this.format.classHeaderPattern?.test(firstCell)) {
        // Önceki grubu kaydet
        if (currentClass && classStartRow >= 0) {
          this.groups.push({
            sinif: currentClass,
            baslangicSatir: classStartRow,
            bitisSatir: i - 1
          });
        }

        // Yeni sınıfı çıkar
        const match = firstCell.match(this.format.classExtractPattern);
        if (match) {
          currentClass = `${match[1]}-${match[2]}`;
          classStartRow = i + (this.format.dataStartRow - this.format.headerRow);
          logger.debug(`Sınıf tespit edildi: ${currentClass} (satır ${i})`);
        }
      }
    }

    // Son grubu da ekle
    if (currentClass && classStartRow >= 0) {
      this.groups.push({
        sinif: currentClass,
        baslangicSatir: classStartRow,
        bitisSatir: this.data.length - 1
      });
    }

    if (this.groups.length === 0) {
      logger.warn('Hiç sınıf grubu tespit edilemedi');
    } else {
      logger.info(`${this.groups.length} sınıf grubu tespit edildi`);
    }
  }

  /**
   * Öğrenci verilerini parse eder
   */
  parseStudents() {
    logger.debug('Öğrenci verileri parse ediliyor...');

    this.students = [];

    this.groups.forEach((group, groupIndex) => {
      const groupData = this.data.slice(group.baslangicSatir, group.bitisSatir + 1);

      logger.debug(`Grup ${groupIndex + 1} işleniyor: ${group.sinif} (${groupData.length} satır)`);

      groupData.forEach((row, rowIndex) => {
        if (!row || row.length < 3) return;

        try {
          const student = this.parseStudentRow(row, group.sinif, group.baslangicSatir + rowIndex);

          if (student) {
            this.students.push(student);
          }
        } catch (error) {
          logger.warn(`Satır ${group.baslangicSatir + rowIndex} parse edilemedi:`, error.message);
        }
      });
    });

    logger.info(`Toplam ${this.students.length} öğrenci parse edildi`);
  }

  /**
   * Tek bir öğrenci satırını parse eder
   */
  parseStudentRow(row, sinif, rowIndex) {
    // Sütun değerlerini çıkar
    const numara = this.getCellValue(row, this.columns.numara);
    const adi = this.getCellValue(row, this.columns.adi);
    const soyadi = this.getCellValue(row, this.columns.soyadi);
    const cinsiyetRaw = this.getCellValue(row, this.columns.cinsiyet);

    // Cinsiyeti standardize et
    const cinsiyet = this.standardizeGender(cinsiyetRaw);

    // Öğrenci objesi oluştur
    const student = {
      id: this.students.length + 1,
      ad: adi,
      soyad: soyadi || '',
      numara: numara,
      sinif: sinif,
      cinsiyet: cinsiyet,
      gecmisSkor: Math.floor(Math.random() * 40) + 60, // 60-100 arası
      ozelDurum: false
    };

    // Debug log (sadece development'da)
    if (process.env.NODE_ENV === 'development' && rowIndex < 5) {
      logger.debug(`Öğrenci parse edildi: ${student.ad} ${student.soyad} (${student.numara})`);
    }

    return student;
  }

  /**
   * Hücre değerini güvenli şekilde alır
   */
  getCellValue(row, columnIndex) {
    if (columnIndex === undefined || !row[columnIndex]) return '';

    const value = row[columnIndex].toString().trim();
    return value || '';
  }

  /**
   * Cinsiyet değerini standardize eder
   */
  standardizeGender(genderRaw) {
    if (!genderRaw) return 'E'; // Varsayılan erkek

    const gender = genderRaw.toString().trim().toLowerCase();

    // Kadın/Kız pattern'leri
    if (['k', 'kız', 'kadın', 'kadin', 'bayan', 'female', 'f'].includes(gender)) {
      return 'K';
    }

    // Erkek pattern'leri
    if (['e', 'erkek', 'bay', 'male', 'm'].includes(gender)) {
      return 'E';
    }

    // Bilinmeyen değerler için varsayılan
    logger.debug(`Bilinmeyen cinsiyet değeri: "${genderRaw}", varsayılan "E" atanıyor`);
    return 'E';
  }

  /**
   * Veriyi doğrular
   */
  validateData() {
    logger.debug('Veri validasyonu yapılıyor...');

    this.validationResults = validateStudentList(this.students);

    if (this.validationResults.summary.hasErrors) {
      logger.warn(`${this.validationResults.summary.invalidStudents} öğrenci verisinde hata var`);
    }

    if (this.validationResults.summary.hasWarnings) {
      logger.info(`${this.validationResults.summary.studentsWithWarnings} öğrenci verisinde uyarı var`);
    }
  }

  /**
   * Sonucu formatlar
   */
  formatResult() {
    const result = {
      success: true,
      format: this.format,
      totalStudents: this.students.length,
      groups: this.groups,
      students: this.students,
      validation: this.validationResults,
      statistics: {
        totalRows: this.data.length,
        parsedStudents: this.students.length,
        validStudents: this.validationResults.summary.validStudents,
        invalidStudents: this.validationResults.summary.invalidStudents,
        studentsWithWarnings: this.validationResults.summary.studentsWithWarnings,
        successRate: this.validationResults.summary.successRate
      }
    };

    // 12. sınıf kontrolü
    const twelfthGradeStudents = this.students.filter(s => s.sinif.startsWith('12-'));
    if (twelfthGradeStudents.length > 0) {
      result.hasTwelfthGrade = true;
      result.twelfthGradeCount = twelfthGradeStudents.length;
      result.twelfthGradeStudents = twelfthGradeStudents;
    }

    logger.info(`Parse sonucu: ${result.totalStudents} öğrenci, başarı oranı: ${result.statistics.successRate}%`);

    return result;
  }

  /**
   * Hata durumunda sonuç formatlar
   */
  formatError(error) {
    return {
      success: false,
      error: error.message,
      format: this.format,
      statistics: {
        totalRows: this.data.length || 0,
        parsedStudents: 0,
        validStudents: 0,
        invalidStudents: 0,
        studentsWithWarnings: 0,
        successRate: 0
      }
    };
  }
}

/**
 * Excel dosyasını parse etmek için kolay API
 */
export const parseExcelFile = async (file) => {
  // Dosya kontrolü
  if (!file) {
    throw new Error('Dosya seçilmedi');
  }

  // Dosya türü kontrolü
  const allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12'
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Desteklenmeyen dosya formatı');
  }

  const parser = new ExcelParser(file);
  return await parser.parse();
};
