import { describe, it, expect } from 'vitest';
import type { ScadaConfig } from '../serialization/config-types.js';
import { cloneConfigSnapshot, collectAllSymbols, collectWorldBounds } from './editor-working-helpers.js';

const configWithCustom: ScadaConfig = {
  version: 1,
  variables: [],
  symbols: [
    {
      id: 'j1',
      type: 'scada-pipe-junction',
      x: 10,
      y: 20,
      width: 80,
      height: 40,
      custom: { connections: [{ id: 'c1', x: 0.5, y: 0.5, direction: 'out', target: 'dev' }] },
    },
    {
      id: 'g1',
      type: 'scada-group',
      x: 0,
      y: 0,
      children: [
        {
          id: 'j2',
          type: 'scada-pipe-junction',
          x: 5,
          y: 5,
          width: 10,
          height: 10,
          custom: { connections: [{ id: 'c2', x: 0.1, y: 0.2, direction: 'in' }] },
        },
      ],
    },
  ],
};

describe('cloneConfigSnapshot (plan HCA11 P2-1: extends P2 #4 custom deep-clone)', () => {
  it('deep-clones top-level symbol custom (in-place mutation of source does not leak into snapshot)', () => {
    const snapshot = cloneConfigSnapshot(configWithCustom);
    const sourceConn = (
      configWithCustom.symbols[0].custom as { connections: Array<{ x: number }> }
    ).connections;
    sourceConn[0].x = 0.99;
    const snapConn = (snapshot.symbols[0].custom as { connections: Array<{ x: number }> }).connections;
    expect(snapConn[0].x).toBe(0.5);
    expect(snapshot.symbols[0].custom).not.toBe(configWithCustom.symbols[0].custom);
  });

  it('deep-clones nested group-child custom (recursive custom isolation)', () => {
    const snapshot = cloneConfigSnapshot(configWithCustom);
    const sourceChildConn = (
      configWithCustom.symbols[1].children![0].custom as { connections: Array<{ x: number }> }
    ).connections;
    sourceChildConn[0].x = 0.77;
    const snapChildConn = (
      snapshot.symbols[1].children![0].custom as { connections: Array<{ x: number }> }
    ).connections;
    expect(snapChildConn[0].x).toBe(0.1);
    expect(snapshot.symbols[1].children![0].custom).not.toBe(
      configWithCustom.symbols[1].children![0].custom,
    );
  });

  it('preserves symbol identity independence (top-level symbols not shared by reference)', () => {
    const snapshot = cloneConfigSnapshot(configWithCustom);
    expect(snapshot.symbols).not.toBe(configWithCustom.symbols);
    expect(snapshot.symbols[0]).not.toBe(configWithCustom.symbols[0]);
    expect(snapshot.symbols[1].children).not.toBe(configWithCustom.symbols[1].children);
  });

  // plan 2026-08-08-1931-2 Phase 2 / F6：variables 深隔离——统一 clone 实现须加深 variables
  // （旧 cloneConfigSnapshot 仅 `[...config.variables]` 浅数组拷贝，共享 variable 对象引用）。
  it('deep-isolates variables entries (mutate snapshot.variables[0] does not flow back)', () => {
    const configWithVars: ScadaConfig = {
      version: 1,
      variables: [{ id: 'var1', source: 'static', value: 42 }],
      symbols: [{ id: 'r1', type: 'scada-rect', x: 0, y: 0, width: 10, height: 10 }],
    };
    const snapshot = cloneConfigSnapshot(configWithVars);
    expect(snapshot.variables).not.toBe(configWithVars.variables);
    expect(snapshot.variables![0]).not.toBe(configWithVars.variables![0]);
    snapshot.variables![0].value = 99;
    expect(configWithVars.variables![0].value).toBe(42);
  });

  // plan 2026-08-08-1931-2 Phase 2 / F6：version 保留原值（旧 editor-session.cloneConfig 硬编码 version:1）。
  it('preserves the original config.version (no hardcoded override)', () => {
    const config: ScadaConfig = {
      version: 1,
      variables: [],
      symbols: [],
    };
    const snapshot = cloneConfigSnapshot(config);
    expect(snapshot.version).toBe(config.version);
  });
});

describe('collectAllSymbols + collectWorldBounds (regression)', () => {
  it('collectAllSymbols recurses into group children', () => {
    const all = collectAllSymbols(configWithCustom.symbols);
    expect(all.map((n) => n.id).sort()).toEqual(['g1', 'j1', 'j2']);
  });

  it('collectWorldBounds accumulates parent offset for group children', () => {
    const bounds = collectWorldBounds(configWithCustom.symbols, 0, 0);
    const j2 = bounds.find((b) => b.id === 'j2');
    // j2 is child of g1 (x:0,y:0); j2 local (5,5) → world (5,5)
    expect(j2?.x).toBe(5);
    expect(j2?.y).toBe(5);
  });
});
