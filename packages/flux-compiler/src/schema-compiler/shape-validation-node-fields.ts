import type { BaseSchema, RendererDefinition } from '@nop-chaos/flux-core';
import { isPlainObject } from '@nop-chaos/flux-core';
import {
  appendJsonPointer,
  schemaPathToJsonPointer,
  type SchemaCompilerDiagnosticsContext,
} from './diagnostics.js';
import { classifyField } from './fields.js';
import type { HostActionValidationContext } from './host-action-validation.js';
import {
  isDynamicallyAuthoredSchemaValue,
  summarizeActualSchemaValue,
  validateFluxValueShape,
} from './flux-value-shape-validation.js';
import {
  emitSchemaDiagnostic,
  validateActionShape,
  validateApiSchemaShape,
  validateDependsOnRoots,
  validateSourceShape,
} from './shape-validation-rules.js';
import {
  getAcceptedSchemaKeys,
  getSchemaNamespace,
  hasClosedPropModel,
  isNamespacedSchemaKey,
} from './shape-validation-utils.js';
import { TABS_ITEM_BOOLEAN_FIELDS } from './tables.js';

const BOOLEAN_META_KEYS = new Set(['when', 'visible', 'hidden', 'disabled']);

function findNamespaceValidator(diagnostics: SchemaCompilerDiagnosticsContext, namespace: string) {
  return diagnostics.validation.namespaceValidators.find(
    (validator) => validator.namespace === namespace,
  );
}

function validateKnownPropValue(
  schema: BaseSchema,
  renderer: RendererDefinition,
  key: string,
  keyPath: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  skippedPropKeys: Set<string>,
) {
  const contract = renderer.propContracts?.[key];
  if (!contract) {
    return;
  }

  const value = schema[key];
  if (value === undefined || isDynamicallyAuthoredSchemaValue(value)) {
    return;
  }

  const valid = validateFluxValueShape(value, contract.shape, keyPath, diagnostics, {
    code: 'invalid-property-value',
    source: 'core',
    messagePrefix: `Invalid value for property "${key}" on renderer type "${renderer.type}".`,
  });

  if (!valid) {
    skippedPropKeys.add(key);
  }
}

function validateBooleanAuthoredValue(input: {
  key: string;
  value: unknown;
  path: string;
  diagnostics: SchemaCompilerDiagnosticsContext;
  enabled: boolean;
  source?: 'core' | 'renderer';
}) {
  if (
    input.value === undefined ||
    typeof input.value === 'boolean' ||
    isDynamicallyAuthoredSchemaValue(input.value)
  ) {
    return;
  }

  emitSchemaDiagnostic(
    input.diagnostics,
    {
      code: 'invalid-property-value',
      path: input.path,
      message: `Invalid boolean value for property "${input.key}". Use a boolean literal or a \${expr} expression, not ${summarizeActualSchemaValue(input.value)}.`,
      source: input.source ?? 'core',
    },
    input.enabled,
  );
}

function validateNestedBooleanFields(input: {
  value: unknown;
  path: string;
  keys: readonly string[];
  diagnostics: SchemaCompilerDiagnosticsContext;
  enabled: boolean;
}) {
  if (!Array.isArray(input.value)) {
    return;
  }

  input.value.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return;
    }

    const record = item as Record<string, unknown>;
    for (const key of input.keys) {
      validateBooleanAuthoredValue({
        key,
        value: record[key],
        path: appendJsonPointer(appendJsonPointer(input.path, index), key),
        diagnostics: input.diagnostics,
        enabled: input.enabled,
        source: 'renderer',
      });
    }
  });
}

