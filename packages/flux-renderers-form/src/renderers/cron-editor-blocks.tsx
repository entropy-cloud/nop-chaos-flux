import { Input, Label, NativeSelect, Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { CronScheduleValue } from '../cron/index.js';

interface CronEditorBlocksProps {
  value: CronScheduleValue | undefined;
  /** 值对象诊断码（validateCronScheduleValue 结果；就近映射到区块） */
  valueDiagnostic: string | null;
  disabled: boolean;
  /** 单区块显示开关（plan 541 audit M-1：false 即不渲染该 fieldset，非仅 no-op 回调） */
  showRepeat: boolean;
  showRange: boolean;
  onRepeatChange?: (repeat: CronScheduleValue['repeat']) => void;
  onRangeChange?: (range: CronScheduleValue['range']) => void;
}

/** repeat/range 结构区块（cron 轨道 C6，plan 541）：结构照实提交、诊断就近显示（裁决，不阻断 submit）。 */
export function CronEditorBlocks({ value, valueDiagnostic, disabled, showRepeat, showRange, onRepeatChange, onRangeChange }: CronEditorBlocksProps) {
  const repeat = value?.repeat;
  const range = value?.range;
  const repeatInvalid = valueDiagnostic === 'repeatAnchorMissing' || valueDiagnostic === 'outOfRange' || valueDiagnostic === 'badToken';
  const rangeInvalid = valueDiagnostic === 'rangeConflict' || valueDiagnostic === 'invertedRange' || valueDiagnostic === 'outOfRange';

  return (
    <div className="flex flex-col gap-2" data-slot="cron-blocks">
      {showRepeat ? (
        <fieldset className={cn('rounded-md border p-2')} data-slot="repeat-block" data-invalid={repeatInvalid ? true : undefined} disabled={disabled}>
          <legend className="text-muted-foreground px-1 text-xs">{t('flux.cron.repeatTitle')}</legend>
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-xs">{t('flux.cron.repeatEvery')}</Label>
            <Input
              type="number"
              min={1}
              value={repeat?.every ?? ''}
              onChange={(e) => {
                const every = e.target.value === '' ? undefined : Number(e.target.value);
                onRepeatChange?.(every === undefined ? undefined : { every, unit: repeat?.unit ?? 'day', anchor: repeat?.anchor });
              }}
              disabled={disabled}
              aria-label={t('flux.cron.repeatEvery')}
              data-testid="cron-editor-repeat-every"
              className="w-20"
            />
            <NativeSelect
              value={repeat?.unit ?? 'day'}
              onChange={(e) => {
                if (!repeat) return;
                onRepeatChange?.({ ...repeat, unit: e.target.value as 'day' | 'week' });
              }}
              disabled={disabled || !repeat}
              aria-label={t('flux.cron.repeatTitle')}
              data-testid="cron-editor-repeat-unit"
              className="w-24"
            >
              <option value="day">{t('flux.cron.repeatUnitDay')}</option>
              <option value="week">{t('flux.cron.repeatUnitWeek')}</option>
            </NativeSelect>
            <Input
              type="date"
              value={repeat?.anchor ?? ''}
              placeholder={range?.start ?? ''}
              title={t('flux.cron.repeatAnchorHint')}
              onChange={(e) => {
                if (!repeat) return;
                onRepeatChange?.({ ...repeat, anchor: e.target.value || undefined });
              }}
              disabled={disabled || !repeat}
              aria-label={t('flux.cron.repeatAnchor')}
              data-testid="cron-editor-repeat-anchor"
            />
            {repeat ? (
              <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onRepeatChange?.(undefined)} aria-label={t('flux.cron.clearRepeat')}>
                ✕
              </Button>
            ) : null}
          </div>
          {valueDiagnostic === 'repeatAnchorMissing' ? (
            <p className="text-destructive text-xs" data-testid="cron-editor-repeat-diagnostic">
              {t('flux.cron.errorRepeatAnchorMissing')}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {showRange ? (
        <fieldset className="rounded-md border p-2" data-slot="range-block" data-invalid={rangeInvalid ? true : undefined} disabled={disabled}>
          <legend className="text-muted-foreground px-1 text-xs">{t('flux.cron.rangeTitle')}</legend>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={range?.start ?? ''}
              onChange={(e) => onRangeChange?.({ ...range, start: e.target.value || undefined })}
              disabled={disabled}
              aria-label={t('flux.cron.rangeStart')}
              data-testid="cron-editor-range-start"
            />
            <Input
              type="date"
              value={range?.end ?? ''}
              onChange={(e) => onRangeChange?.({ ...range, end: e.target.value || undefined })}
              disabled={disabled}
              aria-label={t('flux.cron.rangeEnd')}
              data-testid="cron-editor-range-end"
            />
            <Input
              type="number"
              min={1}
              value={range?.count ?? ''}
              onChange={(e) => {
                const count = e.target.value === '' ? undefined : Number(e.target.value);
                onRangeChange?.(count === undefined ? { ...range, count: undefined } : { ...range, count });
              }}
              disabled={disabled}
              aria-label={t('flux.cron.rangeCount')}
              data-testid="cron-editor-range-count"
              className="w-24"
            />
            {range ? (
              <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => onRangeChange?.(undefined)} aria-label={t('flux.cron.clearRange')}>
                ✕
              </Button>
            ) : null}
          </div>
          {valueDiagnostic === 'rangeConflict' || valueDiagnostic === 'invertedRange' ? (
            <p className="text-destructive text-xs" data-testid="cron-editor-range-diagnostic">
              {t(valueDiagnostic === 'rangeConflict' ? 'flux.cron.errorRangeConflict' : 'flux.cron.errorInvertedRange')}
            </p>
          ) : null}
        </fieldset>
      ) : null}
    </div>
  );
}
