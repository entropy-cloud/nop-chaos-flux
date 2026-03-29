export function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

export function resolveDirection(direction?: string) {
  return direction === 'column' ? 'flex-col' : 'flex-row';
}

export const GAP_TOKENS: Record<string, string> = {
  'none': 'gap-0',
  'xs': 'gap-1',
  'sm': 'gap-2',
  'md': 'gap-4',
  'lg': 'gap-6',
  'xl': 'gap-8'
};

export function resolveGap(gap: number | string | undefined): { className?: string; style?: React.CSSProperties } {
  if (gap === undefined) return {};
  if (typeof gap === 'number') return { style: { gap: `${gap}px` } };
  const tokenClass = GAP_TOKENS[gap];
  if (tokenClass) return { className: tokenClass };
  return { style: { gap } };
}
