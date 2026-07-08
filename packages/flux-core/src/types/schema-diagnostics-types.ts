export type SchemaDiagnosticSeverity = 'error' | 'warning' | 'info';
export type SchemaDiagnosticSource = 'core' | 'renderer' | 'namespace' | 'host-contract';
export type SchemaDiagnosticCode =
  | 'invalid-root'
  | 'expected-object'
  | 'missing-required-field'
  | 'unknown-renderer-type'
  | 'duplicate-schema-id'
  | 'unknown-property'
  | 'invalid-property-value'
  | 'invalid-property-shape'
  | 'invalid-region-node'
  | 'invalid-action-shape'
  | 'builtin-action-alias'
  | 'unresolved-action-selector'
  | 'unvalidated-component-target'
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
  | 'unhandled-compilation-error'
  | 'invalid-reaction-deps'
  | 'invalid-reaction-deep-path'
  | 'invalid-reaction-immediate';

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
  cause?: unknown;
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

export interface RendererSchemaValidationContextLike<S = unknown> {
  schema: S;
  path: string;
  emit(issue: {
    code: SchemaDiagnosticCode;
    message: string;
    path?: string;
    severity?: SchemaDiagnosticSeverity;
    source?: SchemaDiagnosticSource;
  }): void;
}

export interface RendererAuthoringTransformContextLike<S = unknown> {
  schema: S;
  path: string;
  schemaUrl?: string;
  emit(issue: {
    code: SchemaDiagnosticCode;
    message: string;
    path?: string;
    severity?: SchemaDiagnosticSeverity;
    source?: SchemaDiagnosticSource;
  }): void;
}
