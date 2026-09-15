import { useEffect, useMemo, useRef } from 'react';
import { useScopeSelector } from '@nop-chaos/flux-react';
import type { AnimationConfig } from '../../schemas.js';
import type { DiagnosticEvent, SceneManager } from '../../engine/scene-manager.js';

export interface UseAnimationClipsArgs {
  animations?: AnimationConfig[];
  engine: SceneManager | null;
  /** 非升级诊断通道 */
  onError?: (code: string, message: string) => void;
}

/**
 * 关键帧 clip 接线（plan 466 Phase 4，design-data-binding.md §6）：
 * - clips 注册随 animations/engine（引擎拒绝退化 clip 并诊断）。
 * - state 触发：全部 trigger.source 去重合并为**单次** useScopeSelector（rules-of-hooks 安全），
 *   scope 值满足 trigger.value（未声明则路径有值即触发）时 engine.startClip。
 * - event 触发：组件经 useThreeEvents 的 onEvent 转发至 engine.notifyEvent。
 */
export function useAnimationClips(args: UseAnimationClipsArgs): void {
  const { animations, engine, onError } = args;

  const stateClips = useMemo(
    () => (animations ?? []).filter((a) => a.trigger.type === 'state'),
    [animations],
  );
  const statePaths = useMemo(() => {
    const paths = new Set<string>();
    for (const clip of stateClips) {
      if (clip.trigger.source) paths.add(clip.trigger.source);
    }
    return [...paths].sort();
  }, [stateClips]);

  const latest = useRef({ stateClips, onError });
  useEffect(() => {
    latest.current = { stateClips, onError };
  });

  useEffect(() => {
    if (!engine || !animations || animations.length === 0) return;
    engine.registerClips(animations, (event: DiagnosticEvent) => {
      latest.current.onError?.(event.code, event.message);
    });
  }, [animations, engine]);

  const scopeData = useScopeSelector<Record<string, unknown>, Record<string, unknown>>(
    (snapshot) => snapshot,
    Object.is,
    {
      enabled: statePaths.length > 0,
      fallback: {},
      paths: statePaths,
    },
  );

  useEffect(() => {
    if (!engine || statePaths.length === 0) return;
    for (const clip of latest.current.stateClips) {
      const value = readPath(scopeData, clip.trigger.source);
      const satisfied =
        clip.trigger.value === undefined ? value !== undefined : Object.is(value, clip.trigger.value);
      if (satisfied) {
        engine.startClip(clip.id);
      }
    }
  }, [engine, scopeData, statePaths]);
}

function readPath(data: Record<string, unknown>, path: string): unknown {
  let node: unknown = data;
  for (const part of path.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}
