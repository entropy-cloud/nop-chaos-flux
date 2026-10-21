import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { FieldFrame, useCurrentForm } from '@nop-chaos/flux-react';
import type { WheelTimePickerSchema } from './schemas.js';
import { WheelPickerPopup } from './wheel-picker-popup.js';
import { encodeTime, timeSelectionFor, wheelTimeColumns } from './wheel-date-columns.js';

/**
 * Wheel time picker (plan 665 Phase 3, M7c): hour/minute columns with an
 * optional minute step, `HH:mm` value codec, over the shared popup shell.
 */
export function WheelTimePickerRenderer(
  props: RendererComponentProps<WheelTimePickerSchema>,
) {
  const slotProps = props.props;
  const minuteStep = typeof slotProps.minuteStep === 'number' ? slotProps.minuteStep : 1;
  const disabled = slotProps.disabled === true;
  const columns = wheelTimeColumns(minuteStep);
  const form = useCurrentForm();

  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<[number, number]>(() =>
    timeSelectionFor(slotProps.value ?? null, minuteStep),
  );

  const openPopup = () => {
    if (disabled) return;
    setDraft(timeSelectionFor(slotProps.value ?? null, minuteStep));
    setOpen(true);
  };

  const reconcile = (values: (string | number)[]) => {
    setDraft([Number(values[0]), Number(values[1])]);
  };

  const close = () => setOpen(false);

  const confirm = () => {
    const encoded = encodeTime(draft);
    if (slotProps.name && form) {
      form.setValue(slotProps.name, encoded);
      if (typeof form.validateField === 'function') {
        void form.validateField(slotProps.name, 'change');
      }
    }
    const payload = { type: 'confirm', value: encoded };
    void props.events.onConfirm?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: props.node.scope,
    });
    close();
  };

  const cancel = () => {
    const payload = { type: 'cancel' };
    void props.events.onCancel?.(payload, {
      event: payload,
      evaluationBindings: payload,
      scope: props.node.scope,
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
        data-testid={props.meta.testid != null ? `${props.meta.testid}-trigger` : undefined}
        disabled={disabled}
        onClick={openPopup}
        className={cn(
          'nop-wheel-picker',
          'w-full min-h-11 rounded-md border px-3 text-left text-base',
          disabled && 'opacity-50',
        )}
        style={{ background: 'inherit', color: 'inherit' }}
      >
        {slotProps.value ?? (slotProps.placeholder ?? '')}
      </button>
      {open ? (
        <WheelPickerPopup
          columns={columns}
          draft={draft}
          cid={props.meta.cid}
          onDraftChange={reconcile}
          onConfirmClick={confirm}
          onCancelClick={cancel}
        />
      ) : null}
    </FieldFrame>
  );
}
