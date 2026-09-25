import { describe, expect, it } from 'vitest';
import {
  filterLocalOptions,
  isNodeSelectable,
  isNodeTypeSelectable,
  mergeNodesById,
  normalizeOrgNode,
  normalizeOrgNodes,
  parseOrgNodePage,
  resolveExtraParams,
  shouldStopPaging,
} from '../renderers/org/org-data-protocol.js';

describe('normalizeOrgNode (protocol §3.1)', () => {
  it('normalizes the canonical shape with type/disabled/disabledTip/leaf/children', () => {
    const node = normalizeOrgNode({
      id: 'u1',
      name: 'Alice',
      type: 'user',
      disabled: true,
      disabledTip: 'resigned',
      leaf: true,
      children: [],
    });
    expect(node).toEqual({
      id: 'u1',
      name: 'Alice',
      type: 'user',
      disabled: true,
      disabledTip: 'resigned',
      leaf: true,
    });
  });

  it('accepts label/value aliases when canonical fields are absent', () => {
    expect(normalizeOrgNode({ value: 'd2', label: 'Engineering' })).toEqual({
      id: 'd2',
      name: 'Engineering',
    });
  });

  it('prefers canonical fields over aliases and falls back id↔name', () => {
    expect(normalizeOrgNode({ id: 'a', value: 'b', name: 'N', label: 'L' })?.id).toBe('a');
    expect(normalizeOrgNode({ value: 'b', name: 'N', label: 'L' })?.name).toBe('N');
    expect(normalizeOrgNode({ name: 'OnlyName' })).toEqual({ id: 'OnlyName', name: 'OnlyName' });
    expect(normalizeOrgNode({ id: 42 })).toEqual({ id: '42', name: '42' });
  });

  it('drops entries with neither id/value nor name/label and non-object entries', () => {
    expect(normalizeOrgNode({})).toBeNull();
    expect(normalizeOrgNode(null)).toBeNull();
    expect(normalizeOrgNode('dept')).toBeNull();
    expect(normalizeOrgNode(42)).toBeNull();
  });

  it('treats disabled strictly (only === true) per ChoiceOption semantics', () => {
    expect(normalizeOrgNode({ id: 'x', name: 'X', disabled: 1 })?.disabled).toBeUndefined();
    expect(normalizeOrgNode({ id: 'x', name: 'X', disabled: 'true' })?.disabled).toBeUndefined();
    expect(normalizeOrgNode({ id: 'x', name: 'X', disabled: false })?.disabled).toBeUndefined();
    expect(normalizeOrgNode({ id: 'x', name: 'X', disabled: true })?.disabled).toBe(true);
  });

  it('collapses unknown fields into extra and keeps known keys out of it', () => {
    const node = normalizeOrgNode({ id: 'u1', name: 'A', avatar: 'a.png', title: 'CEO', type: 'user' });
    expect(node?.extra).toEqual({ avatar: 'a.png', title: 'CEO' });
    expect(Object.keys(node ?? {})).not.toContain('avatar');
  });

  it('recurses into children and drops invalid child entries; ignores non-array children', () => {
    const node = normalizeOrgNode({
      id: 'd1',
      name: 'D1',
      children: [{ id: 'd11', name: 'D11', extra: { x: 1 } }, null, 'garbage', {}],
    });
    expect(node?.children).toEqual([{ id: 'd11', name: 'D11', extra: { x: 1 } }]);
    expect(normalizeOrgNode({ id: 'd2', name: 'D2', children: 'nope' })?.children).toBeUndefined();
  });

  it('preserves a documented extra object and merges unknown fields into it', () => {
    expect(normalizeOrgNode({ id: 'e1', name: 'E1', extra: { keep: 1 }, other: 2 })?.extra).toEqual({
      keep: 1,
      other: 2,
    });
  });
});

describe('normalizeOrgNodes', () => {
  it('returns empty for non-array input and drops invalid entries', () => {
    expect(normalizeOrgNodes('nope')).toEqual([]);
    expect(normalizeOrgNodes([{ id: 'a', name: 'A' }, null, {}])).toEqual([{ id: 'a', name: 'A' }]);
  });
});

describe('parseOrgNodePage (protocol §4.2)', () => {
  it('accepts the canonical envelope with total/hasMore', () => {
    const page = parseOrgNodePage({ nodes: [{ id: 'a', name: 'A' }], total: 10, hasMore: true });
    expect(page).toEqual({ nodes: [{ id: 'a', name: 'A' }], total: 10, hasMore: true });
  });

  it('tolerates a top-level bare array as { nodes }', () => {
    expect(parseOrgNodePage([{ id: 'a', name: 'A' }])).toEqual({ nodes: [{ id: 'a', name: 'A' }] });
  });

  it('treats non-array nodes, missing nodes, and garbage as an empty result', () => {
    expect(parseOrgNodePage({ nodes: 'nope' })).toEqual({ nodes: [] });
    expect(parseOrgNodePage({ list: [] })).toEqual({ nodes: [] });
    expect(parseOrgNodePage(null)).toEqual({ nodes: [] });
    expect(parseOrgNodePage({ nodes: [{ id: 'a', name: 'A' }], total: 'many', hasMore: 1 })).toEqual({
      nodes: [{ id: 'a', name: 'A' }],
    });
  });
});

