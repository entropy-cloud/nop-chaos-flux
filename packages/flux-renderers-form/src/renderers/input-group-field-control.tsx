import type { ComponentProps, ReactNode } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@nop-chaos/ui';
import type { FieldFrameInjectedAria } from '@nop-chaos/flux-react';
import { t } from '@nop-chaos/flux-i18n';
import { XIcon } from 'lucide-react';

export function mergeAriaSpace(...values: Array<string | undefined | false>): string | undefined {
  const tokens = values.filter((v): v is string => Boolean(v && v.trim()));
  return tokens.length > 0 ? tokens.join(' ') : undefined;
}

// FieldFrame's cloneElement injection face (shared flux-react contract type).
// `aria-required` is part of the injected face but stays intentionally
// unconsumed here: InputGroupFieldControl destructures explicitly (no rest
// spread), so the key is dropped exactly as before this type adoption.
type InputGroupFieldControlProps = FieldFrameInjectedAria & {
  className?: string;
  inputProps: ComponentProps<typeof InputGroupInput>;
  prefix?: string;
  suffix?: string;
  counterText?: string;
  showClearButton?: boolean;
  onClear?: () => void;
  revealSlot?: ReactNode;
};

export function InputGroupFieldControl(props: InputGroupFieldControlProps) {
  const {
    className,
    id: injectedId,
    'aria-labelledby': injectedLabelledBy,
    'aria-describedby': injectedDescribedBy,
    'aria-errormessage': injectedErrorMessage,
    'aria-invalid': injectedInvalid,
    onFocus: injectedFocus,
    onBlur: injectedBlur,
    inputProps,
    prefix,
    suffix,
    counterText,
    showClearButton,
    onClear,
    revealSlot,
  } = props;

  const ownId = inputProps.id;
  const ownLabelledBy = inputProps['aria-labelledby'];
  const ownDescribedBy = inputProps['aria-describedby'];
  const ownErrorMessage = inputProps['aria-errormessage'];
  const ownInvalid = inputProps['aria-invalid'];
  const ownFocus = inputProps.onFocus as ((event: unknown) => void) | undefined;
  const ownBlur = inputProps.onBlur as ((event: unknown) => void) | undefined;

  const mergedInputProps = {
    ...inputProps,
    id: ownId ?? injectedId,
    'aria-labelledby': mergeAriaSpace(ownLabelledBy, injectedLabelledBy),
    'aria-describedby': mergeAriaSpace(ownDescribedBy, injectedDescribedBy),
    'aria-errormessage': ownErrorMessage ?? injectedErrorMessage,
    'aria-invalid': ownInvalid ?? injectedInvalid,
    onFocus: (event: unknown) => {
      injectedFocus?.(event);
      ownFocus?.(event);
    },
    onBlur: (event: unknown) => {
      ownBlur?.(event);
      injectedBlur?.(event);
    },
  };

  return (
    <InputGroup className={className}>
      {prefix ? (
        <InputGroupAddon align="inline-start">
          <InputGroupText>{prefix}</InputGroupText>
        </InputGroupAddon>
      ) : null}
      <InputGroupInput {...mergedInputProps} />
      {suffix || counterText !== undefined || showClearButton || revealSlot ? (
        <InputGroupAddon align="inline-end">
          {suffix ? <InputGroupText>{suffix}</InputGroupText> : null}
          {counterText !== undefined ? (
            <span data-slot="input-counter" className="text-xs text-muted-foreground tabular-nums">
              {counterText}
            </span>
          ) : null}
          {showClearButton ? (
            <InputGroupButton
              size="icon-xs"
              variant="ghost"
              aria-label={t('flux.common.clear')}
              onClick={onClear}
            >
              <XIcon className="pointer-events-none" />
            </InputGroupButton>
          ) : null}
          {revealSlot}
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}
