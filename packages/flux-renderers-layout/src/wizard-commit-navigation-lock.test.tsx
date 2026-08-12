import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RendererComponentProps, RendererEnv } from '@nop-chaos/flux-core';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';
import { WizardRenderer } from './wizard-renderer.js';
import type { WizardSchema } from './schemas.js';

function wizardRoot() {
  return document.querySelector('.nop-wizard') as HTMLElement;
}

function stepNavButton(index: number): HTMLButtonElement {
  return document.querySelector(
    `[data-slot="wizard-step-nav-button"][data-step-index="${index}"]`,
  ) as HTMLButtonElement;
}

/**
 * P1-03 + P2-09/P2-10 focused suite: async commit navigation lock,
 * numeric value key-matching, and stepError real-message rendering.
 */
describe('WizardRenderer — commit navigation lock / key-match / stepError (P1-03, P2-09, P2-10)', () => {
  afterEach(() => {
    cleanup();
  });

  function deferredFetcher() {
    let resolveCommit!: (value: { ok: boolean; status: number; data: null }) => void;
    const commitGate = new Promise<{ ok: boolean; status: number; data: null }>((res) => {
      resolveCommit = res;
    });
    const urls: string[] = [];
    const fetcher = vi.fn(async (api: { url?: string }) => {
      if (api?.url?.startsWith('/commit-')) {
        await commitGate;
      }
      urls.push(api?.url ?? '');
      return { ok: true, status: 200, data: null as never };
    }) as unknown as RendererEnv['fetcher'];
    return { fetcher, urls, resolveCommit };
  }

  it('locks step-nav and Prev while commitStep awaits — no step move, no wizard:change (P1-03)', async () => {
    const { fetcher, urls, resolveCommit } = deferredFetcher();
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-lock"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              allowStepJump: true,
              steps: [
                { key: 'a', title: 'A', body: [{ type: 'text', text: 'A' }] },
                { key: 'b', title: 'B', body: [{ type: 'text', text: 'B' }] },
                { key: 'c', title: 'C', body: [{ type: 'text', text: 'C' }] },
              ],
              onChange: { action: 'ajax', args: { url: '/change-${currentStepKey}' } },
              onStepCommit: { action: 'ajax', args: { url: '/commit-${currentStepKey}' } },
            },
          ],
        }}
        data={{}}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    // Step 0 commit hangs.
    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() => expect(wizardRoot().getAttribute('data-committing')).toBe('true'));

    // Step-nav jump to index 2 must be REJECTED while committing (P1-03).
    fireEvent.click(stepNavButton(2));
    await act(async () => { await Promise.resolve(); });
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('0');
    expect(urls.filter((u) => u.startsWith('/change-'))).toHaveLength(0);

    // Resolve the commit → continuation advances from the committed step,
    // exactly once, and no stale jump back to a user-navigated step.
    await act(async () => { resolveCommit({ ok: true, status: 200, data: null }); });
    await waitFor(() => expect(wizardRoot().getAttribute('data-current-step-index')).toBe('1'));
    expect(urls).toContain('/commit-a');
    expect(urls).toContain('/change-b');
    expect(urls.filter((u) => u.startsWith('/change-'))).toHaveLength(1);
  });

  it('locks Prev while commitStep awaits on a middle step (P1-03)', async () => {
    const { fetcher, resolveCommit } = deferredFetcher();
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-lock-prev"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              defaultValue: 1,
              steps: [
                { key: 'a', title: 'A', body: [{ type: 'text', text: 'A' }] },
                { key: 'b', title: 'B', body: [{ type: 'text', text: 'B' }] },
                { key: 'c', title: 'C', body: [{ type: 'text', text: 'C' }] },
              ],
              onStepCommit: { action: 'ajax', args: { url: '/commit-${currentStepKey}' } },
            },
          ],
        }}
        data={{}}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('1');
    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() => expect(wizardRoot().getAttribute('data-committing')).toBe('true'));

    // Prev must be locked while committing.
    fireEvent.click(screen.getByTestId('wizard-prev'));
    await act(async () => { await Promise.resolve(); });
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('1');

    // After resolution navigation resumes (Prev works again).
    await act(async () => { resolveCommit({ ok: true, status: 200, data: null }); });
    await waitFor(() => expect(wizardRoot().getAttribute('data-current-step-index')).toBe('2'));
  });

  it('last-step commit pending → no onComplete, no navigation; resolve → onComplete fires once (P1-03)', async () => {
    const { fetcher, urls, resolveCommit } = deferredFetcher();
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-lock-complete"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              allowStepJump: true,
              defaultValue: 2,
              steps: [
                { key: 'a', title: 'A', body: [{ type: 'text', text: 'A' }] },
                { key: 'b', title: 'B', body: [{ type: 'text', text: 'B' }] },
                { key: 'c', title: 'C', body: [{ type: 'text', text: 'C' }] },
              ],
              onComplete: { action: 'ajax', args: { url: '/complete-${currentStepKey}' } },
              onStepCommit: { action: 'ajax', args: { url: '/commit-${currentStepKey}' } },
            },
          ],
        }}
        data={{}}
        env={{ ...env, fetcher }}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('2');
    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() => expect(wizardRoot().getAttribute('data-committing')).toBe('true'));

    // Step-nav back to step 0 must be REJECTED while the last-step commit is pending.
    fireEvent.click(stepNavButton(0));
    await act(async () => { await Promise.resolve(); });
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('2');
    expect(urls.filter((u) => u.startsWith('/complete-'))).toHaveLength(0);

    // Resolve: onComplete fires exactly once, for the committed step, while
    // the wizard still sits on the last step.
    await act(async () => { resolveCommit({ ok: true, status: 200, data: null }); });
    await waitFor(() => expect(urls).toContain('/complete-c'));
    expect(urls.filter((u) => u.startsWith('/complete-'))).toHaveLength(1);
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('2');
  });

  it('numeric value key-matches a numeric step key before clamping to index (P2-09)', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-numeric-key"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              value: 5,
              steps: [
                { key: 5, title: 'Five', body: [{ type: 'text', text: 'F' }] },
                { key: 'b', title: 'B', body: [{ type: 'text', text: 'B' }] },
                { key: 'c', title: 'C', body: [{ type: 'text', text: 'C' }] },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    // key 5 matches the FIRST step — the numeric value must not be clamped to
    // index 2 (min(5, 3-1)).
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('0');
  });

  it('numeric value with no matching key falls back to clamped 0-based index (P2-09)', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-numeric-index"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              value: 1,
              steps: [
                { title: 'A', body: [{ type: 'text', text: 'A' }] },
                { title: 'B', body: [{ type: 'text', text: 'B' }] },
                { title: 'C', body: [{ type: 'text', text: 'C' }] },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('1');
  });

  it('error box renders the real stepError message; generic i18n only as fallback (P2-10)', async () => {
    // Direct-render path: a REJECTING onStepCommit drives the catch branch
    // where stepError carries the real error.message (the schema-compiler ajax
    // action converts fetcher failures to ok:false results, so it cannot
    // exercise the throw branch).
    const onStepCommit = vi.fn(async () => {
      throw new Error('commit exploded');
    });
    const props = {
      id: 'wizard-node',
      path: 'wizard[0]',
      schema: { type: 'wizard' } as never,
      templateNode: {} as never,
      node: { scope: { id: 'scope-1', parent: undefined } } as never,
      props: {
        steps: [
          { title: 'A', body: [] },
          { title: 'B', body: [] },
        ],
      },
      meta: { cid: 1, className: '' },
      events: { onStepCommit },
      reactions: {},
      regions: {},
      helpers: { dispatch: vi.fn() } as never,
    } as unknown as RendererComponentProps<WizardSchema>;
    render(<WizardRenderer {...props} />);

    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() =>
      expect(
        document.querySelector('[data-slot="wizard-step-error"]')?.textContent,
      ).toContain('commit exploded'),
    );
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('0');
  });
});
