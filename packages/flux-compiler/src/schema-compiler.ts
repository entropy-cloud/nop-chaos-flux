import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import type {
  BaseSchema,
  CompileSchemaOptions,
  CompiledTemplate,
  ExpressionCompiler,
  RendererPlugin,
  RendererRegistry,
  SchemaCompiler,
  SchemaInput,
  TemplateNode,
} from '@nop-chaos/flux-core';
import {
  createCompilerPluginAppliers,
  MAX_COMPILE_DEPTH,
  prepareSchemaImports,
  prepareSchemaRoot,
} from './schema-compiler-helpers.js';
import { canonicalizeSchemaInput } from './schema-compiler/authoring-transform.js';
import {
  applyWrapComponentPlugins,
  analyzeSchemaInput,
} from './schema-compiler/shape-validation.js';
import { enrichTemplateNodeIds } from './schema-compiler/target-enrichment.js';
import {
  createSchemaCompilerDiagnosticsContext,
} from './schema-compiler/diagnostics.js';
import { createBaseCompileSymbolTable } from './compile-symbol-table.js';
import { createCompileSingleNode } from './schema-compiler/node-compiler.js';
import { createValidateSchemaInput } from './schema-compiler/validation-compiler.js';

export function createSchemaCompiler(input: {
  registry: RendererRegistry;
  expressionCompiler?: ExpressionCompiler;
  plugins?: RendererPlugin[];
  defaultCidState?: import('@nop-chaos/flux-core').CompiledCidState;
}): SchemaCompiler {
  const expressionCompiler =
    input.expressionCompiler ?? createExpressionCompiler(createFormulaCompiler());
  const { applyBeforeCompilePlugins, applyAfterCompilePlugins } = createCompilerPluginAppliers(
    input.plugins,
  );

  function shouldFailOnSchemaDiagnostics(): boolean {
    const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
      ?.env;
    const globalRecord = globalThis as Record<string, unknown>;

    return (
      processEnv?.__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__ === 'true' ||
      processEnv?.VITEST === 'true' ||
      processEnv?.PLAYWRIGHT === 'true' ||
      globalRecord.__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__ === true
    );
  }

  function throwIfSchemaDiagnosticsFailed(options: CompileSchemaOptions | undefined, diagnostics: ReturnType<typeof createSchemaCompilerDiagnosticsContext>) {
    if (!diagnostics.enabled || diagnostics.continueOnError || !shouldFailOnSchemaDiagnostics()) {
      return;
    }

    const errorDiagnostics = diagnostics.diagnostics.filter((issue) => issue.severity === 'error');
    if (errorDiagnostics.length === 0) {
      return;
    }

    const first = errorDiagnostics[0];
    const location = first.sourceLocation?.file ? `${first.sourceLocation.file} ` : '';
    throw new Error(
      `Schema compile diagnostics failed: ${location}${first.path} ${first.code} ${first.message}`.trim(),
      {
        cause: errorDiagnostics,
      },
    );
  }

  function compileSchemaToTemplateNodes(
    schema: SchemaInput,
    options: CompileSchemaOptions = {},
    depth = 0,
  ): TemplateNode | TemplateNode[] {
    if (depth > MAX_COMPILE_DEPTH) {
      throw new Error(
        `Schema compilation exceeded maximum nesting depth (${MAX_COMPILE_DEPTH}). Check for circular region references or overly deep nesting at path: ${options.basePath ?? '$'}`,
      );
    }

    const prepared = applyBeforeCompilePlugins(schema);
    const symbolTable = options.symbolTable ?? createBaseCompileSymbolTable();
    const { diagnostics, cidState, canonicalPrepared } = prepareSchemaRoot({
      schema: prepared,
      options: {
        ...options,
        cidState: options.cidState ?? input.defaultCidState,
      },
      registry: input.registry,
      plugins: input.plugins,
    });

    if (diagnostics.enabled) {
      analyzeSchemaInput(
        canonicalPrepared,
        options.basePath ?? '$',
        input.registry,
        input.plugins,
        diagnostics,
      );
    }

    const compileSingleNode = createCompileSingleNode(expressionCompiler, compileSchemaToTemplateNodes);

    if (Array.isArray(canonicalPrepared)) {
      const compiled = canonicalPrepared
        .map((item, index) => {
          const path = options.basePath ? `${options.basePath}[${index}]` : `$[${index}]`;
          const renderer = input.registry.get(item.type);

          if (!renderer) {
            if (diagnostics.enabled && diagnostics.continueOnError) {
              return undefined;
            }

            throw new Error(`Renderer not found for type: ${item.type}`);
          }

          const wrappedRenderer = applyWrapComponentPlugins(renderer, input.plugins);

          return compileSingleNode(
            item,
            {
              path,
              parentPath: options.parentPath,
              schemaUrl: options.schemaUrl,
              symbolTable,
              preparedImports: options.preparedImports,
              renderer: wrappedRenderer,
            },
            diagnostics,
            depth,
          );
        })
        .filter((node): node is TemplateNode => node != null);

      const nodes = enrichTemplateNodeIds(compiled, cidState, diagnostics);
      const template: CompiledTemplate = applyAfterCompilePlugins({
        root: nodes,
        repeatedTemplates: new Map(),
      });
      throwIfSchemaDiagnosticsFailed(options, diagnostics);
      return Array.isArray(template.root)
        ? (template.root as TemplateNode[])
        : ([template.root] as TemplateNode[]);
    }

    const path = options.basePath ?? '$';
    const renderer = input.registry.get(canonicalPrepared.type);

    if (!renderer) {
      if (diagnostics.enabled && diagnostics.continueOnError) {
        return [];
      }

      throw new Error(`Renderer not found for type: ${canonicalPrepared.type}`);
    }

    const wrappedRenderer = applyWrapComponentPlugins(renderer, input.plugins);

    const node = enrichTemplateNodeIds(
      compileSingleNode(
        canonicalPrepared,
        {
          path,
          parentPath: options.parentPath,
          schemaUrl: options.schemaUrl,
          symbolTable,
          preparedImports: options.preparedImports,
          renderer: wrappedRenderer,
        },
        diagnostics,
        depth,
      ),
      cidState,
      diagnostics,
    );

    const template: CompiledTemplate = applyAfterCompilePlugins({
      root: node,
      repeatedTemplates: new Map(),
    });
    throwIfSchemaDiagnosticsFailed(options, diagnostics);
    return template.root as TemplateNode | TemplateNode[];
  }

  const validateSchemaInput = createValidateSchemaInput(
    input.registry,
    input.plugins,
    compileSchemaToTemplateNodes,
  );

  async function prepareSchemaInput(schema: SchemaInput, options: CompileSchemaOptions = {}) {
    return prepareSchemaImports(schema, options);
  }

  const compileSingleNodeForExternal = createCompileSingleNode(
    expressionCompiler,
    compileSchemaToTemplateNodes,
  );

  return {
    compile(schema, options) {
      const nodes = compileSchemaToTemplateNodes(schema, options);
      return {
        root: nodes,
        repeatedTemplates: new Map(),
      };
    },
    async prepare(schema, options) {
      return prepareSchemaInput(schema, options);
    },
    compileNode(schema, options) {
      const diagnostics = createSchemaCompilerDiagnosticsContext(
        {
          schemaUrl: options.schemaUrl,
          diagnostics: { enabled: options?.diagnostics?.enabled ?? false },
        },
        'compile',
        options.schemaUrl,
      );
      const canonicalSchema = canonicalizeSchemaInput(
        schema,
        {
          basePath: options.path,
          schemaUrl: options.schemaUrl,
          registry: input.registry,
          plugins: input.plugins,
          maxDepth: MAX_COMPILE_DEPTH,
        },
        diagnostics,
      ) as BaseSchema;

      const renderer = input.registry.get(canonicalSchema.type);
      if (!renderer) {
        throw new Error(`Renderer not found for type: ${canonicalSchema.type}`);
      }

      const wrappedRenderer = applyWrapComponentPlugins(renderer, input.plugins);

      return compileSingleNodeForExternal(
        canonicalSchema,
        { ...options, renderer: wrappedRenderer },
        diagnostics,
        0,
      );
    },
    validate(schema, options) {
      return validateSchemaInput(schema, options ?? {});
    },
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
    plugins: input.plugins,
  });

  return compiler.validate?.(input.schema, input.options) ?? [];
}
