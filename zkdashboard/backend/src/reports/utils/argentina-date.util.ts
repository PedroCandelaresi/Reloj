import { BadRequestException } from '@nestjs/common';

export const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';
const ARGENTINA_OFFSET = '-03:00';
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const argentinaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ARGENTINA_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const argentinaDateTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  timeZone: ARGENTINA_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function getArgentinaDateKey(date: Date): string {
  const parts = argentinaDateFormatter.formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

export function todayArgentinaDateKey(): string {
  return getArgentinaDateKey(new Date());
}

export function formatArgentinaDateTime(date: Date | null): string {
  if (!date) {
    return '';
  }

  return argentinaDateTimeFormatter.format(date);
}

export function parseArgentinaDateStart(dateString: string): Date {
  assertDateKey(dateString);
  return new Date(`${dateString}T00:00:00.000${ARGENTINA_OFFSET}`);
}

export function parseArgentinaDateEnd(dateString: string): Date {
  assertDateKey(dateString);
  return new Date(`${dateString}T23:59:59.999${ARGENTINA_OFFSET}`);
}

export function diffDaysInclusive(dateFrom: string, dateTo: string): number {
  const from = dateKeyToUtcDay(dateFrom);
  const to = dateKeyToUtcDay(dateTo);
  return Math.floor((to - from) / 86_400_000) + 1;
}

export function assertValidDateRange(dateFrom: string, dateTo: string): void {
  if (diffDaysInclusive(dateFrom, dateTo) < 1) {
    throw new BadRequestException('dateFrom debe ser menor o igual a dateTo.');
  }
}

export function assertMaxRangeDays(dateFrom: string, dateTo: string, maxDays: number): void {
  assertValidDateRange(dateFrom, dateTo);

  if (diffDaysInclusive(dateFrom, dateTo) > maxDays) {
    throw new BadRequestException(`El rango máximo permitido para este reporte es de ${maxDays} días.`);
  }
}

export function normalizeArgentinaDate(value?: string): string {
  return value && DATE_KEY_RE.test(value) ? value : todayArgentinaDateKey();
}

export function eachArgentinaDate(dateFrom: string, dateTo: string): string[] {
  assertDateKey(dateFrom);
  assertDateKey(dateTo);

  const dates: string[] = [];
  let current = dateKeyToUtcDay(dateFrom);
  const end = dateKeyToUtcDay(dateTo);

  while (current <= end) {
    dates.push(utcDayToDateKey(current));
    current += 86_400_000;
  }

  return dates;
}

export function argentinaMonthDateRange(year: number, month: number): { dateFrom: string; dateTo: string } {
  const lastDay = getDaysInMonth(year, month);
  return {
    dateFrom: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`,
    dateTo: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function formatArgentinaTime(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function assertDateKey(dateString: string): void {
  if (!DATE_KEY_RE.test(dateString)) {
    throw new BadRequestException('La fecha debe tener formato YYYY-MM-DD.');
  }
}

function dateKeyToUtcDay(dateString: string): number {
  assertDateKey(dateString);
  const [year, month, day] = dateString.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function utcDayToDateKey(utcDay: number): string {
  const date = new Date(utcDay);
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function getDaysInMonth(year: number, month: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1];
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
