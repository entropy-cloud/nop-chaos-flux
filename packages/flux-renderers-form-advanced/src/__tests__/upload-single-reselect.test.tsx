import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { buttonRenderer, formTestHarness, formulaCompiler } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

const { submitCalls } = formTestHarness;

const allDefinitions = [
  ...formRendererDefinitions,
  ...formAdvancedRendererDefinitions,
  buttonRenderer,
];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  submitCalls.length = 0;
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

interface Deferred {
  promise: Promise<{ status: number; data: unknown }>;
  resolve: (value: { status: number; data: unknown }) => void;
}

function createDeferred(): Deferred {
  let resolve!: Deferred['resolve'];
  const promise = new Promise<{ status: number; data: unknown }>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/**
 * G2-R2-视角5-01 (V12b plan 485 Phase 2, proof-first): single-mode upload
 * holds the response for the named file behind a manual gate so the test can
 * keep it in flight while a re-selection happens.
 */
const gates = new Map<string, Deferred>();

function gateUploadEnv(): RendererEnv {
  return {
    fetcher: async function <T>(api: any, ctx: ApiRequestContext) {
      const body = (ctx.scope?.readOwn?.() ?? {}) as { __uploadFile?: { name?: string } };
      const name = body.__uploadFile?.name ?? '';
      if (name === 'a.txt' || name === 'b.txt') {
        let gate = gates.get(name);
        if (!gate) {
          gate = createDeferred();
          gates.set(name, gate);
        }
        const result = await gate.promise;
        return result as { status: number; data: T };
      }
      if (api?.url === '/api/submit') {
        submitCalls.push(ctx.scope?.readOwn?.() as Record<string, unknown>);
        return { status: 0, data: ctx.scope?.readOwn?.() as T };
      }
      return { status: 0, data: ctx.scope?.readOwn?.() as T };
    },
    notify: () => undefined,
  };
}

function setFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { configurable: true, value: files });
  fireEvent.change(input);
}

async function submit() {
  const before = submitCalls.length;
  fireEvent.click(screen.getByText('Submit'));
  await waitFor(() => expect(submitCalls.length).toBe(before + 1));
}

describe('input-file single mode — re-select supersedes in-flight upload (G2-R2-视角5-01)', () => {
  it('aborts the in-flight upload on re-select so its stale completion is discarded', async () => {
    gates.clear();
    const SchemaRenderer = createSchemaRenderer(allDefinitions);
    render(
      <SchemaRenderer
        schemaUrl="test://upload-single-reselect"
        schema={
          {
            type: 'form',
            id: 'upload-form',
            data: {},
            submitAction: { action: 'ajax', args: { url: '/api/submit', method: 'post' } },
            body: [
              {
                type: 'input-file',
                name: 'file',
                label: 'file',
                valueMode: 'url',
                uploadAction: { action: 'ajax', args: { url: '/api/upload', method: 'post' } },
              },
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'component:submit', componentId: 'upload-form' },
              },
            ],
          } as never
        }
        env={gateUploadEnv()}
        formulaCompiler={formulaCompiler}
      />,
    );

    const input = document.querySelector<HTMLInputElement>(
      'input[data-testid="nop-input-file-input"]',
    )!;

    // 1. Select a.txt — upload starts and stays in flight (gated).
    setFiles(input, [new File(['aaa'], 'a.txt', { type: 'text/plain' })]);
    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="nop-input-file-item"][data-item-status="pending"]'),
      ).toBeTruthy();
    });
    expect(gates.has('a.txt')).toBe(true);

    // 2. Re-select b.txt while a.txt is still in flight.
    setFiles(input, [new File(['bbb'], 'b.txt', { type: 'text/plain' })]);
    await waitFor(() => {
      const statuses = Array.from(
        document.querySelectorAll('[data-testid="nop-input-file-item"]'),
      ).map((node) => node.getAttribute('data-item-status'));
      expect(statuses).toContain('pending');
    });
    // The superseded a.txt pending row is gone from the list...
    const pendingRows = Array.from(
      document.querySelectorAll('[data-testid="nop-input-file-item"]'),
    ).filter((node) => node.getAttribute('data-item-status') === 'pending');
    expect(pendingRows).toHaveLength(1);
    expect(pendingRows[0]!.textContent).toContain('b.txt');
    expect(gates.has('b.txt')).toBe(true);

    // 3. b.txt completes and commits.
    gates.get('b.txt')!.resolve({
      status: 0,
      data: { url: 'https://cdn.example.com/b.txt', name: 'b.txt', size: 3 },
    });
    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="nop-input-file-item"][data-item-status="done"]'),
      ).toBeTruthy();
    });
    await submit();
    expect(submitCalls.at(-1)!.file).toBe('https://cdn.example.com/b.txt');

    // 4. THE STALE COMPLETION: a.txt's response lands AFTER b.txt committed.
    //    It must be discarded (controller aborted at re-select) — the field
    //    value must stay b.txt, not be clobbered back to a.txt.
    gates.get('a.txt')!.resolve({
      status: 0,
      data: { url: 'https://cdn.example.com/a.txt', name: 'a.txt', size: 3 },
    });
    await waitFor(() => {
      expect(gates.get('a.txt')!.promise).toBeDefined();
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    await submit();
    expect(submitCalls.at(-1)!.file).toBe('https://cdn.example.com/b.txt');
  });
});
