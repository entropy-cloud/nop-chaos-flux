import { describe, it, expect } from 'vitest'
import { PAPER_SIZE_PRESETS, DEFAULT_PAPER_SETTINGS } from '../paper-settings.js'

describe('PAPER_SIZE_PRESETS', () => {
  it('has all expected keys', () => {
    const keys = Object.keys(PAPER_SIZE_PRESETS)
    expect(keys).toContain('a2')
    expect(keys).toContain('a3')
    expect(keys).toContain('a4')
    expect(keys).toContain('a5')
    expect(keys).toContain('b4')
    expect(keys).toContain('b5')
    expect(keys).toHaveLength(6)
  })

  it('A4 dimensions are correct', () => {
    expect(PAPER_SIZE_PRESETS.a4).toEqual({ width: 595, height: 842 })
  })

  it('each preset has positive width and height', () => {
    for (const [name, preset] of Object.entries(PAPER_SIZE_PRESETS)) {
      expect(preset.width, `${name} width`).toBeGreaterThan(0)
      expect(preset.height, `${name} height`).toBeGreaterThan(0)
    }
  })
})

describe('DEFAULT_PAPER_SETTINGS', () => {
  it('uses A4 dimensions', () => {
    expect(DEFAULT_PAPER_SETTINGS.width).toBe(595)
    expect(DEFAULT_PAPER_SETTINGS.height).toBe(842)
  })

  it('has vertical direction', () => {
    expect(DEFAULT_PAPER_SETTINGS.direction).toBe('vertical')
  })

  it('has correct margins', () => {
    expect(DEFAULT_PAPER_SETTINGS.margins).toEqual([100, 120, 100, 120])
  })
})
