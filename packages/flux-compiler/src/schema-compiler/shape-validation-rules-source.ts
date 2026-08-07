import { appendJsonPointer, type SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import { isPlainObject } from '@nop-chaos/flux-core';
import { emitSchemaDiagnostic } from './shape-validation-predicates.js';
import { validateStructuralPathField, validateDependsOnRoots } from './shape-validation-rules-structural.js';
import { validateApiSchemaShape } from './shape-validation-rules-api-schema.js';

export function validateSourceShape(
  value: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean,
) {
  if (!isPlainObject(value)) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-source-shape',
        path,
        message: 'Source values must be objects.',
      },
      enabled,
    );
    return;
  }

  const hasFormula = value.formula !== undefined;
  const hasAction = typeof value.action === 'string' && value.action.length > 0;
  const hasArgs = value.args !== undefined;

  if (!hasFormula && !hasAction && !hasArgs) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-source-shape',
        path,
        message: 'Source values require formula, action, or args.',
      },
      enabled,
    );
  }

  if (value.action !== undefined && typeof value.action !== 'string') {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-source-shape',
        path: appendJsonPointer(path, 'action'),
        message: 'Source action must be a string when provided.',
      },
      enabled,
    );
  }

  validateStructuralPathField({
    value: value.name,
    path: appendJsonPointer(path, 'name'),
    field: 'name',
    diagnostics,
    enabled,
    code: 'invalid-source-shape',
  });

  validateStructuralPathField({
    value: value.statusPath,
    path: appendJsonPointer(path, 'statusPath'),
    field: 'statusPath',
    diagnostics,
    enabled,
    code: 'invalid-source-shape',
  });

  if (hasArgs) {
    validateApiSchemaShape(
      value.args,
      appendJsonPointer(path, 'args'),
      diagnostics,
      enabled,
      'invalid-source-shape',
    );
  }

  validateDependsOnRoots(
    value.dependsOn,
    appendJsonPointer(path, 'dependsOn'),
    diagnostics,
    enabled,
    'invalid-source-shape',
  );
}
