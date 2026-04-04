export type CodeType = 'barcode' | 'qrcode'

export interface DocCode {
  id: string
  codeName: string
  codeType: CodeType
  datasetId: string
  valueField: string
}

let _codeIdCounter = 0

function generateCodeId(): string {
  return `code_${Date.now()}_${++_codeIdCounter}`
}

const VALID_CODE_TYPES: CodeType[] = ['barcode', 'qrcode']

export function createDocCode(overrides: Partial<DocCode> = {}): DocCode {
  return {
    id: overrides.id ?? generateCodeId(),
    codeName: overrides.codeName ?? '',
    codeType: overrides.codeType ?? 'barcode',
    datasetId: overrides.datasetId ?? '',
    valueField: overrides.valueField ?? ''
  }
}

export function validateDocCode(code: Partial<DocCode>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!code.codeName || code.codeName.trim() === '') {
    errors.push('Code name is required')
  }

  if (!code.codeType || !VALID_CODE_TYPES.includes(code.codeType)) {
    errors.push('Code type must be one of: barcode, qrcode')
  }

  if (!code.datasetId || code.datasetId.trim() === '') {
    errors.push('Dataset ID is required')
  }

  if (!code.valueField || code.valueField.trim() === '') {
    errors.push('Value field is required')
  }

  return { valid: errors.length === 0, errors }
}
