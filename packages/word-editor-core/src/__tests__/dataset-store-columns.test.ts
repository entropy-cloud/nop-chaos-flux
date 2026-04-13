import { describe, it, expect, beforeEach } from 'vitest'
import { createDatasetStore } from '../dataset-store.js'

describe('DatasetStore', () => {
  let store: ReturnType<typeof createDatasetStore>

  beforeEach(() => {
    store = createDatasetStore()
  })

  describe('addColumn', () => {
    it('should return null for non-existent dataset', () => {
      const column = store.addColumn('non-existent', {
        label: 'Test Column',
        type: 'static'
      })
      expect(column).toBeNull()
    })

    it('should add column to dataset', () => {
      const ds1 = store.add({
        name: 'Test Dataset',
        description: 'Test Description',
        type: 'static',
        columns: []
      })

      const column = store.addColumn(ds1.id, {
        label: 'Test Column',
        type: 'static'
      })

      expect(column).not.toBeNull()
      expect(column?.label).toBe('Test Column')
      expect(column?.type).toBe('static')
    })

    it('should add column to dataset columns list', () => {
      const ds1 = store.add({
        name: 'Test Dataset',
        description: 'Test Description',
        type: 'static',
        columns: []
      })

      store.addColumn(ds1.id, {
        label: 'Column 1',
        type: 'static'
      })

      const dataset = store.getById(ds1.id)
      expect(dataset?.columns).toHaveLength(1)
    })

    it('should generate unique column names', () => {
      const ds1 = store.add({
        name: 'Test Dataset',
        description: 'Test Description',
        type: 'static',
        columns: []
      })

      const col1 = store.addColumn(ds1.id, { label: 'Column 1', type: 'static' })
      const col2 = store.addColumn(ds1.id, { label: 'Column 2', type: 'api' })

      expect(col1?.name).not.toBe(col2?.name)
    })
  })

  describe('updateColumn', () => {
    beforeEach(() => {
      const ds1 = store.add({
        name: 'Test Dataset',
        description: 'Test Description',
        type: 'static',
        columns: []
      })

      store.addColumn(ds1.id, { label: 'Original Label', type: 'static' })
    })

    it('should return null for non-existent dataset', () => {
      const updated = store.updateColumn('non-existent', 'any-name', { label: 'Updated' })
      expect(updated).toBeNull()
    })

    it('should return null for non-existent column', () => {
      const ds1 = store.getAll()[0]
      const updated = store.updateColumn(ds1.id, 'non-existent', { label: 'Updated' })
      expect(updated).toBeNull()
    })

    it('should update existing column', () => {
      const ds1 = store.getAll()[0]
      const colName = ds1.columns[0].name

      const updated = store.updateColumn(ds1.id, colName, {
        label: 'Updated Label'
      })

      expect(updated).not.toBeNull()
      expect(updated?.label).toBe('Updated Label')
    })

    it('should update column in dataset', () => {
      const ds1 = store.getAll()[0]
      const colName = ds1.columns[0].name

      store.updateColumn(ds1.id, colName, { label: 'Updated Label' })

      const dataset = store.getById(ds1.id)
      expect(dataset?.columns[0].label).toBe('Updated Label')
    })
  })

  describe('removeColumn', () => {
    beforeEach(() => {
      const ds1 = store.add({
        name: 'Test Dataset',
        description: 'Test Description',
        type: 'static',
        columns: []
      })

      store.addColumn(ds1.id, { label: 'Column 1', type: 'static' })
      store.addColumn(ds1.id, { label: 'Column 2', type: 'api' })
    })

    it('should return false for non-existent dataset', () => {
      const removed = store.removeColumn('non-existent', 'any-name')
      expect(removed).toBe(false)
    })

    it('should return false for non-existent column', () => {
      const ds1 = store.getAll()[0]
      const removed = store.removeColumn(ds1.id, 'non-existent')
      expect(removed).toBe(false)
    })

    it('should remove column from dataset', () => {
      const ds1 = store.getAll()[0]
      const colName = ds1.columns[0].name

      const removed = store.removeColumn(ds1.id, colName)
      expect(removed).toBe(true)

      const dataset = store.getById(ds1.id)
      expect(dataset?.columns).toHaveLength(1)
    })
  })

  describe('validate', () => {
    it('should return valid for empty validation', () => {
      const result = store.validate()
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should return invalid for non-existent dataset', () => {
      const result = store.validate('non-existent')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Dataset not found')
    })

    it('should validate specific dataset', () => {
      const ds1 = store.add({
        name: 'Valid Dataset',
        description: 'Valid Description',
        type: 'static',
        columns: []
      })

      const result = store.validate(ds1.id)
      expect(result.valid).toBe(true)
    })
  })

  describe('select', () => {
    it('should set selected dataset id', () => {
      const ds1 = store.add({
        name: 'Test Dataset',
        description: 'Test Description',
        type: 'static',
        columns: []
      })

      store.select(ds1.id)

      const state = store.getState()
      expect(state.selectedDatasetId).toBe(ds1.id)
    })

    it('should clear selection when passing null', () => {
      const ds1 = store.add({
        name: 'Test Dataset',
        description: 'Test Description',
        type: 'static',
        columns: []
      })

      store.select(ds1.id)
      store.select(null)

      const state = store.getState()
      expect(state.selectedDatasetId).toBeNull()
    })
  })

  describe('reset', () => {
    it('should clear all datasets', () => {
      store.add({
        name: 'Dataset 1',
        description: 'Description 1',
        type: 'static',
        columns: []
      })

      store.add({
        name: 'Dataset 2',
        description: 'Description 2',
        type: 'api',
        columns: []
      })

      store.reset()

      const state = store.getState()
      expect(state.datasets).toEqual([])
    })

    it('should clear selection', () => {
      const ds1 = store.add({
        name: 'Test Dataset',
        description: 'Test Description',
        type: 'static',
        columns: []
      })

      store.select(ds1.id)
      store.reset()

      const state = store.getState()
      expect(state.selectedDatasetId).toBeNull()
    })
  })

  describe('load', () => {
    it('should load datasets from array', () => {
      const datasets = [
        {
          id: 'ds_1',
          name: 'Dataset 1',
          description: 'Description 1',
          type: 'static' as const,
          columns: []
        },
        {
          id: 'ds_2',
          name: 'Dataset 2',
          description: 'Description 2',
          type: 'api' as const,
          columns: []
        }
      ]

      store.load(datasets)

      const state = store.getState()
      expect(state.datasets).toEqual(datasets)
      expect(state.datasets).toHaveLength(2)
    })

    it('should replace existing datasets', () => {
      store.add({
        name: 'Original Dataset',
        description: 'Original Description',
        type: 'static',
        columns: []
      })

      const datasets = [
        {
          id: 'ds_new',
          name: 'New Dataset',
          description: 'New Description',
          type: 'api' as const,
          columns: []
        }
      ]

      store.load(datasets)

      const state = store.getState()
      expect(state.datasets).toHaveLength(1)
      expect(state.datasets[0].name).toBe('New Dataset')
    })
  })

  describe('subscribe', () => {
    it('should notify subscribers on state change', () => {
      let callCount = 0
      let lastState = store.getState()

      const unsubscribe = store.subscribe((state) => {
        callCount++
        lastState = state
      })

      store.add({
        name: 'Test Dataset',
        description: 'Test Description',
        type: 'static',
        columns: []
      })

      expect(callCount).toBe(1)
      expect(lastState.datasets).toHaveLength(1)

      unsubscribe()
    })
  })
})
