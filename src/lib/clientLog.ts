/**
 * A small, persistent client event log.
 *
 * When a publish does not reach someone, the useful facts (which service
 * worker answered, whether the cache purge ran, whether the reload landed on a
 * new build) are gone by the time they tell us. This keeps the last N of them
 * in localStorage so the troubleshooting panel — and anyone helping over a
 * message — can read them back.
 *
 * Deliberately dumb: no ids, no network, no personal data. Messages only.
 */
export type ClientLogLevel = 'info' | 'warn' | 'error';

export interface ClientLogEntry {
  at: string;
  level: ClientLogLevel;
  scope: string;
  message: string;
}

const KEY = 'up_client_log';
const LIMIT = 80;

export const readClientLog = (): ClientLogEntry[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as ClientLogEntry[]) : [];
  } catch {
    return [];
  }
};

export const logClientEvent = (
  scope: string,
  message: string,
  level: ClientLogLevel = 'info',
): void => {
  const entry: ClientLogEntry = { at: new Date().toISOString(), level, scope, message };
  try {
    const next = [...readClientLog(), entry].slice(-LIMIT);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage disabled — the console line below is all we get.
  }
  const line = `[${scope}] ${message}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
};

export const clearClientLog = (): void => {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
};

/** Plain text, for pasting into a message when reporting a problem. */
export const formatClientLog = (entries: ClientLogEntry[]): string =>
  entries.map(e => `${e.at} ${e.level.toUpperCase()} [${e.scope}] ${e.message}`).join('\n');
