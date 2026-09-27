import { useState, type ChangeEvent } from 'react';
import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { Input, Textarea, Switch, Label, NativeSelect, NativeSelectOption } from '@nop-chaos/ui';
import type { PanelField } from './schema-extractor.js';
import { BindingEditorField, StateEditorField } from './binding-panel.js';

interface InspectorFieldProps {
  field: PanelField;
  value: unknown;
  error?: string;
  /** plan 522 / L5.3：点引用候选集（working copy variables id 集，binding/state 结构化面消费）。 */
  pointIds?: string[];
  onChange: (value: unknown) => void;
}

/**
 * 单个属性面板字段渲染（design-property-panel.md §5）。
 * 按 widget 类型渲染对应 @nop-chaos/ui 控件。M1 简化：slider 归入 number-input，
 * select 走 @nop-chaos/ui NativeSelect，complex widgets (point-ref/action-editor) 走 json-editor fallback。
 */
export function InspectorField(props: InspectorFieldProps) {
  const { field, value, error, onChange } = props;
  const { t } = useFluxTranslation();
  const widget = field.entry.widget ?? 'text-input';
  const label = field.entry.label ?? field.key;
  // [G5-视角4-01] Label ↔ 控件关联：label[for] 指向控件 id（button/labelable 元素点击 label 可达控件）。
  const fieldId = `nop-scada-inspector-${field.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  const errorEl = error ? <div className="nop-scada-editor-field-error">{error}</div> : null;

  if (widget === 'readonly') {
    return (
      <Label className="text-xs opacity-60">
        {t(label)}: {String(value ?? t('industrial.scada.editor.inspector.empty'))}
      </Label>
    );
  }

  // plan 522 / L5.3（design-binding-panel.md §2.1）：bindings/states 结构化编辑面。
  if (widget === 'binding-editor') {
    return <BindingEditorField value={value} error={error} pointIds={props.pointIds ?? []} onChange={onChange} />;
  }
  if (widget === 'state-editor') {
    return <StateEditorField value={value} error={error} pointIds={props.pointIds ?? []} onChange={onChange} />;
  }

  if (widget === 'json-editor') {
    return <JsonEditorField field={field} value={value} error={error} onChange={onChange} />;
  }

  if (widget === 'switch') {
    return (
      <div className="flex items-center gap-2">
        <Switch id={fieldId} checked={Boolean(value)} onCheckedChange={(v) => onChange(v)} />
        <Label htmlFor={fieldId} className="text-xs">{t(label)}</Label>
        {errorEl}
      </div>
    );
  }

  if (widget === 'select' && field.entry.enum) {
    return (
      <div>
        <Label htmlFor={fieldId} className="text-xs">{t(label)}</Label>
        <NativeSelect
          id={fieldId}
          size="xs"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.entry.enum.map((opt) => (
            <NativeSelectOption key={String(opt)} value={String(opt)}>
              {String(opt)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {errorEl}
      </div>
    );
  }

  const isNumeric = widget === 'number-input' || widget === 'slider';
  const inputType = widget === 'color-picker' ? 'color' : isNumeric ? 'number' : 'text';

  return (
    <div>
      <Label htmlFor={fieldId} className="text-xs">{t(label)}</Label>
      <Input
        id={fieldId}
        type={inputType}
        className="text-xs"
        min={field.entry.min}
        max={field.entry.max}
        step={field.entry.step}
        value={String(value ?? '')}
        onChange={(e) => {
          if (isNumeric) {
            onChange(Number(e.target.value));
          } else {
            onChange(e.target.value);
          }
        }}
      />
      {errorEl}
    </div>
  );
}

/**
 * json-editor 子字段（plan 2026-08-08-0900-1 Phase 1 / P2 #6）。
 *
 * 先前实现：parse 失败时 `catch → onChange(rawString)` 把裸字符串写进 workingConfig，
 * 与 schema 期望的对象类型不符（corrupt working copy）。
 *
 * 修正：引入局部 draft 文本态，parse 失败时显示 field-error 且**不**调 onChange（仅 parse 成功才提交）。
 * 外部 value 变化时同步 draft（React 推荐的「render 期 derived state」模式，避免 useEffect 镜像）；
 * 经 isSelfUpdate flag 区分「自身提交的回写」与「外部变更」，避免提交后 canonical 重格式化打断输入。
 */
function JsonEditorField(props: { field: PanelField; value: unknown; error?: string; onChange: (value: unknown) => void }) {
  const { field, value, error, onChange } = props;
  const { t } = useFluxTranslation();
  const label = field.entry.label ?? field.key;
  const externalText = typeof value === 'string' ? value : JSON.stringify(value ?? null, null, 2);

  const [prevValue, setPrevValue] = useState<unknown>(value);
  const [draft, setDraft] = useState<string>(externalText);
  const [parseError, setParseError] = useState<string | undefined>(undefined);
  const [selfUpdate, setSelfUpdate] = useState(false);

  // 外部 value 变化时同步 draft（仅当非自身提交回写——避免 canonical 重格式化 clobber 正在输入的文本）。
  if (value !== prevValue) {
    setPrevValue(value);
    if (selfUpdate) {
      setSelfUpdate(false);
    } else {
      setDraft(externalText);
      setParseError(undefined);
    }
  }

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setDraft(next);
    try {
      const parsed = JSON.parse(next);
      setSelfUpdate(true);
      onChange(parsed);
      setParseError(undefined);
    } catch {
      // plan 2026-08-08-0900-1 Phase 1 / P2 #6：parse 失败不写裸字符串到 workingConfig，仅显示 field-error。
      setParseError(t('industrial.scada.editor.inspector.invalidJson'));
    }
  };

  const showError = parseError ?? error;
  // [G5-视角4-01] json-editor 分支同样补 Label htmlFor ↔ Textarea id 关联。
  const fieldId = `nop-scada-inspector-${field.key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  return (
    <div>
      <Label htmlFor={fieldId} className="text-xs">{t(label)}</Label>
      <Textarea id={fieldId} className="text-xs font-mono" rows={3} value={draft} onChange={handleChange} />
      {showError ? <div className="nop-scada-editor-field-error">{showError}</div> : null}
    </div>
  );
}
