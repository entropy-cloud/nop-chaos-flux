import Editor from '@hufe921/canvas-editor'
import { PaperDirection } from '@hufe921/canvas-editor'
import type { IEditorData, IEditorResult, IRangeStyle } from '@hufe921/canvas-editor'
import type { PaperSettings } from './paper-settings.js'
import type { TemplateExpr } from './template-expr.js'
import { exprToUrl, buildElExpression } from './template-expr.js'

export interface CanvasEditorBridgeOptions {
  onContentChange?: () => void
  onRangeStyleChange?: (payload: IRangeStyle) => void
  onPageSizeChange?: (payload: number) => void
  onPageScaleChange?: (payload: number) => void
}

export type { IRangeStyle }

export class CanvasEditorBridge {
  private instance: Editor | null = null
  private contentChangeSubscribers = new Set<() => void>()

  get command() {
    return this.instance?.command
  }

  get listener() {
    return this.instance?.listener
  }

  get register() {
    return this.instance?.register
  }

  mount(
    container: HTMLDivElement,
    data: IEditorData,
    options?: CanvasEditorBridgeOptions
  ): void {
    if (this.instance) {
      this.unmount()
    }

    this.instance = new Editor(container, data)
    this.setupListeners(options)
  }

  unmount(): void {
    this.instance?.destroy()
    this.instance = null
  }

  isReady(): boolean {
    return this.instance !== null
  }

  subscribeContentChange(listener: () => void): () => void {
    this.contentChangeSubscribers.add(listener)

    return () => {
      this.contentChangeSubscribers.delete(listener)
    }
  }

  private setupListeners(options?: CanvasEditorBridgeOptions): void {
    if (!this.instance) return

    this.instance.listener.contentChange = () => {
      options?.onContentChange?.()

      for (const subscriber of this.contentChangeSubscribers) {
        subscriber()
      }
    }

    if (options?.onRangeStyleChange) {
      this.instance.listener.rangeStyleChange = options.onRangeStyleChange
    }
    if (options?.onPageSizeChange) {
      this.instance.listener.pageSizeChange = options.onPageSizeChange
    }
    if (options?.onPageScaleChange) {
      this.instance.listener.pageScaleChange = options.onPageScaleChange
    }
  }

  getValue(): IEditorResult | null {
    return this.instance?.command.getValue() ?? null
  }

  setValue(data: IEditorData): void {
    this.instance?.command.executeSetValue(data)
  }

  applyPaperSettings(settings: PaperSettings): void {
    const cmd = this.instance?.command
    if (!cmd) return
    cmd.executePaperSize(settings.width, settings.height)
    const direction = settings.direction === 'vertical'
      ? PaperDirection.VERTICAL
      : PaperDirection.HORIZONTAL
    cmd.executePaperDirection(direction)
    cmd.executeSetPaperMargin(settings.margins)
  }

  getPaperSettings(): PaperSettings | null {
    if (!this.instance) return null
    const options = this.instance.command.getOptions()
    const margins = this.instance.command.getPaperMargin()
    return {
      width: options.width,
      height: options.height,
      direction: options.paperDirection,
      margins: [margins[0], margins[1], margins[2], margins[3]]
    }
  }

  getWordCount(): Promise<number> {
    return this.instance?.command.getWordCount() ?? Promise.resolve(0)
  }

  insertTemplateExpression(expr: TemplateExpr): void {
    const url = exprToUrl(expr)
    const displayText = expr.kind === 'el'
      ? buildElExpression(expr.expr)
      : expr.kind === 'tag-open'
        ? `<${expr.tagName ?? ''}>`
        : expr.kind === 'tag-close'
          ? `</${expr.tagName ?? ''}>`
          : expr.kind === 'tag-selfclose'
            ? `<${expr.tagName ?? ''} />`
            : expr.expr

    this.instance?.command.executeHyperlink({
      valueList: [{ value: displayText }],
      url
    })
  }

  insertFieldExpression(datasetName: string, fieldName: string): void {
    const expr: TemplateExpr = {
      kind: 'el',
      expr: `${datasetName}.${fieldName}`
    }
    this.insertTemplateExpression(expr)
  }

  forceUpdate(): void {
    this.instance?.command.executeForceUpdate()
  }
}
