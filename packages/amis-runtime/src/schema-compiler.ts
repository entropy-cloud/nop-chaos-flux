import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/amis-formula';
import type {
  BaseSchema,
  CompiledValidationBehavior,
  CompiledFormValidationModel,
  CompiledValidationNode,
  CompiledNodeRuntimeState,
  CompiledRegion,
  CompiledRuntimeValue,
  CompiledSchemaMeta,
  CompiledSchemaNode,
  CompileNodeOptions,
  CompileSchemaOptions,
  ExpressionCompiler,
  RendererDefinition,
  RendererPlugin,
  RendererRegistry,
  SchemaCompiler,
  SchemaFieldRule,
  SchemaInput,
  ValidationTrigger,
  ValidationVisibilityTrigger
} from '@nop-chaos/amis-schema';
import { META_FIELDS, buildCompiledFormValidationModel, buildCompiledValidationOrder, createNodeId, isSchemaInput } from '@nop-chaos/amis-schema';
import {
  collectSchemaValidationRules,
  compileValidationRules,
  mergeValidationRules,
  normalizeValidationTriggers,
  normalizeValidationVisibilityTriggers
} from './validation';

const TABLE_COLUMN_REGION_FIELDS = [
  { key: 'label', regionKeySuffix: 'label', compiledKey: 'labelRegionKey' },
  { key: 'buttons', regionKeySuffix: 'buttons', compiledKey: 'buttonsRegionKey' },
  { key: 'cell', regionKeySuffix: 'cell', compiledKey: 'cellRegionKey' }
] as const;

type NestedRegionFieldRule = {
  key: string;
  regionKeySuffix: string;
  compiledKey: string;
};

type DeepFieldNormalizer = (input: {
  value: unknown;
  path: string;
  regions: Record<string, CompiledRegion>;
  compileSchema: (input: SchemaInput, options?: CompileSchemaOptions) => CompiledSchemaNode | CompiledSchemaNode[];
}) => unknown;

function extractNestedSchemaRegions(input: {
  candidate: Record<string, unknown>;
  itemRegionPath: string;
  itemRegionKeyPrefix: string;
  rules: readonly NestedRegionFieldRule[];
  regions: Record<string, CompiledRegion>;
  compileSchema: (input: SchemaInput, options?: CompileSchemaOptions) => CompiledSchemaNode | CompiledSchemaNode[];
}) {
  const nextValue: Record<string, unknown> = { ...input.candidate };
  let changed = false;

  for (const rule of input.rules) {
    const fieldValue = input.candidate[rule.key];

    if (!isSchemaInput(fieldValue)) {
      continue;
    }

    const regionKey = `${input.itemRegionKeyPrefix}.${rule.regionKeySuffix}`;
    input.regions[regionKey] = createCompiledRegion(
      regionKey,
      fieldValue,
      `${input.itemRegionPath}.${rule.regionKeySuffix}`,
      input.compileSchema
    );
    delete nextValue[rule.key];
    nextValue[rule.compiledKey] = regionKey;
    changed = true;
  }

  return {
    value: changed ? nextValue : input.candidate,
    changed
  };
}

function normalizeTableColumns(
  value: unknown,
  path: string,
  regions: Record<string, CompiledRegion>,
  compileSchema: (input: SchemaInput, options?: CompileSchemaOptions) => CompiledSchemaNode | CompiledSchemaNode[]
) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((column, index) => {
    if (!column || typeof column !== 'object') {
      return column;
    }

    return extractNestedSchemaRegions({
      candidate: column as Record<string, unknown>,
      itemRegionPath: `${path}.columns[${index}]`,
      itemRegionKeyPrefix: `columns.${index}`,
      rules: TABLE_COLUMN_REGION_FIELDS,
      regions,
      compileSchema
    }).value;
  });
}

const DEEP_FIELD_NORMALIZERS: Record<string, Record<string, DeepFieldNormalizer>> = {
  table: {
    columns(input) {
      return normalizeTableColumns(input.value, input.path, input.regions, input.compileSchema);
    }
  }
};

