import type {
  BaseSchema,
  RendererDefinition,
  RendererPlugin,
  RendererRegistry
} from '@nop-chaos/flux-core';
import { isPlainObject, isSchemaInput, META_FIELDS, normalizeRootPath } from '@nop-chaos/flux-core';
import { appendJsonPointer, schemaPathToJsonPointer, type SchemaCompilerDiagnosticsContext } from './diagnostics';
import { classifyField } from './fields';

export function applyWrapComponentPlugins(renderer: RendererDefinition, plugins?: RendererPlugin[]): RendererDefinition {
  return (plugins ?? []).reduce((current, plugin) => plugin.wrapComponent?.(current) ?? current, renderer);
}

export function isNamespacedSchemaKey(key: string): boolean {
  const separatorIndex = key.indexOf(':');
  return separatorIndex > 0;
}

function getSchemaNamespace(key: string): string | undefined {
  if (!isNamespacedSchemaKey(key)) {
    return undefined;
  }

  return key.slice(0, key.indexOf(':'));
}

function hasClosedPropModel(renderer: RendererDefinition): boolean {
  return Object.keys(renderer.propSchema ?? {}).length > 0;
}

function getAcceptedSchemaKeys(renderer: RendererDefinition): Set<string> {
  const keys = new Set<string>(['type']);

  for (const key of META_FIELDS) {
    keys.add(key);
  }

  for (const key of Object.keys(renderer.defaultSchema ?? {})) {
    keys.add(key);
  }

  for (const key of Object.keys(renderer.propSchema ?? {})) {
    keys.add(key);
  }

  for (const region of renderer.regions ?? []) {
    keys.add(region);
  }

  for (const field of renderer.fields ?? []) {
    keys.add(field.key);
  }

  return keys;
}

function emitSchemaDiagnostic(
  diagnostics: SchemaCompilerDiagnosticsContext,
  issue: {
    code: Parameters<SchemaCompilerDiagnosticsContext['emit']>[0]['code'];
    message: string;
    path: string;
    severity?: Parameters<SchemaCompilerDiagnosticsContext['emit']>[0]['severity'];
    source?: Parameters<SchemaCompilerDiagnosticsContext['emit']>[0]['source'];
  },
  enabled: boolean
) {
  if (!enabled) {
    return;
  }

  diagnostics.emit(issue);
}

function validateDependsOnRoots(
  value: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean,
  code: 'invalid-property-shape' | 'invalid-source-shape' = 'invalid-property-shape'
) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    emitSchemaDiagnostic(diagnostics, {
      code,
      path,
      message: 'dependsOn must be an array of lexical root strings.'
    }, enabled);
    return;
  }

  value.forEach((entry, index) => {
    const itemPath = appendJsonPointer(path, index);

    if (typeof entry !== 'string' || entry.length === 0) {
      emitSchemaDiagnostic(diagnostics, {
        code,
        path: itemPath,
        message: 'dependsOn entries must be non-empty strings.'
      }, enabled);
      return;
    }

    if (normalizeRootPath(entry) !== entry) {
      emitSchemaDiagnostic(diagnostics, {
        code,
        path: itemPath,
        message: 'dependsOn entries must use lexical root bindings, not deep member paths.'
      }, enabled);
    }
  });
}

function validateApiSchemaShape(
  value: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean,
  code: 'invalid-property-shape' | 'invalid-action-shape' | 'invalid-source-shape'
) {
  if (!isPlainObject(value)) {
    emitSchemaDiagnostic(diagnostics, {
      code,
      path,
      message: 'api must be an object.'
    }, enabled);
    return;
  }

  if (typeof value.url !== 'string' || value.url.length === 0) {
    emitSchemaDiagnostic(diagnostics, {
      code,
      path: appendJsonPointer(path, 'url'),
      message: 'api.url must be a non-empty string.'
    }, enabled);
  }
}

