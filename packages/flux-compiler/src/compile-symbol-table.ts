import type { CompileSymbolTable, ExpressionCompiler, SymbolFrame, SymbolInfo } from '@nop-chaos/flux-core';

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
        members: [
          'now',
          'today',
          'parse',
          'format',
          'year',
          'month',
          'day',
          'hours',
          'minutes',
          'seconds',
          'addDays',
          'addMonths',
          'addYears',
          'diff',
        ],
      },
    },
  });
}

/**
 * Base table extended with the expression compiler's host-registered formula
 * namespaces (plan 595): schemas referencing a host namespace like `$Arr`
 * resolve at runtime through the formula registry, so compile-time symbol
 * analysis must see the same names or every host extension emits
 * `unknown-import-alias` false positives. Names already covered by the base
 * builtins keep their curated member lists.
 */
export function createFormulaAwareCompileSymbolTable(
  expressionCompiler: ExpressionCompiler | undefined,
): CompileSymbolTable {
  const base = createBaseCompileSymbolTable();
  const namespaces = expressionCompiler?.formulaCompiler.getFormulaNamespaces?.();
  if (!namespaces) {
    return base;
  }

  const symbols: Record<string, SymbolInfo> = {};
  for (const [name, value] of Object.entries(namespaces)) {
    if (!name.startsWith('$') || base.resolve(name)) {
      continue;
    }
    symbols[name] = {
      name,
      kind: 'builtin-namespace',
      members:
        value && typeof value === 'object' ? Object.keys(value as Record<string, unknown>) : [],
    };
  }

  if (Object.keys(symbols).length === 0) {
    return base;
  }

  return base.push({ id: 'formula-registry-namespaces', kind: 'root', symbols });
}
