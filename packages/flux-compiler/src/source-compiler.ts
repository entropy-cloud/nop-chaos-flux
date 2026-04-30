import type {
  ActionDataSourceSchema,
  ApiSchema,
  CompiledApiConfig,
  CompiledDataSource,
  CompiledOperationControl,
  CompiledRuntimeValue,
  DataSourceSchema,
  ExpressionCompiler,
  ExpressionCompileOptions,
} from '@nop-chaos/flux-core';

export interface SourceCompilerOptions extends ExpressionCompileOptions {
  basePath?: string;
}

export function compileApiConfig(
  api: ApiSchema,
  compiler: ExpressionCompiler,
  options?: ExpressionCompileOptions,
): CompiledApiConfig {
  return {
    url: compiler.compileValue<string>(api.url, options),
    method:
      api.method !== undefined ? compiler.compileValue<string>(api.method, options) : undefined,
    data: api.data !== undefined ? compiler.compileValue<unknown>(api.data, options) : undefined,
    params:
      api.params !== undefined ? compiler.compileValue<unknown>(api.params, options) : undefined,
    headers:
      api.headers !== undefined
        ? compiler.compileValue<Record<string, string>>(api.headers, options)
        : undefined,
    includeScope: api.includeScope,
    responseAdaptor: api.responseAdaptor,
    requestAdaptor: api.requestAdaptor,
  };
}

function compileOperationControl(schema: DataSourceSchema): CompiledOperationControl | undefined {
  const control = (
    schema as {
      control?: { dedup?: string; throttle?: number; cacheTTL?: number; cacheKey?: string };
    }
  ).control;

  if (!control) {
    return undefined;
  }

  return {
    dedup: control.dedup as CompiledOperationControl['dedup'],
    throttle: control.throttle,
    cacheTTL: control.cacheTTL,
    cacheKey: control.cacheKey,
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
    compiled.targetPath = compiler.compileValue<string>(schema.name, {
      ...options,
      sourcePath: `${basePath}.name`,
    });
  }

  if (isActionSource) {
    const actionSchema = schema as ActionDataSourceSchema;
    const actionArgs = actionSchema.args;

    if (actionArgs && actionSchema.action === 'ajax' && 'url' in actionArgs) {
      compiled.api = compileApiConfig(actionArgs as unknown as ApiSchema, compiler, {
        ...options,
        sourcePath: `${basePath}.args`,
      });
    }

    compiled.action = actionSchema.action;

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
  }

  if (isFormulaSource) {
    compiled.formula = compiler.compileValue<unknown>((schema as { formula: unknown }).formula, {
      ...options,
      sourcePath: `${basePath}.formula`,
    });
  }

  if ((schema as { action?: string }).action !== undefined) {
    compiled.action = (schema as { action: string }).action;
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
    compiled.statusPath = compiler.compileValue<string>(schema.statusPath, {
      ...options,
      sourcePath: `${basePath}.statusPath`,
    });
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
  ];

  for (const field of dynamicFields) {
    if (field !== undefined && !field.isStatic) {
      return false;
    }
  }

  if (compiled.api) {
    const apiFields: (CompiledRuntimeValue<unknown> | undefined)[] = [
      compiled.api.url,
      compiled.api.method,
      compiled.api.data,
      compiled.api.params,
      compiled.api.headers,
    ];

    for (const field of apiFields) {
      if (field !== undefined && !field.isStatic) {
        return false;
      }
    }
  }

  return true;
}