function validateActionShape(
  value: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean
) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      validateActionShape(entry, appendJsonPointer(path, index), diagnostics, enabled);
    });
    return;
  }

  if (!isPlainObject(value)) {
    emitSchemaDiagnostic(diagnostics, {
      code: 'invalid-action-shape',
      path,
      message: 'Action entries must be objects.'
    }, enabled);
    return;
  }

  if (typeof value.action !== 'string' || value.action.length === 0) {
    emitSchemaDiagnostic(diagnostics, {
      code: 'invalid-action-shape',
      path: appendJsonPointer(path, 'action'),
      message: 'Action objects require a non-empty action field.'
    }, enabled);
  }

  if (value.args !== undefined && !isPlainObject(value.args)) {
    emitSchemaDiagnostic(diagnostics, {
      code: 'invalid-action-shape',
      path: appendJsonPointer(path, 'args'),
      message: 'Action args must be an object when provided.'
    }, enabled);
  }

  if (value.api !== undefined) {
    validateApiSchemaShape(value.api, appendJsonPointer(path, 'api'), diagnostics, enabled, 'invalid-action-shape');
  }

  if (value.parallel !== undefined && !Array.isArray(value.parallel)) {
    emitSchemaDiagnostic(diagnostics, {
      code: 'invalid-action-shape',
      path: appendJsonPointer(path, 'parallel'),
      message: 'Action parallel must be an array when provided.'
    }, enabled);
  } else if (Array.isArray(value.parallel)) {
    validateActionShape(value.parallel, appendJsonPointer(path, 'parallel'), diagnostics, enabled);
  }

  if (value.then !== undefined) {
    validateActionShape(value.then, appendJsonPointer(path, 'then'), diagnostics, enabled);
  }

  if (value.onError !== undefined) {
    validateActionShape(value.onError, appendJsonPointer(path, 'onError'), diagnostics, enabled);
  }
}

function validateSourceShape(
  value: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean
) {
  if (!isPlainObject(value)) {
    emitSchemaDiagnostic(diagnostics, {
      code: 'invalid-source-shape',
      path,
      message: 'Source values must be objects.'
    }, enabled);
    return;
  }

  const hasFormula = value.formula !== undefined;
  const hasAction = typeof value.action === 'string' && value.action.length > 0;
  const hasApi = value.api !== undefined;

  if (!hasFormula && !hasAction && !hasApi) {
    emitSchemaDiagnostic(diagnostics, {
      code: 'invalid-source-shape',
      path,
      message: 'Source values require formula, action, or api.'
    }, enabled);
  }

  if (value.action !== undefined && typeof value.action !== 'string') {
    emitSchemaDiagnostic(diagnostics, {
      code: 'invalid-source-shape',
      path: appendJsonPointer(path, 'action'),
      message: 'Source action must be a string when provided.'
    }, enabled);
  }

  if (hasApi) {
    validateApiSchemaShape(value.api, appendJsonPointer(path, 'api'), diagnostics, enabled, 'invalid-source-shape');
  }

  validateDependsOnRoots(value.dependsOn, appendJsonPointer(path, 'dependsOn'), diagnostics, enabled, 'invalid-source-shape');
}

function findNamespaceValidator(
  diagnostics: SchemaCompilerDiagnosticsContext,
  namespace: string
) {
  return diagnostics.validation.namespaceValidators.find((validator) => validator.namespace === namespace);
}

