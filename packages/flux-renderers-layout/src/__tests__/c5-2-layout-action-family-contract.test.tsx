import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { layoutRendererDefinitions } from '../layout-renderer-definitions.js';

/**
 * C5.2 layout action-family contract tests (test-first evidence for
 * `docs/plans/2026-08-04-0841-1-c5-2-layout-action-family-audit.md` Phase 2).
 *
 * Guards:
 *  - P1-1 steps: root classList is marker-only (nop-steps) — no hardcoded flex
 *    layout classes (styling-system.md "No Hardcoded Layout Styles in Renderer Code").
 *  - P1-1 timeline: root classList is marker-only (nop-timeline).
 *  - P1-2 dropdown-button: root classList is marker-only (nop-dropdown-button);
 *    layout moves to package CSS.
 *  - P1-1 dropdown-button: items fieldRules must NOT advertise `icon` (dead
 *    classification — schema and renderer never consume an item icon).
 *  - P2-2 button-group: items fieldRules classify `key` as a value field.
 *  - P2-1 steps / P2-1 button-group: onChange payload shape flows into action
 *    args as evaluationBindings.
 *  - P2-2 steps / P2-3 button-group: seed precedence is value-first when both
 *    value and defaultValue are provided (matches registered descriptions and
 *    the wizard precedent).
 *  - P2-1 dropdown-button: destructive/disabled items render and disabled items
 *    do not dispatch.
 *  - P2-3 steps: disabled items render data-disabled and do not advance.
 *  - P2-1 timeline: item icon renders inside the marker dot.
 */

function rootClasses(el: HTMLElement | null): string[] {
  return el ? Array.from(el.classList) : [];
}

function stepsRoot() {
  return document.querySelector('.nop-steps') as HTMLElement;
}

function timelineRoot() {
  return document.querySelector('.nop-timeline') as HTMLElement;
}

function dropdownRoot() {
  return document.querySelector('.nop-dropdown-button') as HTMLElement;
}

