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
import { inspectSchemaNodeFields } from './shape-validation-node-fields.js';
import {
  findSchemaDefinitionShape,
  type SchemaDefinitionShapeMatch,
} from './node-compiler-helpers.js';
import {
  applyWrapComponentPlugins,
} from './shape-validation-utils.js';
import {
  createDefaultValidationTraversalState,
  createRegionTraversalState,
  createChildTraversalState,
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

/**
 * Convert a JSON-pointer path (e.g. `/onClick/args/body`) into the dot-style
 * schema path consumed by `analyzeSchemaInput` (e.g. `$.onClick.args.body`).
 * Numeric segments become bracket segments (`[n]`), matching the array
 * recursion convention of `analyzeSchemaInput`.
 */
function jsonPointerToSchemaPath(pointer: string): string {
  if (!pointer) {
    return '$';
  }

  const segments = pointer
    .replace(/^\//, '')
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

  const suffix = segments
    .map((segment) => (isNumericSegment(segment) ? `[${segment}]` : `.${segment}`))
    .join('');
  return `$${suffix}`;
}

function isNumericSegment(segment: string): boolean {
  return /^\d+$/.test(segment);
}

type AnalyzeSchemaInputFn = (
  inputValue: unknown,
  path: string,
  registry: RendererRegistry,
  plugins: readonly RendererPlugin[] | undefined,
  diagnostics: SchemaCompilerDiagnosticsContext,
  traversalState?: ValidationTraversalState,
) => void;

function isRegionLikeKind(kind: string): boolean {
  return kind === 'region' || kind === 'schema' || kind === 'schema-array' || kind === 'value-or-region';
}

/**
 * Validation-side counterpart of the compile-side schema-definition
 * classification: recurse into every `region`/`schema`/`schema-array`/
 * `value-or-region` field (per `fieldRules`) as schema input, tracking
 * region params via {@link createRegionTraversalState}.
 *
 * Typed items (§3.8) — items carrying a `type` that resolves in the registry —
 * are validated per the CHILD definition's propContracts instead of the
 * parent's inline fieldRules (explicit type wins, mirroring the compile side).
 *
 * Returns true when the field has a schema-definition match (the field is
 * "handled" here — the caller skips its default region/value handling).
 */
function analyzeSchemaDefinitionField(input: {
  value: unknown;
  match: SchemaDefinitionShapeMatch;
  path: string;
  registry: RendererRegistry;
  plugins: readonly RendererPlugin[] | undefined;
  diagnostics: SchemaCompilerDiagnosticsContext;
  traversalState: ValidationTraversalState;
  startsHostBoundary: boolean;
  analyzeSchemaInput: AnalyzeSchemaInputFn;
}): boolean {
  const { match, value } = input;

  if (match.shape.actionValue) {
    return true;
  }

  const containers = Array.isArray(value)
    ? value.map((item, index) => ({ item, itemPath: `${input.path}[${index}]` }))
    : isPlainObject(value)
      ? [{ item: value, itemPath: input.path }]
      : [];

  for (const { item, itemPath } of containers) {
    if (!isPlainObject(item)) {
      continue;
    }

    const record = item as Record<string, unknown>;

    // Typed item: explicit type wins over the parent's inline fieldRules.
    const itemType = record.type;
    if (typeof itemType === 'string' && itemType.length > 0) {
      const childRenderer = input.registry.get(itemType);
      if (childRenderer) {
        if (Object.keys(match.shape.fieldRules).length > 0) {
          input.diagnostics.emit({
            code: 'conflicting-field-definition',
            message: `Item "${itemType}" at ${itemPath} declares an explicit type; the container's inline fieldRules are ignored (explicit type wins).`,
            path: itemPath,
            severity: 'warning',
          });
        }
        analyzeTypedSchemaDefinitionItem({
          item: record,
          renderer: childRenderer,
          itemPath,
          registry: input.registry,
          plugins: input.plugins,
          diagnostics: input.diagnostics,
          traversalState: input.traversalState,
          startsHostBoundary: input.startsHostBoundary,
          analyzeSchemaInput: input.analyzeSchemaInput,
        });
        continue;
      }
    }

    for (const [fieldKey, spec] of Object.entries(match.shape.fieldRules)) {
      const rule = typeof spec === 'string' ? ({ kind: spec }) : spec;
      if (!isRegionLikeKind(rule.kind)) {
        continue;
      }

      let fieldValue = record[fieldKey];
      let sourcePath = `${itemPath}.${fieldKey}`;
      if (rule.sourceKey && !isSchemaInput(fieldValue) && isPlainObject(fieldValue)) {
        fieldValue = fieldValue[rule.sourceKey];
        sourcePath = `${itemPath}.${fieldKey}.${rule.sourceKey}`;
      }

      if (rule.kind === 'value-or-region' && !isSchemaInput(fieldValue)) {
        continue;
      }

      if (!isSchemaInput(fieldValue)) {
        continue;
      }

      input.analyzeSchemaInput(
        fieldValue,
        sourcePath,
        input.registry,
        input.plugins,
        input.diagnostics,
        createRegionTraversalState(
          input.traversalState,
          rule.regionKeySuffix ?? fieldKey,
          rule.params,
          input.startsHostBoundary,
        ),
      );
    }
  }

  return true;
}

/**
 * Validation-side typed-item recursion: validate each field of a typed item
 * per its child definition — nested schema-definition shapes recurse through
 * {@link analyzeSchemaDefinitionField} semantics, `fields` region rules
 * recurse as region-traversal state, event/literal fields are skipped.
 */
function analyzeTypedSchemaDefinitionItem(input: {
  item: Record<string, unknown>;
  renderer: import('@nop-chaos/flux-core').RendererDefinition;
  itemPath: string;
  registry: RendererRegistry;
  plugins: readonly RendererPlugin[] | undefined;
  diagnostics: SchemaCompilerDiagnosticsContext;
  traversalState: ValidationTraversalState;
  startsHostBoundary: boolean;
  analyzeSchemaInput: AnalyzeSchemaInputFn;
}): void {
  for (const [fieldKey, fieldValue] of Object.entries(input.item)) {
    if (fieldValue === undefined) {
      continue;
    }

    const nestedMatch = findSchemaDefinitionShape(input.renderer.propContracts?.[fieldKey]);
    if (nestedMatch) {
      analyzeSchemaDefinitionField({
        value: fieldValue,
        match: nestedMatch,
        path: `${input.itemPath}.${fieldKey}`,
        registry: input.registry,
        plugins: input.plugins,
        diagnostics: input.diagnostics,
        traversalState: input.traversalState,
        startsHostBoundary: input.startsHostBoundary,
        analyzeSchemaInput: input.analyzeSchemaInput,
      });
      continue;
    }

    const rule = classifyField(input.renderer, fieldKey);
    if (!isRegionLikeKind(rule.kind)) {
      continue;
    }

    if (rule.kind === 'value-or-region' && !isSchemaInput(fieldValue)) {
      continue;
    }

    if (!isSchemaInput(fieldValue)) {
      continue;
    }

    input.analyzeSchemaInput(
      fieldValue,
      `${input.itemPath}.${fieldKey}`,
      input.registry,
      input.plugins,
      input.diagnostics,
      createRegionTraversalState(
        input.traversalState,
        rule.regionKey ?? fieldKey,
        rule.params,
        input.startsHostBoundary,
      ),
    );
  }
}

export function analyzeSchemaInput(
  inputValue: unknown,
  path: string,
  registry: RendererRegistry,
  plugins: readonly RendererPlugin[] | undefined,
  diagnostics: SchemaCompilerDiagnosticsContext,
  traversalState: ValidationTraversalState = createDefaultValidationTraversalState(
    diagnostics,
    inputValue,
    registry,
  ),
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
    componentTargets: traversalState.componentTargets,
    ...nodeTraversal,
    symbolTable: nextSymbolTable,
    visibleImports: nextVisibleImports,
  };

  const actionContext: ActionValidationContext = {
    hostContext: nodeState.hostContext,
    symbolTable: nodeState.symbolTable,
    visibleImports: nodeState.visibleImports,
    componentTargets: nodeState.componentTargets,
    strictMode: diagnostics.validation.strictMode,
    analyzeSchemaInput: (inputValue, nestedPointerPath) =>
      analyzeSchemaInput(
        inputValue,
        jsonPointerToSchemaPath(nestedPointerPath),
        registry,
        plugins,
        diagnostics,
        createChildTraversalState(
          nodeState,
          jsonPointerToSchemaPath(nestedPointerPath),
          nodeState.startsHostBoundary,
        ),
      ),
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

    const schemaDefinitionMatch = findSchemaDefinitionShape(wrappedRenderer.propContracts?.[key]);

    if (schemaDefinitionMatch) {
      if (
        analyzeSchemaDefinitionField({
          value,
          match: schemaDefinitionMatch,
          path: `${path}.${key}`,
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
