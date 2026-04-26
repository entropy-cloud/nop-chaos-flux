import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import type {
  ActionSchema,
  BaseSchema,
  CompiledActionProgram,
  CompiledTemplate,
  CompileNodeOptions,
  CompileSchemaOptions,
  DataSourceSchema,
  ExpressionCompiler,
  ReactionSchema,
  RendererPlugin,
  RendererRegistry,
  SchemaCompiler,
  SchemaInput,
  ScopePlan,
  TemplateNode,
  TemplateRegion,
  PreparedImportSpec,
  XuiImportSpec
} from '@nop-chaos/flux-core';
import {
  createNodeId,
  isSchemaInput,
} from '@nop-chaos/flux-core';
import {
  createCompilerPluginAppliers,
  MAX_COMPILE_DEPTH,
  prepareSchemaImports,
  prepareSchemaRoot
} from './schema-compiler-helpers';
import { canonicalizeSchemaInput } from './schema-compiler/authoring-transform';
import { createTemplateRegion } from './schema-compiler/regions';
import { DEEP_FIELD_NORMALIZERS } from './schema-compiler/tables';
import { classifyField, buildMetaProgram } from './schema-compiler/fields';
import { collectValidationModel } from './schema-compiler/validation-collection';
import { analyzeSchemaInput, applyWrapComponentPlugins, inspectSchemaNodeFields, isNamespacedSchemaKey } from './schema-compiler/shape-validation';
import { enrichTemplateNodeIds, extractLifecycleActions } from './schema-compiler/target-enrichment';
import {
  createSchemaCompilerDiagnosticsContext,
  schemaPathToJsonPointer,
  type SchemaCompilerDiagnosticsContext
} from './schema-compiler/diagnostics';
import { normalizeImportSpecKey, pushImportSymbols, pushPreparedImportSymbols, pushInjectedLocalSymbols, pushRegionParamSymbols } from './schema-compiler/symbol-helpers';
import { buildWrapProvidersClosure, computeStaticAnalysis } from './schema-compiler/static-analysis';
import { compileActions } from './action-compiler';
import { compileDataSource } from './source-compiler';
import { compileReaction } from './reaction-compiler';
import { createBaseCompileSymbolTable } from './compile-symbol-table';
import { normalizeValidationTriggers, normalizeValidationVisibilityTriggers } from './validation-lowering';

