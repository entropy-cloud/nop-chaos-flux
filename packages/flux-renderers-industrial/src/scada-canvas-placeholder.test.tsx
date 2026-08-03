import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { ScadaCanvasPlaceholder } from './scada-canvas-placeholder.js';
import type { ScadaCanvasSchema } from './schemas.js';

afterEach(() => {
  cleanup();
});

function createMockProps(
  overrides: Partial<RendererComponentProps<ScadaCanvasSchema>> = {},
): RendererComponentProps<ScadaCanvasSchema> {
  return {
    id: 'mock-node',
    path: 'mock.path',
    schema: { type: 'scada-canvas', config: {} } as ScadaCanvasSchema,
    templateNode: {} as RendererComponentProps<ScadaCanvasSchema>['templateNode'],
    node: {} as RendererComponentProps<ScadaCanvasSchema>['node'],
    props: {} as RendererComponentProps<ScadaCanvasSchema>['props'],
    meta: {
      visible: true,
      hidden: false,
      disabled: false,
      changed: false,
    } as RendererComponentProps<ScadaCanvasSchema>['meta'],
    regions: {},
    events: {},
    reactions: {},
    helpers: {} as RendererComponentProps<ScadaCanvasSchema>['helpers'],
    ...overrides,
  };
}

describe('ScadaCanvasPlaceholder', () => {
  it('renders the scada-canvas root container with the DOM marker contract', () => {
    const { container } = render(<ScadaCanvasPlaceholder {...createMockProps()} />);
    const root = container.querySelector('[data-slot="scada-canvas"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.className).toContain('nop-scada-canvas');
  });

  it('forwards meta testid, cid and className onto the root container', () => {
    const { container } = render(
      <ScadaCanvasPlaceholder
        {...createMockProps({
          meta: {
            visible: true,
            hidden: false,
            disabled: false,
            changed: false,
            testid: 'scada-shell',
            cid: 42,
            className: 'extra-class',
          } as RendererComponentProps<ScadaCanvasSchema>['meta'],
        })}
      />,
    );
    const root = container.querySelector('[data-slot="scada-canvas"]') as HTMLElement;
    expect(root.getAttribute('data-testid')).toBe('scada-shell');
    expect(root.getAttribute('data-cid')).toBe('42');
    expect(root.className).toContain('extra-class');
  });
});
