/** Money is integer cents everywhere; this is the only place it becomes text. 149999 → "$1,499.99"; 45 → "$0.45"; 0 → "$0.00". */
export function usd(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error(`not an amount in cents: ${cents}`);
  const whole = Math.floor(cents / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${whole}.${String(cents % 100).padStart(2, '0')}`;
}
/** The billing unit as people read it: "managed-room-month" → "per managed room, per month". */
export function unitLabel(unit: string): string {
  const KNOWN: Record<string, string> = {
    'tenant-month-minimum': 'per tenant, per month (minimum)', 'trial-once': 'once, for one 14-day trial',
  };
  if (KNOWN[unit]) return KNOWN[unit]!;
  const m = /^(.*)-month$/.exec(unit);
  return m ? `per ${m[1]!.replace(/-/g, ' ')}, per month` : unit.replace(/-/g, ' ');
}
