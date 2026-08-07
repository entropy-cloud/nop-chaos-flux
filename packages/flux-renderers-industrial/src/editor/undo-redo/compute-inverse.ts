import type {
  ScadaConfig,
  ScadaConfigDiff,
  ScadaPointDeclaration,
  ScadaSymbolNode,
  ScadaVariablesDiff,
} from '../../serialization/config-types.js';

/**
 * `computeInverse(forward, prevSnapshot)` —— push 时预计算逆 diff（design-undo-redo.md §4.1.1）。
 *
 * 逆 diff 规则（每条增量，无全量快照需求，R4 内存约束）：
 * - forward.added（新增节点）→ inverse.removed（删除这些 id）
 * - forward.removed（删除 id 列表）→ inverse.added（恢复原节点，从 prevSnapshot 一次性提取）
 * - forward.updated（id + patch）→ inverse.updated（id + 反推原值 patch，从 prevSnapshot 一次性提取原值）
 * - forward.variables 同规则
 *
 * 调用时机：push 入栈时（prevSnapshot 可用）。返回后 prevSnapshot 不再被引用，
 * 栈元素只持有 forward + inverse 两条增量 diff（R4 内存约束）。
 *
 * 纯逻辑（无 React / leafer 依赖），Vitest 单测先行。
 */

/**
 * 在 prevSnapshot 中按 id 查找节点（含 group 子树）。
 *
 * 复用 ConfigAdapter.nodeById O(1) 模式（design-undo-redo.md §4.1.1 关键约束 2）——
 * 编辑器域 computeInverse 在 push 时构建一次性 nodeById 索引（O(n) 构建 + O(1) 查询），
 * 调用结束随局部变量回收，不进栈持久化。
 */
export function findNodeForInverse(snapshot: ScadaConfig, id: string): ScadaSymbolNode | undefined {
  return findNodeById(snapshot.symbols, id);
}

function findNodeById(nodes: ScadaSymbolNode[], id: string): ScadaSymbolNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * 计算一条 ScadaConfigDiff 的逆 diff（design-undo-redo.md §4.1.1）。
 *
 * @param forward 编辑操作产出的 forward diff
 * @param prevSnapshot push 时的 working copy 全量（仅本次调用期间引用，调用结束即可丢弃）
 * @returns 与 forward 配对的增量逆 diff（存入栈后 prevSnapshot 不再被栈引用，R4）
 */
export function computeInverse(forward: ScadaConfigDiff, prevSnapshot: ScadaConfig): ScadaConfigDiff {
  const inverse: ScadaConfigDiff = { added: [], removed: [], updated: [] };

  // 逆 added = removed（删除新增的节点；只存 id 列表，不存全量节点）
  inverse.removed = forward.added.map((node) => node.id);

  // 逆 removed = added（恢复被删除的节点；从 prevSnapshot 一次性提取原节点）
  for (const id of forward.removed) {
    const prevNode = findNodeForInverse(prevSnapshot, id);
    if (prevNode) inverse.added.push(prevNode);
  }

  // 逆 updated = updated（反推原值 patch；从 prevSnapshot 一次性提取被 patch 字段的原始值）
  for (const update of forward.updated) {
    const prevNode = findNodeForInverse(prevSnapshot, update.id);
    if (prevNode) {
      const inversePatch: Record<string, unknown> = {};
      const prevRecord = prevNode as unknown as Record<string, unknown>;
      for (const key of Object.keys(update.patch)) {
        inversePatch[key] = prevRecord[key];
      }
      inverse.updated.push({ id: update.id, patch: inversePatch as Partial<ScadaSymbolNode> });
    }
  }

  // variables 逆 diff（同规则，从 prevSnapshot.variables 一次性提取原值）
  if (forward.variables) {
    inverse.variables = computeVariablesInverse(forward.variables, prevSnapshot);
  }

  return inverse;
}

