import { Group, Rect } from 'leafer-ui';

export interface AddStrategyTiming {
  count: number;
  perNodeMs: number;
  batchMs: number;
  ratio: number;
}

/**
 * batch.add 对照探针（gate-3-review §10 m-8，I14.1 兑现）：逐节点 add vs Group.add 批量入树对比。
 * dev/test 专用（仅经测试句柄 `measureAddStrategies` 暴露），非 scada-canvas 公共契约。
 *
 * 测量口径与 config-adapter.build 一致：根 Group 脱离渲染树，逐节点 add / 批量 add 均
 * 在离线 Group 上完成（config-adapter 也是先建 root Group、逐节点挂入、最后整树 add）。
 * 环境：真实 leafer-ui@2.2.9，浏览器页面上下文。非缺陷判定、性能观察项口径固化（I14 复测对照）。
 */
export function measureAddStrategies(count: number): AddStrategyTiming {
  const nodes: Rect[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push(new Rect({ x: 0, y: 0, width: 1, height: 1, fill: '#111111' }));
  }

  const perNodeGroup = new Group({ name: 'probe-per-node' });
  const perNodeStart = performance.now();
  for (const node of nodes) {
    perNodeGroup.add(node);
  }
  const perNodeMs = performance.now() - perNodeStart;
  perNodeGroup.destroy();

  const batchGroup = new Group({ name: 'probe-batch' });
  const batchStart = performance.now();
  batchGroup.add(nodes);
  const batchMs = performance.now() - batchStart;
  batchGroup.destroy();

  return {
    count,
    perNodeMs: Math.round(perNodeMs * 10) / 10,
    batchMs: Math.round(batchMs * 10) / 10,
    ratio: perNodeMs / Math.max(batchMs, 0.001),
  };
}
