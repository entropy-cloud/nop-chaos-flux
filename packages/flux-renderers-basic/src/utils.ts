export function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

export function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

export function resolveDirection(direction?: string) {
  return direction === 'column' ? 'flex-col' : 'flex-row';
}
