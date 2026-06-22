import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, toast, Toaster } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';

interface M1ResponsiveDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: (level, message) => {
    const text = typeof message === 'string' ? message : String(message ?? '');
    if (level === 'error') toast.error(text || 'Error');
    else if (level === 'success') toast.success(text || 'Success');
    else if (level === 'warning') toast.warning?.(text || 'Warning');
    else toast.info?.(text || 'Info');
  },
};

const SCHEMA = {
  type: 'page',
  body: [
    {
      type: 'container',
      body: [
        {
          type: 'form',
          data: { role: '', department: '' },
          body: [
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              clearable: true,
              searchable: true,
              options: [
                { label: 'Admin', value: 'admin' },
                { label: 'Editor', value: 'editor' },
                { label: 'Viewer', value: 'viewer' },
                { label: 'Guest', value: 'guest' },
              ],
            },
            {
              type: 'tree-select',
              name: 'department',
              label: 'Department',
              options: [
                {
                  label: 'Engineering',
                  value: 'eng',
                  children: [
                    { label: 'Platform', value: 'platform' },
                    { label: 'Frontend', value: 'frontend' },
                  ],
                },
                { label: 'Sales', value: 'sales' },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'container',
      body: [
        {
          type: 'table',
          responsive: { mode: 'expand', breakpoint: 'md' },
          columns: [
            { label: 'Name', name: 'name' },
            { label: 'Email', name: 'email' },
            { label: 'Phone', name: 'phone' },
            { label: 'City', name: 'city' },
          ],
          source: [
            { id: 1, name: 'Alice', email: 'alice@ex.com', phone: '555-0100', city: 'Beijing' },
            { id: 2, name: 'Bob', email: 'bob@ex.com', phone: '555-0101', city: 'Shanghai' },
          ],
        },
      ],
    },
    {
      type: 'container',
      body: [
        {
          type: 'button',
          label: 'Open Dialog',
          onClick: {
            action: 'openDialog',
            args: {
              title: 'M1 Dialog',
              body: [{ type: 'text', text: 'mobile 视口下此 dialog 自动全屏覆盖。' }],
            },
          },
        },
        {
          type: 'button',
          label: 'Open Drawer',
          onClick: {
            action: 'openDrawer',
            args: {
              title: 'M1 Drawer',
              side: 'right',
              body: [{ type: 'text', text: 'mobile 视口下此 drawer 切换为底部滑入。' }],
            },
          },
        },
      ],
    },
    {
      type: 'container',
      body: [
        {
          type: 'tabs',
          items: [
            { key: 'overview', title: 'Overview', body: [{ type: 'text', text: 'Overview 内容' }] },
            { key: 'activity', title: 'Activity', body: [{ type: 'text', text: 'Activity 内容' }] },
            { key: 'settings', title: 'Settings', body: [{ type: 'text', text: 'Settings 内容' }] },
            { key: 'audit', title: 'Audit Log', body: [{ type: 'text', text: 'Audit 内容' }] },
          ],
        },
      ],
    },
  ],
};

export function M1ResponsiveDemoPage({ onBack }: M1ResponsiveDemoPageProps) {
  const schema = useMemo(() => SCHEMA, []);

  return (
    <main className="min-h-screen p-6">
      <Button variant="outline" onClick={onBack} className="mb-4">
        Back to Home
      </Button>
      <p className="mb-3 uppercase tracking-[0.16em] text-xs text-muted-foreground">
        Mobile Responsive (M1)
      </p>
      <h1 className="m-0 mb-2">
        M1 高频交互控件响应式 — select / tree-select / table / dialog / drawer / tabs
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        本页通过单个 <code>SchemaRenderer</code> 渲染真实 M1 改造组件。在浏览器 DevTools
        设备模拟器中切换视口：<strong> &lt; 768px </strong>触发 mobile 分支（select 走底部 Sheet、dialog
        全屏、drawer 底部、tabs swipe、table 卡片堆叠）；<strong> ≥ 768px </strong>走桌面分支（行为不变）。
      </p>

      <div data-testid="m1-schema-root">
        <SchemaRenderer
          schemaUrl="playground://m1-responsive"
          schema={schema as React.ComponentProps<typeof SchemaRenderer>['schema']}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </div>

      <Toaster />
    </main>
  );
}
