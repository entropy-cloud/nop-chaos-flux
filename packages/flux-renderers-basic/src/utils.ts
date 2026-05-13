export function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

export function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

export function resolveDirection(direction?: string) {
  if (direction === 'column') return 'flex-col';
  if (direction === 'row') return 'flex-row';
  return undefined;
}
