import type { CompileSymbolTable, SymbolFrame, SymbolInfo } from '@nop-chaos/flux-core';

function createFrames(frames: readonly SymbolFrame[]): readonly SymbolFrame[] {
  return frames;
}

export function createCompileSymbolTable(frames: readonly SymbolFrame[] = []): CompileSymbolTable {
  return {
    get frames() {
      return createFrames(frames);
    },
    push(frame) {
      return createCompileSymbolTable([
        ...frames,
        {
          id: frame.id ?? `symbol-frame-${frames.length + 1}`,
          kind: frame.kind,
          symbols: frame.symbols,
        },
      ]);
    },
    resolve(name: string): SymbolInfo | undefined {
      for (let index = frames.length - 1; index >= 0; index -= 1) {
        const entry = frames[index].symbols[name];
        if (entry) {
          return entry;
        }
      }

      return undefined;
    },
  };
}

export function createBaseCompileSymbolTable(): CompileSymbolTable {
  const mathRecord = Math as unknown as Record<string, unknown>;
  const jsonRecord = JSON as unknown as Record<string, unknown>;

  return createCompileSymbolTable().push({
    id: 'root-builtins',
    kind: 'root',
    symbols: {
      $Math: {
        name: '$Math',
        kind: 'builtin-namespace',
        members: Object.getOwnPropertyNames(Math).filter(
          (name) => typeof mathRecord[name] !== 'undefined',
        ),
      },
      $JSON: {
        name: '$JSON',
        kind: 'builtin-namespace',
        members: Object.getOwnPropertyNames(JSON).filter(
          (name) => typeof jsonRecord[name] !== 'undefined',
        ),
      },
      $Date: {
        name: '$Date',
        kind: 'builtin-namespace',
        members: ['format', 'now', 'addDays', 'addMonths', 'addYears', 'startOfDay', 'endOfDay'],
      },
    },
  });
}
