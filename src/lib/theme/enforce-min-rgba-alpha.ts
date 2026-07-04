// ============================================
// enforce-min-rgba-alpha.ts - Mindest-Alpha fuer rgba-Farben
//
// Zweck: Verhindert zu transparente Flaechen (z. B. Glass-Container).
// Verwendet von: SettingsPage (Glass-Container mit hoeherer Deckkraft)
// ============================================

/** Erhoeht die Alpha-Komponente bei rgba/rgb auf mindestens minAlpha. */
export function enforceMinRgbaAlpha(color: string, minAlpha: number): string {
  const rgbaMatch = color.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\s*\)$/i);
  if (rgbaMatch) {
    const [, r, g, b, alphaRaw] = rgbaMatch;
    const parsedAlpha = Number.parseFloat(alphaRaw);
    const alpha = Number.isFinite(parsedAlpha) ? Math.max(parsedAlpha, minAlpha) : minAlpha;
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }

  const rgbMatch = color.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, ${minAlpha.toFixed(2)})`;
  }

  return color;
}
