import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { Button } from '@nop-chaos/ui';

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
          text: 'tree — 搜索/过滤（searchable + 自动展开 + 高亮）',
        },
        {
          type: 'tree',
          data: '${fileSystem}',
          labelField: 'name',
          keyField: 'id',
          childrenKey: 'children',
          searchable: true,
          initiallyExpanded: false,
          empty: { type: 'text', text: '无匹配节点' },
          testid: 'tdx-search-tree',
        },
        {
          type: 'text',
          tag: 'h2',
          text: 'tree — 节点图标（showIcon + iconField）',
        },
        {
          type: 'tree',
          data: '${fileSystem}',
          labelField: 'name',
          keyField: 'id',
          childrenKey: 'children',
          showIcon: true,
          iconField: 'icon',
          initiallyExpanded: true,
          testid: 'tdx-icon-tree',
        },
        {
          type: 'text',
          tag: 'h2',
          text: 'tree — 缩进引导线（showGuideLine）',
        },
        {
          type: 'tree',
          data: '${fileSystem}',
          labelField: 'name',
          keyField: 'id',
          childrenKey: 'children',
          showGuideLine: true,
          initiallyExpanded: true,
          testid: 'tdx-guide-tree',
        },
        {
          type: 'text',
          tag: 'h2',
          text: 'tree — 三能力叠加（search + icon + guide-line）',
        },
        {
          type: 'tree',
          data: '${fileSystem}',
          labelField: 'name',
          keyField: 'id',
          childrenKey: 'children',
          searchable: true,
          showIcon: true,
          iconField: 'icon',
          showGuideLine: true,
          initiallyExpanded: false,
          testid: 'tdx-combined-tree',
        },
      ],
    },
  ],
} as any;

const fileSystem = [
  {
    id: 'src',
    name: 'src',
    icon: 'folder',
    children: [
      {
        id: 'src-components',
        name: 'components',
        icon: 'folder',
        children: [
          { id: 'src-components-button', name: 'Button.tsx', icon: 'file-text', children: [] },
          { id: 'src-components-input', name: 'Input.tsx', icon: 'file-text', children: [] },
        ],
      },
      {
        id: 'src-pages',
        name: 'pages',
        icon: 'folder',
        children: [
          {
            id: 'src-pages-home',
            name: 'HomePage',
            icon: 'folder',
            children: [
              { id: 'src-pages-home-index', name: 'index.tsx', icon: 'file-text', children: [] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'docs',
    name: 'docs',
    icon: 'folder',
    children: [
      { id: 'docs-readme', name: 'README.md', icon: 'file-text', children: [] },
      { id: 'docs-guide', name: 'guide.md', icon: 'file-text', children: [] },
    ],
  },
  {
    id: 'package-json',
    name: 'package.json',
    icon: 'file',
    children: [],
  },
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
    console.info(`[tree-display-ux-demo] ${level}: ${message}`);
  },
};

interface TreeDisplayUxDemoPageProps {
  onBack: () => void;
}

export function TreeDisplayUxDemoPage({ onBack }: TreeDisplayUxDemoPageProps) {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[1100px] w-full p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <Button
          variant="outline"
          className="mb-[18px] px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]"
          onClick={onBack}
        >
          Back to Home
        </Button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
          Tree Display UX Enhancements (E3)
        </p>
        <h1 className="m-0 mb-4">tree 搜索/图标/引导线</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-2">
          演示 <code>tree</code> 展示组件的三项 P2 UX 增强：本地子串搜索过滤（自动展开匹配祖先链 + 高亮 + 清空恢复）、
          节点图标（<code>showIcon</code>/<code>iconField</code>）、缩进引导线（<code>showGuideLine</code>）。缺省回退无回归。
        </p>
        <div className="mt-8">
          <SchemaRenderer
            schemaUrl="playground://pages/tree-display-ux-demo"
            schema={schema}
            data={{ fileSystem }}
            env={pageEnv}
            registry={registry as any}
            formulaCompiler={formulaCompiler}
          />
        </div>
      </section>
    </main>
  );
}
