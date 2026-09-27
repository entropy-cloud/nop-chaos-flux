/**
 * 树命令执行器（design: docs/components/page-designer/design-architecture.md §7.2）。
 *
 * 树命令是 canvas/inspector/palette/JSON 视图的**唯一**写入口；命令内部完成
 * 「patch 生成 + sid 维护」，经 `session.dispatch` 落 `core.update`——事务外自动入栈
 * 1 条 undo 步；事务内（`core.beginTransaction` 之后）只改 working，由
 * `core.endTransaction` 收口为 1 条 undo 步（一拖拽/一次编辑会话 = 一步，粒度表见下）。
 *
 * 粒度表（S1 §7.2）：
 *
 * | 用户意图              | 命令/事务        | undo 步 |
 * | palette 落节点        | insertNode       | 1       |
 * | 删除节点（含子树）    | removeNode       | 1       |
 * | 画布拖拽移动          | 事务收口         | 1       |
 * | inspector 字段编辑    | 编辑会话事务收口 | 1       |
 * | region 子树替换       | replaceRegion    | 1       |
 * | JSON 整段粘贴         | importDocument   | 1       |
 * | 模板替换（S4）        | replaceRegion    | 1       |
 *
 * 栈深沿用 editor-core 缺省 `MAX_UNDO_STACK_DEPTH = 100`：每条命令只存受影响子树的
 * forward/inverse patch（R4 内存约束），不调大缺省值。
 *
 * sid 维护（S1 §6 / INV-D）：insertNode / replaceRegion 对新落子树整体重新注入新 sid
 * （复制即新 sid）；moveNode / updateProps / removeNode / undo/redo 不触碰既有 sid。
 */

import { isSchema } from '@nop-chaos/flux-core';
import type { BaseSchema, RendererRegistry, SchemaInput } from '@nop-chaos/flux-core';
import type { EditorCore } from '@nop-chaos/editor-core';
import { injectSessionIds, SESSION_ID_KEY } from './round-trip.js';
import type { SidRandom } from './round-trip.js';
import {
  getContainerKeys,
  getDropRegionKeys,
  getRegionForm,
  locateNode,
  rebuildAtLocation,
  removeAtLocation,
} from './tree-navigation.js';
import type { DesignerCommandResult, DesignerTreeCommand, JsonTreePatch } from './types.js';

export interface DesignerCommandContext {
  core: EditorCore<SchemaInput, JsonTreePatch[]>;
  registry: RendererRegistry;
  rng: SidRandom;
}

function fail(error: string): DesignerCommandResult {
  return { ok: false, error };
}

function isSchemaInput(value: unknown): value is SchemaInput {
  if (Array.isArray(value)) return value.every((item) => isSchema(item));
  return isSchema(value);
}

function readRootSid(node: BaseSchema | BaseSchema[]): string | undefined {
  return Array.isArray(node) ? (node[0] as Record<string, unknown>)[SESSION_ID_KEY] as string : (node as BaseSchema)[SESSION_ID_KEY] as string;
}

function applyInsertNode(
  doc: SchemaInput,
  command: Extract<DesignerTreeCommand, { kind: 'insertNode' }>,
  ctx: DesignerCommandContext,
): DesignerCommandResult {
  const location = locateNode(doc, command.parentId, ctx.registry);
  if (!location) return fail('unknown-parent');
  const parent = location.node;
  const dropRegions = getDropRegionKeys(ctx.registry.get(parent.type));
  if (!dropRegions.includes(command.regionKey)) return fail('invalid-region');
  if (getRegionForm(parent, command.regionKey) === 'single') return fail('invalid-target');
  if (!isSchemaInput(command.node)) return fail('invalid-node');

  const injected = injectSessionIds(command.node, ctx.rng) as BaseSchema | BaseSchema[];
  const nextDoc = rebuildAtLocation(doc, location, (node) => {
    const base = Array.isArray(node[command.regionKey]) ? [...(node[command.regionKey] as BaseSchema[])] : [];
    const at = command.index === undefined ? base.length : Math.max(0, Math.min(command.index, base.length));
    const items = Array.isArray(injected) ? [...injected] : [injected];
    base.splice(at, 0, ...items);
    return { ...node, [command.regionKey]: base };
  });
  ctx.core.update(() => nextDoc);
  return { ok: true, nodeId: readRootSid(injected) };
}

function applyRemoveNode(
  doc: SchemaInput,
  command: Extract<DesignerTreeCommand, { kind: 'removeNode' }>,
  ctx: DesignerCommandContext,
): DesignerCommandResult {
  const location = locateNode(doc, command.nodeId, ctx.registry);
  if (!location) return fail('unknown-node');
  if (location.frames.length === 0) return fail('invalid-target');
  const frame = location.frames[location.frames.length - 1];
  if (frame.kind === 'key') {
    // 单节点 region 容器：删除唯一子节点等价于移除该 region 键。
    if (!getContainerKeys(ctx.registry.get(frame.node.type)).includes(frame.key)) {
      return fail('invalid-target');
    }
  }
  const { doc: nextDoc } = removeAtLocation(doc, location);
  ctx.core.update(() => nextDoc);
  return { ok: true };
}

/** candidate 子树中是否包含 ancestorSid（拖入自身子树是非法落点）。 */
function subtreeHasSid(candidate: unknown, sid: string): boolean {
  const stack: unknown[] = [candidate];
  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      stack.push(...current);
    } else if (isSchema(current)) {
      if (current[SESSION_ID_KEY] === sid) return true;
      stack.push(...Object.keys(current).map((key) => current[key]));
    }
  }
  return false;
}

