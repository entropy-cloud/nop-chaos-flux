import { useMemo } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { ApiSchema, ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerFormAdvancedRenderers } from '@nop-chaos/flux-renderers-form-advanced';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { Button } from '@nop-chaos/ui';

const ALL_FRUITS = [
  { label: 'Apple', value: 'apple' },
  { label: 'Apricot', value: 'apricot' },
  { label: 'Avocado', value: 'avocado' },
  { label: 'Banana', value: 'banana' },
  { label: 'Blueberry', value: 'blueberry' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Coconut', value: 'coconut' },
  { label: 'Cranberry', value: 'cranberry' },
  { label: 'Dragonfruit', value: 'dragonfruit' },
  { label: 'Elderberry', value: 'elderberry' },
  { label: 'Grape', value: 'grape' },
  { label: 'Guava', value: 'guava' },
  { label: 'Kiwi', value: 'kiwi' },
  { label: 'Lemon', value: 'lemon' },
  { label: 'Lime', value: 'lime' },
  { label: 'Mango', value: 'mango' },
  { label: 'Melon', value: 'melon' },
  { label: 'Orange', value: 'orange' },
  { label: 'Papaya', value: 'papaya' },
  { label: 'Peach', value: 'peach' },
  { label: 'Pear', value: 'pear' },
  { label: 'Pineapple', value: 'pineapple' },
  { label: 'Plum', value: 'plum' },
  { label: 'Raspberry', value: 'raspberry' },
  { label: 'Strawberry', value: 'strawberry' },
  { label: 'Watermelon', value: 'watermelon' },
];

const schema = {
  type: 'page',
  body: [
    {
      type: 'text',
      text: 'input-text + data-source composition: type a fruit name, see debounced async suggestions. Select an item to write back the value. Uses refreshSource + sendOn gate (request sink-down; renderer opens no api shortcut).',
    },
    {
      type: 'form',
      id: 'form-input-suggest',
      name: 'formInputSuggest',
      data: { fruit: '' },
      body: [
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/fruits', params: { q: '${fruit}' } },
          name: 'fruitSuggestions',
          initFetch: false,
          sendOn: 'fruit.length >= 1',
        },
        {
          type: 'input-text',
          name: 'fruit',
          label: 'Fruit (async suggest)',
          placeholder: 'Type to search fruits...',
          suggestSource: 'fruitSuggestions',
          suggestDebounce: 250,
          suggestMinInputLength: 1,
          suggestEmpty: 'No matching fruits',
          clearable: true,
        },
        {
          type: 'data-source',
          action: 'ajax',
          args: { url: '/api/fruits', params: { q: '${fruitTpl}' } },
          name: 'fruitTplSuggestions',
          initFetch: false,
          sendOn: 'fruitTpl.length >= 1',
        },
        {
          type: 'input-text',
          name: 'fruitTpl',
          label: 'Fruit (suggestTemplate region)',
          placeholder: 'Type to search, custom item template...',
          suggestSource: 'fruitTplSuggestions',
          suggestDebounce: 250,
          suggestMinInputLength: 1,
          suggestTemplate: [
            {
              type: 'text',
              text: '${$slot.suggestion.label} (value: ${$slot.suggestion.value})',
            },
          ],
        },
        {
          type: 'flex',
          direction: 'column',
          gap: 'sm',
          className: 'mt-4 p-4 rounded-lg bg-muted/40',
          body: [
            { type: 'text', text: 'Live form values:' },
            { type: 'text', testid: 'input-suggest-fruit', text: 'fruit = ${fruit}' },
            { type: 'text', testid: 'input-suggest-fruit-tpl', text: 'fruitTpl = ${fruitTpl}' },
          ],
        },
      ],
    },
  ],
} as any;

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const pageEnv: RendererEnv = {
  fetcher: async function <T,>(api: ApiSchema, ctx: ApiRequestContext) {
    const scopeData = ctx.scope.readOwn() as Record<string, unknown>;
    const rawQ = scopeData.fruit ?? scopeData.fruitTpl ?? '';
    const q = String(rawQ).toLowerCase();
    await new Promise((r) => setTimeout(r, 80));
    const filtered = q
      ? ALL_FRUITS.filter((item) => item.label.toLowerCase().includes(q))
      : ALL_FRUITS;
    return { ok: true, status: 200, data: filtered as T };
  },
  notify(level, message) {
    console.info(`[input-suggest-demo] ${level}: ${message}`);
  },
};

interface InputSuggestDemoPageProps {
  onBack: () => void;
}

export function InputSuggestDemoPage({ onBack }: InputSuggestDemoPageProps) {
  const content = useMemo(
    () => (
      <SchemaRenderer
        schemaUrl="playground://pages/input-suggest-demo"
        schema={schema}
        env={pageEnv}
        registry={registry as any}
        formulaCompiler={formulaCompiler}
      />
    ),
    [],
  );

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[900px] w-full p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <Button
          variant="outline"
          className="mb-[18px] px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]"
          onClick={onBack}
        >
          Back to Home
        </Button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
          Input Autocomplete (E3)
        </p>
        <h1 className="m-0 mb-4">Input Autocomplete — Data-Source Async Suggestions</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-2">
          演示 <code>input-text</code> 异步建议下拉（<code>autoComplete</code> successor）：
          用户输入触发 debounced <code>refreshSource</code> → data-source <code>sendOn</code> 门控 →
          建议写入 scope → renderer 渲染 Popover 浮层 → 选中写回字段值。
          请求生命周期全归 data-source（renderer 不开 <code>api</code> 短路径，X3 §1/§3）。
        </p>
        <div className="mt-8">{content}</div>
      </section>
    </main>
  );
}
