import { useRef, useState } from 'react';
import { type RendererComponentProps } from '@nop-chaos/flux-core';
import { useInputComponentHandle } from '@nop-chaos/flux-react';
import { Button, Input, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import { fireSequence, validateCronScheduleValue, type CronScheduleValue, type ValueDiagnosticCode } from '../cron/index.js';
import { useFormFieldFromProps } from '../field-utils.js';
import type { CronEditorSchema } from '../schemas-cron.js';
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

  useInputComponentHandle({
    id: props.id,
    name,
    type: 'cron-editor',
    cid: props.meta.cid,
    methods: ['clear', 'reset', 'focus'] as const,
    getFocusTarget: () =>
      (activeMode === 'text' ? textInputRef.current : firstSegmentRef.current) ?? rootRef.current,
    isInteractive: () => presentation.interactive,
    isVisible: () => props.meta.visible !== false,
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
