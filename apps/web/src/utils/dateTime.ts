const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';

export const SHANGHAI_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';

function parseDateTime(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = String(value).trim();
  if (!text) return null;
  // API date-only and datetime-local values are business time in Shanghai.
  if (/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)?$/.test(text)) {
    const normalized = text.replace(' ', 'T');
    const withTime = normalized.length === 10 ? `${normalized}T00:00` : normalized;
    const date = new Date(`${withTime}+08:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatShanghaiDateTime(value: string | Date | null | undefined, fallback = '-'): string {
  const date = parseDateTime(value);
  if (!date) return fallback;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

export function toShanghaiIso(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = parseDateTime(value);
  return date ? date.toISOString() : value;
}

export function toShanghaiDateTimeLocal(value: string | null | undefined): string | undefined {
  const date = parseDateTime(value);
  if (!date) return undefined;
  return formatShanghaiDateTime(date).replace(' ', 'T');
}

export function formatShanghaiDate(value: string | Date | null | undefined, fallback = '-'): string {
  return formatShanghaiDateTime(value, fallback).slice(0, 10);
}
