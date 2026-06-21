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
      type: 'form',
      id: 'handles-form',
      name: 'handlesForm',
      data: {
        name: 'Alice',
        bio: 'initial bio',
        count: 7,
        agree: false,
        color: 'red',
        tags: ['apple', 'banana'],
        pick: 'apple',
      },
      body: [
        {
          type: 'flex',
          direction: 'row',
          gap: 'md',
          className: 'flex-wrap',
          body: [
            {
              type: 'button',
              label: 'Focus Name',
              onClick: { action: 'component:focus', componentId: 'name-field' },
            },
            {
              type: 'button',
              label: 'Clear Name',
              onClick: { action: 'component:clear', componentId: 'name-field' },
            },
            {
              type: 'button',
              label: 'Reset Name',
              onClick: { action: 'component:reset', componentId: 'name-field' },
            },
            {
              type: 'button',
              label: 'Clear Bio',
              onClick: { action: 'component:clear', componentId: 'bio-field' },
            },
            {
              type: 'button',
              label: 'Clear Count',
              onClick: { action: 'component:clear', componentId: 'count-field' },
            },
            {
              type: 'button',
              label: 'Focus Switch',
              onClick: { action: 'component:focus', componentId: 'agree-field' },
            },
            {
              type: 'button',
              label: 'Focus Radio',
              onClick: { action: 'component:focus', componentId: 'color-field' },
            },
            {
              type: 'button',
              label: 'Clear Checkbox Group',
              onClick: { action: 'component:clear', componentId: 'tags-field' },
            },
            {
              type: 'button',
              label: 'Open Select',
              onClick: { action: 'component:open', componentId: 'lang-field' },
            },
            {
              type: 'button',
              label: 'Clear Tree',
              onClick: { action: 'component:clear', componentId: 'tree-field' },
            },
            {
              type: 'button',
              label: 'Submit Form',
              onClick: { action: 'component:submit', componentId: 'handles-form' },
            },
            {
              type: 'button',
              label: 'Reset Form',
              onClick: { action: 'component:reset', componentId: 'handles-form' },
            },
          ],
        },
        { type: 'input-text', id: 'name-field', name: 'name', label: 'Name' },
        { type: 'textarea', id: 'bio-field', name: 'bio', label: 'Bio' },
        { type: 'input-number', id: 'count-field', name: 'count', label: 'Count' },
        { type: 'switch', id: 'agree-field', name: 'agree', label: 'Agree' },
        {
          type: 'radio-group',
          id: 'color-field',
          name: 'color',
          label: 'Color',
          options: [
            { label: 'Red', value: 'red' },
            { label: 'Blue', value: 'blue' },
          ],
        },
        {
          type: 'select',
          id: 'lang-field',
          name: 'lang',
          label: 'Language',
          options: [
            { label: 'TypeScript', value: 'ts' },
            { label: 'JavaScript', value: 'js' },
          ],
        },
        {
          type: 'checkbox-group',
          id: 'tags-field',
          name: 'tags',
          label: 'Tags',
          options: [
            { label: 'Apple', value: 'apple' },
            { label: 'Banana', value: 'banana' },
          ],
        },
        {
          type: 'input-tree',
          id: 'tree-field',
          name: 'pick',
          label: 'Pick',
          treeMode: 'single',
          options: [
            {
              label: 'Fruit',
              value: 'fruit',
              children: [
                { label: 'Apple', value: 'apple' },
                { label: 'Banana', value: 'banana' },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'dialog',
      id: 'demo-dialog',
      title: 'Component Handle Dialog',
      defaultOpen: false,
      body: [{ type: 'text', text: 'Opened via component:open capability handle.' }],
    },
    {
      type: 'drawer',
      id: 'demo-drawer',
      title: 'Component Handle Drawer',
      defaultOpen: false,
      body: [{ type: 'text', text: 'Opened via component:open capability handle.' }],
    },
    {
      type: 'flex',
      direction: 'row',
      gap: 'md',
      body: [
        {
          type: 'button',
          label: 'Open Dialog (component:open)',
          onClick: { action: 'component:open', componentId: 'demo-dialog' },
        },
        {
          type: 'button',
          label: 'Toggle Dialog',
          onClick: { action: 'component:toggle', componentId: 'demo-dialog' },
        },
        {
          type: 'button',
          label: 'Open Drawer (component:open)',
          onClick: { action: 'component:open', componentId: 'demo-drawer' },
        },
        {
          type: 'button',
          label: 'Close Drawer',
          onClick: { action: 'component:close', componentId: 'demo-drawer' },
        },
        {
          type: 'button',
          id: 'target-button',
          label: 'Target Button',
        },
        {
          type: 'button',
          label: 'Focus Target Button',
          onClick: { action: 'component:focus', componentId: 'target-button' },
        },
      ],
    },
  ],
};

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerFormAdvancedRenderers(registry);
registerDataRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const env: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: () => undefined,
};

interface ComponentHandlesDemoPageProps {
  onBack: () => void;
}

export function ComponentHandlesDemoPage({ onBack }: ComponentHandlesDemoPageProps) {
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
          Component Handles
        </p>
        <h1 className="m-0 mb-4">component:* Capability Handles Playground</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)]">
          Demonstrates the X1 unified <code>component:&lt;method&gt;</code> vocabulary across input
          controls, surfaces, and buttons. Every trigger below invokes a registered component
          handle through the action dispatcher (no direct DOM manipulation).
        </p>
        <div className="mt-8">
          <SchemaRenderer
            schemaUrl="playground://pages/component-handles-demo"
            schema={schema}
            env={env}
            formulaCompiler={formulaCompiler}
          />
        </div>
      </section>
    </main>
  );
}
