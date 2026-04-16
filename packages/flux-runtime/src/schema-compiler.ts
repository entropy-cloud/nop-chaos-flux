import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import type {
  BaseSchema,
  CompiledTemplate,
  CompileNodeOptions,
  CompileSchemaOptions,
  ExpressionCompiler,
  NodeMetaProgram as _NodeMetaProgram,
  RendererPlugin,
  RendererRegistry,
  SchemaCompiler,
  SchemaInput,
  ScopePlan,
  TemplateNode,
  TemplateRegion,
  WrapProvidersFn
} from '@nop-chaos/flux-core';
import {
  buildCompiledValidationOrder,
  createCompiledCidState,
  createNodeId,
  isSchemaInput,
} from '@nop-chaos/flux-core';
import { normalizeValidationTriggers, normalizeValidationVisibilityTriggers } from './validation';
import { createTemplateRegion } from './schema-compiler/regions';
import { DEEP_FIELD_NORMALIZERS } from './schema-compiler/tables';
import { classifyField, buildMetaProgram, isCompiledStatic as _isCompiledStatic } from './schema-compiler/fields';
import { collectValidationModel } from './schema-compiler/validation-collection';
import { analyzeSchemaInput, applyWrapComponentPlugins, inspectSchemaNodeFields, isNamespacedSchemaKey } from './schema-compiler/shape-validation';
import { enrichTemplateNodeIds, extractLifecycleActions } from './schema-compiler/target-enrichment';
import {
  createSchemaCompilerDiagnosticsContext,
  schemaPathToJsonPointer,
  type SchemaCompilerDiagnosticsContext
} from './schema-compiler/diagnostics';

const PROVIDER_BUILD_ORDER = ['actionScope', 'componentRegistry', 'classAliases'] as const;

function buildWrapProvidersClosure(providers: TemplateNode['providerPlan']): WrapProvidersFn {
  let fn: WrapProvidersFn = (_wp, _v, ch) => ch;

  for (const kind of PROVIDER_BUILD_ORDER) {
    if (providers?.[kind]) {
      const inner = fn;
      fn = (wp, v, ch) => wp(kind, v[kind], inner(wp, v, ch));
    }
  }

  return fn;
}

