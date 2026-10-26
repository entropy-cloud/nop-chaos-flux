import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { AiConnector } from '@nop-chaos/flux-renderers-ai';
import type { ComponentHandleRegistry } from '@nop-chaos/flux-core';
import { createNopDebugger } from '@nop-chaos/nop-debugger';
import type { NopSchemaPatch, NopSchemaPatchApplier } from '@nop-chaos/nop-debugger';
import { createAiDebuggerExtension } from '../panel/extension.js';
import { INJECTION_PROBE } from './injection-probe.js';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

const PROPOSE_ARGS = {
  target: { nodeId: 'node_42' },
  ops: [{ type: 'set-prop', field: 'label', value: 'Patched label' }],
  reason: INJECTION_PROBE,
};

function fakeRegistry(items: Array<{ cid: number; nodeId: string; path: string }>) {
  return {
    getDebugSnapshot: () => ({
      handles: items.map((item) => ({ cid: item.cid, mounted: true, type: 'input-text' })),
    }),
    getHandleDebugData: (cid: number) => {
      const item = items.find((entry) => entry.cid === cid);
      return item ? { nodeId: item.nodeId, path: item.path, rendererType: 'input-text' } : undefined;
    },
  } as unknown as ComponentHandleRegistry;
}

/** First call proposes a patch (tool_calls); second call answers in text. */
function proposeThenAnswerConnector(): AiConnector {
  let calls = 0;
  return {
    async *stream() {
      calls += 1;
      if (calls === 1) {
        yield {
          delta: {
            role: 'assistant',
            tool_calls: [
              {
                index: 0,
                id: 'call-propose',
                type: 'function',
                function: { name: 'propose_schema_patch', arguments: JSON.stringify(PROPOSE_ARGS) },
              },
            ],
          },
        };
        yield { finishReason: 'tool_calls' };
      } else {
        yield { delta: { role: 'assistant', content: 'Proposal staged for review.' } };
        yield { finishReason: 'stop' };
      }
    },
  };
}

async function typeAndSubmit(text: string) {
  const textarea = await screen.findByRole('textbox');
  fireEvent.change(textarea, { target: { value: text } });
  fireEvent.keyDown(textarea, { key: 'Enter' });
  await act(async () => {});
}

describe('patch candidate end-to-end chain (programmatic)', () => {
  it('model proposes → card appears → adopt → applier receives patch → rollback → revert receives token', async () => {
    const controller = createNopDebugger({ id: 'chain-e2e', enabled: false });
    controller.setComponentRegistry(
      fakeRegistry([{ cid: 42, nodeId: 'node_42', path: '/page/form/name' }]),
    );
    const applier: NopSchemaPatchApplier = {
      apply: vi.fn(async () => ({ revertToken: 'tok-e2e' })),
      revert: vi.fn(async () => {}),
    };
    controller.registerSchemaPatchApplier(applier);
    createAiDebuggerExtension({ controller, connector: proposeThenAnswerConnector() });

    const descriptor = controller.getPanelTabs()[0]!;
    render(descriptor.render({ controller, getInspectSelection: () => null }));

    await typeAndSubmit('please fix the label');
    const queue = await screen.findByTestId('ndbg-patch-queue');
    expect(queue).toBeTruthy();
    // The injection probe rides the reason string; it must render as TEXT only.
    const card = await screen.findByTestId('ndbg-patch-queue');
    await screen.findByTestId('ndbg-patch-reason');
    expect(card.textContent).toContain('Ignore previous instructions');
    // Falsifiable text-only discriminator: the probe's HTML fragment must appear
    // ESCAPED (text node) and no real <img> element may exist. An HTML-rendering
    // regression produces a live element and no entity.
    expect(card.innerHTML).toContain('&lt;img');
    expect(card.querySelectorAll('img')).toHaveLength(0);

    const adopt = await screen.findByRole('button', { name: /adopt/i });
    await act(async () => {
      fireEvent.click(adopt);
    });
    await waitFor(() => {
      expect(applier.apply).toHaveBeenCalledTimes(1);
    });
    const appliedPatch = (applier.apply as ReturnType<typeof vi.fn>).mock.calls[0][0] as NopSchemaPatch;
    expect(appliedPatch.scope.target.nodeId).toBe('node_42');
    expect(appliedPatch.ops[0]).toMatchObject({ type: 'set-prop', field: 'label' });

    const rollback = await screen.findByRole('button', { name: /rollback/i });
    await act(async () => {
      fireEvent.click(rollback);
    });
    await waitFor(() => {
      expect(applier.revert).toHaveBeenCalledWith('tok-e2e');
    });
  });

  it('conflict chain: target leaves the live tree → card conflicted → adopt refused', async () => {
    const controller = createNopDebugger({ id: 'chain-conflict', enabled: false });
    controller.setComponentRegistry(
      fakeRegistry([{ cid: 42, nodeId: 'node_42', path: '/page/form/name' }]),
    );
    const applier: NopSchemaPatchApplier = {
      apply: vi.fn(async () => ({ revertToken: 'tok' })),
      revert: vi.fn(async () => {}),
    };
    controller.registerSchemaPatchApplier(applier);
    createAiDebuggerExtension({ controller, connector: proposeThenAnswerConnector() });

    const descriptor = controller.getPanelTabs()[0]!;
    render(descriptor.render({ controller, getInspectSelection: () => null }));
    await typeAndSubmit('please fix the label');
    await screen.findByTestId('ndbg-patch-queue');

    // Scope changed under the candidate.
    controller.setComponentRegistry(fakeRegistry([{ cid: 99, nodeId: 'node_99', path: '/elsewhere' }]));
    await act(async () => {});

    const adopt = await screen.findByRole('button', { name: /adopt/i });
    // Poll-driven render-time revalidation flips the card to conflicted...
    await waitFor(() => {
      expect((adopt as HTMLButtonElement).disabled).toBe(true);
    }, { timeout: 3_000 });
    // ...and the adopt-time gate refuses regardless.
    await act(async () => {
      fireEvent.click(adopt);
    });
    expect(applier.apply).not.toHaveBeenCalled();
  });
});
