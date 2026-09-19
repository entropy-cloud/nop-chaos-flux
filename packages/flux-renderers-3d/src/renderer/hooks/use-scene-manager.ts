import { useEffect, useRef, useState } from 'react';
import { SceneManager, type DiagnosticEvent, type SceneManagerOptions } from '../../engine/scene-manager.js';
import type { ThreeSceneConfig } from '../../schemas.js';

export interface UseSceneManagerArgs {
  config: ThreeSceneConfig | undefined;
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** meta.visible 入参：true→false 完整 dispose，false→true 重新 init（ref 赋值不触发 effect） */
  visible: boolean;
  options?: SceneManagerOptions;
  onError?: (e: DiagnosticEvent) => void;
  onStateChange?: (state: 'empty' | 'loading' | 'ready' | 'error') => void;
  /** plan 473 (V3-F4): GLTF 加载进度比例（0..1）；null = 不确定态（图元/无 total）。 */
  onProgress?: (ratio: number | null) => void;
  /** plan 473 (V3-F4): 递增强制重建引擎实例（error 态 Retry 按钮）。 */
  reloadKey?: number;
  /**
   * plan 473 (V3-F4): 观测句柄键。设置后把 manager 挂到
   * `window.__flux_three_handles[key]`（getScene/getRenderer），供 e2e/自动化
   * 程序化断言；testid 非空即注册，生产构建同样存在——勿放敏感数据。
   */
  debugHandleKey?: string;
}

/**
 * 引擎实例生命周期 hook（design-renderer.md §3/§7）：visible 驱动 true→false dispose /
 * false→true init；ResizeObserver 尺寸同步（无 ResizeObserver 环境优雅降级）；
 * config 变更重建实例。webgl-unavailable 等诊断经 onError 透出并置 error 态。
 * 诊断/状态回调经 latest ref 取最新（scada use-scada-engine 同款，react-compiler 友好）。
 */
export function useSceneManager(args: UseSceneManagerArgs): SceneManager | null {
  const { config, containerRef, visible, reloadKey } = args;
  const latest = useRef(args);
  useEffect(() => {
    latest.current = args;
  });
  const [instance, setInstance] = useState<SceneManager | null>(null);

  const active = visible && config !== undefined;

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    const manager = new SceneManager(config as ThreeSceneConfig, latest.current.options);
    latest.current.onStateChange?.('loading');
    if (container) {
      manager.attach(container);
    }
    manager.init((event) => {
      latest.current.onStateChange?.('error');
      latest.current.onError?.(event);
    });
    setInstance(manager);
    const g = globalThis as typeof globalThis & { __flux_three_handles?: Record<string, SceneManager> };
    if (args.debugHandleKey) {
      g.__flux_three_handles ??= {};
      g.__flux_three_handles[args.debugHandleKey] = manager;
    }
    void manager.loadModels((event) => {
      latest.current.onError?.(event);
    }, (ratio) => {
      latest.current.onProgress?.(ratio);
    });
    let observer: ResizeObserver | undefined;
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => manager.resize());
      observer.observe(container);
    }
    return () => {
      observer?.disconnect();
      const g = globalThis as typeof globalThis & { __flux_three_handles?: Record<string, SceneManager> };
      if (args.debugHandleKey && g.__flux_three_handles?.[args.debugHandleKey] === manager) {
        delete g.__flux_three_handles[args.debugHandleKey];
      }
      manager.dispose();
      setInstance(null);
    };
  }, [active, config, containerRef, reloadKey, args.debugHandleKey]);

  return instance;
}
