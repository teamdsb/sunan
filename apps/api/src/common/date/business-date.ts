const BUSINESS_TIME_ZONE = 'Asia/Shanghai';

/**
 * Parse a user-entered date-time using the product business time zone when
 * the browser sends a datetime-local value without an explicit offset.
 */
export function toBusinessDateTime(value: string): Date {
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
    ? value
    : `${value}+08:00`;
  return new Date(normalized);
}

/**
 * Convert an ISO date-time to the business calendar date used by legacy DATE
 * columns. Values without an explicit offset are interpreted in the business
 * time zone instead of the API process time zone.
 */
export function toBusinessDate(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  const date = toBusinessDateTime(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
