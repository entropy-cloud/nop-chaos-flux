import type { HostContractContext } from '../schema-diagnostics/manifest.js';

export interface SchemaNamespaceValidationContext {
  namespace: string;
  key: string;
  value: unknown;
  path: string;
  add(issue: {
    code: import('./schema-diagnostics-types.js').SchemaDiagnosticCode;
    message: string;
    path?: string;
    severity?: import('./schema-diagnostics-types.js').SchemaDiagnosticSeverity;
    source?: import('./schema-diagnostics-types.js').SchemaDiagnosticSource;
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
  strictMode?: boolean;
}
