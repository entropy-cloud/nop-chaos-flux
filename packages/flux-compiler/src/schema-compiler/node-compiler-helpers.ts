import type {
  BaseSchema,
  CompiledRuntimeValue,
  CompileSchemaOptions,
  FluxSchemaDefinitionShape,
  FluxValueShape,
  RendererDefinition,
  RendererPropContract,
  RendererRegistry,
  SchemaDiagnosticCode,
  SchemaDiagnosticSeverity,
  SchemaFieldRule,
  SchemaInput,
  TemplateNode,
  TemplateRegion,
  XuiImportSpec,
} from '@nop-chaos/flux-core';
import {
  createNodeId,
  createTemplateRegion,
  isPlainObject,
  isSchemaInput,
} from '@nop-chaos/flux-core';
import { compileRuntimeValueTree } from './runtime-value-compilation.js';
import { buildWrapProvidersClosure } from './static-analysis.js';
import { classifyField } from './fields.js';

const compileFailureRenderer: RendererDefinition = {
  type: '__compile-failure__',
  component: (props) => String(props.props.message ?? 'Schema compilation failed'),
};

export function isImportSpecCandidate(value: unknown): value is XuiImportSpec {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isSourceCarrier(value: unknown): value is { type: 'source' } {
  return !!value && typeof value === 'object' && !Array.isArray(value) && (value as { type?: unknown }).type === 'source';
}

export function normalizeBooleanLikeCandidate(candidate: unknown): boolean | undefined {
  return typeof candidate === 'boolean' ? candidate : undefined;
}

export function createCompileFailureNode(input: {
  schema: BaseSchema;
  path: string;
  message: string;
  schemaUrl?: string;
}): TemplateNode {
  return {
    templateNodeId: 0,
    id: createNodeId(input.path, input.schema),
    type: input.schema.type,
    schema: input.schema,
    templatePath: input.path,
    schemaUrl: input.schemaUrl,
    rendererType: compileFailureRenderer.type,
    component: compileFailureRenderer,
    propsProgram: compileRuntimeValueTree({
      message: input.message,
      originalType: input.schema.type,
    }) as CompiledRuntimeValue<Record<string, unknown>>,
    metaProgram: {},
    eventPlans: {},
    regions: {},
    providerPlan: {
      actionScope: false,
      componentRegistry: false,
      classAliases: false,
    },
    providerWrap: buildWrapProvidersClosure({
      actionScope: false,
      componentRegistry: false,
      classAliases: false,
    }),
    scopePlan: { kind: 'inherit' },
    sourcePropKeys: [],
    sourceStatePropKeys: {},
  };
}

// ───────────────────────── schema-definition classification ─────────────────────────

export interface SchemaDefinitionShapeMatch {
  shape: FluxSchemaDefinitionShape;
  /**
   * Key path inside the prop value where the definition applies.
   * Empty array = the whole prop value (array.item / record.value / top-level).
   */
  keyPath: readonly string[];
}

/**
 * Find the `schema-definition` shape inside a renderer prop contract,
 * traversing container shapes (array.item / record.value / object.fields).
 */
export function findSchemaDefinitionShape(
  contract: RendererPropContract | undefined,
): SchemaDefinitionShapeMatch | undefined {
  if (!contract) {
    return undefined;
  }
  return findSchemaDefinitionInShape(contract.shape, []);
}

function findSchemaDefinitionInShape(
  shape: FluxValueShape,
  keyPath: readonly string[],
): SchemaDefinitionShapeMatch | undefined {
  switch (shape.kind) {
    case 'schema-definition':
      return { shape, keyPath };
    case 'array':
      return findSchemaDefinitionInShape(shape.item, keyPath);
    case 'record':
      return findSchemaDefinitionInShape(shape.value, keyPath);
    case 'object':
      for (const [fieldKey, fieldShape] of Object.entries(shape.fields)) {
        const found = findSchemaDefinitionInShape(fieldShape, [...keyPath, fieldKey]);
        if (found) {
          return found;
        }
      }
      return undefined;
    default:
      return undefined;
  }
}

function applyAtPath(
  value: unknown,
  keyPath: readonly string[],
  apply: (target: unknown) => unknown,
): unknown {
  if (keyPath.length === 0) {
    return apply(value);
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const [head, ...rest] = keyPath;
  const record = value as Record<string, unknown>;
  const next = applyAtPath(record[head], rest, apply);
  if (next === record[head]) {
    return value;
  }

  return { ...record, [head]: next };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

/**
 * Copy-on-write along a dotted key path so authored schema objects are never
 * mutated at compile time. Returns the innermost object that owns the leaf.
 */
function copyAlongPath(
  record: Record<string, unknown>,
  keyPath: string,
): Record<string, unknown> | undefined {
  const segments = keyPath.split('.');
  let cursor = record;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const seg = segments[i];
    const next = cursor[seg];
    if (!isPlainRecord(next)) {
      return undefined;
    }
    const copy = { ...next };
    cursor[seg] = copy;
    cursor = copy;
  }
  return cursor;
}

function resolveRegionSpec(
  spec: SchemaFieldRule,
  fieldKey: string,
): {
  regionKeySuffix: string;
  compiledKey: string | undefined;
  params: readonly string[] | undefined;
  isolate: boolean | undefined;
} {
  return {
    regionKeySuffix: spec.regionKeySuffix ?? fieldKey,
    compiledKey: spec.regionKey,
    params: spec.params,
    isolate: spec.isolate,
  };
}

/**
 * Extract a nested region for a schema-input field value (or a schema-input
 * leaf inside a plain-object field value declared via `sourceKey`).
 *
 * Region key = `${itemRegionKeyPrefix}.${regionKeySuffix}` (suffix defaults to
 * the field key; may be dotted). The compiled key (`spec.regionKey`) receives
 * the region key string — flat on the item (e.g. `titleRegionKey`) or dotted
 * into a nested object (e.g. `popOver.contentRegionKey`). The schema source is
 * removed from the item value (matching the legacy `extractNestedSchemaRegions`
 * shape, which renderers read via `item.<compiledKey>` → `props.regions[...]`).
 */
function extractSchemaDefinitionRegion(input: {
  item: Record<string, unknown>;
  fieldKey: string;
  spec: SchemaFieldRule;
  itemPath: string;
  itemRegionKeyPrefix: string;
  regions: Record<string, TemplateRegion>;
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => TemplateNode | TemplateNode[];
}): boolean {
  const { item, fieldKey, spec } = input;
  const resolved = resolveRegionSpec(spec, fieldKey);

  let fieldValue = item[fieldKey];
  let sourceLeaf: unknown;
  let nestedSource = false;

  if (!isSchemaInput(fieldValue) && spec.sourceKey && isPlainRecord(fieldValue)) {
    sourceLeaf = fieldValue[spec.sourceKey];
    if (isSchemaInput(sourceLeaf)) {
      fieldValue = sourceLeaf;
      nestedSource = true;
    }
  }

  if (!isSchemaInput(fieldValue)) {
    return false;
  }

  const regionKey = `${input.itemRegionKeyPrefix}.${resolved.regionKeySuffix}`;
  const regionPath = nestedSource
    ? `${input.itemPath}.${fieldKey}.${spec.sourceKey}`
    : `${input.itemPath}.${resolved.regionKeySuffix}`;
  const regionMeta =
    resolved.params || resolved.isolate !== undefined
      ? { params: resolved.params, isolate: resolved.isolate }
      : undefined;

  input.regions[regionKey] = createTemplateRegion(
    regionKey,
    fieldValue,
    regionPath,
    (schema, options) => input.compileSchema(schema, options, regionMeta),
    regionMeta,
  );

  if (resolved.compiledKey) {
    if (resolved.compiledKey.includes('.')) {
      const owner = copyAlongPath(item, resolved.compiledKey);
      if (owner) {
        owner[resolved.compiledKey.split('.').pop() as string] = regionKey;
      } else {
        item[fieldKey] = regionKey;
      }
    } else {
      item[resolved.compiledKey] = regionKey;
    }
  } else {
    item[fieldKey] = regionKey;
  }

  if (nestedSource) {
    const copy = { ...(item[fieldKey] as Record<string, unknown>) };
    delete copy[spec.sourceKey as string];
    item[fieldKey] = copy;
  } else if (resolved.compiledKey) {
    delete item[fieldKey];
  }

  return true;
}

function classifySchemaDefinitionItem(input: {
  item: unknown;
  shape: FluxSchemaDefinitionShape;
  itemPath: string;
  itemRegionKeyPrefix: string;
  regions: Record<string, TemplateRegion>;
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => TemplateNode | TemplateNode[];
  registry?: RendererRegistry;
  emitDiagnostic?: (issue: {
    code: SchemaDiagnosticCode;
    message: string;
    path: string;
    severity?: SchemaDiagnosticSeverity;
  }) => void;
}): unknown {
  const { item, shape } = input;

  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return item;
  }

  const record = { ...(item as Record<string, unknown>) };
  let changed = false;

  // Typed item semantics (§3.8): an item carrying a `type` that resolves in
  // the registry is classified per the CHILD definition (full renderer
  // semantics: field classification + region compilation). Without `type`
  // (or when the type is not a registered renderer — e.g. table column
  // `type: 'operation'`), the parent's inline fieldRules apply.
  const itemType = record.type;
  const childRenderer =
    typeof itemType === 'string' && itemType.length > 0
      ? input.registry?.get(itemType)
      : undefined;

  if (childRenderer) {
    if (Object.keys(shape.fieldRules).length > 0) {
      input.emitDiagnostic?.({
        code: 'conflicting-field-definition',
        message: `Item "${itemType}" at ${input.itemPath} declares an explicit type; the container's inline fieldRules are ignored (explicit type wins).`,
        path: input.itemPath,
        severity: 'warning',
      });
    }
    return classifyTypedSchemaDefinitionItem({
      ...input,
      item: record,
      renderer: childRenderer,
    });
  }

  for (const [fieldKey, spec] of Object.entries(shape.fieldRules)) {
    const rule = typeof spec === 'string' ? ({ kind: spec } as SchemaFieldRule) : spec;
    const kind = rule.kind;
    const fieldValue = record[fieldKey];
    if (fieldValue === undefined) {
      continue;
    }

    switch (kind) {
      // event/action → whole-value template preservation (envelope). The
      // envelope short-circuits expression compilation at the nested position;
      // renderers unwrap it via unwrapPreservedLiteral before dispatch.
      case 'event':
      case 'action':
        record[fieldKey] = { __nopPreserveLiteral: true, value: fieldValue };
        changed = true;
        break;

      // literal → whole-value (or `sourceKey` leaf) literal preservation.
      // Replaces the legacy booleanKeys/normalize `__nopPreserveLiteral`
      // wrapping (wizard/collapse/tabs `disabled`, variant `match.when`).
      case 'literal': {
        if (rule.sourceKey && isPlainRecord(fieldValue)) {
          if (fieldValue[rule.sourceKey] !== undefined) {
            const copy = { ...fieldValue };
            copy[rule.sourceKey] = {
              __nopPreserveLiteral: true,
              value: copy[rule.sourceKey],
            };
            record[fieldKey] = copy;
            changed = true;
          }
        } else {
          record[fieldKey] = { __nopPreserveLiteral: true, value: fieldValue };
          changed = true;
        }
        break;
      }

      // region/schema/schema-array/value-or-region → compiler-extracted region
      // (replaces the field with the region-key reference + compiled key).
      // Must run BEFORE envelope wrapping so the envelope never hides a
      // nested schema subtree.
      case 'region':
      case 'schema':
      case 'schema-array':
      case 'value-or-region': {
        if (kind === 'value-or-region' && !isSchemaInput(fieldValue)) {
          if (!(rule.sourceKey && isPlainRecord(fieldValue))) {
            break;
          }
        }
        if (extractSchemaDefinitionRegion({ ...input, item: record, fieldKey, spec: rule })) {
          changed = true;
        }
        break;
      }

      // value/prop/meta/reaction/ignored → expression-evaluated values stay as-is.
      default:
        break;
    }
  }

  return changed ? record : item;
}

/**
 * Classify a typed item per its child renderer definition (Phase 6).
 *
 * The item is a full schema node (`{ type: 'button', ... }`) resolved via
 * `registry.get(type)`. Each field is handled by the CHILD definition's
 * classification — nested schema-definition shapes recurse through
 * {@link classifySchemaDefinitionValue}; `fields` rules drive region
 * extraction / literal / event envelope semantics.
 */
function classifyTypedSchemaDefinitionItem(input: {
  item: Record<string, unknown>;
  renderer: RendererDefinition;
  itemPath: string;
  itemRegionKeyPrefix: string;
  regions: Record<string, TemplateRegion>;
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => TemplateNode | TemplateNode[];
  registry?: RendererRegistry;
  emitDiagnostic?: (issue: {
    code: SchemaDiagnosticCode;
    message: string;
    path: string;
    severity?: SchemaDiagnosticSeverity;
  }) => void;
}): unknown {
  const { item, renderer } = input;
  const record = { ...item };
  let changed = false;

  for (const [fieldKey, fieldValue] of Object.entries(record)) {
    if (fieldValue === undefined) {
      continue;
    }

    // Nested schema-definition inside the child contract takes precedence
    // over the top-level field rule (same ordering as compileSingleNode).
    const nestedMatch = findSchemaDefinitionShape(renderer.propContracts?.[fieldKey]);
    if (nestedMatch) {
      const classified = classifySchemaDefinitionValue({
        value: fieldValue,
        match: nestedMatch,
        path: `${input.itemPath}.${fieldKey}`,
        key: fieldKey,
        regions: input.regions,
        compileSchema: input.compileSchema,
        registry: input.registry,
        emitDiagnostic: input.emitDiagnostic,
      });
      if (classified !== fieldValue) {
        record[fieldKey] = classified;
        changed = true;
      }
      continue;
    }

    const rule = classifyField(renderer, fieldKey);
    switch (rule.kind) {
      case 'event':
      case 'action':
        record[fieldKey] = { __nopPreserveLiteral: true, value: fieldValue };
        changed = true;
        break;
      case 'literal':
        record[fieldKey] = { __nopPreserveLiteral: true, value: fieldValue };
        changed = true;
        break;
      case 'region':
      case 'schema':
      case 'schema-array':
      case 'value-or-region': {
        if (rule.kind === 'value-or-region' && !isSchemaInput(fieldValue)) {
          break;
        }
        if (extractSchemaDefinitionRegion({
          ...input,
          item: record,
          fieldKey,
          spec: {
            kind: 'region',
            regionKeySuffix: rule.regionKey ?? fieldKey,
            params: rule.params,
            isolate: rule.isolate,
          } as SchemaFieldRule,
        })) {
          changed = true;
        }
        break;
      }
      default:
        break;
    }
  }

  return changed ? record : item;
}

function classifySchemaDefinitionContainer(input: {
  value: unknown;
  shape: FluxSchemaDefinitionShape;
  path: string;
  key: string;
  regions: Record<string, TemplateRegion>;
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => TemplateNode | TemplateNode[];
  registry?: RendererRegistry;
  emitDiagnostic?: (issue: {
    code: SchemaDiagnosticCode;
    message: string;
    path: string;
    severity?: SchemaDiagnosticSeverity;
  }) => void;
}): unknown {
  const { value, shape } = input;

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      classifySchemaDefinitionItem({
        item,
        shape,
        itemPath: `${input.path}[${index}]`,
        itemRegionKeyPrefix: `${input.key}.${index}`,
        regions: input.regions,
        compileSchema: input.compileSchema,
        registry: input.registry,
        emitDiagnostic: input.emitDiagnostic,
      }),
    );
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return classifySchemaDefinitionItem({
      item: value,
      shape,
      itemPath: input.path,
      itemRegionKeyPrefix: input.key,
      regions: input.regions,
      compileSchema: input.compileSchema,
      registry: input.registry,
      emitDiagnostic: input.emitDiagnostic,
    });
  }

  return value;
}