describe('C5.2 contract: marker-only roots (layout renderer contract)', () => {
  afterEach(() => {
    cleanup();
  });

  it('steps root classList contains only the nop-steps marker (horizontal + vertical)', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://c5-2/steps-root-h"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              items: [
                { value: 'a', title: 'A' },
                { value: 'b', title: 'B' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    let classes = rootClasses(stepsRoot());
    expect(classes).toContain('nop-steps');
    for (const forbidden of ['flex', 'flex-row', 'flex-col', 'items-start', 'items-stretch', 'gap-4']) {
      expect(classes, `steps root must not carry ${forbidden}`).not.toContain(forbidden);
    }
    unmount();

    render(
      <SchemaRenderer
        schemaUrl="test://c5-2/steps-root-v"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              orientation: 'vertical',
              items: [{ value: 'a', title: 'A' }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    classes = rootClasses(stepsRoot());
    expect(classes).toContain('nop-steps');
    for (const forbidden of ['flex', 'flex-row', 'flex-col', 'items-start']) {
      expect(classes, `steps vertical root must not carry ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('timeline root classList contains only the nop-timeline marker (horizontal + vertical)', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    const { unmount } = render(
      <SchemaRenderer
        schemaUrl="test://c5-2/timeline-root-v"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              items: [
                { time: '09:00', title: 'A' },
                { time: '10:00', title: 'B' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    let classes = rootClasses(timelineRoot());
    expect(classes).toContain('nop-timeline');
    for (const forbidden of ['flex', 'flex-row', 'flex-col', 'items-stretch', 'gap-4', 'overflow-x-auto']) {
      expect(classes, `timeline root must not carry ${forbidden}`).not.toContain(forbidden);
    }
    unmount();

    render(
      <SchemaRenderer
        schemaUrl="test://c5-2/timeline-root-h"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              orientation: 'horizontal',
              items: [{ time: '09:00', title: 'A' }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    classes = rootClasses(timelineRoot());
    expect(classes).toContain('nop-timeline');
    for (const forbidden of ['flex', 'flex-row', 'flex-col', 'items-stretch', 'gap-4', 'overflow-x-auto']) {
      expect(classes, `timeline horizontal root must not carry ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('dropdown-button root classList contains only the nop-dropdown-button marker', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://c5-2/dropdown-root"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dropdown-button',
              label: 'Actions',
              items: [{ label: 'Edit' }],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const classes = rootClasses(dropdownRoot());
    expect(classes).toContain('nop-dropdown-button');
    for (const forbidden of ['inline-block', 'block', 'flex']) {
      expect(classes, `dropdown-button root must not carry ${forbidden}`).not.toContain(forbidden);
    }
  });
});

describe('C5.2 contract: items fieldRules classification honesty', () => {
  afterEach(() => {
    cleanup();
  });

  it('dropdown-button does NOT advertise an item icon classification (dead field)', () => {
    const def = layoutRendererDefinitions.find((d) => d.type === 'dropdown-button');
    expect(def).toBeTruthy();
    const itemsShape = def!.propContracts?.items?.shape as
      | { kind: 'array'; item: { fieldRules?: Record<string, unknown> } }
      | undefined;
    const fieldRules = itemsShape?.item.fieldRules ?? {};
    // Schema (DropdownButtonItemSchema) has no icon; the renderer consumes no
    // item icon — advertising the classification is a dead-field honesty violation.
    expect(Object.keys(fieldRules)).not.toContain('icon');
  });

  it('button-group classifies item key as a value field', () => {
    const def = layoutRendererDefinitions.find((d) => d.type === 'button-group');
    expect(def).toBeTruthy();
    const itemsShape = def!.propContracts?.items?.shape as
      | { kind: 'array'; item: { fieldRules?: Record<string, string> } }
      | undefined;
    const fieldRules = itemsShape?.item.fieldRules ?? {};
    expect(fieldRules.key).toBe('value');
  });
});

describe('C5.2 contract: onChange payload shapes flow into action args', () => {
  afterEach(() => {
    cleanup();
  });

  it('steps dispatches onChange payload {value, stepIndex, stepKey}', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://c5-2/steps-payload"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              defaultValue: 'a',
              items: [
                { value: 'a', title: 'A' },
                { value: 'b', title: 'B' },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'stepsPayload', value: '${value}|${stepIndex}|${stepKey}' },
              },
            },
            { type: 'text', text: 'payload:${stepsPayload ?? "none"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('payload:none')).toBeTruthy();
    fireEvent.click(document.querySelectorAll('[data-slot="steps-indicator"]')[1] as HTMLElement);
    await waitFor(() => expect(screen.getByText('payload:b|1|b')).toBeTruthy());
  });

  it('button-group dispatches onChange payload {value, selectedKeys, selectionMode}', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://c5-2/button-group-payload"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button-group',
              selectionMode: 'single',
              items: [
                { key: 'a', label: 'A' },
                { key: 'b', label: 'B' },
              ],
              onChange: {
                action: 'setValue',
                args: {
                  path: 'bgPayload',
                  value: '${value}|${selectedKeys}|${selectionMode}',
                },
              },
            },
            { type: 'text', text: 'payload:${bgPayload ?? "none"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(screen.getByText('payload:none')).toBeTruthy();
    fireEvent.click(document.querySelectorAll('[data-slot="button-group-item"]')[1] as HTMLElement);
    await waitFor(() => expect(screen.getByText('payload:b|b|single')).toBeTruthy());
  });
});

describe('C5.2 contract: seed precedence is value-first', () => {
  afterEach(() => {
    cleanup();
  });

  it('steps seeds from value when both value and defaultValue are provided (local mode)', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://c5-2/steps-seed-precedence"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              value: 'b',
              defaultValue: 'a',
              items: [
                { value: 'a', title: 'A' },
                { value: 'b', title: 'B' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // Registered contract: defaultValue applies "when value is not provided".
    expect(stepsRoot().getAttribute('data-current-index')).toBe('1');
  });

  it('button-group seeds selection from value when both are provided', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://c5-2/button-group-seed-precedence"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button-group',
              selectionMode: 'single',
              value: 'b',
              defaultValue: 'a',
              items: [
                { key: 'a', label: 'A' },
                { key: 'b', label: 'B' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // Registered contract: defaultValue applies "when value is not provided".
    const items = document.querySelectorAll('[data-slot="button-group-item"]');
    expect(items[1]?.getAttribute('data-selected')).toBe('true');
    expect(items[0]?.getAttribute('data-selected')).toBeNull();
  });
});

describe('C5.2 contract: item disabled semantics', () => {
  afterEach(() => {
    cleanup();
  });

  it('steps renders disabled steps as data-disabled and does not advance on click', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://c5-2/steps-disabled"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              defaultValue: 'a',
              items: [
                { value: 'a', title: 'A' },
                { value: 'b', title: 'B', disabled: true },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'stepsTouched', value: true },
              },
            },
            { type: 'text', text: 'touched:${stepsTouched ? "yes" : "no"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const items = document.querySelectorAll('[data-slot="steps-item"]');
    expect(items[1]?.getAttribute('data-disabled')).toBe('true');
    expect((document.querySelectorAll('[data-slot="steps-indicator"]')[1] as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(document.querySelectorAll('[data-slot="steps-indicator"]')[1] as HTMLElement);
    expect(stepsRoot().getAttribute('data-current-index')).toBe('0');
    expect(screen.getByText('touched:no')).toBeTruthy();
  });

  it('dropdown-button renders destructive/disabled items and does not dispatch on disabled click', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://c5-2/dropdown-disabled"
        schema={{
          type: 'page',
          body: [
            {
              type: 'dropdown-button',
              label: 'More',
              items: [
                { label: 'Edit', action: { action: 'setValue', args: { path: 'clicked', value: true } } },
                { label: 'Delete', destructive: true },
                { label: 'Locked', disabled: true, action: { action: 'setValue', args: { path: 'clicked', value: true } } },
              ],
            },
            { type: 'text', text: 'clicked:${clicked ? "yes" : "no"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(document.querySelector('[data-slot="dropdown-button-trigger"]') as HTMLElement);
    await waitFor(() => expect(screen.getByText('Delete')).toBeTruthy());

    const menuItems = document.querySelectorAll('[data-slot="dropdown-menu-item"]');
    expect(menuItems[1]?.getAttribute('data-variant')).toBe('destructive');
    // Base UI maps disabled to a boolean data-disabled attribute (empty string).
    expect(menuItems[2]?.getAttribute('data-disabled')).not.toBeNull();
    expect(menuItems[2]?.getAttribute('aria-disabled')).not.toBeNull();

    // Disabled item click must not dispatch.
    fireEvent.click(menuItems[2] as HTMLElement);
    expect(screen.getByText('clicked:no')).toBeTruthy();
  });
});

describe('C5.2 contract: timeline item icon renders in the marker dot', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the resolved lucide icon inside timeline-dot', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://c5-2/timeline-icon"
        schema={{
          type: 'page',
          body: [
            {
              type: 'timeline',
              items: [
                { time: '09:00', title: 'A', icon: 'star' },
                { time: '10:00', title: 'B' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const dots = document.querySelectorAll('[data-slot="timeline-dot"]');
    // resolveLucideIcon('star') resolves the lucide star icon into the dot.
    expect(dots[0]?.querySelector('svg.lucide-star')).toBeTruthy();
    // Missing icon falls back to the default Circle marker (renderer contract).
    expect(dots[1]?.querySelector('svg.lucide-circle')).toBeTruthy();
  });
});
