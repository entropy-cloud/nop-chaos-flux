import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PivotTable } from '@visactor/vtable';
import type { PivotTableConstructorOptions } from '@visactor/vtable';
import type { RendererComponentProps, RendererEventHandler } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { Spinner, cn } from '@nop-chaos/ui';
import type { PivotTableSchema } from './schemas.js';
import {
  buildPivotOption,
  mapDesignTokensToVTableTheme,
  mergeThemeOverrides,
  resolveDesignTokens,
  type DesignTokenThemeInput,
} from './pivot-option.js';
import { attachPivotEvents } from './pivot-events.js';

const DEFAULT_HEIGHT = 320;

/** 模块级 warn-once（避免 render 期读写 ref，react-hooks/refs 纪律）。 */
const warnedGlobalKeys = new Set<string>();

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

function warnOnce(key: string, message: string): void {
  if (warnedGlobalKeys.has(key)) {
    return;
  }
  warnedGlobalKeys.add(key);
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[pivot-table] ${message}`);
  }
}

/** records/source 双入口：source 优先，二者同设 dev warn（chart series/source 裁定延续）。 */
function resolvePivotData(resolved: Record<string, unknown>): unknown[] {
  const source = resolved.source;
  const records = resolved.records;
  if (source !== undefined && records !== undefined) {
    warnOnce('dual-entry', 'records 与 source 同时设置，source 优先');
  }
  const selected = source !== undefined ? source : records;
  return Array.isArray(selected) ? selected : [];
}

function buildOptionSignature(option: PivotTableConstructorOptions): string {
  const { records: _records, ...rest } = option;
  return JSON.stringify(rest);
}

/** 主题响应：监听 document root class 变化（`.dark` 切换）→ 重解析 CSS 变量（map 先例）。 */
function usePivotTheme(): DesignTokenThemeInput {
  const [tokens, setTokens] = useState<DesignTokenThemeInput>(() => resolveDesignTokens());
  useEffect(() => {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
      return;
    }
    const observer = new MutationObserver(() => {
      setTokens(resolveDesignTokens());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);
  return tokens;
}

// 测试/程序化断言锚点：以 schema id 为键（cid 为 per-runtime 计数器，多 SchemaRenderer
// 并存时可能重复；scada `__flux_scada_<cid>` 先例的 id 化变体）。
function exposeInstance(key: string, instance: PivotTable): void {
  if (typeof window === 'undefined' || key.length === 0) {
    return;
  }
  (window as unknown as Record<string, unknown>)[`__flux_pivot_${key}`] = { instance };
}

function clearExposedInstance(key: string): void {
  if (typeof window === 'undefined' || key.length === 0) {
    return;
  }
  delete (window as unknown as Record<string, unknown>)[`__flux_pivot_${key}`];
}

export function PivotTableRenderer(props: RendererComponentProps<PivotTableSchema>) {
  const resolved = props.props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<PivotTable | null>(null);
  const optionSignatureRef = useRef<string | null>(null);
  const dataRef = useRef<unknown[] | null>(null);
  const handlersRef = useRef<Record<string, RendererEventHandler | undefined>>(props.events);
  const [initError, setInitError] = useState<string | null>(null);

  const themeTokens = usePivotTheme();

  const data = useMemo(() => resolvePivotData(resolved), [resolved]);
  const baseOption = useMemo(() => buildPivotOption(resolved, data), [resolved, data]);
  // schema `theme` 覆盖映射结果（design.md §5：映射层产出后按 key/section 覆盖；theme 变化走 option 签名路径）
  const option = useMemo<PivotTableConstructorOptions | null>(() => {
    if (!baseOption) {
      return null;
    }
    const schemaTheme =
      resolved.theme && typeof resolved.theme === 'object' && !Array.isArray(resolved.theme)
        ? (resolved.theme as Record<string, unknown>)
        : {};
    return {
      ...baseOption,
      theme: mergeThemeOverrides(mapDesignTokensToVTableTheme(themeTokens), schemaTheme),
    };
  }, [baseOption, themeTokens, resolved.theme]);

  const empty = baseOption === null || data.length === 0;
  const loading = resolved.loading === true;

  const height = typeof resolved.height === 'number'
    ? `${resolved.height}px`
    : typeof resolved.height === 'string'
      ? resolved.height
      : `${DEFAULT_HEIGHT}px`;

  // 最新事件 handler 镜像：bridge 每次触发读取最新（避免闭包过期）。
  useEffect(() => {
    handlersRef.current = props.events;
  });

  useEffect(() => {
    if (loading || empty || option === null) {
      const instance = instanceRef.current;
      if (instance) {
        instanceRef.current = null;
        optionSignatureRef.current = null;
        dataRef.current = null;
        try {
          instance.release();
        } catch (error) {
          if (typeof console !== 'undefined' && typeof console.error === 'function') {
            console.error('[pivot-table] 实例 release 抛错', error);
          }
        }
        clearExposedInstance(props.id);
      }
      return;
    }
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const signature = buildOptionSignature(option);
    const existing = instanceRef.current;
    if (!existing) {
      try {
        const created = new PivotTable(container, option);
        instanceRef.current = created;
        optionSignatureRef.current = signature;
        dataRef.current = data;
        // 恢复成功路径：异步清除错误态（同步 setState 触发 react-hooks/set-state-in-effect）
        queueMicrotask(() => setInitError(null));
        attachPivotEvents({
          instance: created,
          getHandlers: () => handlersRef.current,
          scope: props.node.scope,
        });
        exposeInstance(props.id, created);
      } catch (error) {
        queueMicrotask(() => setInitError(error instanceof Error ? error.message : String(error)));
        if (typeof console !== 'undefined' && typeof console.error === 'function') {
          console.error('[pivot-table] 实例创建失败', error);
        }
      }
      return;
    }
    if (signature !== optionSignatureRef.current) {
      existing.updateOption(option);
      optionSignatureRef.current = signature;
      dataRef.current = data;
    } else if (dataRef.current !== data) {
      existing.setRecords(data);
      dataRef.current = data;
    }
  }, [loading, empty, option, data, props.id, props.meta.cid, props.node.scope]);

  useEffect(() => {
    return () => {
      const instance = instanceRef.current;
      if (instance) {
        instanceRef.current = null;
        try {
          instance.release();
        } catch (error) {
          if (typeof console !== 'undefined' && typeof console.error === 'function') {
            console.error('[pivot-table] 实例 release 抛错', error);
          }
        }
        clearExposedInstance(props.id);
      }
    };
  }, [props.id, props.meta.cid]);

  const commonProps = {
    'data-testid': props.meta.testid || undefined,
    'data-cid': props.meta.cid || undefined,
    'data-slot': 'pivot-table',
    className: cn('nop-pivot', props.meta.className),
  };

  if (loading) {
    return (
      <div {...commonProps} style={{ height }}>
        <div
          data-slot="pivot-loading"
          className="flex h-full w-full items-center justify-center"
        >
          <Spinner className="h-6 w-6" />
        </div>
      </div>
    );
  }

  if (empty) {
    const rawEmpty = props.props.empty;
    const emptyContent = props.regions.empty
      ? asReactNode(props.regions.empty.render())
      : rawEmpty !== undefined && rawEmpty !== null
        ? asReactNode(rawEmpty)
        : t('flux.common.noData');
    return (
      <div {...commonProps} style={{ height }}>
        <div
          data-slot="pivot-empty"
          className="flex h-full w-full items-center justify-center text-sm text-muted-foreground"
        >
          {emptyContent}
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div {...commonProps} style={{ height }}>
        <div
          data-slot="pivot-error"
          className="flex h-full w-full items-center justify-center text-sm text-destructive"
        >
          {t('flux.common.loadFailed')}
        </div>
      </div>
    );
  }

  return (
    <div {...commonProps} style={{ height }}>
      <div ref={containerRef} data-slot="pivot-canvas" className="nop-pivot-canvas" />
    </div>
  );
}