function computeVariablesInverse(forward: ScadaVariablesDiff, prevSnapshot: ScadaConfig): ScadaVariablesDiff {
  const inverse: ScadaVariablesDiff = { added: [], removed: [], updated: [] };

  inverse.removed = forward.added.map((decl) => decl.id);

  const prevVars = prevSnapshot.variables ?? [];
  const prevVarById = new Map(prevVars.map((decl) => [decl.id, decl]));

  for (const id of forward.removed) {
    const prevDecl = prevVarById.get(id);
    if (prevDecl) inverse.added.push(prevDecl);
  }

  for (const update of forward.updated) {
    const prevDecl = prevVarById.get(update.id);
    if (prevDecl) {
      const inversePatch: Record<string, unknown> = {};
      const prevRecord = prevDecl as unknown as Record<string, unknown>;
      for (const key of Object.keys(update.patch)) {
        inversePatch[key] = prevRecord[key];
      }
      inverse.updated.push({ id: update.id, patch: inversePatch as Partial<ScadaPointDeclaration> });
    }
  }

  return inverse;
}

/**
 * 将一条 diff 应用到 config（返回新 config；用于 forward/inverse apply）。
 *
 * 编辑器域工具（runtime applyDiff 应用到 leafer 树；编辑会话域 applyDiffToConfig 应用到 working copy 数据）。
 * applied 顺序 removed → added → updated（与 runtime config-adapter applyDiff 一致）。
 */
export function applyDiffToConfig(config: ScadaConfig, diff: ScadaConfigDiff): ScadaConfig {
  const removed = new Set(diff.removed);
  const next: ScadaConfig = {
    ...config,
    symbols: removeNodes(config.symbols, removed),
  };
  // added
  if (diff.added.length > 0) {
    next.symbols = [...next.symbols, ...diff.added.map((n) => ({ ...n }))];
  }
  // updated
  if (diff.updated.length > 0) {
    next.symbols = applyUpdates(next.symbols, diff.updated);
  }
  // variables
  if (diff.variables) {
    next.variables = applyVariablesDiff(config.variables ?? [], diff.variables);
  }
  return next;
}

function removeNodes(symbols: ScadaSymbolNode[], removed: Set<string>): ScadaSymbolNode[] {
  const out: ScadaSymbolNode[] = [];
  for (const node of symbols) {
    if (removed.has(node.id)) continue;
    if (node.children) {
      const filteredChildren = removeNodes(node.children, removed);
      out.push({ ...node, children: filteredChildren });
    } else {
      out.push({ ...node });
    }
  }
  return out;
}

function applyUpdates(symbols: ScadaSymbolNode[], updates: Array<{ id: string; patch: Partial<ScadaSymbolNode> }>): ScadaSymbolNode[] {
  const patchById = new Map(updates.map((u) => [u.id, u.patch]));
  const apply = (nodes: ScadaSymbolNode[]): ScadaSymbolNode[] =>
    nodes.map((node) => {
      const patch = patchById.get(node.id);
      if (patch) {
        return { ...node, ...patch };
      }
      if (node.children) {
        return { ...node, children: apply(node.children) };
      }
      return { ...node };
    });
  return apply(symbols);
}

function applyVariablesDiff(existing: ScadaPointDeclaration[], diff: ScadaVariablesDiff): ScadaPointDeclaration[] {
  const removed = new Set(diff.removed);
  let out = existing.filter((decl) => !removed.has(decl.id)).map((decl) => ({ ...decl }));
  if (diff.added.length > 0) {
    out = [...out, ...diff.added.map((decl) => ({ ...decl }))];
  }
  if (diff.updated.length > 0) {
    const patchById = new Map(diff.updated.map((u) => [u.id, u.patch]));
    out = out.map((decl) => {
      const patch = patchById.get(decl.id);
      return patch ? { ...decl, ...patch } : decl;
    });
  }
  return out;
}
