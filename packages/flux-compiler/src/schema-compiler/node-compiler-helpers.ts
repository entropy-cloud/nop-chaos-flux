import type {
  BaseSchema,
  CompiledRuntimeValue,
  CompileSchemaOptions,
  FluxSchemaDefinitionShape,
  FluxValueShape,
  RendererDefinition,
  RendererPropContract,
  SchemaInput,
  TemplateNode,
  TemplateRegion,
  XuiImportSpec,
} from '@nop-chaos/flux-core';
import type { RendererDeepFieldRegionRule } from '@nop-chaos/flux-core';
import { createNodeId, createTemplateRegion, extractNestedSchemaRegions, isSchemaInput } from '@nop-chaos/flux-core';
import { compileRuntimeValueTree } from './runtime-value-compilation.js';
import { buildWrapProvidersClosure } from './static-analysis.js';

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

export function normalizeDeepFieldNestedRegions(input: {
  value: unknown;
  path: string;
  key: string;
  rules?: readonly RendererDeepFieldRegionRule[];
  regions: Record<string, TemplateRegion>;
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => TemplateNode | TemplateNode[];
}) {
  const rules = input.rules;

  if (!rules?.length) {
    return input.value;
  }

  if (Array.isArray(input.value)) {
    return input.value.map((item, index) => {
      if (!item || typeof item !== 'object') {
        return item;
      }

      return extractNestedSchemaRegions({
        candidate: item as Record<string, unknown>,
        itemRegionPath: `${input.path}.${input.key}[${index}]`,
        itemRegionKeyPrefix: `${input.key}.${index}`,
        rules,
        regions: input.regions,
        compileSchema: input.compileSchema,
      }).value;
    });
  }

  if (!input.value || typeof input.value !== 'object') {
    return input.value;
  }

  return extractNestedSchemaRegions({
    candidate: input.value as Record<string, unknown>,
    itemRegionPath: `${input.path}.${input.key}`,
    itemRegionKeyPrefix: input.key,
    rules,
    regions: input.regions,
    compileSchema: input.compileSchema,
  }).value;
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
 * Independent of deepFields.
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
}): unknown {
  const { item, shape } = input;

  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return item;
  }

  const record = { ...(item as Record<string, unknown>) };
  let changed = false;

  for (const [fieldKey, spec] of Object.entries(shape.fieldRules)) {
    const kind = typeof spec === 'string' ? spec : spec.kind;
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

      // region/schema/schema-array → compiler-extracted region (replaces the
      // field with the region key). Must run BEFORE envelope wrapping so the
      // envelope never hides a nested schema subtree.
      case 'region':
      case 'schema':
      case 'schema-array': {
        if (!isSchemaInput(fieldValue)) {
          break;
        }
        const regionKey = `${input.itemRegionKeyPrefix}.${fieldKey}`;
        const regionPath = `${input.itemPath}.${fieldKey}`;
        input.regions[regionKey] = createTemplateRegion(
          regionKey,
          fieldValue,
          regionPath,
          (schema, options) => input.compileSchema(schema, options),
        );
        record[fieldKey] = regionKey;
        changed = true;
        break;
      }

      // value/prop/literal → expression-evaluated values stay as-is.
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
