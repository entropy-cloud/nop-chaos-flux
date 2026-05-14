import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { syncLocalNodesWithSnapshot } from './use-xyflow-sync.js';

describe('useXyflowSync', () => {
  it('merges snapshot data after drag acknowledgement at the same position', () => {
    const currentNodes: Node[] = [
      { id: 'node-1', position: { x: 10, y: 20 }, data: { label: 'Before' }, selected: false, type: 'task' },
    ];
    const lastCommittedPositions = new Map([['node-1', '10:20']]);

    const nodes = syncLocalNodesWithSnapshot(
      currentNodes,
      [
        {
          id: 'node-1',
          position: { x: 10, y: 20 },
          data: { label: 'After' },
          selected: true,
          type: 'task',
        },
      ],
      lastCommittedPositions,
    );

    expect(nodes[0]?.position).toEqual({ x: 10, y: 20 });
    expect(nodes[0]?.data).toEqual({ label: 'After' });
    expect(nodes[0]?.selected).toBe(true);
    expect(lastCommittedPositions.size).toBe(0);
  });
});
