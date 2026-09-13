import { useFluxTranslation } from '@nop-chaos/flux-i18n';
import { Button, Input, Label, NativeSelect, Switch } from '@nop-chaos/ui';
import React from 'react';
import { PAPER_SIZE_PRESETS, type PrintElementSchema, PrintTableColumn } from '@nop-chaos/flux-print-core';
import { usePrintEditorSnapshot, type PrintEditorController } from './editor/use-print-editor.js';

export interface PrintInspectorProps {
  controller: PrintEditorController;
  className?: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="nop-print-inspector-section border-b border-border px-3 py-2 space-y-2" data-inspector-section={title}>
      <div className="text-xs font-semibold text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="w-24 shrink-0 text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

interface NumberFieldProps {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  step?: number;
}

function NumberField({ label, value, onChange, step = 1 }: NumberFieldProps) {
  return (
    <Row label={label}>
      <Input
        type="number"
        step={step}
        aria-label={label}
        className="h-7 text-xs"
        value={value === undefined ? '' : String(value)}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
      />
    </Row>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Row label={label}>
      <Input aria-label={label} className="h-7 text-xs" value={value} onChange={(event) => onChange(event.target.value)} />
    </Row>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <Row label={label}>
      <NativeSelect
        aria-label={label}
        className="h-7 flex-1 text-xs"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
    </Row>
  );
}

function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <Row label={label}>
      <Switch checked={checked} onCheckedChange={onChange} />
    </Row>
  );
}

export function PrintInspector({ controller, className }: PrintInspectorProps) {
  const { t } = useFluxTranslation();
  const { state } = usePrintEditorSnapshot(controller);
  const template = state.working;
  const selectedId = state.selection[0];
  const selected = template.elements.find((element) => element.id === selectedId);

  const patchElement = (patch: Partial<PrintElementSchema>) => {
    if (!selected) return;
    controller.updateElement(selected.id, patch);
  };

  if (!selected) {
    const paper = template.page.paper;
    const patchPaper = (patch: Partial<typeof paper>) => controller.updatePage({ paper: { ...paper, ...patch } });
    return (
      <div className={className} data-testid="print-inspector">
        <Section title={t('flux.print.inspector.templateSection')}>
          <TextField label={t('flux.print.inspector.name')} value={template.name} onChange={(name) => controller.renameTemplate(name)} />
          <SelectField
            label={t('flux.print.inspector.paper')}
            value={template.page.paperName ?? 'custom'}
            onChange={(value) => {
              const preset = value === 'custom' ? undefined : PAPER_SIZE_PRESETS[value];
              if (!preset) {
                controller.updatePage({ paperName: undefined });
                return;
              }
              // 预设是纵向基准尺寸；横向纸张交换宽高，保持 direction 元数据一致。
              const landscape = paper.direction === 'horizontal';
              controller.updatePage({
                paperName: value,
                paper: {
                  ...paper,
                  width: landscape ? preset.height : preset.width,
                  height: landscape ? preset.width : preset.height,
                },
              });
            }}
            options={[
              ...Object.keys(PAPER_SIZE_PRESETS).map((value) => ({ value, label: value.toUpperCase() })),
              { value: 'custom', label: t('flux.print.inspector.paperCustom') },
            ]}
          />
          <NumberField label={t('flux.print.inspector.paperWidth')} value={paper.width} onChange={(width) => patchPaper({ width })} />
          <NumberField label={t('flux.print.inspector.paperHeight')} value={paper.height} onChange={(height) => patchPaper({ height })} />
          <SelectField
            label={t('flux.print.inspector.direction')}
            value={paper.direction}
            onChange={(value) => {
              const direction = value as 'vertical' | 'horizontal';
              if (direction === paper.direction) return;
              // 切向/横向时交换宽高，纸张字面尺寸始终就是版面尺寸。
              controller.updatePage({
                paper: { ...paper, direction, width: paper.height, height: paper.width },
              });
            }}
            options={[
              { value: 'vertical', label: t('flux.print.inspector.vertical') },
              { value: 'horizontal', label: t('flux.print.inspector.horizontal') },
            ]}
          />
          <NumberField label={t('flux.print.inspector.marginTop')} value={paper.margins[0]} onChange={(marginTop) => patchPaper({ margins: [marginTop, paper.margins[1], paper.margins[2], paper.margins[3]] })} />
          <NumberField label={t('flux.print.inspector.marginRight')} value={paper.margins[1]} onChange={(marginRight) => patchPaper({ margins: [paper.margins[0], marginRight, paper.margins[2], paper.margins[3]] })} />
          <NumberField label={t('flux.print.inspector.marginBottom')} value={paper.margins[2]} onChange={(marginBottom) => patchPaper({ margins: [paper.margins[0], paper.margins[1], marginBottom, paper.margins[3]] })} />
          <NumberField label={t('flux.print.inspector.marginLeft')} value={paper.margins[3]} onChange={(marginLeft) => patchPaper({ margins: [paper.margins[0], paper.margins[1], paper.margins[2], marginLeft] })} />
          <NumberField label={t('flux.print.inspector.headerHeight')} value={template.page.headerHeight} onChange={(headerHeight) => controller.updatePage({ headerHeight })} />
          <NumberField label={t('flux.print.inspector.footerHeight')} value={template.page.footerHeight} onChange={(footerHeight) => controller.updatePage({ footerHeight })} />
        </Section>
        <div className="px-3 py-6 text-xs text-muted-foreground">{t('flux.print.inspector.noneSelected')}</div>
      </div>
    );
  }

  return (
    <div className={className} data-testid="print-inspector">
      <Section title={t('flux.print.inspector.positionSection')}>
        <NumberField label={t('flux.print.inspector.left')} value={selected.left} onChange={(left) => patchElement({ left })} />
        <NumberField label={t('flux.print.inspector.top')} value={selected.top} onChange={(top) => patchElement({ top })} />
        <NumberField label={t('flux.print.inspector.width')} value={selected.width} onChange={(width) => patchElement({ width })} />
        <NumberField label={t('flux.print.inspector.height')} value={selected.height} onChange={(height) => patchElement({ height })} />
        <NumberField label={t('flux.print.inspector.rotate')} value={selected.rotate} onChange={(rotate) => patchElement({ rotate } as Partial<PrintElementSchema>)} />
        <SelectField
          label={t('flux.print.inspector.region')}
          value={selected.region}
          onChange={(value) => patchElement({ region: value } as Partial<PrintElementSchema>)}
          options={[
            { value: 'header', label: t('flux.print.inspector.regionHeader') },
            { value: 'body', label: t('flux.print.inspector.regionBody') },
            { value: 'footer', label: t('flux.print.inspector.regionFooter') },
          ]}
        />
      </Section>
      <TypeSpecificSection controller={controller} selected={selected} />
      <StyleSection selected={selected} patchElement={patchElement} />
    </div>
  );
}

