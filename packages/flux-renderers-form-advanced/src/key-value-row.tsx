import React from 'react';
import type { CompiledValidationBehavior, FormRuntime } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Input } from '@nop-chaos/ui';
import { ChevronDownIcon, ChevronUpIcon, Trash2Icon } from 'lucide-react';
import {
  getChildFieldUiState,
  shouldValidateOn,
  useCompositeChildFieldState,
  type KeyValuePair,
} from '@nop-chaos/flux-renderers-form';
import { FieldHint } from '@nop-chaos/flux-renderers-form';

export interface KeyValueRowProps {
  pair: KeyValuePair;
  index: number;
  totalCount: number;
  minItems: number;
  name: string;
  currentForm: FormRuntime | undefined;
  childBehavior: CompiledValidationBehavior;
  onChange: (index: number, patch: Partial<KeyValuePair>) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  disabled?: boolean;
  readOnly?: boolean;
  registerRemoveButton: (index: number, button: HTMLButtonElement | null) => void;
}

function KeyValueRowView(props: KeyValueRowProps) {
  const {
    pair,
    index,
    totalCount,
    minItems,
    name,
    currentForm,
    childBehavior,
    onChange,
    onRemove,
    onMoveUp,
    onMoveDown,
    disabled,
    readOnly,
    registerRemoveButton,
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
          placeholder={t('flux.form.key')}
          aria-label={t('flux.form.keyEntry', { index: index + 1 })}
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

            onChange(index, { key: event.target.value });

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
          placeholder={t('flux.form.value')}
          aria-label={t('flux.form.valueEntry', { index: index + 1 })}
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

            onChange(index, { value: event.target.value });

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
        size="icon-sm"
        data-slot="key-value-move-up"
        disabled={disabled || !canMoveUp}
        aria-label={t('flux.form.moveEntryUp', { index: index + 1 })}
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
        size="icon-sm"
        data-slot="key-value-move-down"
        disabled={disabled || !canMoveDown}
        aria-label={t('flux.form.moveEntryDown', { index: index + 1 })}
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
        ref={(button) => {
          registerRemoveButton(index, button);
        }}
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled || !canRemove}
        className="hover:text-destructive"
        aria-label={t('flux.form.removeEntry', { index: index + 1 })}
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

export function keyValueRowPropsEqual(prev: KeyValueRowProps, next: KeyValueRowProps): boolean {
  return (
    prev.pair === next.pair &&
    prev.index === next.index &&
    prev.totalCount === next.totalCount &&
    prev.minItems === next.minItems &&
    prev.name === next.name &&
    prev.currentForm === next.currentForm &&
    prev.childBehavior === next.childBehavior &&
    prev.onChange === next.onChange &&
    prev.onRemove === next.onRemove &&
    prev.onMoveUp === next.onMoveUp &&
    prev.onMoveDown === next.onMoveDown &&
    prev.disabled === next.disabled &&
    prev.readOnly === next.readOnly &&
    prev.registerRemoveButton === next.registerRemoveButton
  );
}

export const KeyValueRow = React.memo(KeyValueRowView, keyValueRowPropsEqual);
