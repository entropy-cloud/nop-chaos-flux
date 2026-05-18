// @vitest-environment happy-dom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { createComponentHandleRegistry } from '@nop-chaos/flux-runtime';
import { ComponentRegistryContext } from '../contexts.js';
import { useContainerDomRegistration, resolveContainerElement } from '../container-hooks.js';

describe('resolveContainerElement', () => {
  it('returns null for undefined containerId', () => {
    const registry = createComponentHandleRegistry({ id: 'test' });
    expect(resolveContainerElement(undefined, registry)).toBeNull();
  });

  it('returns null for undefined registry', () => {
    expect(resolveContainerElement('my-container', undefined)).toBeNull();
  });

  it('returns null when no handle is registered', () => {
    const registry = createComponentHandleRegistry({ id: 'test' });
    expect(resolveContainerElement('nonexistent', registry)).toBeNull();
  });

  it('resolves element by componentId', () => {
    const registry = createComponentHandleRegistry({ id: 'test' });
    const element = document.createElement('div');
    registry.register({
      id: 'workspace-area',
      type: 'container',
      ref: element,
      capabilities: {
        invoke() {
          return { ok: true };
        },
      },
    });

    expect(resolveContainerElement('workspace-area', registry)).toBe(element);
  });

  it('resolves element by componentName', () => {
    const registry = createComponentHandleRegistry({ id: 'test' });
    const element = document.createElement('div');
    registry.register({
      name: 'workspace',
      type: 'container',
      ref: element,
      capabilities: {
        invoke() {
          return { ok: true };
        },
      },
    });

    expect(resolveContainerElement('workspace', registry)).toBe(element);
  });

  it('returns null when handle has no ref', () => {
    const registry = createComponentHandleRegistry({ id: 'test' });
    registry.register({
      id: 'no-ref-container',
      type: 'container',
      ref: null,
      capabilities: {
        invoke() {
          return { ok: true };
        },
      },
    });

    expect(resolveContainerElement('no-ref-container', registry)).toBeNull();
  });

  it('prefers componentId over componentName', () => {
    const registry = createComponentHandleRegistry({ id: 'test' });
    const byIdElement = document.createElement('div');
    byIdElement.setAttribute('data-via', 'id');
    const byNameElement = document.createElement('div');
    byNameElement.setAttribute('data-via', 'name');

    registry.register({
      id: 'target',
      type: 'container',
      ref: byIdElement,
      capabilities: {
        invoke() {
          return { ok: true };
        },
      },
    });
    registry.register({
      name: 'target',
      type: 'container',
      ref: byNameElement,
      capabilities: {
        invoke() {
          return { ok: true };
        },
      },
    });

    const result = resolveContainerElement('target', registry);
    expect(result).toBe(byIdElement);
    expect(result?.getAttribute('data-via')).toBe('id');
  });
});

describe('useContainerDomRegistration', () => {
  it('re-registers when the mounted DOM element changes', async () => {
    const registry = createComponentHandleRegistry({ id: 'test' });

    function Probe(props: { marker: string }) {
      const elementRef = React.useRef<HTMLDivElement | null>(null);
      React.useLayoutEffect(() => {
        elementRef.current = document.querySelector<HTMLDivElement>(
          `[data-marker="${props.marker}"]`,
        );
      }, [props.marker]);
      useContainerDomRegistration('workspace-area', elementRef);

      return React.createElement('div', {
        key: props.marker,
        'data-marker': props.marker,
      });
    }

    const { rerender } = render(
      React.createElement(
        ComponentRegistryContext.Provider,
        { value: registry },
        React.createElement(Probe, { marker: 'first' }),
      ),
    );

    await waitFor(() => {
      expect(resolveContainerElement('workspace-area', registry)?.dataset.marker).toBe('first');
    });

    rerender(
      React.createElement(
        ComponentRegistryContext.Provider,
        { value: registry },
        React.createElement(Probe, { marker: 'second' }),
      ),
    );

    await waitFor(() => {
      expect(resolveContainerElement('workspace-area', registry)?.dataset.marker).toBe('second');
    });
  });
});
