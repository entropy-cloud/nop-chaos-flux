import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

// 22-05 (duplicate value refusal) + 13-03 (same-tick double addTab must not
// drop the first tab / collide generated values, both managed/local and scope
// ownership branches).

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const itemsABC = [
  { key: 'a', title: 'A' },
  { key: 'b', title: 'B' },
  { key: 'c', title: 'C' },
];

function tabValues(): string[] {
  return Array.from(document.querySelectorAll('[data-slot="tabs-trigger"]')).map(
    (el) => el.getAttribute('data-tab-value') ?? '',
  );
}

function renderSchema(schema: unknown, data: Record<string, unknown> = { ui: {} }) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://tabs/addtab-guards"
      schema={schema as never}
      data={data}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function buildSchema(tabsOverrides: Record<string, unknown>, toolbar: unknown[]): any {
  return {
    type: 'page',
    body: [
      {
        type: 'tabs',
        id: 'view-tabs',
        items: itemsABC,
        ...tabsOverrides,
      },
      { type: 'button', label: 'Double Add', onClick: toolbar },
    ],
  };
}

describe('tabs addTab guards (22-05 / 13-03)', () => {
  it('22-05: addTab with an existing value returns refused, keeps the collection unchanged and warns once', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderSchema(
      buildSchema({}, [
        {
          action: 'component:addTab',
          componentId: 'view-tabs',
          args: { item: { key: 'a', title: 'A2' } },
        },
      ]),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    fireEvent.click(screen.getByText('Double Add'));

    await waitFor(() => {
      const duplicateWarns = warnSpy.mock.calls.filter((call) =>
        String(call[0]).includes('tabs-add-duplicate'),
      );
      expect(duplicateWarns).toHaveLength(1);
    });
    expect(tabValues()).toEqual(['a', 'b', 'c']);
    expect(screen.queryByText('A2')).toBeNull();
  });

  it('13-03 managed/local branch: two addTab invokes in the same tick both land with distinct values', async () => {
    renderSchema(
      buildSchema({}, [
        {
          action: 'component:addTab',
          componentId: 'view-tabs',
          args: { item: { title: 'D' } },
        },
        {
          action: 'component:addTab',
          componentId: 'view-tabs',
          args: { item: { title: 'E' } },
        },
      ]),
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    // Freeze Date.now so both same-tick adds collide on the legacy
    // `tab-<ts>` generator — the defect must not depend on clock drift.
    // (Only `Date` is faked; waitFor keeps working through real timers.)
    vi.useFakeTimers({ toFake: ['Date'] });
    fireEvent.click(screen.getByText('Double Add'));

    await waitFor(() => {
      const values = tabValues();
      expect(values).toHaveLength(5);
      expect(values).toContain('a');
      expect(screen.getByRole('tab', { name: 'D' })).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'E' })).toBeTruthy();
    });
    const dValue = document
      .querySelector('[data-slot="tabs-trigger"][data-tab-value]')
      ?.getAttribute('data-tab-value');
    const triggers = Array.from(
      document.querySelectorAll('[data-slot="tabs-trigger"]'),
    ) as HTMLElement[];
    const generatedValues = triggers
      .filter((el) => (el.getAttribute('data-tab-value') ?? '').startsWith('tab-'))
      .map((el) => el.getAttribute('data-tab-value'));
    expect(generatedValues).toHaveLength(2);
    expect(new Set(generatedValues).size).toBe(2);
    expect(dValue).toBeTruthy();
  });

  it('13-03 scope branch: two addTab invokes in the same tick both land with distinct values', async () => {
    renderSchema(
      buildSchema(
        { itemsOwnership: 'scope', itemsStatePath: 'ui.tabItems' },
        [
          {
            action: 'component:addTab',
            componentId: 'view-tabs',
            args: { item: { title: 'D' } },
          },
          {
            action: 'component:addTab',
            componentId: 'view-tabs',
            args: { item: { title: 'E' } },
          },
        ],
      ),
      { ui: { tabItems: itemsABC } },
    );
    await waitFor(() => expect(tabValues()).toEqual(['a', 'b', 'c']));

    // Freeze Date.now for the same deterministic same-tick collision as the
    // managed/local branch.
    vi.useFakeTimers({ toFake: ['Date'] });
    fireEvent.click(screen.getByText('Double Add'));

    await waitFor(() => {
      const values = tabValues();
      expect(values).toHaveLength(5);
      expect(screen.getByRole('tab', { name: 'D' })).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'E' })).toBeTruthy();
    });
    const triggers = Array.from(
      document.querySelectorAll('[data-slot="tabs-trigger"]'),
    ) as HTMLElement[];
    const generatedValues = triggers
      .filter((el) => (el.getAttribute('data-tab-value') ?? '').startsWith('tab-'))
      .map((el) => el.getAttribute('data-tab-value'));
    expect(generatedValues).toHaveLength(2);
    expect(new Set(generatedValues).size).toBe(2);
  });
});