export function createSchemaCompiler(input: {
  registry: RendererRegistry;
  expressionCompiler?: ExpressionCompiler;
  plugins?: RendererPlugin[];
  defaultCidState?: import('@nop-chaos/flux-core').CompiledCidState;
}): SchemaCompiler {
  const expressionCompiler = input.expressionCompiler ?? createExpressionCompiler(createFormulaCompiler());
  const noopDiagnostics = createSchemaCompilerDiagnosticsContext(undefined, 'compile');
  const { applyBeforeCompilePlugins, applyAfterCompilePlugins } = createCompilerPluginAppliers(input.plugins);

  function compileSchemaToTemplateNodes(schema: SchemaInput, options: CompileSchemaOptions = {}, depth = 0): TemplateNode | TemplateNode[] {
    if (depth > MAX_COMPILE_DEPTH) {
      throw new Error(`Schema compilation exceeded maximum nesting depth (${MAX_COMPILE_DEPTH}). Check for circular region references or overly deep nesting at path: ${options.basePath ?? '$'}`);
    }

    const prepared = applyBeforeCompilePlugins(schema);
    const symbolTable = options.symbolTable ?? createBaseCompileSymbolTable();
    const { diagnostics, cidState, canonicalPrepared } = prepareSchemaRoot({
      schema: prepared,
      options: {
        ...options,
        cidState: options.cidState ?? input.defaultCidState
      },
      registry: input.registry,
      plugins: input.plugins
    });

    if (diagnostics.enabled) {
      analyzeSchemaInput(canonicalPrepared, options.basePath ?? '$', input.registry, input.plugins, diagnostics);
    }

    if (Array.isArray(canonicalPrepared)) {
      const compiled = canonicalPrepared.map((item, index) => {
        const path = options.basePath ? `${options.basePath}[${index}]` : `$[${index}]`;
        const renderer = input.registry.get(item.type);

        if (!renderer) {
          throw new Error(`Renderer not found for type: ${item.type}`);
        }

        const wrappedRenderer = applyWrapComponentPlugins(renderer, input.plugins);

        return compileSingleNode(item, {
          path,
          parentPath: options.parentPath,
          schemaUrl: options.schemaUrl,
          symbolTable,
          preparedImports: options.preparedImports,
          renderer: wrappedRenderer
        }, diagnostics, depth);
      });

      const nodes = enrichTemplateNodeIds(compiled, cidState);
      const template: CompiledTemplate = applyAfterCompilePlugins({ root: nodes, repeatedTemplates: new Map() });
      return Array.isArray(template.root) ? template.root as TemplateNode[] : [template.root] as TemplateNode[];
    }

    const path = options.basePath ?? '$';
    const renderer = input.registry.get(canonicalPrepared.type);

    if (!renderer) {
      throw new Error(`Renderer not found for type: ${canonicalPrepared.type}`);
    }

    const wrappedRenderer = applyWrapComponentPlugins(renderer, input.plugins);

    const node = enrichTemplateNodeIds(
      compileSingleNode(canonicalPrepared, {
        path,
        parentPath: options.parentPath,
        schemaUrl: options.schemaUrl,
        symbolTable,
        preparedImports: options.preparedImports,
        renderer: wrappedRenderer
      }, diagnostics, depth),
      cidState
    );

    const template: CompiledTemplate = applyAfterCompilePlugins({ root: node, repeatedTemplates: new Map() });
    return template.root as TemplateNode | TemplateNode[];
  }

  function compileSingleNode(
    schema: BaseSchema,
    options: CompileNodeOptions,
    diagnostics: SchemaCompilerDiagnosticsContext = noopDiagnostics,
    depth = 0
  ): TemplateNode {
    const renderer = options.renderer;
    const path = options.path;
    const fieldInspection = inspectSchemaNodeFields(schema, renderer, path, diagnostics, false);
    const metaProgram = buildMetaProgram(schema, renderer, expressionCompiler);
    const propSource: Record<string, unknown> = {};
    const sourcePropKeys = new Set<string>();
    const sourceStatePropKeys: Record<string, string> = {};
    const regions: Record<string, TemplateRegion> = {};
    const rawLifecycleActions = extractLifecycleActions(schema);
    const rawEventPlans: Record<string, ActionSchema | ActionSchema[]> = {};
    const deepNormalizers = DEEP_FIELD_NORMALIZERS[renderer.type] ?? {};

    const nodeImports = Array.isArray(fieldInspection.extensions?.['xui:imports'])
      ? fieldInspection.extensions?.['xui:imports'] as XuiImportSpec[]
      : undefined;

    let symbolTable = pushInjectedLocalSymbols(
      options.symbolTable ?? createBaseCompileSymbolTable(),
      renderer,
      `${path}:owner-symbols`
    );
    symbolTable = options.schemaUrl
      ? pushPreparedImportSymbols(symbolTable, nodeImports, options.preparedImports, options.schemaUrl, `${path}:imports`)
      : pushImportSymbols(symbolTable, nodeImports, `${path}:imports`);

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
        rawEventPlans[key] = value as ActionSchema | ActionSchema[];
        continue;
      }

      if (rule.kind === 'region' || (rule.kind === 'value-or-region' && isSchemaInput(value))) {
        const regionMeta = rule.kind === 'region' || isSchemaInput(value)
          ? { params: rule.params, isolate: rule.isolate }
          : undefined;
        const compileAtNextDepth: typeof compileSchemaToTemplateNodes = (s, o) => compileSchemaToTemplateNodes(s, o, depth + 1);
        regions[rule.regionKey ?? key] = createTemplateRegion(
          rule.regionKey ?? key,
          value,
          `${path}.${rule.regionKey ?? key}`,
          (inputValue, regionOptions) => compileAtNextDepth(inputValue, {
            ...regionOptions,
            schemaUrl: regionOptions?.schemaUrl ?? options.schemaUrl,
            preparedImports: options.preparedImports,
            symbolTable: pushRegionParamSymbols(symbolTable, rule.params, `${path}.${rule.regionKey ?? key}:slot`)
          }),
          regionMeta
        );
        continue;
      }

      propSource[key] = deepNormalizers[key]
        ? deepNormalizers[key]({
            value,
            path,
            regions,
            compileSchema: (s: SchemaInput, o?: CompileSchemaOptions) => compileSchemaToTemplateNodes(s, {
              ...o,
              schemaUrl: o?.schemaUrl ?? options.schemaUrl,
              preparedImports: o?.preparedImports ?? options.preparedImports
            }, depth + 1)
          })
        : value;

      if (rule.allowSource) {
        sourcePropKeys.add(key);

        if (rule.sourceStateKey) {
          sourceStatePropKeys[key] = rule.sourceStateKey;
        }
      }
    }

    const propsProgram = expressionCompiler.compileValue(propSource, {
      symbolTable,
      sourcePath: path,
      reportDiagnostic: (issue) => diagnostics.emit(issue)
    });
    const compileOptions = {
      symbolTable,
      sourcePath: path,
      reportDiagnostic: (issue: { code: import('@nop-chaos/flux-core').SchemaDiagnosticCode; message: string; path: string; severity?: import('@nop-chaos/flux-core').SchemaDiagnosticSeverity; source?: import('@nop-chaos/flux-core').SchemaDiagnosticSource; }) => diagnostics.emit(issue)
    };

    const eventPlans: Record<string, CompiledActionProgram> = {};
    for (const [key, rawActions] of Object.entries(rawEventPlans)) {
      eventPlans[key] = compileActions(rawActions, expressionCompiler, {
        ...compileOptions,
        basePath: `${path}.${key}`,
      });
    }

    const lifecycleActions: {
      onMount?: CompiledActionProgram;
      onUnmount?: CompiledActionProgram;
    } | undefined = rawLifecycleActions
      ? {
          onMount: rawLifecycleActions.onMount
            ? compileActions(rawLifecycleActions.onMount as ActionSchema | ActionSchema[], expressionCompiler, {
                ...compileOptions,
                basePath: `${path}.onMount`,
              })
            : undefined,
          onUnmount: rawLifecycleActions.onUnmount
            ? compileActions(rawLifecycleActions.onUnmount as ActionSchema | ActionSchema[], expressionCompiler, {
                ...compileOptions,
                basePath: `${path}.onUnmount`,
              })
            : undefined,
        }
      : undefined;

    const scopePlan: ScopePlan =
      renderer.scopePolicy === 'form'
        ? { kind: 'form' }
        : nodeImports
          ? { kind: 'child' }
          : { kind: 'inherit' };

    const classAliasesPlan = schema.classAliases && Object.keys(schema.classAliases as Record<string, unknown>).length > 0
      ? {
          aliases: schema.classAliases as Record<string, string>
        }
      : undefined;

    const preparedNodeImports = options.schemaUrl && nodeImports?.length
      ? nodeImports
          .map((spec) => options.preparedImports?.get(normalizeImportSpecKey(options.schemaUrl!, spec)))
          .filter((entry): entry is PreparedImportSpec => Boolean(entry))
      : [];

    const importsPlan = nodeImports?.length
      ? {
          imports: nodeImports,
          resolvedImports: preparedNodeImports.length > 0
            ? preparedNodeImports.map((entry) => entry.resolvedSpec)
            : nodeImports,
          preparedImports: preparedNodeImports,
          staticMeta: preparedNodeImports.length > 0
            ? Object.fromEntries(preparedNodeImports.map((entry) => [entry.spec.as, entry.staticMeta ?? {}]))
            : undefined
        }
      : undefined;

    const providerPlan = {
      actionScope: renderer.actionScopePolicy === 'new',
      componentRegistry: renderer.componentRegistryPolicy === 'new',
      classAliases: Boolean(classAliasesPlan)
    };

    const providerWrap = buildWrapProvidersClosure(providerPlan);

    const node: TemplateNode = {
      templateNodeId: 0,
      id: createNodeId(path, schema),
      type: schema.type,
      schema,
      templatePath: path,
      schemaUrl: (options as CompileNodeOptions & { schemaUrl?: string }).schemaUrl,
      rendererType: renderer.type,
      component: renderer,
      propsProgram,
      metaProgram,
      eventPlans,
      lifecycleActions,
      regions,
      providerPlan,
      providerWrap,
      classAliasesPlan,
      importsPlan,
      scopePlan,
      validationPlan:
        renderer.scopePolicy === 'form' || schema.type === 'page'
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

    node.staticAnalysis = computeStaticAnalysis(node, schema);

    if (schema.type === 'data-source') {
      node.compiledSources = [
        compileDataSource(node.id, schema as DataSourceSchema, expressionCompiler, {
          ...compileOptions,
          basePath: path,
        })
      ];
    }

    if (schema.type === 'reaction') {
      node.compiledReactions = [
        compileReaction(node.id, schema as ReactionSchema, expressionCompiler, {
          ...compileOptions,
          basePath: path,
        })
      ];
    }

    return node;
  }

  function validateSchemaInput(schema: SchemaInput, options: CompileSchemaOptions = {}) {
    const diagnostics = createSchemaCompilerDiagnosticsContext(options, 'validate');
    const prepared = applyBeforeCompilePlugins(schema);
    const schemaUrl = options.schemaUrl ?? '$';

    if (!isSchemaInput(prepared)) {
      diagnostics.emit({
        code: 'invalid-root',
        path: schemaPathToJsonPointer(options.basePath ?? '$'),
        message: 'Schema root must be an object or an array of schema objects.'
      });
      return diagnostics.diagnostics;
    }

    const canonicalPrepared = canonicalizeSchemaInput(prepared, {
      basePath: options.basePath ?? '$',
      schemaUrl,
      registry: input.registry,
      plugins: input.plugins,
      maxDepth: MAX_COMPILE_DEPTH
    }, diagnostics);

    try {
      compileSchemaToTemplateNodes(canonicalPrepared, {
        ...options,
        schemaUrl,
        diagnostics: {
          ...(options.diagnostics ?? {}),
          enabled: true,
          continueOnError: true,
          reporter: (issue) => diagnostics.emit(issue)
        }
      });
    } catch (_e) {
      void _e;
    }

    analyzeSchemaInput(canonicalPrepared, options.basePath ?? '$', input.registry, input.plugins, diagnostics);
    return diagnostics.diagnostics;
  }

  async function prepareSchemaInput(schema: SchemaInput, options: CompileSchemaOptions = {}) {
    return prepareSchemaImports(schema, options);
  }

  return {
    compile(schema, options) {
      const nodes = compileSchemaToTemplateNodes(schema, options);
      return {
        root: nodes,
        repeatedTemplates: new Map()
      };
    },
    async prepare(schema, options) {
      return prepareSchemaInput(schema, options);
    },
    compileNode(schema, options) {
      const diagnostics = createSchemaCompilerDiagnosticsContext({
        schemaUrl: options.schemaUrl,
        diagnostics: { enabled: false }
      }, 'compile');
      const canonicalSchema = canonicalizeSchemaInput(schema, {
        basePath: options.path,
        schemaUrl: options.schemaUrl,
        registry: input.registry,
        plugins: input.plugins,
        maxDepth: MAX_COMPILE_DEPTH
      }, diagnostics) as BaseSchema;
      return compileSingleNode(canonicalSchema, options);
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
