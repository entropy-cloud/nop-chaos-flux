import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLayoutSchemaRenderer, env, formulaCompiler } from './test-support.js';

function stepsRoot() {
  return document.querySelector('.nop-steps') as HTMLElement;
}

function indicators() {
  return document.querySelectorAll('[data-slot="steps-indicator"]');
}

function stepItems() {
  return document.querySelectorAll('[data-slot="steps-item"]');
}

describe('StepsRenderer (W4b — step progress display + value three-state)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders nop-steps marker with title/description for each item and derives status', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/steps-basic"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              testid: 'demo-steps',
              value: 'review',
              items: [
                { value: 'draft', title: 'Draft', description: 'draft-desc' },
                { value: 'review', title: 'Review', description: 'review-desc' },
                { value: 'done', title: 'Done', description: 'done-desc' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = stepsRoot();
    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('steps-root');
    expect(root.getAttribute('data-orientation')).toBe('horizontal');
    expect(root.getAttribute('data-current-index')).toBe('1');
    expect(stepItems().length).toBe(3);

    // status derivation: finish / process / wait
    expect(stepItems()[0]?.getAttribute('data-status')).toBe('finish');
    expect(stepItems()[1]?.getAttribute('data-status')).toBe('process');
    expect(stepItems()[2]?.getAttribute('data-status')).toBe('wait');
    expect(stepItems()[1]?.getAttribute('data-current')).toBe('true');

    expect(screen.getByText('Review')).toBeTruthy();
    expect(screen.getByText('review-desc')).toBeTruthy();
  });

  it('respects explicit per-item status override', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/steps-status-override"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              value: 'a',
              items: [
                { value: 'a', title: 'A', status: 'error' },
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

    expect(stepItems()[0]?.getAttribute('data-status')).toBe('error');
  });

  it('clamps an out-of-range numeric value to the nearest valid step', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/steps-clamp"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              value: 99,
              items: [
                { title: 'A' },
                { title: 'B' },
                { title: 'C' },
              ],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    // 99 clamps to last index (2)
    expect(stepsRoot().getAttribute('data-current-index')).toBe('2');
    expect(stepItems()[2]?.getAttribute('data-current')).toBe('true');
  });

  it('renders vertical orientation', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/steps-vertical"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              orientation: 'vertical',
              value: 'b',
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

    expect(stepsRoot().getAttribute('data-orientation')).toBe('vertical');
  });

  it('renders empty state when items is empty', () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/steps-empty"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              testid: 'demo-steps-empty',
              items: [],
            },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    const root = stepsRoot();
    expect(root.getAttribute('data-empty')).toBe('true');
    expect(document.querySelector('[data-slot="steps-empty"]')).toBeTruthy();
    expect(stepItems().length).toBe(0);
  });

  it('writes back locally and dispatches onChange on click (local default)', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/steps-local"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              testid: 'demo-steps-local',
              defaultValue: 'a',
              items: [
                { value: 'a', title: 'A' },
                { value: 'b', title: 'B' },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'stepTouched', value: true },
              },
            },
            { type: 'text', text: 'steps:${stepTouched ? "yes" : "no"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(stepsRoot().getAttribute('data-current-index')).toBe('0');
    fireEvent.click(indicators()[1]);
    await waitFor(() => expect(stepsRoot().getAttribute('data-current-index')).toBe('1'));
    expect(screen.getByText('steps:yes')).toBeTruthy();
  });

  it('controlled ownership: value drives current step, clicks dispatch onChange but do not mutate', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/steps-controlled"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              testid: 'demo-steps-controlled',
              valueOwnership: 'controlled',
              value: 'a',
              items: [
                { value: 'a', title: 'A' },
                { value: 'b', title: 'B' },
              ],
              onChange: {
                action: 'setValue',
                args: { path: 'stepsCtrlTouched', value: true },
              },
            },
            { type: 'text', text: 'ctrl:${stepsCtrlTouched ? "touched" : "untouched"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    expect(stepsRoot().getAttribute('data-ownership')).toBe('controlled');
    expect(stepsRoot().getAttribute('data-current-index')).toBe('0');

    fireEvent.click(indicators()[1]);
    await waitFor(() => expect(screen.getByText('ctrl:touched')).toBeTruthy());
    // Controlled: value 'a' still drives state
    expect(stepsRoot().getAttribute('data-current-index')).toBe('0');
  });

  it('writes back to scope when valueOwnership=scope and valueStatePath is set', async () => {
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/steps-scope"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              testid: 'demo-steps-scope',
              valueOwnership: 'scope',
              valueStatePath: 'currentStep',
              defaultValue: 'a',
              items: [
                { value: 'a', title: 'A' },
                { value: 'b', title: 'B' },
              ],
            },
            { type: 'text', text: 'scope:${currentStep ?? "none"}' },
          ],
        }}
        data={{}}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(indicators()[1]);
    await waitFor(() => expect(screen.getByText('scope:b')).toBeTruthy());
    expect(stepsRoot().getAttribute('data-current-index')).toBe('1');
  });

  it('degrades scope ownership (missing valueStatePath) to local controlled with a dev warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const SchemaRenderer = createLayoutSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://layout/steps-scope-degraded"
        schema={{
          type: 'page',
          body: [
            {
              type: 'steps',
              testid: 'demo-steps-scope-degraded',
              valueOwnership: 'scope',
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

    // Degrades to local controlled (interactive)
    expect(stepsRoot().getAttribute('data-ownership')).toBe('local');
    expect(stepsRoot().getAttribute('data-current-index')).toBe('0');
    fireEvent.click(indicators()[1]);
    await waitFor(() => expect(stepsRoot().getAttribute('data-current-index')).toBe('1'));
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
