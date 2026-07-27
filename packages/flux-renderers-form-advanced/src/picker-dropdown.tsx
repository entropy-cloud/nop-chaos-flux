import { t } from '@nop-chaos/flux-i18n';
import { Button, Input } from '@nop-chaos/ui';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@nop-chaos/ui';
import { SearchIcon } from 'lucide-react';
import { type NormalizedOption } from './option-normalize.js';
import type { PickerValue } from './picker-helpers.js';
import { PickerOptionList } from './picker-option-list.js';

export interface PickerDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialogSize: 'sm' | 'default' | 'lg' | 'xl';
  dialogTitle: string;
  crudMode: boolean;
  crudContent: React.ReactNode | null;
  query: string;
  onQueryChange: (q: string) => void;
  filteredOptions: NormalizedOption[];
  pending: Set<PickerValue>;
  multiple: boolean;
  onTogglePending: (value: PickerValue) => void;
  onSetPending: (values: PickerValue[]) => void;
  confirmDisabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PickerDropdown(props: PickerDropdownProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent data-slot="picker-dialog-content" size={props.dialogSize}>
        <DialogHeader>
          <DialogTitle>{props.dialogTitle}</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-2">
          {props.crudMode && props.open
            ? props.crudContent
            : (
              <>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={props.query}
                    placeholder={t('flux.picker.search', { defaultValue: 'Search' })}
                    style={{ paddingLeft: '2rem' }}
                    onChange={(event) => props.onQueryChange(event.target.value)}
                  />
                </div>
                <PickerOptionList
                  filteredOptions={props.filteredOptions}
                  pending={props.pending}
                  multiple={props.multiple}
                  onTogglePending={props.onTogglePending}
                  onSetPending={props.onSetPending}
                />
              </>
            )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={props.onCancel}>
            {t('flux.common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            type="button"
            size="sm"
            data-slot="picker-confirm"
            disabled={props.confirmDisabled}
            onClick={props.onConfirm}
          >
            {t('flux.common.confirm', { defaultValue: 'Confirm' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
