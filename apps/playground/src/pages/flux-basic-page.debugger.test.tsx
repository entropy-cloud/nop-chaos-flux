// @vitest-environment happy-dom

import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createNopDebugger, getNopDebuggerAutomationApi } from '@nop-chaos/nop-debugger';
import { FluxBasicPage } from './flux-basic-page';

afterEach(() => {
  cleanup();
});

function readInputCid(labelText: string) {
  return Number(screen.getByLabelText(labelText).closest('[data-cid]')?.getAttribute('data-cid'));
}

function readFieldCid(labelText: string) {
  const labels = Array.from(document.querySelectorAll('[data-slot="field-label"]'));
  const label = labels.find((node) => node.textContent?.includes(labelText));
  return Number(label?.closest('[data-cid]')?.getAttribute('data-cid'));
}

function readButtonCid(text: string) {
  return Number(
    Array.from(document.querySelectorAll('button'))
      .find((node) => node.textContent?.includes(text))
      ?.getAttribute('data-cid'),
  );
}

function readFormCidByFieldLabel(labelText: string) {
  return Number(screen.getByLabelText(labelText).closest('.nop-form')?.getAttribute('data-cid'));
}

async function selectOption(labelText: string, optionText: string) {
  const trigger = screen.getByLabelText(labelText);
  fireEvent.click(trigger);
  const optionTextEl = await screen.findByText(optionText);
  const optionEl = optionTextEl.closest('[role="option"]') ?? optionTextEl;
  fireEvent.mouseEnter(optionEl);
  fireEvent.mouseMove(optionEl);
  await new Promise((resolve) => setTimeout(resolve, 0));
  fireEvent.click(optionEl);
}

describe('FluxBasicPage debugger wiring', () => {
  it('keeps automation explanations available through the real page component flow', async () => {
    const debuggerController = createNopDebugger({
      id: 'playground-flux-basic-page-test',
      enabled: true,
    });

    render(<FluxBasicPage debuggerController={debuggerController} onBack={() => undefined} />);

    await waitFor(() => expect(screen.getByLabelText('Username')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } });
    fireEvent.blur(screen.getByLabelText('Username'));
    fireEvent.change(screen.getByLabelText('Search Users'), { target: { value: 'alice' } });
    await selectOption('Role', 'Admin');

    const api = getNopDebuggerAutomationApi('playground-flux-basic-page-test');
    api?.clear();

    const searchButton = screen.getByRole('button', { name: 'Search Directory' });
    await waitFor(() => expect(searchButton.hasAttribute('disabled')).toBe(false));

    fireEvent.click(searchButton);
    await new Promise((resolve) => setTimeout(resolve, 450));
    fireEvent.click(searchButton);

    await waitFor(() => {
      const searchEvents = api
        ?.getSnapshot()
        .events.filter((event) => event.summary?.includes('/api/search') || event.detail?.includes('/api/search'));
      expect((searchEvents ?? []).length).toBeGreaterThan(0);
      expect(searchEvents?.some((event) => event.kind === 'api:abort')).toBe(true);
      expect(searchEvents?.some((event) => event.kind === 'api:end')).toBe(true);
    }, { timeout: 5000 });

    await waitFor(() => expect(screen.getByLabelText('Admin Code')).toBeTruthy(), {
      timeout: 5000,
    });

    const usernameCid = readInputCid('Username');
    const userFormCid = readFormCidByFieldLabel('Username');
    const adminCodeCid = readInputCid('Admin Code') || readFieldCid('Admin Code');
    const searchButtonCid = readButtonCid('Search Directory');

    expect(usernameCid).toBeGreaterThan(0);
    expect(userFormCid).toBeGreaterThan(0);
    expect(adminCodeCid).toBeGreaterThan(0);
    expect(searchButtonCid).toBeGreaterThan(0);

    expect(api?.controllerId).toBe('playground-flux-basic-page-test');

    await waitFor(() => {
      expect(api?.inspectByCid(adminCodeCid)).toMatchObject({
        cid: adminCodeCid,
        metaSummary: expect.objectContaining({ visible: true }),
      });
      expect(api?.explainNodeValue({ cid: usernameCid, field: 'username' })).toMatchObject({
        kind: 'value',
        data: { field: 'username' },
      });
      expect(api?.explainNodeMeta({ cid: adminCodeCid, field: 'visible' })).toMatchObject({
        kind: 'meta',
        data: {
          field: 'visible',
          source: 'resolved-meta',
          value: true,
        },
      });
    });

    const value = api?.explainNodeValue({ cid: usernameCid, field: 'username' });
    const meta = api?.explainNodeMeta({ cid: adminCodeCid, field: 'visible' });
    const failure = api?.explainNodeFailure({ cid: searchButtonCid });
    const asyncInfo = api?.explainNodeAsync({ cid: userFormCid });

    expect(['current-scope', 'form-state', 'unknown']).toContain(value?.data.valueSource);
    expect(typeof value?.answer).toBe('string');
    expect(meta?.data.dependencyPaths).toContain('role');
    expect(meta?.answer).toContain('${role === "admin"}');
    expect(meta?.limitations).toEqual([]);
    expect(failure?.kind).toBe('failure');
    expect(failure?.data.failureType).not.toBe('unknown');
    expect(Array.isArray(failure?.data.relatedEventIds)).toBe(true);
    expect(asyncInfo?.kind).toBe('async');
    expect(Array.isArray(asyncInfo?.data.owners)).toBe(true);
  }, 15000);

  it('keeps admin-code meta inspectable under React.StrictMode', async () => {
    const debuggerController = createNopDebugger({
      id: 'playground-flux-basic-page-strict-test',
      enabled: true,
    });

    render(
      <React.StrictMode>
        <FluxBasicPage debuggerController={debuggerController} onBack={() => undefined} />
      </React.StrictMode>,
    );

    await waitFor(() => expect(screen.getByLabelText('Username')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } });
    fireEvent.blur(screen.getByLabelText('Username'));
    fireEvent.change(screen.getByLabelText('Search Users'), { target: { value: 'alice' } });
    await selectOption('Role', 'Admin');

    await waitFor(() => expect(screen.getByLabelText('Admin Code')).toBeTruthy(), {
      timeout: 5000,
    });

    const api = getNopDebuggerAutomationApi('playground-flux-basic-page-strict-test');
    const adminCodeCid = readInputCid('Admin Code') || readFieldCid('Admin Code');

    await waitFor(() => {
      expect(api?.inspectByCid(adminCodeCid)).toMatchObject({
        cid: adminCodeCid,
        metaSummary: expect.objectContaining({ visible: true }),
      });
    });
  }, 15000);
});
