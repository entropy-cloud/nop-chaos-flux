import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { FieldFrame, useCurrentForm, useRendererRuntime } from '@nop-chaos/flux-react';
import { validateFieldOnChange } from './validation-rejection.js';
import type { WheelPickerSchema } from './schemas.js';
import { WheelPickerPopup } from './wheel-picker-popup.js';

/**
 * Popup wheel selection field (plan 665 Phase 2, M7b): trigger + bottom
 * sheet (global z-index stack + safe-area + M6 scroll lock) over the shared
 * WheelView kernel. Confirm writes the selection to the form field (`name`)
 * and dispatches `confirm`; cancel dispatches `cancel` and closes without
 * writing.
 */
export function WheelPickerRenderer(props: RendererComponentProps<WheelPickerSchema>) {
  const slotProps = props.props;
  const columns = slotProps.columns ?? [];
  const disabled = slotProps.disabled === true;
  const form = useCurrentForm();
  const runtime = useRendererRuntime();

  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<(string | number)[]>([]);

  const labels = (slotProps.value ?? [])
    .map((value, columnIndex) =>
      columns[columnIndex]?.find((option) => option.value === value)?.label,
    )
    .filter((label): label is string => label != null);

  const dispatchCtx = { scope: props.node.scope };

  const openPopup = () => {
    if (disabled) return;
    setDraft(
      slotProps.value ?? columns.map((column) => column[0]?.value ?? ''),
    );
    setOpen(true);
  };

  const close = () => setOpen(false);

  const confirm = () => {
    const selected = draft.map((value, columnIndex) => ({
      value,
      label: columns[columnIndex]?.find((option) => option.value === value)?.label ?? String(value),
    }));
    const payload = {
      type: 'confirm',
      value: selected.map((entry) => entry.value),
      labels: selected.map((entry) => entry.label),
    };
    if (slotProps.name && form) {
      form.setValue(slotProps.name, payload.value);
      // ValidationScopeRuntime (non-form owner) lacks validateField — guard
      // by capability, not by type (plan 665 review m4).
      validateFieldOnChange(form, runtime?.env, slotProps.name);
    }
    void props.events.onConfirm?.(payload, {
      event: payload,
      evaluationBindings: payload,
      ...dispatchCtx,
    });
    close();
  };

  const cancel = () => {
    const payload = { type: 'cancel' };
    void props.events.onCancel?.(payload, {
      event: payload,
      evaluationBindings: payload,
      ...dispatchCtx,
    });
    close();
  };

  return (
    <FieldFrame
      name={slotProps.name}
      label={slotProps.label}
      required={slotProps.required}
      testid={props.meta.testid != null ? String(props.meta.testid) : undefined}
      cid={props.meta.cid}
    >
      <button
        type="button"
        data-slot="wheel-picker-trigger"
        data-testid={
          props.meta.testid != null ? `${props.meta.testid}-trigger` : undefined
        }
        disabled={disabled}
        onClick={openPopup}
        className={cn(
          'nop-wheel-picker',
          'w-full min-h-11 rounded-md border px-3 text-left text-base',
          disabled && 'opacity-50',
        )}
        style={{ background: 'inherit', color: 'inherit' }}
      >
        {labels.length > 0 ? labels.join(' ') : (slotProps.placeholder ?? '')}
      </button>
      {open ? (
        <WheelPickerPopup
          columns={columns}
          draft={draft}
          cid={props.meta.cid}
          onDraftChange={setDraft}
          onConfirmClick={confirm}
          onCancelClick={cancel}
        />
      ) : null}
    </FieldFrame>
  );
}

// The bottom-sheet shell lives in wheel-picker-popup.tsx and is shared by
// wheel-date-picker / wheel-time-picker / wheel-cascader (plan 665).
