export const money = (v: number, currency = 'INR', compact = false): string => {
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: compact ? 1 : 0,
      notation: compact ? 'compact' : 'standard',
    }).format(v);
  } catch {
    return v.toFixed(0); // unknown currency code from the API
  }
};

export const pct = (v: number, digits = 1): string =>
  `${v > 0 ? '+' : ''}${v.toFixed(digits)}%`;

export const num = (v: number, digits = 2): string => (Number.isFinite(v) ? v.toFixed(digits) : '∞');

export const tone = (v: number): string => (v > 0 ? 'text-[var(--pos)]' : v < 0 ? 'text-[var(--neg)]' : '');

export const cn = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(' ');
