import { describe, expect, it } from 'vitest';
import type { ScadaSymbolDefinition } from '../../symbols/symbol-types.js';
import { groupScadaPaletteSymbols, matchesScadaPaletteQuery } from './palette-filter.js';

function def(type: string, name: string, category?: ScadaSymbolDefinition['category']): ScadaSymbolDefinition {
  return { type, name, props: {}, create: () => ({}) as never, category };
}

const symbols = [
  def('scada-rect', 'Rect', 'shape'),
  def('scada-circle', 'Circle', 'shape'),
  def('scada-motor', 'Motor', 'device'),
  def('scada-valve', 'Valve', 'pipe'),
  def('scada-custom', 'Mystery', undefined),
];

describe('matchesScadaPaletteQuery (plan 531 S2 Phase 1)', () => {
  it('returns true for empty/blank query (pass-through)', () => {
    expect(matchesScadaPaletteQuery(symbols[0], 'Rect', '')).toBe(true);
    expect(matchesScadaPaletteQuery(symbols[0], 'Rect', '   ')).toBe(true);
  });

  it('matches resolved name / type / case-insensitively with trim', () => {
    expect(matchesScadaPaletteQuery(symbols[0], 'Rect', 'rec')).toBe(true);
    expect(matchesScadaPaletteQuery(symbols[0], 'Rect', 'RECT')).toBe(true);
    expect(matchesScadaPaletteQuery(symbols[1], 'Circle', 'scada-cir')).toBe(true);
    expect(matchesScadaPaletteQuery(symbols[2], 'Motor', 'device')).toBe(true);
    expect(matchesScadaPaletteQuery(symbols[0], 'Rect', 'zzz')).toBe(false);
  });
});

describe('groupScadaPaletteSymbols (plan 531 S2 Phase 1)', () => {
  it('groups by category in stable order with fallback to other for undefined category', () => {
    const groups = groupScadaPaletteSymbols(symbols, (d) => d.name, '');
    expect(groups.map((g) => g.category)).toEqual(['shape', 'device', 'pipe', 'other']);
    expect(groups[0].symbols.map((s) => s.type)).toEqual(['scada-rect', 'scada-circle']);
    // category 缺省（optional 字段，第三方注册可缺）单列 other 组，不静默丢弃（review M-6）。
    expect(groups[3].symbols.map((s) => s.type)).toEqual(['scada-custom']);
  });

  it('filters within groups and drops empty groups', () => {
    const groups = groupScadaPaletteSymbols(symbols, (d) => d.name, 'cir');
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe('shape');
    expect(groups[0].symbols.map((s) => s.type)).toEqual(['scada-circle']);
  });

  it('matches against the resolved (i18n) name, not the raw def.name', () => {
    // resolvedNameOf 由组件注入 i18n 解析名——检索必须作用于可见名称。
    const groups = groupScadaPaletteSymbols(symbols, (d) => (d.type === 'scada-rect' ? '矩形' : d.name), '矩形');
    expect(groups).toHaveLength(1);
    expect(groups[0].symbols.map((s) => s.type)).toEqual(['scada-rect']);
  });
});
