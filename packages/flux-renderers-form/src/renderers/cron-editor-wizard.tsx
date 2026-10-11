// Office 档位向导编译（cron 轨道 C6, plan 541）：模板 + 结构化字段 → cron expr。
// 纯函数；产物经 parseCron → serializeCron canonical 归一后提交（裁决 5，调用方负责）。
import type { CronFrequency } from '../cron/types.js';

export interface WizardFields {
  h?: number;
  mi?: number;
  s?: number;
  /** 周几多选（0-6，0=周日） */
  dows?: number[];
  day?: number;
  month?: number;
}

function compressDows(dows: number[]): string {
  const sorted = [...dows].sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    if (j - i >= 2) parts.push(`${sorted[i]}-${sorted[j]}`);
    else parts.push(...sorted.slice(i, j + 1).map(String));
    i = j + 1;
  }
  return parts.join(',');
}

/** 不完整字段返回 null（提交门控不提交，裁决 M-1）；完整字段编译四档模板 */
export function buildWizardCron(tier: Exclude<CronFrequency, 'custom'>, fields: WizardFields): string | null {
  const { h, mi, s } = fields;
  if (h === undefined || mi === undefined || s === undefined) return null;
  const time = `${s} ${mi} ${h}`;
  if (tier === 'daily') return `${time} * * *`;
  if (tier === 'weekly') {
    if (!fields.dows || fields.dows.length === 0) return null;
    return `${time} ? * ${compressDows(fields.dows)}`;
  }
  if (tier === 'monthly') {
    if (fields.day === undefined) return null;
    return `${time} ${fields.day} * ?`;
  }
  if (fields.day === undefined || fields.month === undefined) return null;
  return `${time} ${fields.day} ${fields.month} ?`;
}

// ─── 向导字段 UI（档位条由 renderer 持有——单一档位条避免双 radiogroup 重复） ───
import { Input, Label, NativeSelect } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';

interface CronEditorWizardProps {
  tier: Exclude<CronFrequency, 'custom'>;
  fields: WizardFields;
  disabled: boolean;
  onFieldsChange: (fields: WizardFields) => void;
}

function numberOrUndefined(v: string): number | undefined {
  return v === '' ? undefined : Number(v);
}

// WA-form-002: weekday option labels keyed by their own i18n vocabulary — the
// previous list copied the CRON_SEGMENTS-derived keys, rendering segment names
// (秒/分/时/…) as weekday labels.
const DOW_LABEL_KEYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** 四档结构化字段编辑（时间三段 + 档位专属字段）；编译提交由调用方经 commitWizard 门控 */
export function CronEditorWizard({ tier, fields, disabled, onFieldsChange }: CronEditorWizardProps) {
  const setTime = (key: 'h' | 'mi' | 's', v: string) => onFieldsChange({ ...fields, [key]: numberOrUndefined(v) });
  return (
    <div className="flex flex-col gap-2" data-slot="cron-wizard">
      <div className="flex flex-wrap items-center gap-2">
        {(['s', 'mi', 'h'] as const).map((key) => (
          <Input
            key={key}
            type="number"
            min={0}
            value={fields[key] ?? ''}
            onChange={(e) => setTime(key, e.target.value)}
            disabled={disabled}
            aria-label={t(key === 's' ? 'flux.cron.segSecond' : key === 'mi' ? 'flux.cron.segMinute' : 'flux.cron.segHour')}
            data-testid={`cron-editor-wizard-${key}`}
            className="w-16"
          />
        ))}
        {tier === 'weekly' ? (
          <NativeSelect
            multiple
            value={(fields.dows ?? []).map(String)}
            onChange={(e) => {
              const dows = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
              onFieldsChange({ ...fields, dows });
            }}
            disabled={disabled}
            aria-label={t('flux.cron.segWeek')}
            data-testid="cron-editor-wizard-dows"
            className="h-24 w-24"
          >
            {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
              <option key={dow} value={dow}>
                {t(`flux.cron.dow${DOW_LABEL_KEYS[dow]}` as Parameters<typeof t>[0])}
              </option>
            ))}
          </NativeSelect>
        ) : null}
        {tier === 'monthly' || tier === 'yearly' ? (
          <div className="flex items-center gap-1">
            <Label className="text-xs">{t('flux.cron.segDay')}</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={fields.day ?? ''}
              onChange={(e) => onFieldsChange({ ...fields, day: numberOrUndefined(e.target.value) })}
              disabled={disabled}
              aria-label={t('flux.cron.segDay')}
              data-testid="cron-editor-wizard-day"
              className="w-16"
            />
          </div>
        ) : null}
        {tier === 'yearly' ? (
          <div className="flex items-center gap-1">
            <Label className="text-xs">{t('flux.cron.segMonth')}</Label>
            <NativeSelect
              value={fields.month ?? ''}
              onChange={(e) => onFieldsChange({ ...fields, month: numberOrUndefined(e.target.value) })}
              disabled={disabled}
              aria-label={t('flux.cron.segMonth')}
              data-testid="cron-editor-wizard-month"
              className="w-20"
            >
              <option value="">—</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : null}
      </div>
    </div>
  );
}
