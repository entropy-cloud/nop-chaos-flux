import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

function wizardRoot() {
  return document.querySelector('.nop-wizard') as HTMLElement;
}

describe('WizardRenderer (W2a — layered interaction/lifecycle state)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the step nav, default active step (first), and active step body region', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-basic"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              testid: 'demo-wizard',
              steps: [
                { title: 'Account', body: [{ type: 'text', text: 'step-0-body' }] },
                { title: 'Profile', body: [{ type: 'text', text: 'step-1-body' }] },
                { title: 'Confirm', body: [{ type: 'text', text: 'step-2-body' }] },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = wizardRoot();
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('wizard-root');
    expect(root.getAttribute('data-current-step-index')).toBe('0');
    expect(root.getAttribute('data-step-count')).toBe('3');
    expect(root.getAttribute('data-last-commit-status')).toBe('idle');

    // Step 0 body is active; only the active step body renders by default
    // (mountOnEnter=false, unmountOnExit=false — other steps are unmounted).
    expect(screen.getByText('step-0-body')).toBeTruthy();
    const bodySlots = document.querySelectorAll('[data-slot="wizard-step-body"]');
    expect(bodySlots.length).toBe(1);
    expect(bodySlots[0].getAttribute('data-step-index')).toBe('0');
    expect(bodySlots[0].getAttribute('hidden')).toBeNull(); // active
  });

  it('mounts all step bodies when mountOnEnter=true (active shown, others hidden)', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-mount-on-enter"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              mountOnEnter: true,
              steps: [
                { title: 'A', body: [{ type: 'text', text: 'A-body' }] },
                { title: 'B', body: [{ type: 'text', text: 'B-body' }] },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // Advance to step 1 so step 1 also gets mounted.
    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() =>
      expect(wizardRoot().getAttribute('data-current-step-index')).toBe('1'),
    );

    // Both bodies mounted; only the active is visible.
    const bodySlots = document.querySelectorAll('[data-slot="wizard-step-body"]');
    expect(bodySlots.length).toBe(2);
    expect(bodySlots[0].getAttribute('hidden')).toBe(''); // inactive hidden
    expect(bodySlots[1].getAttribute('hidden')).toBeNull(); // active visible
  });

  it('advances via Next button and dispatches onChange with the next step payload', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-next"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              steps: [
                { title: 'A', body: [{ type: 'text', text: 'A-body' }] },
                { title: 'B', body: [{ type: 'text', text: 'B-body' }] },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'changeReported', value: true },
              },
            },
            { type: 'text', text: 'change:${changeReported ? "reported" : "pending"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('0');
    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() => {
      expect(wizardRoot().getAttribute('data-current-step-index')).toBe('1');
      expect(screen.getByText('change:reported')).toBeTruthy();
    });
  });

  it('prev button moves back and is disabled on the first step', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-prev"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
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

    const prev = screen.getByTestId('wizard-prev') as HTMLButtonElement;
    expect(prev.disabled).toBe(true); // disabled on first step

    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() => expect(wizardRoot().getAttribute('data-current-step-index')).toBe('1'));
    expect(prev.disabled).toBe(false);

    fireEvent.click(prev);
    await waitFor(() => expect(wizardRoot().getAttribute('data-current-step-index')).toBe('0'));
  });

  it('fires onStepCommit (lifecycle layer) BEFORE advancing and updates lastCommitStatus to success', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-commit"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              steps: [
                { title: 'A', body: [{ type: 'text', text: 'A' }] },
                { title: 'B', body: [{ type: 'text', text: 'B' }] },
              ],
              onStepCommit: {
                action: 'setValue',
                args: { path: 'commitReported', value: true },
              },
            },
            {
              type: 'text',
              text: 'commit:${commitReported ? "reported" : "pending"}',
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(wizardRoot().getAttribute('data-last-commit-status')).toBe('idle');
    expect(screen.getByText('commit:pending')).toBeTruthy();

    fireEvent.click(screen.getByTestId('wizard-next'));

    // Lifecycle layer updated: lastCommitStatus flipped to success; commit event fired.
    await waitFor(() => {
      expect(wizardRoot().getAttribute('data-last-commit-status')).toBe('success');
      expect(screen.getByText('commit:reported')).toBeTruthy();
    });
    // Interaction layer also advanced (separate state object).
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('1');
  });

  it('keeps stepIndex (interaction) and committing (lifecycle) in SEPARATE state objects (closure gate)', () => {
    // Closure gate (Phase 4 Exit Criteria): grep the renderer source to confirm the
    // interaction state (currentStepIndex) and lifecycle state (committing/lastCommitStatus)
    // are NOT collapsed into one broad state object.
    const src = readFileSync('src/wizard-renderer.tsx', 'utf8');

    // Two separate useState declarations for the two layers.
    expect(src).toMatch(/useState<WizardInteractionState>/);
    expect(src).toMatch(/useState<WizardLifecycleState>/);
    // No single state object holding both stepIndex and committing.
    expect(src).not.toMatch(/currentStepIndex.*committing|committing.*currentStepIndex/);
  });

  it('does NOT advertise dead valueOwnership/valueStatePath contracts (advertised-but-dead honesty)', () => {
    // F4 remediation: WizardSchema declared valueOwnership/valueStatePath but the renderer
    // never read them — step navigation is local controlled (value/defaultValue seed only).
    // statusPath (read-only summary) IS implemented and must remain.
    const renderer = readFileSync('src/wizard-renderer.tsx', 'utf8');
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

    // Dead ownership fields removed from schema + definition + renderer.
    expect(wizardSchemaBlock).not.toMatch(/valueOwnership/);
    expect(wizardSchemaBlock).not.toMatch(/valueStatePath/);
    expect(wizardDefinitionBlock).not.toMatch(/valueOwnership/);
    expect(wizardDefinitionBlock).not.toMatch(/valueStatePath/);
    expect(renderer).not.toMatch(/valueOwnership/);
    expect(renderer).not.toMatch(/valueStatePath/);
    // The IMPLEMENTED statusPath summary publication remains.
    expect(wizardSchemaBlock).toMatch(/statusPath/);
    expect(renderer).toMatch(/useStatusPathPublication/);
  });

  it('blocks non-linear step jumping when linear=true and allowStepJump=false', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-linear"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              linear: true,
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

    // On step 0; step 2 nav button should not be reachable (data-reachable absent).
    const step2Button = document.querySelector(
      '[data-slot="wizard-step-nav-button"][data-step-index="2"]',
    ) as HTMLButtonElement;
    expect(step2Button).toBeTruthy();
    expect(step2Button.disabled).toBe(true);
    expect(step2Button.getAttribute('data-reachable')).toBeNull();

    // Clicking disabled step 2 nav button does nothing.
    fireEvent.click(step2Button);
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('0');
  });

  it('allows non-linear step jumping when allowStepJump=true', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-jump"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              linear: true,
              allowStepJump: true,
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

    const step2Button = document.querySelector(
      '[data-slot="wizard-step-nav-button"][data-step-index="2"]',
    ) as HTMLButtonElement;
    expect(step2Button.disabled).toBe(false);
    expect(step2Button.getAttribute('data-reachable')).toBe('true');

    fireEvent.click(step2Button);
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('2');
  });

  it('dispatches onComplete (lifecycle) when the final step is committed', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-complete"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              defaultValue: 1, // start at last step
              steps: [
                { title: 'A', body: [{ type: 'text', text: 'A' }] },
                { title: 'B', body: [{ type: 'text', text: 'B' }] },
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

    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('1');
    // The Next button is on the last step (label localized; assert via testid + data attribute).
    const nextBtn = screen.getByTestId('wizard-next');
    expect(nextBtn.getAttribute('data-slot')).toBe('wizard-next-button');
    expect(screen.getByText('complete:pending')).toBeTruthy();

    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() => expect(screen.getByText('complete:reported')).toBeTruthy());
    // Stays on last step (no advancement beyond final).
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('1');
    expect(wizardRoot().getAttribute('data-last-commit-status')).toBe('success');
  });

  it('publishes a layered summary via statusPath that includes both interaction and lifecycle fields', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-status"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              statusPath: 'wizardStatus',
              steps: [
                { title: 'A', body: [{ type: 'text', text: 'A' }] },
                { title: 'B', body: [{ type: 'text', text: 'B' }] },
              ],
            },
            {
              type: 'text',
              text: 'idx:${wizardStatus?.currentStepIndex}:commit:${wizardStatus?.lastCommitStatus}',
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('idx:0:commit:idle')).toBeTruthy());

    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() => expect(screen.getByText('idx:1:commit:success')).toBeTruthy());
  });

  it('gates a step authored with disabled:true (boolean-literal envelope from production normalize)', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/wizard-disabled-step"
        schema={{
          type: 'page',
          body: [
            {
              type: 'wizard',
              // allowStepJump isolates the disabled effect: the ONLY thing that
              // should block step B is its disabled flag, not the linear gate.
              allowStepJump: true,
              steps: [
                { title: 'A', body: [{ type: 'text', text: 'A' }] },
                { title: 'B', disabled: true, body: [{ type: 'text', text: 'B' }] },
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

    // Step B (index 1) is disabled: nav button reflects data-disabled and is not clickable.
    const stepBButton = document.querySelector(
      '[data-slot="wizard-step-nav-button"][data-step-index="1"]',
    ) as HTMLButtonElement;
    expect(stepBButton).toBeTruthy();
    expect(stepBButton.getAttribute('data-disabled')).toBe('true');
    expect(stepBButton.disabled).toBe(true);

    // Clicking the disabled step does not navigate.
    fireEvent.click(stepBButton);
    expect(wizardRoot().getAttribute('data-current-step-index')).toBe('0');

    // canGoNext must skip the disabled step: Next commits step A then advances
    // directly to step C (index 2), bypassing the disabled step B.
    fireEvent.click(screen.getByTestId('wizard-next'));
    await waitFor(() =>
      expect(wizardRoot().getAttribute('data-current-step-index')).toBe('2'),
    );
  });
});
