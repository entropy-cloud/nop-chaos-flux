import type { ScadaPipeConnection } from '../../symbols/pipe/pipe-junction.js';
import type { NormalizedPoint } from './anchor-snap.js';

/**
 * 联动算法（design-connection.md §4.5，编辑器适配层纯逻辑）。
 *
 * 目标设备移动时重新计算 connection 归一化点（让 stub 视觉跟随目标设备）。
 *
 * 坐标模型（§4.5）：
 * - stub 终点目标世界坐标 = 目标设备锚点世界坐标。
 * - `targetWorldX = targetDevice.x + targetAnchor.x * targetDevice.width`。
 * - 反推归一化点：`connection.x = (targetWorldX - junction.x) / junction.width`。
 *
 * 与 runtime pipe-junction.ts:83 一致（stub 端点 = `connection.x * width - centerX`，
 * 即 stub 终点世界坐标 = junction.x + centerX + (connection.x * width - centerX) = junction.x + connection.x * width）。
 *
 * 纯逻辑（无 React / leafer 依赖），Vitest 单测先行。
 */

/** 图元世界几何（编辑会话 working copy 节点 x/y/width/height 投影）。 */
export interface LinkGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 目标设备移动时重新计算 connection 归一化点（design-connection.md §4.5）。
 *
 * 输入：当前 connection（取 target 不变）+ pipe-junction 主体几何 + 目标设备几何 + 目标设备吸附锚点。
 * 输出：新的 connection.x/y（归一化，相对 pipe-junction 主体），使 stub 终点世界坐标 = 目标设备锚点世界坐标。
 *
 * **C1 风险**：输出的归一化点可能超出 [0,1]（目标设备远离 pipe-junction 时）——不钳制，
 * 保持视觉准确（pipe-junction create 已支持任意归一化值，stub 视觉延伸到主体外）。
 */
export function recomputeConnectionAnchor(args: {
  connection: Pick<ScadaPipeConnection, 'target' | 'direction' | 'id'>;
  junction: LinkGeometry;
  targetDevice: LinkGeometry;
  /** 目标设备上的吸附锚点（归一化，相对目标设备，如 right-middle = {x:1, y:0.5}）。 */
  targetAnchor: NormalizedPoint;
}): { x: number; y: number } {
  const targetWorldX = args.targetDevice.x + args.targetAnchor.x * args.targetDevice.width;
  const targetWorldY = args.targetDevice.y + args.targetAnchor.y * args.targetDevice.height;
  // plan 2026-08-08-0900-1 Phase 1 / P2 #2：零尺寸 pipe-junction 除零守卫——width/height 为 0（或非有限）
  // 时退化到 junction 自身坐标（归一化 0），不写 Infinity/NaN。否则 JSON.stringify(Infinity)→null 损坏往返。
  return {
    x: safeDiv(targetWorldX - args.junction.x, args.junction.width),
    y: safeDiv(targetWorldY - args.junction.y, args.junction.height),
  };
}

/** 除法零守卫：除数为 0 时返回 0（退化到 junction 自身坐标，P2 #2），防 Infinity/NaN 写入序列化。 */
function safeDiv(numerator: number, divisor: number): number {
  return divisor === 0 ? 0 : numerator / divisor;
}

/**
 * 解析 connection.target 对应的目标设备吸附锚点（默认右中点 {x:1, y:0.5}）。
 *
 * 编辑器不持久化目标设备锚点（§4.4 边界：联动算法属编辑器适配层，锚点选择是编辑器域默认策略）。
 * M2 默认右中点（管道从 junction 主体右侧延伸到目标设备右中点）；M3 可经「断开连接」工具或
 * 属性面板扩展可选锚点（Non-Goals）。
 */
export function resolveTargetAnchor(_connection: ScadaPipeConnection): NormalizedPoint {
  return { x: 1, y: 0.5 };
}

/**
 * 重算单个 pipe-junction 主体上所有 connection 的归一化点（图元移动联动批量入口）。
 *
 * 对每个 connection，经 connection.target 反查目标设备当前几何 → recomputeConnectionAnchor → 返回新归一化点。
 * dangling connection（target 不存在）跳过（保留原 x/y，design-connection.md §4.4）。
 */
export function recomputeJunctionConnections(args: {
  junction: LinkGeometry;
  connections: ScadaPipeConnection[];
  /** nodeId → 目标设备几何（working copy 投影）。dangling（不在 map）跳过。 */
  deviceBoundsById: Map<string, LinkGeometry>;
}): Array<{ connectionId: string; point: NormalizedPoint }> {
  const out: Array<{ connectionId: string; point: NormalizedPoint }> = [];
  for (const connection of args.connections) {
    if (!connection.target) continue;
    const targetDevice = args.deviceBoundsById.get(connection.target);
    if (!targetDevice) continue;
    const targetAnchor = resolveTargetAnchor(connection);
    const point = recomputeConnectionAnchor({
      connection,
      junction: args.junction,
      targetDevice,
      targetAnchor,
    });
    out.push({ connectionId: connection.id, point });
  }
  return out;
}
