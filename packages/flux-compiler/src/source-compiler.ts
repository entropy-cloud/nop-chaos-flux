import type {
  ActionDataSourceSchema,
  ActionSchema,
  CompiledDataSource,
  CompiledOperationControl,
  CompiledRuntimeValue,
  DataSourceSchema,
  ExpressionCompiler,
  ExpressionCompileOptions,
} from '@nop-chaos/flux-core';
import { compileActions } from './action-compiler.js';
export interface SourceCompilerOptions extends ExpressionCompileOptions {
  basePath?: string;
}

function compileOperationControl(schema: DataSourceSchema): CompiledOperationControl | undefined {
  const control = (
    schema as {
      control?: {
        dedup?: string;
        retry?: { times: number; delay?: number; strategy?: 'fixed' | 'exponential'; maxDelay?: number };
        throttle?: number;
        cacheTTL?: number;
        cacheKey?: string;
      };
      retry?: { times: number; delay?: number; strategy?: 'fixed' | 'exponential'; maxDelay?: number };
    }
  ).control;
  const topLevelRetry = (schema as { retry?: CompiledOperationControl['retry'] }).retry;

  if (!control && !topLevelRetry) {
    return undefined;
  }

  return {
    dedup: control?.dedup as CompiledOperationControl['dedup'],
    retry: control?.retry ?? topLevelRetry,
    throttle: control?.throttle,
    cacheTTL: control?.cacheTTL,
    cacheKey: control?.cacheKey,
  };
}

function compileStructuralPath(
  value: string | undefined,
): CompiledRuntimeValue<string> | undefined {
  if (value === undefined) {
    return undefined;
  }

  return {
    kind: 'static',
    isStatic: true,
    node: {
      kind: 'static-node',
      value,
    },
    value,
  };
}

export function compileDataSource(
  id: string,
  schema: DataSourceSchema,
  compiler: ExpressionCompiler,
  options?: SourceCompilerOptions,
): CompiledDataSource {
  const basePath = options?.basePath ?? '$';
  const isFormulaSource = 'formula' in schema && schema.formula !== undefined;
  const isActionSource = !isFormulaSource;

  const compiled: CompiledDataSource = {
    id,
    kind: isFormulaSource ? 'formula' : 'action',
  };

  if (schema.name !== undefined) {
    compiled.targetPath = compileStructuralPath(schema.name);
  }

  if (isActionSource) {
    const actionSchema = schema as ActionDataSourceSchema;
    compiled.action = compileActions(actionSchema as ActionSchema, compiler, {
      ...options,
      basePath,
    });

    if (actionSchema.interval !== undefined) {
      compiled.interval = compiler.compileValue<number>(actionSchema.interval, {
        ...options,
        sourcePath: `${basePath}.interval`,
      });
    }

    if (actionSchema.stopWhen !== undefined) {
      compiled.stopWhen = compiler.compileValue(actionSchema.stopWhen, {
        ...options,
        sourcePath: `${basePath}.stopWhen`,
      }) as unknown as CompiledRuntimeValue<boolean>;
    }

    if (actionSchema.silent !== undefined) {
      compiled.silent = compiler.compileValue(actionSchema.silent, {
        ...options,
        sourcePath: `${basePath}.silent`,
      }) as unknown as CompiledRuntimeValue<boolean>;
    }

    if (actionSchema.sendOn !== undefined) {
      compiled.sendOn = compiler.compileValue(actionSchema.sendOn, {
        ...options,
        sourcePath: `${basePath}.sendOn`,
      }) as unknown as CompiledRuntimeValue<boolean>;
    }

    if (actionSchema.initFetch !== undefined) {
      compiled.initFetch = compiler.compileValue(actionSchema.initFetch, {
        ...options,
        sourcePath: `${basePath}.initFetch`,
      }) as unknown as CompiledRuntimeValue<boolean>;
    }

    if (actionSchema.onSuccess !== undefined) {
      compiled.onSuccess = compileActions(actionSchema.onSuccess, compiler, {
        ...options,
        basePath: `${basePath}.onSuccess`,
      });
    }

    if (actionSchema.onError !== undefined) {
      compiled.onError = compileActions(actionSchema.onError, compiler, {
        ...options,
        basePath: `${basePath}.onError`,
      });
    }
  }

  if (isFormulaSource) {
    compiled.formula = compiler.compileValue<unknown>((schema as { formula: unknown }).formula, {
      ...options,
      sourcePath: `${basePath}.formula`,
    });
  }

  if (schema.mergeToScope !== undefined) {
    compiled.mergeToScope = compiler.compileValue<boolean>(schema.mergeToScope, {
      ...options,
      sourcePath: `${basePath}.mergeToScope`,
    });
  }

  if (schema.resultMapping !== undefined) {
    compiled.resultMapping = compiler.compileValue(schema.resultMapping, {
      ...options,
      sourcePath: `${basePath}.resultMapping`,
    }) as unknown as CompiledRuntimeValue<Record<string, string>>;
  }

  if (schema.mergeStrategy !== undefined) {
    compiled.mergeStrategy = compiler.compileValue(schema.mergeStrategy, {
      ...options,
      sourcePath: `${basePath}.mergeStrategy`,
    }) as unknown as CompiledRuntimeValue<'replace' | 'append' | 'prepend' | 'merge' | 'upsert'>;
  }

  if (schema.mergeKey !== undefined) {
    compiled.mergeKey = compiler.compileValue<string>(schema.mergeKey, {
      ...options,
      sourcePath: `${basePath}.mergeKey`,
    });
  }

  if (schema.statusPath !== undefined) {
    compiled.statusPath = compileStructuralPath(schema.statusPath);
  }

  if (schema.initialData !== undefined) {
    compiled.initialData = compiler.compileValue<unknown>(schema.initialData, {
      ...options,
      sourcePath: `${basePath}.initialData`,
    });
  }

  if (schema.dependsOn !== undefined && schema.dependsOn.length > 0) {
    compiled.dependsOn = schema.dependsOn;
  }

  compiled.control = compileOperationControl(schema);

  return compiled;
}

export function isDataSourceFullyStatic(compiled: CompiledDataSource): boolean {
  const dynamicFields: (CompiledRuntimeValue<unknown> | undefined)[] = [
    compiled.targetPath,
    compiled.formula,
    compiled.mergeToScope,
    compiled.resultMapping,
    compiled.mergeStrategy,
    compiled.mergeKey,
    compiled.statusPath,
    compiled.interval,
    compiled.stopWhen,
    compiled.silent,
    compiled.initialData,
    compiled.sendOn,
    compiled.initFetch,
  ];

  for (const field of dynamicFields) {
    if (field !== undefined && !field.isStatic) {
      return false;
    }
  }

  if (compiled.action && !compiled.action.isFullyStatic) {
    return false;
  }

  if (compiled.onSuccess && !compiled.onSuccess.isFullyStatic) {
    return false;
  }

  if (compiled.onError && !compiled.onError.isFullyStatic) {
    return false;
  }

  return true;
}
