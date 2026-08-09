import { Line, Rect, type IGroup } from 'leafer-ui';
import type { ConnectionOverlayState } from './connection-overlay.js';
import type { ScadaEditorEngine } from '../renderer/editor-engine.js';

/**
 * 连线 overlay sky 层渲染器（design-connection.md §6，E8 M-1 修正）。
 *
 * 经 leafer Line + Rect 在 engine.sky（screen 坐标系）渲染 drag-line + snap-dot。
 * 世界坐标 → viewport 坐标经 engine.getViewportPoint 换算（sky 层不受视口缩放/平移）。
 * **不入组态 JSON**（编辑会话临时态，sky 层节点不进序列化）。
 *
 * 本渲染器持有当前 overlay 节点列表，每次 update 先清旧再加新，unmount 时 destroy。
 */
export class ConnectionOverlayRenderer {
  private nodes: Array<{ destroy?: () => void }> = [];

  constructor(private readonly engine: ScadaEditorEngine) {}

  update(state: ConnectionOverlayState): void {
    this.clear();
    const sky = this.engine.sky as IGroup | undefined;
    if (!sky || typeof sky.add !== 'function') return;
    for (const line of state.dragLines) {
      const from = this.engine.getViewportPoint(line.from);
      const to = this.engine.getViewportPoint(line.to);
      const node = new Line({
        points: [from.x, from.y, to.x, to.y],
        stroke: '#22c55e',
        strokeWidth: 2,
        dashPattern: [6, 4],
      });
      sky.add(node);
      this.nodes.push(node);
    }
    for (const highlight of state.highlights) {
      const vp = this.engine.getViewportPoint(highlight.world);
      const node = new Rect({
        x: vp.x - 6,
        y: vp.y - 6,
        width: 12,
        height: 12,
        fill: '#22c55e',
        stroke: '#ffffff',
        strokeWidth: 2,
        cornerRadius: 6,
      });
      sky.add(node);
      this.nodes.push(node);
    }
  }

  clear(): void {
    for (const node of this.nodes) {
      node.destroy?.();
    }
    this.nodes = [];
  }
}
