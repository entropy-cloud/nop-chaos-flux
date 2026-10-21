import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { ActionSheetSchema } from './schemas.js';
import { useGlobalZIndex } from '@nop-chaos/ui';
import { useLockScroll } from './hooks/use-lock-scroll.js';

/**
 * Action sheet (plan 666 Phase 4, M8d): list/grid item sheet over the M7
 * popup-shell pattern (global z-index seat + M6 scroll lock + safe-bottom).
 * Shape decision (mobile renderer vs ui Sheet derivative) is recorded in
 * docs/components/action-sheet/design.md §2 — the items data model and
 * select payload belong to the renderer contract.
 */
export function ActionSheetRenderer(props: RendererComponentProps<ActionSheetSchema>) {
  const slotProps = props.props;
  const items = React.useMemo(() => slotProps.items ?? [], [slotProps.items]);
  const display = slotProps.display === 'grid' ? 'grid' : 'list';
  const disabled = slotProps.disabled === true;
  const closeOnMask = slotProps.closeOnMask !== false;

  const [open, setOpen] = React.useState(false);

  const openSheet = () => {
    if (disabled) return;
    setOpen(true);
  };

  const close = () => setOpen(false);

  const cancel = () => {
    const payload = { type: 'cancel' };
    void props.events.onCancel?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: props.node.scope,
    });
    close();
  };

  const select = (index: number) => {
    const item = items[index];
    if (!item || item.disabled === true) return;
    const payload = { type: 'select', index, value: item.value, label: item.label };
    void props.events.onSelect?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: props.node.scope,
    });
    close();
  };

  return (
    <>
      <button
        type="button"
        data-slot="action-sheet-trigger"
        data-testid={props.meta.testid != null ? `${props.meta.testid}-trigger` : undefined}
        disabled={disabled}
        onClick={openSheet}
        className={cn(
          'nop-action-sheet',
          'min-h-11 rounded-md border px-3 text-base',
          disabled && 'opacity-50',
        )}
        style={{ background: 'inherit', color: 'inherit' }}
      >
        {slotProps.triggerText ?? ''}
      </button>
      {open ? (
        <ActionSheetPopup
          items={items}
          display={display}
          title={slotProps.title}
          cancelText={slotProps.cancelText}
          closeOnMask={closeOnMask}
          cid={props.meta.cid}
          onSelect={select}
          onCancel={cancel}
        />
      ) : null}
    </>
  );
}

interface ActionSheetPopupProps {
  items: NonNullable<ActionSheetSchema['items']>;
  display: 'list' | 'grid';
  title?: string;
  cancelText?: string;
  closeOnMask: boolean;
  cid?: number;
  onSelect: (index: number) => void;
  onCancel: () => void;
}

function ActionSheetPopup(props: ActionSheetPopupProps) {
  const zIndex = useGlobalZIndex();
  useLockScroll(true);

  return (
    <div
      data-slot="action-sheet-popup"
      data-cid={props.cid}
      style={{ position: 'fixed', inset: 0, zIndex, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
    >
      <div
        data-slot="action-sheet-mask"
        role="button"
        aria-label={t('flux.mobile.wheelPicker.cancel', { defaultValue: '取消' })}
        tabIndex={-1}
        onClick={() => {
          if (props.closeOnMask) props.onCancel();
        }}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (props.closeOnMask && (event.key === 'Escape' || event.key === 'Enter')) {
            props.onCancel();
          }
        }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <div
        data-slot="action-sheet-panel"
        className="nop-safe-bottom"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {props.title ? (
          <p
            data-slot="action-sheet-title"
            style={{
              textAlign: 'center',
              fontSize: 14,
              padding: '12px 0 4px',
              margin: 0,
            }}
          >
            {props.title}
          </p>
        ) : null}
        <div
          data-slot={`action-sheet-items-${props.display}`}
          style={
            props.display === 'grid'
              ? { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: 12 }
              : { display: 'flex', flexDirection: 'column' }
          }
        >
          {props.items.map((item, index) => (
            <button
              key={`${String(item.label)}:${String(item.value)}`}
              type="button"
              data-slot="action-sheet-item"
              data-index={index}
              data-disabled={item.disabled === true || undefined}
              disabled={item.disabled === true}
              onClick={() => props.onSelect(index)}
              style={{
                minHeight: 48,
                textAlign: props.display === 'grid' ? 'center' : 'left',
                padding: '0 16px',
                fontSize: 16,
                opacity: item.disabled === true ? 0.5 : undefined,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          data-slot="action-sheet-cancel"
          onClick={props.onCancel}
          style={{
            minHeight: 48,
            width: '100%',
            fontSize: 16,
            borderTop: '1px solid var(--nop-action-sheet-divider)',
          }}
        >
          {props.cancelText ?? t('flux.mobile.actionSheet.cancel', { defaultValue: '取消' })}
        </button>
      </div>
    </div>
  );
}
