import type { CanvasEditorBridge } from './canvas-editor-bridge.js'
import type { PaperSettings, } from './paper-settings.js'
import type { DocumentData } from './template-model.js'
import type { DataSet } from './dataset-model.js'

const STORAGE_KEY = 'nop-word-editor-document'
const DATASET_STORAGE_KEY = 'nop-word-editor-datasets'

export interface SavedDocumentData {
  data: DocumentData
  paperSettings: PaperSettings
  savedAt: string
}

export function saveDocument(bridge: CanvasEditorBridge): boolean {
  try {
    const value = bridge.getValue()
    if (!value) return false

    const paperSettings = bridge.getPaperSettings()

    const saved: SavedDocumentData = {
      data: {
        header: value.data.header ?? [],
        main: value.data.main,
        footer: value.data.footer ?? []
      },
      paperSettings: paperSettings ?? {
        width: 595,
        height: 842,
        direction: 'vertical',
        margins: [100, 120, 100, 120]
      },
      savedAt: new Date().toISOString()
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    return true
  } catch {
    return false
  }
}

export function loadDocument(): SavedDocumentData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedDocumentData
  } catch {
    return null
  }
}

export function clearDocument(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function saveDatasets(datasets: DataSet[]): void {
  localStorage.setItem(DATASET_STORAGE_KEY, JSON.stringify(datasets))
}

export function loadDatasets(): DataSet[] {
  try {
    const raw = localStorage.getItem(DATASET_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as DataSet[]
  } catch {
    return []
  }
}