export function inspectSchemaNodeFields(
  schema: BaseSchema,
  renderer: RendererDefinition,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean
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
            emitSchemaDiagnostic(diagnostics, {
              code: issue.code,
              message: issue.message,
              path: issue.path ?? keyPath,
              severity: issue.severity,
              source: issue.source ?? 'namespace'
            }, enabled);
          }
        });
      } else if (diagnostics.validation.namespacedPropertyPolicy === 'error') {
        emitSchemaDiagnostic(diagnostics, {
          code: 'invalid-namespace-property',
          path: keyPath,
          message: `Unknown namespaced property "${key}".`,
          source: 'namespace'
        }, enabled);
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

    if (rule.kind === 'event') {
      validateActionShape(value, keyPath, diagnostics, enabled);
      continue;
    }

    const sourceCandidate = value as Record<string, unknown> | undefined;

    if (isPlainObject(sourceCandidate) && sourceCandidate.type === 'source') {
      validateSourceShape(sourceCandidate, keyPath, diagnostics, enabled);
    }

    if (
      hasClosedPropModel(renderer) &&
      !acceptedKeys.has(key) &&
      diagnostics.validation.unknownBarePropertyPolicy !== 'ignore'
    ) {
      emitSchemaDiagnostic(diagnostics, {
        code: 'unknown-property',
        path: keyPath,
        message: `Unknown property "${key}" for renderer type "${renderer.type}".`,
        severity: diagnostics.validation.unknownBarePropertyPolicy === 'warn' ? 'warning' : 'error'
      }, enabled);

      if (diagnostics.validation.unknownBarePropertyPolicy === 'error') {
        skippedPropKeys.add(key);
      }
    }
  }

  if (schema.type === 'data-source') {
    const hasFormula = schema.formula !== undefined;
    const hasApi = schema.api !== undefined;

    if ((hasFormula && hasApi) || (!hasFormula && !hasApi)) {
      emitSchemaDiagnostic(diagnostics, {
        code: 'invalid-source-shape',
        path: pointer,
        message: 'data-source requires exactly one of formula or api.'
      }, enabled);
    }

    if (hasApi) {
      validateApiSchemaShape(schema.api, appendJsonPointer(pointer, 'api'), diagnostics, enabled, 'invalid-source-shape');
    }
  }

  if (schema.type === 'reaction') {
    validateActionShape(schema.actions, appendJsonPointer(pointer, 'actions'), diagnostics, enabled);
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
          source: issue.source ?? 'renderer'
        });
      }
    });
  }

  return {
    extensions: Object.keys(extensions).length > 0 ? extensions : undefined,
    skippedPropKeys
  };
}

export function analyzeSchemaInput(
  inputValue: unknown,
  path: string,
  registry: RendererRegistry,
  plugins: readonly RendererPlugin[] | undefined,
  diagnostics: SchemaCompilerDiagnosticsContext
) {
  if (diagnostics.hasReachedLimit()) {
    return;
  }

  if (Array.isArray(inputValue)) {
    inputValue.forEach((entry, index) => {
      analyzeSchemaInput(entry, `${path}[${index}]`, registry, plugins, diagnostics);
    });
    return;
  }

  if (!isPlainObject(inputValue)) {
    diagnostics.emit({
      code: path === '$' ? 'invalid-root' : 'expected-object',
      path: schemaPathToJsonPointer(path),
      message: path === '$'
        ? 'Schema root must be an object or an array of schema objects.'
        : 'Schema nodes must be objects.'
    });
    return;
  }

  if (typeof inputValue.type !== 'string' || inputValue.type.length === 0) {
    diagnostics.emit({
      code: 'missing-required-field',
      path: appendJsonPointer(schemaPathToJsonPointer(path), 'type'),
      message: 'Schema nodes require a non-empty type field.'
    });
    return;
  }

  const renderer = registry.get(inputValue.type);

  if (!renderer) {
    diagnostics.emit({
      code: 'unknown-renderer-type',
      path: appendJsonPointer(schemaPathToJsonPointer(path), 'type'),
      message: `Renderer not found for type: ${inputValue.type}`
    });
    return;
  }

  const wrappedRenderer = applyWrapComponentPlugins(renderer, plugins as RendererPlugin[] | undefined);
  const schema = inputValue as BaseSchema;
  inspectSchemaNodeFields(schema, wrappedRenderer, path, diagnostics, true);

  for (const key of Object.keys(schema)) {
    const value = schema[key];
    const rule = classifyField(wrappedRenderer, key);

    if (rule.kind === 'region') {
      if (value === undefined) {
        continue;
      }

      if (!isSchemaInput(value)) {
        diagnostics.emit({
          code: 'invalid-region-node',
          path: appendJsonPointer(schemaPathToJsonPointer(path), key),
          message: `Region "${rule.regionKey ?? key}" must contain schema input.`
        });
        continue;
      }

      analyzeSchemaInput(value, `${path}.${rule.regionKey ?? key}`, registry, plugins, diagnostics);
      continue;
    }

    if (rule.kind === 'value-or-region' && isSchemaInput(value)) {
      analyzeSchemaInput(value, `${path}.${rule.regionKey ?? key}`, registry, plugins, diagnostics);
    }
  }
}
