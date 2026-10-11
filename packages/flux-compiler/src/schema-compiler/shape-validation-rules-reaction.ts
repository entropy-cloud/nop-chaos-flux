import { appendJsonPointer, type SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import { isPlainObject } from '@nop-chaos/flux-core';
import { emitSchemaDiagnostic, type ActionValidationContext } from './shape-validation-predicates.js';
import { validateActionShape } from './shape-validation-rules-action.js';
import { validateDependsOnRoots, validateRootPathArray } from './shape-validation-rules-structural.js';

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
 *  - reuses `validateRootPathArray` for root-level enforcement, but emits
 *    `invalid-reaction-deep-path` (warning) instead of the structural default
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
  validateRootPathArray({
    value: (value as { dependsOn?: unknown }).dependsOn,
    path: appendJsonPointer(path, 'dependsOn'),
    diagnostics,
    enabled,
    required: true,
    requiredMessage:
      'kind: "reaction" fields require a non-empty dependsOn array of root-level scope paths.',
    entryInvalidMessage: 'dependsOn entries must be non-empty strings.',
    deepPathMessage: (entry, root) =>
      `dependsOn entries should be root-level paths; "${entry}" will be folded to root "${root}" at runtime.`,
    codes: { shape: 'invalid-reaction-deps', entry: 'invalid-reaction-deps', deepPath: 'invalid-reaction-deep-path' },
    severities: { shape: 'error', entry: 'error', deepPath: 'warning' },
  });

  // ignoreWritesTo: optional, but if present must be array of root-level strings.
  validateRootPathArray({
    value: (value as { ignoreWritesTo?: unknown }).ignoreWritesTo,
    path: appendJsonPointer(path, 'ignoreWritesTo'),
    diagnostics,
    enabled,
    notArrayMessage: 'ignoreWritesTo must be an array of root-level scope paths when provided.',
    entryInvalidMessage: 'ignoreWritesTo entries must be non-empty strings.',
    deepPathMessage: (entry, root) =>
      `ignoreWritesTo entries should be root-level paths; "${entry}" will be folded to root "${root}" at runtime.`,
    codes: { shape: 'invalid-reaction-deps', entry: 'invalid-reaction-deps', deepPath: 'invalid-reaction-deep-path' },
    severities: { shape: 'error', entry: 'error', deepPath: 'warning' },
  });

  // v1 does not support immediate / debounce / once / control on ReactiveActionSchema.
  const v1ForbiddenFields = [
    {
      field: 'immediate',
      code: 'invalid-reaction-immediate',
      message:
        'kind: "reaction" fields do not support immediate in v1; the renderer owns initial-fire timing via ReactionHandle.ready().',
    },
    {
      field: 'debounce',
      code: 'invalid-reaction-debounce',
      message: 'kind: "reaction" fields do not support debounce in v1; use a <reaction> renderer if you need debounce.',
    },
    {
      field: 'once',
      code: 'invalid-reaction-once',
      message: 'kind: "reaction" fields do not support once in v1; use a <reaction> renderer if you need once.',
    },
    {
      field: 'control',
      code: 'invalid-reaction-control',
      message: 'kind: "reaction" fields do not support control in v1; use a <reaction> renderer if you need control.',
    },
 ] as const;
  for (const forbidden of v1ForbiddenFields) {
    if ((value as Record<string, unknown>)[forbidden.field] !== undefined) {
      emitSchemaDiagnostic(
        diagnostics,
        {
          code: forbidden.code,
          path: appendJsonPointer(path, forbidden.field),
          message: forbidden.message,
          severity: 'error',
        },
        enabled,
      );
    }
  }

  // Reuse action-shape validation for the action body.
  validateActionShape(value, path, diagnostics, enabled, actionContext);
}
