import type {
  CompileSchemaOptions,
  FieldLinkageEffect,
  FieldLinkageSchema,
  SchemaCompileValidationOptions,
  SchemaDiagnostic,
  SchemaDiagnosticCode,
  SchemaDiagnosticSeverity,
  SchemaNamespaceValidator
} from '@nop-chaos/flux-core';
import { isPlainObject, normalizeRootPath, parsePath } from '@nop-chaos/flux-core';

export type SchemaCompilerDiagnosticsMode = 'compile' | 'validate';

export interface SchemaCompilerDiagnosticsContext {
  enabled: boolean;
  continueOnError: boolean;
  maxIssues?: number;
  validation: Required<SchemaCompileValidationOptions>;
  diagnostics: SchemaDiagnostic[];
  emit(issue: {
    code: SchemaDiagnosticCode;
    message: string;
    path: string;
    severity?: SchemaDiagnosticSeverity;
    source?: SchemaDiagnostic['source'];
  }): void;
  hasReachedLimit(): boolean;
}

function escapeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function schemaPathToJsonPointer(path: string): string {
  const segments = parsePath(path).filter((segment) => segment !== '$');

  if (segments.length === 0) {
    return '';
  }

  return `/${segments.map(escapeJsonPointerSegment).join('/')}`;
}

export function appendJsonPointer(path: string, segment: string | number): string {
  const normalizedSegment = escapeJsonPointerSegment(String(segment));

  if (!path) {
    return `/${normalizedSegment}`;
  }

  return `${path}/${normalizedSegment}`;
}

function createBuiltinNamespaceValidators(): readonly SchemaNamespaceValidator[] {
  return [
    {
      namespace: 'xui',
      validate(context) {
        if (context.key === 'xui:imports') {
          if (!Array.isArray(context.value)) {
            context.add({
              code: 'invalid-namespace-property',
              message: 'xui:imports must be an array of import specs.',
              source: 'namespace'
            });
            return;
          }

          context.value.forEach((entry, index) => {
            const itemPath = appendJsonPointer(context.path, index);

            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
              context.add({
                code: 'invalid-namespace-property',
                message: 'Each xui:imports entry must be an object.',
                path: itemPath,
                source: 'namespace'
              });
              return;
            }

            const record = entry as Record<string, unknown>;

            if (typeof record.from !== 'string' || record.from.length === 0) {
              context.add({
                code: 'invalid-namespace-property',
                message: 'xui:imports entries require a non-empty from field.',
                path: appendJsonPointer(itemPath, 'from'),
                source: 'namespace'
              });
            }

            if (typeof record.as !== 'string' || record.as.length === 0) {
              context.add({
                code: 'invalid-namespace-property',
                message: 'xui:imports entries require a non-empty as field.',
                path: appendJsonPointer(itemPath, 'as'),
                source: 'namespace'
              });
            }

            if (
              record.options !== undefined &&
              (!record.options || typeof record.options !== 'object' || Array.isArray(record.options))
            ) {
              context.add({
                code: 'invalid-namespace-property',
                message: 'xui:imports options must be an object when provided.',
                path: appendJsonPointer(itemPath, 'options'),
                source: 'namespace'
              });
            }
          });
          return;
        }

        if (context.key === 'xui:linkage') {
          if (!isPlainObject(context.value)) {
            context.add({
              code: 'invalid-namespace-property',
              message: 'xui:linkage must be an object.',
              source: 'namespace'
            });
            return;
          }

          const linkage = context.value as FieldLinkageSchema;

          if (typeof linkage.when !== 'string' || linkage.when.length === 0) {
            context.add({
              code: 'invalid-namespace-property',
              message: 'xui:linkage.when must be a non-empty expression string.',
              path: appendJsonPointer(context.path, 'when'),
              source: 'namespace'
            });
          }

          if (linkage.dependencies !== undefined) {
            if (!Array.isArray(linkage.dependencies)) {
              context.add({
                code: 'invalid-namespace-property',
                message: 'xui:linkage.dependencies must be an array of lexical root strings.',
                path: appendJsonPointer(context.path, 'dependencies'),
                source: 'namespace'
              });
            } else {
              linkage.dependencies.forEach((entry, index) => {
                const itemPath = appendJsonPointer(appendJsonPointer(context.path, 'dependencies'), index);
                if (typeof entry !== 'string' || entry.length === 0) {
                  context.add({
                    code: 'invalid-namespace-property',
                    message: 'xui:linkage.dependencies entries must be non-empty strings.',
                    path: itemPath,
                    source: 'namespace'
                  });
                  return;
                }

                if (normalizeRootPath(entry) !== entry) {
                  context.add({
                    code: 'invalid-namespace-property',
                    message: 'xui:linkage.dependencies entries must use lexical root bindings, not deep member paths.',
                    path: itemPath,
                    source: 'namespace'
                  });
                }
              });
            }
          }

          const validateEffect = (effect: FieldLinkageEffect | undefined, branch: 'fulfill' | 'otherwise') => {
            if (effect === undefined) {
              return;
            }

            if (!isPlainObject(effect)) {
              context.add({
                code: 'invalid-namespace-property',
                message: `xui:linkage.${branch} must be an object when provided.`,
                path: appendJsonPointer(context.path, branch),
                source: 'namespace'
              });
              return;
            }

            const allowedKeys = new Set(['visible', 'disabled', 'required', 'options']);
            for (const key of Object.keys(effect)) {
              if (!allowedKeys.has(key)) {
                context.add({
                  code: 'invalid-namespace-property',
                  message: `xui:linkage.${branch}.${key} is not supported.`,
                  path: appendJsonPointer(appendJsonPointer(context.path, branch), key),
                  source: 'namespace'
                });
              }
            }
          };

          validateEffect(linkage.fulfill, 'fulfill');
          validateEffect(linkage.otherwise, 'otherwise');
          return;
        }

        {
          context.add({
            code: 'invalid-namespace-property',
            message: `Unknown built-in namespace property "${context.key}".`,
            source: 'namespace'
          });
        }
      }
    }
  ];
}

