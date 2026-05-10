import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  resetFluxI18n();
});

describe('basicRendererDefinitions reaction and action behavior', () => {
  it('rerenders scope-debug when the current scope changes', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/reactions"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Increment',
              onClick: { action: 'setValue', args: { path: 'count', value: '${count + 1}' } },
            },
            { type: 'scope-debug', title: 'Probe', defaultExpand: true },
          ],
        }}
        data={{ count: 0 }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('Probe')).toBeTruthy();
    const debugRoot = document.querySelector('.nop-scope-debug');
    const debugJson = document.querySelector('[data-slot="scope-debug-json"]');
    expect(debugRoot).toBeTruthy();
    expect(debugRoot?.querySelector('[data-slot="scope-debug-header"]')).toBeTruthy();
    expect(debugRoot?.querySelector('[data-slot="scope-debug-kind"]')?.textContent).toContain(
      'Debug',
    );
    expect(debugRoot?.querySelector('[data-slot="scope-debug-title"]')?.textContent).toContain(
      'Probe',
    );
    expect(debugRoot?.querySelector('[data-slot="scope-debug-body"]')).toBeTruthy();
    expect(debugJson?.textContent).toBe('{\n  "count": 0\n}');
    fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
    await waitFor(() => expect(debugJson?.textContent).toBe('{\n  "count": 1\n}'));
    cleanup();
  });

  it('dispatches event fields through renderer-generated handlers', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/reactions"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open dialog',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'Runtime event dialog',
                  body: [{ type: 'text', text: 'Opened from event' }],
                },
              },
            },
            { type: 'text', text: '${message}' },
          ],
        }}
        data={{ message: 'Initial' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('Initial')).toBeTruthy();
    screen.getByText('Open dialog').click();
    expect(await screen.findByText('Runtime event dialog')).toBeTruthy();
    expect(await screen.findByText('Opened from event')).toBeTruthy();
    cleanup();
  });

  it('runs reaction actions immediately when configured', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/reactions"
        schema={{
          type: 'page',
          body: [
            {
              type: 'reaction',
              watch: '${count}',
              immediate: true,
              actions: { action: 'setValue', args: { path: 'message', value: 'count:${count}' } },
            },
            { type: 'text', text: '${message}' },
          ],
        }}
        data={{ count: 3 }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('count:3')).toBeTruthy());
    cleanup();
  });

  it('gates reaction execution with when and once', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/reactions"
        schema={{
          type: 'page',
          body: [
            {
              type: 'reaction',
              watch: '${status}',
              immediate: true,
              once: true,
              when: 'value === "ready" && prev !== value',
              actions: {
                action: 'setValue',
                args: { path: 'message', value: 'triggered:${status}' },
              },
            },
            {
              type: 'button',
              label: 'Ready',
              onClick: { action: 'setValue', args: { path: 'status', value: 'ready' } },
            },
            {
              type: 'button',
              label: 'Done',
              onClick: { action: 'setValue', args: { path: 'status', value: 'done' } },
            },
            { type: 'text', text: '${message}' },
          ],
        }}
        data={{ status: 'idle', message: 'initial' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    expect(screen.getByText('initial')).toBeTruthy();
    screen.getByText('Done').click();
    await Promise.resolve();
    expect(screen.getByText('initial')).toBeTruthy();
    screen.getByText('Ready').click();
    await waitFor(() => expect(screen.getByText('triggered:ready')).toBeTruthy());
    screen.getByText('Done').click();
    await Promise.resolve();
    expect(screen.getByText('triggered:ready')).toBeTruthy();
    cleanup();
  });

  it('coalesces reaction triggers during debounce windows', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/reactions"
        schema={{
          type: 'page',
          body: [
            {
              type: 'reaction',
              watch: '${count}',
              debounce: 20,
              actions: { action: 'setValue', args: { path: 'message', value: 'count:${count}' } },
            },
            {
              type: 'button',
              label: 'Inc',
              onClick: { action: 'setValue', args: { path: 'count', value: '${count + 1}' } },
            },
            { type: 'text', text: '${message}' },
          ],
        }}
        data={{ count: 0, message: 'start' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const button = screen.getByText('Inc');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText('count:3')).toBeTruthy());
    cleanup();
  });

  it('recomputes derived values when a watched field changes through button actions', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/reactions"
        schema={{
          type: 'page',
          body: [
            { type: 'text', text: 'counter: ${counter}' },
            {
              type: 'button',
              label: 'Increment',
              onClick: {
                action: 'setValue',
                args: { path: 'counter', value: '${(counter ?? 0) + 1}' },
              },
            },
            {
              type: 'reaction',
              watch: ['counter'],
              actions: [
                { action: 'setValue', args: { path: 'doubled', value: '${(counter ?? 0) * 2}' } },
              ],
            },
            { type: 'text', text: 'doubled: ${doubled}' },
          ],
        }}
        data={{ counter: 0, doubled: 0 }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    fireEvent.click(screen.getByText('Increment'));
    await waitFor(() => expect(screen.getByText('counter: 1')).toBeTruthy());
    await waitFor(() => expect(screen.getByText('doubled: 2')).toBeTruthy());
    cleanup();
  });

  it('applies repeated button setValue actions against the latest scope value', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/reactions"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Inc',
              onClick: { action: 'setValue', args: { path: 'count', value: '${count + 1}' } },
            },
            { type: 'text', text: '${count}' },
          ],
        }}
        data={{ count: 0 }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const button = screen.getByText('Inc');
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByText('3')).toBeTruthy());
    cleanup();
  });

  it('prevents unbounded self-trigger cascades in reactions', async () => {
    const notify = vi.fn();
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/reactions"
        schema={{
          type: 'page',
          body: [
            {
              type: 'reaction',
              watch: '${count}',
              immediate: true,
              actions: { action: 'setValue', args: { path: 'count', value: '${count + 1}' } },
            },
            { type: 'text', text: '${count}' },
          ],
        }}
        data={{ count: 0 }}
        env={{ ...env, notify }}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => {
      const value = Number(screen.getByText(/^[0-9]+$/).textContent ?? '0');
      expect(value).toBeGreaterThan(0);
    });
    const finalValue = Number(screen.getByText(/^[0-9]+$/).textContent ?? '0');
    expect(finalValue).toBeLessThan(200);
    cleanup();
  });

  it('does not overwrite mount-time reaction writes with the initial page data sync effect', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/reactions"
        schema={{
          type: 'page',
          body: [
            {
              type: 'reaction',
              watch: '${count}',
              immediate: true,
              actions: { action: 'setValue', args: { path: 'message', value: 'count:${count}' } },
            },
            { type: 'text', text: '${message}' },
          ],
        }}
        data={{ count: 1, message: 'initial' }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    await waitFor(() => expect(screen.getByText('count:1')).toBeTruthy());
    cleanup();
  });
});
