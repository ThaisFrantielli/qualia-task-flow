const DEFAULT_PREFIX = 'CLI';
const DEFAULT_DIGITS = 6;

export function normalizeClienteCodigo(raw?: string | null): string {
  const input = (raw || '').toString().trim();
  if (!input) {
    return generateClienteCodigo();
  }

  const upper = input.toUpperCase();
  const digits = input.replace(/\D/g, '');

  // Numeric-only legacy codes: 5321 -> CLI-005321
  if (/^\d+$/.test(input) && digits) {
    return `${DEFAULT_PREFIX}-${digits.padStart(DEFAULT_DIGITS, '0')}`;
  }

  // Already CLI-like: CLI-12, cli12, CLI_001 -> CLI-000012
  if (upper.startsWith(DEFAULT_PREFIX)) {
    if (digits) {
      return `${DEFAULT_PREFIX}-${digits.padStart(DEFAULT_DIGITS, '0')}`;
    }

    const normalizedSuffix = upper
      .replace(/^CLI[-_\s]*/i, '')
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return normalizedSuffix ? `${DEFAULT_PREFIX}-${normalizedSuffix}` : generateClienteCodigo();
  }

  // Alphanumeric legacy without prefix: ABC-123 -> CLI-ABC-123
  const slug = upper
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug) {
    return generateClienteCodigo();
  }

  return `${DEFAULT_PREFIX}-${slug}`;
}

export function generateClienteCodigo(seed?: number): string {
  const base = seed ?? Date.now() % 1_000_000;
  const numeric = Math.abs(base).toString().slice(-DEFAULT_DIGITS).padStart(DEFAULT_DIGITS, '0');
  return `${DEFAULT_PREFIX}-${numeric}`;
}
