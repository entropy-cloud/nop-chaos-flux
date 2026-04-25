import type {
  CompileSymbolTable,
  PreparedImportSpec,
  SchemaInput,
  XuiImportSpec
} from '@nop-chaos/flux-core';

export function pushImportSymbols(symbolTable: CompileSymbolTable, imports: unknown, id: string): CompileSymbolTable {
  if (!Array.isArray(imports) || imports.length === 0) {
    return symbolTable;
  }

  const symbols: Record<string, import('@nop-chaos/flux-core').SymbolInfo> = {};

  for (const spec of imports as XuiImportSpec[]) {
    if (spec.as) {
      symbols[`$${spec.as}`] = {
        name: `$${spec.as}`,
        kind: 'import-alias'
      };
    }
  }

  return Object.keys(symbols).length === 0
    ? symbolTable
    : symbolTable.push({
        id,
        kind: 'imports',
        symbols
      });
}

export function normalizeImportSpecKey(schemaUrl: string, spec: XuiImportSpec): string {
  return JSON.stringify({
    schemaUrl,
    from: spec.from,
    as: spec.as,
    options: spec.options ?? null
  });
}

export function collectSchemaImportSpecs(input: SchemaInput, schemaUrl: string): XuiImportSpec[] {
  const collected = new Map<string, XuiImportSpec>();

  function visit(value: unknown): void {
    if (!value || typeof value !== 'object') {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    const record = value as Record<string, unknown>;
    const imports = record['xui:imports'];
    if (Array.isArray(imports)) {
      for (const entry of imports) {
        if (!entry || typeof entry !== 'object') {
          continue;
        }
        const spec = entry as XuiImportSpec;
        if (!spec.from || !spec.as) {
          continue;
        }
        collected.set(normalizeImportSpecKey(schemaUrl, spec), spec);
      }
    }

    for (const child of Object.values(record)) {
      visit(child);
    }
  }

  visit(input);
  return Array.from(collected.values());
}

function buildImportMetaMembers(meta: PreparedImportSpec | undefined): readonly string[] | undefined {
  return meta?.staticMeta?.helpers
    ? Object.keys(meta.staticMeta.helpers)
    : undefined;
}

export function pushPreparedImportSymbols(
  symbolTable: CompileSymbolTable,
  imports: readonly XuiImportSpec[] | undefined,
  preparedImports: ReadonlyMap<string, PreparedImportSpec> | undefined,
  schemaUrl: string | undefined,
  id: string
): CompileSymbolTable {
  if (!imports?.length || !schemaUrl) {
    return symbolTable;
  }

  const symbols: Record<string, import('@nop-chaos/flux-core').SymbolInfo> = {};

  for (const spec of imports) {
    if (!spec.as) {
      continue;
    }

    const prepared = preparedImports?.get(normalizeImportSpecKey(schemaUrl, spec));
    symbols[`$${spec.as}`] = {
      name: `$${spec.as}`,
      kind: 'import-alias',
      members: buildImportMetaMembers(prepared),
      memberDefinitions: prepared?.staticMeta?.helpers
    };
  }

  return Object.keys(symbols).length === 0
    ? symbolTable
    : symbolTable.push({
        id,
        kind: 'imports',
        symbols
      });
}

export function pushInjectedLocalSymbols(symbolTable: CompileSymbolTable, renderer: import('@nop-chaos/flux-core').RendererDefinition, id: string): CompileSymbolTable {
  const symbols = Object.fromEntries(
    Object.entries(renderer.injectedLocals ?? {}).map(([name, info]) => [
      name,
      {
        name,
        ...info
      }
    ])
  ) as Record<string, import('@nop-chaos/flux-core').SymbolInfo>;

  return Object.keys(symbols).length === 0
    ? symbolTable
    : symbolTable.push({
        id,
        kind: 'owner',
        symbols
      });
}

export function pushRegionParamSymbols(symbolTable: CompileSymbolTable, params: readonly string[] | undefined, id: string): CompileSymbolTable {
  if (!params?.length) {
    return symbolTable;
  }

  const members = [...params, '$parent'];
  return symbolTable.push({
    id,
    kind: 'region',
    symbols: {
      '$slot': {
        name: '$slot',
        kind: 'slot-root',
        members
      }
    }
  });
}
