import { describe, it, expect } from 'vitest'
import { createDocChart, validateDocChart } from '../chart-model.js'
import type { ChartType } from '../chart-model.js'

describe('createDocChart', () => {
  it('returns defaults with generated id', () => {
    const chart = createDocChart()
    expect(chart.id).toMatch(/^chart_\d+_\d+$/)
    expect(chart.chartName).toBe('')
    expect(chart.chartType).toBe('bar')
    expect(chart.showChartName).toBe(true)
    expect(chart.datasetId).toBe('')
    expect(chart.categoryField).toBe('')
    expect(chart.valueField).toEqual([])
    expect(chart.seriesField).toBeUndefined()
  })

  it('applies full overrides', () => {
    const chart = createDocChart({
      id: 'chart_custom_1',
      chartName: 'Sales Chart',
      chartType: 'line',
      showChartName: false,
      datasetId: 'ds_1',
      categoryField: 'month',
      valueField: ['revenue', 'cost'],
      seriesField: ['region']
    })
    expect(chart.id).toBe('chart_custom_1')
    expect(chart.chartName).toBe('Sales Chart')
    expect(chart.chartType).toBe('line')
    expect(chart.showChartName).toBe(false)
    expect(chart.datasetId).toBe('ds_1')
    expect(chart.categoryField).toBe('month')
    expect(chart.valueField).toEqual(['revenue', 'cost'])
    expect(chart.seriesField).toEqual(['region'])
  })

  it('generates unique ids', () => {
    const chart1 = createDocChart()
    const chart2 = createDocChart()
    expect(chart1.id).not.toBe(chart2.id)
  })

  it('applies partial overrides keeping defaults', () => {
    const chart = createDocChart({ chartName: 'Test', datasetId: 'ds_2' })
    expect(chart.chartName).toBe('Test')
    expect(chart.datasetId).toBe('ds_2')
    expect(chart.chartType).toBe('bar')
    expect(chart.showChartName).toBe(true)
    expect(chart.id).toMatch(/^chart_/)
  })

  it('allows explicit id override', () => {
    const chart = createDocChart({ id: 'my_chart_id' })
    expect(chart.id).toBe('my_chart_id')
  })

  it('allows seriesField as undefined when not provided', () => {
    const chart = createDocChart()
    expect(chart.seriesField).toBeUndefined()
  })

  it('allows seriesField override', () => {
    const chart = createDocChart({ seriesField: ['a', 'b'] })
    expect(chart.seriesField).toEqual(['a', 'b'])
  })
})

describe('validateDocChart', () => {
  it('validates a complete valid chart', () => {
    const chart = createDocChart({
      chartName: 'Revenue',
      chartType: 'bar',
      datasetId: 'ds_1',
      categoryField: 'month',
      valueField: ['revenue']
    })
    const result = validateDocChart(chart)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects empty chart name', () => {
    const result = validateDocChart({
      chartType: 'bar',
      datasetId: 'ds_1',
      categoryField: 'month',
      valueField: ['revenue']
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Chart name is required')
  })

  it('rejects whitespace-only chart name', () => {
    const result = validateDocChart({
      chartName: '   ',
      chartType: 'bar',
      datasetId: 'ds_1',
      categoryField: 'month',
      valueField: ['revenue']
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Chart name is required')
  })

  it('rejects invalid chart type', () => {
    const result = validateDocChart({
      chartName: 'Test',
      chartType: 'invalid' as any,
      datasetId: 'ds_1',
      categoryField: 'month',
      valueField: ['revenue']
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Chart type must be one of'))).toBe(true)
  })

  it('rejects missing chart type', () => {
    const result = validateDocChart({
      chartName: 'Test',
      datasetId: 'ds_1',
      categoryField: 'month',
      valueField: ['revenue']
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Chart type must be one of'))).toBe(true)
  })

  it('rejects missing datasetId', () => {
    const result = validateDocChart({
      chartName: 'Test',
      chartType: 'bar',
      categoryField: 'month',
      valueField: ['revenue']
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Dataset ID is required')
  })

  it('rejects empty string datasetId', () => {
    const result = validateDocChart({
      chartName: 'Test',
      chartType: 'bar',
      datasetId: '',
      categoryField: 'month',
      valueField: ['revenue']
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Dataset ID is required')
  })

  it('rejects missing categoryField', () => {
    const result = validateDocChart({
      chartName: 'Test',
      chartType: 'bar',
      datasetId: 'ds_1',
      valueField: ['revenue']
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Category field is required')
  })

  it('rejects empty valueField array', () => {
    const result = validateDocChart({
      chartName: 'Test',
      chartType: 'bar',
      datasetId: 'ds_1',
      categoryField: 'month',
      valueField: []
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Value field must be a non-empty array'))).toBe(true)
  })

  it('rejects missing valueField', () => {
    const result = validateDocChart({
      chartName: 'Test',
      chartType: 'bar',
      datasetId: 'ds_1',
      categoryField: 'month'
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Value field must be a non-empty array'))).toBe(true)
  })

  it('accepts all valid chart types', () => {
    const types: ChartType[] = ['bar', 'line', 'pie', 'scatter', 'area']
    for (const t of types) {
      const result = validateDocChart({
        chartName: 'Test',
        chartType: t,
        datasetId: 'ds_1',
        categoryField: 'month',
        valueField: ['val']
      })
      expect(result.valid).toBe(true)
    }
  })

  it('collects multiple errors at once', () => {
    const result = validateDocChart({})
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(4)
    expect(result.errors).toContain('Chart name is required')
    expect(result.errors.some(e => e.includes('Chart type must be one of'))).toBe(true)
    expect(result.errors).toContain('Dataset ID is required')
    expect(result.errors).toContain('Category field is required')
  })
})

describe('ChartType', () => {
  it('covers all expected values', () => {
    const types: ChartType[] = ['bar', 'line', 'pie', 'scatter', 'area']
    expect(types).toHaveLength(5)
  })
})
