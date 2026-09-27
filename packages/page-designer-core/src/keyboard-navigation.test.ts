/**
 * 键盘漫游导航索引测试（S4-1）：前序行序与结构树一致、四向移动语义、
 * 越界/叶子/未知节点返回 null、未选中 ArrowDown 选中首行。
 */

import { createRendererRegistry } from '@nop-chaos/flux-core';
import type { RendererDefinition, RendererRegistry } from '@nop-chaos/flux-core';
import { describe, expect, it } from 'vitest';
import { createSeededRandom, injectSessionIds } from './round-trip.js';
import { buildKeyboardNavRows, resolveKeyboardMove } from './keyboard-navigation.js';
import type { SchemaInput } from '@nop-chaos/flux-core';

function def(partial: Partial<RendererDefinition> & { type: string }): RendererDefinition {
  return { component: () => null, ...partial } as unknown as RendererDefinition;
}

function buildRegistry(): RendererRegistry {
  const registry = createRendererRegistry();
  for (const definition of [
    def({
      type: 'page',
      defaultSchema: { type: 'page', body: [] },
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    }),
    def({
      type: 'container',
      defaultSchema: { type: 'container', body: [] },
      fields: [{ key: 'body', kind: 'region', regionKey: 'body' }],
    }),
    def({ type: 'text', defaultSchema: { type: 'text' } }),
    def({ type: 'domain-widget', rendererClass: 'domain-host-renderer', defaultSchema: { type: 'domain-widget' } }),
  ]) {
    registry.register(definition);
  }
  return registry;
}

function seedDoc(): SchemaInput {
  return injectSessionIds(
    {
      type: 'page',
      body: [
        { type: 'container', body: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }] },
        { type: 'text', text: 'c' },
      ],
    },
    createSeededRandom(7),
  ) as SchemaInput;
}

describe('buildKeyboardNavRows', () => {
  it('walks pre-order with depths, expanding containers and skipping opaque-leaf subtrees', () => {
    const registry = buildRegistry();
    const doc = injectSessionIds(
      {
        type: 'page',
        body: [
          { type: 'domain-widget', nested: [{ type: 'text', text: 'hidden' }] },
          { type: 'text', text: 'visible' },
        ],
      },
      createSeededRandom(11),
    ) as SchemaInput;
    const rows = buildKeyboardNavRows(doc, registry);
    expect(rows.map((row) => row.type)).toEqual(['page', 'domain-widget', 'text']);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 1]);
  });

  it('matches structure-tree order for nested containers', () => {
    const registry = buildRegistry();
    const rows = buildKeyboardNavRows(seedDoc(), registry);
    expect(rows.map((row) => row.type)).toEqual(['page', 'container', 'text', 'text', 'text']);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 2, 2, 1]);
  });
});

describe('resolveKeyboardMove', () => {
  const registry = buildRegistry();
  const rows = buildKeyboardNavRows(seedDoc(), registry);
  const [page, container, textA, , textC] = rows.map((row) => row.sid);

  it('moves up/down through siblings and across levels', () => {
    expect(resolveKeyboardMove(rows, page, 'ArrowDown')).toBe(container);
    expect(resolveKeyboardMove(rows, container, 'ArrowDown')).toBe(textA);
    expect(resolveKeyboardMove(rows, textA, 'ArrowUp')).toBe(container);
    expect(resolveKeyboardMove(rows, page, 'ArrowUp')).toBeNull();
    expect(resolveKeyboardMove(rows, textC, 'ArrowDown')).toBeNull();
  });

  it('moves left to nearest ancestor and right to first child', () => {
    expect(resolveKeyboardMove(rows, textA, 'ArrowLeft')).toBe(container);
    expect(resolveKeyboardMove(rows, textC, 'ArrowLeft')).toBe(page);
    expect(resolveKeyboardMove(rows, page, 'ArrowLeft')).toBeNull();
    expect(resolveKeyboardMove(rows, container, 'ArrowRight')).toBe(textA);
    expect(resolveKeyboardMove(rows, page, 'ArrowRight')).toBe(container);
    expect(resolveKeyboardMove(rows, textA, 'ArrowRight')).toBeNull();
    expect(resolveKeyboardMove(rows, textC, 'ArrowRight')).toBeNull();
  });

  it('returns null for unknown current node and selects first row from empty selection', () => {
    expect(resolveKeyboardMove(rows, 'psid-missing', 'ArrowDown')).toBeNull();
    expect(resolveKeyboardMove(rows, null, 'ArrowDown')).toBe(rows[0].sid);
    expect(resolveKeyboardMove(rows, null, 'ArrowUp')).toBeNull();
    expect(resolveKeyboardMove([], null, 'ArrowDown')).toBeNull();
  });
});
