import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { ApiRequestContext, RendererEnv } from '@nop-chaos/flux-core';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formulaCompiler, formStateProbeRenderer } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

const allDefinitions = [...formRendererDefinitions, ...formAdvancedRendererDefinitions, formStateProbeRenderer];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
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
 * V12f Phase 3 — [G2-R4-视角5-02] multiple 上传的 maxFiles 余量计算不含
 * 在飞条目：并发选择窗口内上限失效，超限文件静默全部上传。
 * 契约：余量 = maxFiles − 已提交 − 在飞；并发窗口内的超额文件必须走
 * 拒绝通道（可见 notice + onReject），不得进入上传队列。
 */
const gates = new Map<string, Deferred>();

function gateUploadEnv(): RendererEnv {
  return {
    fetcher: async function <T>(api: any, ctx: ApiRequestContext) {
      const body = (ctx.scope?.readOwn?.() ?? {}) as { __uploadFile?: { name?: string } };
      const name = body.__uploadFile?.name ?? '';
      if (['a.txt', 'b.txt', 'c.txt', 'd.txt'].includes(name)) {
        let gate = gates.get(name);
        if (!gate) {
          gate = createDeferred();
          gates.set(name, gate);
        }
        const result = await gate.promise;
        return result as { status: number; data: T };
      }
      return { status: 0, data: ctx.scope?.readOwn?.() as T };
    },
    notify: () => undefined,
  };
}

function renderUploadField() {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  render(
    <SchemaRenderer
      schemaUrl="test://upload-maxfiles-inflight"
      schema={
        {
          type: 'form',
          id: 'f',
          data: {},
          body: [
            {
              type: 'input-file',
              name: 'files',
              label: 'files',
              multiple: true,
              maxFiles: 2,
              valueMode: 'array',
              uploadAction: { action: 'ajax', args: { url: '/api/upload' } },
            },
            { type: 'form-state-probe', name: 'files' },
          ],
        } as never
      }
      env={gateUploadEnv()}
      formulaCompiler={formulaCompiler}
    />,
  );
  return document.querySelector<HTMLInputElement>('input[data-testid="nop-input-file-input"]')!;
}

function setFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { configurable: true, value: files });
  fireEvent.change(input);
}

function pendingNames(): string[] {
  return Array.from(
    document.querySelectorAll('[data-testid="nop-input-file-item"][data-item-status="pending"]'),
  ).map((node) => node.textContent ?? '');
}

function committedUrls(): string[] {
  const state = JSON.parse(
    document.querySelector('[data-testid="form-state:files"]')?.textContent ?? 'null',
  ) as Array<{ url?: string }> | null;
  return Array.isArray(state) ? state.map((entry) => entry.url ?? '') : [];
}

describe('V12f [G2-R4-视角5-02] maxFiles quota counts in-flight uploads', () => {
  beforeEach(() => {
    gates.clear();
  });

  it('rejects a second selection while the first batch is still in flight', async () => {
    const input = renderUploadField();

    // 1. Select a.txt + b.txt (maxFiles=2) — both go in flight, gated.
    setFiles(input, [
      new File(['aaa'], 'a.txt', { type: 'text/plain' }),
      new File(['bbb'], 'b.txt', { type: 'text/plain' }),
    ]);
    await waitFor(() => expect(pendingNames()).toHaveLength(2));

    // 2. Concurrent selection window: c.txt + d.txt arrive while nothing is
    //    committed yet. Quota must count the two in-flight uploads → both
    //    rejected, none queued.
    setFiles(input, [
      new File(['ccc'], 'c.txt', { type: 'text/plain' }),
      new File(['ddd'], 'd.txt', { type: 'text/plain' }),
    ]);
    await waitFor(() => {
      const notice = document.querySelector('[data-slot="upload-rejection"]');
      expect(notice).not.toBeNull();
      expect(notice!.getAttribute('role')).toBe('alert');
      expect(notice!.textContent).toContain('Too many files');
    });
    await waitFor(() => {
      expect(pendingNames()).toHaveLength(2);
    });
    expect(pendingNames().join(' ')).not.toContain('c.txt');
    expect(pendingNames().join(' ')).not.toContain('d.txt');

    // 3. Let the first batch finish: exactly 2 files may commit.
    gates.get('a.txt')!.resolve({ status: 0, data: { url: 'https://cdn.example.com/a.txt', name: 'a.txt', size: 3 } });
    gates.get('b.txt')!.resolve({ status: 0, data: { url: 'https://cdn.example.com/b.txt', name: 'b.txt', size: 3 } });
    await waitFor(() => {
      expect(committedUrls()).toEqual([
        'https://cdn.example.com/a.txt',
        'https://cdn.example.com/b.txt',
      ]);
    });
  });

  it('counts committed + in-flight together when a slot already closed', async () => {
    const input = renderUploadField();

    setFiles(input, [
      new File(['aaa'], 'a.txt', { type: 'text/plain' }),
      new File(['bbb'], 'b.txt', { type: 'text/plain' }),
    ]);
    await waitFor(() => expect(pendingNames()).toHaveLength(2));

    // a.txt commits (1/2); b.txt stays in flight.
    gates.get('a.txt')!.resolve({ status: 0, data: { url: 'https://cdn.example.com/a.txt', name: 'a.txt', size: 3 } });
    await waitFor(() => expect(committedUrls()).toHaveLength(1));

    // Remaining = 2 − 1 committed − 1 in-flight = 0 → c.txt rejected.
    setFiles(input, [new File(['ccc'], 'c.txt', { type: 'text/plain' })]);
    await waitFor(() => {
      const notice = document.querySelector('[data-slot="upload-rejection"]');
      expect(notice).not.toBeNull();
      expect(notice!.textContent).toContain('Too many files');
    });
    await waitFor(() => {
      expect(pendingNames()).toHaveLength(1);
    });
    expect(pendingNames()[0]).toContain('b.txt');

    gates.get('b.txt')!.resolve({ status: 0, data: { url: 'https://cdn.example.com/b.txt', name: 'b.txt', size: 3 } });
    await waitFor(() => {
      expect(committedUrls()).toEqual([
        'https://cdn.example.com/a.txt',
        'https://cdn.example.com/b.txt',
      ]);
    });
  });
});
