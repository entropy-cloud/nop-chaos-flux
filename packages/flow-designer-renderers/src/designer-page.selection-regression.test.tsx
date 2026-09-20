import React from 'react';
import { describe, expect, it } from 'vitest';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import {
  basicTestRendererDefinitions,
  createRendererEnv,
  createTestConfig,
  formulaCompiler,
  installFlowDesignerTestHooks,
} from './index-test-support.js';
import { flowDesignerRendererDefinitions } from './index.js';

installFlowDesignerTestHooks();

const actionButtonRenderer = {
  type: 'action-button',
  component: (props: { props: { label?: string }; events: { onClick?: () => void } }) => (
    <button type="button" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? 'Action')}
    </button>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
} as RendererDefinition;

// 回归：外部入口（摘要面板/工具条命令）触发 selectNode/selectEdge 后，core → RF 推送
// 与 RF 用户 select 变更上报两条链路互相覆盖曾形成乒乓（Maximum update depth exceeded，
// designer-summary spec 复现）。选择上报只允许走 select 类 change（用户交互），不走
// onSelectionChange 滞后回声——本用例锁定该行为。
describe('DesignerPageRenderer selection sync regression', () => {
  it('external selectNode/selectEdge commands do not trigger a selection update storm', async () => {
    const SchemaRenderer = createSchemaRenderer([
      ...basicTestRendererDefinitions,
      ...flowDesignerRendererDefinitions,
      actionButtonRenderer,
    ]);

    const { container, getByRole } = render(
      <SchemaRenderer
        schemaUrl="test://flow/selection-sync-regression"
        schema={{
          type: 'designer-page',
          document: {
            id: 'graph-selection',
            kind: 'flow',
            name: 'Selection Sync',
            version: '1.0',
            nodes: [
              { id: 'start-1', type: 'task', position: { x: 80, y: 160 }, data: { label: 'Start' } },
              { id: 'task-1', type: 'task', position: { x: 320, y: 160 }, data: { label: 'Send Email' } },
              { id: 'end-1', type: 'end', position: { x: 560, y: 160 }, data: { label: 'End' } },
            ],
            edges: [
              { id: 'edge-start-task', type: 'default', source: 'start-1', target: 'task-1', data: {} },
              { id: 'edge-task-end', type: 'default', source: 'task-1', target: 'end-1', data: {} },
            ],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
          config: createTestConfig(),
          toolbar: [
            {
              type: 'action-button',
              label: 'pick task',
              onClick: { action: 'designer:selectNode', args: { nodeId: 'task-1' } },
            },
            {
              type: 'action-button',
              label: 'pick start',
              onClick: { action: 'designer:selectNode', args: { nodeId: 'start-1' } },
            },
            {
              type: 'action-button',
              label: 'pick edge',
              onClick: { action: 'designer:selectEdge', args: { edgeId: 'edge-task-end' } },
            },
          ],
        }}
        env={createRendererEnv() as RendererEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(
      () => {
        expect(container.querySelectorAll('.react-flow__node')).toHaveLength(3);
      },
      { timeout: 5000 },
    );

    const pickTask = getByRole('button', { name: 'pick task' });
    const pickStart = getByRole('button', { name: 'pick start' });
    const pickEdge = getByRole('button', { name: 'pick edge' });

    fireEvent.click(pickTask);
    await waitFor(() => {
      expect(container.querySelector('[data-id="task-1"]')?.classList.contains('selected')).toBe(true);
    });

    fireEvent.click(pickStart);
    await waitFor(() => {
      expect(container.querySelector('[data-id="start-1"]')?.classList.contains('selected')).toBe(true);
      expect(container.querySelector('[data-id="task-1"]')?.classList.contains('selected')).toBe(false);
    });

    // happy-dom 不渲染 RF 边元素（handleBounds 需真实布局），selectEdge 只断言
    // 不触发更新风暴/崩溃——画布仍挂载、节点不丢。
    fireEvent.click(pickEdge);
    await waitFor(() => {
      expect(container.querySelectorAll('.react-flow__node')).toHaveLength(3);
    });

    fireEvent.click(pickTask);
    await waitFor(() => {
      expect(container.querySelector('[data-id="task-1"]')?.classList.contains('selected')).toBe(true);
      expect(container.querySelector('[data-id="start-1"]')?.classList.contains('selected')).toBe(false);
    });
  });
});
