import type {
  CompileSchemaOptions,
  HostContractContext,
  SchemaCompileValidationOptions,
  SchemaDiagnostic,
  SchemaDiagnosticCode,
  SchemaDiagnosticSeverity,
  SchemaDiagnosticSourceLocation,
  SchemaNamespaceValidator,
} from '@nop-chaos/flux-core';
import { BUILT_IN_ACTION_NAMES, parsePath } from '@nop-chaos/flux-core';

export type SchemaCompilerDiagnosticsMode = 'compile' | 'validate';

export interface SchemaCompilerDiagnosticsContext {
  enabled: boolean;
  continueOnError: boolean;
  maxIssues?: number;
  validation: ResolvedValidationOptions;
  diagnostics: SchemaDiagnostic[];
  schemaUrl?: string;
  emit(issue: {
    code: SchemaDiagnosticCode;
    message: string;
    path: string;
    severity?: SchemaDiagnosticSeverity;
    source?: SchemaDiagnostic['source'];
    sourceLocation?: SchemaDiagnosticSourceLocation;
    cause?: unknown;
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
              source: 'namespace',
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
                source: 'namespace',
              });
              return;
            }

            const record = entry as Record<string, unknown>;

            if (typeof record.from !== 'string' || record.from.length === 0) {
              context.add({
                code: 'invalid-namespace-property',
                message: 'xui:imports entries require a non-empty from field.',
                path: appendJsonPointer(itemPath, 'from'),
                source: 'namespace',
              });
            }

            if (typeof record.as !== 'string' || record.as.length === 0) {
              context.add({
                code: 'invalid-namespace-property',
                message: 'xui:imports entries require a non-empty as field.',
                path: appendJsonPointer(itemPath, 'as'),
                source: 'namespace',
              });
            }

            if (
              record.options !== undefined &&
              (!record.options ||
                typeof record.options !== 'object' ||
                Array.isArray(record.options))
            ) {
              context.add({
                code: 'invalid-namespace-property',
                message: 'xui:imports options must be an object when provided.',
                path: appendJsonPointer(itemPath, 'options'),
                source: 'namespace',
              });
            }
          });
          return;
        }

        if (context.key === 'xui:actions') {
          if (
            typeof context.value !== 'object' ||
            context.value === null ||
            Array.isArray(context.value)
          ) {
            context.add({
              code: 'invalid-namespace-property',
              message: 'xui:actions must be a non-null object mapping names to ActionSchema.',
              source: 'namespace',
            });
            return;
          }

          const entries = Object.entries(context.value as Record<string, unknown>);
          for (const [name, val] of entries) {
            const entryPath = appendJsonPointer(context.path, name);

            if (name.includes(':')) {
              context.add({
                code: 'invalid-namespace-property',
                message: `xui:actions name "${name}" must not contain a colon (:).`,
                path: entryPath,
                severity: 'error',
                source: 'namespace',
              });
            }

            if (BUILT_IN_ACTION_NAMES.has(name)) {
              context.add({
                code: 'invalid-namespace-property',
                message: `xui:actions name "${name}" conflicts with a built-in action name.`,
                path: entryPath,
                severity: 'warning',
                source: 'namespace',
              });
            }

            if (typeof val !== 'object' || val === null || Array.isArray(val)) {
              context.add({
                code: 'invalid-namespace-property',
                message: `xui:actions entry "${name}" must be an ActionSchema object.`,
                path: entryPath,
                source: 'namespace',
              });
            } else {
              const record = val as Record<string, unknown>;
              if (typeof record.action === 'string' && record.action === name) {
                context.add({
                  code: 'invalid-namespace-property',
                  message: `xui:actions entry "${name}" directly references itself, which would cause infinite recursion at runtime.`,
                  path: entryPath,
                  severity: 'warning',
                  source: 'namespace',
                });
              }
            }
          }
          return;
        }

        if (context.key === 'xui:version') {
          if (typeof context.value !== 'string') {
            context.add({
              code: 'invalid-namespace-property',
              message: 'xui:version must be a string version selector.',
              source: 'namespace',
            });
            return;
          }

          if (context.value.length === 0) {
            context.add({
              code: 'invalid-namespace-property',
              message: 'xui:version must be a non-empty version selector string.',
              source: 'namespace',
            });
          }
          return;
        }

        context.add({
          code: 'invalid-namespace-property',
          message: `Unknown built-in namespace property "${context.key}".`,
          source: 'namespace',
        });
      },
    },
  ];
}

