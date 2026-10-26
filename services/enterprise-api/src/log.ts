/** Structured JSON logs (one line per event) with the correlation id. Never logs tokens, passwords or request bodies. */
export type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const min = ORDER[(process.env['LOG_LEVEL'] as Level) || 'info'] ?? 20;
export function log(level: Level, msg: string, fields: Record<string, unknown> = {}): void {
  if (ORDER[level] < min) return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, service: 'enterprise-api', ...fields });
  (level === 'error' || level === 'warn' ? process.stderr : process.stdout).write(`${line}\n`);
}
