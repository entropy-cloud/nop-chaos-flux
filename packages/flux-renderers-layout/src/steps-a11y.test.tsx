import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

function indicators() {
  return document.querySelectorAll('[data-slot="steps-indicator"]');
}

describe('20-04 steps indicator accessible name (WCAG 4.1.2)', () => {
  afterEach(cleanup);

  it('gives finish/error icon-only indicator buttons a non-empty accessible name with the step title', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/steps-a11y-names"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              value: 'review',
              items: [
                { value: 'draft', title: 'Draft' },
                { value: 'review', title: 'Review' },
                { value: 'done', title: 'Done' },
                { value: 'failed', title: 'Failed', status: 'error' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Review')).toBeTruthy());

    const nodes = indicators();
    expect(nodes.length).toBe(4);

    // Draft (index 0, finish status — icon-only CheckIcon) must carry a name.
    const finishIndicator = nodes[0];
    expect(finishIndicator.getAttribute('data-status')).toBe('finish');
    const finishName = finishIndicator.getAttribute('aria-label') ?? '';
    expect(finishName.length).toBeGreaterThan(0);
    expect(finishName).toContain('Draft');

    // Failed (index 3, explicit error status — icon-only XIcon) must carry a name.
    const errorIndicator = nodes[3];
    expect(errorIndicator.getAttribute('data-status')).toBe('error');
    const errorName = errorIndicator.getAttribute('aria-label') ?? '';
    expect(errorName.length).toBeGreaterThan(0);
    expect(errorName).toContain('Failed');

    // Every indicator has a non-empty accessible name.
    for (const node of Array.from(nodes)) {
      expect(((node.getAttribute('aria-label') ?? '').length)).toBeGreaterThan(0);
    }
  });
});
