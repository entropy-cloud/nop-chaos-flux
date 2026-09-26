import { useEffect, useRef, useState } from 'react';
import { stringAdapter, type RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { InputOTP, InputOTPGroup, InputOTPSlot, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { useFormFieldFromProps } from '../field-utils.js';
import type { VerificationCodeSchema } from '../schemas-verification.js';

const STRING_ADAPTER = stringAdapter();
const VERIFICATION_METHODS = ['clear', 'reset', 'focus'] as const;
const DEFAULT_LENGTH = 6;

/**
 * OTP verification-code field (missing-components L2.4, plan 508) on the ui
 * `InputOTP` primitive. Value invariant: input length < `length` ⇔ value
 * `undefined` — a full code commits, any shortening falls back to
 * `undefined` (plan 508 值语义不变式).
 */
export function VerificationCodeRenderer(props: RendererComponentProps<VerificationCodeSchema>) {
  const name = String(props.props.name ?? '');
  const rawLength = typeof props.props.length === 'number' ? props.props.length : DEFAULT_LENGTH;
  const length = Number.isInteger(rawLength) && rawLength > 0 ? rawLength : DEFAULT_LENGTH;
  const masked = props.props.masked === true;
  const placeholder = String(props.props.placeholder ?? '') || '·'.repeat(length);

  const { value, handlers, presentation } = useFormFieldFromProps(props, {
    adapter: STRING_ADAPTER,
  });
  const rootRef = useRef<HTMLDivElement | null>(null);
  // Initial value normalization (plan 508 draft review r2 n2): a full-length
  // initial value backfills the cells (once, via the lib's defaultValue); a
  // non-length initial value is committed back as undefined on mount so the
  // invariant holds from the first frame.
  const [initialEcho] = useState(() => {
    const initial = typeof props.props.value === 'string' ? props.props.value : '';
    return initial.length === length ? initial : undefined;
  });
  // Normalization watches the bound value: pushDefaultValue lands AFTER mount
  // (lessons/12), so a non-length schema initial value must be normalized when
  // it reaches the form, not at mount. Typing never produces non-full-length
  // values (handleValueChange gates), so this only fires for external pushes.
  useEffect(() => {
    if (typeof value === 'string' && value !== '' && value.length !== length) {
      handlers.onChange(undefined);
    }
  }, [handlers, length, value]);

  const handleValueChange = (next: string) => {
    // Value invariant (plan 508): the form value is the code ONLY at full
    // length; any shorter input (including backspacing a committed code)
    // commits `undefined`. The lib keeps the intermediate cell text
    // internally (the renderer is intentionally uncontrolled — a gated
    // controlled value would reset the cells on every intermediate keystroke).
    handlers.onChange(next.length === length ? next : undefined);
  };

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'verification-code',
    cid: props.meta.cid,
    methods: VERIFICATION_METHODS,
    getFocusTarget: () =>
      rootRef.current?.querySelector<HTMLElement>('[data-slot="input-otp"]') ?? rootRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
    clearValue: () => handlers.onChange(undefined),
    resetValue: () => {
      handlers.onChange(value);
      return { fellBackToDefault: false };
    },
  });

  return (
    <div
      ref={rootRef}
      className={cn('nop-verification-code-field', props.meta.className)}
      data-invalid={presentation.showError ? true : undefined}
    >
      <InputOTP
        maxLength={length}
        defaultValue={initialEcho}
        onChange={handleValueChange}
        disabled={!presentation.interactive}
        placeholder={placeholder}
        aria-label={String(props.props.label ?? name) || t('flux.form.verificationCodeAriaLabel')}
        data-testid={props.meta.testid}
        data-masked={masked ? true : undefined}
        containerClassName={cn(
          'gap-1',
          masked && '[&_[data-slot=input-otp-slot]]:text-transparent',
        )}
      >
        <InputOTPGroup>
          {Array.from({ length }, (_, index) => (
            <InputOTPSlot key={index} index={index} data-testid={`verification-code-slot-${index}`} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}
