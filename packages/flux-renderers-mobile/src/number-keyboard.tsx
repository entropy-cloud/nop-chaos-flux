import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import { useGlobalZIndex } from '@nop-chaos/ui';
import type { NumberKeyboardSchema } from './schemas.js';
import { useLockScroll } from './hooks/use-lock-scroll.js';

/**
 * Virtual number keyboard (plan 669 Phase 1, M11a): controlled bottom-sheet
 * with a 4-row digit grid [1-9][.][0][delete] + a right-side confirm column
 * (antd-mobile/vant layout). `randomOrder` reshuffles the digit keys per
 * mount (Fisher-Yates; the key SET stays invariant). Channel contract:
 * digit/decimal/delete keys dispatch `onKey({ key, value })` (delete omits
 * value); the confirm key dispatches ONLY `onConfirm`.
 */
export function NumberKeyboardRenderer(props: RendererComponentProps<NumberKeyboardSchema>) {
  const slotProps = props.props;
  const disabled = slotProps.disabled === true;
  const decimal = slotProps.decimal !== false;
  const randomOrder = slotProps.randomOrder === true;
  const confirmDisabled = slotProps.confirmDisabled === true;
  const requestedOpen = slotProps.open === true;
  const [open, setOpen] = React.useState(requestedOpen);
  // re-sync when the host flips `open` (render-time adjust instead of an
  // effect mirror; local close via confirm/mask still owns `open` in between)
  const [syncedRequestedOpen, setSyncedRequestedOpen] = React.useState(requestedOpen);
  if (syncedRequestedOpen !== requestedOpen) {
    setSyncedRequestedOpen(requestedOpen);
    setOpen(requestedOpen);
  }

  const zIndex = useGlobalZIndex();
  useLockScroll(open);

  // randomOrder shuffles only 1-9 (vant/antd-mobile convention); 0 stays in
  // the last row. The digit key set {0-9} is invariant across remounts.
  const [digitKeys, setDigitKeys] = React.useState<string[]>(() =>
    ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  );
  // Legitimate effect (plan 859 adjudication): the shuffle draws Math.random()
  // once per open edge; randomness cannot move into render/useMemo, where
  // StrictMode/compiler re-execution would reshuffle a visible keypad.
  React.useEffect(() => {
    const base = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    if (!randomOrder || !open) {
      setDigitKeys(base);
      return;
    }
    // Fisher-Yates per open edge: the key SET {1-9} stays invariant
    const shuffled = [...base];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setDigitKeys(shuffled);
  }, [randomOrder, open]);

  function dispatchKey(key: string, value?: string) {
    if (disabled) return;
    const payload = { type: 'key', key, ...(value !== undefined ? { value } : {}) };
    void props.events.onKey?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: props.node.scope,
    });
  }

  function confirm() {
    if (disabled || confirmDisabled) return;
    const payload = { type: 'confirm' };
    void props.events.onConfirm?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: props.node.scope,
    });
    setOpen(false);
  }

  function cancel() {
    const payload = { type: 'cancel' };
    void props.events.onCancel?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: props.node.scope,
    });
    setOpen(false);
  }

  if (!open) {
    return null;
  }


  const keyButton = (key: string, label: React.ReactNode = key, extraClass?: string) => (
    <button
      type="button"
      data-key={key}
      data-slot="number-keyboard-key"
      disabled={disabled}
      onClick={() => dispatchKey(key, key === 'delete' ? undefined : key)}
      className={cn(
        'flex h-12 items-center justify-center text-xl nop-number-keyboard-key',
        extraClass,
      )}
    >
      {label}
    </button>
  );

  return (
    <div
      data-slot="number-keyboard"
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-disabled={disabled || undefined}
      className={cn('nop-number-keyboard', props.meta.className)}
      style={{ position: 'fixed', inset: 0, zIndex, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
    >
      <div
        data-slot="number-keyboard-mask"
        role="button"
        aria-label={t('flux.mobile.numberKeyboard.cancel', { defaultValue: '取消' })}
        tabIndex={-1}
        onClick={cancel}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === 'Escape' || event.key === 'Enter') cancel();
        }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <div
        data-slot="number-keyboard-panel"
        className="nop-safe-bottom"
        style={{ position: 'relative', zIndex: 1, display: 'flex' }}
      >
        <div data-slot="number-keyboard-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[0, 1, 2].map((row) =>
            digitKeys.slice(row * 3, row * 3 + 3).map((key) => (
              <React.Fragment key={key}>{keyButton(key)}</React.Fragment>
            )),
          )}
          {decimal ? keyButton('.', '.') : null}
          {keyButton('0')}
          {keyButton('delete', '⌫')}
        </div>
        <button
          type="button"
          data-slot="number-keyboard-confirm"
          disabled={disabled || confirmDisabled}
          onClick={confirm}
          style={{
            width: 96,
            minHeight: 192,
            fontSize: 18,
            opacity: confirmDisabled ? 0.5 : undefined,
          }}
        >
          {t('flux.mobile.numberKeyboard.confirm', { defaultValue: '确认' })}
        </button>
      </div>
    </div>
  );
}
