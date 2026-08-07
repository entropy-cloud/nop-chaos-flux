import type { ScadaEditorEngine } from './renderer/editor-engine.js';
import type { ScadaSymbolNode } from '../serialization/config-types.js';

/**
 * Editor 事件族适配层骨架（design-architecture.md §4.6，spike §2.5 关键约束）。
 *
 * **核心纪律（R5 隔离 + spike §2.5）**：
 * 1. **禁直传 leafer 循环引用事件**——Editor 事件载荷的 target/editor/value/drag 均为 Leaf 实例
 *    （含循环引用），直传 `createNormalizedActionEvent` 会序列化栈溢出。适配层抽纯 primitive payload + nodeId。
 * 2. **不派发 `symbol:*` action**——编辑态事件族只更新 working copy 几何 + session.selection（R5 Layer 3）。
 * 3. **事务语义节流起止帧**（design-undo-redo.md §4.2，E7.2 M2 落地）——transform 族首帧 beginTransaction
 *    快照 working copy，每帧只更新 working copy（不入栈），pointerup commitTransaction 一次性 diff 入栈
 *    （一拖拽 = 一 undo 步，防逐帧入栈爆炸 U2）。
 *
 * 几何写回 spike 约束 #5：scale 默认 editSize:'size' → 改写 width/height（非 scale 因子）；
 * rotate rotateGap:45 吸附；skew 触发 = ctrl+resize-line。M1 读 target 几何（x/y/width/height/rotation）写回。
 */
export interface EditorAdapterListeners {
  /** 选区变更回调（更新 session.selection + 派发 onSelectionChange schema 事件）。 */
  onSelectionChange?: (nodeIds: string[]) => void;
  /** working copy 几何变更回调（经 updateSymbol 句柄写回 working copy）。 */
  onGeometryChange?: (nodeId: string, patch: Partial<ScadaSymbolNode>) => void;
  /** transform 事务起始回调（design-undo-redo.md §4.2：第一个 transform 帧触发，host 经 undoRedo.beginTransaction 快照 working copy）。 */
  onTransformStart?: () => void;
  /** transform 事务终止回调（pointerup 触发，host 经 undoRedo.commitTransaction 入栈 1 个 diff）。 */
  onTransformEnd?: () => void;
}

/**
 * 装配 Editor 事件族适配层（design-architecture.md §4.6）。
 *
 * 返回 detach 函数——unmount / 模式切换时退订，防泄漏（R5 不泄漏验证 #4）。
 * transform 族（editor.move/scale/rotate/skew）→ 读 target 几何 → onGeometryChange 写回 working copy；
 * select 族（editor.select）→ onSelectionChange 更新 session.selection。
 */
export function attachEditorAdapter(
  engine: ScadaEditorEngine,
  listeners: EditorAdapterListeners,
): () => void {
  const editor = engine.editor as
    | {
        on?: (event: string, fn: (...args: unknown[]) => void) => unknown;
        off?: (event: string, fn: (...args: unknown[]) => void) => unknown;
        list?: unknown[];
        target?: unknown;
      }
    | undefined;
  if (!editor || typeof editor.on !== 'function') {
    // Editor 实例未就绪（mock 环境或装配失败）——返回 noop detach，适配层不阻断渲染。
    return () => undefined;
  }

  const handlers: Array<{ event: string; fn: (...args: unknown[]) => void }> = [];

  // select 族：选区变更 → 抽纯 nodeId 列表（禁直传 leafer target 列表，spike §2.5）。
  const onSelect = (): void => {
    const list = editor.list ?? [];
    const nodeIds = extractNodeIds(engine, list);
    listeners.onSelectionChange?.(nodeIds);
  };

  // transform 事务状态（design-undo-redo.md §4.2：节流起止帧，一拖拽 = 一 diff）。
  let inTransformTransaction = false;

  const beginTransformTransaction = (): void => {
    if (inTransformTransaction) return;
    inTransformTransaction = true;
    listeners.onTransformStart?.();
    // 事务终止经 pointerup 触发（一次性 window listener，spike §2.5 pointerup = 事务边界）。
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerup', endTransformTransaction, { once: true });
    }
  };

  const endTransformTransaction = (): void => {
    if (!inTransformTransaction) return;
    inTransformTransaction = false;
    listeners.onTransformEnd?.();
  };

  // transform 族（editor.move/scale/rotate/skew）：读 target 几何 → 写回 working copy（spike 约束 #5）。
  // 事务语义（design-undo-redo.md §4.2）：首帧 beginTransaction 快照 working copy，每帧只更新 working copy（不入栈），
  // pointerup commitTransaction 一次性 diff 入栈（一拖拽 = 一 undo 步，防逐帧入栈爆炸 U2）。
  const onTransform = (): void => {
    beginTransformTransaction();
    const target = editor.target;
    const nodeIds = extractNodeIds(engine, target);
    for (const nodeId of nodeIds) {
      const geometry = readTargetGeometry(engine, nodeId);
      if (geometry) {
        listeners.onGeometryChange?.(nodeId, geometry);
      }
    }
  };

  for (const event of ['editor.select', 'editor.move', 'editor.scale', 'editor.rotate', 'editor.skew']) {
    const fn = event === 'editor.select' ? onSelect : onTransform;
    editor.on(event, fn);
    handlers.push({ event, fn });
  }

  return () => {
    for (const { event, fn } of handlers) {
      editor.off?.(event, fn);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerup', endTransformTransaction);
    }
  };
}

