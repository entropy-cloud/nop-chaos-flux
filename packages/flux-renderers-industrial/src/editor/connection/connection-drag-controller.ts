import type { ScadaSymbolNode } from '../../serialization/config-types.js';
import {
  beginConnectionDrag,
  collectSymbolBounds,
  commitConnectionDrag,
  updateDragCandidate,
  type ConnectionDragState,
  type ConnectionWriteResult,
} from './connection-adapter.js';
import { EMPTY_OVERLAY_STATE, deriveOverlayState, type ConnectionOverlayState } from './connection-overlay.js';
import type { WorldPoint } from './anchor-snap.js';

/**
 * 连线拖拽控制器（design-connection.md §4.2 三段式交互的生产驱动器，E8 M-1 修正）。
 *
 * 将纯逻辑状态机（`beginConnectionDrag` / `updateDragCandidate` / `commitConnectionDrag`）+
 * overlay 投影（`deriveOverlayState`）接到生产 pointer 事件流。适配层经 DOM pointer 事件
 * （pointerdown/move/up）驱动本控制器，本控制器驱动状态机 + overlay + 提交回调。
 *
 * **M2 交互模型**（design §4.2）：
 * - pointerdown 命中 pipe-junction 主体 → `beginDrag`（进入端点拖动模式）。
 * - pointermove → `moveDrag`（吸附候选查询 + overlay 高亮 + 虚线提示）。
 * - pointerup → `endDrag`（吸附候选命中则写 connections + 提交；无候选 noop）。
 *
 * 纯逻辑 + 依赖注入（无 React / leafer 直接依赖），Vitest 单测先行（roadmap 测试纪律）。
 * **不派发 `symbol:*` action**（R5 隔离）——提交经 host onCommit 回调写 working copy。
 */

/** 控制器依赖（host 注入，解耦 leafer / session）。 */
export interface ConnectionDragControllerDeps {
  /** 读 working copy 全部图元（候选 bounds + junction 查找）。 */
  getSymbols: () => ScadaSymbolNode[];
  /** 按 id 查 working copy 节点。 */
  findNode: (id: string) => ScadaSymbolNode | undefined;
  /** 容器相对 viewport 坐标 → 世界坐标（经引擎视口换算）。 */
  viewportToWorld: (point: WorldPoint) => WorldPoint;
}

/** 控制器回调（host 经此驱动 overlay 渲染 + 连线提交）。 */
export interface ConnectionDragControllerCallbacks {
  /** overlay 状态变更（drag-line + snap-dot）；拖拽终止时传 EMPTY_OVERLAY_STATE 清空。 */
  onOverlayUpdate: (state: ConnectionOverlayState) => void;
  /** 连线提交（host 写 working copy custom.connections + undo 栈，operationKind='connection-update'）。 */
  onCommit: (result: ConnectionWriteResult) => void;
}

export class ConnectionDragController {
  private dragState: ConnectionDragState | null = null;

  constructor(
    private readonly deps: ConnectionDragControllerDeps,
    private readonly callbacks: ConnectionDragControllerCallbacks,
  ) {}

  get isActive(): boolean {
    return this.dragState !== null;
  }

  /**
   * 命中测试：viewport 坐标是否落在某个 pipe-junction 主体 bounds 内（§4.2 a 入口判定）。
   * 返回命中 junction 节点；未命中返回 undefined（host 不进入端点拖动模式）。
   */
  hitTestJunction(viewportPoint: WorldPoint): ScadaSymbolNode | undefined {
    const world = this.deps.viewportToWorld(viewportPoint);
    return findJunctionAtPoint(this.deps.getSymbols(), world);
  }

  /**
   * (a) 端点拾起：进入端点拖动模式（§4.2 a）。
   * 返回 true 表示拖拽已启动；junctionId 不存在或非 pipe-junction 返回 false。
   */
  beginDrag(junctionId: string): boolean {
    const junctionNode = this.deps.findNode(junctionId);
    if (!junctionNode || junctionNode.type !== 'scada-pipe-junction') return false;
    this.dragState = beginConnectionDrag({ junctionId });
    return true;
  }

  /**
   * (b) 端点拖动 + 吸附候选 + overlay（§4.2 b）。
   * 拖拽未激活时 noop。
   */
  moveDrag(viewportPoint: WorldPoint): void {
    if (!this.dragState) return;
    const world = this.deps.viewportToWorld(viewportPoint);
    const candidates = collectSymbolBounds(this.deps.getSymbols());
    updateDragCandidate(this.dragState, { worldPoint: world, candidates });
    const candidateBounds = this.dragState.currentCandidate
      ? candidates.find((c) => c.id === this.dragState!.currentCandidate!.nodeId)
      : undefined;
    const overlay = deriveOverlayState({
      pointerWorld: world,
      candidate: this.dragState.currentCandidate,
      candidateBounds,
    });
    this.callbacks.onOverlayUpdate(overlay);
  }

  /**
   * (c) 端点释放 + 提交（§4.2 c + §4.3）。
   * 有吸附候选 → onCommit（host 写 connections + 入栈）；无候选 noop。
   * 拖拽未激活时 noop。
   */
  endDrag(): void {
    if (!this.dragState) return;
    const junctionNode = this.deps.findNode(this.dragState.junctionId);
    const result = commitConnectionDrag(this.dragState, junctionNode);
    this.dragState = null;
    this.callbacks.onOverlayUpdate(EMPTY_OVERLAY_STATE);
    if (result) this.callbacks.onCommit(result);
  }

  /** 中止拖拽（模式切换 / unmount）——不入栈、不清 working copy，仅清 overlay。 */
  cancel(): void {
    this.dragState = null;
    this.callbacks.onOverlayUpdate(EMPTY_OVERLAY_STATE);
  }
}

/** 在 working copy 中找世界坐标命中的 pipe-junction 主体（含 group 子树递归）。 */
function findJunctionAtPoint(symbols: ScadaSymbolNode[], world: WorldPoint): ScadaSymbolNode | undefined {
  for (const node of symbols) {
    if (node.type === 'scada-pipe-junction' && containsPoint(node, world)) return node;
    if (node.children) {
      const found = findJunctionAtPoint(node.children, world);
      if (found) return found;
    }
  }
  return undefined;
}

function containsPoint(node: ScadaSymbolNode, world: WorldPoint): boolean {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const w = node.width ?? 0;
  const h = node.height ?? 0;
  return world.x >= x && world.x <= x + w && world.y >= y && world.y <= y + h;
}
