import { describe, it, expect } from 'vitest'
import {
  createDataSet,
  createDataColumn,
  validateDataSet,
  dataSetColumnToExpression
} from '../dataset-model.js'
import type { DataColumn, DataSetSourceType } from '../dataset-model.js'

describe('DataColumn', () => {
  it('createDataColumn returns defaults', () => {
    const col = createDataColumn()
    expect(col).toEqual({
      name: '',
      label: '',
      type: 'static'
    })
  })

  it('createDataColumn applies overrides', () => {
    const col = createDataColumn({
      name: 'user_id',
      label: 'User ID',
      description: 'Primary key',
      type: 'sql'
    })
    expect(col).toEqual({
      name: 'user_id',
      label: 'User ID',
      description: 'Primary key',
      type: 'sql'
    })
  })

  it('createDataColumn partial overrides', () => {
    const col = createDataColumn({ name: 'age' })
    expect(col.name).toBe('age')
    expect(col.label).toBe('')
    expect(col.type).toBe('static')
    expect(col.description).toBeUndefined()
  })
})

describe('DataSet', () => {
  it('createDataSet returns defaults with generated id', () => {
    const ds = createDataSet()
    expect(ds.id).toMatch(/^ds_\d+_\d+$/)
    expect(ds.name).toBe('')
    expect(ds.description).toBe('')
    expect(ds.type).toBe('static')
    expect(ds.columns).toEqual([])
  })

  it('createDataSet applies full overrides', () => {
    const columns: DataColumn[] = [
      createDataColumn({ name: 'id', label: 'ID', type: 'sql' }),
      createDataColumn({ name: 'name', label: 'Name', type: 'sql' })
    ]
    const ds = createDataSet({
      id: 'ds_custom_1',
      name: 'users',
      description: 'User table',
      type: 'sql',
      columns
    })
    expect(ds.id).toBe('ds_custom_1')
    expect(ds.name).toBe('users')
    expect(ds.description).toBe('User table')
    expect(ds.type).toBe('sql')
    expect(ds.columns).toHaveLength(2)
    expect(ds.columns[0].name).toBe('id')
    expect(ds.columns[1].name).toBe('name')
  })

  it('createDataSet generates unique ids', () => {
    const ds1 = createDataSet()
    const ds2 = createDataSet()
    expect(ds1.id).not.toBe(ds2.id)
  })

  it('createDataSet partial overrides keep defaults', () => {
    const ds = createDataSet({ name: 'orders', type: 'api' })
    expect(ds.name).toBe('orders')
    expect(ds.type).toBe('api')
    expect(ds.id).toMatch(/^ds_/)
    expect(ds.description).toBe('')
    expect(ds.columns).toEqual([])
  })
})

describe('validateDataSet', () => {
  it('validates a complete valid dataset', () => {
    const ds = createDataSet({
      name: 'users',
      type: 'sql',
      columns: [
        createDataColumn({ name: 'id', label: 'ID', type: 'sql' }),
        createDataColumn({ name: 'email', label: 'Email', type: 'sql' })
      ]
    })
    const result = validateDataSet(ds)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects empty name', () => {
    const result = validateDataSet({ type: 'sql', columns: [] })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('DataSet name is required')
  })

  it('rejects whitespace-only name', () => {
    const result = validateDataSet({ name: '   ', type: 'sql', columns: [] })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('DataSet name is required')
  })

  it('rejects missing type', () => {
    const result = validateDataSet({ name: 'test', columns: [] })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('type must be one of'))).toBe(true)
  })

  it('rejects invalid type', () => {
    const result = validateDataSet({ name: 'test', type: 'invalid' as any, columns: [] })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('type must be one of'))).toBe(true)
  })

  it('accepts all valid source types', () => {
    const types: DataSetSourceType[] = ['sql', 'api', 'mongo', 'static']
    for (const t of types) {
      const result = validateDataSet({ name: 'test', type: t, columns: [] })
      expect(result.valid).toBe(true)
    }
  })

  it('rejects columns that are not an array', () => {
    const result = validateDataSet({ name: 'test', type: 'sql', columns: 'bad' as any })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('DataSet columns must be an array')
  })

  it('rejects column with empty name', () => {
    const result = validateDataSet({
      name: 'test',
      type: 'sql',
      columns: [{ label: 'L', type: 'sql' }]
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('name is required'))).toBe(true)
  })

  it('rejects column with empty label', () => {
    const result = validateDataSet({
      name: 'test',
      type: 'sql',
      columns: [{ name: 'col', type: 'sql' }]
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('label is required'))).toBe(true)
  })

  it('rejects column with invalid type', () => {
    const result = validateDataSet({
      name: 'test',
      type: 'sql',
      columns: [{ name: 'col', label: 'Col', type: 'invalid' }]
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('type must be one of'))).toBe(true)
  })

  it('rejects duplicate column names', () => {
    const result = validateDataSet({
      name: 'test',
      type: 'sql',
      columns: [
        { name: 'col', label: 'Col 1', type: 'sql' },
        { name: 'col', label: 'Col 2', type: 'sql' }
      ]
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('duplicate column name'))).toBe(true)
  })

  it('collects multiple errors at once', () => {
    const result = validateDataSet({
      type: 'bad',
      columns: [
        { label: 'L', type: 'sql' },
        { name: 'c', type: 'bad' }
      ]
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
    expect(result.errors.some(e => e.includes('name is required'))).toBe(true)
    expect(result.errors.some(e => e.includes('DataSet name is required'))).toBe(true)
    expect(result.errors.some(e => e.includes('DataSet type must be one of'))).toBe(true)
  })

  it('accepts valid columns with description', () => {
    const result = validateDataSet({
      name: 'test',
      type: 'api',
      columns: [
        { name: 'id', label: 'ID', type: 'api', description: 'Unique identifier' }
      ]
    })
    expect(result.valid).toBe(true)
  })
})

describe('dataSetColumnToExpression', () => {
  it('formats expression with dataset name and column name', () => {
    const col = createDataColumn({ name: 'price', label: 'Price', type: 'sql' })
    expect(dataSetColumnToExpression('products', col)).toBe('${products.price}')
  })

  it('handles column with different names', () => {
    const col = createDataColumn({ name: 'user_email', label: 'Email' })
    expect(dataSetColumnToExpression('users', col)).toBe('${users.user_email}')
  })
})

describe('type narrowing', () => {
  it('DataSetSourceType covers all expected values', () => {
    const types: DataSetSourceType[] = ['sql', 'api', 'mongo', 'static']
    expect(types).toHaveLength(4)
  })
})