function StyleSection({
  selected,
  patchElement,
}: {
  selected: PrintElementSchema;
  patchElement: (patch: Partial<PrintElementSchema>) => void;
}) {
  const { t } = useFluxTranslation();
  const style = selected.style;
  return (
    <Section title={t('flux.print.inspector.styleSection')}>
      <NumberField label={t('flux.print.inspector.fontSize')} value={style.fontSize} onChange={(fontSize) => patchElement({ style: { ...style, fontSize } } as Partial<PrintElementSchema>)} />
      <SelectField
        label={t('flux.print.inspector.textAlign')}
        value={style.textAlign ?? 'left'}
        onChange={(value) => patchElement({ style: { ...style, textAlign: value } } as Partial<PrintElementSchema>)}
        options={[
          { value: 'left', label: t('flux.print.inspector.alignLeft') },
          { value: 'center', label: t('flux.print.inspector.alignCenter') },
          { value: 'right', label: t('flux.print.inspector.alignRight') },
        ]}
      />
      <TextField label={t('flux.print.inspector.color')} value={style.color ?? ''} onChange={(color) => patchElement({ style: { ...style, color } } as Partial<PrintElementSchema>)} />
      <TextField label={t('flux.print.inspector.backgroundColor')} value={style.backgroundColor ?? ''} onChange={(backgroundColor) => patchElement({ style: { ...style, backgroundColor } } as Partial<PrintElementSchema>)} />
      <NumberField label={t('flux.print.inspector.borderWidth')} value={style.borderWidth} onChange={(borderWidth) => patchElement({ style: { ...style, borderWidth } } as Partial<PrintElementSchema>)} />
      <TextField label={t('flux.print.inspector.borderColor')} value={style.borderColor ?? ''} onChange={(borderColor) => patchElement({ style: { ...style, borderColor } } as Partial<PrintElementSchema>)} />
    </Section>
  );
}

