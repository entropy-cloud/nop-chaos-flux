/**
 * palette-filter 测试矩阵（S1 §9.1 三条序贯规则 + registry 驱动清单）。
 */

import { createRendererRegistry } from '@nop-chaos/flux-core';
import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import { describe, expect, it } from 'vitest';
import { buildPaletteItems, evaluatePaletteEntry } from './palette-filter.js';
import type { PaletteStage } from './palette-filter.js';

function def(partial: Partial<RendererDefinition>): RendererDefinition {
  return { component: () => null, type: 'demo', ...partial } as unknown as RendererDefinition;
}

function buildRegistry(): RendererRegistry {
  const registry = createRendererRegistry();
  const definitions: RendererDefinition[] = [
    def({ type: 'flex', category: 'layout', displayName: 'Flex', defaultSchema: { type: 'flex', body: [] }, fields: [{ key: 'body', kind: 'region', regionKey: 'body' }] }),
    def({ type: 'input-text', category: 'form', displayName: 'Input', defaultSchema: { type: 'input-text' } }),
    def({ type: 'table', category: 'data', displayName: 'Table', defaultSchema: { type: 'table' } }),
    def({ type: 'chart', category: 'content', displayName: 'Chart', defaultSchema: { type: 'chart' } }),
    def({ type: 'alert', category: 'basic', displayName: 'Alert', defaultSchema: { type: 'alert' } }),
    def({ type: 'gantt', category: 'scheduling', displayName: 'Gantt', defaultSchema: { type: 'gantt' } }),
    def({ type: 'flow-canvas', category: 'layout', displayName: 'Flow', rendererClass: 'domain-host-renderer', defaultSchema: { type: 'flow-canvas' } }),
    def({ type: 'logic-switch', category: 'logic', displayName: 'Switch', defaultSchema: { type: 'logic-switch' } }),
    def({ type: 'bare', category: 'form', displayName: 'Bare' }),
  ];
  for (const definition of definitions) registry.register(definition);
  return registry;
}

describe('evaluatePaletteEntry 三条序贯规则', () => {
  it('rule 1: domain-host-renderer excluded with reason domain-host', () => {
    const verdict = evaluatePaletteEntry(def({ rendererClass: 'domain-host-renderer', defaultSchema: { type: 'x' } }), 's4-full');
    expect(verdict).toEqual({ include: false, reason: 'domain-host' });
  });

  it('rule 2: missing defaultSchema excluded with reason no-default-schema', () => {
    const verdict = evaluatePaletteEntry(def({ category: 'form' }), 's4-full');
    expect(verdict).toEqual({ include: false, reason: 'no-default-schema' });
  });

  it('rule 3: category outside stage whitelist excluded with reason category-not-in-stage', () => {
    expect(evaluatePaletteEntry(def({ category: 'data', defaultSchema: { type: 'x' } }), 's2-layout-form')).toEqual({
      include: false,
      reason: 'category-not-in-stage',
    });
    expect(evaluatePaletteEntry(def({ defaultSchema: { type: 'x' } }), 's2-layout-form')).toEqual({
      include: false,
      reason: 'category-not-in-stage',
    });
  });

  it('rules are sequential: domain-host wins over missing schema and stage', () => {
    const verdict = evaluatePaletteEntry(def({ rendererClass: 'domain-host-renderer' }), 's2-layout-form');
    expect(verdict.reason).toBe('domain-host');
  });

  it('s2 admits layout+form; s3 opens data/content/basic; s4 admits scheduling (full)', () => {
    expect(evaluatePaletteEntry(def({ category: 'layout', defaultSchema: {} }), 's2-layout-form').include).toBe(true);
    expect(evaluatePaletteEntry(def({ category: 'form', defaultSchema: {} }), 's2-layout-form').include).toBe(true);
    expect(evaluatePaletteEntry(def({ category: 'data', defaultSchema: {} }), 's3-plus-data').include).toBe(true);
    expect(evaluatePaletteEntry(def({ category: 'content', defaultSchema: {} }), 's3-plus-data').include).toBe(true);
    expect(evaluatePaletteEntry(def({ category: 'basic', defaultSchema: {} }), 's3-plus-data').include).toBe(true);
    expect(evaluatePaletteEntry(def({ category: 'scheduling', defaultSchema: {} }), 's3-plus-data').include).toBe(false);
    expect(evaluatePaletteEntry(def({ category: 'scheduling', defaultSchema: {} }), 's4-full').include).toBe(true);
    expect(evaluatePaletteEntry(def({ category: 'logic', defaultSchema: {} }), 's4-full').include).toBe(true);
  });
});

