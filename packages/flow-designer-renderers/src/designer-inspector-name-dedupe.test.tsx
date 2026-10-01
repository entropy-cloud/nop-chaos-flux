/**
 * ux-r7 FD-6/TF-2 名称身份去重测试：
 * - nodeType inspector schema 含名称身份字段（name==='label' 或 `*.name`）→ 内建"名称"字段跳过；
 * - schema 无名称身份字段 → 内建"名称"保留（唯一名称编辑器）。
 * 断言面 = DOM 中绑定 label 的文本输入个数（先红：去重前为 2）。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, render } from '@testing-library/react';

const mockState: {
  context: {
    dispatch: ReturnType<typeof vi.fn>;
    [key: string]: unknown;
  };
  snapshot: Record<string, unknown>;
} = {
  context: {} as never,
  snapshot: {},
};

vi.mock('./designer-context', async () => {
  const actual = await vi.importActual<typeof import('./designer-context')>('./designer-context');
  return {
    ...actual,
    useDesignerContext: () => mockState.context,
    useDesignerFullSnapshot: () => mockState.snapshot,
    useDesignerSnapshotSelector: (selector: (snapshot: Record<string, unknown>) => unknown) =>
      selector(mockState.snapshot),
    useNodeTypeConfig: (typeId: string) =>
      mockState.context.config.nodeTypes.find((nodeType: { id: string }) => nodeType.id === typeId),
  };
});

vi.mock('./designer-icon', () => ({
  DesignerIcon: () => null,
}));

vi.mock('@nop-chaos/flux-react', () => ({
  useCurrentComponentRegistry: () => undefined,
  useSchemaProps: (props: { props: Record<string, unknown> }) => props.props,
}));

import { DefaultInspector } from './designer-inspector.js';

function setup(nodeTypeConfig: Record<string, unknown> | null) {
  mockState.snapshot = {
    doc: { name: 'Flow', nodes: [{ id: 'n1' }], edges: [] },
    activeNode: {
      id: 'n1',
      type: 'custom',
      data: { label: 'Node', description: '' },
      position: { x: 0, y: 0 },
    },
    activeEdge: null,
    activeBranch: null,
    selection: { selectedNodeIds: ['n1'], selectedEdgeIds: [], activeNodeId: 'n1', activeEdgeId: null, activeBranchId: null },
    canUndo: false,
    canRedo: false,
    isDirty: false,
    gridEnabled: true,
  } as Record<string, unknown>;
  mockState.context = {
    config: {
      toolbar: { items: [] },
      palette: { groups: [] },
      nodeTypes: nodeTypeConfig ? [nodeTypeConfig] : [],
    },
    dispatch: vi.fn(),
    openCreateDialog: vi.fn(),
    designerScope: { materializeVisible: () => mockState.snapshot },
    core: { subscribe: () => () => {}, getSnapshot: () => mockState.snapshot },
  } as never;
}

function builtinNameInputCount(container: HTMLElement): number {
  // 内建"名称"输入绑定 data.label；schema 字段经 renderSchema 渲染（本 harness 未提供 → 只渲染内建）
  return container.querySelectorAll('input[type="text"]').length;
}

describe('DefaultInspector 名称身份去重（ux-r7 FD-6/TF-2）', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  it('schema 含 name=label 字段时跳过内建名称字段（FD-6，workflow 形态）', () => {
    setup({
      id: 'custom',
      inspector: {
        body: {
          type: 'stack',
          items: [{ type: 'field', name: 'label', label: '名称' }],
        },
      },
    });
    const { container } = render(<DefaultInspector />);
    // renderSchema 未提供 → schema 自身不渲染；内建名称字段应被去重跳过 → 0 个内建输入
    expect(builtinNameInputCount(container)).toBe(0);
  });

  it('schema 含 *.name 字段时跳过内建名称字段（TF-2，taskflow step.common.name 形态）', () => {
    setup({
      id: 'custom',
      inspector: {
        body: {
          type: 'stack',
          items: [{ type: 'field', name: 'step.common.name', label: 'Name' }],
        },
      },
    });
    const { container } = render(<DefaultInspector />);
    expect(builtinNameInputCount(container)).toBe(0);
  });

  it('schema 无名称身份字段时保留内建名称（唯一名称编辑器）', () => {
    setup({
      id: 'custom',
      inspector: {
        body: {
          type: 'stack',
          items: [{ type: 'field', name: 'config.retries', label: 'Retries' }],
        },
      },
    });
    const { container } = render(<DefaultInspector />);
    expect(builtinNameInputCount(container)).toBe(1);
  });

  it('无自定义 inspector 时保留内建名称', () => {
    setup(null);
    const { container } = render(<DefaultInspector />);
    expect(builtinNameInputCount(container)).toBe(1);
  });
});
