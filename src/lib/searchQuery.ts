/**
 * Helpers for turning user-typed search text into safe PostgREST filters.
 *
 * PostgREST parses commas, parentheses, dots and quotes inside filter strings,
 * so raw user text interpolated into `.or(...)` / `.ilike(...)` can append or
 * break filter conditions. Everything typed by a person goes through here first.
 */

/** Strip characters PostgREST treats as filter syntax, and LIKE wildcards. */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[,()."'\\*%_:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

/** A safe `%term%` pattern for `.ilike()` / `.or()` filters. */
export function ilikePattern(raw: string): string {
  return `%${sanitizeSearchTerm(raw)}%`;
}
