export interface ContrastResult {
  ok: boolean;
  ratio: number;
  inverted: boolean;
}

/** Minimum dots-vs-background contrast ratio for reliable scanning. */
export const MIN_QR_CONTRAST = 4;

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized.split('').map((c) => c + c).join('')
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check whether a dots/background color pair will scan reliably.
 * `inverted` means the dots are lighter than the background — many scanner
 * apps reject light-on-dark codes even at high contrast.
 */
export function checkQrContrast(dots: string, background: string): ContrastResult {
  // Transparent background: contrast depends on what's behind the QR.
  if (background === 'transparent') {
    return { ok: true, ratio: Infinity, inverted: false };
  }
  const ratio = contrastRatio(dots, background);
  const inverted = relativeLuminance(dots) > relativeLuminance(background);
  return { ok: ratio >= MIN_QR_CONTRAST && !inverted, ratio, inverted };
}
