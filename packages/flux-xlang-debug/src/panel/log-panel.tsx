import { useStore } from 'zustand/react';
import { useEffect, useRef, useState } from 'react';
import type { DebugClient, XlangLogEntry } from '../client/debug-client.js';
import type { DebugStore } from '../state/debug-store.js';
import { t } from '@nop-chaos/flux-i18n';

export interface LogPanelProps {
  store: DebugStore;
  client: DebugClient;
}

/**
 * 日志面板（plan 620）：client.onLog 订阅（evt.log 单条/evt.logs 批量拆帧）+
 * store.exceptions（evt.exception）。日志行数上限 500（F6 滚动性能登记）。
 */
export function LogPanel({ store, client }: LogPanelProps) {
  const exceptions = useStore(store, (s) => s.exceptions);
  const [logs, setLogs] = useState<Array<XlangLogEntry & { id: number }>>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const unsubscribe = client.onLog((entry) => {
      const id = nextId.current++;
      setLogs((prev) => {
        const next = [...prev, { ...entry, id }];
        return next.length > 500 ? next.slice(next.length - 500) : next;
      });
    });
    return unsubscribe;
  }, [client]);

  return (
    <div className="xlang-debug-logs" data-testid="xlang-debug-logs">
      {logs.length === 0 && exceptions.length === 0 && <div>{t('flux.xlangDebug.noLogs')}</div>}
      {logs.map((entry) => (
        <div key={entry.id} className={`xlang-debug-log xlang-debug-log-${entry.level}`}>
          {entry.message}
        </div>
      ))}
      {exceptions.map((e) => (
        <div key={`${e.message}-${e.errorCode ?? ''}-${e.sourcePath ?? ''}-${e.line ?? 0}`} className="xlang-debug-exception-line" data-testid="xlang-debug-exception">
          {e.message}
          {e.errorCode ? ` (${e.errorCode})` : ''}
        </div>
      ))}
    </div>
  );
}