function mergeNamespaceValidators(
  validators: readonly SchemaNamespaceValidator[] | undefined,
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

type ResolvedValidationOptions = Omit<
  Required<SchemaCompileValidationOptions>,
  'hostContractContext' | 'strictMode'
> & {
  hostContractContext?: HostContractContext;
  strictMode?: boolean;
  preparedImports?: ReadonlyMap<string, import('@nop-chaos/flux-core').PreparedImportSpec>;
};

function resolveValidationOptions(
  options: CompileSchemaOptions | undefined,
  mode: SchemaCompilerDiagnosticsMode,
): ResolvedValidationOptions {
  const defaults = {
    unknownBarePropertyPolicy: (mode === 'validate' ? 'error' : 'warn') as
      | 'error'
      | 'warn'
      | 'ignore',
    namespacedPropertyPolicy: 'delegate-or-ignore' as const,
    extensionPassthroughPolicy: 'namespaced-only' as const,
    namespaceValidators: [] as readonly SchemaNamespaceValidator[],
    hostContractContext: undefined as HostContractContext | undefined,
    strictMode: undefined as boolean | undefined,
    preparedImports: undefined as
      | ReadonlyMap<string, import('@nop-chaos/flux-core').PreparedImportSpec>
      | undefined,
  };

  const validation = options?.validation;

  return {
    unknownBarePropertyPolicy:
      validation?.unknownBarePropertyPolicy ?? defaults.unknownBarePropertyPolicy,
    namespacedPropertyPolicy:
      validation?.namespacedPropertyPolicy ?? defaults.namespacedPropertyPolicy,
    extensionPassthroughPolicy:
      validation?.extensionPassthroughPolicy ?? defaults.extensionPassthroughPolicy,
    namespaceValidators: mergeNamespaceValidators(validation?.namespaceValidators),
    hostContractContext: validation?.hostContractContext ?? defaults.hostContractContext,
    strictMode: validation?.strictMode ?? defaults.strictMode,
    preparedImports: options?.preparedImports ?? defaults.preparedImports,
  };
}

export function createSchemaCompilerDiagnosticsContext(
  options: CompileSchemaOptions | undefined,
  mode: SchemaCompilerDiagnosticsMode,
  schemaUrl?: string,
): SchemaCompilerDiagnosticsContext {
  const diagnostics: SchemaDiagnostic[] = [];
  const diagnosticsOptions = options?.diagnostics;
  const enabled =
    mode === 'validate' ||
    diagnosticsOptions?.enabled === true ||
    options?.validation !== undefined;
  const continueOnError =
    mode === 'validate' ? true : (diagnosticsOptions?.continueOnError ?? false);
  const maxIssues = diagnosticsOptions?.maxIssues;
  const validation = resolveValidationOptions(options, mode);
  const seen = new Set<string>();

  function hasReachedLimit() {
    return maxIssues !== undefined && diagnostics.length >= maxIssues;
  }

  function emit(issue: {
    code: SchemaDiagnosticCode;
    message: string;
    path: string;
    severity?: SchemaDiagnosticSeverity;
    source?: SchemaDiagnostic['source'];
    sourceLocation?: SchemaDiagnosticSourceLocation;
    cause?: unknown;
  }) {
    if (!enabled || hasReachedLimit()) {
      return;
    }

    const sourceLocation = issue.sourceLocation ?? (schemaUrl ? { file: schemaUrl } : undefined);

    const diagnostic: SchemaDiagnostic = {
      code: issue.code,
      message: issue.message,
      path: issue.path,
      severity: issue.severity ?? 'error',
      source: issue.source ?? 'core',
      ...(sourceLocation ? { sourceLocation } : {}),
      ...(issue.cause !== undefined ? { cause: issue.cause } : {}),
    };

    const key = `${diagnostic.source}:${diagnostic.code}:${diagnostic.path}:${diagnostic.message}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);

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
    schemaUrl,
    emit,
    hasReachedLimit,
  };
}
