/**
 * Merkezi uygulama sabitleri.
 * Dağınık magic string/number'ları tek noktada toplar.
 */

// ─── Test Plan İsimleri ────────────────────────────────────────
export const TEST_PLAN_NAMES = [
  'test plan',
  'valid plan',
  'minimal plan',
  'plan 1',
  'plan 2',
  'plan 3',
  'plan 4',
  'plan 5',
  'test',
  'geçici plan',
  'temp plan',
  'sample plan',
  'demo plan',
];

// ─── Algoritma Ağırlıkları ────────────────────────────────────
export const DEFAULT_WEIGHTS = {
  medicalNeeds: 0.40,
  groupPreservation: 0.25,
  genderBalance: 0.20,
  classLevelMix: 0.10,
  academicSimilarity: 0.05,
};

export const DEFAULT_LEARNING_RATE = 0.1;
export const MIN_WEIGHT_BOUND = 0.1;
export const MAX_WEIGHT_BOUND = 1.0;
export const MIN_PRIORITY_SCORE = 1;

export const PRIORITY_MULTIPLIERS = {
  medical: 50,
  group: 30,
  gender: 20,
  classLevel: 15,
  academic: 10,
};

// ─── Depolama & Yedekleme ──────────────────────────────────────
export const DEBOUNCE_SAVE_DELAY_MS = 2000;
export const MAX_BACKUPS_RETAINED = 5;
export const AUTO_BACKUP_INTERVAL_MS = 30000;

// ─── Temizlik ──────────────────────────────────────────────────
export const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;   // 24 saat
export const TEMP_PLAN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün
export const MAX_TEMP_PLANS = 3;

// ─── Sürükle-Bırak Öğrenme ────────────────────────────────────
export const DRAGDROP_SAVE_DELAY_MS = 2000;
export const MAX_RECORDED_MOVES = 1000;
export const MAX_RECORDED_PREFERENCES = 500;
export const CONFIDENCE_MOVES_THRESHOLD = 50;

// ─── Metrik Takip ──────────────────────────────────────────────
export const MAX_METRICS_RECORDED = 100;