const DEFAULT_FIELD_RULES: Record<string, SchemaFieldRule> = {
  body: { key: 'body', kind: 'region', regionKey: 'body' },
  actions: { key: 'actions', kind: 'region', regionKey: 'actions' },
  header: { key: 'header', kind: 'region', regionKey: 'header' },
  footer: { key: 'footer', kind: 'region', regionKey: 'footer' },
  toolbar: { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
  dialog: { key: 'dialog', kind: 'prop' },
  columns: { key: 'columns', kind: 'prop' }
};

function classifyField(renderer: RendererDefinition, key: string): SchemaFieldRule {
  const explicit = renderer.fields?.find((field) => field.key === key);

  if (explicit) {
    return explicit;
  }

  if (META_FIELDS.has(key)) {
    return { key, kind: 'meta' };
  }

  if (renderer.regions?.includes(key)) {
    return { key, kind: 'region', regionKey: key };
  }

  if (/^on[A-Z]/.test(key)) {
    return { key, kind: 'event' };
  }

  return DEFAULT_FIELD_RULES[key] ?? { key, kind: 'prop' };
}

function buildCompiledMeta(
  schema: BaseSchema,
  renderer: RendererDefinition,
  expressionCompiler: ExpressionCompiler
): CompiledSchemaMeta {
  const meta: CompiledSchemaMeta = {};

  for (const key of META_FIELDS) {
    if (classifyField(renderer, key).kind !== 'meta') {
      continue;
    }

    const value = schema[key as keyof BaseSchema];

    if (value === undefined) {
      continue;
    }

    switch (key) {
      case 'id':
      case 'name':
      case 'label':
      case 'title':
      case 'className':
      case 'visible':
      case 'hidden':
      case 'disabled':
        meta[key] = expressionCompiler.compileValue(value as any);
        break;
    }
  }

  return meta;
}

function isCompiledStatic(compiled: CompiledRuntimeValue<unknown> | undefined): boolean {
  return !compiled || compiled.kind === 'static';
}

function createNodeRuntimeState(node: CompiledSchemaNode): CompiledNodeRuntimeState {
  const metaEntries: Record<string, any> = {};
  for (const key of Object.keys(node.meta) as Array<Extract<keyof CompiledSchemaMeta, string>>) {
    const value = node.meta[key];
    if (value?.kind === 'dynamic') {
      metaEntries[key] = value.createState();
    }
  }

  return {
    meta: metaEntries,
    props: node.props.kind === 'dynamic' ? node.props.createState() : undefined
  };
}

function createCompiledRegion(
  key: string,
  value: unknown,
  path: string,
  compileSchema: (input: SchemaInput, options?: CompileSchemaOptions) => CompiledSchemaNode | CompiledSchemaNode[]
): CompiledRegion {
  if (value == null) {
    return {
      key,
      path,
      node: null
    };
  }

  if (!isSchemaInput(value)) {
    throw new Error(`Region ${path} must contain schema input.`);
  }

  return {
    key,
    path,
    node: compileSchema(value, { basePath: path, parentPath: path })
  };
}

function poolValidationBehavior(
  pool: Map<string, CompiledValidationBehavior>,
  triggers: ValidationTrigger[],
  showErrorOn: ValidationVisibilityTrigger[]
): CompiledValidationBehavior {
  const key = `${triggers.join('|')}::${showErrorOn.join('|')}`;
  const existing = pool.get(key);

  if (existing) {
    return existing;
  }

  const behavior: CompiledValidationBehavior = {
    triggers,
    showErrorOn
  };
  pool.set(key, behavior);
  return behavior;
}

function collectValidationModel(
  node:
    | CompiledSchemaNode
    | CompiledSchemaNode[]
    | Array<CompiledSchemaNode | CompiledSchemaNode[]>
    | null
    | undefined,
  options: {
    defaultTriggers?: ValidationTrigger[];
    defaultShowErrorOn?: ValidationVisibilityTrigger[];
  } = {}
): CompiledFormValidationModel | undefined {
  if (!node) {
    return undefined;
  }

  const nodes: CompiledSchemaNode[] = [];
  const queue: Array<CompiledSchemaNode | CompiledSchemaNode[]> = Array.isArray(node) ? [...node] : [node];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    if (Array.isArray(current)) {
      queue.unshift(...current);
      continue;
    }

    nodes.push(current);
  }

  const validationNodes: Record<string, CompiledValidationNode> = {
    '': {
      path: '',
      kind: 'form',
      rules: [],
      children: [],
      parent: undefined
    }
  };
  const behaviorPool = new Map<string, CompiledValidationBehavior>();
  let rootBehavior = poolValidationBehavior(
    behaviorPool,
    options.defaultTriggers ?? (['blur'] as ValidationTrigger[]),
    options.defaultShowErrorOn ?? (['touched', 'submit'] as ValidationVisibilityTrigger[])
  );

  const visit = (entry: CompiledSchemaNode) => {
    if (!entry.component) {
      return;
    }

    if (entry.type === 'form') {
      rootBehavior = poolValidationBehavior(
        behaviorPool,
        normalizeValidationTriggers(entry.schema.validateOn, ['blur']),
        normalizeValidationVisibilityTriggers(entry.schema.showErrorOn, ['touched', 'submit'])
      );
    }

    const contributor = entry.component.validation;

    if (contributor?.kind === 'field') {
      const ctx = {
        schema: entry.schema,
        renderer: entry.component,
        path: entry.path
      };
      const fieldPath = contributor.getFieldPath?.(entry.schema, ctx);

      if (fieldPath) {
        const compiledRules = compileValidationRules(
          fieldPath,
          mergeValidationRules(collectSchemaValidationRules(entry.schema), contributor.collectRules?.(entry.schema, ctx))
        );
        const parentPath = fieldPath.includes('.') ? fieldPath.split('.').slice(0, -1).join('.') : '';
        const nodeKind = contributor.valueKind === 'array' ? 'array' : contributor.valueKind === 'object' ? 'object' : 'field';

        const behavior = poolValidationBehavior(
          behaviorPool,
          normalizeValidationTriggers(entry.schema.validateOn, rootBehavior.triggers),
          normalizeValidationVisibilityTriggers(entry.schema.showErrorOn, rootBehavior.showErrorOn)
        );
        const label = typeof entry.schema.label === 'string' ? entry.schema.label : undefined;

        validationNodes[fieldPath] = {
          path: fieldPath,
          kind: nodeKind,
          controlType: entry.type,
          label,
          rules: compiledRules,
          behavior,
          children: [],
          parent: parentPath
        };

        if (validationNodes[parentPath]) {
          validationNodes[parentPath].children.push(fieldPath);
      }

      }
    }

    for (const region of Object.values(entry.regions)) {
      if (!region.node) {
        continue;
      }

      const childNodes = Array.isArray(region.node) ? region.node : [region.node];
      childNodes.forEach(visit);
    }
  };

  nodes.forEach(visit);

  return buildCompiledFormValidationModel({
    behavior: rootBehavior,
    nodes: validationNodes,
    rootPath: ''
  });
}

