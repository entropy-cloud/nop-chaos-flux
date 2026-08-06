import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

function wizardRoot() {
  return document.querySelector('.nop-wizard') as HTMLElement;
}

describe('20-09 wizard focus move + step-change announcement (APG wizard)', () => {
  afterEach(cleanup);

  it('moves focus into the new step body first focusable element after Next', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-a11y-focus"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              steps: [
                { title: 'A', body: [{ type: 'text', text: 'A-body' }] },
                {
                  title: 'B',
                  body: [{ type: 'button', label: 'In Step B', testid: 'step-b-button' }],
                },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() =>
      expect(wizardRoot().getAttribute('data-current-step-index')).toBe('1'),
    );

    expect(document.activeElement).toBe(screen.getByTestId('step-b-button'));
  });

  it('announces the current step via a polite status region', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-a11y-status"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              steps: [
                { title: 'Account', body: [{ type: 'text', text: 'A-body' }] },
                { title: 'Profile', body: [{ type: 'text', text: 'B-body' }] },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const status = document.querySelector('[data-slot="wizard-status"]');
    expect(status).toBeTruthy();
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.textContent).toContain('Account');

    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() =>
      expect(wizardRoot().getAttribute('data-current-step-index')).toBe('1'),
    );
    expect(status?.textContent).toContain('Profile');
  });

  it('does not move focus on initial mount', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-a11y-no-focus-on-mount"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              steps: [
                { title: 'A', body: [{ type: 'button', label: 'In Step A', testid: 'step-a-button' }] },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('step-a-button')).toBeTruthy());
    expect(document.activeElement).not.toBe(screen.getByTestId('step-a-button'));
  });
});
