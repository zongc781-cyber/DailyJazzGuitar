// Date formatting for calendar dates ("YYYY-MM-DD"). A fixed locale keeps the server and browser
// output identical, so hydration never mismatches.

const LOCALE = 'en-GB';
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(opts: Intl.DateTimeFormatOptions) {
  const id = JSON.stringify(opts);
  let f = formatters.get(id);
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE, { ...opts, timeZone: 'UTC' });
    formatters.set(id, f);
  }
  return f;
}

function utc(dateKey: string) {
  const [y, m, d] = dateKey.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** "21 Oct 2026" */
export function formatDate(dateKey: string): string {
  return formatter({ day: 'numeric', month: 'short', year: 'numeric' }).format(utc(dateKey));
}

/** "Wednesday 21 October" */
export function formatLongDate(dateKey: string): string {
  return formatter({ weekday: 'long', day: 'numeric', month: 'long' }).format(utc(dateKey));
}

/** "Wed" */
export function formatWeekday(dateKey: string): string {
  return formatter({ weekday: 'short' }).format(utc(dateKey));
}

/** "21 Oct" */
export function formatShortDate(dateKey: string): string {
  return formatter({ day: 'numeric', month: 'short' }).format(utc(dateKey));
}
