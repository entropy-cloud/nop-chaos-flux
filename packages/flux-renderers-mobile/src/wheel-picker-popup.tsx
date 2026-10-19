import { t } from '@nop-chaos/flux-i18n';
import { Button, useGlobalZIndex } from '@nop-chaos/ui';
import type { WheelPickerOption } from './schemas.js';
import { WheelView } from './wheel-view.js';
import { useLockScroll } from './hooks/use-lock-scroll.js';

interface WheelPickerPopupProps {
  columns: WheelPickerOption[][];
  draft: (string | number)[];
  cid?: number;
  onDraftChange: (values: (string | number)[]) => void;
  onConfirmClick: () => void;
  onCancelClick: () => void;
}

/**
 * Shared bottom-sheet shell for the popup wheel family (plan 665):
 * global z-index stack seat + M6 scroll lock + safe-area bottom +
 * cancel/confirm toolbar over the WheelView kernel.
 */
export function WheelPickerPopup(props: WheelPickerPopupProps) {
  const zIndex = useGlobalZIndex();
  useLockScroll(true);

  return (
    <div
      data-slot="wheel-picker-popup"
      data-cid={props.cid}
      style={{ position: 'fixed', inset: 0, zIndex, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
    >
      <div
        data-slot="wheel-picker-backdrop"
        role="button"
        aria-label={t('flux.mobile.wheelPicker.cancel', { defaultValue: '取消' })}
        tabIndex={-1}
        onClick={props.onCancelClick}
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === 'Escape' || event.key === 'Enter') props.onCancelClick();
        }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <div
        data-slot="wheel-picker-panel"
        className="nop-safe-bottom"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div
          data-slot="wheel-picker-toolbar"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}
        >
          <Button
            variant="ghost"
            size="sm"
            data-slot="wheel-picker-cancel"
            onClick={props.onCancelClick}
          >
            {t('flux.mobile.wheelPicker.cancel', { defaultValue: '取消' })}
          </Button>
          <Button
            variant="primary"
            size="sm"
            data-slot="wheel-picker-confirm"
            onClick={props.onConfirmClick}
          >
            {t('flux.mobile.wheelPicker.confirm', { defaultValue: '确认' })}
          </Button>
        </div>
        <WheelView
          columns={props.columns}
          value={props.draft}
          onSettle={(column, index, values) => {
            void column;
            void index;
            props.onDraftChange(values);
          }}
        />
      </div>
    </div>
  );
}
