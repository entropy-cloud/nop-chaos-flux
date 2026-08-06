/**
 * Gap token map (gap-0 … gap-8) shared with the styling system.
 *
 * Exported from the package root barrel as a stable public utility. Currently
 * referenced by docs only (styling-system.md); kept public as an intentional
 * maintenance surface (see docs/audits/multi-audit-r2-verdicts.md 01-03).
 */
export const GAP_TOKENS: Record<string, string> = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

export function resolveGap(gap: number | string | undefined): {
  className?: string;
  style?: React.CSSProperties;
} {
  if (gap === undefined) return {};
  if (typeof gap === 'number') return { style: { gap: `${gap}px` } };
  const tokenClass = GAP_TOKENS[gap];
  if (tokenClass) return { className: tokenClass };
  return { style: { gap } };
}