describe('shouldStopPaging (protocol §5)', () => {
  const node = (id: string) => ({ id, name: id });

  it('rule 1: explicit hasMore=false stops even with nodes present', () => {
    expect(
      shouldStopPaging({ page: { nodes: [node('a')], hasMore: false }, loadedCount: 1, knownIds: new Set() }),
    ).toBe(true);
  });

  it('rule 2: total reached stops when hasMore is absent', () => {
    expect(
      shouldStopPaging({ page: { nodes: [node('c')], total: 2 }, loadedCount: 2, knownIds: new Set(['a', 'b']) }),
    ).toBe(true);
    expect(
      shouldStopPaging({ page: { nodes: [node('c')], total: 5 }, loadedCount: 2, knownIds: new Set(['a', 'b']) }),
    ).toBe(false);
  });

  it('explicit hasMore=true wins over a reached total (rule 1 evaluated first)', () => {
    expect(
      shouldStopPaging({ page: { nodes: [node('c')], total: 2, hasMore: true }, loadedCount: 2, knownIds: new Set(['a', 'b']) }),
    ).toBe(false);
  });

  it('rule 3: an empty page always stops', () => {
    expect(shouldStopPaging({ page: { nodes: [], hasMore: true }, loadedCount: 3, knownIds: new Set() })).toBe(true);
  });

  it('rule 4: a fully-duplicated page stops (guard against looping servers)', () => {
    expect(
      shouldStopPaging({ page: { nodes: [node('a'), node('b')], hasMore: true }, loadedCount: 2, knownIds: new Set(['a', 'b']) }),
    ).toBe(true);
    expect(
      shouldStopPaging({ page: { nodes: [node('a'), node('c')], hasMore: true }, loadedCount: 2, knownIds: new Set(['a', 'b']) }),
    ).toBe(false);
  });
});

describe('filterLocalOptions (protocol §7 local search fallback)', () => {
  const options = [
    { id: '1', name: 'Engineering' },
    { id: '2', name: 'finance' },
    { id: '3', name: 'People Ops' },
  ];

  it('matches case-insensitively on name contains, trimming the query', () => {
    expect(filterLocalOptions(options, ' FIN ')).toEqual([{ id: '2', name: 'finance' }]);
    expect(filterLocalOptions(options, 'ing')).toEqual([{ id: '1', name: 'Engineering' }]);
  });

  it('returns everything for a blank query', () => {
    expect(filterLocalOptions(options, '  ')).toHaveLength(3);
  });
});

describe('mergeNodesById', () => {
  it('appends new nodes and lets incoming override existing ids', () => {
    const merged = mergeNodesById([{ id: 'a', name: 'A-old' }, { id: 'b', name: 'B' }], [
      { id: 'a', name: 'A-new' },
      { id: 'c', name: 'C' },
    ]);
    expect(merged).toEqual([
      { id: 'a', name: 'A-new' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ]);
  });
});

describe('isNodeSelectable (protocol §3 mixed-tree rule)', () => {
  it('disabled nodes are never selectable', () => {
    expect(isNodeSelectable({ id: 'x', name: 'X', disabled: true }, ['user'])).toBe(false);
  });

  it('empty selectableTypes means everything selectable', () => {
    expect(isNodeSelectable({ id: 'x', name: 'X', type: 'department' }, [])).toBe(true);
  });

  it('typed nodes filter by the selectable set; untyped nodes stay selectable', () => {
    expect(isNodeSelectable({ id: 'u', name: 'U', type: 'user' }, ['user'])).toBe(true);
    expect(isNodeSelectable({ id: 'd', name: 'D', type: 'department' }, ['user'])).toBe(false);
    expect(isNodeSelectable({ id: 'g', name: 'G' }, ['user'])).toBe(true);
  });
});

describe('resolveExtraParams (protocol §6)', () => {
  it('evaluates string values as expressions and passes non-strings through', () => {
    const resolved = resolveExtraParams(
      { corpId: '${tenantId}', scene: 'approval', limit: 20 },
      (target) => `evaluated:${String(target)}`,
    );
    expect(resolved).toEqual({
      corpId: 'evaluated:${tenantId}',
      scene: 'evaluated:approval',
      limit: 20,
    });
  });

  it('returns an empty patch for absent extraParams', () => {
    expect(resolveExtraParams(undefined, () => null)).toEqual({});
  });
});

describe('isNodeTypeSelectable vs isNodeSelectable', () => {
  it('type-level selectability ignores disabled; full check includes it', () => {
    const disabledUser = { id: 'u3', name: 'C', type: 'user', disabled: true };
    expect(isNodeTypeSelectable(disabledUser, ['user'])).toBe(true);
    expect(isNodeSelectable(disabledUser, ['user'])).toBe(false);
  });
});
