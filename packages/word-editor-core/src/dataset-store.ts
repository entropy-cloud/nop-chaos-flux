import { createStore } from 'zustand/vanilla'
import type { DataSet, DataColumn, DataSetValidationResult } from './dataset-model.js'
import { validateDataSet, createDataSet, createDataColumn } from './dataset-model.js'

export interface DatasetStoreState {
  datasets: DataSet[]
  selectedDatasetId: string | null
}

const initialState: DatasetStoreState = {
  datasets: [],
  selectedDatasetId: null
}

export function createDatasetStore() {
  const store = createStore<DatasetStoreState>(() => ({ ...initialState }))

  return {
    getState: store.getState,
    subscribe: store.subscribe,

    getAll(): DataSet[] {
      return store.getState().datasets
    },

    getById(id: string): DataSet | undefined {
      return store.getState().datasets.find(ds => ds.id === id)
    },

    getSelected(): DataSet | undefined {
      const { selectedDatasetId, datasets } = store.getState()
      if (!selectedDatasetId) return undefined
      return datasets.find(ds => ds.id === selectedDatasetId)
    },

    add(dataset: Omit<DataSet, 'id'>): DataSet {
      const newDataset = createDataSet(dataset)
      store.setState(state => ({
        datasets: [...state.datasets, newDataset]
      }))
      return newDataset
    },

    update(id: string, updates: Partial<DataSet>): DataSet | null {
      const current = store.getState().datasets.find(ds => ds.id === id)
      if (!current) return null

      const updated = { ...current, ...updates }
      store.setState(state => ({
        datasets: state.datasets.map(ds => ds.id === id ? updated : ds)
      }))
      return updated
    },

    remove(id: string): boolean {
      const exists = store.getState().datasets.some(ds => ds.id === id)
      if (!exists) return false

      store.setState(state => ({
        datasets: state.datasets.filter(ds => ds.id !== id),
        selectedDatasetId: state.selectedDatasetId === id ? null : state.selectedDatasetId
      }))
      return true
    },

    addColumn(datasetId: string, column: Omit<DataColumn, 'name'>): DataColumn | null {
      const current = store.getState().datasets.find(ds => ds.id === datasetId)
      if (!current) return null

      const newColumn = createDataColumn({ ...column, name: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` })
      const updated = {
        ...current,
        columns: [...current.columns, newColumn]
      }

      store.setState(state => ({
        datasets: state.datasets.map(ds => ds.id === datasetId ? updated : ds)
      }))

      return newColumn
    },

    updateColumn(datasetId: string, columnName: string, updates: Partial<DataColumn>): DataColumn | null {
      const current = store.getState().datasets.find(ds => ds.id === datasetId)
      if (!current) return null

      const columnExists = current.columns.some(col => col.name === columnName)
      if (!columnExists) return null

      const updatedColumns = current.columns.map(col =>
        col.name === columnName ? { ...col, ...updates } : col
      )

      const updated = {
        ...current,
        columns: updatedColumns
      }

      store.setState(state => ({
        datasets: state.datasets.map(ds => ds.id === datasetId ? updated : ds)
      }))

      return updatedColumns.find(col => col.name === columnName) ?? null
    },

    removeColumn(datasetId: string, columnName: string): boolean {
      const current = store.getState().datasets.find(ds => ds.id === datasetId)
      if (!current) return false

      const columnExists = current.columns.some(col => col.name === columnName)
      if (!columnExists) return false

      const updated = {
        ...current,
        columns: current.columns.filter(col => col.name !== columnName)
      }

      store.setState(state => ({
        datasets: state.datasets.map(ds => ds.id === datasetId ? updated : ds)
      }))

      return true
    },

    validate(datasetId?: string): DataSetValidationResult {
      if (datasetId) {
        const dataset = this.getById(datasetId)
        if (!dataset) {
          return { valid: false, errors: ['Dataset not found'] }
        }
        return validateDataSet(dataset)
      }
      return { valid: true, errors: [] }
    },

    select(datasetId: string | null): void {
      store.setState({ selectedDatasetId: datasetId })
    },

    reset(): void {
      store.setState({ ...initialState })
    },

    load(datasets: DataSet[]): void {
      store.setState({ datasets })
    }
  }
}

export type DatasetStoreApi = ReturnType<typeof createDatasetStore>
