import type { CompiledValidationBehavior, FormRuntime } from '@nop-chaos/flux-core';
import type { KeyValuePair } from '@nop-chaos/flux-renderers-form';
import {
  FieldHint,
  getChildFieldUiState,
  shouldValidateOn,
  useCompositeChildFieldState,
} from '@nop-chaos/flux-renderers-form';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Input } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronUpIcon, Trash2Icon } from 'lucide-react';

export interface KeyValueRowProps {
  pair: KeyValuePair;
  index: number;
  totalCount: number;
  minItems: number;
  name: string;
  currentForm: FormRuntime | undefined;
  childBehavior: CompiledValidationBehavior;
  onSync(nextPairs: KeyValuePair[]): void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  pairs: KeyValuePair[];
  disabled?: boolean;
  readOnly?: boolean;
  removeButtonRef?: (button: HTMLButtonElement | null) => void;
}

export function KeyValueRow(props: KeyValueRowProps) {
  const {
    pair,
    index,
    totalCount,
    minItems,
    name,
    currentForm,
    childBehavior,
    onSync,
    onRemove,
    onMoveUp,
    onMoveDown,
    pairs,
    disabled,
    readOnly,
    removeButtonRef,
  } = props;
  const keyPath = `${name}.${index}.key`;
  const valuePath = `${name}.${index}.value`;
  const keyInputId = `${name || 'key-value'}-${pair.id}-key`;
  const valueInputId = `${name || 'key-value'}-${pair.id}-value`;
  const keyErrorId = `${keyInputId}-error`;
  const valueErrorId = `${valueInputId}-error`;
  const keyFieldState = useCompositeChildFieldState(keyPath);
  const valueFieldState = useCompositeChildFieldState(valuePath);
  const keyUi = getChildFieldUiState({
    behavior: childBehavior,
    fieldState: keyFieldState,
  });
  const valueUi = getChildFieldUiState({
    behavior: childBehavior,
    fieldState: valueFieldState,
  });
  const canRemove = totalCount > minItems;
  const canMoveUp = index > 0;
  const canMoveDown = index < totalCount - 1;

  return (
    <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2.5 items-start">
      <div
        className={keyUi.className}
        data-child-field-visited={keyUi['data-child-field-visited']}
        data-child-field-touched={keyUi['data-child-field-touched']}
        data-child-field-dirty={keyUi['data-child-field-dirty']}
        data-child-field-invalid={keyUi['data-child-field-invalid']}
      >
        <Input
          id={keyInputId}
          type="text"
          value={pair.key}
          disabled={disabled}
          placeholder="Key"
          aria-label={`Key ${index + 1}`}
          aria-invalid={keyUi.showError ? true : undefined}
          aria-describedby={keyUi.showError ? keyErrorId : undefined}
          aria-errormessage={keyUi.showError ? keyErrorId : undefined}
          onFocus={() => {
            if (currentForm && name) {
              currentForm.visitField(name);
              currentForm.visitField(keyPath);
            }
          }}
          onChange={(event) => {
            if (readOnly) {
              return;
            }

            const nextPairs = pairs.map((candidate, candidateIndex) =>
              candidateIndex === index ? { ...candidate, key: event.target.value } : candidate,
            );
            onSync(nextPairs);

            if (currentForm) {
              currentForm.touchField(keyPath);
              currentForm.setValue(keyPath, event.target.value);

              if (shouldValidateOn(name, currentForm, 'change')) {
                void currentForm.validateField(keyPath, 'change');
              }
            }
          }}
          onBlur={() => {
            if (currentForm) {
              currentForm.touchField(keyPath);

              if (shouldValidateOn(name, currentForm, 'blur')) {
                void currentForm.validateField(keyPath, 'blur');
              }
            }
          }}
        />
        <FieldHint errorMessage={keyUi.error?.message} showError={keyUi.showError} id={keyErrorId} />
      </div>
      <div
        className={valueUi.className}
        data-child-field-visited={valueUi['data-child-field-visited']}
        data-child-field-touched={valueUi['data-child-field-touched']}
        data-child-field-dirty={valueUi['data-child-field-dirty']}
        data-child-field-invalid={valueUi['data-child-field-invalid']}
      >
        <Input
          id={valueInputId}
          type="text"
          value={pair.value}
          disabled={disabled}
          placeholder="Value"
          aria-label={`Value ${index + 1}`}
          aria-invalid={valueUi.showError ? true : undefined}
          aria-describedby={valueUi.showError ? valueErrorId : undefined}
          aria-errormessage={valueUi.showError ? valueErrorId : undefined}
          onFocus={() => {
            if (currentForm && name) {
              currentForm.visitField(name);
              currentForm.visitField(valuePath);
            }
          }}
          onChange={(event) => {
            if (readOnly) {
              return;
            }

            const nextPairs = pairs.map((candidate, candidateIndex) =>
              candidateIndex === index ? { ...candidate, value: event.target.value } : candidate,
            );
            onSync(nextPairs);

            if (currentForm) {
              currentForm.touchField(valuePath);
              currentForm.setValue(valuePath, event.target.value);

              if (shouldValidateOn(name, currentForm, 'change')) {
                void currentForm.validateField(valuePath, 'change');
              }
            }
          }}
          onBlur={() => {
            if (currentForm) {
              currentForm.touchField(valuePath);

              if (shouldValidateOn(name, currentForm, 'blur')) {
                void currentForm.validateField(valuePath, 'blur');
              }
            }
          }}
        />
        <FieldHint errorMessage={valueUi.error?.message} showError={valueUi.showError} id={valueErrorId} />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-slot="key-value-move-up"
        disabled={disabled || !canMoveUp}
        aria-label={`Move up entry ${index + 1}`}
        onClick={() => {
          if (readOnly || !canMoveUp) {
            return;
          }
          onMoveUp(index);
        }}
      >
        <ChevronUpIcon className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-slot="key-value-move-down"
        disabled={disabled || !canMoveDown}
        aria-label={`Move down entry ${index + 1}`}
        onClick={() => {
          if (readOnly || !canMoveDown) {
            return;
          }
          onMoveDown(index);
        }}
      >
        <ChevronDownIcon className="size-4" />
      </Button>
      <Button
        ref={removeButtonRef}
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || !canRemove}
        className="hover:text-destructive"
        aria-label={`${t('flux.form.remove')} entry ${index + 1}`}
        onClick={() => {
          if (!canRemove) {
            return;
          }
          onRemove(index);
        }}
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  );
}
