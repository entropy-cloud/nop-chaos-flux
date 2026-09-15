import type { ExpressionCompiler, RendererEnv } from '@nop-chaos/flux-core';
import { createPrivateEvalScope } from './flux-eval.js';
import type { DataBinding } from '../schemas.js';

export type TransformErrorHandler = (code: string, message: string, error?: unknown) => void;

/**
 * 值转换引擎（design-data-binding.md §5，I2.2）：
 * 固定顺序 range（线性映射 + clamp + 防除零回 outputMin）→ convert（flux 表达式注入
 * `value` 变量）→ condition（真值二选一）。
 * 错误语义（D6 对齐）：单项失败回退原值 + 按 (binding.id, code) 去重上报，成功后清去重记录。
 * convert/condition 编译缓存按表达式（WD-3 同款：engine 随 compiler 身份创建，生命周期一致）。
 */
export class TransformEngine {
  private compileCache = new Map<string, ReturnType<ExpressionCompiler['compileValue']>>();
  private lastReported = new Map<string, string>();

  constructor(
    private compiler: ExpressionCompiler,
    private env: RendererEnv,
    private onError?: TransformErrorHandler,
  ) {}

  /** 诊断通道延迟接线（hook 经 effect 注入，避免 render 期 ref 访问）。 */
  setErrorHandler(handler?: TransformErrorHandler): void {
    this.onError = handler;
  }

  apply(binding: DataBinding, value: unknown): unknown {
    const { transform, condition } = binding;
    let result = value;
    if (transform?.range) {
      result = applyRange(result, transform.range);
    }
    if (transform?.convert) {
      result = this.applyConvert(binding, result, transform.convert);
    }
    if (condition) {
      result = this.applyCondition(binding, result, condition);
    }
    return result;
  }

  private reportOnce(binding: DataBinding, code: string, error: unknown): void {
    const dedupKey = `${binding.id}::${code}`;
    if (this.lastReported.get(dedupKey) === code) return;
    this.lastReported.set(dedupKey, code);
    this.onError?.(code, error instanceof Error ? error.message : String(error), error);
  }

  private getCompiled(source: string): ReturnType<ExpressionCompiler['compileValue']> | undefined {
    const cached = this.compileCache.get(source);
    if (cached) return cached;
    try {
      const compiled = this.compiler.compileValue(source);
      if (compiled.kind === 'dynamic') {
        this.compileCache.set(source, compiled);
      }
      return compiled;
    } catch (error) {
      this.onError?.('transform-compile-failed', error instanceof Error ? error.message : String(error), error);
      return undefined;
    }
  }

  private applyConvert(binding: DataBinding, value: unknown, convert: string): unknown {
    const compiled = this.getCompiled(convert);
    if (!compiled || compiled.kind !== 'dynamic') return value;
    try {
      const scope = createPrivateEvalScope({ value });
      const result = this.compiler.evaluateValue(compiled, scope, this.env);
      this.lastReported.delete(`${binding.id}::transform-convert-failed`);
      return result;
    } catch (error) {
      this.reportOnce(binding, 'transform-convert-failed', error);
      return value;
    }
  }

  private applyCondition(
    binding: DataBinding,
    value: unknown,
    condition: NonNullable<DataBinding['condition']>,
  ): unknown {
    const compiled = this.getCompiled(condition.expression);
    if (!compiled || compiled.kind !== 'dynamic') return value;
    let truthy: unknown;
    try {
      const scope = createPrivateEvalScope({ value });
      truthy = this.compiler.evaluateValue(compiled, scope, this.env);
      this.lastReported.delete(`${binding.id}::transform-condition-failed`);
    } catch (error) {
      this.reportOnce(binding, 'transform-condition-failed', error);
      return value;
    }
    return truthy ? condition.trueValue : condition.falseValue;
  }

  /** 值变更后清去重记录（桥接在求值成功路径调用，允许下次失败再报）。 */
  clearDedupFor(binding: DataBinding): void {
    this.lastReported.delete(`${binding.id}::transform-convert-failed`);
    this.lastReported.delete(`${binding.id}::transform-condition-failed`);
  }
}

function applyRange(
  value: unknown,
  range: NonNullable<NonNullable<DataBinding['transform']>['range']>,
): unknown {
  if (typeof value !== 'number' || Number.isNaN(value)) return value;
  const [inputMin, inputMax] = range.input;
  const [outputMin, outputMax] = range.output;
  const span = inputMax - inputMin;
  if (span === 0) return outputMin;
  const t = Math.max(0, Math.min(1, (value - inputMin) / span));
  return outputMin + t * (outputMax - outputMin);
}
