/**
 * Web Worker for Algorithm Processing
 * Handles heavy computations in background thread
 */

// Import required modules
import { gelismisYerlestirme } from '../algorithms/gelismisYerlestirmeAlgoritmasi.js';
import { validateStudentList } from '../utils/studentValidation.js';
import { parseExcelFile } from '../utils/excelParser.js';
import logger from '../utils/logger.js';

// Worker message handler
self.onmessage = async function (e) {
  const { type, data } = e.data;

  try {
    switch (type) {
      case 'RUN_ALGORITHM':
        await handleAlgorithmRun(data);
        break;

      case 'VALIDATE_DATA':
        await handleDataValidation(data);
        break;

      case 'PARSE_EXCEL':
        await handleExcelParse(data);
        break;

      default:
        self.postMessage({
          type: 'ERROR',
          error: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Handle algorithm execution
 */
async function handleAlgorithmRun(data) {
  const { ogrenciler, salonlar, ayarlar } = data;

  // Progress callback wrapper
  // Not: gelismisYerlestirme şu an progress callback desteklemiyor olabilir,
  // ancak ileride desteklerse buraya eklenebilir.
  const progressCallback = (progress, message) => {
    self.postMessage({
      type: 'PROGRESS',
      progress,
      message
    });
  };

  try {
    progressCallback(10, 'Algoritma hazırlanıyor...');

    // Run the actual algorithm
    // Not: gelismisYerlestirme senkron veya asenkron olabilir, await ile garantiye alalım
    const result = await gelismisYerlestirme(ogrenciler, salonlar, ayarlar);

    progressCallback(100, 'Tamamlandı!');

    self.postMessage({
      type: 'ALGORITHM_COMPLETE',
      result
    });

  } catch (error) {
    logger.error('Algorithm worker error:', error);
    self.postMessage({
      type: 'ALGORITHM_ERROR',
      error: error.message || 'Algoritma çalıştırılırken bir hata oluştu'
    });
  }
}

/**
 * Handle data validation
 */
async function handleDataValidation(data) {
  const { students } = data;

  try {
    self.postMessage({
      type: 'VALIDATION_PROGRESS',
      progress: 50,
      message: 'Veriler doğrulanıyor...'
    });

    // Run real validation
    const result = validateStudentList(students);

    self.postMessage({
      type: 'VALIDATION_COMPLETE',
      result
    });

  } catch (error) {
    logger.error('Validation worker error:', error);
    self.postMessage({
      type: 'VALIDATION_ERROR',
      error: error.message || 'Validasyon sırasında bir hata oluştu'
    });
  }
}

/**
 * Handle Excel parsing
 */
async function handleExcelParse(data) {
  const { file, options } = data;

  try {
    self.postMessage({
      type: 'PARSE_PROGRESS',
      progress: 20,
      message: 'Excel dosyası işleniyor...'
    });

    // Run real excel parser
    const result = await parseExcelFile(file);

    self.postMessage({
      type: 'PARSE_COMPLETE',
      result
    });

  } catch (error) {
    logger.error('Excel parser worker error:', error);
    self.postMessage({
      type: 'PARSE_ERROR',
      error: error.message || 'Excel dosyası işlenirken bir hata oluştu'
    });
  }
}

// Worker ready notification
self.postMessage({
  type: 'WORKER_READY'
});
