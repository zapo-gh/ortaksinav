import {
  TEST_PLAN_NAMES,
  DEFAULT_WEIGHTS,
  DEFAULT_LEARNING_RATE,
  MIN_WEIGHT_BOUND,
  MAX_WEIGHT_BOUND,
  MIN_PRIORITY_SCORE,
  PRIORITY_MULTIPLIERS,
  DEBOUNCE_SAVE_DELAY_MS,
  MAX_BACKUPS_RETAINED,
  AUTO_BACKUP_INTERVAL_MS,
  CLEANUP_INTERVAL_MS,
  TEMP_PLAN_MAX_AGE_MS,
  MAX_TEMP_PLANS,
  DRAGDROP_SAVE_DELAY_MS,
  MAX_RECORDED_MOVES,
  MAX_RECORDED_PREFERENCES,
  CONFIDENCE_MOVES_THRESHOLD,
  MAX_METRICS_RECORDED,
} from '../../config/constants';

describe('constants', () => {
  describe('TEST_PLAN_NAMES', () => {
    test('dizi olmalı', () => {
      expect(Array.isArray(TEST_PLAN_NAMES)).toBe(true);
    });

    test('boş olmamalı', () => {
      expect(TEST_PLAN_NAMES.length).toBeGreaterThan(0);
    });

    test('bilinen test isimlerini içermeli', () => {
      expect(TEST_PLAN_NAMES).toContain('test plan');
      expect(TEST_PLAN_NAMES).toContain('test');
      expect(TEST_PLAN_NAMES).toContain('demo plan');
    });

    test('tüm elemanlar string olmalı', () => {
      TEST_PLAN_NAMES.forEach(name => {
        expect(typeof name).toBe('string');
      });
    });
  });

  describe('DEFAULT_WEIGHTS', () => {
    test('tüm ağırlık alanlarını içermeli', () => {
      expect(DEFAULT_WEIGHTS).toHaveProperty('medicalNeeds');
      expect(DEFAULT_WEIGHTS).toHaveProperty('groupPreservation');
      expect(DEFAULT_WEIGHTS).toHaveProperty('genderBalance');
      expect(DEFAULT_WEIGHTS).toHaveProperty('classLevelMix');
      expect(DEFAULT_WEIGHTS).toHaveProperty('academicSimilarity');
    });

    test('ağırlıklar toplamı 1.0 olmalı', () => {
      const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0);
    });

    test('tüm ağırlıklar 0 ile 1 arasında olmalı', () => {
      Object.values(DEFAULT_WEIGHTS).forEach(w => {
        expect(w).toBeGreaterThan(0);
        expect(w).toBeLessThanOrEqual(1);
      });
    });

    test('medicalNeeds en yüksek ağırlık olmalı', () => {
      const max = Math.max(...Object.values(DEFAULT_WEIGHTS));
      expect(DEFAULT_WEIGHTS.medicalNeeds).toBe(max);
    });
  });

  describe('PRIORITY_MULTIPLIERS', () => {
    test('tüm alanları içermeli', () => {
      expect(PRIORITY_MULTIPLIERS).toHaveProperty('medical');
      expect(PRIORITY_MULTIPLIERS).toHaveProperty('group');
      expect(PRIORITY_MULTIPLIERS).toHaveProperty('gender');
      expect(PRIORITY_MULTIPLIERS).toHaveProperty('classLevel');
      expect(PRIORITY_MULTIPLIERS).toHaveProperty('academic');
    });

    test('medical en yüksek çarpan olmalı', () => {
      const max = Math.max(...Object.values(PRIORITY_MULTIPLIERS));
      expect(PRIORITY_MULTIPLIERS.medical).toBe(max);
    });

    test('tüm çarpanlar pozitif olmalı', () => {
      Object.values(PRIORITY_MULTIPLIERS).forEach(m => {
        expect(m).toBeGreaterThan(0);
      });
    });
  });

  describe('sınır değerler', () => {
    test('DEFAULT_LEARNING_RATE pozitif ve küçük olmalı', () => {
      expect(DEFAULT_LEARNING_RATE).toBeGreaterThan(0);
      expect(DEFAULT_LEARNING_RATE).toBeLessThan(1);
    });

    test('MIN_WEIGHT_BOUND < MAX_WEIGHT_BOUND', () => {
      expect(MIN_WEIGHT_BOUND).toBeLessThan(MAX_WEIGHT_BOUND);
    });

    test('MIN_PRIORITY_SCORE pozitif olmalı', () => {
      expect(MIN_PRIORITY_SCORE).toBeGreaterThan(0);
    });
  });

  describe('zamanlayıcılar', () => {
    test('DEBOUNCE_SAVE_DELAY_MS pozitif', () => {
      expect(DEBOUNCE_SAVE_DELAY_MS).toBeGreaterThan(0);
    });

    test('AUTO_BACKUP_INTERVAL_MS makul aralıkta', () => {
      expect(AUTO_BACKUP_INTERVAL_MS).toBeGreaterThanOrEqual(10000); // en az 10 sn
      expect(AUTO_BACKUP_INTERVAL_MS).toBeLessThanOrEqual(300000);   // en fazla 5 dk
    });

    test('CLEANUP_INTERVAL_MS en az 1 saat', () => {
      expect(CLEANUP_INTERVAL_MS).toBeGreaterThanOrEqual(3600000);
    });

    test('TEMP_PLAN_MAX_AGE_MS en az 1 gün', () => {
      expect(TEMP_PLAN_MAX_AGE_MS).toBeGreaterThanOrEqual(86400000);
    });
  });

  describe('limitler', () => {
    test('MAX_BACKUPS_RETAINED pozitif', () => {
      expect(MAX_BACKUPS_RETAINED).toBeGreaterThan(0);
    });

    test('MAX_TEMP_PLANS pozitif', () => {
      expect(MAX_TEMP_PLANS).toBeGreaterThan(0);
    });

    test('MAX_RECORDED_MOVES > MAX_RECORDED_PREFERENCES', () => {
      expect(MAX_RECORDED_MOVES).toBeGreaterThan(MAX_RECORDED_PREFERENCES);
    });

    test('CONFIDENCE_MOVES_THRESHOLD pozitif', () => {
      expect(CONFIDENCE_MOVES_THRESHOLD).toBeGreaterThan(0);
    });

    test('MAX_METRICS_RECORDED pozitif', () => {
      expect(MAX_METRICS_RECORDED).toBeGreaterThan(0);
    });
  });
});
