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

/**
 * Extract the first watch template from schema.watch.
 * schema.watch can be a string like '${status}' or an array like ['${status}', '${count}'].
 * For now, we only support single watch expression (first one if array).
 */
function extractWatchTemplate(watch: unknown): string {
  if (typeof watch === 'string') {
    return watch;
  }

  if (Array.isArray(watch) && watch.length > 0 && typeof watch[0] === 'string') {
    return watch[0];
  }

  // Return empty template that evaluates to undefined
  return '';
}

export function compileReaction(
  id: string,
  schema: ReactionSchema,
  compiler: ExpressionCompiler,
  options?: ReactionCompilerOptions
): CompiledReaction {
  const basePath = options?.basePath ?? '$';

  // Compile the watch expression - this is a template like '${status}'
  const watchTemplate = extractWatchTemplate(schema.watch);
  const compiledWatch = compiler.compileValue(watchTemplate, {
    ...options,
    sourcePath: `${basePath}.watch`,
  });

  const compiled: CompiledReaction = {
    id,
    watch: compiledWatch,
    action: compileActions(schema.actions, compiler, {
      ...options,
      basePath: `${basePath}.actions`,
    }),
  };

  // Compile the when condition - this is a raw expression (not a template)
  // that receives special bindings: value, prev, changed, changedPaths, scope
  if (schema.when !== undefined) {
    compiled.when = compiler.formulaCompiler.compileExpression<boolean>(schema.when, {
      ...options,
      sourcePath: `${basePath}.when`,
    });
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
  if (compiled.when !== undefined) {
    return false; // when expressions always need runtime evaluation
  }

  return compiled.watch.isStatic && compiled.action.isFullyStatic;
}
