export type TitleLevel = 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'sixth'
export type RowFlexValue = 'left' | 'center' | 'right' | 'justify'
export type ListTypeValue = 'ul' | 'ol'
export type ListStyleValue = string
export type PageModeValue = 'paging' | 'continuity'
export type PaperDirectionValue = 'vertical' | 'horizontal'

export declare const RowFlex: {
  readonly LEFT: RowFlexValue
  readonly CENTER: RowFlexValue
  readonly RIGHT: RowFlexValue
  readonly JUSTIFY: RowFlexValue
}

export declare const TitleLevel: {
  readonly FIRST: TitleLevel
  readonly SECOND: TitleLevel
  readonly THIRD: TitleLevel
  readonly FOURTH: TitleLevel
  readonly FIFTH: TitleLevel
  readonly SIXTH: TitleLevel
}

export declare const ListType: {
  readonly UL: ListTypeValue
  readonly OL: ListTypeValue
}

export declare const ListStyle: Record<string, ListStyleValue>

export declare const PageMode: {
  readonly PAGING: PageModeValue
  readonly CONTINUITY: PageModeValue
}

export declare const PaperDirection: {
  readonly VERTICAL: PaperDirectionValue
  readonly HORIZONTAL: PaperDirectionValue
}

export interface IElement {
  id?: string
  titleId?: string
  value?: string
  level?: TitleLevel
  [key: string]: unknown
}

export interface IEditorData {
  header?: IElement[]
  main: IElement[]
  footer?: IElement[]
  [key: string]: unknown
}

export interface IEditorResult {
  data: IEditorData
  [key: string]: unknown
}

export interface IRangeStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikeout?: boolean
  superscript?: boolean
  subscript?: boolean
  font?: string
  size?: number
  color?: string
  highlight?: string
  rowFlex?: RowFlexValue | null
  level?: TitleLevel | null
  listType?: ListTypeValue | null
  listStyle?: ListStyleValue | null
  rowMargin?: number
  undo?: boolean
  redo?: boolean
  [key: string]: unknown
}

export interface IWatermark {
  data?: string
  [key: string]: unknown
}

export interface ICatalogItem {
  id?: string
  name?: string
  pageNo?: number
  subCatalog?: ICatalogItem[]
  [key: string]: unknown
}

export interface ICatalog {
  list?: ICatalogItem[]
  [key: string]: unknown
}

export interface EditorCommand {
  getValue(): IEditorResult
  executeSetValue(data: IEditorData): void
  executePaperSize(width: number, height: number): void
  executePaperDirection(direction: PaperDirectionValue): void
  executeSetPaperMargin(margins: [number, number, number, number]): void
  getOptions(): { width: number; height: number; paperDirection: PaperDirectionValue; [key: string]: unknown }
  getPaperMargin(): [number, number, number, number]
  getWordCount(): Promise<number>
  executeHyperlink(payload: { valueList: Array<{ value: string }>; url: string }): void
  executeForceUpdate(): void
  executeLocationCatalog(id: string): void
  [key: string]: any
}

export interface EditorListener {
  contentChange?: () => void
  rangeStyleChange?: (payload: IRangeStyle) => void
  pageSizeChange?: (payload: number) => void
  pageScaleChange?: (payload: number) => void
  [key: string]: any
}

export default class Editor {
  constructor(container: HTMLDivElement, data: IEditorData)

  command: EditorCommand
  listener: EditorListener
  register: Record<string, unknown>

  destroy(): void
}