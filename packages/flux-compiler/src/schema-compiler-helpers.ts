import { createCompiledCidState, isSchemaInput, type CompiledTemplate, type CompileSchemaOptions, type PreparedImportSpec, type RendererPlugin, type RendererRegistry, type SchemaInput, type XuiImportSpec } from '@nop-chaos/flux-core';
import { createSchemaCompilerDiagnosticsContext, schemaPathToJsonPointer } from './schema-compiler/diagnostics';
import { canonicalizeSchemaInput } from './schema-compiler/authoring-transform';
import { collectSchemaImportSpecs, normalizeImportSpecKey } from './schema-compiler/symbol-helpers';

export const MAX_COMPILE_DEPTH = 64;

export function createCompilerPluginAppliers(plugins?: RendererPlugin[]) {
  function applyBeforeCompilePlugins(schema: SchemaInput): SchemaInput {
    return (plugins ?? []).reduce((current, plugin) => plugin.beforeCompile?.(current) ?? current, schema);
  }

  function applyAfterCompilePlugins(template: CompiledTemplate): CompiledTemplate {
    return (plugins ?? []).reduce((current, plugin) => plugin.afterCompile?.(current) ?? current, template);
  }

  return {
    applyBeforeCompilePlugins,
    applyAfterCompilePlugins
  };
}

export function prepareSchemaRoot(args: {
  schema: SchemaInput;
  options: CompileSchemaOptions;
  registry: RendererRegistry;
  plugins?: RendererPlugin[];
}) {
  const prepared = args.schema;
  const diagnostics = createSchemaCompilerDiagnosticsContext(args.options, 'compile');
  const cidState = args.options.cidState ?? createCompiledCidState();

  if (!isSchemaInput(prepared)) {
    diagnostics.emit({
      code: 'invalid-root',
      path: schemaPathToJsonPointer(args.options.basePath ?? '$'),
      message: 'Schema root must be an object or an array of schema objects.'
    });
    throw new Error('Invalid schema root');
  }

  const canonicalPrepared = canonicalizeSchemaInput(prepared, {
    basePath: args.options.basePath ?? '$',
    schemaUrl: args.options.schemaUrl,
    registry: args.registry,
    plugins: args.plugins,
    maxDepth: MAX_COMPILE_DEPTH
  }, diagnostics);

  return {
    diagnostics,
    cidState,
    canonicalPrepared
  };
}

export async function prepareSchemaImports(schema: SchemaInput, options: CompileSchemaOptions = {}) {
  const schemaUrl = options.schemaUrl ?? '$inline';
  const imports = collectSchemaImportSpecs(schema, schemaUrl);
  const preparedImports = new Map<string, PreparedImportSpec>();

  if (imports.length === 0) {
    return {
      schema,
      preparedImports
    };
  }

  const resolveImportUrl = (options as CompileSchemaOptions & {
    resolveImportUrl?: (schemaUrl: string, from: string, options?: Record<string, unknown>) => string;
  }).resolveImportUrl;

  for (const spec of imports) {
    const resolvedSpec: XuiImportSpec = {
      ...spec,
      from: resolveImportUrl?.(schemaUrl, spec.from, spec.options) ?? spec.from
    };

    preparedImports.set(normalizeImportSpecKey(schemaUrl, spec), {
      schemaUrl,
      spec,
      resolvedSpec
    });
  }

  return {
    schema,
    preparedImports
  };
}
