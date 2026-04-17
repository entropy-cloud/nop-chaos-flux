import type { IElement } from '@hufe921/canvas-editor'
import type { DocChart } from './chart-model.js'
import type { DocCode } from './code-model.js'

export interface DocumentData {
  header: IElement[]
  main: IElement[]
  footer: IElement[]
}

export interface WordDocument extends DocumentData {
  charts?: DocChart[]
  codes?: DocCode[]
}

export interface SavedDocument {
  version: string
  data: WordDocument
  paperSettings: import('./paper-settings.js').PaperSettings
  savedAt: string
}