export function createSchemaCompiler(input: {
  registry: RendererRegistry;
  expressionCompiler?: ExpressionCompiler;
  plugins?: RendererPlugin[];
  defaultCidState?: import('@nop-chaos/flux-core').CompiledCidState;
}): SchemaCompiler {
  const expressionCompiler = input.expressionCompiler ?? createExpressionCompiler(createFormulaCompiler());
  const noopDiagnostics = createSchemaCompilerDiagnosticsContext(undefined, 'compile');

  function applyBeforeCompilePlugins(schema: SchemaInput): SchemaInput {
    return (input.plugins ?? []).reduce((current, plugin) => plugin.beforeCompile?.(current) ?? current, schema);
  }

  function applyAfterCompilePlugins(template: CompiledTemplate): CompiledTemplate {
    return (input.plugins ?? []).reduce((current, plugin) => plugin.afterCompile?.(current) ?? current, template);
  }

  function compileSchemaToTemplateNodes(schema: SchemaInput, options: CompileSchemaOptions = {}): TemplateNode | TemplateNode[] {
    const prepared = applyBeforeCompilePlugins(schema);
    const diagnostics = createSchemaCompilerDiagnosticsContext(options, 'compile');
    const cidState = options.cidState ?? input.defaultCidState ?? createCompiledCidState();

    if (!isSchemaInput(prepared)) {
      diagnostics.emit({
        code: 'invalid-root',
        path: schemaPathToJsonPointer(options.basePath ?? '$'),
        message: 'Schema root must be an object or an array of schema objects.'
      });
      throw new Error('Invalid schema root');
    }

    if (diagnostics.enabled) {
      analyzeSchemaInput(prepared, options.basePath ?? '$', input.registry, input.plugins, diagnostics);
    }

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
        }, diagnostics);
      });

      const nodes = enrichTemplateNodeIds(compiled, cidState);
      const template: CompiledTemplate = applyAfterCompilePlugins({ root: nodes, repeatedTemplates: new Map() });
      return Array.isArray(template.root) ? template.root as TemplateNode[] : [template.root] as TemplateNode[];
    }

    const path = options.basePath ?? '$';
    const renderer = input.registry.get(prepared.type);

    if (!renderer) {
      throw new Error(`Renderer not found for type: ${prepared.type}`);
    }

    const wrappedRenderer = applyWrapComponentPlugins(renderer, input.plugins);

    const node = enrichTemplateNodeIds(
      compileSingleNode(prepared, {
        path,
        parentPath: options.parentPath,
        renderer: wrappedRenderer
      }, diagnostics),
      cidState
    );

    const template: CompiledTemplate = applyAfterCompilePlugins({ root: node, repeatedTemplates: new Map() });
    return template.root as TemplateNode | TemplateNode[];
  }

  function compileSingleNode(
    schema: BaseSchema,
    options: CompileNodeOptions,
    diagnostics: SchemaCompilerDiagnosticsContext = noopDiagnostics
  ): TemplateNode {
    const renderer = options.renderer;
    const path = options.path;
    const fieldInspection = inspectSchemaNodeFields(schema, renderer, path, diagnostics, false);
    const metaProgram = buildMetaProgram(schema, renderer, expressionCompiler);
    const propSource: Record<string, unknown> = {};
    const sourcePropKeys = new Set<string>();
    const sourceStatePropKeys: Record<string, string> = {};
    const regions: Record<string, TemplateRegion> = {};
    const lifecycleActions = extractLifecycleActions(schema);
    const eventPlans: Record<string, unknown> = {};
    const deepNormalizers = DEEP_FIELD_NORMALIZERS[renderer.type] ?? {};

    for (const key of Object.keys(schema)) {
      if (fieldInspection.skippedPropKeys.has(key) || isNamespacedSchemaKey(key)) {
        continue;
      }

      const rule = classifyField(renderer, key);
      const value = schema[key];

      if (rule.kind === 'ignored' || rule.kind === 'meta') {
        continue;
      }

      if (rule.kind === 'event') {
        eventPlans[key] = value;
        continue;
      }

      if (rule.kind === 'region' || (rule.kind === 'value-or-region' && isSchemaInput(value))) {
        const regionMeta = rule.kind === 'region' || isSchemaInput(value)
          ? { params: rule.params, isolate: rule.isolate }
          : undefined;
        regions[rule.regionKey ?? key] = createTemplateRegion(
          rule.regionKey ?? key,
          value,
          `${path}.${rule.regionKey ?? key}`,
          compileSchemaToTemplateNodes,
          regionMeta
        );
        continue;
      }

      propSource[key] = deepNormalizers[key]
        ? deepNormalizers[key]({
            value,
            path,
            regions,
            compileSchema: compileSchemaToTemplateNodes
          })
        : value;

      if (rule.allowSource) {
        sourcePropKeys.add(key);

        if (rule.sourceStateKey) {
          sourceStatePropKeys[key] = rule.sourceStateKey;
        }
      }
    }

    const propsProgram = expressionCompiler.compileValue(propSource);

    const scopePlan: ScopePlan =
      renderer.scopePolicy === 'form'
        ? { kind: 'form' }
        : fieldInspection.extensions?.['xui:imports']
          ? { kind: 'child' }
          : { kind: 'inherit' };

    const providerPlan = {
      actionScope:
        renderer.actionScopePolicy === 'new' ||
        Boolean(fieldInspection.extensions?.['xui:imports']),
      componentRegistry: renderer.componentRegistryPolicy === 'new',
      classAliases: Boolean(schema.classAliases && Object.keys(schema.classAliases as Record<string, unknown>).length > 0)
    };

    const providerWrap = buildWrapProvidersClosure(providerPlan);

    return {
      templateNodeId: 0,
      id: createNodeId(path, schema),
      type: schema.type,
      schema,
      templatePath: path,
      rendererType: renderer.type,
      component: renderer,
      propsProgram,
      metaProgram,
      eventPlans,
      lifecycleActions,
      regions,
      providerPlan,
      providerWrap,
      scopePlan,
      validationPlan:
        renderer.scopePolicy === 'form'
          ? collectValidationModel(
              Object.values(regions)
                .map((region) => region.node)
                .filter((candidate): candidate is TemplateNode | TemplateNode[] => candidate != null),
              {
                defaultTriggers: normalizeValidationTriggers(schema.validateOn, ['blur']),
                defaultShowErrorOn: normalizeValidationVisibilityTriggers(schema.showErrorOn, ['touched', 'submit']),
                defaultHiddenFieldPolicy: (schema as { hiddenFieldPolicy?: unknown }).hiddenFieldPolicy as import('@nop-chaos/flux-core').HiddenFieldPolicy | undefined
              }
            )
          : undefined,
      sourcePropKeys: Array.from(sourcePropKeys).sort(),
      sourceStatePropKeys
    };
  }

  function validateSchemaInput(schema: SchemaInput, options: CompileSchemaOptions = {}) {
    const diagnostics = createSchemaCompilerDiagnosticsContext(options, 'validate');
    const prepared = applyBeforeCompilePlugins(schema);

    if (!isSchemaInput(prepared)) {
      diagnostics.emit({
        code: 'invalid-root',
        path: schemaPathToJsonPointer(options.basePath ?? '$'),
        message: 'Schema root must be an object or an array of schema objects.'
      });
      return diagnostics.diagnostics;
    }

    analyzeSchemaInput(prepared, options.basePath ?? '$', input.registry, input.plugins, diagnostics);
    return diagnostics.diagnostics;
  }

  return {
    compile(schema, options) {
      const nodes = compileSchemaToTemplateNodes(schema, options);
      return {
        root: nodes,
        repeatedTemplates: new Map()
      };
    },
    compileNode(schema, options) {
      return compileSingleNode(schema, options);
    },
    validate(schema, options) {
      return validateSchemaInput(schema, options);
    }
  };
}

export function validateSchema(input: {
  schema: SchemaInput;
  registry: RendererRegistry;
  expressionCompiler?: ExpressionCompiler;
  plugins?: RendererPlugin[];
  options?: CompileSchemaOptions;
}) {
  const compiler = createSchemaCompiler({
    registry: input.registry,
    expressionCompiler: input.expressionCompiler,
    plugins: input.plugins
  });

  return compiler.validate?.(input.schema, input.options) ?? [];
}

export function createValidationTraversalOrder(
  nodes: Record<string, import('@nop-chaos/flux-core').CompiledValidationNode>,
  rootPath: string | undefined
): string[] {
  return buildCompiledValidationOrder(nodes, rootPath);
}
