import type { Locale } from '@codevena/forq-schema';

const MONTHS_DE = [
  'Jan.',
  'Feb.',
  'März',
  'Apr.',
  'Mai',
  'Juni',
  'Juli',
  'Aug.',
  'Sep.',
  'Okt.',
  'Nov.',
  'Dez.',
];
const MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function formatMonthYear(iso: string, locale: Locale): string {
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(iso);
  if (!match) return iso;
  const year = match[1];
  const monthNum = match[2] ? Number.parseInt(match[2], 10) : null;
  if (!monthNum || !year) return year ?? iso;
  const months = locale === 'de' ? MONTHS_DE : MONTHS_EN;
  return `${months[monthNum - 1]} ${year}`;
}

export function formatDateRange(
  start: string,
  end: string | undefined,
  locale: Locale,
  presentLabel: string,
): string {
  const s = formatMonthYear(start, locale);
  const e = end ? formatMonthYear(end, locale) : presentLabel;
  return `${s} – ${e}`;
}
