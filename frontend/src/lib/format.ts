/** en-ZA formatting helpers (NFR-04). */

export function money(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const hasCents = Math.round(value * 100) % 100 !== 0;
  const s = new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return (value < 0 ? '-R ' : 'R ') + s;
}

/** R 420k / R 1.2m */
export function moneyShort(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `R ${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`;
  if (abs >= 10_000) return `R ${Math.round(value / 1_000)}k`;
  return money(value);
}

export function num(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-ZA', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
}

export function pct(value: number | null | undefined, digits = 1, signed = false): string {
  if (value === null || value === undefined) return '—';
  const s = value.toFixed(digits);
  return (signed && value > 0 ? '+' : '') + s + '%';
}

const dateFmt = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Johannesburg' });
const dateTimeFmt = new Intl.DateTimeFormat('en-ZA', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg',
});

export function date(value: string | null | undefined): string {
  if (!value) return '—';
  const d = value.length === 10 ? new Date(value + 'T12:00:00') : new Date(value);
  return dateFmt.format(d);
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return dateTimeFmt.format(new Date(value));
}

/** "in 3 days", "2 h ago" */
export function relative(value: string | null | undefined): string {
  if (!value) return '—';
  const diffMs = new Date(value).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const h = abs / 36e5;
  const label = h < 1 ? `${Math.max(1, Math.round(abs / 6e4))} min` : h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} days`;
  return diffMs >= 0 ? `in ${label}` : `${label} ago`;
}

export function hours(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const a = Math.abs(value);
  const txt = a >= 48 ? `${Math.round(a / 24)} days` : `${Math.round(a)} h`;
  return value < 0 ? `${txt} overdue` : `${txt} left`;
}

/** yyyy-mm-dd for <input type="date"> */
export function isoDate(d: Date = new Date()): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function addDays(days: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}
