const STORAGE_KEY = 'backguard.progress.v1';

export interface ExerciseRecord {
  repsDone: number;
  targetReps: number;
  completed: boolean;
}

export interface DayRecord {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Reps completed per exercise id that day. */
  reps: Record<string, number>;
  /** True once the full daily set was finished. */
  dayComplete: boolean;
}

export interface Progress {
  version: 1;
  currentStreak: number;
  longestStreak: number;
  /** Most recent days first. */
  days: DayRecord[];
}

const EMPTY: Progress = {
  version: 1,
  currentStreak: 0,
  longestStreak: 0,
  days: [],
};

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadProgress(): Progress {
  if (typeof localStorage === 'undefined') return EMPTY;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      parsed.version === 1 &&
      'days' in parsed &&
      Array.isArray(parsed.days)
    ) {
      return parsed as Progress;
    }
    return EMPTY;
  } catch {
    return EMPTY;
  }
}

export function saveProgress(progress: Progress): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Storage full or blocked. Progress is a convenience, not a requirement.
  }
}

/** Record one completed rep or hold, and return the updated progress. */
export function recordRep(exerciseId: string, timestamp = new Date()): Progress {
  const progress = loadProgress();
  const date = toLocalIsoDate(timestamp);
  const existing = progress.days.find((d) => d.date === date);
  const reps = existing ? { ...existing.reps } : {};
  reps[exerciseId] = (reps[exerciseId] ?? 0) + 1;

  const others = progress.days.filter((d) => d.date !== date);
  const entry: DayRecord = { date, reps, dayComplete: existing?.dayComplete ?? false };
  const days = [entry, ...others].sort((a, b) => (a.date < b.date ? 1 : -1));
  const next: Progress = { ...progress, days };
  saveProgress(next);
  return next;
}

export function markDayComplete(date = todayIso()): Progress {
  const progress = loadProgress();
  const existing = progress.days.find((d) => d.date === date);
  const days = progress.days.map((d) => (d.date === date ? { ...d, dayComplete: true } : d));
  if (!existing) {
    days.unshift({ date, reps: {}, dayComplete: true });
  }
  days.sort((a, b) => (a.date < b.date ? 1 : -1));

  const streak = computeStreak(days);
  const next: Progress = {
    ...progress,
    days,
    currentStreak: streak,
    longestStreak: Math.max(progress.longestStreak, streak),
  };
  saveProgress(next);
  return next;
}

function computeStreak(days: DayRecord[]): number {
  const complete = new Set(days.filter((d) => d.dayComplete).map((d) => d.date));
  let streak = 0;
  const cursor = new Date();
  // Allow the streak to start today; if today is not done, start from yesterday.
  if (!complete.has(toLocalIsoDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (;;) {
    if (!complete.has(toLocalIsoDate(cursor))) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Local calendar date, not UTC, so streaks do not flip at midnight. */
function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}