import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { validateScadaConfig } from './validate.js';
import { parseScadaConfig } from './parse.js';
import { serializeScadaConfig } from './serialize.js';
import { diffScadaConfig } from './diff.js';
import type { ScadaConfig, ScadaSymbolNode, ScadaStateDeclaration, ScadaAnimation, ScadaSymbolEvent } from './config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));

const rect = (id: string, overrides: Partial<ScadaSymbolNode> = {}): ScadaSymbolNode => ({
  id,
  type: 'scada-rect',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  ...overrides,
});

const baseConfig = (overrides: Partial<ScadaConfig> = {}): ScadaConfig => ({
  version: 1,
  symbols: [rect('a'), rect('b', { x: 10, y: 20 })],
  ...overrides,
});

beforeEach(() => {
  registerBuiltinScadaSymbols();
});

describe('validateScadaConfig', () => {
  it('should accept a valid config', () => {
    expect(validateScadaConfig(baseConfig())).toEqual({ ok: true });
  });

  it('should reject non-object input', () => {
    expect(validateScadaConfig(null).ok).toBe(false);
    expect(validateScadaConfig('nope').ok).toBe(false);
    expect(validateScadaConfig([]).ok).toBe(false);
  });

  it('should reject a non-1 version', () => {
    const result = validateScadaConfig({ ...baseConfig(), version: 2 });
    expect(result).toEqual({
      ok: false,
      errors: expect.arrayContaining(['config.version must be 1']),
    });
  });

  it('should reject missing symbols array', () => {
    const result = validateScadaConfig({ version: 1 });
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors).toContain('config.symbols must be an array');
  });

  it('should reject duplicate symbol ids across nested children', () => {
    const config = baseConfig({
      symbols: [rect('dup', { children: [rect('child'), rect('dup')] })],
    });
    const result = validateScadaConfig(config);
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('duplicate symbol id: dup'))).toBe(true);
  });

  it('should recurse into children with structural checks', () => {
    const config = baseConfig({
      symbols: [rect('g', { type: 'scada-group', children: [rect('c1'), { ...rect('c2'), x: 'bad' as unknown as number }] })],
    });
    const result = validateScadaConfig(config);
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('symbols[0].children[1].x'))).toBe(true);
  });

  it('should reject unknown symbol types but accept scada-group as structural container', () => {
    const unknown = validateScadaConfig(baseConfig({ symbols: [rect('x', { type: 'scada-nope' })] }));
    expect(unknown.ok).toBe(false);
    expect((unknown as { errors: string[] }).errors).toContain('unknown symbol type: scada-nope');
    const group = validateScadaConfig(baseConfig({ symbols: [rect('g', { type: 'scada-group' })] }));
    expect(group.ok).toBe(true);
  });

  it('should reject duplicate point ids and invalid source fields', () => {
    const config = baseConfig({
      variables: [
        { id: 'p1', source: 'static', value: 1 },
        { id: 'p1', source: 'static', value: 2 },
      ],
    });
    const result = validateScadaConfig(config);
    expect(result.ok).toBe(false);
    expect((result as { errors: string[] }).errors.some((e) => e.includes('duplicate point declaration id: p1'))).toBe(
      true,
    );
  });

  it('should validate per-source point declaration requirements', () => {
    const missingStaticValue = validateScadaConfig(baseConfig({ variables: [{ id: 'p1', source: 'static' }] }));
    expect(missingStaticValue.ok).toBe(false);
    const missingExpression = validateScadaConfig(
      baseConfig({ variables: [{ id: 'p2', source: 'expression', expression: '' }] }),
    );
    expect(missingExpression.ok).toBe(false);
    const missingFlux = validateScadaConfig(baseConfig({ variables: [{ id: 'p3', source: 'flux' }] }));
    expect(missingFlux.ok).toBe(false);
    const badSource = validateScadaConfig(baseConfig({ variables: [{ id: 'p4', source: 'websocket' as never }] }));
    expect(badSource.ok).toBe(false);
    const badPointShape = validateScadaConfig(baseConfig({ variables: ['x' as never] }));
    expect(badPointShape.ok).toBe(false);
    const badScale = validateScadaConfig(baseConfig({ variables: [{ id: 'p5', source: 'static', value: 1, scale: 'x' as never }] }));
    expect(badScale.ok).toBe(false);
    const badDeadband = validateScadaConfig(baseConfig({ variables: [{ id: 'p6', source: 'static', value: 1, deadband: 'x' as never }] }));
    expect(badDeadband.ok).toBe(false);
    const badUnit = validateScadaConfig(baseConfig({ variables: [{ id: 'p7', source: 'static', value: 1, unit: 3 as never }] }));
    expect(badUnit.ok).toBe(false);
    const badFormat = validateScadaConfig(baseConfig({ variables: [{ id: 'p8', source: 'static', value: 1, format: 3 as never }] }));
    expect(badFormat.ok).toBe(false);
    const ok = validateScadaConfig(
      baseConfig({
        variables: [
          { id: 's1', source: 'static', value: true },
          { id: 'e1', source: 'expression', expression: '@{s1} > 1' },
          { id: 'f1', source: 'flux', flux: '$tank.level', deadband: 0.5 },
        ],
      }),
    );
    expect(ok).toEqual({ ok: true });
  });

  it('should validate optional numeric/string fields', () => {
    const badOpacity = validateScadaConfig(baseConfig({ symbols: [rect('o', { opacity: 'high' as unknown as number })] }));
    expect(badOpacity.ok).toBe(false);
    const badViewport = validateScadaConfig({ ...baseConfig(), viewport: { x: 'a' as unknown as number } });
    expect(badViewport.ok).toBe(false);
    const badVariablesShape = validateScadaConfig({ ...baseConfig(), variables: 'nope' as never });
    expect(badVariablesShape.ok).toBe(false);
  });

  it('should validate string fields and background/viewport shapes', () => {
    const badFill = validateScadaConfig(baseConfig({ symbols: [rect('s', { fill: 42 as unknown as string })] }));
    expect((badFill as { errors: string[] }).errors).toContain('symbols[0].fill must be a string');
    const badVisible = validateScadaConfig(baseConfig({ symbols: [rect('v', { visible: 1 as unknown as boolean })] }));
    expect(badVisible.ok).toBe(false);
    const badCustom = validateScadaConfig(baseConfig({ symbols: [rect('c', { custom: 'x' as unknown as Record<string, unknown> })] }));
    expect(badCustom.ok).toBe(false);
    const badBackground = validateScadaConfig({ ...baseConfig(), background: 'nope' as never });
    expect(badBackground.ok).toBe(false);
    const badViewportShape = validateScadaConfig({ ...baseConfig(), viewport: 'nope' as never });
    expect(badViewportShape.ok).toBe(false);
    const badViewportField = validateScadaConfig({ ...baseConfig(), viewport: { x: 1, y: 2, scale: 'big' as unknown as number } });
    expect(badViewportField.ok).toBe(false);
    const badStates = validateScadaConfig(baseConfig({ symbols: [rect('st', { states: 5 as unknown as ScadaStateDeclaration })] }));
    expect(badStates.ok).toBe(false);
    const badAnimations = validateScadaConfig(baseConfig({ symbols: [rect('an', { animations: {} as unknown as ScadaAnimation[] })] }));
    expect(badAnimations.ok).toBe(false);
    const badEvents = validateScadaConfig(baseConfig({ symbols: [rect('ev', { events: {} as unknown as ScadaSymbolEvent[] })] }));
    expect(badEvents.ok).toBe(false);
    const badBindings = validateScadaConfig(baseConfig({ symbols: [rect('bi', { bindings: [] as unknown as Record<string, never> })] }));
    expect(badBindings.ok).toBe(false);
    const badSymbolShape = validateScadaConfig(baseConfig({ symbols: ['x' as never] }));
    expect(badSymbolShape.ok).toBe(false);
  });
});

