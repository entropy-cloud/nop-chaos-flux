import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { Input, Textarea, Switch, Label, NativeSelect, NativeSelectOption } from '@nop-chaos/ui';
import type { PanelField } from './schema-extractor.js';

interface InspectorFieldProps {
  field: PanelField;
  value: unknown;
  error?: string;
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

  const errorEl = error ? <div className="nop-scada-editor-field-error">{error}</div> : null;

  if (widget === 'readonly') {
    return (
      <Label className="text-xs opacity-60">
        {t(label)}: {String(value ?? t('industrial.scada.editor.inspector.empty'))}
      </Label>
    );
  }

  if (widget === 'json-editor') {
    const text = typeof value === 'string' ? value : JSON.stringify(value ?? null, null, 2);
    return (
      <div>
        <Label className="text-xs">{t(label)}</Label>
        <Textarea
          className="text-xs font-mono"
          rows={3}
          value={text}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
        />
        {errorEl}
      </div>
    );
  }

  if (widget === 'switch') {
    return (
      <div className="flex items-center gap-2">
        <Switch checked={Boolean(value)} onCheckedChange={(v) => onChange(v)} />
        <Label className="text-xs">{t(label)}</Label>
        {errorEl}
      </div>
    );
  }

  if (widget === 'select' && field.entry.enum) {
    return (
      <div>
        <Label className="text-xs">{t(label)}</Label>
        <NativeSelect
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
      <Label className="text-xs">{t(label)}</Label>
      <Input
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
