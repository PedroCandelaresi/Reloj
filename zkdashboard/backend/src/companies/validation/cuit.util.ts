export function normalizeCuit(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\D/g, '');
}

export function isValidCuit(value: string): boolean {
  if (!/^\d{11}$/.test(value)) {
    return false;
  }

  const digits = value.split('').map((digit) => Number.parseInt(digit, 10));
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const checksum = weights.reduce((total, weight, index) => total + digits[index] * weight, 0);
  const remainder = checksum % 11;
  const verifier = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;

  return verifier === digits[10];
}
