import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import type {
  BaseSchema,
  CompiledSchemaNode,
  CompiledRegion,
  CompileNodeOptions,
  CompileSchemaOptions,
  ExpressionCompiler,
  RendererDefinition,
  RendererPlugin,
  RendererRegistry,
  SchemaCompiler,
  SchemaInput
} from '@nop-chaos/flux-core';
import { buildCompiledValidationOrder, createNodeId, isSchemaInput } from '@nop-chaos/flux-core';
import { normalizeValidationTriggers, normalizeValidationVisibilityTriggers } from './validation';
import { createCompiledRegion } from './schema-compiler/regions';
import { DEEP_FIELD_NORMALIZERS } from './schema-compiler/tables';
import { classifyField, buildCompiledMeta, isCompiledStatic, createNodeRuntimeState } from './schema-compiler/fields';
import { collectValidationModel } from './schema-compiler/validation-collection';

function applyWrapComponentPlugins(renderer: RendererDefinition, plugins?: RendererPlugin[]): RendererDefinition {
  return (plugins ?? []).reduce((current, plugin) => plugin.wrapComponent?.(current) ?? current, renderer);
}

function collectCompiledNodes(entry: CompiledSchemaNode | CompiledSchemaNode[], out: CompiledSchemaNode[]) {
  if (Array.isArray(entry)) {
    entry.forEach((item) => collectCompiledNodes(item, out));
    return;
  }

  out.push(entry);

  for (const region of Object.values(entry.regions)) {
    if (!region.node) {
      continue;
    }
    collectCompiledNodes(region.node, out);
  }
}

function rewriteActionTargets(
  value: unknown,
  byId: Map<string, number>,
  byName: Map<string, number>
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteActionTargets(item, byId, byName));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, candidate] of Object.entries(source)) {
    output[key] = rewriteActionTargets(candidate, byId, byName);
  }

    if (typeof source.action === 'string' && source.action.startsWith('component:')) {
      if (typeof source.componentId === 'string') {
        const resolvedCid = byId.get(source.componentId);
        if (resolvedCid !== undefined) {
          output._targetCid = resolvedCid;
        }
      } else if (typeof source.componentName === 'string') {
        const resolvedCid = byName.get(source.componentName);
        if (resolvedCid !== undefined) {
          output._targetCid = resolvedCid;
        }
      }
    }

  return output;
}

function enrichCompiledComponentTargets(compiled: CompiledSchemaNode | CompiledSchemaNode[]): CompiledSchemaNode | CompiledSchemaNode[] {
  const nodes: CompiledSchemaNode[] = [];
  collectCompiledNodes(compiled, nodes);

  const byId = new Map<string, number>();
  const byName = new Map<string, number>();
  let cid = 0;

  for (const node of nodes) {
    const schemaRecord = node.schema as Record<string, unknown>;
    const id = typeof schemaRecord.id === 'string' ? schemaRecord.id : undefined;
    const name = typeof schemaRecord.name === 'string' ? schemaRecord.name : undefined;

    cid += 1;
    schemaRecord._cid = cid;

    if (!id && !name) {
      continue;
    }

    if (id) {
      byId.set(id, cid);
    }

    if (name) {
      byName.set(name, cid);
    }
  }

  for (const node of nodes) {
    const nextActions: Record<string, unknown> = {};
    for (const key of node.eventKeys) {
      nextActions[key] = rewriteActionTargets(node.eventActions[key], byId, byName);
    }
    node.eventActions = nextActions;
  }

  return compiled;
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
      return enrichCompiledComponentTargets(applyAfterCompilePlugins(compiled) as CompiledSchemaNode | CompiledSchemaNode[]);
    }

    const path = options.basePath ?? '$';
    const renderer = input.registry.get(prepared.type);

    if (!renderer) {
      throw new Error(`Renderer not found for type: ${prepared.type}`);
    }

    const wrappedRenderer = applyWrapComponentPlugins(renderer, input.plugins);

    return enrichCompiledComponentTargets(
      applyAfterCompilePlugins(
        compileSingleNode(prepared, {
          path,
          parentPath: options.parentPath,
          renderer: wrappedRenderer
        })
      ) as CompiledSchemaNode | CompiledSchemaNode[]
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
  nodes: Record<string, import('@nop-chaos/flux-core').CompiledValidationNode>,
  rootPath: string | undefined
): string[] {
  return buildCompiledValidationOrder(nodes, rootPath);
}
