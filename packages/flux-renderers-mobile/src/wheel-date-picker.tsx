import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { FieldFrame, useCurrentForm, useRendererRuntime } from '@nop-chaos/flux-react';
import { validateFieldOnChange } from './validation-rejection.js';
import type { WheelDatePickerSchema } from './schemas.js';
import { WheelPickerPopup } from './wheel-picker-popup.js';
import {
  dateSelectionFor,
  decodeDate,
  encodeDate,
  wheelDateColumns,
} from './wheel-date-columns.js';

const DEFAULT_MIN = '1900-01-01';
const DEFAULT_MAX = '2100-12-31';

/**
 * Wheel date picker (plan 665 Phase 3, M7c): pure config derivation over the
 * wheel-picker popup shell — year/month/day columns from the min/max range,
 * `YYYY-MM-DD` value codec, per-selection day convergence (leap years,
 * month lengths) handled by `dateSelectionFor`.
 */
export function WheelDatePickerRenderer(
  props: RendererComponentProps<WheelDatePickerSchema>,
) {
  const slotProps = props.props;
  const min = slotProps.min ?? DEFAULT_MIN;
  const max = slotProps.max ?? DEFAULT_MAX;
  const disabled = slotProps.disabled === true;
  const columns = wheelDateColumns(min, max);
  const form = useCurrentForm();
  const runtime = useRendererRuntime();

  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<[number, number, number]>(() =>
    dateSelectionFor(min, max, decodeDate(slotProps.value)),
  );

  const openPopup = () => {
    if (disabled) return;
    setDraft(dateSelectionFor(min, max, decodeDate(slotProps.value)));
    setOpen(true);
  };

  const reconcile = (values: (string | number)[]) => {
    setDraft(
      dateSelectionFor(min, max, [Number(values[0]), Number(values[1]), Number(values[2])]),
    );
  };

  const close = () => setOpen(false);

  const confirm = () => {
    const encoded = encodeDate(draft);
    if (slotProps.name && form) {
      form.setValue(slotProps.name, encoded);
      validateFieldOnChange(form, runtime?.env, slotProps.name);
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
