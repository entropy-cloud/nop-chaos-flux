import { appendJsonPointer, type SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import { isPlainObject } from '@nop-chaos/flux-core';
import { emitSchemaDiagnostic } from './shape-validation-predicates.js';

export function validateApiSchemaShape(
  value: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean,
  code: 'invalid-property-shape' | 'invalid-action-shape' | 'invalid-source-shape',
) {
  if (!isPlainObject(value)) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code,
        path,
        message: 'api must be an object.',
      },
      enabled,
    );
    return;
  }

  if (typeof value.url !== 'string' || value.url.length === 0) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code,
        path: appendJsonPointer(path, 'url'),
        message: 'api.url must be a non-empty string.',
      },
      enabled,
    );
  }
}
