/**
 * Next-NMT meeting configuration.
 *
 * Per Playbook §8: the admin sets the current "target" NMT once, and every
 * new commitment form defaults to it. Stored in localStorage (no DB round-trip,
 * no migration required). If the value is missing or malformed, callers get
 * DEFAULT_NEXT_MEETING back.
 */

export interface NextMeeting {
  name: string;
  date: string; // YYYY-MM-DD
}

export const DEFAULT_NEXT_MEETING: NextMeeting = {
  name: "NMT Madurai",
  date: "2026-07-17",
};

const STORAGE_KEY = "nmt-next-meeting";

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Read the next-NMT meeting from localStorage.
 * Returns DEFAULT_NEXT_MEETING on SSR, missing value, parse error, or
 * failed validation.
 */
export function getNextMeeting(): NextMeeting {
  if (typeof window === "undefined") return DEFAULT_NEXT_MEETING;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NEXT_MEETING;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      isValidName((parsed as { name?: unknown }).name) &&
      isValidDate((parsed as { date?: unknown }).date)
    ) {
      const { name, date } = parsed as NextMeeting;
      return { name: name.trim(), date };
    }
    return DEFAULT_NEXT_MEETING;
  } catch {
    return DEFAULT_NEXT_MEETING;
  }
}

/**
 * Persist the next-NMT meeting to localStorage.
 * Silently no-ops on SSR or if storage is unavailable (e.g. private mode).
 */
export function setNextMeeting(m: NextMeeting): void {
  if (typeof window === "undefined") return;
  try {
    const payload: NextMeeting = {
      name: m.name.trim(),
      date: m.date,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage unavailable — fail quietly; caller will see default on next read.
  }
}
