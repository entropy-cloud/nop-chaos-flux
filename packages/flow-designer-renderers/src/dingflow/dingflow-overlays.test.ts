import { describe, expect, it } from 'vitest';
import type { GraphNode, GraphEdge, TreeEdgeRuntimeGeometry } from '@nop-chaos/flow-designer-core';
import { computeDingFlowOverlays } from './dingflow-overlays.js';

const DW = 220;
const DH = 80;

function node(id: string, x: number, y: number, type = 'task'): GraphNode {
  return { id, type, position: { x, y }, data: { label: id } };
}

function treeEdge(
  id: string,
  source: string,
  target: string,
  geometry: Partial<TreeEdgeRuntimeGeometry> & { kind: 'chain' | 'split' | 'merge'; direction: 'TB' | 'LR' },
  type = 'default',
): GraphEdge {
  return { id, type, source, target, data: { __fdTree: geometry } };
}

describe('computeDingFlowOverlays', () => {
  it('returns empty for empty input', () => {
    expect(computeDingFlowOverlays([], [])).toEqual([]);
  });

  it('returns empty for a simple chain', () => {
    const nodes = [node('a', 0, 0), node('b', 0, 100)];
    const edges = [
      treeEdge('e1', 'a', 'b', { kind: 'chain', direction: 'TB', ownerId: 'a', continuationId: 'b' }),
    ];
    expect(computeDingFlowOverlays(nodes, edges)).toEqual([]);
  });

  it('returns empty when a node has exactly one outgoing edge', () => {
    const nodes = [node('a', 0, 0), node('b', 0, 100)];
    const edges = [
      treeEdge('e1', 'a', 'b', { kind: 'split', direction: 'TB', ownerId: 'a', branchId: 'b1' }),
    ];
    expect(computeDingFlowOverlays(nodes, edges)).toEqual([]);
  });

  describe('condition branch overlay', () => {
    it('creates addCondition overlay on the shared split line', () => {
      const nodes = [node('cond', 0, 0), node('leaf-a', -100, 200), node('leaf-b', 100, 200)];
      const edges = [
        treeEdge('s1', 'cond', 'leaf-a', { kind: 'split', direction: 'TB', ownerId: 'cond', branchId: 'b1', lineMain: 150, fanoutCross: 0 }),
        treeEdge('s2', 'cond', 'leaf-b', { kind: 'split', direction: 'TB', ownerId: 'cond', branchId: 'b2', lineMain: 150, fanoutCross: 0 }),
      ];
      const overlays = computeDingFlowOverlays(nodes, edges);
      const addCondition = overlays.filter((overlay) => overlay.kind === 'addCondition');
      expect(addCondition).toHaveLength(1);
      expect(addCondition[0]).toMatchObject({
        id: 'overlay-addcond-cond',
        x: Math.round(0 + DW / 2),
        y: 150,
        sourceId: 'cond',
      });
    });

    it('positions addCondition overlay on the shared split line between owner and targets', () => {
      const nodes = [node('cond', 0, 0), node('leaf-a', -100, 250), node('leaf-b', 100, 250)];
      const edges = [
        treeEdge('s1', 'cond', 'leaf-a', { kind: 'split', direction: 'TB', ownerId: 'cond', branchId: 'b1', lineMain: 160 }),
        treeEdge('s2', 'cond', 'leaf-b', { kind: 'split', direction: 'TB', ownerId: 'cond', branchId: 'b2', lineMain: 160 }),
      ];
      const overlays = computeDingFlowOverlays(nodes, edges);
      const addCondition = overlays.find((overlay) => overlay.kind === 'addCondition')!;
      expect(addCondition.y).toBeGreaterThan(0 + DH);
      expect(addCondition.y).toBeLessThan(250);
    });

    it('uses the shared split line for overlay x in LR direction', () => {
      const nodes = [node('cond', 0, 0), node('leaf-a', 250, -100), node('leaf-b', 250, 100)];
      const edges = [
        treeEdge('s1', 'cond', 'leaf-a', { kind: 'split', direction: 'LR', ownerId: 'cond', branchId: 'b1', lineMain: 160 }),
        treeEdge('s2', 'cond', 'leaf-b', { kind: 'split', direction: 'LR', ownerId: 'cond', branchId: 'b2', lineMain: 160 }),
      ];
      const overlays = computeDingFlowOverlays(nodes, edges);
      const addCondition = overlays.find((overlay) => overlay.kind === 'addCondition')!;
      expect(addCondition.x).toBe(160);
      expect(addCondition.y).toBe(Math.round(0 + DH / 2));
    });
  });

  describe('merge overlay', () => {
    it('creates mergeAdd overlay on the shared merge line', () => {
      const nodes = [node('leaf-a', -100, 0), node('leaf-b', 100, 0), node('merge', 0, 300)];
      const edges = [
        treeEdge('m1', 'leaf-a', 'merge', { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b1', continuationId: 'merge', lineMain: 200 }),
        treeEdge('m2', 'leaf-b', 'merge', { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b2', continuationId: 'merge', lineMain: 200 }),
      ];
      const overlays = computeDingFlowOverlays(nodes, edges);
      const mergeAdd = overlays.filter((overlay) => overlay.kind === 'mergeAdd');
      expect(mergeAdd).toHaveLength(1);
      expect(mergeAdd[0]).toMatchObject({
        id: 'overlay-merge-merge',
        sourceId: 'merge:merge',
      });
    });

    it('positions merge overlay below the merge line and above the merge target', () => {
      const nodes = [node('leaf-a', -100, 0), node('leaf-b', 100, 0), node('merge', 0, 400)];
      const edges = [
        treeEdge('m1', 'leaf-a', 'merge', { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b1', continuationId: 'merge', lineMain: 200 }),
        treeEdge('m2', 'leaf-b', 'merge', { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b2', continuationId: 'merge', lineMain: 200 }),
      ];
      const overlays = computeDingFlowOverlays(nodes, edges);
      const mergeAdd = overlays.find((overlay) => overlay.kind === 'mergeAdd')!;
      expect(mergeAdd.y).toBeGreaterThan(200);
      expect(mergeAdd.y).toBeLessThan(400);
    });

    it('uses custom node size from nodeSizeMap for merge placement', () => {
      const nodes = [node('leaf-a', -100, 0), node('leaf-b', 100, 0), node('merge', 0, 400)];
      const edges = [
        treeEdge('m1', 'leaf-a', 'merge', { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b1', continuationId: 'merge', lineMain: 220 }),
        treeEdge('m2', 'leaf-b', 'merge', { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b2', continuationId: 'merge', lineMain: 220 }),
      ];
      const nodeSizeMap = new Map([['task', { minWidth: 300, minHeight: 120 }]]);
      const overlays = computeDingFlowOverlays(nodes, edges, nodeSizeMap);
      const mergeAdd = overlays.find((overlay) => overlay.kind === 'mergeAdd')!;
      expect(mergeAdd.x).toBe(Math.round(0 + 300 / 2));
    });
  });

  describe('full dingtalk-style scenario', () => {
    function buildBranchScenario(): { nodes: GraphNode[]; edges: GraphEdge[] } {
      const nodes = [
        node('cond', 0, 0),
        node('branch-a', -120, 200),
        node('branch-b', 120, 200),
        node('continuation', 0, 500),
      ];
      const edges = [
        treeEdge('s1', 'cond', 'branch-a', { kind: 'split', direction: 'TB', ownerId: 'cond', branchId: 'b1', lineMain: 150 }),
        treeEdge('s2', 'cond', 'branch-b', { kind: 'split', direction: 'TB', ownerId: 'cond', branchId: 'b2', lineMain: 150 }),
        treeEdge('m1', 'branch-a', 'continuation', { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b1', continuationId: 'continuation', lineMain: 400 }),
        treeEdge('m2', 'branch-b', 'continuation', { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b2', continuationId: 'continuation', lineMain: 400 }),
      ];
      return { nodes, edges };
    }

    it('produces both addCondition and mergeAdd overlays for a branch group', () => {
      const { nodes, edges } = buildBranchScenario();
      const overlays = computeDingFlowOverlays(nodes, edges);
      const kinds = overlays.map((overlay) => overlay.kind).sort();
      expect(kinds).toEqual(['addCondition', 'mergeAdd']);
      expect(overlays.map((overlay) => overlay.sourceId)).toContain('cond');
      expect(overlays.map((overlay) => overlay.sourceId)).toContain('merge:continuation');
    });

    it('places addCondition overlay above the branch targets', () => {
      const { nodes, edges } = buildBranchScenario();
      const addCondition = computeDingFlowOverlays(nodes, edges).find(
        (overlay) => overlay.kind === 'addCondition',
      )!;
      expect(addCondition.y).toBe(150);
      expect(addCondition.y).toBeLessThan(200);
    });

    it('places mergeAdd overlay below the merge line and above the merge target', () => {
      const { nodes, edges } = buildBranchScenario();
      const mergeAdd = computeDingFlowOverlays(nodes, edges).find(
        (overlay) => overlay.kind === 'mergeAdd',
      )!;
      expect(mergeAdd.y).toBeGreaterThan(400);
      expect(mergeAdd.y).toBeLessThan(500);
    });
  });

  describe('nested branch groups', () => {
    it('produces overlays for inner branch group in nested scenario', () => {
      const nodes = [
        node('outer-cond', 0, 0),
        node('inner-cond', -150, 200),
        node('inner-leaf-a', -260, 400),
        node('inner-leaf-b', -40, 400),
        node('outer-leaf-b', 150, 200),
        node('outer-cont', 0, 700),
        node('inner-cont', -150, 600),
      ];
      const edges = [
        treeEdge('s1', 'outer-cond', 'inner-cond', { kind: 'split', direction: 'TB', ownerId: 'outer-cond', branchId: 'b1', lineMain: 140 }),
        treeEdge('s2', 'outer-cond', 'outer-leaf-b', { kind: 'split', direction: 'TB', ownerId: 'outer-cond', branchId: 'b2', lineMain: 140 }),
        treeEdge('s3', 'inner-cond', 'inner-leaf-a', { kind: 'split', direction: 'TB', ownerId: 'inner-cond', branchId: 'ib1', lineMain: 340 }),
        treeEdge('s4', 'inner-cond', 'inner-leaf-b', { kind: 'split', direction: 'TB', ownerId: 'inner-cond', branchId: 'ib2', lineMain: 340 }),
        treeEdge('m1', 'inner-leaf-a', 'inner-cont', { kind: 'merge', direction: 'TB', ownerId: 'inner-cond', branchId: 'ib1', continuationId: 'inner-cont', lineMain: 560 }),
        treeEdge('m2', 'inner-leaf-b', 'inner-cont', { kind: 'merge', direction: 'TB', ownerId: 'inner-cond', branchId: 'ib2', continuationId: 'inner-cont', lineMain: 560 }),
        treeEdge('m3', 'inner-cont', 'outer-cont', { kind: 'merge', direction: 'TB', ownerId: 'outer-cond', branchId: 'b1', continuationId: 'outer-cont', lineMain: 660 }),
        treeEdge('m4', 'outer-leaf-b', 'outer-cont', { kind: 'merge', direction: 'TB', ownerId: 'outer-cond', branchId: 'b2', continuationId: 'outer-cont', lineMain: 660 }),
      ];
      const overlays = computeDingFlowOverlays(nodes, edges);
      const addCondition = overlays.filter((overlay) => overlay.kind === 'addCondition');
      const mergeAdd = overlays.filter((overlay) => overlay.kind === 'mergeAdd');
      expect(addCondition.map((overlay) => overlay.sourceId).sort()).toEqual(['inner-cond', 'outer-cond']);
      expect(mergeAdd.map((overlay) => overlay.sourceId).sort()).toEqual(['merge:inner-cont', 'merge:outer-cont']);
    });
  });

  describe('continuation after merge', () => {
    it('merge target can have a chain child without extra overlays', () => {
      const nodes = [node('leaf-a', -100, 0), node('leaf-b', 100, 0), node('merge', 0, 300)];
      const edges = [
        treeEdge('m1', 'leaf-a', 'merge', { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b1', continuationId: 'merge', lineMain: 200 }),
        treeEdge('m2', 'leaf-b', 'merge', { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b2', continuationId: 'merge', lineMain: 200 }),
        treeEdge('c1', 'merge', 'end', { kind: 'chain', direction: 'TB', ownerId: 'merge', continuationId: 'end' }),
      ];
      const overlays = computeDingFlowOverlays(nodes, edges);
      const kinds = overlays.map((overlay) => overlay.kind).sort();
      expect(kinds).toEqual(['mergeAdd']);
    });

    it('merge target can fan out again as a new branch source', () => {
      const nodes = [node('cond1', 0, 0), node('l1', -100, 150), node('l2', 100, 150), node('cond2', 0, 300), node('l3', -100, 450), node('l4', 100, 450), node('end', 0, 600)];
      const edges = [
        treeEdge('s1', 'cond1', 'l1', { kind: 'split', direction: 'TB', ownerId: 'cond1', branchId: 'b1', lineMain: 100 }),
        treeEdge('s2', 'cond1', 'l2', { kind: 'split', direction: 'TB', ownerId: 'cond1', branchId: 'b2', lineMain: 100 }),
        treeEdge('m1', 'l1', 'cond2', { kind: 'merge', direction: 'TB', ownerId: 'cond1', branchId: 'b1', continuationId: 'cond2', lineMain: 250 }),
        treeEdge('m2', 'l2', 'cond2', { kind: 'merge', direction: 'TB', ownerId: 'cond1', branchId: 'b2', continuationId: 'cond2', lineMain: 250 }),
        treeEdge('s3', 'cond2', 'l3', { kind: 'split', direction: 'TB', ownerId: 'cond2', branchId: 'b1', lineMain: 400 }),
        treeEdge('s4', 'cond2', 'l4', { kind: 'split', direction: 'TB', ownerId: 'cond2', branchId: 'b2', lineMain: 400 }),
        treeEdge('m3', 'l3', 'end', { kind: 'merge', direction: 'TB', ownerId: 'cond2', branchId: 'b1', continuationId: 'end', lineMain: 550 }),
        treeEdge('m4', 'l4', 'end', { kind: 'merge', direction: 'TB', ownerId: 'cond2', branchId: 'b2', continuationId: 'end', lineMain: 550 }),
      ];
      const overlays = computeDingFlowOverlays(nodes, edges);
      const addCondition = overlays.filter((overlay) => overlay.kind === 'addCondition');
      const mergeAdd = overlays.filter((overlay) => overlay.kind === 'mergeAdd');
      expect(addCondition.map((overlay) => overlay.sourceId).sort()).toEqual(['cond1', 'cond2']);
      expect(mergeAdd.map((overlay) => overlay.sourceId).sort()).toEqual(['merge:cond2', 'merge:end']);
    });
  });

  describe('edge cases', () => {
    it('skips a merge overlay when the continuation node is missing', () => {
      const nodes = [node('cond', 0, 0)];
      const edges = [
        treeEdge('s1', 'cond', 'missing-leaf', { kind: 'split', direction: 'TB', ownerId: 'cond', branchId: 'b1', lineMain: 150 }),
        treeEdge('m1', 'missing-leaf', 'missing-cont', { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b1', continuationId: 'missing-cont', lineMain: 200 }),
      ];
      const overlays = computeDingFlowOverlays(nodes, edges);
      const kinds = overlays.map((overlay) => overlay.kind);
      expect(kinds).toEqual(['addCondition']);
    });

    it('keeps slot owner and continuation overlays but never keys on virtual ids', () => {
      const nodes = [node('cond', 0, 0), node('__fd_internal__/slot/cond/b2', 100, 200), node('after', 0, 400)];
      const edges = [
        treeEdge('s1', 'cond', '__fd_internal__/slot/cond/b2', { kind: 'split', direction: 'TB', ownerId: 'cond', branchId: 'b2', lineMain: 150 }),
        treeEdge('m1', '__fd_internal__/slot/cond/b2', 'after', { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b2', continuationId: 'after', lineMain: 300 }),
      ];
      const overlays = computeDingFlowOverlays(nodes, edges);
      expect(overlays.map((overlay) => overlay.sourceId).sort()).toEqual(['cond', 'merge:after']);
      expect(overlays.every((overlay) => !overlay.sourceId.startsWith('__fd_internal__'))).toBe(true);
    });

    it('produces stable overlay ids', () => {
      const nodes = [node('cond', 0, 0), node('a', -100, 200), node('b', 100, 200), node('c', 0, 400)];
      const edges = [
        treeEdge('s1', 'cond', 'a', { kind: 'split', direction: 'TB', ownerId: 'cond', branchId: 'b1', lineMain: 150 }),
        treeEdge('s2', 'cond', 'b', { kind: 'split', direction: 'TB', ownerId: 'cond', branchId: 'b2', lineMain: 150 }),
        treeEdge('m1', 'a', 'c', { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b1', continuationId: 'c', lineMain: 300 }),
        treeEdge('m2', 'b', 'c', { kind: 'merge', direction: 'TB', ownerId: 'cond', branchId: 'b2', continuationId: 'c', lineMain: 300 }),
      ];
      const first = computeDingFlowOverlays(nodes, edges).map((overlay) => overlay.id).sort();
      const second = computeDingFlowOverlays(nodes, edges).map((overlay) => overlay.id).sort();
      expect(first).toEqual(second);
      expect(first).toContain('overlay-addcond-cond');
      expect(first).toContain('overlay-merge-c');
    });
  });
});
