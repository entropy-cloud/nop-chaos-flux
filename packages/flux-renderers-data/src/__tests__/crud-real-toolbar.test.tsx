import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

const realToolbar = [
  {
    type: 'button',
    id: 'add-button',
    icon: 'fa fa-plus pull-left',
    label: '新增',
    level: 'primary',
    onClick: {
      action: 'openDialog',
      args: {
        type: 'page',
        size: 'md',
        title: '新增-往来单位',
        body: { type: 'form', name: 'add', body: [{ name: 'code', label: '编码', type: 'input-text' }] },
      },
    },
  },
  {
    type: 'button',
    id: 'batch-delete-button',
    batch: true,
    label: '批量删除',
    onClick: {
      action: 'confirm',
      args: { message: '确认删除选中的记录吗？' },
      then: [{ action: 'ajax', args: { url: '@mutation:ErpMdPartner__batchDelete?ids=${ids}' } }],
    },
  },
  {
    type: 'button',
    id: 'batch-active-button',
    batch: true,
    icon: 'fa fa-check-circle-o',
    label: '批量启用',
    level: 'success',
    onClick: {
      action: 'confirm',
      args: { message: '确认批量启用选中的往来单位？' },
      then: [{ action: 'ajax', args: { url: '@mutation:ErpMdPartner__batchUpdate', data: { ids: '${ids | split:\',\'}' } } }],
    },
  },
  {
    type: 'button',
    id: 'batch-inactive-button',
    batch: true,
    icon: 'fa fa-pause-circle-o',
    label: '批量停用',
    level: 'warning',
    onClick: {
      action: 'confirm',
      args: { message: '确认批量停用选中的往来单位？' },
      then: [{ action: 'ajax', args: { url: '@mutation:ErpMdPartner__batchUpdate' } }],
    },
  },
];

describe('CRUD toolbar from real backend schema', () => {
  it('renders all four toolbar buttons with correct labels', async () => {
    cleanup();
    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-real-toolbar"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'crud-grid',
              name: 'crud-grid',
              rowKey: 'id',
              source: [{ id: '1', name: 'Alice' }],
              toolbar: realToolbar,
              columns: [{ name: 'name', label: '姓名' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const buttons = Array.from(document.querySelectorAll('[data-slot="crud-toolbar-main"] button'));
    expect(buttons.length).toBe(4);
    expect(screen.getByText('新增')).toBeTruthy();
    expect(screen.getByText('批量删除')).toBeTruthy();
    expect(screen.getByText('批量启用')).toBeTruthy();
    expect(screen.getByText('批量停用')).toBeTruthy();
  });
});
