import { useRef, useState } from 'react';
import { type RendererComponentProps } from '@nop-chaos/flux-core';
import { useStandardFieldHandle } from '../use-standard-field-handle.js';
import { Button, Input, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { builtinPresets, deriveFrequency, fireSequence, validateCronScheduleValue, type CronScheduleValue, type CronFrequency, type ValueDiagnosticCode } from '../cron/index.js';
import { useFormFieldFromProps } from '../field-utils.js';
import type { CronEditorSchema } from '../schemas-cron.js';
import { buildWizardCron, CronEditorWizard, type WizardFields } from './cron-editor-wizard.js';
import { CronEditorBlocks } from './cron-editor-blocks.js';
import { CRON_SEGMENTS, useCronEditorController } from './use-cron-editor-controller.js';

const DIAGNOSTIC_TEXT_KEYS: Record<string, string> = {
  fieldCount: 'flux.cron.errorFieldCount',
  badToken: 'flux.cron.errorBadToken',
  outOfRange: 'flux.cron.errorOutOfRange',
  invertedRange: 'flux.cron.errorInvertedRange',
  stepInvalid: 'flux.cron.errorStepInvalid',
  questionMark: 'flux.cron.errorQuestionMark',
  unsupportedToken: 'flux.cron.errorUnsupportedToken',
  impossible: 'flux.cron.errorImpossible',
  repeatAnchorMissing: 'flux.cron.errorRepeatAnchorMissing',
  rangeConflict: 'flux.cron.errorRangeConflict',
};

function diagnosticText(code: ValueDiagnosticCode | string | null): string | null {
  if (code === null) return null;
  const key = DIAGNOSTIC_TEXT_KEYS[code];
  return key ? t(key) : null;
}

const DEFAULT_PREVIEW_COUNT = 5;

// locale 文件为 camel 键约定（presetHourly 等），id → 键映射（dev log 记录：与 C4 规划的嵌套 preset.<id> 不同形）
const PRESET_LABEL_KEYS: Record<string, string> = {
  hourly: 'flux.cron.presetHourly',
  'daily-9': 'flux.cron.presetDaily9',
  'workday-9': 'flux.cron.presetWorkday9',
  'weekly-mon-10': 'flux.cron.presetWeeklyMon10',
  'monthly-first-9': 'flux.cron.presetMonthlyFirst9',
  'monthly-last-23': 'flux.cron.presetMonthlyLast23',
  'yearly-1-1': 'flux.cron.presetYearly11',
};

// 预览锚点（模块加载时取样；渲染期不纯调用规避）
const PREVIEW_CURSOR = { nowMs: Date.now(), offsetMinutes: -new Date().getTimezoneOffset() };

/**
 * cron-editor（cron 轨道 C5，plan 540）：双模式（visual 分段 / text 表达式）定时计划编辑字段。
 * 值 = CronScheduleValue；编辑按提交门控覆写 cron 键并透传 repeat/range。
 */
export function CronEditorRenderer(props: RendererComponentProps<CronEditorSchema>) {
  const name = String(props.props.name ?? '');
  const mode = props.props.mode === 'text' ? 'text' : 'visual';
  const showPreview = props.props.showPreview !== false;
  const rawCount = typeof props.props.previewCount === 'number' ? props.props.previewCount : DEFAULT_PREVIEW_COUNT;
  const previewCount = Math.min(20, Math.max(1, Math.round(rawCount)));
  const clearable = props.props.clearable === true;

  const { value, handlers, presentation } = useFormFieldFromProps(props);
  const boundValue = (value ?? undefined) as CronScheduleValue | undefined;
  // mode 是用户可切换的交互态（schema prop 为初值；外部静态切面按 prop 表达式求值）
  const [activeMode, setActiveMode] = useState<'visual' | 'text'>(mode);
  const controller = useCronEditorController(boundValue, activeMode, (next) => handlers.onChange(next));

  // 档位（plan 541 裁决 1）：手选为本地选中态覆盖派生显示，合法提交后回落派生
  const derivedTier = controller.committedParsed ? deriveFrequency(controller.committedParsed) : 'custom';
  const [pickedTier, setPickedTier] = useState<CronFrequency | null>(null);
  const activeTier: CronFrequency = pickedTier ?? derivedTier;
  const wizardTier = activeTier === 'custom' ? null : activeTier;
  const [wizardFields, setWizardFields] = useState<WizardFields>({});
  const showRepeatBlock = props.props.showRepeat !== false;
  const showRangeBlock = props.props.showRange !== false;
  const schemaPresets = props.props.presets;
  const presetOptions = (schemaPresets ?? builtinPresets.map((p) => ({ label: t((PRESET_LABEL_KEYS[p.id] ?? `flux.cron.preset.${p.id}`) as Parameters<typeof t>[0]), value: { cron: p.cron } }))) as Array<{ label: string; value: CronScheduleValue }>;

  const handleWizardFields = (fields: WizardFields) => {
    setWizardFields(fields);
    if (wizardTier) controller.commitWizard(buildWizardCron(wizardTier, fields) ?? '');
  };
  // 向导字段显示：草稿优先，缺省从已提交 cron 派生（render-time derivation）
  const effectiveWizardFields: WizardFields = (() => {
    const pc = controller.committedParsed;
    if (!pc) return wizardFields;
    const single = (f: { items: Array<{ kind: string; v?: number }> }) =>
      f.items.length === 1 && f.items[0].kind === 'single' ? f.items[0].v : undefined;
    const base: WizardFields = {
      h: single(pc.hours),
      mi: single(pc.minutes),
      s: single(pc.seconds),
      dows: pc.dynamicWeek || pc.daysOfWeek.items[0]?.kind === 'star' ? undefined : [...pc.daysOfWeek.set].sort((a, b) => a - b),
      day: single(pc.daysOfMonth),
      month: single(pc.months),
    };
    return { ...base, ...wizardFields };
  })();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const firstSegmentRef = useRef<HTMLInputElement | null>(null);

  // 预览：只对合法已提交值做本地纯推导。Date.now()/getTimezoneOffset() 是渲染期不纯调用
  // （react-hooks 纯度规则）——模块加载时取样一次（长会话下预览锚点静止，刷新机制记 C7 候选）。
  const valueDiagnostic = boundValue ? validateCronScheduleValue(boundValue).code : null;
  const preview =
    showPreview && boundValue && valueDiagnostic === null && controller.committedParsed
      ? fireSequence(boundValue, PREVIEW_CURSOR.nowMs, previewCount, PREVIEW_CURSOR.offsetMinutes)
      : null;

  useStandardFieldHandle({
    id: props.id,
    name,
    type: 'cron-editor',
    cid: props.meta.cid,
    methods: ['clear', 'reset', 'focus'] as const,
    getFocusTarget: () =>
      (activeMode === 'text' ? textInputRef.current : firstSegmentRef.current) ?? rootRef.current,
    interactive: presentation.interactive,
    visible: props.meta.visible !== false,
    clearValue: () => handlers.onChange(undefined),
    resetValue: () => {
      handlers.onChange(boundValue);
      return { fellBackToDefault: false };
    },
  });

  const diagnostic = diagnosticText(controller.diagnosticCode ?? valueDiagnostic);
  const interactive = presentation.interactive;

  const handleTextChange = (next: string) => {
    if (next.trim() === '') {
      // 清空文本 = 清值（clearable 语义的对偶）
      controller.clearDrafts();
      handlers.onChange(undefined);
      return;
    }
    controller.setTextDraft(next);
  };

  return (
    <div
      ref={rootRef}
      className={cn('nop-cron-editor', props.meta.className)}
      data-slot="cron-editor"
      data-invalid={diagnostic ? true : undefined}
      data-testid={props.meta.testid}
    >
      <div className="flex items-center gap-2" data-slot="mode-switch">
        <Button
          type="button"
          variant={activeMode === 'visual' ? 'default' : 'outline'}
          size="sm"
          disabled={!interactive}
          onClick={() => {
            controller.switchMode('visual');
            // 裁决 1/3：模式切换丢弃向导草稿与手选档位，回落已提交 cron 派生
            setWizardFields({});
            setPickedTier(null);
            setActiveMode('visual');
          }}
          aria-pressed={activeMode === 'visual'}
        >
          {t('flux.cron.modeVisual')}
        </Button>
        <Button
          type="button"
          variant={activeMode === 'text' ? 'default' : 'outline'}
          size="sm"
          disabled={!interactive}
          onClick={() => {
            controller.switchMode('text');
            // 裁决 3：切 text = 向导草稿丢弃；裁决 1：手选档位回落派生
            setWizardFields({});
            setPickedTier(null);
            setActiveMode('text');
          }}
          aria-pressed={activeMode === 'text'}
        >
          {t('flux.cron.modeText')}
        </Button>
        {clearable && interactive ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              controller.clearDrafts();
              handlers.onChange(undefined);
            }}
            aria-label={t('flux.cron.clearAriaLabel')}
            data-testid="cron-editor-clear"
          >
            ✕
          </Button>
        ) : null}
      </div>

      {activeMode === 'visual' ? (
        <div className="flex flex-col gap-2" data-slot="cron-visual" data-testid="cron-editor-visual">
          <div
            role="radiogroup"
            aria-label={t('flux.cron.tierGroup')}
            className="flex flex-wrap gap-1"
            data-slot="tier-bar"
            data-testid="cron-editor-tiers"
            onKeyDown={(event) => {
              const tiers: CronFrequency[] = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];
              const delta =
                event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
              if (!delta || !interactive) return;
              event.preventDefault();
              const current = event.currentTarget as HTMLElement;
              const index = tiers.indexOf(activeTier);
              const next = tiers[(index + delta + tiers.length) % tiers.length];
              setPickedTier(next);
              setWizardFields({});
              current.querySelector<HTMLElement>(`[data-testid="cron-editor-tier-${next}"]`)?.focus();
            }}
          >
            {(['daily', 'weekly', 'monthly', 'yearly', 'custom'] as CronFrequency[]).map((tierKey) => (
              <button
                key={tierKey}
                type="button"
                role="radio"
                aria-checked={activeTier === tierKey}
                tabIndex={activeTier === tierKey ? 0 : -1}
                disabled={!interactive}
                onClick={() => {
                  setPickedTier(tierKey);
                  setWizardFields({});
                }}
                className={cn(
                  'rounded-md px-2 py-1 text-xs',
                  activeTier === tierKey ? 'bg-primary text-primary-foreground' : 'border text-muted-foreground',
                )}
                data-testid={`cron-editor-tier-${tierKey}`}
              >
                {t((`flux.cron.tier${tierKey[0].toUpperCase()}${tierKey.slice(1)}`) as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>
          {wizardTier !== null ? (
            <CronEditorWizard tier={wizardTier} fields={effectiveWizardFields} disabled={!interactive} onFieldsChange={handleWizardFields} />
          ) : (
            <div className="flex flex-wrap items-center gap-2" data-slot="segment-group" role="group" aria-label={name}>
              {CRON_SEGMENTS.map((segment, index) => (
                <Input
                  key={segment}
                  ref={index === 0 ? firstSegmentRef : undefined}
                  value={controller.segmentValue(segment)}
                  onChange={(event) => controller.setSegmentDraft(segment, event.target.value)}
                  disabled={!interactive}
                  readOnly={!interactive}
                  placeholder={segment === 'year' ? '—' : '*'}
                  aria-label={t(`flux.cron.seg${segment[0].toUpperCase()}${segment.slice(1)}` as Parameters<typeof t>[0])}
                  data-testid={`cron-editor-segment-${segment}`}
                  className="w-20"
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <Input
          ref={textInputRef}
          value={controller.textDraft ?? controller.committedCron}
          onChange={(event) => handleTextChange(event.target.value)}
          disabled={!interactive}
          readOnly={!interactive}
          placeholder="0 0 9 ? * MON-FRI"
          aria-label={name || t('flux.cron.modeText')}
          data-slot="text-input"
          data-testid="cron-editor-text"
        />
      )}

      {activeMode === 'visual' ? (
        <div className="flex flex-wrap items-center gap-2" data-slot="preset-row">
          <label className="text-muted-foreground text-xs" htmlFor="cron-editor-preset-select">{t('flux.cron.presetLabel')}</label>
          <select
            id="cron-editor-preset-select"
            defaultValue=""
            disabled={!interactive}
            onChange={(event) => {
              const preset = presetOptions[Number(event.target.value)];
              if (preset) {
                controller.clearDrafts();
                // 裁决 4：应用即重置为预设形状——档位条随 deriveFrequency 重新定位
                setPickedTier(null);
                setWizardFields({});
                handlers.onChange(preset.value);
              }
              event.target.value = '';
            }}
            aria-label={t('flux.cron.presetLabel')}
            data-testid="cron-editor-preset-select"
            className="rounded-md border bg-transparent px-2 py-1 text-xs"
          >
            <option value="">—</option>
            {presetOptions.map((preset, index) => (
              <option key={`${preset.label}-${JSON.stringify(preset.value)}`} value={index}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {activeMode === 'visual' && (showRepeatBlock || showRangeBlock) ? (
        <CronEditorBlocks
          value={boundValue}
          valueDiagnostic={valueDiagnostic}
          disabled={!interactive}
          showRepeat={showRepeatBlock}
          showRange={showRangeBlock}
          onRepeatChange={showRepeatBlock ? controller.commitRepeat : undefined}
          onRangeChange={showRangeBlock ? controller.commitRange : undefined}
        />
      ) : null}

      <div data-slot="diagnostics" aria-live="polite">
        {diagnostic ? (
          <p className="text-destructive text-xs" data-testid="cron-editor-diagnostic">
            {diagnostic}
          </p>
        ) : null}
      </div>

      {showPreview ? (
        <div data-slot="preview" aria-label={t('flux.cron.previewTitle')}>
          <p className="text-muted-foreground text-xs">{t('flux.cron.previewTitle')}</p>
          {preview !== null && preview.fires.length > 0 ? (
            <ol className="text-xs" data-testid="cron-editor-preview">
              {preview.fires.map((ms) => (
                <li key={ms}>{new Date(ms).toLocaleString()}</li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground text-xs" data-testid="cron-editor-preview-empty">
              {t('flux.cron.previewEmpty')}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
