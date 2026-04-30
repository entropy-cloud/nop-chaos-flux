import { appendJsonPointer, type SchemaCompilerDiagnosticsContext } from './diagnostics';
import { isPlainObject, normalizeRootPath } from '@nop-chaos/flux-core';
import { validateHostAction, type HostActionValidationContext } from './host-action-validation';

export function emitSchemaDiagnostic(
  diagnostics: SchemaCompilerDiagnosticsContext,
  issue: {
    code: Parameters<SchemaCompilerDiagnosticsContext['emit']>[0]['code'];
    message: string;
    path: string;
    severity?: Parameters<SchemaCompilerDiagnosticsContext['emit']>[0]['severity'];
    source?: Parameters<SchemaCompilerDiagnosticsContext['emit']>[0]['source'];
  },
  enabled: boolean,
) {
  if (!enabled) {
    return;
  }

  diagnostics.emit(issue);
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

export function validateActionShape(
  value: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean,
  hostContext?: HostActionValidationContext,
) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      validateActionShape(entry, appendJsonPointer(path, index), diagnostics, enabled, hostContext);
    });
    return;
  }

  if (!isPlainObject(value)) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-action-shape',
        path,
        message: 'Action entries must be objects.',
      },
      enabled,
    );
    return;
  }

  if (typeof value.action !== 'string' || value.action.length === 0) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-action-shape',
        path: appendJsonPointer(path, 'action'),
        message: 'Action objects require a non-empty action field.',
      },
      enabled,
    );
  } else if (enabled && hostContext) {
    validateHostAction(value.action, value.args, path, diagnostics, hostContext);
  }

  if (value.args !== undefined && !isPlainObject(value.args)) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-action-shape',
        path: appendJsonPointer(path, 'args'),
        message: 'Action args must be an object when provided.',
      },
      enabled,
    );
  }

  if (value.parallel !== undefined && !Array.isArray(value.parallel)) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-action-shape',
        path: appendJsonPointer(path, 'parallel'),
        message: 'Action parallel must be an array when provided.',
      },
      enabled,
    );
  } else if (Array.isArray(value.parallel)) {
    validateActionShape(
      value.parallel,
      appendJsonPointer(path, 'parallel'),
      diagnostics,
      enabled,
      hostContext,
    );
  }

  if (value.then !== undefined) {
    validateActionShape(
      value.then,
      appendJsonPointer(path, 'then'),
      diagnostics,
      enabled,
      hostContext,
    );
  }

  if (value.onError !== undefined) {
    validateActionShape(
      value.onError,
      appendJsonPointer(path, 'onError'),
      diagnostics,
      enabled,
      hostContext,
    );
  }
}

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
