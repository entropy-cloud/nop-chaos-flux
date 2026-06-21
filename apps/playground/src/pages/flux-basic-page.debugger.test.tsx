// @vitest-environment happy-dom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createNopDebugger, getNopDebuggerAutomationApi } from '@nop-chaos/nop-debugger';
import { FluxBasicPage, fluxBasicPageSchema } from './flux-basic-page';

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
  const nativeSelect = screen.queryByLabelText(labelText, { selector: 'select' });

  if (nativeSelect instanceof HTMLSelectElement) {
    const matchingOption = Array.from(nativeSelect.options).find((option) => option.text === optionText);
    expect(matchingOption).toBeTruthy();
    fireEvent.change(nativeSelect, { target: { value: matchingOption!.value } });
    await waitFor(() => {
      expect((screen.getByLabelText(labelText) as HTMLSelectElement).value).toBe(matchingOption!.value);
    });
    return;
  }

  const trigger = screen.getByRole('combobox', { name: labelText });
  fireEvent.click(trigger);
  const option = await screen.findByRole('option', { name: optionText });
  fireEvent.mouseEnter(option);
  fireEvent.mouseMove(option);
  fireEvent.click(option);
}

describe('FluxBasicPage debugger wiring', () => {
  it('keeps automation explanations available through the real page component flow', async () => {
    const debuggerController = createNopDebugger({
      id: 'playground-flux-basic-page-test',
      enabled: true,
      exposeAutomationApi: true,
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
    const userForm = (fluxBasicPageSchema.body as Array<any>)[0]?.body?.find(
      (node: { type?: string; id?: string }) => node.type === 'form' && node.id === 'user-form',
    );
    const originalRole = userForm?.data?.role;

    if (userForm?.data) {
      userForm.data.role = 'admin';
    }

    const debuggerController = createNopDebugger({
      id: 'playground-flux-basic-page-strict-test',
      enabled: true,
      exposeAutomationApi: true,
    });

    try {
      render(
        <React.StrictMode>
          <FluxBasicPage debuggerController={debuggerController} onBack={() => undefined} />
        </React.StrictMode>,
      );

      await waitFor(() => expect(screen.getByLabelText('Username')).toBeTruthy());

      fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'alice' } });
      fireEvent.blur(screen.getByLabelText('Username'));
      fireEvent.change(screen.getByLabelText('Search Users'), { target: { value: 'alice' } });

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
    } finally {
      if (userForm?.data) {
        userForm.data.role = originalRole;
      }
    }
  }, 15000);

  it('opens the user inspect dialog from the table row action', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const debuggerController = createNopDebugger({
      id: 'playground-flux-basic-page-inspect-dialog-test',
      enabled: true,
      exposeAutomationApi: true,
    });

    try {
      render(<FluxBasicPage debuggerController={debuggerController} onBack={() => undefined} />);

      const inspectButtons = await screen.findAllByRole('button', { name: 'Inspect' });
      fireEvent.click(inspectButtons[1]);

      await waitFor(() => {
        expect(
          debuggerController.getLatestEvent({ kind: 'action:start', actionType: 'openDialog' }),
        ).toBeDefined();
      });

      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();

      expect(await screen.findByText('User Details')).toBeTruthy();
      expect(screen.getByText('User: bob')).toBeTruthy();
      expect(screen.getByText('Email: bob@example.com')).toBeTruthy();
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('opens the matching inspect dialog for every table row', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const debuggerController = createNopDebugger({
      id: 'playground-flux-basic-page-inspect-dialog-all-rows-test',
      enabled: true,
      exposeAutomationApi: true,
    });

    try {
      render(<FluxBasicPage debuggerController={debuggerController} onBack={() => undefined} />);

      const expectedRows = [
        { username: 'alice', email: 'alice@example.com' },
        { username: 'bob', email: 'bob@example.com' },
        { username: 'carol', email: 'carol@example.com' },
      ];

      for (const [index, row] of expectedRows.entries()) {
        const inspectButtons = await screen.findAllByRole('button', { name: 'Inspect' });
        fireEvent.click(inspectButtons[index]);

        await waitFor(() => {
          expect(
            debuggerController.getLatestEvent({ kind: 'action:start', actionType: 'openDialog' }),
          ).toBeDefined();
        });

        expect(errorSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();

        expect(await screen.findByText('User Details')).toBeTruthy();
        expect(screen.getByText(`User: ${row.username}`)).toBeTruthy();
        expect(screen.getByText(`Email: ${row.email}`)).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        await waitFor(() => {
          expect(screen.queryByText('User Details')).toBeNull();
        });
      }
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('removes rows in the submit-only array child items demo', async () => {
    const debuggerController = createNopDebugger({
      id: 'playground-flux-basic-page-array-delete-test',
      enabled: true,
      exposeAutomationApi: true,
    });

    render(<FluxBasicPage debuggerController={debuggerController} onBack={() => undefined} />);

    const submitButton = await screen.findByRole('button', { name: 'Submit array demo' });
    const form = submitButton.closest('.nop-form');

    expect(form).toBeTruthy();
    expect(within(form as HTMLElement).getByPlaceholderText('Reviewer 1')).toBeTruthy();

    fireEvent.click(
      within(form as HTMLElement).getByRole('button', {
        name: /^(?!Move (up|down)).*Reviewer 1$/,
      }),
    );

    await waitFor(() => {
      expect(within(form as HTMLElement).queryByPlaceholderText('Reviewer 1')).toBeNull();
    });
  });

  it('shows key-value validation feedback on submit after adding an empty row', async () => {
    const debuggerController = createNopDebugger({
      id: 'playground-flux-basic-page-key-value-submit-test',
      enabled: true,
      exposeAutomationApi: true,
    });

    render(<FluxBasicPage debuggerController={debuggerController} onBack={() => undefined} />);

    const submitButton = await screen.findByRole('button', { name: 'Submit key-value demo' });
    const form = submitButton.closest('.nop-form');

    expect(form).toBeTruthy();

    fireEvent.click(within(form as HTMLElement).getByRole('button', { name: 'Add metadata pair' }));

    const api = getNopDebuggerAutomationApi('playground-flux-basic-page-key-value-submit-test');
    api?.clear();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Entry 1 key is required')).toBeTruthy();
    });

    expect(
      api
        ?.getSnapshot()
        .events.some(
          (event) =>
            event.kind === 'api:end' &&
            (event.summary?.includes('/api/composite-demo') ||
              event.detail?.includes('/api/composite-demo')),
        ),
    ).toBe(false);
  });
});
