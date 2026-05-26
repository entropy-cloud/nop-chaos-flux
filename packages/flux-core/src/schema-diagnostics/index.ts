import type { BaseSchema, SchemaPath } from '../types/schema.js';
import type {
  RendererAuthoringTransformContextLike,
  SchemaDiagnostic,
  SchemaDiagnosticCollector,
  RendererSchemaValidationContextLike,
} from '../types/schema-diagnostics-types.js';
export type {
  SchemaDiagnosticSeverity,
  SchemaDiagnosticSource,
  SchemaDiagnosticCode,
  SchemaDiagnosticSourceLocation,
  SchemaDiagnostic,
  SchemaDiagnosticCollector,
  SchemaDiagnosticReporter,
  SchemaCompileDiagnosticsOptions,
} from '../types/schema-diagnostics-types.js';
export type {
  SchemaCompileValidationOptions,
  SchemaNamespaceValidationContext,
  SchemaNamespaceValidator,
} from '../types/schema-validation-types.js';

export interface RendererSchemaValidationContext<S extends BaseSchema = BaseSchema>
  extends RendererSchemaValidationContextLike<S> {
  path: SchemaPath;
}

export interface RendererAuthoringTransformContext<S extends BaseSchema = BaseSchema>
  extends RendererAuthoringTransformContextLike<S> {
  path: SchemaPath;
}

export type RendererSchemaValidator<S extends BaseSchema = BaseSchema> = (
  context: RendererSchemaValidationContext<S>,
) => void;
export type RendererAuthoringTransform<S extends BaseSchema = BaseSchema> = (
  context: RendererAuthoringTransformContext<S>,
) => S;

export function createSchemaDiagnosticCollector() {
  const diagnostics: SchemaDiagnostic[] = [];

  return {
    collector: {
      add(issue: SchemaDiagnostic) {
        diagnostics.push(issue);
      },
    } satisfies SchemaDiagnosticCollector,
    diagnostics,
  };
}

export * from './manifest.js';
export * from './value-shape-runtime.js';
