import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { Button, toast, Toaster } from '@nop-chaos/ui';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';

interface M2TouchDemoPageProps {
  onBack: () => void;
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);

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
          type: 'text',
          text: '### M2a input 族（inputmode + font-size ≥16px + focus scrollIntoView）\nmobile 视口下：input-email → inputmode=email、input-number → inputmode=decimal、font-size 16px 防 iOS 缩放、focus 时滚动到视口中央。',
        },
        {
          type: 'form',
          data: {
            email: '',
            phone: '',
            count: 1,
            notes: '',
          },
          body: [
            { type: 'input-email', name: 'email', label: 'Email', placeholder: 'inputmode=email' },
            {
              type: 'input-text',
              name: 'phone',
              label: 'Phone',
              inputMode: 'tel',
              placeholder: 'schema inputMode=tel 覆盖',
            },
            { type: 'input-number', name: 'count', label: 'Count', placeholder: 'inputmode=decimal' },
            {
              type: 'textarea',
              name: 'notes',
              label: 'Notes',
              placeholder: 'font-size ≥16px + scrollIntoView',
            },
          ],
        },
      ],
    },
    {
      type: 'container',
      body: [
        {
          type: 'text',
          text: '### M2b checkbox / radio / switch（触摸目标 ≥44px + nop-haptic + 小屏纵列）\nmobile 视口下每个选项 hit area ≥44px；checkbox-group/radio-group 选项 >3 时自动纵列。',
        },
        {
          type: 'form',
          data: { agree: false, notify: false, color: '', perms: [] },
          body: [
            {
              type: 'checkbox',
              name: 'agree',
              label: 'Agree',
              option: { label: 'I accept the terms and privacy policy' },
            },
            { type: 'switch', name: 'notify', label: 'Notifications' },
            {
              type: 'radio-group',
              name: 'color',
              label: 'Color',
              options: [
                { label: 'Red', value: 'red' },
                { label: 'Green', value: 'green' },
                { label: 'Blue', value: 'blue' },
                { label: 'Yellow', value: 'yellow' },
              ],
            },
            {
              type: 'checkbox-group',
              name: 'perms',
              label: 'Permissions',
              options: [
                { label: 'Read', value: 'read' },
                { label: 'Write', value: 'write' },
                { label: 'Delete', value: 'delete' },
                { label: 'Admin', value: 'admin' },
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
          type: 'text',
          text: '### M2c button（触摸目标 ≥44px + schema block）\nmobile 视口下 default/lg size button min-height 44px；block 由 schema 驱动（不自动 block）。',
        },
        {
          type: 'flex',
          direction: 'row',
          gap: 2,
          body: [
            { type: 'button', label: 'Default', testid: 'm2-btn-default' },
            { type: 'button', label: 'Primary', variant: 'default', size: 'lg', testid: 'm2-btn-lg' },
            { type: 'button', label: 'Small', size: 'sm', testid: 'm2-btn-sm' },
          ],
        },
        { type: 'button', label: 'Block Submit', block: true, testid: 'm2-btn-block' },
      ],
    },
  ],
};

export function M2TouchDemoPage({ onBack }: M2TouchDemoPageProps) {
  const schema = useMemo(() => SCHEMA, []);

  return (
    <main className="min-h-screen p-6">
      <Button variant="outline" onClick={onBack} className="mb-4">
        Back to Home
      </Button>
      <p className="mb-3 uppercase tracking-[0.16em] text-xs text-muted-foreground">
        Mobile Touch Adaptation (M2)
      </p>
      <h1 className="m-0 mb-2">M2 表单控件触摸适配 — input / textarea / checkbox / radio / switch / button</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        本页通过单个 <code>SchemaRenderer</code> 渲染真实 M2 改造组件。在浏览器 DevTools
        设备模拟器中切换视口：<strong> &lt; 768px </strong>触发 mobile 分支（input 正确
        inputmode + font-size 16px + focus scrollIntoView、checkbox/radio/switch hit area
        ≥44px + 小屏纵列、button min-height 44px）；<strong> ≥ 768px </strong>走桌面分支（行为不变）。
      </p>

      <div data-testid="m2-schema-root">
        <SchemaRenderer
          schemaUrl="playground://m2-touch"
          schema={schema as React.ComponentProps<typeof SchemaRenderer>['schema']}
          env={env}
          formulaCompiler={formulaCompiler}
        />
      </div>

      <Toaster />
    </main>
  );
}
