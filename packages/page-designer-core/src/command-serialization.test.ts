/**
 * 命令序列化接口测试（S4-3 协作命令模型预留）：六命令 serialize ↔ deserialize
 * 往返相等、入站校验（kind 白名单/必填字段/schema 形状）、序列化产物 JSON-able。
 */

import { describe, expect, it } from 'vitest';
import type { DesignerTreeCommand } from './types.js';
import { deserializeCommand, serializeCommand } from './command-serialization.js';

const NODE = { type: 'input-text', name: 'a' };
const REGION_NODE = { type: 'container', body: [NODE] };

const COMMANDS: DesignerTreeCommand[] = [
  { kind: 'insertNode', parentId: 'psid-1', regionKey: 'body', node: NODE },
  { kind: 'insertNode', parentId: 'psid-1', regionKey: 'body', index: 2, node: REGION_NODE },
  { kind: 'removeNode', nodeId: 'psid-2' },
  { kind: 'moveNode', nodeId: 'psid-3', targetParentId: 'psid-1', targetRegionKey: 'body', index: 0 },
  { kind: 'updateProps', nodeId: 'psid-4', props: { label: 'Hi', count: 2, nested: { a: [1] } } },
  { kind: 'replaceRegion', nodeId: 'psid-5', regionKey: 'body', node: null },
  { kind: 'replaceRegion', nodeId: 'psid-5', regionKey: 'body', node: REGION_NODE },
  { kind: 'importDocument', doc: { type: 'page', body: [NODE] } },
  { kind: 'importDocument', doc: [NODE, { type: 'text', text: 'x' }] },
];

describe('serializeCommand', () => {
  it('produces JSON-able records keyed by kind', () => {
    const serialized = serializeCommand({ kind: 'insertNode', parentId: 'psid-1', regionKey: 'body', node: NODE });
    expect(serialized).toEqual({ kind: 'insertNode', parentId: 'psid-1', regionKey: 'body', node: NODE });
    expect(JSON.parse(JSON.stringify(serialized))).toEqual(serialized);
  });

  it('omits optional index when absent and keeps it when present', () => {
    const without = serializeCommand({ kind: 'insertNode', parentId: 'p', regionKey: 'body', node: NODE });
    expect('index' in without).toBe(false);
    const withIndex = serializeCommand({ kind: 'insertNode', parentId: 'p', regionKey: 'body', index: 3, node: NODE });
    expect(withIndex.index).toBe(3);
  });
});

describe('deserializeCommand round-trip', () => {
  it.each(COMMANDS.map((command, i) => [i, command] as const))('round-trips command #%i', (_i, command) => {
    const result = deserializeCommand(JSON.parse(JSON.stringify(serializeCommand(command))));
    expect(result).toEqual({ ok: true, command });
  });

  it('rejects non-object input', () => {
    expect(deserializeCommand(null)).toEqual({ ok: false, error: 'not-an-object' });
    expect(deserializeCommand('insertNode')).toEqual({ ok: false, error: 'not-an-object' });
    expect(deserializeCommand(42)).toEqual({ ok: false, error: 'not-an-object' });
  });

  it('rejects unknown kind', () => {
    expect(deserializeCommand({ kind: 'teleport' })).toEqual({ ok: false, error: 'unknown-kind' });
    expect(deserializeCommand({})).toEqual({ ok: false, error: 'unknown-kind' });
  });

  it('rejects insertNode with bad fields', () => {
    const base = { kind: 'insertNode', parentId: 'p', regionKey: 'body', node: NODE };
    expect(deserializeCommand({ ...base, parentId: '' })).toEqual({ ok: false, error: 'invalid-parent-id' });
    expect(deserializeCommand({ ...base, parentId: 1 })).toEqual({ ok: false, error: 'invalid-parent-id' });
    expect(deserializeCommand({ ...base, regionKey: '' })).toEqual({ ok: false, error: 'invalid-region-key' });
    expect(deserializeCommand({ ...base, index: 1.5 })).toEqual({ ok: false, error: 'invalid-index' });
    expect(deserializeCommand({ ...base, index: '2' })).toEqual({ ok: false, error: 'invalid-index' });
    expect(deserializeCommand({ ...base, node: { name: 'no-type' } })).toEqual({ ok: false, error: 'invalid-node' });
    expect(deserializeCommand({ ...base, node: 'text' })).toEqual({ ok: false, error: 'invalid-node' });
  });

  it('rejects moveNode / removeNode / updateProps with bad fields', () => {
    expect(deserializeCommand({ kind: 'removeNode', nodeId: '' })).toEqual({ ok: false, error: 'invalid-node-id' });
    expect(
      deserializeCommand({ kind: 'moveNode', nodeId: 'a', targetParentId: 'b', targetRegionKey: 'body' }),
    ).toEqual({ ok: false, error: 'invalid-index' });
    expect(
      deserializeCommand({ kind: 'moveNode', nodeId: 'a', targetParentId: '', targetRegionKey: 'body', index: 0 }),
    ).toEqual({ ok: false, error: 'invalid-parent-id' });
    expect(
      deserializeCommand({ kind: 'moveNode', nodeId: 'a', targetParentId: 'b', targetRegionKey: '', index: 0 }),
    ).toEqual({ ok: false, error: 'invalid-region-key' });
    expect(deserializeCommand({ kind: 'updateProps', nodeId: 'a', props: 'nope' })).toEqual({
      ok: false,
      error: 'invalid-props',
    });
    expect(deserializeCommand({ kind: 'updateProps', nodeId: 'a' })).toEqual({ ok: false, error: 'invalid-props' });
  });

  it('rejects replaceRegion with bad node but accepts null and arrays', () => {
    expect(
      deserializeCommand({ kind: 'replaceRegion', nodeId: 'a', regionKey: 'body', node: 5 }),
    ).toEqual({ ok: false, error: 'invalid-node' });
    expect(deserializeCommand({ kind: 'replaceRegion', nodeId: 'a', regionKey: 'body' })).toEqual({
      ok: true,
      command: { kind: 'replaceRegion', nodeId: 'a', regionKey: 'body', node: null },
    });
  });

  it('rejects importDocument with non-schema doc', () => {
    expect(deserializeCommand({ kind: 'importDocument', doc: { body: [] } })).toEqual({
      ok: false,
      error: 'invalid-doc',
    });
    expect(deserializeCommand({ kind: 'importDocument', doc: [{ type: 'page' }, 'nope'] })).toEqual({
      ok: false,
      error: 'invalid-doc',
    });
  });

  it('does not lose unknown props inside updateProps payload (forward-compat passthrough)', () => {
    const command: DesignerTreeCommand = {
      kind: 'updateProps',
      nodeId: 'psid-9',
      props: { 'xui:actions': { refresh: { action: 'ajax', args: { url: '/api' } } } },
    };
    const result = deserializeCommand(JSON.parse(JSON.stringify(serializeCommand(command))));
    expect(result).toEqual({ ok: true, command });
  });
});
