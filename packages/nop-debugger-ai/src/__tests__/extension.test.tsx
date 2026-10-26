import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import type { AiConnector } from '@nop-chaos/flux-renderers-ai';
import type { NopComponentInspectResult } from '@nop-chaos/nop-debugger';
import { createNopDebugger } from '@nop-chaos/nop-debugger';
import type { NopDebuggerController } from '@nop-chaos/nop-debugger';
import { createAiDebuggerExtension } from '../panel/extension.js';
import type { NopDebuggerPanelTabDescriptor } from '@nop-chaos/nop-debugger';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function staticConnector(reply: string): AiConnector {
  return {
    async *stream() {
      yield { delta: { role: 'assistant', content: reply } };
      yield { finishReason: 'stop' };
    },
  };
}

function hangingConnector(gate: { open: () => void; promise: Promise<void> }): AiConnector {
  return {
    async *stream() {
      await gate.promise;
      yield { delta: { role: 'assistant', content: 'late' } };
      yield { finishReason: 'stop' };
    },
  };
}

function failingOnceConnector(): AiConnector {
  let calls = 0;
  return {
    async *stream() {
      calls += 1;
      if (calls === 1) {
        throw new Error('connection refused (internal)');
      }
      yield { delta: { role: 'assistant', content: 'recovered' } };
      yield { finishReason: 'stop' };
    },
  };
}

async function typeAndSubmit(text: string) {
  const textarea = await screen.findByRole('textbox');
  fireEvent.change(textarea, { target: { value: text } });
  fireEvent.keyDown(textarea, { key: 'Enter' });
  await act(async () => {});
}

describe('AI debugger extension lifecycle', () => {
  it('registers the x-ai tab and dispose removes it', () => {
    const controller = createNopDebugger({ id: 'ext-lifecycle', enabled: true });
    const extension = createAiDebuggerExtension({ controller, connector: null });
    const tabs = controller.getPanelTabs();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe('x-ai');
    extension.dispose();
    expect(controller.getPanelTabs()).toHaveLength(0);
  });

  it('dispose is idempotent and re-creation gets a fresh tab', () => {
    const controller = createNopDebugger({ id: 'ext-idempotent', enabled: true });
    const extension = createAiDebuggerExtension({ controller, connector: null });
    extension.dispose();
    expect(() => extension.dispose()).not.toThrow();
    const again = createAiDebuggerExtension({ controller, connector: null });
    expect(controller.getPanelTabs()).toHaveLength(1);
    again.dispose();
  });
});

describe('AI session surface behavior', () => {
  function renderSession(input: { connector: AiConnector | null; controller: NopDebuggerController }) {
    const engineTabRef: { current: NopDebuggerPanelTabDescriptor | null } = { current: null };
    const extension = createAiDebuggerExtension({ controller: input.controller, connector: input.connector });
    engineTabRef.current = input.controller.getPanelTabs()[0] ?? null;
    const selection: NopComponentInspectResult | null = {
      cid: 42,
      path: '/page/form/name',
      rendererType: 'input-text',
      mounted: true,
    };
    if (engineTabRef.current) {
      render(engineTabRef.current.render({ controller: input.controller, getInspectSelection: () => selection }));
    }
    return { extension };
  }

  it('shows the no-connector empty state and disables sending', async () => {
    const controller = createNopDebugger({ id: 'sess-noconn', enabled: true });
    renderSession({ connector: null, controller });
    expect(await screen.findByTestId('ndbg-ai-empty')).toHaveTextContent(/No model connector/i);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveProperty('disabled', true);
  });

  it('shows the context-attached indicator when a node is selected', () => {
    const controller = createNopDebugger({ id: 'sess-ctx', enabled: true });
    renderSession({ connector: staticConnector('ok'), controller });
    expect(screen.getByTestId('ndbg-ai-context-attached')).toHaveTextContent(/Node context attached/);
    expect(screen.getByTestId('ndbg-ai-context-attached')).toHaveTextContent('/page/form/name');
  });

  it('send → assistant reply renders; empty state disappears', async () => {
    const controller = createNopDebugger({ id: 'sess-send', enabled: true });
    renderSession({ connector: staticConnector('Node 42 looks healthy.'), controller });
    await typeAndSubmit('what happened to node 42?');
    await waitFor(() => {
      expect(screen.queryByTestId('ndbg-ai-empty')).toBeNull();
    });
    await waitFor(() => {
      expect(screen.getByText('Node 42 looks healthy.')).toBeTruthy();
    });
  });

  it('stop aborts the in-flight request', async () => {
    const gate = { open: () => {}, promise: new Promise<void>(() => {}) };
    const controller = createNopDebugger({ id: 'sess-stop', enabled: true });
    renderSession({ connector: hangingConnector(gate), controller });
    await typeAndSubmit('hang please');
    const stopButton = await screen.findByRole('button', { name: /stop/i });
    await act(async () => {
      fireEvent.click(stopButton);
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /stop/i })).toBeNull();
    });
  });

  it('error shows a banner; retry recovers on the next connector call', async () => {
    const controller = createNopDebugger({ id: 'sess-retry', enabled: true });
    renderSession({ connector: failingOnceConnector(), controller });
    await typeAndSubmit('diagnose');
    const banner = await screen.findByTestId('ndbg-ai-error');
    expect(banner).toHaveTextContent(/failed/i);
    const retry = await screen.findByTestId('ndbg-ai-retry');
    await act(async () => {
      fireEvent.click(retry);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('ndbg-ai-error')).toBeNull();
    });
    await waitFor(() => {
      expect(screen.getByText('recovered')).toBeTruthy();
    });
  });
});
