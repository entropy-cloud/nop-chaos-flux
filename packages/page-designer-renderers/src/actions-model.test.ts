/**
 * `xui:actions` 编排模型测试（S3-2）：record ↔ 行投影往返、未知类型保留标注、
 * extras/preservedEntries 保真、参数值 JSON 归一化、空名行丢弃、行位移边界。
 */

import { describe, expect, it } from 'vitest';
import {
  decodeArgValue,
  encodeArgValue,
  KNOWN_ACTION_TYPES,
  moveRow,
  nextActionName,
  parseActionsRecord,
  serializeActionsRecord,
} from './actions-model.js';

describe('KNOWN_ACTION_TYPES', () => {
  it('contains the canonical built-in action set', () => {
    for (const type of ['ajax', 'navigate', 'showToast', 'setValue', 'submitForm', 'openDialog']) {
      expect(KNOWN_ACTION_TYPES).toContain(type);
    }
    expect([...KNOWN_ACTION_TYPES]).toEqual([...KNOWN_ACTION_TYPES].sort());
  });
});

describe('parseActionsRecord / serializeActionsRecord', () => {
  it('round-trips rows with args and preserves extras', () => {
    const input = {
      greet: { action: 'showToast', args: { message: 'hi', duration: 300 }, when: '${x}' },
    };
    const model = parseActionsRecord(input);
    expect(model.rows).toHaveLength(1);
    expect(model.rows[0]).toMatchObject({ name: 'greet', actionType: 'showToast', known: true });
    expect(model.rows[0].args).toEqual([
      { key: 'message', value: 'hi' },
      { key: 'duration', value: '300' },
    ]);
    expect(model.rows[0].extras).toEqual({ when: '${x}' });
    expect(serializeActionsRecord(model)).toEqual(input);
  });

  it('flags unknown action types but keeps them (action-unknown-type path)', () => {
    const model = parseActionsRecord({ weird: { action: 'teleport', args: { to: 'moon' } } });
    expect(model.rows[0].known).toBe(false);
    expect(model.rows[0].actionType).toBe('teleport');
    expect(serializeActionsRecord(model)).toEqual({ weird: { action: 'teleport', args: { to: 'moon' } } });
  });

  it('keeps non-object entries and non-record values as-is', () => {
    const model = parseActionsRecord({ broken: 'not-an-object', ok: { action: 'ajax' } });
    expect(model.rows).toHaveLength(1);
    expect(model.preservedEntries).toEqual({ broken: 'not-an-object' });
    expect(serializeActionsRecord(model)).toEqual({ broken: 'not-an-object', ok: { action: 'ajax' } });

    const raw = parseActionsRecord('bogus');
    expect(raw.preservedRaw).toBe('bogus');
    expect(raw.rows).toEqual([]);
  });

  it('empty/absent input produces empty model; serialize drops empty xui:actions (null = remove key)', () => {
    expect(parseActionsRecord(undefined)).toEqual({ rows: [], preservedEntries: {} });
    expect(serializeActionsRecord(parseActionsRecord(undefined))).toBeNull();
    expect(serializeActionsRecord(parseActionsRecord({}))).toBeNull();
  });

  it('drops empty-name rows and empty args keys on write-back', () => {
    const model = parseActionsRecord({
      '': { action: 'ajax', args: { url: '/x' } },
      real: { action: 'ajax', args: { '': 1, url: '/y' } },
    });
    const out = serializeActionsRecord(model) as Record<string, { args?: Record<string, unknown> }>;
    expect('' in out).toBe(false);
    expect(out.real).toBeDefined();
    expect(out.real.args).toEqual({ url: '/y' });
  });

  it('omits args when no valid pairs remain', () => {
    const model = parseActionsRecord({ a: { action: 'ajax', args: { url: '/x' } } });
    model.rows[0].args = [];
    expect(serializeActionsRecord(model)).toEqual({ a: { action: 'ajax' } });
  });
});

describe('arg value codec', () => {
  it('normalizes JSON-parseable drafts and keeps plain strings raw', () => {
    expect(decodeArgValue('123')).toBe(123);
    expect(decodeArgValue('true')).toBe(true);
    expect(decodeArgValue('{"a":1}')).toEqual({ a: 1 });
    expect(decodeArgValue('hello')).toBe('hello');
    expect(decodeArgValue('${users.name}')).toBe('${users.name}');
    expect(decodeArgValue('')).toBe('');
    expect(decodeArgValue('  spaced  ')).toBe('  spaced  ');
  });

  it('encodes strings raw and structures as JSON', () => {
    expect(encodeArgValue('plain')).toBe('plain');
    expect(encodeArgValue(42)).toBe('42');
    expect(encodeArgValue({ a: [1] })).toBe('{"a":[1]}');
    expect(decodeArgValue(encodeArgValue({ a: [1] }))).toEqual({ a: [1] });
  });
});

describe('nextActionName / moveRow', () => {
  it('generates non-conflicting names', () => {
    expect(nextActionName([])).toBe('action1');
    expect(nextActionName([{ name: 'action1', actionType: 'ajax', known: true, args: [], extras: {} }])).toBe('action2');
    expect(
      nextActionName([
        { name: 'action1', actionType: 'ajax', known: true, args: [], extras: {} },
        { name: 'action2', actionType: 'ajax', known: true, args: [], extras: {} },
      ]),
    ).toBe('action3');
    expect(
      nextActionName([{ name: 'action2', actionType: 'ajax', known: true, args: [], extras: {} }]),
    ).toBe('action1');
  });

  it('moves rows within bounds and is a no-op outside', () => {
    const rows = [
      { name: 'a', actionType: 'ajax', known: true, args: [], extras: {} },
      { name: 'b', actionType: 'ajax', known: true, args: [], extras: {} },
      { name: 'c', actionType: 'ajax', known: true, args: [], extras: {} },
    ];
    expect(moveRow(rows, 0, 1).map((row) => row.name)).toEqual(['b', 'a', 'c']);
    expect(moveRow(rows, 2, -1).map((row) => row.name)).toEqual(['a', 'c', 'b']);
    expect(moveRow(rows, 0, -1).map((row) => row.name)).toEqual(['a', 'b', 'c']);
    expect(moveRow(rows, 2, 1).map((row) => row.name)).toEqual(['a', 'b', 'c']);
    expect(moveRow(rows, -1, 1)).toHaveLength(3);
    // 不可变：原数组不受影响。
    expect(rows.map((row) => row.name)).toEqual(['a', 'b', 'c']);
  });
});
