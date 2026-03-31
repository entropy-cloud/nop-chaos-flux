export type TemplateExprKind = 'el' | 'image' | 'tag-open' | 'tag-close' | 'tag-selfclose'

export interface TemplateExpr {
  kind: TemplateExprKind
  expr: string
  tagName?: string
  attrs?: Record<string, string>
}

const EXPR_PREFIX = 'expr:'
const XPL_PREFIX = 'xpl:'

export function isTemplateUrl(url: string): boolean {
  return url.startsWith(EXPR_PREFIX) || url.startsWith(XPL_PREFIX)
}

export function parseExprFromUrl(url: string): TemplateExpr | null {
  if (url.startsWith(EXPR_PREFIX)) {
    const content = url.slice(EXPR_PREFIX.length)
    if (content.startsWith('${')) {
      const elExpr = parseElExpression(content)
      if (elExpr !== null) {
        return { kind: 'el', expr: elExpr }
      }
    }
    return { kind: 'image', expr: content }
  }

  if (url.startsWith(XPL_PREFIX)) {
    const content = url.slice(XPL_PREFIX.length)
    if (content.startsWith('</')) {
      const tagName = content.slice(2).replace(/>$/, '').trim()
      return { kind: 'tag-close', expr: content, tagName }
    }

    if (content.startsWith('<')) {
      const selfClose = content.endsWith('/>')
      const inner = selfClose
        ? content.slice(1, -2)
        : content.slice(1, content.lastIndexOf('>') - 0 + 1).slice(0, -1)
      const parsed = parseTagAttributes(inner.trim())
      if (parsed) {
        return {
          kind: selfClose ? 'tag-selfclose' : 'tag-open',
          expr: content,
          tagName: parsed.tagName,
          attrs: parsed.attrs
        }
      }
    }
  }

  return null
}

export function exprToUrl(expr: TemplateExpr): string {
  switch (expr.kind) {
    case 'el':
      return `${EXPR_PREFIX}\${${expr.expr}}`
    case 'image':
      return `${EXPR_PREFIX}${expr.expr}`
    case 'tag-open':
      return `${XPL_PREFIX}${buildTagOpenString(expr.tagName ?? '', expr.attrs ?? {})}`
    case 'tag-close':
      return `${XPL_PREFIX}</${expr.tagName ?? ''}>`
    case 'tag-selfclose':
      return `${XPL_PREFIX}${buildTagSelfcloseString(expr.tagName ?? '', expr.attrs ?? {})}`
  }
}

export function parseElExpression(text: string): string | null {
  if (text.startsWith('${') && text.endsWith('}')) {
    return text.slice(2, -1)
  }
  return null
}

export function buildElExpression(expr: string): string {
  return `\${${expr}}`
}

export function parseTagAttributes(tagStr: string): { tagName: string; attrs: Record<string, string> } | null {
  const match = tagStr.match(/^(\S+)/)
  if (!match) return null

  const tagName = match[1]
  const attrs: Record<string, string> = {}
  const rest = tagStr.slice(match[0].length).trim()

  const attrRegex = /(\S+?)=(?:"([^"]*)"|'([^']*)')/g
  let attrMatch: RegExpExecArray | null
  while ((attrMatch = attrRegex.exec(rest)) !== null) {
    attrs[attrMatch[1]] = attrMatch[2] ?? attrMatch[3]
  }

  return { tagName, attrs }
}

export function buildTagOpenString(tagName: string, attrs: Record<string, string>): string {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')
  return `<${tagName}${attrStr ? ' ' + attrStr : ''}>`
}

export function buildTagSelfcloseString(tagName: string, attrs: Record<string, string>): string {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')
  return `<${tagName}${attrStr ? ' ' + attrStr : ''} />`
}

export function buildFieldExpression(datasetName: string, fieldName: string): string {
  return `\${${datasetName}.${fieldName}}`
}

export interface FieldReference {
  dataset: string
  field: string
  fullReference: string
}

export function parseFieldReference(expression: string): FieldReference | null {
  const match = /^\$\{([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\}$/.exec(expression.trim())
  
  if (!match) {
    return null
  }
  
  return {
    dataset: match[1],
    field: match[2],
    fullReference: match[0]
  }
}

export function validateFieldReference(expression: string): { valid: boolean; error?: string } {
  const parts = expression.trim().split('.')
  
  if (parts.length !== 2) {
    return { valid: false, error: 'Field reference must be in format ${dataset.field}' }
  }
  
  const [dataset, field] = parts.map(p => p.replace('${', '').replace('}', ''))
  
  if (!dataset || !field) {
    return { valid: false, error: 'Dataset and field names are required' }
  }
  
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dataset)) {
    return { valid: false, error: 'Dataset name must start with a letter or underscore and contain only letters, numbers, and underscores' }
  }
  
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
    return { valid: false, error: 'Field name must start with a letter or underscore and contain only letters, numbers, and underscores' }
  }
  
  return { valid: true }
}

export interface ParsedTemplate {
  segments: Array<{ type: 'text' | 'field-reference'; value: string }>
  hasExpressions: boolean
}

export function parseTemplate(template: string): ParsedTemplate {
  const segments: Array<{ type: 'text' | 'field-reference'; value: string }> = []
  let lastIndex = 0
  let hasExpressions = false
  
  const FIELD_REF_REGEX = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\}/g
  
  let match
  const regex = new RegExp(FIELD_REF_REGEX)
  
  while ((match = regex.exec(template)) !== null) {
    hasExpressions = true
    
    const start = match.index
    const end = regex.lastIndex
    
    if (start > lastIndex) {
      segments.push({
        type: 'text',
        value: template.slice(lastIndex, start)
      })
    }
    
    segments.push({
      type: 'field-reference',
      value: match[0]
    })
    
    lastIndex = end
  }
  
  if (lastIndex < template.length) {
    segments.push({
      type: 'text',
      value: template.slice(lastIndex)
    })
  }
  
  return {
    segments,
    hasExpressions
  }
}

export function extractFieldReferences(template: string): FieldReference[] {
  const parsed = parseTemplate(template)
  const references: FieldReference[] = []
  
  for (const segment of parsed.segments) {
    if (segment.type === 'field-reference') {
      const ref = parseFieldReference(segment.value)
      if (ref) {
        references.push(ref)
      }
    }
  }
  
  return references
}

export function hasFieldReferences(template: string): boolean {
  return /\$\{[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*\}/.test(template)
}
