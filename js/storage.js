const BEST_KEY = 'fruit2048.best';
const HINTS_KEY = 'fruit2048.hints';
const DEFAULT_HINTS = 5;

export function loadBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const value = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {}
}

export function loadHints() {
  try {
    const raw = localStorage.getItem(HINTS_KEY);
    if (raw === null) return DEFAULT_HINTS;
    const value = parseInt(raw, 10);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_HINTS;
  } catch {
    return DEFAULT_HINTS;
  }
}

export function saveHints(value) {
  try {
    localStorage.setItem(HINTS_KEY, String(value));
  } catch {}
}

export const HINTS_DEFAULT = DEFAULT_HINTS;