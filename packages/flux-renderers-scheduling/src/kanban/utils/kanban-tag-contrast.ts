const SRGB_LUMINANCE_COEFFICIENTS = [0.2126, 0.7152, 0.0722] as const;

function parseHexChannel(hex: string): number {
  return parseInt(hex, 16) / 255;
}

function srgbChannelLuminance(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  const [r, g, b] = [0, 2, 4].map((offset) =>
    srgbChannelLuminance(parseHexChannel(full.slice(offset, offset + 2))),
  );
  return (
    SRGB_LUMINANCE_COEFFICIENTS[0] * r +
    SRGB_LUMINANCE_COEFFICIENTS[1] * g +
    SRGB_LUMINANCE_COEFFICIENTS[2] * b
  );
}

function contrastRatio(a: number, b: number): number {
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

const WHITE_LUMINANCE = 1;
const BLACK_LUMINANCE = 0;

/**
 * Decides whether white or black text is required on an arbitrary user-supplied
 * `tag.color` chip background (WCAG relative-luminance contrast pick). Returns
 * `true` for white text; `false` (and for unparsable input) for black. The
 * caller maps the boolean onto the text color classes.
 */
export function kanbanTagChipNeedsWhiteText(backgroundColor: string | undefined): boolean {
  if (!backgroundColor || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(backgroundColor.trim())) {
    return false;
  }
  const bg = relativeLuminance(backgroundColor.trim());
  return contrastRatio(bg, WHITE_LUMINANCE) >= contrastRatio(bg, BLACK_LUMINANCE);
}
