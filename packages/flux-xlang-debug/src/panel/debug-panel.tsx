import { useState } from 'react';
import { useStore } from 'zustand/react';
import type { DebugClient } from '../client/debug-client.js';
import type { DebugStore } from '../state/debug-store.js';
import { t } from '@nop-chaos/flux-i18n';
import { ControlButtons } from './control-buttons.js';
import { CallStackPanel } from './call-stack-panel.js';
import { VariablesTree } from './variables-tree.js';
import { EvalInput } from './eval-input.js';
import { LogPanel } from './log-panel.js';

export interface DebugPanelProps {
  store: DebugStore;
  client: DebugClient;
  // plan 621 审计 B8：620 曾声明的可选 getSourcePath 摘除——面板按 threadId
  // 直查（getStackInfo/getFrameVariables），文档锚点面板零消费
}

type TabKey = 'variables' | 'stack' | 'logs';

/**
 * 调试面板装配（plan 620 Phase 2，D5 §3.4 panel 模块）：
 * 交互态（threadId/frameIndex/muted）提升为本地 state 下发 props（F2 裁定——
 * 不进 store）；threadId 默认 = store.suspended[0]；面板数据不进 store——
 * 变量/栈按 threadId 直查。
 */
export function DebugPanel({ store, client }: DebugPanelProps) {
  const suspended = useStore(store, (s) => s.suspended);
  const [tab, setTab] = useState<TabKey>('variables');
  const [frameIndex, setFrameIndex] = useState(0);
  const [muted, setMuted] = useState(false);

  const threadId = suspended[0]?.threadId ?? 0;
  const notSuspended = suspended.length === 0;

  return (
    <div className="xlang-debug-panel" data-testid="xlang-debug-panel">
      <ControlButtons store={store} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
      <div className="xlang-debug-tabs" role="tablist">
        {(
          [
            ['variables', t('flux.xlangDebug.variables')],
            ['stack', t('flux.xlangDebug.callStack')],
            ['logs', t('flux.xlangDebug.logs')],
          ] as Array<[TabKey, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'xlang-debug-tab active' : 'xlang-debug-tab'}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="xlang-debug-tab-content">
        {notSuspended && tab !== 'logs' && (
          <div data-testid="xlang-debug-not-suspended">{t('flux.xlangDebug.notSuspended')}</div>
        )}
        {(!notSuspended || tab === 'logs') && tab === 'variables' && (
          <>
            <VariablesTree store={store} client={client} threadId={threadId} frameIndex={frameIndex} />
            <EvalInput client={client} threadId={threadId} frameIndex={frameIndex} disabled={notSuspended} />
          </>
        )}
        {(!notSuspended || tab === 'logs') && tab === 'stack' && (
          <CallStackPanel
            client={client}
            threadId={threadId}
            frameIndex={frameIndex}
            onFrameSelect={setFrameIndex}
          />
        )}
        {tab === 'logs' && <LogPanel store={store} client={client} />}
      </div>
    </div>
  );
}
