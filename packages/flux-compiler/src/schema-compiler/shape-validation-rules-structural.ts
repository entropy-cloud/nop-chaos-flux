import { appendJsonPointer, type SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import { normalizeRootPath } from '@nop-chaos/flux-core';
import { emitSchemaDiagnostic, isDynamicStructuralPath } from './shape-validation-predicates.js';

export function validateStructuralPathField(input: {
  value: unknown;
  path: string;
  field: 'name' | 'statusPath';
  diagnostics: SchemaCompilerDiagnosticsContext;
  enabled: boolean;
  code: 'invalid-property-shape' | 'invalid-source-shape';
}) {
  if (input.value === undefined) {
    return;
  }

  if (typeof input.value !== 'string' || input.value.length === 0) {
    emitSchemaDiagnostic(
      input.diagnostics,
      {
        code: input.code,
        path: input.path,
        message: `${input.field} must be a non-empty structural path string.`,
      },
      input.enabled,
    );
    return;
  }

  if (isDynamicStructuralPath(input.value)) {
    emitSchemaDiagnostic(
      input.diagnostics,
      {
        code: input.code,
        path: input.path,
        message: `${input.field} must be a static structural path string. Dynamic expressions and templates are not supported.`,
      },
      input.enabled,
    );
  }
}

export function validateDependsOnRoots(
  value: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean,
  code: 'invalid-property-shape' | 'invalid-source-shape' = 'invalid-property-shape',
) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code,
        path,
        message: 'dependsOn must be an array of lexical root strings.',
      },
      enabled,
    );
    return;
  }

  value.forEach((entry, index) => {
    const itemPath = appendJsonPointer(path, index);

    if (typeof entry !== 'string' || entry.length === 0) {
      emitSchemaDiagnostic(
        diagnostics,
        {
          code,
          path: itemPath,
          message: 'dependsOn entries must be non-empty strings.',
        },
        enabled,
      );
      return;
    }

    if (normalizeRootPath(entry) !== entry) {
      emitSchemaDiagnostic(
        diagnostics,
        {
          code,
          path: itemPath,
          message: 'dependsOn entries must use lexical root bindings, not deep member paths.',
        },
        enabled,
      );
    }
  });
}
