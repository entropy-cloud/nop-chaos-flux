import type { BaseSchema, SchemaPath } from '../types/schema';
import type { HostContractContext } from './manifest';

export type SchemaDiagnosticSeverity = 'error' | 'warning' | 'info';
export type SchemaDiagnosticSource = 'core' | 'renderer' | 'namespace' | 'host-contract';
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
  | 'invalid-namespace-property'
  | 'unknown-host-contract-family'
  | 'unsupported-host-contract-version'
  | 'unresolved-host-contract-context'
  | 'unknown-host-projection-field'
  | 'invalid-host-projection-path'
  | 'unknown-host-capability-method'
  | 'invalid-host-capability-args'
  | 'host-contract-version-mismatch'
  | 'unknown-import-alias'
  | 'import-preload-failed'
  | 'missing-import-static-meta'
  | 'unknown-import-member'
  | 'invalid-import-function-args'
  | 'unknown-slot-param'
  | 'slot-used-outside-region'
  | 'unknown-builtin-member'
  | 'ambient-dollar-reference'
  | 'unhandled-compilation-error';

export interface SchemaDiagnosticSourceLocation {
  readonly file?: string;
  readonly line?: number;
  readonly column?: number;
}

export interface SchemaDiagnostic {
  code: SchemaDiagnosticCode;
  path: string;
  message: string;
  severity: SchemaDiagnosticSeverity;
  source: SchemaDiagnosticSource;
  sourceLocation?: SchemaDiagnosticSourceLocation;
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
  hostContractContext?: HostContractContext;
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

export interface RendererAuthoringTransformContext<S extends BaseSchema = BaseSchema> {
  schema: S;
  path: SchemaPath;
  schemaUrl?: string;
  emit(issue: {
    code: SchemaDiagnosticCode;
    message: string;
    path?: string;
    severity?: SchemaDiagnosticSeverity;
    source?: SchemaDiagnosticSource;
  }): void;
}

export type RendererSchemaValidator<S extends BaseSchema = BaseSchema> = (context: RendererSchemaValidationContext<S>) => void;
export type RendererAuthoringTransform<S extends BaseSchema = BaseSchema> = (context: RendererAuthoringTransformContext<S>) => S;

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

export * from './manifest';
