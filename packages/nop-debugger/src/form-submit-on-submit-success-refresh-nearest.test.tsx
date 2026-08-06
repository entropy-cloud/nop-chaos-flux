import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createNopDebugger } from './index.js';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import type { RendererEnv } from '@nop-chaos/flux-core';

/**
 * 验证 dialog form submit → onSubmitSuccess → refreshNearest 的调用链。
 *
 * 用 nop-debugger 记录 action 执行过程，验证 onSubmitSuccess 回调
 * 是否触发 closeSurface 和 refreshNearest。
 *
 * 注：本测试原位于 flux-renderers-form（imports @nop-chaos/nop-debugger 构成
 * 双向 devDep 环，turbo build 图检测循环），2026-08-06 随 0529-1 Phase 1 移至
 * nop-debugger 包（nop-debugger 已声明 devDep on form，方向单向无环）。
 */
describe('form submit → onSubmitSuccess → refreshNearest', () => {
  it('submitForm fires but onSubmitSuccess (closeSurface/refreshNearest) does not trigger', async () => {
    cleanup();

    const ctrl = createNopDebugger({
      id: 'submit-refresh-test',
      enabled: true,
      exposeAutomationApi: true,
    });

    const baseEnv: RendererEnv = {
      async fetcher<T>() {
        return { ok: true, status: 200, data: null as T };
      },
      notify() {
        return undefined;
      },
    };
    const env = ctrl.decorateEnv(baseEnv);

    const SchemaRenderer = createSchemaRenderer([
      ...basicRendererDefinitions,
      ...formRendererDefinitions,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://submit-refresh"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open Dialog',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'Edit Form',
                  body: {
                    type: 'form',
                    id: 'edit-form',
                    submitScope: 'surface',
                    submitAction: {
                      action: 'ajax',
                      args: {
                        url: '/api/save',
                        method: 'post',
                        data: { name: 'test' },
                      },
                    },
                    body: [
                      { type: 'input-text', name: 'name', label: 'Name', required: false },
                      {
                        type: 'button',
                        label: '确定',
                        level: 'primary',
                        onClick: {
                          action: 'submitForm',
                          then: { action: 'closeSurface' },
                        },
                      },
                    ],
                    data: { name: 'Alice' },
                  },
                  onSubmitSuccess: [
                    { action: 'refreshNearest' },
                  ],
                },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
        plugins={[ctrl.plugin]}
        onRuntimeChange={(rt) => ctrl.setRuntime(rt)}
        onComponentRegistryChange={(reg) => ctrl.setComponentRegistry(reg)}
        onActionScopeChange={(scope) => ctrl.setActionScope(scope)}
        onActionError={(err, ctx) => ctrl.onActionError(err, ctx)}
      />,
    );

    // 打开 dialog
    fireEvent.click(screen.getByText('Open Dialog'));
    expect(await screen.findByText('Edit Form')).toBeTruthy();

    await waitFor(() => {
      expect(
        ctrl.getLatestEvent({ kind: 'action:start', actionType: 'openDialog' }),
      ).toBeDefined();
    });

    // 填写表单并提交
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'Alice' } });
    fireEvent.click(screen.getByText('确定'));
    await new Promise(r => setTimeout(r, 2000));

    // 检查 action 链
    const actionEvents = ctrl.queryEvents({ kind: 'action:start' });
    const actionLog = actionEvents.map(e => e.actionType).join(' → ');
    console.log('Action chain:', actionLog);

    // submitForm 应触发
    expect(actionEvents.some(e => e.actionType === 'submitForm')).toBe(true);

    // submitForm + then: closeSurface 工作正常
    expect(actionEvents.some(e => e.actionType === 'closeSurface')).toBe(true);

    // refreshNearest 通过 onSubmitSuccess 的 surface hook 触发
    expect(actionEvents.some(e => e.actionType === 'refreshNearest')).toBe(true);
  });
});
