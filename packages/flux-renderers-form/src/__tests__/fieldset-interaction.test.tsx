import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { FieldsetRenderer } from '../renderers/fieldset';
import type { FieldsetSchema } from '../renderers/fieldset';
import { RuntimeContext, ScopeContext } from '@nop-chaos/flux-react/unstable';
import type { ScopeRef, RendererRuntime } from '@nop-chaos/flux-core';

function makeMockScope(): ScopeRef {
  return {
    id: 'scope-test',
    path: '$',
    value: {},
    get: () => undefined,
    has: () => false,
    readOwn: () => ({}),
    readVisible: () => ({}),
    materializeVisible: () => ({}),
    update: vi.fn(),
    merge: vi.fn(),
  };
}

function makeMockRuntime(): RendererRuntime {
  return {
    compileSchema: vi.fn(),
    dispatchAction: vi.fn(),
    resolveExpression: vi.fn(),
    createScope: vi.fn(),
    getComponentHandle: vi.fn(),
  } as unknown as RendererRuntime;
}

function wrapWithProviders(ui: React.ReactNode) {
  return (
    <RuntimeContext.Provider value={makeMockRuntime()}>
      <ScopeContext.Provider value={makeMockScope()}>{ui}</ScopeContext.Provider>
    </RuntimeContext.Provider>
  );
}

function makeProps(overrides: Partial<FieldsetSchema> = {}) {
  return {
    props: {
      type: 'fieldset' as const,
      body: [],
      ...overrides,
    },
    meta: {
      className: '',
      testid: 'fieldset-test',
      cid: 42,
      visible: true,
      hidden: false,
      disabled: false,
      changed: false,
    },
    regions: {},
    events: {},
    helpers: {} as any,
  };
}

describe('fieldset collapsible interaction', () => {
  it('renders collapsible fieldset with ARIA attributes', () => {
    cleanup();
    const props = makeProps({
      title: 'Personal Info',
      collapsible: true,
      collapsed: true,
    });

    render(
      wrapWithProviders(
        <FieldsetRenderer {...(props as unknown as RendererComponentProps<FieldsetSchema>)} />,
      ),
    );

    const legend = screen.getByText('Personal Info');
    expect(legend).toBeTruthy();
    expect(legend.getAttribute('role')).toBe('button');
    expect(legend.getAttribute('tabindex')).toBe('0');
    expect(legend.getAttribute('aria-expanded')).toBe('false');
    expect(legend.getAttribute('aria-controls')).toBe('42-body');
  });

  it('toggles collapsed state on click', () => {
    cleanup();
    const props = makeProps({
      title: 'Details',
      collapsible: true,
      collapsed: true,
    });

    render(
      wrapWithProviders(
        <FieldsetRenderer {...(props as unknown as RendererComponentProps<FieldsetSchema>)} />,
      ),
    );

    const legend = screen.getByText('Details');
    const body = document.querySelector('[data-slot="fieldset-body"]') as HTMLElement;
    expect(body.style.display).toBe('none');

    fireEvent.click(legend);

    expect(legend.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggles collapsed state on Enter key', () => {
    cleanup();
    const props = makeProps({
      title: 'Settings',
      collapsible: true,
      collapsed: true,
    });

    render(
      wrapWithProviders(
        <FieldsetRenderer {...(props as unknown as RendererComponentProps<FieldsetSchema>)} />,
      ),
    );

    const legend = screen.getByText('Settings');
    expect(legend.getAttribute('aria-expanded')).toBe('false');

    fireEvent.keyDown(legend, { key: 'Enter' });

    expect(legend.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggles collapsed state on Space key', () => {
    cleanup();
    const props = makeProps({
      title: 'Advanced',
      collapsible: true,
      collapsed: false,
    });

    render(
      wrapWithProviders(
        <FieldsetRenderer {...(props as unknown as RendererComponentProps<FieldsetSchema>)} />,
      ),
    );

    const legend = screen.getByText('Advanced');
    expect(legend.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(legend, { key: ' ' });

    expect(legend.getAttribute('aria-expanded')).toBe('false');
  });

  it('does not add interactive attributes when collapsible is false', () => {
    cleanup();
    const props = makeProps({
      title: 'Static Section',
      collapsible: false,
    });

    render(
      wrapWithProviders(
        <FieldsetRenderer {...(props as unknown as RendererComponentProps<FieldsetSchema>)} />,
      ),
    );

    const legend = screen.getByText('Static Section');
    expect(legend.getAttribute('role')).toBeNull();
    expect(legend.getAttribute('tabindex')).toBeNull();
    expect(legend.getAttribute('aria-expanded')).toBeNull();
  });
});
