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
}

/**
 * 引擎实例生命周期 hook（design-renderer.md §3/§7）：visible 驱动 true→false dispose /
 * false→true init；ResizeObserver 尺寸同步（无 ResizeObserver 环境优雅降级）；
 * config 变更重建实例。webgl-unavailable 等诊断经 onError 透出并置 error 态。
 * 诊断/状态回调经 latest ref 取最新（scada use-scada-engine 同款，react-compiler 友好）。
 */
export function useSceneManager(args: UseSceneManagerArgs): SceneManager | null {
  const { config, containerRef, visible } = args;
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
    void manager.loadModels((event) => {
      latest.current.onError?.(event);
    });
    let observer: ResizeObserver | undefined;
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => manager.resize());
      observer.observe(container);
    }
    return () => {
      observer?.disconnect();
      manager.dispose();
      setInstance(null);
    };
  }, [active, config, containerRef]);

  return instance;
}
