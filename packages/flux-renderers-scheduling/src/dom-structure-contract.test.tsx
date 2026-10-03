import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, assertRendererRootAnchors } from '@nop-chaos/flux-react';
import { schedulingRendererDefinitions } from './scheduling-renderer-definitions.js';

afterEach(cleanup);

const formulaCompiler = createFormulaCompiler();

function createRenderer() {
  // gantt 默认列 region 渲染 text 子节点，需与既有集成测试一致地注册 text
  return createSchemaRenderer([
    ...schedulingRendererDefinitions,
    {
      type: 'text',
      displayName: 'Text',
      category: 'basic',
      sourcePackage: 'test-host',
      defaultSchema: { type: 'text' },
      component: (props: { props: { text?: unknown } }) => <>{String(props.props.text ?? '')}</>,
    },
  ] as never);
}

function renderSchema(schema: Record<string, unknown>) {
  const SchemaRenderer = createRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://dom-structure-contract-scheduling"
      schema={schema as never}
      env={{
        fetcher: async function <T>() {
          return { status: 0, data: null as T };
        },
        notify: () => undefined,
      }}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('scheduling dom-structure contract (canvas a11y + root anchors, plan 535)', () => {
  it('gantt canvas root: role=application + i18n aria-label + anchor triple; layout layer no duplicate root class', () => {
    const { container } = renderSchema({
      type: 'gantt',
      tasks: [
        { id: 't1', text: 'Design API', start: '2026-01-01', end: '2026-01-10' },
        { id: 't2', text: 'Implement API', start: '2026-01-11', end: '2026-01-20' },
      ],
      links: [{ id: 'l1', source: 't1', target: 't2', type: 'finish_to_start' }],
    });
    const root = container.querySelector('[data-slot="gantt"]')!;
    expect(root).toBeTruthy();
    // D6 断言：gantt 的画布语义由既有键盘 a11y 层以命令式落
    // （use-gantt-keyboard.ts:139-142：role=grid + tabindex + chartLabel——
    // 表格语义比 application 更精确），命令式层晚于 JSX 提交，二者不双写。
    expect(root.getAttribute('role')).toBe('grid');
    expect(root.getAttribute('aria-label') || '').not.toBe('');
    assertRendererRootAnchors(root, { type: 'gantt' });
    // gantt-layout 容器不得重复根标记
    expect(container.querySelectorAll('.nop-gantt').length).toBe(1);
    expect(container.querySelector('[data-slot="gantt-layout"]')).toBeTruthy();
  });

  it('kanban canvas root: role=application + i18n aria-label + anchor triple', () => {
    const { container } = renderSchema(
      {
        type: 'kanban',
        draggable: false,
        columnDraggable: false,
        data: {
          root: { id: 'root', type: 'root', children: ['col1'], data: {}, meta: {} },
          col1: {
            id: 'col1', type: 'column', parentId: 'root', children: ['card1'],
            data: { title: 'Backlog' }, meta: {},
          },
          card1: {
            id: 'card1', type: 'card', parentId: 'col1', children: [],
            data: { title: 'Task A' }, meta: {},
          },
        },
      },
    );
    const root = container.querySelector('[data-slot="kanban"]')!;
    expect(root).toBeTruthy();
    expect(root.getAttribute('role')).toBe('application');
    expect(root.getAttribute('aria-label') || '').not.toBe('');
    assertRendererRootAnchors(root, { type: 'kanban' });
  });

  it('calendar canvas root: role=application + i18n aria-label + anchor triple', () => {
    const { container } = renderSchema(
      {
        type: 'calendar',
        view: 'month',
        date: '2026-07-01',
        events: [
          { id: 'e1', title: 'Shift', start: '2026-07-21T08:00:00', end: '2026-07-21T16:00:00', type: 'shift', resourceId: 'r1' },
        ],
        resources: [{ id: 'r1', title: 'Team A' }],
      },
    );
    const root = container.querySelector('[data-slot="calendar"]')!;
    expect(root).toBeTruthy();
    expect(root.getAttribute('role')).toBe('application');
    expect(root.getAttribute('aria-label') || '').not.toBe('');
    assertRendererRootAnchors(root, { type: 'calendar' });
  });
});
