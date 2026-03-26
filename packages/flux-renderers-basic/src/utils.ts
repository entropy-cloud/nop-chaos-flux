export function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

export function resolveDirection(direction?: string) {
  return direction === 'column' ? 'flex-col' : 'flex-row';
}
