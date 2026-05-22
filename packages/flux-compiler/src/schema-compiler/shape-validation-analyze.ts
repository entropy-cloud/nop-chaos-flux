import type {
  BaseSchema,
  RendererPlugin,
  RendererRegistry,
} from '@nop-chaos/flux-core';
import { isPlainObject, isSchemaInput, validateRegionParams } from '@nop-chaos/flux-core';
import {
  appendJsonPointer,
  schemaPathToJsonPointer,
  type SchemaCompilerDiagnosticsContext,
} from './diagnostics.js';
import { classifyField } from './fields.js';
import { analyzeDeepSchemaField } from './shape-validation-deep-fields.js';
import { inspectSchemaNodeFields } from './shape-validation-node-fields.js';
import {
  applyWrapComponentPlugins,
} from './shape-validation-utils.js';
import {
  createDefaultValidationTraversalState,
  createRegionTraversalState,
  resolveNodeHostContext,
  type ValidationTraversalState,
} from './shape-validation-traversal.js';
import type { ActionValidationContext } from './shape-validation-rules.js';
import {
  normalizeImportSpecKey,
  pushImportSymbols,
  pushPreparedImportSymbols,
  pushNamedActionSymbols,
} from './symbol-helpers.js';
import { createBaseCompileSymbolTable } from '../compile-symbol-table.js';

function extendVisibleImports(input: {
  importsValue: unknown;
  schemaUrl: string | undefined;
  preparedImports: ReadonlyMap<string, import('@nop-chaos/flux-core').PreparedImportSpec> | undefined;
  inheritedVisibleImports: ReadonlyMap<string, import('@nop-chaos/flux-core').PreparedImportSpec | undefined> | undefined;
}): ReadonlyMap<string, import('@nop-chaos/flux-core').PreparedImportSpec | undefined> | undefined {
  if (!Array.isArray(input.importsValue) || input.importsValue.length === 0) {
    return input.inheritedVisibleImports;
  }

  const next = new Map(input.inheritedVisibleImports ?? []);
  for (const entry of input.importsValue) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }
    const spec = entry as import('@nop-chaos/flux-core').XuiImportSpec;
    if (!spec.as) {
      continue;
    }

    const prepared = input.schemaUrl
      ? input.preparedImports?.get(normalizeImportSpecKey(input.schemaUrl, spec))
      : undefined;
    next.set(spec.as, prepared);
  }

  return next;
}

