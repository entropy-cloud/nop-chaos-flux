import { describe, expect, it } from 'vitest';
import type { NodeTypeConfig } from '@nop-chaos/flow-designer-core';
import { filterPaletteGroups, matchesPaletteQuery } from './designer-palette-filter.js';

function nodeType(id: string, label: string, description?: string): NodeTypeConfig {
  return { id, label, description } as NodeTypeConfig;
}

const nodeTypesById = new Map<string, NodeTypeConfig>([
  ['task', nodeType('task', '任务节点', '执行一个异步任务')],
  ['approval', nodeType('approval', '审批节点', '人工审批')],
  ['end', nodeType('end', '结束', undefined)],
]);

const groups = [
  { id: 'basic', label: '基础', nodeTypes: ['task', 'end'] },
  { id: 'logic', label: '逻辑', nodeTypes: ['approval'] },
];

describe('matchesPaletteQuery', () => {
  it('empty query matches everything', () => {
    expect(matchesPaletteQuery(nodeTypesById.get('task'), '')).toBe(true);
    expect(matchesPaletteQuery(nodeTypesById.get('task'), '   ')).toBe(true);
    expect(matchesPaletteQuery(undefined, '')).toBe(true);
  });

  it('matches by label case-insensitively', () => {
    expect(matchesPaletteQuery(nodeTypesById.get('task'), '任务')).toBe(true);
    expect(matchesPaletteQuery(nodeType('task', 'Task Node'), 'task')).toBe(true);
  });

  it('matches by description only', () => {
    expect(matchesPaletteQuery(nodeTypesById.get('approval'), '人工')).toBe(true);
    expect(matchesPaletteQuery(nodeTypesById.get('end'), '人工')).toBe(false);
  });

  it('misses unknown types for non-empty query', () => {
    expect(matchesPaletteQuery(undefined, 'task')).toBe(false);
  });
});

describe('filterPaletteGroups', () => {
  it('returns non-empty groups unchanged for empty query', () => {
    expect(filterPaletteGroups(groups, nodeTypesById, '')).toEqual(groups);
  });

  it('keeps only groups with matching node types', () => {
    const result = filterPaletteGroups(groups, nodeTypesById, '审批');
    expect(result).toEqual([{ id: 'logic', label: '逻辑', nodeTypes: ['approval'] }]);
  });

  it('filters node ids within a group', () => {
    const result = filterPaletteGroups(groups, nodeTypesById, 'end');
    expect(result).toEqual([{ id: 'basic', label: '基础', nodeTypes: ['end'] }]);
  });

  it('returns no groups when nothing matches', () => {
    expect(filterPaletteGroups(groups, nodeTypesById, '不存在')).toEqual([]);
  });
});
