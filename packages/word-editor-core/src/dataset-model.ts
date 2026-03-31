export type DataSetSourceType = 'sql' | 'api' | 'mongo' | 'static'

export interface DataColumn {
  name: string
  label: string
  description?: string
  type: DataSetSourceType
}

export interface DataSet {
  id: string
  name: string
  description: string
  type: DataSetSourceType
  columns: DataColumn[]
}

let _idCounter = 0

function generateDataSetId(): string {
  return `ds_${Date.now()}_${++_idCounter}`
}

export interface DataSetValidationResult {
  valid: boolean
  errors: string[]
}

export interface DataColumnInput {
  name?: string
  label?: string
  description?: string
  type?: string
}

export interface DataSetValidationInput {
  name?: string
  description?: string
  type?: string
  columns?: DataColumnInput[]
}

export function validateDataSet(dataSet: DataSetValidationInput): DataSetValidationResult {
  const errors: string[] = []

  if (!dataSet.name || dataSet.name.trim() === '') {
    errors.push('DataSet name is required')
  }

  if (!dataSet.type || !['sql', 'api', 'mongo', 'static'].includes(dataSet.type)) {
    errors.push('DataSet type must be one of: sql, api, mongo, static')
  }

  if (dataSet.columns !== undefined) {
    if (!Array.isArray(dataSet.columns)) {
      errors.push('DataSet columns must be an array')
    } else {
      const seenNames = new Set<string>()
      for (let i = 0; i < dataSet.columns.length; i++) {
        const col = dataSet.columns[i] ?? {}
        if (!col.name || col.name.trim() === '') {
          errors.push(`Column at index ${i}: name is required`)
        }
        if (!col.label || col.label.trim() === '') {
          errors.push(`Column at index ${i}: label is required`)
        }
        if (!col.type || !['sql', 'api', 'mongo', 'static'].includes(col.type)) {
          errors.push(`Column at index ${i}: type must be one of: sql, api, mongo, static`)
        }
        if (col.name && seenNames.has(col.name)) {
          errors.push(`Column at index ${i}: duplicate column name "${col.name}"`)
        }
        if (col.name) {
          seenNames.add(col.name)
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

export function createDataSet(overrides: Partial<DataSet> = {}): DataSet {
  const dataSet: DataSet = {
    id: overrides.id ?? generateDataSetId(),
    name: overrides.name ?? '',
    description: overrides.description ?? '',
    type: overrides.type ?? 'static',
    columns: overrides.columns ?? []
  }

  return dataSet
}

export function createDataColumn(overrides: Partial<DataColumn> = {}): DataColumn {
  return {
    name: overrides.name ?? '',
    label: overrides.label ?? '',
    description: overrides.description,
    type: overrides.type ?? 'static'
  }
}

export function dataSetColumnToExpression(dataSetName: string, column: DataColumn): string {
  return `\${${dataSetName}.${column.name}}`
}
