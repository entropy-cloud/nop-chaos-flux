import type {
  BaseSchema,
  CompiledRuntimeValue,
  CompileSchemaOptions,
  RendererDefinition,
  SchemaInput,
  TemplateNode,
  TemplateRegion,
  XuiImportSpec,
} from '@nop-chaos/flux-core';
import type { RendererDeepFieldRegionRule } from '@nop-chaos/flux-core';
import { createNodeId, extractNestedSchemaRegions } from '@nop-chaos/flux-core';
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