describe('parseScadaConfig', () => {
  it('should parse a JSON string', () => {
    const config = parseScadaConfig(JSON.stringify(baseConfig()));
    expect(config.version).toBe(1);
    expect(config.symbols).toHaveLength(2);
  });

  it('should throw an error signal for invalid JSON strings', () => {
    expect(() => parseScadaConfig('{not json')).toThrow(/invalid scada config JSON/);
  });

  it('should pass through non-object JSON values unchanged', () => {
    expect(parseScadaConfig('null')).toBeNull();
    expect(parseScadaConfig('[1, 2]')).toEqual([1, 2]);
  });

  it('should shallow-copy object input to defend against external mutation', () => {
    const source = baseConfig();
    const parsed = parseScadaConfig(source);
    expect(parsed).not.toBe(source);
    expect(parsed.symbols).not.toBe(source.symbols);
    parsed.symbols.push(rect('extra'));
    expect(source.symbols).toHaveLength(2);
  });
});

describe('serializeScadaConfig', () => {
  it('should serialize with a fixed version of 1', () => {
    const config = baseConfig();
    const text = serializeScadaConfig(config);
    expect(JSON.parse(text)).toEqual({ ...config, version: 1 });
  });

  it('should round-trip through parse', () => {
    const config = baseConfig({
      symbols: [rect('g', { type: 'scada-group', children: [rect('c', { fill: '#fff' })] })],
      variables: [{ id: 'v1', source: 'static', value: 42 }],
    });
    const parsed = parseScadaConfig(serializeScadaConfig(config));
    expect(parsed).toEqual(config);
  });
});

