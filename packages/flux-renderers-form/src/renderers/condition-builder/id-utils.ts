let _idSeq = 0;

export function genId(prefix = 'node'): string {
  return `${prefix}-${++_idSeq}`;
}

export function resetIdSeq(): void {
  _idSeq = 0;
}
