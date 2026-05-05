export type DatasetSourceType = 'sql' | 'api' | 'mongo' | 'static';

export interface DataColumn {
  name: string;
  label: string;
  description?: string;
  type: DatasetSourceType;
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  type: DatasetSourceType;
  columns: DataColumn[];
}

let _idCounter = 0;

function generateDatasetId(): string {
  return `ds_${Date.now()}_${++_idCounter}`;
}

export interface DatasetValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DataColumnInput {
  name?: string;
  label?: string;
  description?: string;
  type?: string;
}

export interface DatasetValidationInput {
  name?: string;
  description?: string;
  type?: string;
  columns?: DataColumnInput[];
}

export function validateDataset(dataset: DatasetValidationInput): DatasetValidationResult {
  const errors: string[] = [];

  if (!dataset.name || dataset.name.trim() === '') {
    errors.push('Dataset name is required');
  }

  if (!dataset.type || !['sql', 'api', 'mongo', 'static'].includes(dataset.type)) {
    errors.push('Dataset type must be one of: sql, api, mongo, static');
  }

  if (dataset.columns !== undefined) {
    if (!Array.isArray(dataset.columns)) {
      errors.push('Dataset columns must be an array');
    } else {
      const seenNames = new Set<string>();
      for (let i = 0; i < dataset.columns.length; i++) {
        const col = dataset.columns[i] ?? {};
        if (!col.name || col.name.trim() === '') {
          errors.push(`Column at index ${i}: name is required`);
        }
        if (!col.label || col.label.trim() === '') {
          errors.push(`Column at index ${i}: label is required`);
        }
        if (!col.type || !['sql', 'api', 'mongo', 'static'].includes(col.type)) {
          errors.push(`Column at index ${i}: type must be one of: sql, api, mongo, static`);
        }
        if (col.name && seenNames.has(col.name)) {
          errors.push(`Column at index ${i}: duplicate column name "${col.name}"`);
        }
        if (col.name) {
          seenNames.add(col.name);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function createDataset(overrides: Partial<Dataset> = {}): Dataset {
  const dataset: Dataset = {
    id: overrides.id ?? generateDatasetId(),
    name: overrides.name ?? '',
    description: overrides.description ?? '',
    type: overrides.type ?? 'static',
    columns: overrides.columns ?? [],
  };

  return dataset;
}

export function createDataColumn(overrides: Partial<DataColumn> = {}): DataColumn {
  return {
    name: overrides.name ?? '',
    label: overrides.label ?? '',
    description: overrides.description,
    type: overrides.type ?? 'static',
  };
}

export function datasetColumnToExpression(datasetName: string, column: DataColumn): string {
  return `\${${datasetName}.${column.name}}`;
}
