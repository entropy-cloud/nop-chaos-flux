import { t } from '@nop-chaos/flux-i18n';
import { Checkbox, cn, Empty, Label, RadioGroup, RadioGroupItem } from '@nop-chaos/ui';
import { type NormalizedOption } from './option-normalize.js';
import type { PickerValue } from './picker-helpers.js';

export interface PickerOptionListProps {
  filteredOptions: NormalizedOption[];
  pending: Set<PickerValue>;
  multiple: boolean;
  onTogglePending: (value: PickerValue) => void;
  onSetPending: (values: PickerValue[]) => void;
}

export function PickerOptionList(props: PickerOptionListProps) {
  const { filteredOptions, pending, multiple, onTogglePending, onSetPending } = props;

  if (filteredOptions.length === 0) {
    return (
      <div className="max-h-72 min-h-32 overflow-y-auto rounded border border-border">
        <Empty className="p-4 text-sm text-muted-foreground">
          {t('flux.picker.noCandidates', { defaultValue: 'No candidates' })}
        </Empty>
      </div>
    );
  }

  if (multiple) {
    return (
      <div className="max-h-72 min-h-32 overflow-y-auto rounded border border-border">
        <ul role="listbox" aria-multiselectable="true">
          {filteredOptions.map((option) => {
            const checked = pending.has(option.value);
            return (
              <li key={String(option.value)}>
                <Label
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-normal hover:bg-accent',
                    option.disabled && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={option.disabled}
                    onCheckedChange={() => onTogglePending(option.value)}
                    data-slot="picker-option"
                  />
                  <span className="truncate">{option.label}</span>
                </Label>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="max-h-72 min-h-32 overflow-y-auto rounded border border-border">
      <RadioGroup
        value={String(Array.from(pending).pop() ?? '')}
        onValueChange={(v) => {
          const match = filteredOptions.find((o) => String(o.value) === v);
          onSetPending(match ? [match.value] : []);
        }}
        className="flex flex-col"
      >
        {filteredOptions.map((option) => (
          <Label
            key={String(option.value)}
            className={cn(
              'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-normal hover:bg-accent',
              option.disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <RadioGroupItem
              value={String(option.value)}
              disabled={option.disabled}
              data-slot="picker-option"
            />
            <span className="truncate">{option.label}</span>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