describe('diffScadaConfig', () => {
  it('should return empty diff for identical configs', () => {
    const config = baseConfig();
    const diff = diffScadaConfig(config, baseConfig());
    expect(diff).toEqual({ added: [], removed: [], updated: [] });
  });

  it('should converge symbol additions/removals/property changes', () => {
    const prev = baseConfig({ symbols: [rect('a'), rect('b'), rect('c')] });
    const next = baseConfig({
      symbols: [rect('a', { fill: '#111' }), rect('b'), rect('d')],
    });
    const diff = diffScadaConfig(prev, next);
    expect(diff.added.map((n) => n.id)).toEqual(['d']);
    expect(diff.removed).toEqual(['c']);
    expect(diff.updated).toEqual([{ id: 'a', patch: { fill: '#111' } }]);
  });

  it('should treat nested children changes as an updated patch carrying the new children', () => {
    const prev = baseConfig({ symbols: [rect('g', { type: 'scada-group', children: [rect('c1')] })] });
    const next = baseConfig({ symbols: [rect('g', { type: 'scada-group', children: [rect('c1'), rect('c2')] })] });
    const diff = diffScadaConfig(prev, next);
    expect(diff.updated).toHaveLength(1);
    expect(diff.updated[0]!.patch.children?.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('should diff variables only when changed', () => {
    const prev = baseConfig({ variables: [{ id: 'v1', source: 'static', value: 1 }] });
    const next = baseConfig({ variables: [{ id: 'v1', source: 'static', value: 2 }, { id: 'v2', source: 'flux', flux: '$x' }] });
    const diff = diffScadaConfig(prev, next);
    expect(diff.variables).toEqual({
      added: [{ id: 'v2', source: 'flux', flux: '$x' }],
      removed: [],
      updated: [{ id: 'v1', patch: { value: 2 } }],
    });
    const same = diffScadaConfig(next, { ...next });
    expect(same.variables).toBeUndefined();
  });

  it('should report variable removals and null-branch diffs', () => {
    const withVars = baseConfig({ variables: [{ id: 'gone', source: 'static', value: 1 }] });
    const without = diffScadaConfig(withVars, baseConfig());
    expect(without.variables).toEqual({ added: [], removed: ['gone'], updated: [] });
    const gained = diffScadaConfig(baseConfig(), withVars);
    expect(gained.variables).toEqual({ added: [{ id: 'gone', source: 'static', value: 1 }], removed: [], updated: [] });
  });
});
