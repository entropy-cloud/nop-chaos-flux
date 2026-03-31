import { describe, it, expect } from 'vitest'
import {
  isTemplateUrl,
  parseExprFromUrl,
  exprToUrl,
  parseElExpression,
  buildElExpression,
  parseTagAttributes,
  buildTagOpenString,
  buildTagSelfcloseString,
  buildFieldExpression
} from '../template-expr.js'
import type { TemplateExpr } from '../template-expr.js'

describe('isTemplateUrl', () => {
  it('should return true for expr: prefix', () => {
    expect(isTemplateUrl('expr:something')).toBe(true)
  })

  it('should return true for xpl: prefix', () => {
    expect(isTemplateUrl('xpl:<c:if test="x">')).toBe(true)
  })

  it('should return false for https: prefix', () => {
    expect(isTemplateUrl('https://example.com')).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(isTemplateUrl('')).toBe(false)
  })

  it('should return false for plain text', () => {
    expect(isTemplateUrl('hello world')).toBe(false)
  })

  it('should return false for http: prefix', () => {
    expect(isTemplateUrl('http://example.com')).toBe(false)
  })
})

describe('parseElExpression', () => {
  it('should parse ${data.name}', () => {
    expect(parseElExpression('${data.name}')).toBe('data.name')
  })

  it('should parse ${users.0.email}', () => {
    expect(parseElExpression('${users.0.email}')).toBe('users.0.email')
  })

  it('should parse ${simple}', () => {
    expect(parseElExpression('${simple}')).toBe('simple')
  })

  it('should return null for non-el text', () => {
    expect(parseElExpression('data.name')).toBeNull()
  })

  it('should return null for incomplete expression', () => {
    expect(parseElExpression('${data.name')).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(parseElExpression('')).toBeNull()
  })

  it('should parse expression with spaces', () => {
    expect(parseElExpression('${ data.name }')).toBe(' data.name ')
  })

  it('should parse expression with complex path', () => {
    expect(parseElExpression('${order.items[0].price}')).toBe('order.items[0].price')
  })
})

describe('buildElExpression', () => {
  it('should wrap expression in ${}', () => {
    expect(buildElExpression('data.name')).toBe('${data.name}')
  })

  it('should handle empty string', () => {
    expect(buildElExpression('')).toBe('${}')
  })
})

describe('parseTagAttributes', () => {
  it('should parse tag with single attribute', () => {
    const result = parseTagAttributes('c:if test="data.active"')
    expect(result).toEqual({ tagName: 'c:if', attrs: { test: 'data.active' } })
  })

  it('should parse tag with multiple attributes', () => {
    const result = parseTagAttributes('c:for items="data.list" var="item"')
    expect(result).toEqual({ tagName: 'c:for', attrs: { items: 'data.list', var: 'item' } })
  })

  it('should parse tag with no attributes', () => {
    const result = parseTagAttributes('c:choose')
    expect(result).toEqual({ tagName: 'c:choose', attrs: {} })
  })

  it('should return null for empty string', () => {
    expect(parseTagAttributes('')).toBeNull()
  })

  it('should parse tag with single-quoted attribute', () => {
    const result = parseTagAttributes("c:if test='data.active'")
    expect(result).toEqual({ tagName: 'c:if', attrs: { test: 'data.active' } })
  })
})

describe('buildTagOpenString', () => {
  it('should build tag with no attributes', () => {
    expect(buildTagOpenString('c:if', {})).toBe('<c:if>')
  })

  it('should build tag with single attribute', () => {
    expect(buildTagOpenString('c:if', { test: 'data.active' })).toBe('<c:if test="data.active">')
  })

  it('should build tag with multiple attributes', () => {
    expect(buildTagOpenString('c:for', { items: 'data.list', var: 'item' })).toBe('<c:for items="data.list" var="item">')
  })
})

describe('buildTagSelfcloseString', () => {
  it('should build self-closing tag with no attributes', () => {
    expect(buildTagSelfcloseString('c:out', {})).toBe('<c:out />')
  })

  it('should build self-closing tag with attributes', () => {
    expect(buildTagSelfcloseString('c:out', { value: 'data.name' })).toBe('<c:out value="data.name" />')
  })
})

