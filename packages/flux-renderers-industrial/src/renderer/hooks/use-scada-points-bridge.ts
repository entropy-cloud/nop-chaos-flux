import { useCallback, useEffect, useMemo, useRef } from 'react';
import { getIn, type ExpressionCompiler, type RendererEnv, type ScopeRef } from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import type { ScadaConfig, ScadaPrimitive } from '../../serialization/config-types.js';
import { PointStore } from '../../binding/point-store.js';
import { errorMessage } from '../scada-errors.js';
import { RefreshPipeline, type ApplyAttrs } from '../../binding/dirty-collector.js';

const FLUX_REF_PATTERN = /\$([a-zA-Z_][a-zA-Z0-9_-]*)(\.[a-zA-Z0-9_-]+)*/g;

/** `$xxx`/`$xxx.yyy` 引用提取（`$`=flux scope 前缀，与 `@{pointId}` 组态点表引用前缀隔离）。 */
export function extractFluxRefs(source: string): string[] {
  const refs: string[] = [];
  const pattern = new RegExp(FLUX_REF_PATTERN.source, FLUX_REF_PATTERN.flags);
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    refs.push(match[0].slice(1));
  }
  return refs;
}

/**
 * config 扫描 → `$xxx` 引用集 → useScopeSelector paths 数组（精细化失效，漏订阅/过订阅由单测固化）。
 * 覆盖三种写法：`$analog.temp`（简写）、`${analog.temp}`（平台表达式纯路径）、裸路径 `analog.temp`。
 */
export function extractFluxScopePaths(config: ScadaConfig): string[] {
  const paths = new Set<string>();
  for (const decl of config.variables ?? []) {
    if (decl.source !== 'flux' || typeof decl.flux !== 'string') continue;
    const source = decl.flux.trim();
    const refs = extractFluxRefs(source);
    if (refs.length > 0) {
      for (const ref of refs) paths.add(ref);
      continue;
    }
    const direct = /^\$\{([^{}]+)\}$/.exec(source);
    const candidate = (direct?.[1] ?? source).trim();
    if (/^[a-zA-Z_][a-zA-Z0-9_.-]*$/.test(candidate)) paths.add(candidate);
  }
  return [...paths].sort();
}

/** scada `$xxx` 简写 → 平台 `${...}` 表达式语法（flux-formula/flux-compiler 求值入口）。 */
export function normalizeFluxExpression(flux: string): string {
  const trimmed = flux.trim();
  if (trimmed.startsWith('${')) return trimmed;
  return `\${${trimmed.replace(/^\$/, '')}}`;
}

function isScadaPrimitive(value: unknown): value is ScadaPrimitive {
  return typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string';
}

/**
 * 私有求值子 scope（design-data-binding.md §9.1）：注入点表上下文 + scope 快照，
 * 非 schema-visible scope（INV-4 边界），仅供 flux 表达式编译求值读取。
 */
export function createPrivateEvalScope(data: Record<string, unknown>): ScopeRef {
  return {
    id: 'scada-flux-eval',
    path: '$',
    value: data,
    get(path: string) {
      return getIn(data, path);
    },
    has(path: string) {
      return getIn(data, path) !== undefined;
    },
    readOwn: () => data,
    readVisible: () => data,
    materializeVisible: () => data,
    update: () => undefined,
    merge: () => undefined,
  };
}

export interface ScadaPointsBridgeRuntime {
  pointStore: PointStore;
  pipeline: RefreshPipeline;
  applyAttrs: ApplyAttrs;
}

export interface UseScadaPointsBridgeArgs {
  config: ScadaConfig | undefined;
  runtime: ScadaPointsBridgeRuntime | null;
  enabled?: boolean;
  expressionCompiler: ExpressionCompiler;
  env: RendererEnv;
  onError?: (code: string, message: string) => void;
}

/**
 * 点表↔flux 桥接（I10.3，design-renderer.md §8.3/design-data-binding.md §9.1）：
 * useScopeSelector（paths 精细化失效）订阅 scope 数据流 → flux-formula 编译求值 →
 * PointStore.setPointValues 批量注入 → 刷新流水线合帧（不逐点 setState 直刷 React，性能红线）。
 * 错误降级（P1-8）：单声明编译/求值失败 → 跳过该声明（continue）+ lastError 式去重上报
 * （同表达式同错误码仅在变化时上报一次；该声明求值成功后清空去重记录，允许下次失败再报），
 * 不升级画布 status（scada-canvas 不把 onError 直通 handleError，§8.1 onError 仅限 config 错误）。
 */
export function useScadaPointsBridge(args: UseScadaPointsBridgeArgs): void {
  const { config, runtime, enabled = true, expressionCompiler, env, onError } = args;
  const paths = useMemo(() => (config ? extractFluxScopePaths(config) : []), [config]);
  const scopeData = useScopeSelector<Record<string, unknown>, Record<string, unknown>>(
    (snapshot) => snapshot,
    Object.is,
    {
      enabled: enabled && paths.length > 0,
      fallback: {},
      paths,
    },
  );
  const compiledCache = useRef(new Map<string, ReturnType<ExpressionCompiler['compileValue']>>());
  const lastReportedErrors = useRef(new Map<string, string>());
  const latest = useRef({ expressionCompiler, env, onError });
  useEffect(() => {
    latest.current = { expressionCompiler, env, onError };
  });

  const reportOnce = useCallback((expression: string, code: string, error: unknown) => {
    if (lastReportedErrors.current.get(expression) === code) return;
    lastReportedErrors.current.set(expression, code);
    latest.current.onError?.(code, errorMessage(error));
  }, []);

  useEffect(() => {
    if (!enabled || !config || !runtime) return;
    const fluxPoints = (config.variables ?? []).filter(
      (decl) => decl.source === 'flux' && typeof decl.flux === 'string',
    );
    if (fluxPoints.length === 0) return;

    const pointValues: Record<string, unknown> = {};
    for (const pointId of runtime.pointStore.pointIds()) {
      const value = runtime.pointStore.getPointValue(pointId);
      if (value !== undefined) pointValues[pointId] = value;
    }
    const evalScope = createPrivateEvalScope({ ...pointValues, ...scopeData });

    const values: Record<string, ScadaPrimitive> = {};
    for (const decl of fluxPoints) {
      const expression = normalizeFluxExpression(decl.flux as string);
      let compiled = compiledCache.current.get(expression);
      if (compiled === undefined) {
        try {
          compiled = latest.current.expressionCompiler.compileValue(expression);
        } catch (error) {
          reportOnce(expression, 'flux-compile-failed', error);
          continue;
        }
        compiledCache.current.set(expression, compiled);
      }
      let value: unknown;
      try {
        value = latest.current.expressionCompiler.evaluateValue(compiled, evalScope, latest.current.env);
      } catch (error) {
        reportOnce(expression, 'flux-evaluate-failed', error);
        continue;
      }
      lastReportedErrors.current.delete(expression);
      if (isScadaPrimitive(value)) {
        values[decl.id] = value;
      }
    }
    if (Object.keys(values).length > 0) {
      runtime.pointStore.setPointValues(values);
      runtime.pipeline.requestRender(runtime.applyAttrs);
    }
  }, [config, runtime, enabled, scopeData, reportOnce]);
}
