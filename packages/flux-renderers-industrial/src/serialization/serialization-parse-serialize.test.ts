import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerBuiltinScadaSymbols } from '../symbols/register-builtin.js';
import { parseScadaConfig } from './parse.js';
import { serializeScadaConfig } from './serialize.js';
import { rect, baseConfig } from './serialization-fixtures.js';
import type { ScadaConfig } from './config-types.js';

vi.mock('leafer-ui', () => import('../test-support/leafer-ui-mock.js'));

beforeEach(() => {
  registerBuiltinScadaSymbols();
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
  it('should serialize with a fixed version of 1 (instance override sets, I8.3)', () => {
    const config = baseConfig();
    const text = serializeScadaConfig(config);
    const parsed = JSON.parse(text) as ScadaConfig;
    expect(parsed.version).toBe(1);
    // 实例覆盖集最小化：与 defaults 相等的字段裁剪，仅保留覆盖集
    expect(parsed.symbols[0]).toEqual({ id: 'a', type: 'scada-rect' });
    expect(parsed.symbols[1]).toEqual({ id: 'b', type: 'scada-rect', x: 10, y: 20 });
  });

  it('should output instance override sets diffed from defaults (I8.3 minimal coverage set)', () => {
    const config = baseConfig({
      symbols: [rect('a'), rect('b', { x: 10, y: 20, width: 99 })],
    });
    const parsed = JSON.parse(serializeScadaConfig(config)) as ScadaConfig;
    // 与 defaults 相等的字段（x/y/width/height）被裁剪，只保留覆盖集
    expect(parsed.symbols[0]).toEqual({ id: 'a', type: 'scada-rect' });
    expect(parsed.symbols[1]).toEqual({ id: 'b', type: 'scada-rect', x: 10, y: 20, width: 99 });
  });

  it('should round-trip through parse (group children keep override sets)', () => {
    const config = baseConfig({
      symbols: [
        rect('g', {
          type: 'scada-group',
          children: [rect('c', { fill: '#fff', width: 55 })],
        }),
      ],
      variables: [{ id: 'v1', source: 'static', value: 42 }],
    });
    const parsed = parseScadaConfig(serializeScadaConfig(config));
    expect(parsed.symbols[0]).toEqual({
      id: 'g',
      type: 'scada-group',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      children: [{ id: 'c', type: 'scada-rect', width: 55, fill: '#fff' }],
    });
    expect(parsed.variables).toEqual([{ id: 'v1', source: 'static', value: 42 }]);
  });

  it('pruneInstanceNode returns node as-is for unregistered types without defaults/children', () => {
    // 未注册 type 或无 defaults 的节点：children 不存在时直接返回 node（不走 diff 路径，
    // serialize.ts:21 false 分支）。验证 serialize 不破坏未注册图元原貌。
    const config: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [{ id: 'x', type: 'scada-totally-unregistered', x: 5 } as unknown as ScadaConfig['symbols'][number]],
    };
    const parsed = JSON.parse(serializeScadaConfig(config)) as ScadaConfig;
    expect(parsed.symbols[0]).toEqual({ id: 'x', type: 'scada-totally-unregistered', x: 5 });
  });
});
