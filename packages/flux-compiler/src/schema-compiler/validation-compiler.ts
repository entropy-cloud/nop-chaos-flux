import type {
  CompileSchemaOptions,
  RendererPlugin,
  RendererRegistry,
  SchemaDiagnostic,
  SchemaInput,
} from '@nop-chaos/flux-core';
import { isSchemaInput } from '@nop-chaos/flux-core';
import { MAX_COMPILE_DEPTH } from '../schema-compiler-helpers.js';
import { canonicalizeSchemaInput } from './authoring-transform.js';
import { analyzeSchemaInput } from './shape-validation.js';
import {
  createSchemaCompilerDiagnosticsContext,
  schemaPathToJsonPointer,
} from './diagnostics.js';
import type { CompileSchemaToTemplateNodesFn } from './node-compiler.js';

export type ValidateSchemaInputFn = (
  schema: SchemaInput,
  options: CompileSchemaOptions,
) => SchemaDiagnostic[];

export function createValidateSchemaInput(
  registry: RendererRegistry,
  plugins: RendererPlugin[] | undefined,
  applyBeforeCompilePlugins: (schema: SchemaInput) => SchemaInput,
  compileSchemaToTemplateNodes: CompileSchemaToTemplateNodesFn,
): ValidateSchemaInputFn {
  return function validateSchemaInput(schema: SchemaInput, options: CompileSchemaOptions = {}) {
    const diagnostics = createSchemaCompilerDiagnosticsContext(
      options,
      'validate',
      options.schemaUrl,
    );
    const prepared = applyBeforeCompilePlugins(schema);
    const schemaUrl = options.schemaUrl ?? '$';

    if (!isSchemaInput(prepared)) {
      diagnostics.emit({
        code: 'invalid-root',
        path: schemaPathToJsonPointer(options.basePath ?? '$'),
        message: 'Schema root must be an object or an array of schema objects.',
      });
      return diagnostics.diagnostics;
    }

    const canonicalPrepared = canonicalizeSchemaInput(
      prepared,
      {
        basePath: options.basePath ?? '$',
        schemaUrl,
        registry,
        plugins,
        maxDepth: MAX_COMPILE_DEPTH,
      },
      diagnostics,
    );

    try {
      compileSchemaToTemplateNodes(canonicalPrepared, {
        ...options,
        schemaUrl,
        diagnostics: {
          ...(options.diagnostics ?? {}),
          enabled: true,
          continueOnError: true,
          reporter: (issue) => diagnostics.emit(issue),
        },
      }, 0);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      diagnostics.emit({
        code: 'unhandled-compilation-error',
        path: schemaPathToJsonPointer(options.basePath ?? '$'),
        message,
        severity: 'error',
        source: 'core',
      });
    }

    analyzeSchemaInput(
      canonicalPrepared,
      options.basePath ?? '$',
      registry,
      plugins,
      diagnostics,
    );
    return diagnostics.diagnostics;
  };
}
