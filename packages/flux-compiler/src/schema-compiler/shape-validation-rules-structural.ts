import { appendJsonPointer, type SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import { normalizeRootPath, type SchemaDiagnosticCode, type SchemaDiagnosticSeverity } from '@nop-chaos/flux-core';
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
  validateRootPathArray({
    value,
    path,
    diagnostics,
    enabled,
    codes: { shape: code, entry: code, deepPath: code },
    notArrayMessage: 'dependsOn must be an array of lexical root strings.',
    entryInvalidMessage: 'dependsOn entries must be non-empty strings.',
    deepPathMessage: 'dependsOn entries must use lexical root bindings, not deep member paths.',
  });
}

/**
 * Shared "array of root-level scope paths" validation used by structural
 * dependsOn fields and the reaction-field dependsOn/ignoreWritesTo pair.
 * Single fact source for: array shape check, per-entry non-empty-string check,
 * and the deep-path fold warning. Callers pin the codes, messages, and
 * severities so each rule keeps its diagnostic contract verbatim.
 */
export function validateRootPathArray(input: {
  value: unknown;
  path: string;
  diagnostics: SchemaCompilerDiagnosticsContext;
  enabled: boolean;
  codes: { shape: SchemaDiagnosticCode; entry: SchemaDiagnosticCode; deepPath: SchemaDiagnosticCode };
  severities?: {
    shape?: SchemaDiagnosticSeverity;
    entry?: SchemaDiagnosticSeverity;
    deepPath?: SchemaDiagnosticSeverity;
  };
  required?: boolean;
  requiredMessage?: string;
  notArrayMessage?: string;
  entryInvalidMessage: string;
  deepPathMessage: string | ((entry: string, root: string) => string);
}) {
  const { value, path, diagnostics, enabled, codes } = input;
  const severityFor = (key: 'shape' | 'entry' | 'deepPath'): { severity?: SchemaDiagnosticSeverity } => {
    const severity = input.severities?.[key];
    return severity ? { severity } : {};
  };
  const deepPathMessage = (entry: string, root: string): string =>
    typeof input.deepPathMessage === 'function' ? input.deepPathMessage(entry, root) : input.deepPathMessage;

  if (value === undefined) {
    if (input.required) {
      emitSchemaDiagnostic(
        diagnostics,
        {
          code: codes.shape,
          path,
          message: input.requiredMessage ?? `${input.notArrayMessage ?? ''}`,
          ...severityFor('shape'),
        },
        enabled,
      );
    }
    return;
  }

  if (!Array.isArray(value) || (input.required && value.length === 0)) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: codes.shape,
        path,
        message: Array.isArray(value)
          ? (input.requiredMessage ?? input.notArrayMessage ?? '')
          : (input.notArrayMessage ?? input.requiredMessage ?? ''),
        ...severityFor('shape'),
      },
      enabled,
    );
    return;
  }

  value.forEach((entry: unknown, index: number) => {
    const itemPath = appendJsonPointer(path, index);

    if (typeof entry !== 'string' || entry.length === 0) {
      emitSchemaDiagnostic(
        diagnostics,
        {
          code: codes.entry,
          path: itemPath,
          message: input.entryInvalidMessage,
          ...severityFor('entry'),
        },
        enabled,
      );
      return;
    }

    if (normalizeRootPath(entry) !== entry) {
      emitSchemaDiagnostic(
        diagnostics,
        {
          code: codes.deepPath,
          path: itemPath,
          message: deepPathMessage(entry, normalizeRootPath(entry) ?? entry),
          ...severityFor('deepPath'),
        },
        enabled,
      );
    }
  });
}