describe('buildPaletteItems（registry 驱动）', () => {
  it('s2 keeps layout+form atoms only; isContainer/isOpaqueLeaf derived', () => {
    const items = buildPaletteItems(buildRegistry(), 's2-layout-form');
    expect(items.map((item) => item.type)).toEqual(['flex', 'input-text']);
    const flex = items[0];
    expect(flex).toMatchObject({ displayName: 'Flex', group: 'layout', isContainer: true, isOpaqueLeaf: false });
    expect(items[1]).toMatchObject({ displayName: 'Input', isContainer: false });
  });

  it('s3/s4 open later families in registry order', () => {
    expect(buildPaletteItems(buildRegistry(), 's3-plus-data').map((item) => item.type)).toEqual([
      'flex',
      'input-text',
      'table',
      'chart',
      'alert',
    ]);
    expect(buildPaletteItems(buildRegistry(), 's4-full').map((item) => item.type)).toEqual([
      'flex',
      'input-text',
      'table',
      'chart',
      'alert',
      'gantt',
      'logic-switch',
    ]);
  });

  it('domain-host entries stay excluded without allowlist; allowlist admission forces leaf flags', () => {
    const without = buildPaletteItems(buildRegistry(), 's4-full');
    expect(without.map((item) => item.type)).not.toContain('flow-canvas');
    const withAllowlist = buildPaletteItems(buildRegistry(), 's4-full', { allowlist: ['flow-canvas'] });
    const flow = withAllowlist.find((item) => item.type === 'flow-canvas');
    expect(flow).toBeDefined();
    expect(flow?.isOpaqueLeaf).toBe(true);
  });

  it('allowlist cannot bypass no-default-schema or stage gating', () => {
    const items = buildPaletteItems(buildRegistry(), 's2-layout-form', { allowlist: ['bare', 'table', 'flow-canvas'] });
    // bare：无 defaultSchema（规则 2 不可覆盖）；table：s2 stage 排除（规则 3 不可覆盖）；
    // flow-canvas：domain-host（规则 1 可被 allowlist 覆盖，强制叶子）。
    expect(items.map((item) => item.type)).toEqual(['flex', 'input-text', 'flow-canvas']);
  });

  it('icon optional field only emitted when declared; missing category groups as other', () => {
    const registry = createRendererRegistry();
    registry.register(def({ type: 'with-icon', category: 'form', icon: 'zap', defaultSchema: {} }));
    registry.register(def({ type: 'no-icon', defaultSchema: {} }));
    const items = buildPaletteItems(registry, 's4-full');
    expect(items.find((item) => item.type === 'with-icon')?.icon).toBe('zap');
    expect(items.find((item) => item.type === 'no-icon')).not.toHaveProperty('icon');
    expect(items.find((item) => item.type === 'no-icon')?.group).toBe('other');
    expect(items.find((item) => item.type === 'no-icon')?.displayName).toBe('no-icon');
  });
});

describe('stage 类型面', () => {
  it('stage values are the S1 §9 product-phase parameter set', () => {
    const stages: PaletteStage[] = ['s2-layout-form', 's3-plus-data', 's4-full'];
    for (const stage of stages) {
      expect(evaluatePaletteEntry(def({ category: 'layout', defaultSchema: {} }), stage).include).toBe(true);
    }
  });
});
