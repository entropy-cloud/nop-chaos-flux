import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { Button } from '@nop-chaos/ui';

const longNote =
  'This is a long note that would normally blow out the column width. The popOver trigger lets the user inspect the full content on demand without forcing a wide column.';

const schema = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'column',
      gap: 'lg',
      body: [
        {
          type: 'text',
          tag: 'h2',
          text: 'popOver — click trigger + content region',
        },
        {
          type: 'text',
          text: 'Click the info icon next to a cell to open the popOver with extended content (schema-driven region).',
        },
        {
          type: 'table',
          source: '${rows}',
          columns: [
            { label: 'ID', name: 'id', width: 60 },
            { label: 'Name', name: 'name', width: 120 },
            {
              label: 'Note',
              name: 'note',
              width: 160,
              popOver: {
                trigger: 'click',
                placement: 'right',
                title: 'Note details',
                content: [
                  {
                    type: 'container',
                    body: [
                      {
                        type: 'text',
                        tag: 'p',
                        text: 'ID: ${$slot.record.id} — ${$slot.record.name}',
                      },
                      { type: 'text', tag: 'p', text: '${$slot.record.note}' },
                      {
                        type: 'badge',
                        text: '${$slot.record.status}',
                        level: 'info',
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
        {
          type: 'text',
          tag: 'h2',
          text: 'popOver — coexists with copyable icon',
        },
        {
          type: 'table',
          source: '${rows}',
          columns: [
            { label: 'ID', name: 'id', width: 60 },
            {
              label: 'Email',
              name: 'email',
              copyable: true,
              popOver: {
                trigger: 'click',
                placement: 'top',
                content: [
                  {
                    type: 'container',
                    body: [
                      { type: 'text', tag: 'p', text: 'Email: ${$slot.record.email}' },
                      { type: 'text', tag: 'p', text: 'Status: ${$slot.record.status}' },
                    ],
                  },
                ],
              },
            },
          ],
        },
        {
          type: 'text',
          tag: 'h2',
          text: 'popOver — onEmpty=show with emptyText fallback',
        },
        {
          type: 'table',
          source: '${emptyRows}',
          columns: [
            { label: 'ID', name: 'id', width: 60 },
            {
              label: 'Description',
              name: 'description',
              popOver: {
                trigger: 'click',
                placement: 'bottom',
                onEmpty: 'show',
                emptyText: 'No description available for this row',
              },
            },
          ],
        },
      ],
    },
  ],
} as any;

const rows = [
  { id: 1, name: 'Alice', email: 'alice@example.com', note: longNote, status: 'active' },
  { id: 2, name: 'Bob', email: 'bob@example.com', note: 'Short note', status: 'pending' },
  { id: 3, name: 'Carol', email: 'carol@example.com', note: '', status: 'inactive' },
];

const emptyRows = [
  { id: 1, description: '' },
  { id: 2, description: '' },
];

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const pageEnv: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify(level, message) {
    console.info(`[table-popover-demo] ${level}: ${message}`);
  },
};

interface TablePopOverDemoPageProps {
  onBack: () => void;
}

export function TablePopOverDemoPage({ onBack }: TablePopOverDemoPageProps) {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[1000px] w-full p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <Button
          variant="outline"
          className="mb-[18px] px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]"
          onClick={onBack}
        >
          Back to Home
        </Button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
          Table popOver Cell (E3)
        </p>
        <h1 className="m-0 mb-4">table popOver 单元格（详情弹层）</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-2">
          演示 <code>table</code> 列级 <code>popOver</code>：cell 旁渲染触发图标，点击后浮层显示该 cell
          的扩展信息（schema-driven region，支持任意嵌套结构）。包含 <code>trigger:'click'</code> + 自定义
          content region、与 <code>copyable</code> icon 共存、以及 <code>onEmpty:'show'</code> 空值兜底。
        </p>
        <div className="mt-8">
          <SchemaRenderer
            schemaUrl="playground://pages/table-popover-demo"
            schema={schema}
            env={pageEnv}
            registry={registry as any}
            formulaCompiler={formulaCompiler}
            data={{ rows, emptyRows }}
          />
        </div>
      </section>
    </main>
  );
}
