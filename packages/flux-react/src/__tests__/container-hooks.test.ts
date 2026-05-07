import { describe, expect, it } from 'vitest';
import { createComponentHandleRegistry } from '@nop-chaos/flux-runtime';
import { resolveContainerElement } from '../container-hooks.js';

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
