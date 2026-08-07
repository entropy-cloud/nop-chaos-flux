import { appendJsonPointer, type SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import { isPlainObject, normalizeRootPath } from '@nop-chaos/flux-core';
import { emitSchemaDiagnostic, type ActionValidationContext } from './shape-validation-predicates.js';
import { validateActionShape } from './shape-validation-rules-action.js';
import { validateDependsOnRoots } from './shape-validation-rules-structural.js';

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

/**
 * Validate a `kind: 'reaction'` field on a renderer (e.g. CRUD `loadAction`).
 *
 * Distinct from `validateReactionShape` (which validates the standalone
 * `<reaction>` renderer): the field variant:
 *  - requires `dependsOn` (non-empty array of root-level paths),
 *  - forbids `immediate` (renderer owns initial-fire via `ReactionHandle.ready()`),
 *  - forbids v1-unsupported fields (`debounce`, `once`, `control`),
 *  - reuses `validateActionShape` for the action body,
 *  - reuses `validateDependsOnRoots` for root-level enforcement, but emits
 *    `invalid-reaction-deep-path` (warning) instead of the default
 *    `invalid-property-shape` (error) for deep paths — deep paths fold to the
 *    root at runtime and remain functional.
 *
 * @see docs/plans/2026-07-07-loadAction-reaction-kind-plan.md
 */
export function validateReactionFieldShape(
  value: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean,
  actionContext?: ActionValidationContext,
) {
  if (!isPlainObject(value)) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-action-shape',
        path,
        message: 'Reaction fields must be action objects.',
      },
      enabled,
    );
    return;
  }

  // dependsOn: required, non-empty array of root-level strings.
  const dependsOn = (value as { dependsOn?: unknown }).dependsOn;
  if (!Array.isArray(dependsOn) || dependsOn.length === 0) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-reaction-deps',
        path: appendJsonPointer(path, 'dependsOn'),
        message:
          'kind: "reaction" fields require a non-empty dependsOn array of root-level scope paths.',
        severity: 'error',
      },
      enabled,
    );
  } else {
    for (let index = 0; index < dependsOn.length; index += 1) {
      const entry = dependsOn[index];
      const entryPath = appendJsonPointer(appendJsonPointer(path, 'dependsOn'), index);
      if (typeof entry !== 'string' || entry.length === 0) {
        emitSchemaDiagnostic(
          diagnostics,
          {
            code: 'invalid-reaction-deps',
            path: entryPath,
            message: 'dependsOn entries must be non-empty strings.',
            severity: 'error',
          },
          enabled,
        );
        continue;
      }
      // Deep paths fold to root at runtime; warn but keep compiling.
      if (normalizeRootPath(entry) !== entry) {
        emitSchemaDiagnostic(
          diagnostics,
          {
            code: 'invalid-reaction-deep-path',
            path: entryPath,
            message: `dependsOn entries should be root-level paths; "${entry}" will be folded to root "${normalizeRootPath(entry)}" at runtime.`,
            severity: 'warning',
          },
          enabled,
        );
      }
    }
  }

  // ignoreWritesTo: optional, but if present must be array of root-level strings.
  const ignoreWritesTo = (value as { ignoreWritesTo?: unknown }).ignoreWritesTo;
  if (ignoreWritesTo !== undefined) {
    if (!Array.isArray(ignoreWritesTo)) {
      emitSchemaDiagnostic(
        diagnostics,
        {
          code: 'invalid-reaction-deps',
          path: appendJsonPointer(path, 'ignoreWritesTo'),
          message: 'ignoreWritesTo must be an array of root-level scope paths when provided.',
          severity: 'error',
        },
        enabled,
      );
    } else {
      for (let index = 0; index < ignoreWritesTo.length; index += 1) {
        const entry = ignoreWritesTo[index];
        const entryPath = appendJsonPointer(appendJsonPointer(path, 'ignoreWritesTo'), index);
        if (typeof entry !== 'string' || entry.length === 0) {
          emitSchemaDiagnostic(
            diagnostics,
            {
              code: 'invalid-reaction-deps',
              path: entryPath,
              message: 'ignoreWritesTo entries must be non-empty strings.',
              severity: 'error',
            },
            enabled,
          );
          continue;
        }
        if (normalizeRootPath(entry) !== entry) {
          emitSchemaDiagnostic(
            diagnostics,
            {
              code: 'invalid-reaction-deep-path',
              path: entryPath,
              message: `ignoreWritesTo entries should be root-level paths; "${entry}" will be folded to root "${normalizeRootPath(entry)}" at runtime.`,
              severity: 'warning',
            },
            enabled,
          );
        }
      }
    }
  }

  // v1 does not support immediate / debounce / once / control on ReactiveActionSchema.
  if ((value as { immediate?: unknown }).immediate !== undefined) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-reaction-immediate',
        path: appendJsonPointer(path, 'immediate'),
        message:
          'kind: "reaction" fields do not support immediate in v1; the renderer owns initial-fire timing via ReactionHandle.ready().',
        severity: 'error',
      },
      enabled,
    );
  }
  if ((value as { debounce?: unknown }).debounce !== undefined) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-reaction-immediate',
        path: appendJsonPointer(path, 'debounce'),
        message:
          'kind: "reaction" fields do not support debounce in v1; use a <reaction> renderer if you need debounce.',
        severity: 'error',
      },
      enabled,
    );
  }
  if ((value as { once?: unknown }).once !== undefined) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-reaction-immediate',
        path: appendJsonPointer(path, 'once'),
        message:
          'kind: "reaction" fields do not support once in v1; use a <reaction> renderer if you need once.',
        severity: 'error',
      },
      enabled,
    );
  }
  if ((value as { control?: unknown }).control !== undefined) {
    emitSchemaDiagnostic(
      diagnostics,
      {
        code: 'invalid-reaction-immediate',
        path: appendJsonPointer(path, 'control'),
        message:
          'kind: "reaction" fields do not support control in v1; use a <reaction> renderer if you need control.',
        severity: 'error',
      },
      enabled,
    );
  }

  // Reuse action-shape validation for the action body.
  validateActionShape(value, path, diagnostics, enabled, actionContext);
}