function TypeSpecificSection({
  controller,
  selected,
}: {
  controller: PrintEditorController;
  selected: PrintElementSchema;
}) {
  const { t } = useFluxTranslation();
  const patch = (p: Partial<PrintElementSchema>) => controller.updateElement(selected.id, p);

  if (selected.type === 'text') {
    return (
      <Section title={t('flux.print.inspector.dataSection')}>
        <TextField label={t('flux.print.inspector.text')} value={selected.text} onChange={(text) => patch({ text } as Partial<PrintElementSchema>)} />
        <TextField label={t('flux.print.inspector.field')} value={selected.field ?? ''} onChange={(field) => patch({ field } as Partial<PrintElementSchema>)} />
        <SwitchField label={t('flux.print.inspector.autoGrow')} checked={selected.autoGrow ?? false} onChange={(autoGrow) => patch({ autoGrow } as Partial<PrintElementSchema>)} />
      </Section>
    );
  }
  if (selected.type === 'image') {
    return (
      <Section title={t('flux.print.inspector.dataSection')}>
        <TextField label={t('flux.print.inspector.src')} value={selected.src ?? ''} onChange={(src) => patch({ src } as Partial<PrintElementSchema>)} />
        <TextField label={t('flux.print.inspector.field')} value={selected.field ?? ''} onChange={(field) => patch({ field } as Partial<PrintElementSchema>)} />
        <SelectField
          label={t('flux.print.inspector.fit')}
          value={selected.fit}
          onChange={(value) => patch({ fit: value } as Partial<PrintElementSchema>)}
          options={[
            { value: 'contain', label: t('flux.print.inspector.fitContain') },
            { value: 'cover', label: t('flux.print.inspector.fitCover') },
            { value: 'fill', label: t('flux.print.inspector.fitFill') },
          ]}
        />
      </Section>
    );
  }
  if (selected.type === 'table') {
    const updateColumn = (index: number, columnPatch: Partial<PrintTableColumn>) => {
      patch({
        columns: selected.columns.map((column, i) => (i === index ? { ...column, ...columnPatch } : column)),
      } as Partial<PrintElementSchema>);
    };
    return (
      <Section title={t('flux.print.inspector.dataSection')}>
        <TextField label={t('flux.print.inspector.source')} value={selected.source} onChange={(source) => patch({ source } as Partial<PrintElementSchema>)} />
        <NumberField label={t('flux.print.inspector.rowHeight')} value={selected.rowHeight} onChange={(rowHeight) => patch({ rowHeight } as Partial<PrintElementSchema>)} />
        <SwitchField label={t('flux.print.inspector.zebra')} checked={selected.zebra ?? false} onChange={(zebra) => patch({ zebra } as Partial<PrintElementSchema>)} />
        <SwitchField label={t('flux.print.inspector.repeatHeader')} checked={selected.repeatHeader ?? true} onChange={(repeatHeader) => patch({ repeatHeader } as Partial<PrintElementSchema>)} />
        <SelectField
          label={t('flux.print.inspector.footerAggregate')}
          value={selected.footerAggregate ?? 'lastPage'}
          onChange={(value) => patch({ footerAggregate: value } as Partial<PrintElementSchema>)}
          options={[
            { value: 'none', label: t('flux.print.inspector.aggregateNone') },
            { value: 'lastPage', label: t('flux.print.inspector.aggregateLastPage') },
            { value: 'everyPage', label: t('flux.print.inspector.aggregateEveryPage') },
          ]}
        />
        <div className="space-y-1" data-testid="print-inspector-columns">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">{t('flux.print.inspector.columnsSection')}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={() => patch({ columns: [...selected.columns, { label: '', width: 'auto' }] } as Partial<PrintElementSchema>)}
            >
              {t('flux.print.inspector.addColumn')}
            </Button>
          </div>
          {selected.columns.map((column, index) => (
            // eslint-disable-next-line react/no-array-index-key -- 编辑期以 index 为行身份（label 可重复/可变）
            <div key={`${column.label}-${index}`} className="rounded border border-border p-1 space-y-1">
              <div className="flex items-center gap-1">
                <Input
                  className="h-6 flex-1 text-xs"
                  placeholder={t('flux.print.inspector.columnLabel')}
                  value={column.label}
                  onChange={(event) => updateColumn(index, { label: event.target.value })}
                />
                <Input
                  className="h-6 flex-1 text-xs"
                  placeholder={t('flux.print.inspector.columnField')}
                  value={column.field ?? ''}
                  onChange={(event) => updateColumn(index, { field: event.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t('flux.print.inspector.removeColumn')}
                  className="h-6 text-xs"
                  onClick={() => patch({ columns: selected.columns.filter((_, i) => i !== index) } as Partial<PrintElementSchema>)}
                >
                  ×
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <NumberField label={t('flux.print.inspector.columnWidth')} value={typeof column.width === 'number' ? column.width : undefined} onChange={(width) => updateColumn(index, { width } as Partial<PrintTableColumn>)} />
                <SelectField
                  label={t('flux.print.inspector.columnAlign')}
                  value={column.align ?? 'left'}
                  onChange={(value) => updateColumn(index, { align: value } as Partial<PrintTableColumn>)}
                  options={[
                    { value: 'left', label: t('flux.print.inspector.alignLeft') },
                    { value: 'center', label: t('flux.print.inspector.alignCenter') },
                    { value: 'right', label: t('flux.print.inspector.alignRight') },
                  ]}
                />
                <SelectField
                  label={t('flux.print.inspector.columnAggregate')}
                  value={column.aggregate ?? 'none'}
                  onChange={(value) => updateColumn(index, { aggregate: value === 'none' ? undefined : value } as Partial<PrintTableColumn>)}
                  options={[
                    { value: 'none', label: t('flux.print.inspector.aggregateNone') },
                    { value: 'sum', label: 'Sum' },
                    { value: 'count', label: 'Count' },
                    { value: 'avg', label: 'Avg' },
                    { value: 'min', label: 'Min' },
                    { value: 'max', label: 'Max' },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>
    );
  }
  if (selected.type === 'barcode') {
    return (
      <Section title={t('flux.print.inspector.dataSection')}>
        <TextField label={t('flux.print.inspector.value')} value={selected.value ?? ''} onChange={(value) => patch({ value } as Partial<PrintElementSchema>)} />
        <TextField label={t('flux.print.inspector.field')} value={selected.field ?? ''} onChange={(field) => patch({ field } as Partial<PrintElementSchema>)} />
        <SelectField
          label={t('flux.print.inspector.barcodeType')}
          value={selected.barcodeType}
          onChange={(value) => patch({ barcodeType: value } as Partial<PrintElementSchema>)}
          options={['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC', 'ITF', 'CODABAR'].map((value) => ({ value, label: value }))}
        />
        <SwitchField label={t('flux.print.inspector.textVisible')} checked={selected.textVisible ?? true} onChange={(textVisible) => patch({ textVisible } as Partial<PrintElementSchema>)} />
      </Section>
    );
  }
  if (selected.type === 'qrcode') {
    return (
      <Section title={t('flux.print.inspector.dataSection')}>
        <TextField label={t('flux.print.inspector.value')} value={selected.value ?? ''} onChange={(value) => patch({ value } as Partial<PrintElementSchema>)} />
        <TextField label={t('flux.print.inspector.field')} value={selected.field ?? ''} onChange={(field) => patch({ field } as Partial<PrintElementSchema>)} />
        <SelectField
          label={t('flux.print.inspector.level')}
          value={selected.level}
          onChange={(value) => patch({ level: value } as Partial<PrintElementSchema>)}
          options={['L', 'M', 'Q', 'H'].map((value) => ({ value, label: value }))}
        />
        <TextField label={t('flux.print.inspector.foreground')} value={selected.foreground ?? ''} onChange={(foreground) => patch({ foreground } as Partial<PrintElementSchema>)} />
      </Section>
    );
  }
  if (selected.type === 'line') {
    return (
      <Section title={t('flux.print.inspector.dataSection')}>
        <SelectField
          label={t('flux.print.inspector.lineDirection')}
          value={selected.direction}
          onChange={(value) => patch({ direction: value } as Partial<PrintElementSchema>)}
          options={[
            { value: 'horizontal', label: t('flux.print.inspector.directionHorizontal') },
            { value: 'vertical', label: t('flux.print.inspector.directionVertical') },
          ]}
        />
      </Section>
    );
  }
  if (selected.type === 'pageNumber' || selected.type === 'printDate') {
    return (
      <Section title={t('flux.print.inspector.dataSection')}>
        <TextField label={t('flux.print.inspector.format')} value={selected.format ?? ''} onChange={(format) => patch({ format } as Partial<PrintElementSchema>)} />
      </Section>
    );
  }
  return (
    <Section title={t('flux.print.inspector.dataSection')}>
      <div />
    </Section>
  );
}
