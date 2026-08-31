import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { Button } from '@nop-chaos/ui';

// Column-width strategy host fixture (plan 2026-08-09-1140-1):
// - Table 1: default table — data columns WITHOUT explicit width, no control
//   columns. The w-full table must fill the container (sum of header cell
//   widths === table width), i.e. no-width columns must stay stretchable.
// - Table 2: rowSelection WITHOUT any fixed column — the selection control
//   column must stay pinned at 40px even though it is not sticky.
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
          text: 'Table 1 — default table, no explicit widths',
        },
        {
          type: 'table',
          testid: 'width-default-auto',
          source: '${rows}',
          columns: [
            { label: 'ID', name: 'id' },
            { label: 'Name', name: 'name' },
            { label: 'Email', name: 'email' },
            { label: 'Role', name: 'role' },
            { label: 'Status', name: 'status' },
          ],
        },
        {
          type: 'text',
          tag: 'h2',
          text: 'Table 2 — rowSelection, no fixed columns',
        },
        {
          type: 'table',
          testid: 'width-selection-pinned',
          source: '${rows}',
          rowSelection: { type: 'checkbox' },
          columns: [
            { label: 'Name', name: 'name' },
            { label: 'Email', name: 'email' },
            { label: 'Role', name: 'role' },
            { label: 'Status', name: 'status' },
          ],
        },
      ],
    },
  ],
} as any;

const rows = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin', status: 'active' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user', status: 'pending' },
  { id: 3, name: 'Carol', email: 'carol@example.com', role: 'user', status: 'active' },
  { id: 4, name: 'Dave', email: 'dave@example.com', role: 'guest', status: 'inactive' },
];

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const pageEnv: RendererEnv = {
  fetcher: async <T,>() => ({ status: 0, data: null as T }),
  notify(level, message) {
    console.info(`[table-column-width-demo] ${level}: ${message}`);
  },
};

interface TableColumnWidthDemoPageProps {
  onBack: () => void;
}

export function TableColumnWidthDemoPage({ onBack }: TableColumnWidthDemoPageProps) {
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
          Table Column Width Strategy
        </p>
        <h1 className="m-0 mb-4">Table 列宽策略宿主 fixture（列宽合计 = 容器宽 / 控制列 40px）</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-2">
          真实浏览器断言宿主：无 width 普通列必须可拉伸填满 <code>w-full</code> 容器；非 sticky
          控制列（selection/expand）必须保持 40px 声明宽度。
        </p>
        <div className="mt-8">
          <SchemaRenderer
            schemaUrl="playground://pages/table-column-width-demo"
            schema={schema}
            env={pageEnv}
            registry={registry as any}
            formulaCompiler={formulaCompiler}
            data={{ rows }}
          />
        </div>
      </section>
    </main>
  );
}
