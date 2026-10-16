import { useStore } from 'zustand/react';
import { useEffect, useState } from 'react';
import type { DebugClient } from '../client/debug-client.js';
import type { DebugStore } from '../state/debug-store.js';
import { t } from '@nop-chaos/flux-i18n';

interface StackFrameRow {
  sourcePath?: string;
  line?: number;
  funcName?: string;
}

export interface CallStackPanelProps {
  store: DebugStore;
  client: DebugClient;
  threadId: number;
  frameIndex: number;
  onFrameSelect: (frameIndex: number) => void;
}

/**
 * 调用栈面板（plan 620 F1：getStackInfo → 栈帧列表，选中 frameIndex 下发）。
 * 面板数据不进 store——按 threadId 直查（D5 §3.4）。
 */
export function CallStackPanel({ client, threadId, frameIndex, onFrameSelect }: Omit<CallStackPanelProps, 'store'>) {
  const [stack, setStack] = useState<StackFrameRow[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = client
      .query<{ stackInfo: { stackTrace?: StackFrameRow[] } | null }>('debugger.getStackInfo', { threadId })
      .then((result) => {
        if (cancelled) return;
        setStack(result?.stackInfo?.stackTrace ?? []);
        setLoadFailed(false);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
      void load;
    };
  }, [client, threadId]);

  if (loadFailed) {
    return <div className="xlang-debug-error" data-testid="xlang-debug-stack-error">{t('flux.xlangDebug.loadFailed')}</div>;
  }
  if (!stack) {
    return <div className="xlang-debug-loading">{t('flux.xlangDebug.noStackInfo')}</div>;
  }
  return (
    <ul className="xlang-debug-stack" data-testid="xlang-debug-stack">
      {stack.map((frame, index) => (
        <li key={JSON.stringify(frame)}>
          <button
            type="button"
            className={index === frameIndex ? 'xlang-debug-frame active' : 'xlang-debug-frame'}
            onClick={() => onFrameSelect(index)}
          >
            #{index} {frame.funcName ?? '?'} {frame.sourcePath ?? ''}:{frame.line ?? ''}
          </button>
        </li>
      ))}
      {stack.length === 0 && <li>{t('flux.xlangDebug.noStackInfo')}</li>}
    </ul>
  );
}

/** 挂起线程守卫版：无挂起线程时显示占位（供 DebugPanel 直接用）。 */
export function CallStackPanelGuarded(props: CallStackPanelProps) {
  const suspended = useStore(props.store, (s) => s.suspended);
  if (suspended.length === 0) {
    return <div data-testid="xlang-debug-not-suspended">{t('flux.xlangDebug.noSuspendedThread')}</div>;
  }
  return <CallStackPanel {...props} />;
}
