import { describe, it, expect } from 'vitest'
import { createDocCode, validateDocCode } from '../code-model.js'
import type { CodeType } from '../code-model.js'

describe('createDocCode', () => {
  it('returns defaults with generated id', () => {
    const code = createDocCode()
    expect(code.id).toMatch(/^code_\d+_\d+$/)
    expect(code.codeName).toBe('')
    expect(code.codeType).toBe('barcode')
    expect(code.datasetId).toBe('')
    expect(code.valueField).toBe('')
  })

  it('applies full overrides', () => {
    const code = createDocCode({
      id: 'code_custom_1',
      codeName: 'Product Barcode',
      codeType: 'qrcode',
      datasetId: 'ds_1',
      valueField: 'sku'
    })
    expect(code.id).toBe('code_custom_1')
    expect(code.codeName).toBe('Product Barcode')
    expect(code.codeType).toBe('qrcode')
    expect(code.datasetId).toBe('ds_1')
    expect(code.valueField).toBe('sku')
  })

  it('generates unique ids', () => {
    const code1 = createDocCode()
    const code2 = createDocCode()
    expect(code1.id).not.toBe(code2.id)
  })

  it('applies partial overrides keeping defaults', () => {
    const code = createDocCode({ codeName: 'Test', datasetId: 'ds_2' })
    expect(code.codeName).toBe('Test')
    expect(code.datasetId).toBe('ds_2')
    expect(code.codeType).toBe('barcode')
    expect(code.id).toMatch(/^code_/)
  })

  it('allows explicit id override', () => {
    const code = createDocCode({ id: 'my_code_id' })
    expect(code.id).toBe('my_code_id')
  })

  it('defaults codeType to barcode', () => {
    const code = createDocCode()
    expect(code.codeType).toBe('barcode')
  })

  it('allows codeType qrcode override', () => {
    const code = createDocCode({ codeType: 'qrcode' })
    expect(code.codeType).toBe('qrcode')
  })
})

describe('validateDocCode', () => {
  it('validates a complete valid code', () => {
    const code = createDocCode({
      codeName: 'SKU Barcode',
      codeType: 'barcode',
      datasetId: 'ds_1',
      valueField: 'sku'
    })
    const result = validateDocCode(code)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects empty code name', () => {
    const result = validateDocCode({
      codeType: 'barcode',
      datasetId: 'ds_1',
      valueField: 'sku'
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Code name is required')
  })

  it('rejects whitespace-only code name', () => {
    const result = validateDocCode({
      codeName: '   ',
      codeType: 'barcode',
      datasetId: 'ds_1',
      valueField: 'sku'
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Code name is required')
  })

  it('rejects invalid code type', () => {
    const result = validateDocCode({
      codeName: 'Test',
      codeType: 'invalid' as any,
      datasetId: 'ds_1',
      valueField: 'sku'
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Code type must be one of'))).toBe(true)
  })

  it('rejects missing code type', () => {
    const result = validateDocCode({
      codeName: 'Test',
      datasetId: 'ds_1',
      valueField: 'sku'
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('Code type must be one of'))).toBe(true)
  })

  it('rejects missing datasetId', () => {
    const result = validateDocCode({
      codeName: 'Test',
      codeType: 'barcode',
      valueField: 'sku'
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Dataset ID is required')
  })

  it('rejects empty string datasetId', () => {
    const result = validateDocCode({
      codeName: 'Test',
      codeType: 'barcode',
      datasetId: '',
      valueField: 'sku'
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Dataset ID is required')
  })

  it('rejects missing valueField', () => {
    const result = validateDocCode({
      codeName: 'Test',
      codeType: 'barcode',
      datasetId: 'ds_1'
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Value field is required')
  })

  it('rejects empty string valueField', () => {
    const result = validateDocCode({
      codeName: 'Test',
      codeType: 'barcode',
      datasetId: 'ds_1',
      valueField: ''
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Value field is required')
  })

  it('accepts both valid code types', () => {
    const types: CodeType[] = ['barcode', 'qrcode']
    for (const t of types) {
      const result = validateDocCode({
        codeName: 'Test',
        codeType: t,
        datasetId: 'ds_1',
        valueField: 'sku'
      })
      expect(result.valid).toBe(true)
    }
  })

  it('collects multiple errors at once', () => {
    const result = validateDocCode({})
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(4)
    expect(result.errors).toContain('Code name is required')
    expect(result.errors.some(e => e.includes('Code type must be one of'))).toBe(true)
    expect(result.errors).toContain('Dataset ID is required')
    expect(result.errors).toContain('Value field is required')
  })

  it('validates qrcode type correctly', () => {
    const result = validateDocCode({
      codeName: 'QR',
      codeType: 'qrcode',
      datasetId: 'ds_1',
      valueField: 'url'
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })
})

describe('CodeType', () => {
  it('covers all expected values', () => {
    const types: CodeType[] = ['barcode', 'qrcode']
    expect(types).toHaveLength(2)
  })
})
