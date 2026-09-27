/**
 * xui:sid round-trip 测试矩阵（S1 §6.2：固定种子 PRNG + 变异算子集枚举）。
 *
 * INV-A fuzz 是 QA.6 的程序化验收载体：每算子 × 固定种子矩阵断言
 * `stripSessionIds(injectSessionIds(doc))` 与 `doc` 深相等且键序一致
 * （`JSON.stringify` 逐字节相等）。同时覆盖 INV-B（逐字保留）、INV-D（树内唯一）、
 * INV-E（剥离后零残留）。
 */

import { describe, expect, it } from 'vitest';
import {
  SESSION_ID_KEY,
  collectSessionIds,
  createSeededRandom,
  createSessionNodeId,
  getSessionId,
  injectSessionIds,
  isPlainObject,
  stripSessionIds,
  walkSchemaNodes,
} from './round-trip.js';
import { deepEqual } from './tree-patch.js';
import type { BaseSchema, SchemaInput } from '@nop-chaos/flux-core';
import type { SidRandom } from './round-trip.js';

const FUZZ_SEEDS = [1, 7, 42, 1337, 20260926];

function buildBaseDoc(): SchemaInput {
  return {
    type: 'page',
    title: ' fuzz "title" ~/ \\ ',
    body: [
      {
        type: 'container',
        direction: 'col',
        'xui:custom-flag': { nested: [1, 'two', null, true] },
        body: [
          { type: 'input-text', name: 'a', label: 'A', value: '${x}', disabled: false },
          { type: 'select', name: 'b', options: [{ label: 'x', value: 1 }] },
        ],
      },
      { type: 'form', title: 'f', body: [{ type: 'switch', name: 'on', value: true }] },
    ],
    header: { type: 'container', body: { type: 'input-number', name: 'n', value: 3.14 } },
    footer: null,
  } as unknown as SchemaInput;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** 收集变异算子（S1 §6.2 枚举），每算子返回 (doc 变异后的新文档, 描述)。 */
function buildMutators(): { name: string; mutate: (doc: SchemaInput) => SchemaInput }[] {
  return [
    {
      name: 'subtree-insert',
      mutate: (doc) => {
        const next = clone(doc) as Record<string, unknown>;
        const body = next.body as BaseSchema[];
        body.splice(1, 0, { type: 'textarea', name: 'ins', body: [{ type: 'input-text', name: 'deep' }] });
        return next as unknown as SchemaInput;
      },
    },
    {
      name: 'subtree-delete',
      mutate: (doc) => {
        const next = clone(doc) as Record<string, unknown>;
        (next.body as BaseSchema[]).splice(0, 1);
        return next as unknown as SchemaInput;
      },
    },
    {
      name: 'subtree-move',
      mutate: (doc) => {
        const next = clone(doc) as Record<string, unknown>;
        const body = next.body as BaseSchema[];
        const moved = body.shift() as BaseSchema;
        body.push(moved);
        return next as unknown as SchemaInput;
      },
    },
    {
      name: 'prop-value-mutate',
      mutate: (doc) => {
        const next = clone(doc) as Record<string, unknown>;
        const target = (next.body as BaseSchema[])[0] as Record<string, unknown>;
        target.direction = 'row';
        return next as unknown as SchemaInput;
      },
    },
    {
      name: 'unknown-key-inject',
      mutate: (doc) => {
        const next = clone(doc) as Record<string, unknown>;
        next['xui:unknown-just-for-test'] = { a: [1, 2, { b: 'c' }] };
        const form = (next.body as BaseSchema[])[1] as Record<string, unknown>;
        form['custom.key/with~tilde'] = 'keep me';
        return next as unknown as SchemaInput;
      },
    },
    {
      name: 'region-subtree-replace',
      mutate: (doc) => {
        const next = clone(doc) as Record<string, unknown>;
        next.header = { type: 'container', body: [{ type: 'input-text', name: 'replaced' }] };
        return next as unknown as SchemaInput;
      },
    },
    {
      name: 'xui-star-inject',
      mutate: (doc) => {
        const next = clone(doc) as Record<string, unknown>;
        next['xui:imports'] = [{ name: 'lib', type: 'script', src: 'https://example.test/lib.js' }];
        return next as unknown as SchemaInput;
      },
    },
    {
      name: 'deep-nesting',
      mutate: (doc) => {
        const next = clone(doc) as Record<string, unknown>;
        let current: Record<string, unknown> = { type: 'input-text', name: 'leaf' };
        for (let depth = 0; depth < 12; depth += 1) {
          current = { type: 'container', body: [current] };
        }
        (next.body as BaseSchema[]).push(current as unknown as BaseSchema);
        return next as unknown as SchemaInput;
      },
    },
    {
      name: 'root-array-form',
      mutate: () => [buildBaseDoc() as BaseSchema, { type: 'input-text', name: 'root2' }] as unknown as SchemaInput,
    },
  ];
}

describe('round-trip inject/strip', () => {
  it('inject assigns unique sids to every schema node (INV-D)', () => {
    const doc = buildBaseDoc();
    const injected = injectSessionIds(doc, createSeededRandom(42));
    const sids = collectSessionIds(injected);
    const nodeCount = walkSchemaNodes(injected).length;
    expect(sids.length).toBe(nodeCount);
    expect(sids.length).toBeGreaterThan(5);
    expect(new Set(sids).size).toBe(sids.length);
    for (const sid of sids) {
      expect(sid).toMatch(/^psid-[0-9a-z]{6}$/);
    }
  });

  it('inject only annotates schema nodes, never plain data objects (INV-B)', () => {
    const doc = {
      type: 'page',
      body: [{ type: 'select', name: 'b', options: [{ label: 'x', value: 1 }] }],
    } as unknown as SchemaInput;
    const injected = injectSessionIds(doc, createSeededRandom(1)) as Record<string, unknown>;
    const select = (injected.body as Record<string, unknown>[])[0];
    const option = (select.options as Record<string, unknown>[])[0];
    expect(getSessionId(select)).toBeDefined();
    expect(option[SESSION_ID_KEY]).toBeUndefined();
  });

  it('strip removes every sid with zero residue (INV-E)', () => {
    const injected = injectSessionIds(buildBaseDoc(), createSeededRandom(7));
    const stripped = stripSessionIds(injected);
    expect(JSON.stringify(stripped)).not.toContain(SESSION_ID_KEY);
  });

  it('inject re-assigns all sids (import sid-collision path)', () => {
    const first = injectSessionIds(buildBaseDoc(), createSeededRandom(1));
    const second = injectSessionIds(first, createSeededRandom(2));
    const before = collectSessionIds(first);
    const after = collectSessionIds(second);
    expect(before.length).toBe(after.length);
    for (const sid of after) {
      expect(before).not.toContain(sid);
    }
  });

  it('does not mutate the input document', () => {
    const doc = buildBaseDoc();
    const snapshot = JSON.stringify(doc);
    injectSessionIds(doc, createSeededRandom(3));
    stripSessionIds(doc);
    collectSessionIds(doc);
    walkSchemaNodes(doc);
    expect(JSON.stringify(doc)).toBe(snapshot);
  });

  it('INV-A fuzz matrix: operator x fixed seed, deep-equal and byte-identical key order', () => {
    for (const mutator of buildMutators()) {
      for (const seed of FUZZ_SEEDS) {
        const doc = mutator.mutate(buildBaseDoc());
        const injected = injectSessionIds(doc, createSeededRandom(seed));
        const exported = stripSessionIds(injected);
        expect(deepEqual(exported, doc), `${mutator.name}#${seed} deep-equal`).toBe(true);
        expect(JSON.stringify(exported), `${mutator.name}#${seed} key order`).toBe(JSON.stringify(doc));
      }
    }
  });

  it('INV-A holds for sid-bearing inputs after full re-injection', () => {
    const injectedOnce = injectSessionIds(buildBaseDoc(), createSeededRandom(5));
    const stripped = stripSessionIds(injectedOnce);
    // 剥离后（合法导出物）再次注入再剥离仍恒等。
    const roundAgain = stripSessionIds(injectSessionIds(stripped, createSeededRandom(6)));
    expect(JSON.stringify(roundAgain)).toBe(JSON.stringify(stripped));
  });

  it('isPlainObject excludes arrays and nulls', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject('x')).toBe(false);
  });

  it('createSessionNodeId retries when the generated id is taken (INV-D uniqueness)', () => {
    let call = 0;
    const rigged: SidRandom = () => {
      call += 1;
      // 前 6 位生成 'psid-000000'（已被占用），随后生成 'psid-zzzzzz'。
      return call <= 6 ? 0 : 0.99;
    };
    const id = createSessionNodeId(rigged, new Set(['psid-000000']));
    expect(id).toBe('psid-zzzzzz');
  });

  it('non-string sid values are ignored by the sid projection', () => {
    const doc = {
      type: 'page',
      'xui:sid': 42,
      body: [{ type: 'input-text', name: 'a', 'xui:sid': true }],
    } as unknown as SchemaInput;
    expect(collectSessionIds(doc)).toEqual([]);
    expect(getSessionId(doc)).toBeUndefined();
    const injected = injectSessionIds(doc, createSeededRandom(8)) as Record<string, unknown>;
    // 注入以新 sid 覆盖非 string 占位（re-assign 语义）。
    expect(typeof injected[SESSION_ID_KEY]).toBe('string');
  });

  it('strip preserves non-schema payloads untouched (INV-B user xui keys)', () => {
    const doc = {
      type: 'page',
      'xui:imports': [{ name: 'lib', type: 'script', src: 'x.js' }],
      meta: { 'xui:note': 'user asset', body: [{ type: 'input-text', name: 'a' }] },
    } as unknown as SchemaInput;
    const stripped = stripSessionIds(doc) as Record<string, unknown>;
    expect(stripped['xui:imports']).toEqual((doc as Record<string, unknown>)['xui:imports']);
    const meta = stripped.meta as Record<string, unknown>;
    expect(meta['xui:note']).toBe('user asset');
    // meta.body 内的 schema 节点会被剥离注入（此处从未注入，逐字还原）。
    expect(JSON.stringify(meta.body)).toBe(
      JSON.stringify((doc as Record<string, unknown>).meta && ((doc as Record<string, unknown>).meta as Record<string, unknown>).body),
    );
  });
});