function isImportSpecCandidate(value: unknown): value is import('@nop-chaos/flux-core').XuiImportSpec {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function analyzeSchemaInput(
  inputValue: unknown,
  path: string,
  registry: RendererRegistry,
  plugins: readonly RendererPlugin[] | undefined,
  diagnostics: SchemaCompilerDiagnosticsContext,
  traversalState: ValidationTraversalState = createDefaultValidationTraversalState(diagnostics),
) {
  if (diagnostics.hasReachedLimit()) {
    return;
  }

  if (Array.isArray(inputValue)) {
    inputValue.forEach((entry, index) => {
      analyzeSchemaInput(entry, `${path}[${index}]`, registry, plugins, diagnostics, traversalState);
    });
    return;
  }

  if (!isPlainObject(inputValue)) {
    diagnostics.emit({
      code: path === '$' ? 'invalid-root' : 'expected-object',
      path: schemaPathToJsonPointer(path),
      message:
        path === '$'
          ? 'Schema root must be an object or an array of schema objects.'
          : 'Schema nodes must be objects.',
    });
    return;
  }

  if (typeof inputValue.type !== 'string' || inputValue.type.length === 0) {
    diagnostics.emit({
      code: 'missing-required-field',
      path: appendJsonPointer(schemaPathToJsonPointer(path), 'type'),
      message: 'Schema nodes require a non-empty type field.',
    });
    return;
  }

  const renderer = registry.get(inputValue.type);

  if (!renderer) {
    diagnostics.emit({
      code: 'unknown-renderer-type',
      path: appendJsonPointer(schemaPathToJsonPointer(path), 'type'),
      message: `Renderer not found for type: ${inputValue.type}`,
    });
    return;
  }

  const wrappedRenderer = applyWrapComponentPlugins(
    renderer,
    plugins as RendererPlugin[] | undefined,
  );
  const schema = inputValue as BaseSchema;
  const nodeImports = Array.isArray(schema['xui:imports'])
    ? schema['xui:imports'].filter(isImportSpecCandidate)
    : undefined;
  const schemaUrl = diagnostics.schemaUrl;
  const baseSymbolTable = traversalState.symbolTable ?? createBaseCompileSymbolTable();
  let nextSymbolTable = schemaUrl
    ? pushPreparedImportSymbols(
        baseSymbolTable,
        nodeImports,
        diagnostics.validation.preparedImports,
        schemaUrl,
        `${path}:imports`,
      )
    : pushImportSymbols(baseSymbolTable, nodeImports, `${path}:imports`);
  const rawXuiActions =
    typeof schema['xui:actions'] === 'object' &&
    schema['xui:actions'] !== null &&
    !Array.isArray(schema['xui:actions'])
      ? (schema['xui:actions'] as Record<string, unknown>)
      : undefined;
  if (rawXuiActions && Object.keys(rawXuiActions).length > 0) {
    nextSymbolTable = pushNamedActionSymbols(
      nextSymbolTable,
      Object.keys(rawXuiActions),
      `${path}:xui-actions`,
    );
  }
  const nextVisibleImports = extendVisibleImports({
    importsValue: nodeImports,
    schemaUrl,
    preparedImports: diagnostics.validation.preparedImports,
    inheritedVisibleImports: traversalState.visibleImports,
  });
  const nodeTraversal = resolveNodeHostContext(
    schema,
    wrappedRenderer,
    path,
    diagnostics,
    traversalState.hostContext,
  );
  const nodeState: ValidationTraversalState = {
    ...nodeTraversal,
    symbolTable: nextSymbolTable,
    visibleImports: nextVisibleImports,
  };

  const actionContext: ActionValidationContext = {
    hostContext: nodeState.hostContext,
    symbolTable: nodeState.symbolTable,
    visibleImports: nodeState.visibleImports,
    strictMode: diagnostics.validation.strictMode,
  };

  inspectSchemaNodeFields(
    schema,
    wrappedRenderer,
    path,
    diagnostics,
    true,
    actionContext,
  );

  for (const key of Object.keys(schema)) {
    const value = schema[key];
    const rule = classifyField(wrappedRenderer, key);

    if (
      analyzeDeepSchemaField({
        renderer: wrappedRenderer,
        key,
        value,
        path,
        registry,
        plugins,
        diagnostics,
        traversalState: nodeState,
        startsHostBoundary: nodeState.startsHostBoundary,
        analyzeSchemaInput,
      })
    ) {
      continue;
    }

    if (rule.kind === 'region') {
      if (value === undefined) {
        continue;
      }

      validateRegionParams(rule.params ?? [], `${path}.${rule.regionKey ?? key}`);

      if (!isSchemaInput(value)) {
        diagnostics.emit({
          code: 'invalid-region-node',
          path: appendJsonPointer(schemaPathToJsonPointer(path), key),
          message: `Region "${rule.regionKey ?? key}" must contain schema input.`,
        });
        continue;
      }

      analyzeSchemaInput(
        value,
        `${path}.${rule.regionKey ?? key}`,
        registry,
        plugins,
        diagnostics,
          createRegionTraversalState(
            nodeState,
            rule.regionKey ?? key,
            rule.params,
            nodeState.startsHostBoundary,
          ),
        );
      continue;
    }

    const isSourceCarrier =
      !!value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      (value as { type?: unknown }).type === 'source';

    if (rule.kind === 'value-or-region' && isSchemaInput(value) && !(rule.allowSource && isSourceCarrier)) {
      validateRegionParams(rule.params ?? [], `${path}.${rule.regionKey ?? key}`);
      analyzeSchemaInput(
        value,
        `${path}.${rule.regionKey ?? key}`,
        registry,
        plugins,
        diagnostics,
          createRegionTraversalState(
            nodeState,
            rule.regionKey ?? key,
            rule.params,
            nodeState.startsHostBoundary,
          ),
        );
    }
  }
}