describe('buildFieldExpression', () => {
  it('should build ${dataset.field} expression', () => {
    expect(buildFieldExpression('users', 'email')).toBe('${users.email}')
  })

  it('should handle underscore names', () => {
    expect(buildFieldExpression('order_items', 'item_price')).toBe('${order_items.item_price}')
  })
})

describe('parseExprFromUrl', () => {
  it('should parse el expression from expr: URL', () => {
    const result = parseExprFromUrl('expr:${data.name}')
    expect(result).not.toBeNull()
    expect(result!.kind).toBe('el')
    expect(result!.expr).toBe('data.name')
  })

  it('should parse image expression from expr: URL', () => {
    const result = parseExprFromUrl('expr:logo.png')
    expect(result).not.toBeNull()
    expect(result!.kind).toBe('image')
    expect(result!.expr).toBe('logo.png')
  })

  it('should parse tag-open expression from xpl: URL', () => {
    const result = parseExprFromUrl('xpl:<c:if test="data.active">')
    expect(result).not.toBeNull()
    expect(result!.kind).toBe('tag-open')
    expect(result!.tagName).toBe('c:if')
    expect(result!.attrs).toEqual({ test: 'data.active' })
  })

  it('should parse tag-close expression from xpl: URL', () => {
    const result = parseExprFromUrl('xpl:</c:if>')
    expect(result).not.toBeNull()
    expect(result!.kind).toBe('tag-close')
    expect(result!.tagName).toBe('c:if')
  })

  it('should parse tag-selfclose expression from xpl: URL', () => {
    const result = parseExprFromUrl('xpl:<c:out value="data.name" />')
    expect(result).not.toBeNull()
    expect(result!.kind).toBe('tag-selfclose')
    expect(result!.tagName).toBe('c:out')
    expect(result!.attrs).toEqual({ value: 'data.name' })
  })

  it('should return null for non-template URLs', () => {
    expect(parseExprFromUrl('https://example.com')).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(parseExprFromUrl('')).toBeNull()
  })
})

describe('roundtrip: exprToUrl → parseExprFromUrl', () => {
  it('should roundtrip el expression', () => {
    const expr: TemplateExpr = { kind: 'el', expr: 'data.name' }
    const url = exprToUrl(expr)
    const parsed = parseExprFromUrl(url)
    expect(parsed).toEqual(expr)
  })

  it('should roundtrip image expression', () => {
    const expr: TemplateExpr = { kind: 'image', expr: 'logo.png' }
    const url = exprToUrl(expr)
    const parsed = parseExprFromUrl(url)
    expect(parsed).toEqual(expr)
  })

  it('should roundtrip tag-open expression', () => {
    const expr: TemplateExpr = {
      kind: 'tag-open',
      expr: '<c:if test="data.active">',
      tagName: 'c:if',
      attrs: { test: 'data.active' }
    }
    const url = exprToUrl(expr)
    const parsed = parseExprFromUrl(url)
    expect(parsed).toEqual(expr)
  })

  it('should roundtrip tag-close expression', () => {
    const expr: TemplateExpr = {
      kind: 'tag-close',
      expr: '</c:if>',
      tagName: 'c:if'
    }
    const url = exprToUrl(expr)
    const parsed = parseExprFromUrl(url)
    expect(parsed).toEqual(expr)
  })

  it('should roundtrip tag-selfclose expression', () => {
    const expr: TemplateExpr = {
      kind: 'tag-selfclose',
      expr: '<c:out value="data.name" />',
      tagName: 'c:out',
      attrs: { value: 'data.name' }
    }
    const url = exprToUrl(expr)
    const parsed = parseExprFromUrl(url)
    expect(parsed).toEqual(expr)
  })

  it('should roundtrip complex el expression', () => {
    const expr: TemplateExpr = { kind: 'el', expr: 'order.items[0].price' }
    const url = exprToUrl(expr)
    const parsed = parseExprFromUrl(url)
    expect(parsed).toEqual(expr)
  })

  it('should roundtrip tag-open with multiple attributes', () => {
    const expr: TemplateExpr = {
      kind: 'tag-open',
      expr: '<c:for items="data.list" var="item">',
      tagName: 'c:for',
      attrs: { items: 'data.list', var: 'item' }
    }
    const url = exprToUrl(expr)
    const parsed = parseExprFromUrl(url)
    expect(parsed).toEqual(expr)
  })
})
