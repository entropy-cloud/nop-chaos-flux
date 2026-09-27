/**
 * React 会话挂接（S1 §4.2）。
 *
 * `createPageDesignerSession` 经惰性 ref 创建一次（命令通道稳定），
 * 会话状态经 `useSyncExternalStore` 订阅（zustand vanilla 同款订阅纪律：
 * editor-core getState 返回缓存快照引用，引用稳定可作 snapshot）。
 */

import { useCallback, useState, useSyncExternalStore } from 'react';
import type { EditorSessionState } from '@nop-chaos/editor-core';
import type {
  DesignerDocument,
  PageDesignerSession,
  PageDesignerSessionOptions,
} from '@nop-chaos/page-designer-core';
import { createPageDesignerSession } from '@nop-chaos/page-designer-core';

export interface UseDesignerSessionResult {
  session: PageDesignerSession;
  state: EditorSessionState<DesignerDocument>;
}

export function useDesignerSession(options: PageDesignerSessionOptions): UseDesignerSessionResult {
  // 惰性初始化一次（options 由调用方 useMemo 稳定；后续变更不重建会话）。
  const [session] = useState<PageDesignerSession>(() => createPageDesignerSession(options));

  const subscribe = useCallback(
    (listener: () => void) => session.subscribe(listener),
    [session],
  );

  const getSnapshot = useCallback(() => session.getSnapshot(), [session]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { session, state };
}
