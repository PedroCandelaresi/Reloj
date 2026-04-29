export function maskTimeInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function maskDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function maskDateTimeInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  const date = maskDateInput(digits.slice(0, 8));
  const time = maskTimeInput(digits.slice(8));
  return time ? `${date} ${time}` : date;
}

export function isoToDisplayDate(value?: string | null): string {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

export function displayDateToIso(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return '';
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return `${year}-${month}-${day}`;
}

export function isoToDisplayDateTime(value?: string | null): string {
  if (!value) return '';
  const [datePart, timePart = ''] = value.split('T');
  const date = isoToDisplayDate(datePart);
  const time = timePart.slice(0, 5);
  return [date, time].filter(Boolean).join(' ');
}

export function displayDateTimeToIso(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8) return '';
  const date = displayDateToIso(digits.slice(0, 8));
  if (!date) return '';
  if (digits.length < 12) return date;
  return `${date}T${digits.slice(8, 10)}:${digits.slice(10, 12)}`;
}

export function monthDayToDisplay(value?: string | null): string {
  if (!value) return '';
  const [month, day] = value.split('-');
  if (!month || !day) return '';
  return `${day}/${month}`;
}

export function displayToMonthDay(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length !== 4) return '';
  return `${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

export function maskDayMonthInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}
