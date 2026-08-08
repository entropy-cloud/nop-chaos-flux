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

  // plan 2026-08-08-1931-2 Phase 1 / F5：非纯对象 input 不再返回类型谎言（cast 为 ScadaConfig），
  // 改为 fail-closed 抛 `scada config must be an object`（与 validate 广度对齐）。
  // 旧实现 shallowCopy 对 null/array/原始值直接 cast 返回（签名承诺 ScadaConfig 即类型谎言）。
  it('throws for non-object JSON values (fail-closed, no type-lie cast)', () => {
    expect(() => parseScadaConfig('null')).toThrow(/scada config must be an object/);
    expect(() => parseScadaConfig('[1, 2]')).toThrow(/scada config must be an object/);
  });

  it('throws for non-object input bypassing the type signature at runtime', () => {
    expect(() => parseScadaConfig(42 as unknown as object)).toThrow(/scada config must be an object/);
    expect(() => parseScadaConfig(null as unknown as object)).toThrow(/scada config must be an object/);
    expect(() => parseScadaConfig([1, 2] as unknown as object)).toThrow(/scada config must be an object/);
  });

  // plan 2026-08-08-1931-2 Phase 1 / F5：object 分支深隔离——与调用方不共享嵌套引用。
  // 旧实现 shallowCopy 只复制顶层 + symbols/variables 数组外壳，元素引用共享 → mutate symbols[0] 回流。
  it('deep-isolates object input so nested mutations do not flow back to the source', () => {
    const source = baseConfig();
    const parsed = parseScadaConfig(source);
    expect(parsed).not.toBe(source);
    expect(parsed.symbols).not.toBe(source.symbols);
    // 顶层数组隔离
    parsed.symbols.push(rect('extra'));
    expect(source.symbols).toHaveLength(2);
    // 嵌套节点深隔离（F5 核心：mutate symbols[0] 不回流）
    parsed.symbols.splice(1, 1);
    parsed.symbols[0].x = 999;
    expect(source.symbols[0].x).toBe(0);
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