function applyMoveNode(
  doc: SchemaInput,
  command: Extract<DesignerTreeCommand, { kind: 'moveNode' }>,
  ctx: DesignerCommandContext,
): DesignerCommandResult {
  const source = locateNode(doc, command.nodeId, ctx.registry);
  if (!source) return fail('unknown-node');
  if (source.frames.length === 0) return fail('invalid-target');
  const target = locateNode(doc, command.targetParentId, ctx.registry);
  if (!target) return fail('unknown-parent');
  const targetParent = target.node;
  if (!getDropRegionKeys(ctx.registry.get(targetParent.type)).includes(command.targetRegionKey)) {
    return fail('invalid-region');
  }
  if (getRegionForm(targetParent, command.targetRegionKey) === 'single') return fail('invalid-target');
  // 目标父节点在被移动节点的子树内 = 拖入自身子树，非法落点。
  if (subtreeHasSid(source.node, command.targetParentId)) return fail('invalid-target');

  const sourceFrame = source.frames[source.frames.length - 1];
  const sourceArray = sourceFrame.kind === 'array' ? sourceFrame.items : null;
  const targetRegionValue: unknown = targetParent[command.targetRegionKey];
  // 源数组即目标数组（同 region 内位移）：remove 后下标偏移需归一化。
  const sameArray = sourceArray !== null && targetRegionValue === sourceArray;

  const { doc: removedDoc, removed } = removeAtLocation(doc, source);
  // 不变式：targetParent 不在 source 子树内（上方 subtreeHasSid 守卫），
  // 因此 source 的删除不可能移除 targetParent——removedDoc 中必然仍可定位。
  const targetInRemoved = locateNode(removedDoc, command.targetParentId, ctx.registry) as NonNullable<
    ReturnType<typeof locateNode>
  >;

  const insertedIndex =
    sameArray && sourceFrame.kind === 'array' && command.index > sourceFrame.index
      ? command.index - 1
      : command.index;

  const nextDoc = rebuildAtLocation(removedDoc, targetInRemoved, (node) => {
    const base = Array.isArray(node[command.targetRegionKey]) ? [...(node[command.targetRegionKey] as BaseSchema[])] : [];
    const at = Math.max(0, Math.min(insertedIndex, base.length));
    base.splice(at, 0, removed);
    return { ...node, [command.targetRegionKey]: base };
  });
  ctx.core.update(() => nextDoc);
  return { ok: true };
}

function applyUpdateProps(
  doc: SchemaInput,
  command: Extract<DesignerTreeCommand, { kind: 'updateProps' }>,
  ctx: DesignerCommandContext,
): DesignerCommandResult {
  const location = locateNode(doc, command.nodeId, ctx.registry);
  if (!location) return fail('unknown-node');
  const node = location.node;
  const nextDoc = rebuildAtLocation(doc, location, () => ({ ...node, ...command.props }));
  ctx.core.update(() => nextDoc);
  return { ok: true };
}

function applyReplaceRegion(
  doc: SchemaInput,
  command: Extract<DesignerTreeCommand, { kind: 'replaceRegion' }>,
  ctx: DesignerCommandContext,
): DesignerCommandResult {
  const location = locateNode(doc, command.nodeId, ctx.registry);
  if (!location) return fail('unknown-node');
  const node = location.node;
  if (!getContainerKeys(ctx.registry.get(node.type)).includes(command.regionKey)) {
    return fail('invalid-region');
  }
  if (command.node !== null && !isSchemaInput(command.node)) return fail('invalid-node');
  const nextDoc = rebuildAtLocation(doc, location, (current) => {
    if (command.node === null) {
      const clone = { ...current };
      delete clone[command.regionKey];
      return clone;
    }
    // 新落子树整体重新注入（S4 模板替换/整体替换：复制即新 sid，INV-D）。
    const injected = injectSessionIds(command.node, ctx.rng) as BaseSchema | BaseSchema[];
    return { ...current, [command.regionKey]: injected };
  });
  ctx.core.update(() => nextDoc);
  return { ok: true };
}

/**
 * importDocument（S1 §6.2 导入链）：`adapter.validate`（结构非法拒绝导入并保留 working，
 * rt-unknown-type 失败路径）→ `injectSessionIds`（sid 冲突即重新分配）→ 整体替换
 * （1 条 undo 步）。导入**不**跑 authoringTransform（避免非用户意图改写，INV-B）。
 */
function applyImportDocument(
  command: Extract<DesignerTreeCommand, { kind: 'importDocument' }>,
  ctx: DesignerCommandContext,
): DesignerCommandResult {
  const validation = ctx.core.adapter.validate(command.doc);
  if (!validation.ok) return fail('unknown-type');
  const injected = injectSessionIds(command.doc, ctx.rng);
  ctx.core.update(() => injected);
  return { ok: true };
}

/** 命令分派（session.dispatch 的实现体）。 */
export function applyDesignerCommand(
  ctx: DesignerCommandContext,
  command: DesignerTreeCommand,
): DesignerCommandResult {
  const doc = ctx.core.getState().working;
  switch (command.kind) {
    case 'insertNode':
      return applyInsertNode(doc, command, ctx);
    case 'removeNode':
      return applyRemoveNode(doc, command, ctx);
    case 'moveNode':
      return applyMoveNode(doc, command, ctx);
    case 'updateProps':
      return applyUpdateProps(doc, command, ctx);
    case 'replaceRegion':
      return applyReplaceRegion(doc, command, ctx);
    case 'importDocument':
      return applyImportDocument(command, ctx);
    default: {
      const exhaustive: never = command;
      return fail(`unsupported-command:${String(exhaustive)}`);
    }
  }
}
