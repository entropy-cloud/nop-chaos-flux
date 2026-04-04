export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area'

export interface DocChart {
  id: string
  chartName: string
  chartType: ChartType
  showChartName: boolean
  datasetId: string
  categoryField: string
  valueField: string[]
  seriesField?: string[]
}

let _chartIdCounter = 0

function generateChartId(): string {
  return `chart_${Date.now()}_${++_chartIdCounter}`
}

const VALID_CHART_TYPES: ChartType[] = ['bar', 'line', 'pie', 'scatter', 'area']

export function createDocChart(overrides: Partial<DocChart> = {}): DocChart {
  return {
    id: overrides.id ?? generateChartId(),
    chartName: overrides.chartName ?? '',
    chartType: overrides.chartType ?? 'bar',
    showChartName: overrides.showChartName ?? true,
    datasetId: overrides.datasetId ?? '',
    categoryField: overrides.categoryField ?? '',
    valueField: overrides.valueField ?? [],
    seriesField: overrides.seriesField
  }
}

export function validateDocChart(chart: Partial<DocChart>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!chart.chartName || chart.chartName.trim() === '') {
    errors.push('Chart name is required')
  }

  if (!chart.chartType || !VALID_CHART_TYPES.includes(chart.chartType)) {
    errors.push('Chart type must be one of: bar, line, pie, scatter, area')
  }

  if (!chart.datasetId || chart.datasetId.trim() === '') {
    errors.push('Dataset ID is required')
  }

  if (!chart.categoryField || chart.categoryField.trim() === '') {
    errors.push('Category field is required')
  }

  if (!chart.valueField || !Array.isArray(chart.valueField) || chart.valueField.length === 0) {
    errors.push('Value field must be a non-empty array')
  }

  return { valid: errors.length === 0, errors }
}