/**
 * 从 Editor target/list 抽纯 nodeId 列表（spike §2.5 关键约束：禁直传 leafer Leaf 实例）。
 *
 * target 可能是单个 Leaf、Leaf 数组、或 undefined。经 engine.registry.findByNode 反查 config nodeId
 * （与 runtime HitResolver 命中解析同模式——沿 parent 链上溯直到命中已登记根）。
 */
function extractNodeIds(engine: ScadaEditorEngine, target: unknown): string[] {
  if (!target) return [];
  const items = Array.isArray(target) ? target : [target];
  const ids: string[] = [];
  for (const item of items) {
    if (item !== null && typeof item === 'object') {
      // 优先经 registry 反查（与 runtime HitResolver 同模式——复合图元子节点沿 parent 链上溯）。
      const registryId = engine.getSymbolByNode(item as object);
      if (registryId !== undefined) {
        ids.push(registryId);
        continue;
      }
      // Fallback：读节点 name/id 属性（group 容器经 buildNode 设 name=node.id）。
      const name = (item as { name?: unknown }).name;
      if (typeof name === 'string' && name.length > 0) {
        ids.push(name);
        continue;
      }
      const id = (item as { id?: unknown }).id;
      if (typeof id === 'string') {
        ids.push(id);
      }
    }
  }
  return ids;
}

/**
 * 读 target 图元当前几何 → primitive payload（spike 约束 #5：读 target 几何而非 deltas）。
 *
 * M1 读 x/y/width/height/rotation/visible/opacity（leafer 节点属性面经 get() 读取）；
 * scale 默认 editSize:'size' 已改写 width/height，不单独读 scaleX/scaleY。
 */
function readTargetGeometry(
  engine: ScadaEditorEngine,
  nodeId: string,
): Partial<ScadaSymbolNode> | undefined {
  const leaf = engine.getSymbol(nodeId);
  if (!leaf) return undefined;
  const raw = leaf.node.get() as Record<string, unknown>;
  const patch: Partial<ScadaSymbolNode> = {};
  const GEOMETRY_KEYS: Array<{ key: keyof ScadaSymbolNode; check: 'number' | 'boolean' }> = [
    { key: 'x', check: 'number' },
    { key: 'y', check: 'number' },
    { key: 'width', check: 'number' },
    { key: 'height', check: 'number' },
    { key: 'rotation', check: 'number' },
    { key: 'visible', check: 'boolean' },
    { key: 'opacity', check: 'number' },
  ];
  for (const { key, check } of GEOMETRY_KEYS) {
    const val = raw[key as string];
    if (check === 'number' ? typeof val === 'number' : typeof val === 'boolean') {
      patch[key] = val as never;
    }
  }
  return patch;
}

/**
 * 程序化选中图元（测试句柄 setSelection 消费）：经 nodeId → leaf.node → editor.target 装配。
 * spike 约束 #2：真实点击选中是 Editor 默认行为，程序化选中经 editor.target = node。
 */
export function programmaticSelect(engine: ScadaEditorEngine, nodeIds: string[]): void {
  const nodes = nodeIds
    .map((id) => engine.getSymbol(id)?.node)
    .filter((n): n is NonNullable<typeof n> => n !== undefined);
  engine.setEditorTargets(nodes);
}

/** 程序化清空选区（spike 约束 #4：经 editor.cancel()）。 */
export function programmaticClearSelection(engine: ScadaEditorEngine): void {
  engine.clearEditorSelection();
}
