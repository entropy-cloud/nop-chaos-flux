import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function wizardRoot() {
  return document.querySelector('.nop-wizard') as HTMLElement;
}

/**
 * C5.1 audit regression tests (plan 2026-08-04-0043-3):
 * - P1-1: actionNextSaveLabel dead-field honesty
 * - P1-2/P2-4: value/defaultValue 0-based numeric index seed semantics + non-reactivity
 * - P2-1: throwing beforeEnter/beforeLeave guard aborts navigation (no unhandled rejection)
 * - P2-2: commit failure surfaces as an inline error (no silent block)
 * - P1-3: visible:false steps skipped in nav + linear progression; last visible step is final
 * - P2-6: onStepCommit {ok:false} → lastCommitStatus=error + no advance
 */
describe('WizardRenderer C5.1 audit contract regression', () => {
  afterEach(() => {
    cleanup();
  });

  it('treats numeric value as a 0-based step index seed and ignores later value changes (non-reactive)', () => {
    // C5.1 P1-2/P2-4: the schema contract is a 0-based index (not 1-based) and
    // value/defaultValue are seed-only — runtime value changes must NOT move steps.
    const SchemaRenderer = createLayoutSchemaRenderer();
    const schema = {
      type: 'page',
      body: [
        {
          type: 'wizard',
          value: '${stepSeed}',
          steps: [
            { title: 'A', body: [{ type: 'text', text: 'A' }] },
            { title: 'B', body: [{ type: 'text', text: 'B' }] },
            { title: 'C', body: [{ type: 'text', text: 'C' }] },
          ],
        },
      ],
    } as const;
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-seed-numeric"
        schema={schema as never}
        data={{ stepSeed: 2 }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('2');
    expect(wizardRoot().getAttribute('data-current-step-key')).toBe('2');

    // Runtime change of `value` is NOT reactive: the step stays on index 2.
    rerender(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-seed-numeric"
        schema={schema as never}
        data={{ stepSeed: 0 }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('2');
  });

  it('does NOT advertise dead actionNextSaveLabel (declared-but-unconsumed contract)', () => {
    // C5.1 P1-1: actionNextSaveLabel was declared in the schema + registered in the
    // definition fields but the renderer never consumed it (AMIS "next-and-save"
    // semantics are absorbed by commitStep in the Flux model). Dead-field honesty
    // gate (same pattern as the valueOwnership removal test).
    const schemas = readFileSync('src/schemas.ts', 'utf8');
    const definitions = readFileSync('src/layout-renderer-definitions.ts', 'utf8');

    const wizardSchemaBlock = schemas.slice(
      schemas.indexOf('export interface WizardSchema'),
      schemas.indexOf('export type WizardLastCommitStatus'),
    );
    const wizardDefinitionBlock = definitions.slice(
      definitions.indexOf("type: 'wizard'"),
      definitions.indexOf("type: 'grid'"),
    );

    expect(wizardSchemaBlock).not.toMatch(/actionNextSaveLabel/);
    expect(wizardDefinitionBlock).not.toMatch(/actionNextSaveLabel/);
  });

  it('surfaces commit failure as an inline error and does not advance (onStepCommit {ok:false})', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-commit-fail"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              steps: [
                { title: 'A', body: [{ type: 'text', text: 'A' }] },
                { title: 'B', body: [{ type: 'text', text: 'B' }] },
              ],
              onStepCommit: { action: 'probe:failCommit' },
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          actionScope?.registerNamespace('probe', {
            kind: 'host',
            invoke() {
              return { ok: false };
            },
          });
        }}
      />,
    );

    fireEvent.click(screen.getByTestId('wizard-next'));

    await waitFor(() => {
      expect(wizardRoot().getAttribute('data-last-commit-status')).toBe('error');
    });
    // Error surfaced in the UI (no silent block) and navigation is aborted.
    const errorSlot = document.querySelector('[data-slot="wizard-step-error"]');
    expect(errorSlot).toBeTruthy();
    expect(errorSlot?.textContent?.length ?? 0).toBeGreaterThan(0);
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('0');
  });

  it('aborts navigation when a beforeEnter guard action throws (no unhandled rejection)', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-guard-throw"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              allowStepJump: true,
              steps: [
                { title: 'A', body: [{ type: 'text', text: 'A' }] },
                {
                  title: 'B',
                  body: [{ type: 'text', text: 'B' }],
                  beforeEnter: { action: 'probe:throwEnter' },
                },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          actionScope?.registerNamespace('probe', {
            kind: 'host',
            invoke() {
              throw new Error('guard exploded');
            },
          });
        }}
      />,
    );

    fireEvent.click(
      document.querySelector(
        '[data-slot="wizard-step-nav-button"][data-step-index="1"]',
      ) as HTMLButtonElement,
    );

    // Navigation aborted gracefully: still on step 0 (an unhandled rejection
    // would fail this test in vitest's unhandledRejection hook).
    await waitFor(() =>
      expect(wizardRoot().getAttribute('data-current-step-index')).toBe('0'),
    );
  });

  it('skips hidden steps in the nav and linear progression, and completes on the last visible step', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-hidden-steps"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              steps: [
                { title: 'A', body: [{ type: 'text', text: 'A' }] },
                { title: 'B', visible: false, body: [{ type: 'text', text: 'B' }] },
                { title: 'C', body: [{ type: 'text', text: 'C' }] },
              ],
              onComplete: {
                action: 'setValue',
                args: { path: 'completeReported', value: true },
              },
            },
            {
              type: 'text',
              text: 'complete:${completeReported ? "reported" : "pending"}',
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // Hidden step B is not rendered in the nav (data-step-index 1 absent).
    expect(
      document.querySelector('[data-slot="wizard-step-nav-item"][data-step-index="1"]'),
    ).toBeNull();

    // Linear progression skips the hidden step: Next from A commits and advances
    // directly to C (index 2) — the last visible step.
    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() =>
      expect(wizardRoot().getAttribute('data-current-step-index')).toBe('2'),
    );

    // The last visible step is the FINAL step: committing fires onComplete.
    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() => expect(screen.getByText('complete:reported')).toBeTruthy());
    expect(wizardRoot().getAttribute('data-last-commit-status')).toBe('success');
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('2');
  });

  it('renders the body region with the mt-4 spacing class in both orientations (P3-1)', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    const schema = {
      type: 'page',
      body: [
        {
          type: 'wizard',
          mode: 'horizontal' as const,
          steps: [{ title: 'A', body: [{ type: 'text', text: 'A' }] }],
        },
      ],
    };
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-body-region"
        schema={schema}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(document.querySelector('[data-slot="wizard-body-region"]')?.className).toBe('mt-4');

    rerender(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-body-region"
        schema={{ ...schema, body: [{ ...schema.body[0], mode: 'vertical' }] }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(document.querySelector('[data-slot="wizard-body-region"]')?.className).toBe('mt-4');
  });
});
