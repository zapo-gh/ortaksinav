import { validateStudentList, validateStudent } from '../../utils/studentValidation';

// Mock logger to avoid undefined errors
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  log: jest.fn()
}));

describe('Student Validation Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validStudent = {
    id: 1,
    ad: 'Ahmet',
    soyad: 'Yılmaz',
    numara: '1001',
    sinif: '9-A',
    cinsiyet: 'E'
  };

  const invalidStudent = {
    id: 2,
    ad: '',
    soyad: 'Kara',
    numara: '',
    sinif: '9-A',
    cinsiyet: 'K'
  };

  describe('validateStudent', () => {
    it('should validate correct student data', () => {
      const result = validateStudent(validStudent);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const result = validateStudent(invalidStudent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect missing student number', () => {
      const studentWithoutNumber = { ...validStudent, numara: '' };
      const result = validateStudent(studentWithoutNumber);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Öğrenci numarası gerekli');
    });

    it('should detect missing first name', () => {
      const studentWithoutName = { ...validStudent, ad: '' };
      const result = validateStudent(studentWithoutName);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Öğrenci adı gerekli');
    });

    it('should detect invalid class format', () => {
      const studentWithInvalidClass = { ...validStudent, sinif: 'InvalidClass' };
      const result = validateStudent(studentWithInvalidClass);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Geçersiz sınıf formatı');
    });

    it('should detect invalid gender', () => {
      const studentWithInvalidGender = { ...validStudent, cinsiyet: 'X' };
      const result = validateStudent(studentWithInvalidGender);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Geçersiz cinsiyet');
    });

    it('should warn about missing last name', () => {
      const studentWithoutLastName = { ...validStudent, soyad: '' };
      const result = validateStudent(studentWithoutLastName);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Soyad bilgisi eksik');
    });

    it('should handle null student data', () => {
      const result = validateStudent(null);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Öğrenci verisi boş olamaz');
    });

    it('should handle undefined student data', () => {
      const result = validateStudent(undefined);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Öğrenci verisi boş olamaz');
    });
  });

  describe('validateStudent (detailed)', () => {
    it('should validate student number format', () => {
      const validNumbers = ['1001', '2024001', '12345'];
      const invalidNumbers = ['', 'abc', '12.34'];

      validNumbers.forEach(numara => {
        const student = { ...validStudent, numara };
        const result = validateStudent(student);
        expect(result.isValid).toBe(true);
      });

      invalidNumbers.forEach(numara => {
        const student = { ...validStudent, numara };
        const result = validateStudent(student);
        expect(result.isValid).toBe(false);
      });
    });

    it('should validate class format', () => {
      const validClasses = ['9-A', '10-B', '11-C', '12-D'];
      const invalidClasses = ['9A', '10', 'Invalid', ''];

      validClasses.forEach(sinif => {
        const student = { ...validStudent, sinif };
        const result = validateStudent(student);
        expect(result.isValid).toBe(true);
      });

      invalidClasses.forEach(sinif => {
        const student = { ...validStudent, sinif };
        const result = validateStudent(student);
        expect(result.isValid).toBe(false);
      });
    });

    it('should validate gender values', () => {
      const validGenders = ['E', 'K'];
      const invalidGenders = ['M', 'F', 'X', ''];

      validGenders.forEach(cinsiyet => {
        const student = { ...validStudent, cinsiyet };
        const result = validateStudent(student);
        expect(result.isValid).toBe(true);
      });

      invalidGenders.forEach(cinsiyet => {
        const student = { ...validStudent, cinsiyet };
        const result = validateStudent(student);
        expect(result.isValid).toBe(false);
      });
    });

    it('should validate name fields', () => {
      const validNames = ['Ahmet', 'Ayşe', 'Mehmet', 'Fatma'];
      const invalidNames = ['', '   ', 'A', '123'];

      validNames.forEach(ad => {
        const student = { ...validStudent, ad };
        const result = validateStudent(student);
        expect(result.isValid).toBe(true);
      });

      invalidNames.forEach(ad => {
        const student = { ...validStudent, ad };
        const result = validateStudent(student);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateStudentList', () => {
    it('should validate list of students', () => {
      const students = [validStudent, invalidStudent];
      const result = validateStudentList(students);
      
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('students');
      expect(result.summary).toHaveProperty('totalStudents');
      expect(result.summary).toHaveProperty('validStudents');
      expect(result.summary).toHaveProperty('invalidStudents');
      expect(result.summary).toHaveProperty('studentsWithWarnings');
      expect(result.summary).toHaveProperty('successRate');
    });

    it('should calculate correct statistics', () => {
      const students = [validStudent, validStudent, invalidStudent];
      const result = validateStudentList(students);
      
      expect(result.summary.totalStudents).toBe(3);
      expect(result.summary.validStudents).toBe(2);
      expect(result.summary.invalidStudents).toBe(1);
      expect(result.summary.successRate).toBeCloseTo(66.67, 1);
    });

    it('should handle empty student list', () => {
      const result = validateStudentList([]);
      
      expect(result.summary.totalStudents).toBe(0);
      expect(result.summary.validStudents).toBe(0);
      expect(result.summary.invalidStudents).toBe(0);
      expect(result.summary.successRate).toBe(100);
    });

    it('should handle null student list', () => {
      const result = validateStudentList(null);

      expect(result.summary.totalStudents).toBe(0);
      expect(result.summary.validStudents).toBe(0);
      expect(result.summary.invalidStudents).toBe(0);
      expect(result.summary.successRate).toBe(0);
    });

    it('should handle undefined student list', () => {
      const result = validateStudentList(undefined);

      expect(result.summary.totalStudents).toBe(0);
      expect(result.summary.validStudents).toBe(0);
      expect(result.summary.invalidStudents).toBe(0);
      expect(result.summary.successRate).toBe(0);
    });

    it('should provide detailed validation results for each student', () => {
      const students = [validStudent, invalidStudent];
      const result = validateStudentList(students);
      
      expect(result.students).toHaveLength(2);
      expect(result.students[0].isValid).toBe(true);
      expect(result.students[1].isValid).toBe(false);
    });

    it('should handle duplicate student numbers', () => {
      const duplicateStudents = [
        { ...validStudent, numara: '1001' },
        { ...validStudent, id: 2, numara: '1001' }
      ];
      
      const result = validateStudentList(duplicateStudents);
      
      expect(result.summary.invalidStudents).toBeGreaterThan(0);
      expect(result.students.some(s => s.errors.includes('Öğrenci numarası zaten kullanılıyor'))).toBe(true);
    });

    it('should handle large student lists', () => {
      const largeStudentList = Array.from({ length: 100 }, (_, i) => ({
        ...validStudent,
        id: i + 1,
        numara: `${1000 + i}`
      }));
      
      const result = validateStudentList(largeStudentList);
      
      expect(result.summary.totalStudents).toBe(100);
      expect(result.summary.validStudents).toBe(100);
      expect(result.summary.invalidStudents).toBe(0);
      expect(result.summary.successRate).toBe(100);
    });
  });

  describe('Validation Edge Cases', () => {
    it('should handle students with special characters in names', () => {
      const specialCharStudent = {
        ...validStudent,
        ad: 'Ahmet-Çağrı',
        soyad: 'Yılmaz-Özkan'
      };
      
      const result = validateStudent(specialCharStudent);
      
      expect(result.isValid).toBe(true);
    });

    it('should handle students with numeric names', () => {
      const numericNameStudent = {
        ...validStudent,
        ad: '123',
        soyad: '456'
      };
      
      const result = validateStudent(numericNameStudent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Geçersiz ad formatı');
    });

    it('should handle students with very long names', () => {
      const longNameStudent = {
        ...validStudent,
        ad: 'A'.repeat(100)
      };
      
      const result = validateStudent(longNameStudent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Ad çok uzun');
    });

    it('should handle students with whitespace-only names', () => {
      const whitespaceStudent = {
        ...validStudent,
        ad: '   ',
        soyad: '\t\n'
      };
      
      const result = validateStudent(whitespaceStudent);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Öğrenci adı gerekli');
    });
  });
});






































