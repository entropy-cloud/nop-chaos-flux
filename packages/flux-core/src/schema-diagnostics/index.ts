import type { BaseSchema, SchemaPath } from '../types/schema';

export type SchemaDiagnosticSeverity = 'error' | 'warning' | 'info';
export type SchemaDiagnosticSource = 'core' | 'renderer' | 'namespace';
export type SchemaDiagnosticCode =
  | 'invalid-root'
  | 'expected-object'
  | 'missing-required-field'
  | 'unknown-renderer-type'
  | 'unknown-property'
  | 'invalid-property-shape'
  | 'invalid-region-node'
  | 'invalid-action-shape'
  | 'invalid-source-shape'
  | 'invalid-namespace-property';

export interface SchemaDiagnostic {
  code: SchemaDiagnosticCode;
  path: string;
  message: string;
  severity: SchemaDiagnosticSeverity;
  source: SchemaDiagnosticSource;
}

export interface SchemaDiagnosticCollector {
  add(issue: SchemaDiagnostic): void;
}

export type SchemaDiagnosticReporter = (issue: SchemaDiagnostic) => void;

export interface SchemaCompileDiagnosticsOptions {
  enabled?: boolean;
  continueOnError?: boolean;
  maxIssues?: number;
  reporter?: SchemaDiagnosticReporter;
  collector?: SchemaDiagnosticCollector;
}

export interface SchemaNamespaceValidationContext {
  namespace: string;
  key: string;
  value: unknown;
  path: string;
  add(issue: {
    code: SchemaDiagnosticCode;
    message: string;
    path?: string;
    severity?: SchemaDiagnosticSeverity;
    source?: SchemaDiagnosticSource;
  }): void;
}

export interface SchemaNamespaceValidator {
  namespace: string;
  validate(context: SchemaNamespaceValidationContext): void;
}

export interface SchemaCompileValidationOptions {
  unknownBarePropertyPolicy?: 'ignore' | 'warn' | 'error';
  namespacedPropertyPolicy?: 'error' | 'ignore' | 'delegate-or-ignore';
  extensionPassthroughPolicy?: 'none' | 'namespaced-only';
  namespaceValidators?: readonly SchemaNamespaceValidator[];
}

export interface RendererSchemaValidationContext<S extends BaseSchema = BaseSchema> {
  schema: S;
  path: SchemaPath;
  emit(issue: {
    code: SchemaDiagnosticCode;
    message: string;
    path?: string;
    severity?: SchemaDiagnosticSeverity;
    source?: SchemaDiagnosticSource;
  }): void;
}

export type RendererSchemaValidator<S extends BaseSchema = BaseSchema> = (context: RendererSchemaValidationContext<S>) => void;

export function createSchemaDiagnosticCollector() {
  const diagnostics: SchemaDiagnostic[] = [];

  return {
    collector: {
      add(issue: SchemaDiagnostic) {
        diagnostics.push(issue);
      }
    } satisfies SchemaDiagnosticCollector,
    diagnostics
  };
}