export function inspectSchemaNodeFields(
  schema: BaseSchema,
  renderer: RendererDefinition,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean,
  hostContext?: HostActionValidationContext,
): {
  extensions?: Readonly<Record<string, unknown>>;
  skippedPropKeys: ReadonlySet<string>;
} {
  const pointer = schemaPathToJsonPointer(path);
  const acceptedKeys = getAcceptedSchemaKeys(renderer);
  const skippedPropKeys = new Set<string>();
  const extensions: Record<string, unknown> = {};

  for (const key of Object.keys(schema)) {
    const value = schema[key];
    const keyPath = appendJsonPointer(pointer, key);

    if (isNamespacedSchemaKey(key)) {
      const namespace = getSchemaNamespace(key)!;
      const validator = findNamespaceValidator(diagnostics, namespace);

      skippedPropKeys.add(key);

      if (validator) {
        validator.validate({
          namespace,
          key,
          value,
          path: keyPath,
          add(issue) {
            emitSchemaDiagnostic(
              diagnostics,
              {
                code: issue.code,
                message: issue.message,
                path: issue.path ?? keyPath,
                severity: issue.severity,
                source: issue.source ?? 'namespace',
              },
              enabled,
            );
          },
        });
      } else if (diagnostics.validation.namespacedPropertyPolicy === 'error') {
        emitSchemaDiagnostic(
          diagnostics,
          {
            code: 'invalid-namespace-property',
            path: keyPath,
            message: `Unknown namespaced property "${key}".`,
            source: 'namespace',
          },
          enabled,
        );
      }

      if (diagnostics.validation.extensionPassthroughPolicy === 'namespaced-only') {
        extensions[key] = value;
      }

      continue;
    }

    if (key === 'dependsOn') {
      validateDependsOnRoots(value, keyPath, diagnostics, enabled);
      continue;
    }

    const rule = classifyField(renderer, key);

    if (BOOLEAN_META_KEYS.has(key) && rule.kind === 'meta') {
      validateBooleanAuthoredValue({
        key,
        value,
        path: keyPath,
        diagnostics,
        enabled,
        source: 'core',
      });
    } else if (rule.kind === 'prop' && rule.valueType === 'boolean') {
      validateBooleanAuthoredValue({
        key,
        value,
        path: keyPath,
        diagnostics,
        enabled,
        source: 'renderer',
      });
    }

    if (renderer.type === 'tabs' && key === 'items') {
      validateNestedBooleanFields({
        value,
        path: keyPath,
        keys: TABS_ITEM_BOOLEAN_FIELDS,
        diagnostics,
        enabled,
      });
    }

    if (rule.kind === 'event') {
      validateActionShape(value, keyPath, diagnostics, enabled, hostContext);
      continue;
    }

    validateKnownPropValue(schema, renderer, key, keyPath, diagnostics, skippedPropKeys);

    const sourceCandidate = value as Record<string, unknown> | undefined;

    if (isPlainObject(sourceCandidate) && sourceCandidate.type === 'source') {
      validateSourceShape(sourceCandidate, keyPath, diagnostics, enabled);
    }

    const closedModel = hasClosedPropModel(renderer);
    const strictMode = diagnostics.validation.strictMode === true;

    if (
      (closedModel || strictMode) &&
      !acceptedKeys.has(key) &&
      diagnostics.validation.unknownBarePropertyPolicy !== 'ignore'
    ) {
      const severity = closedModel
        ? strictMode
          ? 'error'
          : diagnostics.validation.unknownBarePropertyPolicy === 'warn'
            ? 'warning'
            : 'error'
        : 'warning';

      emitSchemaDiagnostic(
        diagnostics,
        {
          code: 'unknown-property',
          path: keyPath,
          message: `Unknown property "${key}" for renderer type "${renderer.type}".`,
          severity,
        },
        enabled,
      );

      if (severity === 'error') {
        skippedPropKeys.add(key);
      }
    }
  }

  if (schema.type === 'data-source') {
    const hasFormula = schema.formula !== undefined;
    const hasAction = schema.action !== undefined;

    if ((hasFormula && hasAction) || (!hasFormula && !hasAction)) {
      emitSchemaDiagnostic(
        diagnostics,
        {
          code: 'invalid-source-shape',
          path: pointer,
          message: 'data-source requires exactly one of formula or action.',
        },
        enabled,
      );
    }

    if (
      hasAction &&
      schema.args &&
      typeof schema.args === 'object' &&
      'url' in (schema.args as object)
    ) {
      validateApiSchemaShape(
        schema.args as import('@nop-chaos/flux-core').ApiSchema,
        appendJsonPointer(pointer, 'args'),
        diagnostics,
        enabled,
        'invalid-source-shape',
      );
    }
  }

  if (schema.type === 'reaction') {
    validateActionShape(
      schema.actions,
      appendJsonPointer(pointer, 'actions'),
      diagnostics,
      enabled,
      hostContext,
    );
  }

  if (enabled && renderer.schemaValidator) {
    renderer.schemaValidator({
      schema,
      path,
      emit(issue) {
        diagnostics.emit({
          code: issue.code,
          message: issue.message,
          path: issue.path ?? pointer,
          severity: issue.severity,
          source: issue.source ?? 'renderer',
        });
      },
    });
  }

  return {
    extensions: Object.keys(extensions).length > 0 ? extensions : undefined,
    skippedPropKeys,
  };
}
