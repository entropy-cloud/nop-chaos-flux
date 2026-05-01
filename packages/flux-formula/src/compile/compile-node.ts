import type {
  CompiledValueNode,
  ExpressionCompileOptions,
  FormulaCompiler,
  StaticValueNode,
} from '@nop-chaos/flux-core';
import { isPlainObject } from '@nop-chaos/flux-core';
import { isPureExpression } from '../template';

function hasStaticValue<T>(value: { staticValue?: T }): value is { staticValue: T } {
  return Object.prototype.hasOwnProperty.call(value, 'staticValue');
}

function withSourcePath(
  options: ExpressionCompileOptions | undefined,
  segment: string,
): ExpressionCompileOptions | undefined {
  if (!options?.sourcePath) {
    return options;
  }

  return {
    ...options,
    sourcePath: segment.startsWith('[')
      ? `${options.sourcePath}${segment}`
      : `${options.sourcePath}.${segment}`,
  };
}

function compileNode<T>(
  input: T,
  formulaCompiler: FormulaCompiler,
  options?: ExpressionCompileOptions,
): CompiledValueNode<T> {
  if (typeof input === 'string') {
    if (!formulaCompiler.hasExpression(input)) {
      return {
        kind: 'static-node',
        value: input,
      } as StaticValueNode<T>;
    }

    const trimmed = input.trim();
    if (isPureExpression(trimmed)) {
      try {
        const compiled = formulaCompiler.compileExpression<T>(input, options);
        if (hasStaticValue(compiled)) {
          return {
            kind: 'static-node',
            value: compiled.staticValue,
          } as StaticValueNode<T>;
        }

        return {
          kind: 'expression-node',
          source: input,
          compiled,
        };
      } catch (error) {
        options?.reportDiagnostic?.({
          code: 'unhandled-compilation-error',
          message: `Expression compilation failed: ${String(error)}`,
          path: options?.sourcePath ?? '',
          source: 'core',
        });
        return {
          kind: 'static-node',
          value: input,
        } as StaticValueNode<T>;
      }
    }

    try {
      const compiled = formulaCompiler.compileTemplate<T>(input, options);
      if (hasStaticValue(compiled)) {
        return {
          kind: 'static-node',
          value: compiled.staticValue,
        } as StaticValueNode<T>;
      }

      return {
        kind: 'template-node',
        source: input,
        compiled,
      };
    } catch (error) {
      options?.reportDiagnostic?.({
        code: 'unhandled-compilation-error',
        message: `Template compilation failed: ${String(error)}`,
        path: options?.sourcePath ?? '',
        source: 'core',
      });
      return {
        kind: 'static-node',
        value: input,
      } as StaticValueNode<T>;
    }
  }

  if (Array.isArray(input)) {
    const items = input.map((item: unknown, index) =>
      compileNode(item, formulaCompiler, withSourcePath(options, `[${index}]`)),
    );

    if (items.every((item) => item.kind === 'static-node')) {
      return {
        kind: 'static-node',
        value: input,
      } as StaticValueNode<T>;
    }

    return {
      kind: 'array-node',
      items,
    } as CompiledValueNode<T>;
  }

  if (isPlainObject(input)) {
    const objectInput = input as Record<string, unknown>;
    const keys = Object.keys(objectInput);
    const entries = Object.fromEntries(
      keys.map((key) => [
        key,
        compileNode(objectInput[key], formulaCompiler, withSourcePath(options, key)),
      ]),
    );
    const hasDynamic = keys.some((key) => entries[key].kind !== 'static-node');

    if (!hasDynamic) {
      return {
        kind: 'static-node',
        value: input,
      } as StaticValueNode<T>;
    }

    return {
      kind: 'object-node',
      keys,
      entries,
    } as CompiledValueNode<T>;
  }

  return {
    kind: 'static-node',
    value: input,
  } as StaticValueNode<T>;
}

export { compileNode };
