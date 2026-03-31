import type { IElement } from '@hufe921/canvas-editor'

export interface DocumentData {
  header: IElement[]
  main: IElement[]
  footer: IElement[]
}

export interface SavedDocument {
  version: string
  data: DocumentData
  paperSettings: import('./paper-settings.js').PaperSettings
  savedAt: string
}
