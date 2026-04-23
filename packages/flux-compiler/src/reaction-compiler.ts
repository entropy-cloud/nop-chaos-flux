import type {
  CompiledReaction,
  ExpressionCompiler,
  ExpressionCompileOptions,
  ReactionSchema,
} from '@nop-chaos/flux-core';
import { compileActions } from './action-compiler';

export interface ReactionCompilerOptions extends ExpressionCompileOptions {
  basePath?: string;
}

function normalizeWatchPaths(watch: unknown): readonly string[] {
  if (typeof watch === 'string') {
    return [watch];
  }

  if (Array.isArray(watch)) {
    return watch.filter((item): item is string => typeof item === 'string');
  }

  return [];
}

export function compileReaction(
  id: string,
  schema: ReactionSchema,
  compiler: ExpressionCompiler,
  options?: ReactionCompilerOptions
): CompiledReaction {
  const basePath = options?.basePath ?? '$';

  const compiled: CompiledReaction = {
    id,
    watch: normalizeWatchPaths(schema.watch),
    action: compileActions(schema.actions, compiler, {
      ...options,
      basePath: `${basePath}.actions`,
    }),
  };

  if (schema.when !== undefined) {
    compiled.when = compiler.compileValue(schema.when, {
      ...options,
      sourcePath: `${basePath}.when`,
    }) as unknown as import('@nop-chaos/flux-core').CompiledRuntimeValue<boolean>;
  }

  if (schema.dependsOn !== undefined && schema.dependsOn.length > 0) {
    compiled.dependsOn = schema.dependsOn;
  }

  if (schema.immediate !== undefined) {
    compiled.immediate = schema.immediate;
  }

  if (schema.debounce !== undefined) {
    compiled.debounce = schema.debounce;
  }

  if (schema.once !== undefined) {
    compiled.once = schema.once;
  }

  return compiled;
}

export function isReactionFullyStatic(compiled: CompiledReaction): boolean {
  if (compiled.when !== undefined && !compiled.when.isStatic) {
    return false;
  }

  return compiled.action.isFullyStatic;
}
