import type { GraphNode } from './schemas.js';

export interface GraphSearchOptions {
  labelField?: string;
  typeField?: string;
  levelField?: string;
}

export interface GraphSearchState {
  keyword: string;
  matchNodeIds: string[];
  currentIndex: number;
}

/**
 * 本地子串匹配（design §2.1-3 / §8.2）：对 label/type/level 三个字段做大小写不敏感子串匹配。
 * keyword 为空串 → 无匹配（等价于取消搜索态）。
 */
export function searchGraphNodes(
  keyword: string,
  nodes: GraphNode[],
  options: GraphSearchOptions = {},
): string[] {
  const labelField = options.labelField ?? 'label';
  const typeField = options.typeField ?? 'type';
  const levelField = options.levelField ?? 'level';

  const trimmed = keyword.trim();
  if (trimmed.length === 0) {
    return [];
  }
  const needle = trimmed.toLowerCase();

  const matches: string[] = [];
  for (const node of nodes) {
    const haystack = [node[labelField], node[typeField], node[levelField]]
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .toLowerCase();
    if (haystack.includes(needle)) {
      matches.push(node.id);
    }
  }
  return matches;
}

/**
 * 循环索引推进（Enter/Shift+Enter 循环跳转）：无匹配（count === 0）时返回 -1。
 */
export function advanceSearchIndex(currentIndex: number, count: number, step: number): number {
  if (count <= 0) {
    return -1;
  }
  const next = currentIndex + step;
  if (next < 0) {
    return count - 1;
  }
  if (next >= count) {
    return 0;
  }
  return next;
}
