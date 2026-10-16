import { useStore } from 'zustand/react';
import type { DebugStore } from '../state/debug-store.js';
import { t } from '@nop-chaos/flux-i18n';

export interface ControlButtonsProps {
  store: DebugStore;
  muted?: boolean;
  onToggleMute?: () => void;
}

/** 控制按钮行（plan 620 F2：映射 store 上行动作；muted 态由装配层拉取回显）。 */
export function ControlButtons({ store, muted, onToggleMute }: ControlButtonsProps) {
  const suspended = useStore(store, (s) => s.suspended.length > 0);
  const firstBreakpoint = useStore(store, (s) => s.breakpoints[0]);
  void store;
  const btn = (label: string, onClick: () => void, disabled = false) => (
    <button
      key={label}
      type="button"
      className="xlang-debug-btn"
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div className="xlang-debug-controls" data-testid="xlang-debug-controls">
      {btn(t('flux.xlangDebug.continueLabel'), () => store.getState().resume(), !suspended)}
      {btn(t('flux.xlangDebug.pause'), () => store.getState().suspend())}
      {btn(t('flux.xlangDebug.stepInto'), () => store.getState().step('into'), !suspended)}
      {btn(t('flux.xlangDebug.stepOver'), () => store.getState().step('over'), !suspended)}
      {btn(t('flux.xlangDebug.stepOut'), () => store.getState().step('out'), !suspended)}
      {btn(t('flux.xlangDebug.runToCursor'), () => {
        if (firstBreakpoint) {
          store.getState().runToPosition(firstBreakpoint);
        }
      }, !firstBreakpoint)}
      {btn(
        muted ? t('flux.xlangDebug.unmuteBreakpoints') : t('flux.xlangDebug.muteBreakpoints'),
        () => {
          store.getState().muteBreakpoints(!muted);
          onToggleMute?.();
        },
      )}
    </div>
  );
}
