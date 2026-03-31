import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveDocument, loadDocument, clearDocument, saveDatasets, loadDatasets } from '../document-io.js'
import type { DataSet } from '../dataset-model.js'

const STORAGE_KEY = 'nop-word-editor-document'
const DATASET_STORAGE_KEY = 'nop-word-editor-datasets'

function createLocalStorageMock() {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn(() => null),
    _store: store
  }
}

let localStorageMock: ReturnType<typeof createLocalStorageMock>

beforeEach(() => {
  localStorageMock = createLocalStorageMock()
  vi.stubGlobal('localStorage', localStorageMock)
})

describe('saveDocument', () => {
  it('returns true and stores data when bridge has value', () => {
    const mockData = {
      data: {
        header: [{ value: 'header' }],
        main: [{ value: 'main' }],
        footer: [{ value: 'footer' }]
      }
    }
    const mockBridge = {
      getValue: vi.fn(() => mockData),
      getPaperSettings: vi.fn(() => ({ width: 595, height: 842, direction: 'vertical', margins: [100, 120, 100, 120] }))
    } as any

    const result = saveDocument(mockBridge)

    expect(result).toBe(true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String))
    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]) as any
    expect(saved.data.main).toEqual([{ value: 'main' }])
    expect(saved.data.header).toEqual([{ value: 'header' }])
    expect(saved.data.footer).toEqual([{ value: 'footer' }])
    expect(saved.paperSettings.width).toBe(595)
    expect(saved.savedAt).toBeDefined()
  })

  it('returns false when bridge.getValue() returns null', () => {
    const mockBridge = {
      getValue: vi.fn(() => null),
      getPaperSettings: vi.fn()
    } as any

    expect(saveDocument(mockBridge)).toBe(false)
    expect(localStorageMock.setItem).not.toHaveBeenCalled()
  })

  it('handles missing header/footer with defaults', () => {
    const mockData = { data: { main: [{ value: 'content' }] } }
    const mockBridge = {
      getValue: vi.fn(() => mockData),
      getPaperSettings: vi.fn(() => null)
    } as any

    const result = saveDocument(mockBridge)
    expect(result).toBe(true)
    const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]) as any
    expect(saved.data.header).toEqual([])
    expect(saved.data.footer).toEqual([])
    expect(saved.paperSettings).toEqual({ width: 595, height: 842, direction: 'vertical', margins: [100, 120, 100, 120] })
  })
})

describe('loadDocument', () => {
  it('returns null when no data saved', () => {
    expect(loadDocument()).toBeNull()
  })

  it('returns saved data correctly', () => {
    const saved = {
      data: { header: [], main: [{ value: 'hello' }], footer: [] },
      paperSettings: { width: 595, height: 842, direction: 'vertical', margins: [100, 120, 100, 120] },
      savedAt: '2025-01-01T00:00:00.000Z'
    }
    localStorageMock._store[STORAGE_KEY] = JSON.stringify(saved)

    const result = loadDocument()
    expect(result).toEqual(saved)
  })
})

describe('clearDocument', () => {
  it('removes stored data', () => {
    localStorageMock._store[STORAGE_KEY] = '{"data":{}}'
    clearDocument()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
  })
})

describe('saveDatasets', () => {
  it('saves and loads datasets round-trip', () => {
    const datasets: DataSet[] = [
      { id: 'ds_1', name: 'Users', description: 'User data', type: 'sql', columns: [{ name: 'email', label: 'Email', type: 'sql' }] },
      { id: 'ds_2', name: 'Orders', description: 'Order data', type: 'api', columns: [] }
    ]

    saveDatasets(datasets)
    const loaded = loadDatasets()

    expect(loaded).toEqual(datasets)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(DATASET_STORAGE_KEY, expect.any(String))
  })

  it('handles empty array', () => {
    saveDatasets([])
    const loaded = loadDatasets()

    expect(loaded).toEqual([])
  })
})

describe('loadDatasets', () => {
  it('returns empty array when nothing saved', () => {
    expect(loadDatasets()).toEqual([])
  })
})
