import { appendJsonPointer, type SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import { isPlainObject, normalizeRootPath } from '@nop-chaos/flux-core';
import { validateHostAction, type HostActionValidationContext } from './host-action-validation.js';
import { classifyActionSelector, validateActionSelector } from './action-selector-validation.js';

export interface ActionValidationContext {
  hostContext?: HostActionValidationContext;
  symbolTable?: import('@nop-chaos/flux-core').CompileSymbolTable;
  visibleImports?: ReadonlyMap<string, import('@nop-chaos/flux-core').PreparedImportSpec | undefined>;
  componentTargets?: ReadonlyMap<
    string,
    import('./shape-validation-traversal.js').ComponentTargetContractResolution
  >;
  strictMode?: boolean;
}

function isDynamicStructuralPath(value: string): boolean {
  return value.includes('${') || value.includes('$@{');
}

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
  actionContext?: ActionValidationContext,
) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      validateActionShape(entry, appendJsonPointer(path, index), diagnostics, enabled, actionContext);
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
  } else {
    const resolution = classifyActionSelector({
      action: value.action,
      actionValue: value,
      symbolTable: actionContext?.symbolTable,
      visibleImports: actionContext?.visibleImports,
      hostContext: actionContext?.hostContext,
      componentTargets: actionContext?.componentTargets,
    });

    validateActionSelector({
      resolution,
      path,
      diagnostics,
      enabled,
      strictMode: actionContext?.strictMode,
      args: value.args,
    });

    if (enabled && actionContext?.hostContext && resolution.class === 'host-namespaced') {
      validateHostAction(value.action, value.args, path, diagnostics, actionContext.hostContext);
    }
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

  if (value.action === 'ajax') {
    if (value.args === undefined) {
      emitSchemaDiagnostic(
        diagnostics,
        {
          code: 'invalid-action-shape',
          path: appendJsonPointer(path, 'args'),
          message: 'ajax actions require args payload.',
        },
        enabled,
      );
    } else {
      validateApiSchemaShape(
        value.args,
        appendJsonPointer(path, 'args'),
        diagnostics,
        enabled,
        'invalid-action-shape',
      );
    }
  }

  if (value.when !== undefined && typeof value.when !== 'boolean' && typeof value.when !== 'string') {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-action-shape',
        path: appendJsonPointer(path, 'when'),
        message: 'Action when must be a boolean or expression string when provided.',
      },
      enabled,
    );
  }

  if (
    value.preventDefault !== undefined &&
    typeof value.preventDefault !== 'boolean' &&
    typeof value.preventDefault !== 'string'
  ) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-action-shape',
        path: appendJsonPointer(path, 'preventDefault'),
        message: 'Action preventDefault must be a boolean or expression string when provided.',
      },
      enabled,
    );
  }

  if (
    value.stopPropagation !== undefined &&
    typeof value.stopPropagation !== 'boolean' &&
    typeof value.stopPropagation !== 'string'
  ) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-action-shape',
        path: appendJsonPointer(path, 'stopPropagation'),
        message: 'Action stopPropagation must be a boolean or expression string when provided.',
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
        actionContext,
      );
  }

  if (value.then !== undefined) {
      validateActionShape(
        value.then,
        appendJsonPointer(path, 'then'),
        diagnostics,
        enabled,
        actionContext,
      );
  }

  if (value.onError !== undefined) {
      validateActionShape(
        value.onError,
        appendJsonPointer(path, 'onError'),
        diagnostics,
        enabled,
        actionContext,
      );
  }

  if (value.onSettled !== undefined) {
      validateActionShape(
        value.onSettled,
        appendJsonPointer(path, 'onSettled'),
        diagnostics,
        enabled,
        actionContext,
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

export function validateReactionShape(
  value: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean,
  actionContext?: ActionValidationContext,
) {
  if (!isPlainObject(value)) {
    return;
  }

  if (value.watch === undefined) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-property-shape',
        path: appendJsonPointer(path, 'watch'),
        message: 'reaction.watch is required.',
      },
      enabled,
    );
  } else if (
    typeof value.watch !== 'string' &&
    !(Array.isArray(value.watch) && value.watch.every((entry) => typeof entry === 'string'))
  ) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-property-shape',
        path: appendJsonPointer(path, 'watch'),
        message: 'reaction.watch must be a string or array of strings.',
      },
      enabled,
    );
  }

  if (value.immediate !== undefined && typeof value.immediate !== 'boolean') {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-property-shape',
        path: appendJsonPointer(path, 'immediate'),
        message: 'reaction.immediate must be a boolean when provided.',
      },
      enabled,
    );
  }

  if (value.debounce !== undefined && typeof value.debounce !== 'number') {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-property-shape',
        path: appendJsonPointer(path, 'debounce'),
        message: 'reaction.debounce must be a number when provided.',
      },
      enabled,
    );
  }

  if (value.once !== undefined && typeof value.once !== 'boolean') {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-property-shape',
        path: appendJsonPointer(path, 'once'),
        message: 'reaction.once must be a boolean when provided.',
      },
      enabled,
    );
  }

  validateDependsOnRoots(
    value.dependsOn,
    appendJsonPointer(path, 'dependsOn'),
    diagnostics,
    enabled,
  );

  validateActionShape(value.actions, appendJsonPointer(path, 'actions'), diagnostics, enabled, actionContext);
}
