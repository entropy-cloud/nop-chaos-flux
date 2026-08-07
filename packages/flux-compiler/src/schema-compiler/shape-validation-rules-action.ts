import { appendJsonPointer, type SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import { getBuiltInActionDefinition, isPlainObject } from '@nop-chaos/flux-core';
import type { BuiltInActionDefinition, FluxSchemaDefinitionShape } from '@nop-chaos/flux-core';
import { validateHostAction } from './host-action-validation.js';
import { classifyActionSelector, validateActionSelector } from './action-selector-validation.js';
import { validateFluxValueShape } from './flux-value-shape-validation.js';
import { emitSchemaDiagnostic, type ActionValidationContext } from './shape-validation-predicates.js';

export type { ActionValidationContext };

/**
 * Definition-driven built-in action args validation.
 *
 * Consumes the per-action definition table (`BUILT_IN_ACTION_DEFINITIONS`):
 * - `argsRequired` definitions emit the missing-args diagnostic (Plan 3
 *   migrated ajax semantics: 'ajax actions require args payload');
 * - non-object args fall through to the generic `Action args must be an
 *   object when provided` check in `validateActionShape` (single emission);
 * - object args are validated against the definition's fieldRules
 *   (required / valueType / nonEmpty constraints, expression exemption
 *   included);
 * - schema-kind args (`body`/`actions`) recurse into `analyzeSchemaInput`
 *   when the validation traversal wires the hook.
 */
function validateBuiltInActionArgsByDefinition(
  value: Record<string, unknown>,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean,
  actionContext?: ActionValidationContext,
) {
  const definition: BuiltInActionDefinition | undefined = getBuiltInActionDefinition(value.action as string);

  if (!definition) {
    return;
  }

  if (value.args === undefined) {
    if (definition.argsRequired) {
      emitSchemaDiagnostic(
        diagnostics,
        {
          code: 'invalid-action-shape',
          path: appendJsonPointer(path, 'args'),
          message: 'ajax actions require args payload.',
        },
        enabled,
      );
    }
    return;
  }

  if (!isPlainObject(value.args)) {
    return;
  }

  const shape: FluxSchemaDefinitionShape = {
    kind: 'schema-definition',
    fieldRules: definition.fieldRules,
  };

  validateFluxValueShape(value.args, shape, appendJsonPointer(path, 'args'), diagnostics, {
    code: 'invalid-action-shape',
    source: 'core',
    messagePrefix: `Invalid args for built-in action "${String(value.action)}".`,
  });

  if (!actionContext?.analyzeSchemaInput) {
    return;
  }

  for (const [key, spec] of Object.entries(definition.fieldRules)) {
    const kind = typeof spec === 'string' ? spec : spec.kind;
    if (kind !== 'schema' && kind !== 'region' && kind !== 'schema-array') {
      continue;
    }

    const argValue = (value.args as Record<string, unknown>)[key];
    if (argValue === undefined) {
      continue;
    }

    if (kind === 'schema-array' && !Array.isArray(argValue)) {
      continue;
    }

    actionContext.analyzeSchemaInput(argValue, `${path}.args.${key}`);
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

  validateBuiltInActionArgsByDefinition(
    value,
    path,
    diagnostics,
    enabled,
    actionContext,
  );

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
