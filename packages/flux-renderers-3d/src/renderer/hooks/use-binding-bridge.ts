import { useEffect, useMemo, useRef } from 'react';
import type { ExpressionCompiler, RendererEnv } from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import { analyzeBindingSubscriptions, createPrivateEvalScope, normalizeBindingExpression } from '../../binding/flux-eval.js';
import { TransformEngine } from '../../binding/transform-engine.js';
import type { DataBinding } from '../../schemas.js';
import type { SceneManager } from '../../engine/scene-manager.js';

export interface UseBindingBridgeArgs {
  bindings?: DataBinding[];
  sceneManager: SceneManager | null;
  expressionCompiler: ExpressionCompiler;
  env: RendererEnv;
  /** 非升级诊断通道：(code, message, error?)，调用方做 (表达式, code) 去重外的展示 */
  onError?: (code: string, message: string, error?: unknown) => void;
  /**
   * 值转换覆写（缺省使用 TransformEngine：range→convert→condition，design-data-binding §5）。
   */
  transform?: (binding: DataBinding, value: unknown) => unknown;
}

interface CompiledBinding {
  raw: DataBinding;
  compiled: ReturnType<ExpressionCompiler['compileValue']>;
}

/**
 * 绑定桥接（design-data-binding.md §3）：analyze（订阅路径 + deps-empty 嫌疑）→
 * useScopeSelector paths 精确订阅 → compileValue/evaluateValue 求值 → Object.is 比较
 * （lastValues ref，selector 侧无副作用）→ pendingUpdates 队列 → 引擎帧边界 drain。
 *
 * 错误语义（D6）：单 binding 编译/求值失败跳过 + reportOnce 去重上报（成功后清去重记录）；
 * deps-empty 诊断产生在 analyze 期，不受 enabled 影响。
 * 引擎重建/换绑：注册 effect 以 bindings + sceneManager identity 为依赖，重挂时同步丢弃
 * pending 队列与 lastValues（防 stale 写入）。
 */
export function useBindingBridge(args: UseBindingBridgeArgs): void {
  const { bindings, sceneManager, expressionCompiler, env, onError, transform } = args;

  const compiledBindingsRef = useRef<CompiledBinding[]>([]);
  const compiledCacheRef = useRef(new Map<string, CompiledBinding>());
  const lastValuesRef = useRef(new Map<string, unknown>());
  const pendingRef = useRef<Array<{ modelId: string; path: string; value: unknown }>>([]);
  const lastReportedRef = useRef(new Map<string, string>());
  const latest = useRef({ transform, onError });
  useEffect(() => {
    latest.current = { transform, onError };
  });
  // TransformEngine 默认转换核（随 compiler/env 身份创建；诊断通道经 effect 延迟接线）
  const transformEngine = useMemo(() => new TransformEngine(expressionCompiler, env), [expressionCompiler, env]);
  useEffect(() => {
    transformEngine.setErrorHandler((code, message, error) => {
      latest.current.onError?.(code, message, error);
    });
  }, [transformEngine]);

  const { paths, depsEmptyExpressions } = useMemo(
    () => analyzeBindingSubscriptions(bindings ?? [], { compiler: expressionCompiler, env }),
    [bindings, expressionCompiler, env],
  );

  // 编译缓存随 bindings/compiler 变更清空（WD-3 防无界增长 + 换 compiler 重产 compiled）
  useEffect(() => {
    compiledCacheRef.current.clear();
    compiledBindingsRef.current = [];
    lastReportedRef.current.clear();
  }, [bindings, expressionCompiler]);

  // deps-empty 诊断（analyze/config 期，不受 enabled 影响；一次性）
  const reportedDepsEmptyRef = useRef(new Set<string>());
  useEffect(() => {
    for (const expression of depsEmptyExpressions) {
      if (reportedDepsEmptyRef.current.has(expression)) continue;
      reportedDepsEmptyRef.current.add(expression);
      latest.current.onError?.(
        'flux-deps-empty',
        `Complex flux expression '${expression}' subscription paths could not be collected; the expression may not reactively update`,
      );
    }
  }, [depsEmptyExpressions]);

  const scopeData = useScopeSelector<Record<string, unknown>, Record<string, unknown>>(
    (snapshot) => snapshot,
    Object.is,
    {
      enabled: paths.length > 0,
      fallback: {},
      paths,
    },
  );

  // scope 变化 → 全量重算绑定 → 与 lastValues 比较 → pending 队列（帧边界批量应用）
  useEffect(() => {
    if (paths.length === 0 || !bindings) return;
    const reportOnce = (bindingKey: string, code: string, error: unknown) => {
      const dedupKey = `${bindingKey}::${code}`;
      if (lastReportedRef.current.get(dedupKey) === code) return;
      lastReportedRef.current.set(dedupKey, code);
      latest.current.onError?.(code, error instanceof Error ? error.message : String(error), error);
    };
    const getCompiled = (binding: DataBinding): CompiledBinding | undefined => {
      const expression = normalizeBindingExpression(binding.source.expression);
      const cached = compiledCacheRef.current.get(expression);
      if (cached) return cached;
      try {
        const compiled = expressionCompiler.compileValue(expression);
        const entry: CompiledBinding = { raw: binding, compiled };
        if (compiled.kind === 'dynamic') {
          compiledCacheRef.current.set(expression, entry);
        }
        return entry;
      } catch (error) {
        reportOnce(expression, 'flux-compile-failed', error);
        return undefined;
      }
    };
    const evalScope = createPrivateEvalScope({ ...scopeData });
    for (const binding of bindings) {
      const entry = getCompiled(binding);
      if (!entry) continue;
      if (entry.compiled.kind !== 'dynamic') continue;
      let value: unknown;
      try {
        value = expressionCompiler.evaluateValue(entry.compiled, evalScope, env);
      } catch (error) {
        reportOnce(binding.source.expression, 'flux-evaluate-failed', error);
        continue;
      }
      lastReportedRef.current.delete(`${binding.source.expression}::flux-evaluate-failed`);
      lastReportedRef.current.delete(`${binding.source.expression}::flux-compile-failed`);
      const last = lastValuesRef.current.get(binding.id);
      if (Object.is(value, last)) continue;
      lastValuesRef.current.set(binding.id, value);
      const transformed = latest.current.transform
        ? latest.current.transform(binding, value)
        : transformEngine.apply(binding, value);
      pendingRef.current.push({
        modelId: binding.target.modelId,
        path: binding.target.path,
        value: transformed,
      });
    }
  }, [scopeData, bindings, expressionCompiler, env, paths, transformEngine]);

  // 队列注册：bindings + sceneManager identity 双依赖（引擎重建后新实例必须重新注册）；
  // 仅在实例或绑定真正变更（重挂/重建）时丢弃 pending 与 lastValues（防 stale 写入），
  // 首次挂载不清——否则会抹掉挂载期已求值的绑定初值
  const registeredForRef = useRef<{ engine: SceneManager | null; bindings: DataBinding[] | undefined } | null>(null);
  useEffect(() => {
    if (!sceneManager) return;
    const registered = registeredForRef.current;
    // 首次挂载不清（挂载期已求值的初值就在 pending 里）；仅真正换绑/引擎重建时丢弃 stale
    if (registered && (registered.engine !== sceneManager || registered.bindings !== bindings)) {
      pendingRef.current = [];
      lastValuesRef.current.clear();
    }
    registeredForRef.current = { engine: sceneManager, bindings };
    sceneManager.setFrameUpdateQueue({
      drain: () => pendingRef.current.splice(0),
    });
  }, [bindings, sceneManager]);
}