/**
 * Classify a prop value according to an inlined `schema-definition` shape.
 *
 * Fixed processing order (per docs/architecture/nested-schema-field-classification.md §3.4):
 * region extraction first (inside items), then per-field kind handling;
 * `actionValue: true` marks the whole value as a preserved action template.
 */
export function classifySchemaDefinitionValue(input: {
  value: unknown;
  match: SchemaDefinitionShapeMatch;
  path: string;
  key: string;
  regions: Record<string, TemplateRegion>;
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => TemplateNode | TemplateNode[];
  registry?: RendererRegistry;
  emitDiagnostic?: (issue: {
    code: SchemaDiagnosticCode;
    message: string;
    path: string;
    severity?: SchemaDiagnosticSeverity;
  }) => void;
}): unknown {
  const { match } = input;

  return applyAtPath(input.value, match.keyPath, (target) => {
    if (match.shape.actionValue) {
      if (target == null) {
        return target;
      }
      return { __nopPreserveLiteral: true, value: target };
    }

    return classifySchemaDefinitionContainer({
      value: target,
      shape: match.shape,
      path: input.path,
      key: input.key,
      regions: input.regions,
      compileSchema: input.compileSchema,
      registry: input.registry,
      emitDiagnostic: input.emitDiagnostic,
    });
  });
}

export type CompileSingleNodeFn = (
  schema: BaseSchema,
  options: import('@nop-chaos/flux-core').CompileNodeOptions,
  diagnostics: import('./diagnostics.js').SchemaCompilerDiagnosticsContext,
  depth: number,
) => TemplateNode;

export type CompileSchemaToTemplateNodesFn = (
  schema: SchemaInput,
  options: CompileSchemaOptions,
  depth: number,
) => TemplateNode | TemplateNode[];
