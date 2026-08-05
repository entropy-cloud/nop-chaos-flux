import { describe, expect, it } from 'vitest';
import { advanceSearchIndex, searchGraphNodes } from './graph-search.js';
import type { GraphNode } from './schemas.js';

const NODES: GraphNode[] = [
  { id: 'a', label: 'Model Call', type: 'model_call', level: 'info' },
  { id: 'b', label: 'Tool Call', type: 'tool_call', level: 'warning' },
  { id: 'c', label: 'Policy Violation', type: 'policy_call', level: 'error' },
  { id: 'd', label: 'Output', type: 'output', level: 'success' },
];

describe('searchGraphNodes', () => {
  it('matches substring against label (case-insensitive)', () => {
    expect(searchGraphNodes('call', NODES)).toEqual(['a', 'b', 'c']);
  });

  it('matches against type and level fields', () => {
    expect(searchGraphNodes('tool_call', NODES)).toEqual(['b']);
    expect(searchGraphNodes('warning', NODES)).toEqual(['b']);
    expect(searchGraphNodes('error', NODES)).toEqual(['c']);
  });

  it('empty or whitespace keyword returns no matches (clears search)', () => {
    expect(searchGraphNodes('', NODES)).toEqual([]);
    expect(searchGraphNodes('   ', NODES)).toEqual([]);
  });

  it('no match returns empty list', () => {
    expect(searchGraphNodes('nonexistent', NODES)).toEqual([]);
  });

  it('honors custom field names', () => {
    const custom = [{ id: 'x', title: 'Hello World' }];
    expect(searchGraphNodes('hello', custom, { labelField: 'title' })).toEqual(['x']);
    expect(searchGraphNodes('hello', custom)).toEqual([]);
  });
});

describe('advanceSearchIndex (循环索引)', () => {
  it('cycles forward and wraps to 0', () => {
    expect(advanceSearchIndex(0, 3, 1)).toBe(1);
    expect(advanceSearchIndex(2, 3, 1)).toBe(0);
  });

  it('cycles backward and wraps to last', () => {
    expect(advanceSearchIndex(1, 3, -1)).toBe(0);
    expect(advanceSearchIndex(0, 3, -1)).toBe(2);
  });

  it('returns -1 when there are no matches', () => {
    expect(advanceSearchIndex(0, 0, 1)).toBe(-1);
    expect(advanceSearchIndex(-1, 0, -1)).toBe(-1);
  });
});
