import { describe, expect, it } from 'vitest';
import { buildDesignerPaletteCatalog, resolvePaletteLabel, type DesignerPaletteEntry } from './palette-catalog.js';

const registryStub = (types: string[]) => ({ has: (t: string) => types.includes(t) });

describe('buildDesignerPaletteCatalog (P4.1)', () => {
  const entries: DesignerPaletteEntry[] = [
    { type: 'chart', labelKey: 'flux.demo.chart', defaultTitle: 'Chart', defaultW: 6, defaultH: 4 },
    { type: 'custom', label: 'Custom Panel' },
    { type: 'ghost', label: 'Never registered' },
  ];

  it('filters out entries whose type is not registered (auto-hide)', () => {
    const items = buildDesignerPaletteCatalog(entries, registryStub(['chart']));
    expect(items.map((i) => i.type)).toEqual(['chart']);
  });

  it('keeps declaration order and passes sizing metadata through', () => {
    const items = buildDesignerPaletteCatalog(entries, registryStub(['chart', 'custom']));
    expect(items.map((i) => i.type)).toEqual(['chart', 'custom']);
    expect(items[0].defaultW).toBe(6);
    expect(items[1].label).toBe('Custom Panel');
  });
});

describe('resolvePaletteLabel (P4.1)', () => {
  it('labelKey wins over label; falls back to type', () => {
    expect(resolvePaletteLabel({ type: 'x', label: 'L', labelKey: 'k.k' }, () => 'T')).toBe('T');
    expect(resolvePaletteLabel({ type: 'x', label: 'L' }, (k) => k)).toBe('L');
    expect(resolvePaletteLabel({ type: 'x' }, (k) => k)).toBe('x');
  });
});