function applyWrapComponentPlugins(renderer: RendererDefinition, plugins?: RendererPlugin[]): RendererDefinition {
  return (plugins ?? []).reduce((current, plugin) => plugin.wrapComponent?.(current) ?? current, renderer);
}

export function createSchemaCompiler(input: {
  registry: RendererRegistry;
  expressionCompiler?: ExpressionCompiler;
  plugins?: RendererPlugin[];
}): SchemaCompiler {
  const expressionCompiler = input.expressionCompiler ?? createExpressionCompiler(createFormulaCompiler());

  function applyBeforeCompilePlugins(schema: SchemaInput): SchemaInput {
    return (input.plugins ?? []).reduce((current, plugin) => plugin.beforeCompile?.(current) ?? current, schema);
  }

  function applyAfterCompilePlugins(node: CompiledSchemaNode | CompiledSchemaNode[]): CompiledSchemaNode | CompiledSchemaNode[] {
    return (input.plugins ?? []).reduce((current, plugin) => plugin.afterCompile?.(current) ?? current, node);
  }

  function compileSingleNode(schema: BaseSchema, options: CompileNodeOptions): CompiledSchemaNode {
    const renderer = options.renderer;
    const path = options.path;
    const meta = buildCompiledMeta(schema, renderer, expressionCompiler);
    const propSource: Record<string, unknown> = {};
    const regions: Record<string, CompiledRegion> = {};
    const eventActions: Record<string, unknown> = {};
    const eventKeys: string[] = [];
    const deepNormalizers = DEEP_FIELD_NORMALIZERS[renderer.type] ?? {};

    for (const key of Object.keys(schema)) {
      const rule = classifyField(renderer, key);
      const value = schema[key];

      if (rule.kind === 'ignored' || rule.kind === 'meta') {
        continue;
      }

      if (rule.kind === 'event') {
        eventActions[key] = value;
        eventKeys.push(key);
        continue;
      }

      if (rule.kind === 'region' || (rule.kind === 'value-or-region' && isSchemaInput(value))) {
        regions[rule.regionKey ?? key] = createCompiledRegion(
          rule.regionKey ?? key,
          value,
          `${path}.${rule.regionKey ?? key}`,
          compileSchema
        );
        continue;
      }

      propSource[key] = deepNormalizers[key]
        ? deepNormalizers[key]({
            value,
            path,
            regions,
            compileSchema
          })
        : value;
    }

    const props = expressionCompiler.compileValue(propSource);

    const flags = {
      hasVisibilityRule: !!meta.visible,
      hasHiddenRule: !!meta.hidden,
      hasDisabledRule: !!meta.disabled,
      isContainer: Object.keys(regions).length > 0,
      isStatic:
        Object.values(meta).every((value) => isCompiledStatic(value)) &&
        props.kind === 'static' &&
        Object.values(regions).every((region) => region.node == null)
    };

    return {
      id: createNodeId(path, schema),
      type: schema.type,
      path,
      schema,
      component: renderer,
      meta,
      props,
      validation:
        renderer.scopePolicy === 'form'
          ? collectValidationModel(
              Object.values(regions)
                .map((region) => region.node)
                .filter((candidate): candidate is CompiledSchemaNode | CompiledSchemaNode[] => candidate != null),
              {
                defaultTriggers: normalizeValidationTriggers(schema.validateOn, ['blur']),
                defaultShowErrorOn: normalizeValidationVisibilityTriggers(schema.showErrorOn, ['touched', 'submit'])
              }
            )
          : undefined,
      regions,
      eventActions,
      eventKeys,
      flags,
      createRuntimeState() {
        return createNodeRuntimeState(this);
      }
    };
  }

  function compileSchema(schema: SchemaInput, options: CompileSchemaOptions = {}): CompiledSchemaNode | CompiledSchemaNode[] {
    const prepared = applyBeforeCompilePlugins(schema);

    if (Array.isArray(prepared)) {
      const compiled = prepared.map((item, index) => {
        const path = options.basePath ? `${options.basePath}[${index}]` : `$[${index}]`;
        const renderer = input.registry.get(item.type);

        if (!renderer) {
          throw new Error(`Renderer not found for type: ${item.type}`);
        }

        const wrappedRenderer = applyWrapComponentPlugins(renderer, input.plugins);

        return compileSingleNode(item, {
          path,
          parentPath: options.parentPath,
          renderer: wrappedRenderer
        });
      });

      return applyAfterCompilePlugins(compiled);
    }

    const path = options.basePath ?? '$';
    const renderer = input.registry.get(prepared.type);

    if (!renderer) {
      throw new Error(`Renderer not found for type: ${prepared.type}`);
    }

    const wrappedRenderer = applyWrapComponentPlugins(renderer, input.plugins);

    return applyAfterCompilePlugins(
      compileSingleNode(prepared, {
        path,
        parentPath: options.parentPath,
        renderer: wrappedRenderer
      })
    );
  }

  return {
    compile: compileSchema,
    compileNode(schema, options) {
      return compileSingleNode(schema, options);
    }
  };
}

export function createValidationTraversalOrder(
  nodes: Record<string, CompiledValidationNode>,
  rootPath: string | undefined
): string[] {
  return buildCompiledValidationOrder(nodes, rootPath);
}
