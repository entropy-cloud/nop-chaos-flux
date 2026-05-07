import { describe, expect, it } from 'vitest';
import type { GraphNode, GraphEdge } from '@nop-chaos/flow-designer-core';
import { BRANCH_SHORT_LEG, MERGE_SHORT_LEG, BTN_DIST } from './dingflow-constants.js';
import { computeDingFlowOverlays } from './dingflow-overlays.js';

const DW = 220;
const DH = 80;

function node(id: string, x: number, y: number, type = 'task'): GraphNode {
  return { id, type, position: { x, y }, data: { label: id } };
}

function edge(id: string, source: string, target: string, type = 'default'): GraphEdge {
  return { id, type, source, target, data: {} };
}

describe('computeDingFlowOverlays', () => {
  it('returns empty for empty input', () => {
    expect(computeDingFlowOverlays([], [])).toEqual([]);
  });

  it('returns empty for a simple chain (no branching)', () => {
    const nodes = [node('a', 0, 0), node('b', 0, 200), node('c', 0, 400)];
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')];
    expect(computeDingFlowOverlays(nodes, edges)).toEqual([]);
  });

  it('returns empty when a node has exactly one outgoing edge', () => {
    const nodes = [node('a', 0, 0), node('b', 0, 200)];
    const edges = [edge('e1', 'a', 'b')];
    expect(computeDingFlowOverlays(nodes, edges)).toEqual([]);
  });

  describe('condition branch overlay', () => {
    it('creates addCondition overlay when a node fans out to 2+ targets', () => {
      const condX = 0;
      const condY = 0;
      const branchAY = 200;
      const branchBY = 200;

      const nodes = [
        node('cond', condX, condY, 'condition'),
        node('branch-a', -120, branchAY),
        node('branch-b', 120, branchBY),
      ];
      const edges = [
        edge('e1', 'cond', 'branch-a', 'branch'),
        edge('e2', 'cond', 'branch-b', 'branch'),
      ];

      const overlays = computeDingFlowOverlays(nodes, edges);

      expect(overlays).toHaveLength(1);
      const overlay = overlays[0];
      expect(overlay.kind).toBe('addCondition');
      expect(overlay.sourceId).toBe('cond');
      expect(overlay.id).toBe('overlay-addcond-cond');

      const expectedCx = condX + DW / 2;
      expect(overlay.x).toBe(Math.round(expectedCx));

      const expectedY = branchAY - BRANCH_SHORT_LEG;
      expect(overlay.y).toBe(Math.round(expectedY));
    });

    it('positions addCondition overlay between source bottom and targets top', () => {
      const condY = 100;
      const branchY = 350;

      const nodes = [
        node('cond', 0, condY, 'condition'),
        node('b1', -120, branchY),
        node('b2', 120, branchY),
      ];
      const edges = [edge('e1', 'cond', 'b1', 'branch'), edge('e2', 'cond', 'b2', 'branch')];

      const [overlay] = computeDingFlowOverlays(nodes, edges);

      expect(overlay.y).toBeLessThan(branchY);
      expect(overlay.y).toBeGreaterThan(condY);
    });

    it('uses custom node width from nodeSizeMap', () => {
      const nodes = [
        node('cond', 0, 0, 'condition'),
        node('b1', -200, 200),
        node('b2', 200, 200),
      ];
      const edges = [edge('e1', 'cond', 'b1', 'branch'), edge('e2', 'cond', 'b2', 'branch')];

      const sizeMap = new Map<string, { minWidth?: number; minHeight?: number }>();
      sizeMap.set('condition', { minWidth: 300, minHeight: 100 });

      const [overlay] = computeDingFlowOverlays(nodes, edges, sizeMap);

      expect(overlay.x).toBe(Math.round(0 + 300 / 2));
    });

    it('handles 3-way branch', () => {
      const nodes = [
        node('cond', 0, 0, 'condition'),
        node('b1', -240, 200),
        node('b2', 0, 200),
        node('b3', 240, 200),
      ];
      const edges = [
        edge('e1', 'cond', 'b1', 'branch'),
        edge('e2', 'cond', 'b2', 'branch'),
        edge('e3', 'cond', 'b3', 'branch'),
      ];

      const overlays = computeDingFlowOverlays(nodes, edges);

      expect(overlays).toHaveLength(1);
      expect(overlays[0].kind).toBe('addCondition');
      expect(overlays[0].sourceId).toBe('cond');
    });
  });

  describe('merge overlay', () => {
    it('creates mergeAdd overlay when 2+ edges converge on the same target', () => {
      const branchY = 200;
      const mergeY = 400;

      const nodes = [
        node('cond', 0, 0, 'condition'),
        node('b1', -120, branchY),
        node('b2', 120, branchY),
        node('merge', 0, mergeY),
      ];
      const edges = [
        edge('e1', 'cond', 'b1', 'branch'),
        edge('e2', 'cond', 'b2', 'branch'),
        edge('e3', 'b1', 'merge', 'merge'),
        edge('e4', 'b2', 'merge', 'merge'),
      ];

      const overlays = computeDingFlowOverlays(nodes, edges);

      const mergeOverlay = overlays.find((o) => o.kind === 'mergeAdd');
      expect(mergeOverlay).toBeDefined();
      expect(mergeOverlay!.sourceId).toBe('merge:merge');
      expect(mergeOverlay!.id).toBe('overlay-merge-merge');

      const expectedCx = mergeY !== undefined ? 0 + DW / 2 : 0;
      expect(mergeOverlay!.x).toBe(Math.round(expectedCx));

      const expectedY = Math.round(branchY + DH + MERGE_SHORT_LEG + BTN_DIST);
      expect(mergeOverlay!.y).toBe(expectedY);
    });

    it('positions merge overlay between branch leaf bottom and merge target top', () => {
      const branchY = 200;
      const mergeY = 450;

      const nodes = [
        node('cond', 0, 0, 'condition'),
        node('b1', -120, branchY),
        node('b2', 120, branchY),
        node('merge', 0, mergeY),
      ];
      const edges = [
        edge('e1', 'cond', 'b1', 'branch'),
        edge('e2', 'cond', 'b2', 'branch'),
        edge('e3', 'b1', 'merge', 'merge'),
        edge('e4', 'b2', 'merge', 'merge'),
      ];

      const mergeOverlay = computeDingFlowOverlays(nodes, edges).find(
        (o) => o.kind === 'mergeAdd',
      );

      expect(mergeOverlay).toBeDefined();
      expect(mergeOverlay!.y).toBeGreaterThan(branchY + DH);
      expect(mergeOverlay!.y).toBeLessThan(mergeY);
    });

    it('uses custom height from nodeSizeMap for merge Y calculation', () => {
      const nodes = [
        node('cond', 0, 0),
        node('b1', -120, 200),
        node('b2', 120, 200),
        node('merge', 0, 450),
      ];
      const edges = [
        edge('e1', 'cond', 'b1'),
        edge('e2', 'cond', 'b2'),
        edge('e3', 'b1', 'merge'),
        edge('e4', 'b2', 'merge'),
      ];

      const sizeMap = new Map<string, { minWidth?: number; minHeight?: number }>();
      sizeMap.set('task', { minWidth: 220, minHeight: 120 });

      const mergeOverlay = computeDingFlowOverlays(nodes, edges, sizeMap).find(
        (o) => o.kind === 'mergeAdd',
      );

      const expectedY = Math.round(200 + 120 + MERGE_SHORT_LEG + BTN_DIST);
      expect(mergeOverlay!.y).toBe(expectedY);
    });
  });

  describe('full dingtalk-style branch + merge scenario', () => {
    it('produces both addCondition and mergeAdd overlays for a branch group', () => {
      const condY = 0;
      const branchY = 200;
      const continuationY = 400;

      const nodes = [
        node('initiator', 0, -200),
        node('cond', 0, condY, 'condition'),
        node('b1-leaf', -120, branchY),
        node('b2-leaf', 120, branchY),
        node('continuation', 0, continuationY),
        node('end', 0, 600),
      ];

      const edges = [
        edge('chain-1', 'initiator', 'cond', 'chain'),
        edge('branch-1', 'cond', 'b1-leaf', 'branch'),
        edge('branch-2', 'cond', 'b2-leaf', 'branch'),
        edge('merge-1', 'b1-leaf', 'continuation', 'merge'),
        edge('merge-2', 'b2-leaf', 'continuation', 'merge'),
        edge('chain-2', 'continuation', 'end', 'chain'),
      ];

      const overlays = computeDingFlowOverlays(nodes, edges);

      expect(overlays).toHaveLength(2);

      const addCond = overlays.find((o) => o.kind === 'addCondition');
      const mergeAdd = overlays.find((o) => o.kind === 'mergeAdd');

      expect(addCond).toBeDefined();
      expect(addCond!.sourceId).toBe('cond');
      expect(addCond!.y).toBe(Math.round(branchY - BRANCH_SHORT_LEG));

      expect(mergeAdd).toBeDefined();
      expect(mergeAdd!.sourceId).toBe('merge:continuation');
      expect(mergeAdd!.y).toBe(Math.round(branchY + DH + MERGE_SHORT_LEG + BTN_DIST));
    });

    it('places addCondition overlay above the branch targets', () => {
      const branchY = 250;
      const nodes = [
        node('cond', 0, 0, 'condition'),
        node('b1', -120, branchY),
        node('b2', 120, branchY),
        node('cont', 0, 500),
      ];
      const edges = [
        edge('e1', 'cond', 'b1', 'branch'),
        edge('e2', 'cond', 'b2', 'branch'),
        edge('e3', 'b1', 'cont', 'merge'),
        edge('e4', 'b2', 'cont', 'merge'),
      ];

      const addCond = computeDingFlowOverlays(nodes, edges).find(
        (o) => o.kind === 'addCondition',
      );

      expect(addCond!.y).toBeLessThan(branchY);
    });

    it('places mergeAdd overlay below branch leaves and above merge target', () => {
      const branchY = 250;
      const mergeTargetY = 550;
      const nodes = [
        node('cond', 0, 0, 'condition'),
        node('b1', -120, branchY),
        node('b2', 120, branchY),
        node('cont', 0, mergeTargetY),
      ];
      const edges = [
        edge('e1', 'cond', 'b1', 'branch'),
        edge('e2', 'cond', 'b2', 'branch'),
        edge('e3', 'b1', 'cont', 'merge'),
        edge('e4', 'b2', 'cont', 'merge'),
      ];

      const mergeAdd = computeDingFlowOverlays(nodes, edges).find(
        (o) => o.kind === 'mergeAdd',
      );

      expect(mergeAdd!.y).toBeGreaterThan(branchY + DH);
      expect(mergeAdd!.y).toBeLessThan(mergeTargetY);
    });
  });

  describe('nested branch groups', () => {
    it('produces overlays for inner branch group in nested scenario', () => {
      const outerCondY = 0;
      const innerCondY = 200;
      const innerBranchY = 400;
      const innerContY = 600;
      const outerContY = 800;

      const nodes = [
        node('outer-cond', 0, outerCondY, 'condition'),
        node('b1', -200, innerCondY),
        node('inner-cond', 200, innerCondY, 'condition'),
        node('ib1', 120, innerBranchY),
        node('ib2', 280, innerBranchY),
        node('inner-cont', 200, innerContY),
        node('outer-cont', 0, outerContY),
      ];

      const edges = [
        edge('ob1', 'outer-cond', 'b1', 'branch'),
        edge('ob2', 'outer-cond', 'inner-cond', 'branch'),
        edge('ib1', 'inner-cond', 'ib1', 'branch'),
        edge('ib2', 'inner-cond', 'ib2', 'branch'),
        edge('im1', 'ib1', 'inner-cont', 'merge'),
        edge('im2', 'ib2', 'inner-cont', 'merge'),
        edge('om1', 'b1', 'outer-cont', 'merge'),
        edge('om2', 'inner-cont', 'outer-cont', 'merge'),
      ];

      const overlays = computeDingFlowOverlays(nodes, edges);

      const addCondOverlays = overlays.filter((o) => o.kind === 'addCondition');
      const mergeOverlays = overlays.filter((o) => o.kind === 'mergeAdd');

      expect(addCondOverlays).toHaveLength(2);
      const addCondIds = addCondOverlays.map((o) => o.sourceId).sort();
      expect(addCondIds).toEqual(['inner-cond', 'outer-cond']);

      expect(mergeOverlays).toHaveLength(2);
      const mergeTargets = mergeOverlays.map((o) => o.sourceId).sort();
      expect(mergeTargets).toEqual(['merge:inner-cont', 'merge:outer-cont']);
    });

    it('correctly positions inner and outer addCondition overlays', () => {
      const innerBranchY = 400;
      const outerBranchY = 200;

      const nodes = [
        node('outer-cond', 0, 0, 'condition'),
        node('b1', -200, outerBranchY),
        node('inner-cond', 200, outerBranchY, 'condition'),
        node('ib1', 120, innerBranchY),
        node('ib2', 280, innerBranchY),
        node('cont', 0, 600),
      ];

      const edges = [
        edge('ob1', 'outer-cond', 'b1', 'branch'),
        edge('ob2', 'outer-cond', 'inner-cond', 'branch'),
        edge('ib1', 'inner-cond', 'ib1', 'branch'),
        edge('ib2', 'inner-cond', 'ib2', 'branch'),
        edge('m1', 'b1', 'cont', 'merge'),
        edge('m2', 'ib1', 'cont', 'merge'),
        edge('m3', 'ib2', 'cont', 'merge'),
      ];

      const overlays = computeDingFlowOverlays(nodes, edges);
      const outerAdd = overlays.find((o) => o.sourceId === 'outer-cond');
      const innerAdd = overlays.find((o) => o.sourceId === 'inner-cond');

      expect(outerAdd!.y).toBe(Math.round(outerBranchY - BRANCH_SHORT_LEG));
      expect(innerAdd!.y).toBe(Math.round(innerBranchY - BRANCH_SHORT_LEG));

      expect(innerAdd!.y).toBeGreaterThan(outerAdd!.y);
    });
  });

  describe('continuation after merge', () => {
    it('merge target can have a chain child without extra overlays', () => {
      const nodes = [
        node('cond', 0, 0, 'condition'),
        node('b1', -120, 200),
        node('b2', 120, 200),
        node('merge', 0, 400),
        node('end', 0, 600),
      ];

      const edges = [
        edge('e1', 'cond', 'b1', 'branch'),
        edge('e2', 'cond', 'b2', 'branch'),
        edge('e3', 'b1', 'merge', 'merge'),
        edge('e4', 'b2', 'merge', 'merge'),
        edge('e5', 'merge', 'end', 'chain'),
      ];

      const overlays = computeDingFlowOverlays(nodes, edges);

      expect(overlays).toHaveLength(2);

      const kinds = overlays.map((o) => o.kind).sort();
      expect(kinds).toEqual(['addCondition', 'mergeAdd']);
    });

    it('merge target can fan out again as a new branch source', () => {
      const nodes = [
        node('cond1', 0, 0, 'condition'),
        node('b1', -120, 200),
        node('b2', 120, 200),
        node('cond2', 0, 400, 'condition'),
        node('b3', -120, 600),
        node('b4', 120, 600),
        node('end', 0, 800),
      ];

      const edges = [
        edge('e1', 'cond1', 'b1', 'branch'),
        edge('e2', 'cond1', 'b2', 'branch'),
        edge('e3', 'b1', 'cond2', 'merge'),
        edge('e4', 'b2', 'cond2', 'merge'),
        edge('e5', 'cond2', 'b3', 'branch'),
        edge('e6', 'cond2', 'b4', 'branch'),
        edge('e7', 'b3', 'end', 'merge'),
        edge('e8', 'b4', 'end', 'merge'),
      ];

      const overlays = computeDingFlowOverlays(nodes, edges);

      const addCondOverlays = overlays.filter((o) => o.kind === 'addCondition');
      const mergeOverlays = overlays.filter((o) => o.kind === 'mergeAdd');

      expect(addCondOverlays).toHaveLength(2);
      expect(mergeOverlays).toHaveLength(2);

      const addCondSources = addCondOverlays.map((o) => o.sourceId).sort();
      expect(addCondSources).toEqual(['cond1', 'cond2']);

      const mergeTargets = mergeOverlays.map((o) => o.sourceId).sort();
      expect(mergeTargets).toEqual(['merge:cond2', 'merge:end']);
    });

    it('merge overlay y is based on the first incoming source node height', () => {
      const branchAY = 200;
      const branchBY = 300;

      const nodes = [
        node('cond', 0, 0, 'condition'),
        node('b1', -120, branchAY),
        node('b2', 120, branchBY),
        node('cont', 0, 500),
      ];

      const edges = [
        edge('e1', 'cond', 'b1', 'branch'),
        edge('e2', 'cond', 'b2', 'branch'),
        edge('e3', 'b1', 'cont', 'merge'),
        edge('e4', 'b2', 'cont', 'merge'),
      ];

      const mergeOverlay = computeDingFlowOverlays(nodes, edges).find(
        (o) => o.kind === 'mergeAdd',
      );

      const expectedY = Math.round(branchAY + DH + MERGE_SHORT_LEG + BTN_DIST);
      expect(mergeOverlay!.y).toBe(expectedY);
    });
  });

  describe('edge cases', () => {
    it('skips overlays when source/target node is missing from node map', () => {
      const nodes = [node('b1', 0, 200), node('b2', 200, 200)];
      const edges = [
        edge('e1', 'missing-source', 'b1'),
        edge('e2', 'missing-source', 'b2'),
        edge('e3', 'b1', 'missing-target'),
        edge('e4', 'b2', 'missing-target'),
      ];

      expect(computeDingFlowOverlays(nodes, edges)).toEqual([]);
    });

    it('skips overlays when first target node in source group is missing', () => {
      const nodes = [node('cond', 0, 0, 'condition')];
      const edges = [
        edge('e1', 'cond', 'missing-a'),
        edge('e2', 'cond', 'missing-b'),
      ];

      expect(computeDingFlowOverlays(nodes, edges)).toEqual([]);
    });

    it('handles nodes with no edges', () => {
      const nodes = [node('a', 0, 0), node('b', 200, 0)];
      expect(computeDingFlowOverlays(nodes, [])).toEqual([]);
    });

    it('produces stable overlay ids', () => {
      const nodes = [
        node('cond', 0, 0, 'condition'),
        node('b1', -120, 200),
        node('b2', 120, 200),
        node('cont', 0, 400),
      ];
      const edges = [
        edge('e1', 'cond', 'b1', 'branch'),
        edge('e2', 'cond', 'b2', 'branch'),
        edge('e3', 'b1', 'cont', 'merge'),
        edge('e4', 'b2', 'cont', 'merge'),
      ];

      const o1 = computeDingFlowOverlays(nodes, edges);
      const o2 = computeDingFlowOverlays(nodes, edges);

      expect(o1.map((o) => o.id)).toEqual(o2.map((o) => o.id));
    });
  });
});