function mergeNamespaceValidators(
  validators: readonly SchemaNamespaceValidator[] | undefined
): readonly SchemaNamespaceValidator[] {
  const merged = new Map<string, SchemaNamespaceValidator>();

  for (const validator of createBuiltinNamespaceValidators()) {
    merged.set(validator.namespace, validator);
  }

  for (const validator of validators ?? []) {
    merged.set(validator.namespace, validator);
  }

  return Array.from(merged.values());
}

function resolveValidationOptions(
  options: CompileSchemaOptions | undefined,
  mode: SchemaCompilerDiagnosticsMode
): Required<SchemaCompileValidationOptions> {
  const defaults: Required<SchemaCompileValidationOptions> = {
    unknownBarePropertyPolicy: mode === 'validate' ? 'error' : 'warn',
    namespacedPropertyPolicy: 'delegate-or-ignore',
    extensionPassthroughPolicy: 'namespaced-only',
    namespaceValidators: []
  };

  const validation = options?.validation;

  return {
    unknownBarePropertyPolicy: validation?.unknownBarePropertyPolicy ?? defaults.unknownBarePropertyPolicy,
    namespacedPropertyPolicy: validation?.namespacedPropertyPolicy ?? defaults.namespacedPropertyPolicy,
    extensionPassthroughPolicy: validation?.extensionPassthroughPolicy ?? defaults.extensionPassthroughPolicy,
    namespaceValidators: mergeNamespaceValidators(validation?.namespaceValidators)
  };
}

export function createSchemaCompilerDiagnosticsContext(
  options: CompileSchemaOptions | undefined,
  mode: SchemaCompilerDiagnosticsMode
): SchemaCompilerDiagnosticsContext {
  const diagnostics: SchemaDiagnostic[] = [];
  const diagnosticsOptions = options?.diagnostics;
  const enabled = mode === 'validate' || diagnosticsOptions?.enabled === true || options?.validation !== undefined;
  const continueOnError = mode === 'validate' ? true : diagnosticsOptions?.continueOnError ?? false;
  const maxIssues = diagnosticsOptions?.maxIssues;
  const validation = resolveValidationOptions(options, mode);

  function hasReachedLimit() {
    return maxIssues !== undefined && diagnostics.length >= maxIssues;
  }

  function emit(issue: {
    code: SchemaDiagnosticCode;
    message: string;
    path: string;
    severity?: SchemaDiagnosticSeverity;
    source?: SchemaDiagnostic['source'];
  }) {
    if (!enabled || hasReachedLimit()) {
      return;
    }

    const diagnostic: SchemaDiagnostic = {
      code: issue.code,
      message: issue.message,
      path: issue.path,
      severity: issue.severity ?? 'error',
      source: issue.source ?? 'core'
    };

    diagnostics.push(diagnostic);
    diagnosticsOptions?.collector?.add(diagnostic);
    diagnosticsOptions?.reporter?.(diagnostic);
  }

  return {
    enabled,
    continueOnError,
    maxIssues,
    validation,
    diagnostics,
    emit,
    hasReachedLimit
  };
}