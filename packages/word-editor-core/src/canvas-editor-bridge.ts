import Editor from '@hufe921/canvas-editor';
import { PaperDirection } from '@hufe921/canvas-editor';
import type { WordEditorData, WordEditorRangeStyle, WordEditorResult } from './canvas-editor-types.js';
import type { PaperSettings } from './paper-settings.js';
import type { TemplateExpr } from './template-expr.js';
import { exprToUrl, buildElExpression } from './template-expr.js';
import type { DocChart } from './chart-model.js';
import type { DocCode } from './code-model.js';

export interface CanvasEditorBridgeOptions {
  onContentChange?: () => void;
  onRangeStyleChange?: (payload: WordEditorRangeStyle) => void;
  onPageSizeChange?: (payload: number) => void;
  onPageScaleChange?: (payload: number) => void;
  readonly?: boolean;
}

export type { WordEditorRangeStyle };

export class CanvasEditorBridge {
  private instance: Editor | null = null;
  private contentChangeSubscribers = new Set<() => void>();
  private _readonly: boolean;

  constructor(readonly?: boolean) {
    this._readonly = readonly ?? false;
  }

  get command() {
    return this.instance?.command;
  }

  get isReadonly(): boolean {
    return this._readonly;
  }

  get listener() {
    return this.instance?.listener;
  }

  get register() {
    return this.instance?.register;
  }

  mount(
    container: HTMLDivElement,
    data: WordEditorData,
    options?: CanvasEditorBridgeOptions,
    paperSettings?: PaperSettings,
  ): void {
    if (this.instance) {
      this.unmount();
    }

    this.instance = new Editor(container, data);
    this.setupListeners(options);

    if (paperSettings) {
      this.applyPaperSettings(paperSettings);
    }
  }

  unmount(): void {
    this.instance?.destroy();
    this.instance = null;
  }

  isReady(): boolean {
    return this.instance !== null;
  }

  subscribeContentChange(listener: () => void): () => void {
    this.contentChangeSubscribers.add(listener);

    return () => {
      this.contentChangeSubscribers.delete(listener);
    };
  }

  private setupListeners(options?: CanvasEditorBridgeOptions): void {
    if (!this.instance) return;

    this.instance.listener.contentChange = () => {
      options?.onContentChange?.();

      for (const subscriber of this.contentChangeSubscribers) {
        subscriber();
      }
    };

    if (options?.onRangeStyleChange) {
      this.instance.listener.rangeStyleChange = options.onRangeStyleChange;
    }
    if (options?.onPageSizeChange) {
      this.instance.listener.pageSizeChange = options.onPageSizeChange;
    }
    if (options?.onPageScaleChange) {
      this.instance.listener.pageScaleChange = options.onPageScaleChange;
    }
  }

  getValue(): WordEditorResult | null {
    return this.instance?.command.getValue() ?? null;
  }

  setValue(data: WordEditorData): void {
    if (this._readonly) return;
    this.instance?.command.executeSetValue(data);
  }

  applyPaperSettings(settings: PaperSettings): void {
    const cmd = this.instance?.command;
    if (!cmd) return;
    cmd.executePaperSize(settings.width, settings.height);
    const direction =
      settings.direction === 'vertical' ? PaperDirection.VERTICAL : PaperDirection.HORIZONTAL;
    cmd.executePaperDirection(direction);
    cmd.executeSetPaperMargin(settings.margins);
  }

  getPaperSettings(): PaperSettings | null {
    if (!this.instance) return null;
    const options = this.instance.command.getOptions();
    const margins = this.instance.command.getPaperMargin();
    return {
      width: options.width,
      height: options.height,
      direction: options.paperDirection,
      margins: [margins[0], margins[1], margins[2], margins[3]],
    };
  }

  getWordCount(): Promise<number> {
    return this.instance?.command.getWordCount() ?? Promise.resolve(0);
  }

  insertTemplateExpression(expr: TemplateExpr): void {
    if (this._readonly) return;
    const url = exprToUrl(expr);
    const displayText =
      expr.kind === 'el'
        ? buildElExpression(expr.expr)
        : expr.kind === 'tag-open'
          ? `<${expr.tagName ?? ''}>`
          : expr.kind === 'tag-close'
            ? `</${expr.tagName ?? ''}>`
            : expr.kind === 'tag-selfclose'
              ? `<${expr.tagName ?? ''} />`
              : expr.expr;

    this.instance?.command.executeHyperlink({
      valueList: [{ value: displayText }],
      url,
    });
  }

  insertFieldExpression(datasetName: string, fieldName: string): void {
    const expr: TemplateExpr = {
      kind: 'el',
      expr: `${datasetName}.${fieldName}`,
    };
    this.insertTemplateExpression(expr);
  }

  insertChart(chart: DocChart): void {
    this.insertTemplateExpression({
      kind: 'tag-selfclose',
      expr: '',
      tagName: 'nop:chart',
      attrs: {
        id: chart.id,
        name: chart.chartName,
        type: chart.chartType,
        dataset: chart.datasetId,
        category: chart.categoryField,
        valueField: chart.valueField.join(','),
        seriesField: chart.seriesField?.join(',') ?? '',
        showTitle: chart.showChartName ? 'true' : 'false',
      },
    });
  }

  insertCode(code: DocCode): void {
    this.insertTemplateExpression({
      kind: 'tag-selfclose',
      expr: '',
      tagName: 'nop:code',
      attrs: {
        id: code.id,
        name: code.codeName,
        type: code.codeType,
        dataset: code.datasetId,
        valueField: code.valueField,
      },
    });
  }

  undo(): void {
    if (this._readonly) return;
    this.instance?.command.executeUndo();
  }

  redo(): void {
    if (this._readonly) return;
    this.instance?.command.executeRedo();
  }

  forceUpdate(): void {
    this.instance?.command.executeForceUpdate();
  }
}
