import { useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { RendererDefinition, RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { Button } from '@nop-chaos/ui';

const preventFormSubmitRenderer: RendererDefinition = {
  type: 'native-submit-form',
  component: (props) => (
    <form
      data-testid="native-submit-form"
      onSubmit={(event) => {
        props.events.onSubmit?.(event);
      }}
    >
      <input type="text" aria-label="Native form input" defaultValue="" />
      <button type="submit" data-testid="native-submit-button">
        {String(props.props.label ?? 'Submit')}
      </button>
    </form>
  ),
  fields: [{ key: 'onSubmit', kind: 'event' }],
};

const preventLinkRenderer: RendererDefinition = {
  type: 'native-link',
  component: (props) => (
    <a
      href={String(props.props.href ?? '#')}
      data-testid="native-link"
      onClick={(event) => {
        props.events.onClick?.(event);
      }}
    >
      {String(props.props.label ?? 'Link')}
    </a>
  ),
  fields: [{ key: 'onClick', kind: 'event' }],
};

const preventKeydownRenderer: RendererDefinition = {
  type: 'native-keydown-input',
  component: (props) => (
    <input
      type="text"
      data-testid="native-keydown-input"
      aria-label="Keydown input"
      onKeyDown={(event) => {
        props.events.onKeyDown?.(event);
      }}
    />
  ),
  fields: [{ key: 'onKeyDown', kind: 'event' }],
};

interface EventPreventionDemoPageProps {
  onBack: () => void;
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="font-mono text-xs">
        {value ? 'preventDefault: true' : 'preventDefault: false'}
      </span>
    </label>
  );
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registry.register(preventFormSubmitRenderer);
registry.register(preventLinkRenderer);
registry.register(preventKeydownRenderer);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

const demoEnv: RendererEnv = {
  fetcher: async <T,>() => ({ ok: true, status: 200, data: null as T }),
  notify: (level, message) => {
    console.log(`[event-prevention-demo notify:${level}] ${message}`);
  },
};

export function EventPreventionDemoPage({ onBack }: EventPreventionDemoPageProps) {
  const [preventSubmit, setPreventSubmit] = useState(true);
  const [preventLink, setPreventLink] = useState(true);
  const [preventDigitKey, setPreventDigitKey] = useState(true);

  const schema = {
    type: 'page',
    body: [
      {
        type: 'flex',
        direction: 'column',
        gap: 'md',
        body: [
          {
            type: 'text',
            text: 'Demo 1 — Native form submit. Toggle the preventDefault flag and click Submit.',
          },
          {
            type: 'flex',
            direction: 'row',
            gap: 'sm',
            body: [
              {
                type: 'button',
                label: preventSubmit ? 'Switch to allow submit' : 'Switch to prevent submit',
                onClick: { action: 'setValue', args: { path: '_', value: 0 } },
              },
            ],
          },
          {
            type: 'native-submit-form',
            label: 'Submit form',
            onSubmit: {
              action: 'setValue',
              args: { path: 'formSubmitCount', value: '${ (formSubmitCount ?? 0) + 1 }' },
              preventDefault: preventSubmit,
            },
          },
          {
            type: 'text',
            text: 'Demo 2 — Native link navigation. With preventDefault on, the link does not navigate.',
          },
          {
            type: 'native-link',
            href: 'about:blank',
            label: 'Click me (will navigate away if preventDefault is off)',
            onClick: {
              action: 'setValue',
              args: { path: 'linkClickCount', value: '${ (linkClickCount ?? 0) + 1 }' },
              preventDefault: preventLink,
            },
          },
          {
            type: 'text',
            text: 'Demo 3 — Keydown prevention. With preventDefault on (toggle on), every keydown is blocked so the input never fills. Toggle off to allow typing.',
          },
          {
            type: 'native-keydown-input',
            onKeyDown: {
              action: 'setValue',
              args: { path: 'keydownCount', value: '${ (keydownCount ?? 0) + 1 }' },
              preventDefault: preventDigitKey,
            },
          },
        ],
      },
    ],
  } as any;

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
          Event Prevention
        </p>
        <h1 className="m-0 mb-4">X2 Schema-Driven preventDefault / stopPropagation</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)]">
          Demonstrates the schema-level <code>preventDefault</code> / <code>stopPropagation</code>{' '}
          fields on action nodes. The runtime evaluates these synchronously and blocks the native
          default <em>before</em> dispatching the action body.
        </p>
        <div className="mt-6 mb-6 flex flex-col gap-3">
          <Toggle label="Demo 1 (form submit):" value={preventSubmit} onChange={setPreventSubmit} />
          <Toggle label="Demo 2 (link click):" value={preventLink} onChange={setPreventLink} />
          <Toggle
            label="Demo 3 (keydown blocking):"
            value={preventDigitKey}
            onChange={setPreventDigitKey}
          />
        </div>
        <div className="mt-8">
          <SchemaRenderer
            schemaUrl="playground://pages/event-prevention-demo"
            schema={schema}
            env={demoEnv}
            registry={registry as any}
            formulaCompiler={formulaCompiler}
          />
        </div>
      </section>
    </main>
  );
}
