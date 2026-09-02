import { t } from '@nop-chaos/flux-i18n';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Popover,
  PopoverContent,
} from '@nop-chaos/ui';
import { SearchIcon } from 'lucide-react';
import { type NormalizedOption } from './option-normalize.js';
import type { PickerValue } from './picker-helpers.js';
import { PickerOptionList } from './picker-option-list.js';

export type PickerSurfaceType = 'dialog' | 'drawer' | 'popover';
export type PickerPopupSize = 'xs' | 'sm' | 'default' | 'lg' | 'xl' | 'full';
export type PickerPopupPlacement = 'left' | 'right' | 'top' | 'bottom';

export interface PickerDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Surface type. Default: 'dialog'. */
  surfaceType: PickerSurfaceType;
  /** Size preset (6 档 aligned with AMIS). Default: 'default'. */
  surfaceSize: PickerPopupSize;
  /** Placement for drawer/popover. Default: 'right' (drawer), 'bottom' (popover). */
  placement: PickerPopupPlacement;
  /** Override width (drawer/popover). */
  width?: string | number;
  /** Override height (drawer/popover). */
  height?: string | number;
  /** Show mask overlay. Default depends on surfaceType. */
  showMask?: boolean;
  /** Title displayed in the popup header. */
  title: string;
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
  /** Confirm button text override. */
  confirmText?: string;
  /** Cancel button text override. */
  cancelText?: string;
  /** Show footer (confirm/cancel). Default: true. */
  showFooter?: boolean;
}

const SIZE_TO_DIALOG_SIZE: Record<PickerPopupSize, 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl'> = {
  xs: 'xs',
  sm: 'sm',
  default: 'default',
  lg: 'lg',
  xl: 'xl',
  full: 'xl',
};

function renderBody(props: PickerDropdownProps): React.ReactNode {
  if (props.crudMode && props.open) {
    return props.crudContent;
  }
  return (
    <>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={props.query}
          aria-label={t('flux.picker.search', { defaultValue: 'Search' })}
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
  );
}

function renderFooter(props: PickerDropdownProps): React.ReactNode {
  if (props.showFooter === false) {
    return null;
  }
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={props.onCancel}>
        {props.cancelText ?? t('flux.common.cancel', { defaultValue: 'Cancel' })}
      </Button>
      <Button
        type="button"
        size="sm"
        data-slot="picker-confirm"
        disabled={props.confirmDisabled}
        onClick={props.onConfirm}
      >
        {props.confirmText ?? t('flux.common.confirm', { defaultValue: 'Confirm' })}
      </Button>
    </>
  );
}

export function PickerDropdown(props: PickerDropdownProps) {
  const body = <div className="flex flex-col gap-2">{renderBody(props)}</div>;
  const footer = renderFooter(props);

  if (props.surfaceType === 'drawer') {
    return (
      <Drawer
        open={props.open}
        onOpenChange={props.onOpenChange}
        direction={props.placement === 'left' ? 'left' : props.placement === 'top' ? 'top' : props.placement === 'bottom' ? 'bottom' : 'right'}
      >
        <DrawerContent
          data-slot="picker-drawer-content"
          style={props.width != null ? { width: typeof props.width === 'number' ? `${props.width}px` : props.width } : undefined}
        >
          <DrawerHeader>
            <DrawerTitle>{props.title}</DrawerTitle>
          </DrawerHeader>
          <DrawerBody>{body}</DrawerBody>
          {footer ? <DrawerFooter>{footer}</DrawerFooter> : null}
        </DrawerContent>
      </Drawer>
    );
  }

  if (props.surfaceType === 'popover') {
    return (
      <Popover open={props.open} onOpenChange={props.onOpenChange}>
        <PopoverContent
          data-slot="picker-popover-content"
          align="start"
          side={props.placement}
          style={props.width != null ? { width: typeof props.width === 'number' ? `${props.width}px` : props.width } : undefined}
        >
          {body}
          {footer}
        </PopoverContent>
      </Popover>
    );
  }

  const dialogSize = SIZE_TO_DIALOG_SIZE[props.surfaceSize] ?? 'default';
  const isFullSize = props.surfaceSize === 'full';
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        data-slot="picker-dialog-content"
        size={dialogSize}
        style={isFullSize ? { width: '100vw', maxWidth: '100vw', height: '100vh' } : undefined}
      >
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>
        <DialogBody>{body}</DialogBody>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
