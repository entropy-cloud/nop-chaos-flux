import { t } from '@nop-chaos/flux-i18n';
import { Button } from '@nop-chaos/ui';
import {
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
  Popover,
  PopoverContent,
} from '@nop-chaos/ui';

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
  width?: string | number;
  height?: string | number;
  showMask?: boolean;
  /** Title displayed in the popup header. */
  title: string;
  /** Popup content — rendered by the picker from `pickerSchema` (any schema). */
  content: React.ReactNode;
  confirmDisabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const SIZE_TO_DIALOG_SIZE: Record<PickerPopupSize, 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl'> = {
  xs: 'xs',
  sm: 'sm',
  default: 'default',
  lg: 'lg',
  xl: 'xl',
  full: 'xl',
};

function renderFooter(props: PickerDropdownProps): React.ReactNode {
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
          <DrawerBody>
            <div className="flex flex-col gap-2">{props.content}</div>
          </DrawerBody>
          <DrawerFooter>{footer}</DrawerFooter>
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
          <div className="flex flex-col gap-2">
            {props.title ? <div className="text-sm font-medium">{props.title}</div> : null}
            {props.content}
            {footer}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  const dialogSize = SIZE_TO_DIALOG_SIZE[props.surfaceSize] ?? 'default';
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        data-slot="picker-dialog-content"
        size={dialogSize}
        style={props.surfaceSize === 'full' ? { width: '100vw', maxWidth: '100vw', height: '100vh' } : undefined}
      >
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col gap-2">{props.content}</div>
        </DialogBody>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
