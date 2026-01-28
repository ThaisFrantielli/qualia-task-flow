export interface NormalizePhoneOptions {
  defaultCountryCode?: string; // digits only, e.g. '55'
}

// Returns digits only suitable for https://wa.me/<digits>
// - Strips non-digits
// - Adds default country code when missing (defaults to Brazil '55')
// - Applies light validation (E.164-ish + Brazil-specific sanity checks when startsWith('55'))
export const normalizePhoneForWhatsApp = (
  raw: string | null | undefined,
  options: NormalizePhoneOptions = {}
): string | null => {
  if (!raw) return null;

  const defaultCountryCode = options.defaultCountryCode ?? '55';

  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;

  // Remove common trunk prefixes (leading zeros)
  digits = digits.replace(/^0+/, '');

  // If it looks like a local BR number (DDD + number), prepend 55
  if (!digits.startsWith(defaultCountryCode) && (digits.length === 10 || digits.length === 11)) {
    digits = `${defaultCountryCode}${digits}`;
  }

  // Basic length validation
  if (!/^\d{10,15}$/.test(digits)) return null;

  // Brazil sanity check: 55 + DDD(2) + number(8 or 9)
  if (digits.startsWith('55') && digits.length !== 12 && digits.length !== 13) {
    return null;
  }

  return digits;
};
