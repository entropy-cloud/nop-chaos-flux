import { describe, it, expect, beforeEach } from 'vitest'
import { createDatasetStore } from '../dataset-store.js'

describe('DatasetStore', () => {
  let store: ReturnType<typeof createDatasetStore>

  beforeEach(() => {
    store = createDatasetStore()
  })

  describe('Initial State', () => {
    it('should start with empty datasets array', () => {
      const state = store.getState()
      expect(state.datasets).toEqual([])
    })

    it('should start with no selected dataset', () => {
      const state = store.getState()
      expect(state.selectedDatasetId).toBeNull()
    })
  })

  describe('getAll', () => {
    it('should return empty array initially', () => {
      const datasets = store.getAll()
      expect(datasets).toEqual([])
    })

    it('should return all datasets after adding', () => {
      const ds1 = store.add({
        name: 'Dataset 1',
        description: 'Description 1',
        type: 'static',
        columns: []
      })

      const ds2 = store.add({
        name: 'Dataset 2',
        description: 'Description 2',
        type: 'api',
        columns: []
      })

      const datasets = store.getAll()
      expect(datasets).toHaveLength(2)
      expect(datasets[0]).toEqual(ds1)
      expect(datasets[1]).toEqual(ds2)
    })
  })

  describe('getById', () => {
    it('should return undefined for non-existent id', () => {
      const dataset = store.getById('non-existent')
      expect(dataset).toBeUndefined()
    })

    it('should return dataset when id exists', () => {
      const ds1 = store.add({
        name: 'Test Dataset',
        description: 'Test Description',
        type: 'static',
        columns: []
      })

      const found = store.getById(ds1.id)
      expect(found).toEqual(ds1)
    })
  })

  describe('getSelected', () => {
    it('should return undefined when no dataset is selected', () => {
      const selected = store.getSelected()
      expect(selected).toBeUndefined()
    })

    it('should return selected dataset', () => {
      const ds1 = store.add({
        name: 'Test Dataset',
        description: 'Test Description',
        type: 'static',
        columns: []
      })

      store.select(ds1.id)
      const selected = store.getSelected()
      expect(selected).toEqual(ds1)
    })
  })

  describe('add', () => {
    it('should add a new dataset', () => {
      const dataset = store.add({
        name: 'New Dataset',
        description: 'New Description',
        type: 'sql',
        columns: []
      })

      expect(dataset).toHaveProperty('id')
      expect(dataset.name).toBe('New Dataset')
      expect(dataset.description).toBe('New Description')
      expect(dataset.type).toBe('sql')
      expect(dataset.columns).toEqual([])
    })

    it('should generate unique ids for each dataset', () => {
      const ds1 = store.add({
        name: 'Dataset 1',
        description: 'Description 1',
        type: 'static',
        columns: []
      })

      const ds2 = store.add({
        name: 'Dataset 2',
        description: 'Description 2',
        type: 'api',
        columns: []
      })

      expect(ds1.id).not.toBe(ds2.id)
    })

    it('should add dataset to the list', () => {
      const dataset = store.add({
        name: 'New Dataset',
        description: 'New Description',
        type: 'static',
        columns: []
      })

      const all = store.getAll()
      expect(all).toHaveLength(1)
      expect(all[0]).toEqual(dataset)
    })
  })

  describe('update', () => {
    it('should return null for non-existent dataset', () => {
      const updated = store.update('non-existent', { name: 'Updated' })
      expect(updated).toBeNull()
    })

    it('should update existing dataset', () => {
      const ds1 = store.add({
        name: 'Original Name',
        description: 'Original Description',
        type: 'static',
        columns: []
      })

      const updated = store.update(ds1.id, {
        name: 'Updated Name',
        description: 'Updated Description'
      })

      expect(updated).not.toBeNull()
      expect(updated?.name).toBe('Updated Name')
      expect(updated?.description).toBe('Updated Description')
      expect(updated?.type).toBe('static')
    })

    it('should update dataset in the list', () => {
      const ds1 = store.add({
        name: 'Original Name',
        description: 'Original Description',
        type: 'static',
        columns: []
      })

      store.update(ds1.id, { name: 'Updated Name' })

      const all = store.getAll()
      expect(all[0].name).toBe('Updated Name')
    })
  })

  describe('remove', () => {
    it('should return false for non-existent dataset', () => {
      const removed = store.remove('non-existent')
      expect(removed).toBe(false)
    })

    it('should remove existing dataset', () => {
      const ds1 = store.add({
        name: 'Test Dataset',
        description: 'Test Description',
        type: 'static',
        columns: []
      })

      const removed = store.remove(ds1.id)
      expect(removed).toBe(true)
      expect(store.getAll()).toHaveLength(0)
    })

    it('should clear selection when removing selected dataset', () => {
      const ds1 = store.add({
        name: 'Test Dataset',
        description: 'Test Description',
        type: 'static',
        columns: []
      })

      store.select(ds1.id)
      store.remove(ds1.id)

      const state = store.getState()
      expect(state.selectedDatasetId).toBeNull()
    })

    it('should not clear selection when removing non-selected dataset', () => {
      const ds1 = store.add({
        name: 'Dataset 1',
        description: 'Description 1',
        type: 'static',
        columns: []
      })

      const ds2 = store.add({
        name: 'Dataset 2',
        description: 'Description 2',
        type: 'static',
        columns: []
      })

      store.select(ds1.id)
      store.remove(ds2.id)

      const state = store.getState()
      expect(state.selectedDatasetId).toBe(ds1.id)
    })
  })
})
