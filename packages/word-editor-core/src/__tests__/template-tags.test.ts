import { describe, it, expect } from 'vitest'
import {
  BUILTIN_TEMPLATE_TAGS,
  findTagDefinition,
  getOpeningTag,
  getClosingTag,
  getMatchingCloseTag
} from '../template-tags.js'

describe('BUILTIN_TEMPLATE_TAGS', () => {
  it('should be an array with 15 entries', () => {
    expect(BUILTIN_TEMPLATE_TAGS).toHaveLength(15)
  })

  it('each entry should have name, kind, label, and description', () => {
    for (const tag of BUILTIN_TEMPLATE_TAGS) {
      expect(tag).toHaveProperty('name')
      expect(tag).toHaveProperty('kind')
      expect(tag).toHaveProperty('label')
      expect(tag).toHaveProperty('description')
      expect(typeof tag.name).toBe('string')
      expect(['tag-open', 'tag-close', 'tag-selfclose']).toContain(tag.kind)
      expect(typeof tag.label).toBe('string')
      expect(typeof tag.description).toBe('string')
    }
  })
})

describe('findTagDefinition', () => {
  it('should find c:if tag-open with defaultAttrs containing test', () => {
    const tag = findTagDefinition('c:if', 'tag-open')
    expect(tag).toBeDefined()
    expect(tag!.name).toBe('c:if')
    expect(tag!.kind).toBe('tag-open')
    expect(tag!.defaultAttrs).toBeDefined()
    expect(tag!.defaultAttrs).toHaveProperty('test')
  })

  it('should find c:if tag-close with no defaultAttrs', () => {
    const tag = findTagDefinition('c:if', 'tag-close')
    expect(tag).toBeDefined()
    expect(tag!.name).toBe('c:if')
    expect(tag!.kind).toBe('tag-close')
    expect(tag!.defaultAttrs).toBeUndefined()
  })

  it('should find c:out tag-selfclose with defaultAttrs containing value', () => {
    const tag = BUILTIN_TEMPLATE_TAGS.find(t => t.name === 'c:out' && t.kind === 'tag-selfclose')
    expect(tag).toBeDefined()
    expect(tag!.name).toBe('c:out')
    expect(tag!.kind).toBe('tag-selfclose')
    expect(tag!.defaultAttrs).toBeDefined()
    expect(tag!.defaultAttrs).toHaveProperty('value')
  })

  it('should return undefined for non-existent name', () => {
    expect(findTagDefinition('c:nonexistent', 'tag-open')).toBeUndefined()
  })

  it('should return undefined when kind does not match', () => {
    expect(findTagDefinition('c:out', 'tag-open')).toBeUndefined()
  })
})

describe('getOpeningTag', () => {
  it('should return tag-open variant for c:if', () => {
    const tag = getOpeningTag('c:if')
    expect(tag).toBeDefined()
    expect(tag!.name).toBe('c:if')
    expect(tag!.kind).toBe('tag-open')
  })

  it('should return tag-open variant for c:for', () => {
    const tag = getOpeningTag('c:for')
    expect(tag).toBeDefined()
    expect(tag!.name).toBe('c:for')
    expect(tag!.kind).toBe('tag-open')
    expect(tag!.defaultAttrs).toEqual({ items: '', var: 'item' })
  })

  it('should return undefined for tag with no open variant', () => {
    expect(getOpeningTag('c:out')).toBeUndefined()
  })
})

describe('getClosingTag', () => {
  it('should return tag-close variant for c:if', () => {
    const tag = getClosingTag('c:if')
    expect(tag).toBeDefined()
    expect(tag!.name).toBe('c:if')
    expect(tag!.kind).toBe('tag-close')
  })

  it('should return undefined for self-closing only tag', () => {
    expect(getClosingTag('c:out')).toBeUndefined()
  })
})

describe('getMatchingCloseTag', () => {
  it('should return close tag for c:for open tag', () => {
    const openTag = getOpeningTag('c:for')!
    const closeTag = getMatchingCloseTag(openTag)
    expect(closeTag).toBeDefined()
    expect(closeTag!.name).toBe('c:for')
    expect(closeTag!.kind).toBe('tag-close')
  })

  it('should return close tag for c:if open tag', () => {
    const openTag = getOpeningTag('c:if')!
    const closeTag = getMatchingCloseTag(openTag)
    expect(closeTag).toBeDefined()
    expect(closeTag!.name).toBe('c:if')
    expect(closeTag!.kind).toBe('tag-close')
  })

  it('should return undefined for c:out (selfclose has no close tag)', () => {
    const selfcloseTag = BUILTIN_TEMPLATE_TAGS.find(t => t.name === 'c:out' && t.kind === 'tag-selfclose')!
    const result = getMatchingCloseTag(selfcloseTag)
    expect(result).toBeUndefined()
  })
})
