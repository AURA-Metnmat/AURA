/**
 * Parse a numeric value (query param or body field) into a finite integer with a
 * safe fallback and optional clamping. Guards against NaN reaching Prisma
 * (e.g. `take: NaN` or an Int column write), which throws and surfaces as an
 * opaque 500. Invalid/missing input falls back instead of crashing.
 */
export function parseIntParam(
  raw: unknown,
  fallback: number,
  opts?: { min?: number; max?: number }
): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  let value = Number.isFinite(n) ? Math.trunc(n) : fallback;
  if (opts?.min !== undefined) value = Math.max(value, opts.min);
  if (opts?.max !== undefined) value = Math.min(value, opts.max);
  return value;
}

/**
 * Safely JSON.parse a string column, returning null instead of throwing on
 * malformed/null input. Guards list endpoints where one bad row would otherwise
 * fail the entire response.
 */
export function safeJsonParse<T = unknown>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Parse a date input into a valid Date, or return null if missing/invalid.
 * Guards against `new Date("garbage")` producing an Invalid Date that Prisma
 * rejects with a 500.
 */
export function parseDateParam(raw: unknown): Date | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const d = new Date(raw as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}
