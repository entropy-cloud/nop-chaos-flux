import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

/**
 * [G1-R4-视角8-02] The steps click hot zone must cover the whole step row —
 * not just the 28px indicator circle: title/description live on the same
 * interactive surface, while keyboard focus still lands on exactly ONE button
 * per step (the indicator remains the semantic owner).
 */

function stepsRoot() {
  return document.querySelector('.nop-steps') as HTMLElement;
}

function stepItems() {
  return document.querySelectorAll('[data-slot="steps-item"]');
}

function indicators() {
  return document.querySelectorAll('[data-slot="steps-indicator"]');
}

function renderSteps() {
  const SchemaRenderer = createLayoutSchemaRenderer();
  render(
    <SchemaRenderer
      schemaUrl="test://layout/steps-click-surface"
      schema={{
        type: 'page',
        body: [
          {
            type: 'steps',
            testid: 'demo-steps-click-surface',
            defaultValue: 'a',
            items: [
              { value: 'a', title: 'A', description: 'a-desc' },
              { value: 'b', title: 'B', description: 'b-desc' },
              { value: 'c', title: 'C' },
            ],
          },
        ],
      }}
      data={{}}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('steps row-level click surface (G1-R4-视角8-02)', () => {
  afterEach(cleanup);

  it('selects the step when its title is clicked', async () => {
    renderSteps();

    expect(stepsRoot().getAttribute('data-current-index')).toBe('0');
    fireEvent.click(screen.getByText('B'));
    await waitFor(() => expect(stepsRoot().getAttribute('data-current-index')).toBe('1'));
  });

  it('selects the step when its description is clicked', async () => {
    renderSteps();

    fireEvent.click(screen.getByText('b-desc'));
    await waitFor(() => expect(stepsRoot().getAttribute('data-current-index')).toBe('1'));
  });

  it('keeps the indicator button as the single interactive stop per step', () => {
    renderSteps();

    const items = stepItems();
    expect(items.length).toBe(3);
    items.forEach((item) => {
      const buttons = item.querySelectorAll('button');
      expect(buttons.length).toBe(1);
      expect(buttons[0]?.getAttribute('data-slot')).toBe('steps-indicator');
    });
    expect(indicators().length).toBe(3);
  });

  it('does not select a disabled step via its title', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/steps-click-surface-disabled"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              testid: 'demo-steps-click-surface-disabled',
              defaultValue: 'a',
              items: [
                { value: 'a', title: 'A' },
                { value: 'b', title: 'B', disabled: true },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('B'));
    expect(stepsRoot().getAttribute('data-current-index')).toBe('0');
  });
});
