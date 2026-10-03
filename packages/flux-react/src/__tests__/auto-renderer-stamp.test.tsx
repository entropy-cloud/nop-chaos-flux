import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import type {
  BaseSchema,
  RendererComponentProps,
} from '@nop-chaos/flux-core';
import type { RendererDefinition } from '../react-contracts.js';
import { ensureRendererComponent } from '../auto-renderer.js';

afterEach(cleanup);

function renderDefinition(definition: RendererDefinition, meta: Record<string, unknown> = {}) {
  const ensured = ensureRendererComponent(definition);
  const Comp = ensured.component as unknown as React.ComponentType<Record<string, unknown>>;
  render(
    <Comp
      id="n"
      path="$"
      props={{}}
      schema={{ type: ensured.type } as BaseSchema}
      meta={meta}
      events={{} as RendererComponentProps['events']}
      helpers={{} as never}
      regions={{}}
      reactions={{}}
      templateNode={{} as never}
      node={{} as never}
    />,
  );
  return ensured;
}

describe('auto-renderer root stamping (plan 528/529 channel contract)', () => {
  it('stamps data-renderer onto custom component output roots', () => {
    function DemoWidget() {
      return <section className="nop-demo-widget" data-testid="demo-root" />;
    }
    renderDefinition(
      { type: 'demo-widget', component: DemoWidget } as unknown as RendererDefinition,
      { testid: 'demo-root', cid: 'cid-9' },
    );
    const root = screen.getByTestId('demo-root');
    expect(root.getAttribute('data-renderer')).toBe('demo-widget');
  });

  it('does not overwrite data-renderer already present on the root', () => {
    function DemoWidget() {
      return <section data-testid="demo-root" data-renderer="manual" />;
    }
    renderDefinition(
      { type: 'demo-widget', component: DemoWidget } as unknown as RendererDefinition,
      {},
    );
    expect(screen.getByTestId('demo-root').getAttribute('data-renderer')).toBe('manual');
  });

  it('stamps forwardRef-style exotic components via their render entry', () => {
    const Exotic = React.forwardRef(function Exotic() {
      return <div className="nop-exotic" data-testid="exotic-root" />;
    });
    renderDefinition(
      { type: 'exotic', component: Exotic } as unknown as RendererDefinition,
      { testid: 'exotic-root', cid: 'cid-e' },
    );
    const root = screen.getByTestId('exotic-root');
    expect(root.getAttribute('data-renderer')).toBe('exotic');
    // data-cid 不由 stamp 补（field-frame 唯一性契约），由既有通道提供。
    expect(root.getAttribute('data-cid')).toBeNull();
  });

  it('leaves fragment output untouched (structural renderers)', () => {
    function FragmentWidget() {
      return (
        <React.Fragment>
          <span data-testid="frag-child">x</span>
        </React.Fragment>
      );
    }
    renderDefinition(
      { type: 'frag', component: FragmentWidget } as unknown as RendererDefinition,
      {},
    );
    expect(screen.getByTestId('frag-child')).toBeTruthy();
  });

  it('passes through null output (null-render renderers)', () => {
    function NullWidget() {
      return null;
    }
    const ensured = renderDefinition(
      { type: 'nullish', component: NullWidget } as unknown as RendererDefinition,
      {},
    );
    expect(ensured.component).toBeTruthy();
  });

  it('descends context-provider chains to stamp the host root (owner renderers)', () => {
    const FormContext = React.createContext<unknown>(undefined);
    function OwnerWidget() {
      return (
        <FormContext.Provider value={1}>
          <ScopeContext.Provider value={2}>
            <section className="nop-owner" data-testid="owner-root" />
          </ScopeContext.Provider>
        </FormContext.Provider>
      );
    }
    const ScopeContext = FormContext;
    renderDefinition(
      { type: 'owner', component: OwnerWidget } as unknown as RendererDefinition,
      { testid: 'owner-root', cid: 'cid-o' },
    );
    const root = screen.getByTestId('owner-root');
    expect(root.getAttribute('data-renderer')).toBe('owner');
  });

  it('skips stamping for wrap:true field-family definitions (frame root owns anchors)', () => {
    function FieldWidget() {
      return <input data-slot="input" className="nop-field-widget" data-testid="field-input" />;
    }
    renderDefinition(
      {
        type: 'field-widget',
        wrap: true,
        component: FieldWidget,
      } as unknown as RendererDefinition,
      { testid: 'field-input' },
    );
    const input = screen.getByTestId('field-input');
    expect(input.getAttribute('data-renderer')).toBeNull();
  });
});
