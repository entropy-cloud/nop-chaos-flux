import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  baseEnv,
  createFormSchemaRenderer,
  createFormSchemaRendererWithButton,
  formulaCompiler,
  makeCapturingFetcher,
} from '../test-support.js';
import { installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

function makeImportLoader(overrides: Record<string, (payload: Record<string, unknown> | undefined) => unknown> = {}) {
  const calls: Array<{ method: string; payload: Record<string, unknown> | undefined }> = [];
  const importLoader = {
    load: vi.fn(async () => ({
      createNamespace: () => ({
        kind: 'import' as const,
        invoke: async (method: string, payload: Record<string, unknown> | undefined) => {
          calls.push({ method, payload });
          if (overrides[method]) {
            return overrides[method](payload) as never;
          }
          return { ok: true };
        },
      }),
    })),
  };
  return { importLoader, calls };
}

describe('detail-field inline editMode (arc-component-gap G2I discriminant)', () => {
  it('enters in-place editing on viewer click without Dialog DOM and focuses the editor', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-inline.test.tsx#enter"
        schema={{
          type: 'form',
          data: { title: 'Alpha' },
          body: [
            {
              type: 'detail-field',
              name: 'title',
              label: 'Title',
              editMode: 'inline',
              triggerLabel: 'Edit Title',
              content: [{ type: 'input-text', name: '__value', label: 'Title Value' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const viewer = await waitFor(() => {
      const el = document.querySelector('[data-slot="detail-field-viewer"][data-editable="true"]');
      expect(el).toBeTruthy();
      return el as HTMLButtonElement;
    });
    expect(viewer.getAttribute('aria-label')).toBe('Edit Title');
    expect(document.querySelector('.nop-detail-field')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(viewer);

    const editor = await waitFor(() => {
      const el = document.querySelector('[data-slot="detail-field-inline-editor"]');
      expect(el).toBeTruthy();
      return el as HTMLInputElement;
    });
    expect(editor.value).toBe('Alpha');
    expect(document.activeElement).toBe(editor);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('commits on Enter: writes the draft back to the parent form value', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createFormSchemaRendererWithButton();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-inline.test.tsx#commit"
        schema={{
          type: 'form',
          id: 'inline-commit-form',
          data: { title: 'Alpha' },
          body: [
            {
              type: 'detail-field',
              name: 'title',
              label: 'Title',
              editMode: 'inline',
              triggerLabel: 'Edit Title',
              content: [{ type: 'input-text', name: '__value', label: 'Title Value' }],
            },
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'inline-commit-form' },
            },
          ],
        }}
        env={{ ...baseEnv, fetcher: makeCapturingFetcher(submitValues) }}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(
      await waitFor(() => {
        const el = document.querySelector('[data-slot="detail-field-viewer"][data-editable="true"]');
        expect(el).toBeTruthy();
        return el as HTMLButtonElement;
      }),
    );

    const editor = await waitFor(() => {
      const el = document.querySelector('[data-slot="detail-field-inline-editor"]');
      expect(el).toBeTruthy();
      return el as HTMLInputElement;
    });

    fireEvent.change(editor, { target: { value: 'Beta' } });
    fireEvent.keyDown(editor, { key: 'Enter' });

    const viewer = await waitFor(() => {
      const el = document.querySelector('[data-slot="detail-field-viewer"][data-editable="true"]');
      expect(el?.textContent).toContain('Beta');
      return el as HTMLButtonElement;
    });
    expect(document.activeElement).toBe(viewer);

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));
    expect(submitValues[0]).toMatchObject({ title: 'Beta' });
  });

  it('cancels on Escape without writing back', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createFormSchemaRendererWithButton();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-inline.test.tsx#escape"
        schema={{
          type: 'form',
          id: 'inline-escape-form',
          data: { title: 'Alpha' },
          body: [
            {
              type: 'detail-field',
              name: 'title',
              label: 'Title',
              editMode: 'inline',
              triggerLabel: 'Edit Title',
              content: [{ type: 'input-text', name: '__value', label: 'Title Value' }],
            },
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'inline-escape-form' },
            },
          ],
        }}
        env={{ ...baseEnv, fetcher: makeCapturingFetcher(submitValues) }}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(
      await waitFor(() => {
        const el = document.querySelector('[data-slot="detail-field-viewer"][data-editable="true"]');
        expect(el).toBeTruthy();
        return el as HTMLButtonElement;
      }),
    );

    const editor = (await waitFor(() => {
      const el = document.querySelector('[data-slot="detail-field-inline-editor"]');
      expect(el).toBeTruthy();
      return el as HTMLInputElement;
    })) as HTMLInputElement;

    fireEvent.change(editor, { target: { value: 'Discarded' } });
    fireEvent.keyDown(editor, { key: 'Escape' });

    await waitFor(() =>
      expect(document.querySelector('[data-slot="detail-field-inline-editor"]')).toBeNull(),
    );
    expect(
      document.querySelector('[data-slot="detail-field-viewer"]')?.textContent,
    ).not.toContain('Discarded');

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));
    expect(submitValues[0]).toMatchObject({ title: 'Alpha' });
  });

  it('commits on blur', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createFormSchemaRendererWithButton();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-inline.test.tsx#blur"
        schema={{
          type: 'form',
          id: 'inline-blur-form',
          data: { title: 'Alpha' },
          body: [
            {
              type: 'detail-field',
              name: 'title',
              label: 'Title',
              editMode: 'inline',
              triggerLabel: 'Edit Title',
              content: [{ type: 'input-text', name: '__value', label: 'Title Value' }],
            },
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'inline-blur-form' },
            },
          ],
        }}
        env={{ ...baseEnv, fetcher: makeCapturingFetcher(submitValues) }}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(
      await waitFor(() => {
        const el = document.querySelector('[data-slot="detail-field-viewer"][data-editable="true"]');
        expect(el).toBeTruthy();
        return el as HTMLButtonElement;
      }),
    );

    const editor = await waitFor(() => {
      const el = document.querySelector('[data-slot="detail-field-inline-editor"]');
      expect(el).toBeTruthy();
      return el as HTMLInputElement;
    });

    fireEvent.change(editor, { target: { value: 'Blurred' } });
    fireEvent.blur(editor);

    await waitFor(() =>
      expect(document.querySelector('[data-slot="detail-field-inline-editor"]')).toBeNull(),
    );
    expect(
      document.querySelector('[data-slot="detail-field-viewer"]')?.textContent,
    ).toContain('Blurred');

    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));
    expect(submitValues[0]).toMatchObject({ title: 'Blurred' });
  });

  it('keeps the viewer and warns through env.notify when transformIn fails', async () => {
    cleanup();
    const notify = vi.fn();
    const { importLoader } = makeImportLoader({
      toDraft: () => {
        throw new Error('draft exploded');
      },
    });
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-inline.test.tsx#transformin-fail"
        schema={{
          type: 'form',
          data: { title: 'Alpha' },
          body: [
            {
              type: 'detail-field',
              name: 'title',
              label: 'Title',
              editMode: 'inline',
              triggerLabel: 'Edit Title',
              'xui:imports': [{ from: 'detail-field-lib', as: 'detailFieldLib' }],
              transformInAction: { action: 'detailFieldLib:toDraft' },
              content: [{ type: 'input-text', name: '__value', label: 'Title Value' }],
            },
          ],
        }}
        env={{ ...baseEnv, notify, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(
      await waitFor(() => {
        const el = document.querySelector('[data-slot="detail-field-viewer"][data-editable="true"]');
        expect(el).toBeTruthy();
        return el as HTMLButtonElement;
      }),
    );

    await waitFor(() => expect(notify).toHaveBeenCalledWith('warning', expect.any(String)));
    expect(document.querySelector('[data-slot="detail-field-inline-editor"]')).toBeNull();
    expect(
      document.querySelector('[data-slot="detail-field-viewer"][data-editable="true"]'),
    ).toBeTruthy();
  });

  it('keeps editing with focused editor and inline error when validate fails', async () => {
    cleanup();
    const notify = vi.fn();
    const { importLoader } = makeImportLoader({
      validateDraft: () => ({
        ok: true,
        data: { valid: false, issues: [{ level: 'error', message: 'Value rejected' }] },
      }),
    });
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-inline.test.tsx#validate-fail"
        schema={{
          type: 'form',
          data: { title: 'Alpha' },
          body: [
            {
              type: 'detail-field',
              name: 'title',
              label: 'Title',
              editMode: 'inline',
              triggerLabel: 'Edit Title',
              'xui:imports': [{ from: 'detail-field-lib', as: 'detailFieldLib' }],
              validateValueAction: { action: 'detailFieldLib:validateDraft' },
              content: [{ type: 'input-text', name: '__value', label: 'Title Value' }],
            },
          ],
        }}
        env={{ ...baseEnv, notify, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(
      await waitFor(() => {
        const el = document.querySelector('[data-slot="detail-field-viewer"][data-editable="true"]');
        expect(el).toBeTruthy();
        return el as HTMLButtonElement;
      }),
    );

    const editor = await waitFor(() => {
      const el = document.querySelector('[data-slot="detail-field-inline-editor"]');
      expect(el).toBeTruthy();
      return el as HTMLInputElement;
    });

    fireEvent.change(editor, { target: { value: 'Rejected' } });
    fireEvent.keyDown(editor, { key: 'Enter' });

    const errorEl = await waitFor(() => {
      const el = document.querySelector('[data-slot="detail-field-inline-error"]');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });
    expect(errorEl.getAttribute('role')).toBe('status');
    expect(errorEl.getAttribute('aria-live')).toBe('assertive');
    expect(errorEl.textContent).toContain('Value rejected');
    expect(notify).toHaveBeenCalledWith('warning', expect.stringContaining('Value rejected'));
    expect(document.querySelector('[data-slot="detail-field-inline-editor"]')).toBeTruthy();
    expect(document.activeElement).toBe(
      document.querySelector('[data-slot="detail-field-inline-editor"]'),
    );

    fireEvent.keyDown(editor, { key: 'Escape' });
    await waitFor(() =>
      expect(document.querySelector('[data-slot="detail-field-inline-error"]')).toBeNull(),
    );
  });

  it('does not allow entering inline edit when readOnly or disabled', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-inline.test.tsx#gated"
        schema={{
          type: 'form',
          data: { title: 'Alpha', other: 'Beta' },
          body: [
            {
              type: 'detail-field',
              name: 'title',
              label: 'Title',
              editMode: 'inline',
              readOnly: true,
              triggerLabel: 'Edit Title',
              content: [{ type: 'input-text', name: '__value', label: 'Title Value' }],
            },
            {
              type: 'detail-field',
              name: 'other',
              label: 'Other',
              editMode: 'inline',
              disabled: true,
              triggerLabel: 'Edit Other',
              content: [{ type: 'input-text', name: '__value', label: 'Other Value' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    const viewers = await waitFor(() => {
      const els = document.querySelectorAll(
        '[data-slot="detail-field-viewer"][data-editable="true"]',
      );
      expect(els.length).toBe(2);
      return els;
    });

    for (const viewer of Array.from(viewers)) {
      expect((viewer as HTMLButtonElement).disabled).toBe(true);
      fireEvent.click(viewer);
    }

    expect(document.querySelector('[data-slot="detail-field-inline-editor"]')).toBeNull();
  });

  it('ignores second submit while a commit is in flight', async () => {
    cleanup();
    let releaseTransformOut: ((value: unknown) => void) | undefined;
    const { importLoader, calls } = makeImportLoader({
      toCommit: () =>
        new Promise((resolve) => {
          releaseTransformOut = (value) => resolve({ ok: true, data: value });
        }),
    });
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-inline.test.tsx#inflight"
        schema={{
          type: 'form',
          data: { title: 'Alpha' },
          body: [
            {
              type: 'detail-field',
              name: 'title',
              label: 'Title',
              editMode: 'inline',
              triggerLabel: 'Edit Title',
              'xui:imports': [{ from: 'detail-field-lib', as: 'detailFieldLib' }],
              transformOutAction: { action: 'detailFieldLib:toCommit' },
              content: [{ type: 'input-text', name: '__value', label: 'Title Value' }],
            },
          ],
        }}
        env={{ ...baseEnv, importLoader }}
        formulaCompiler={formulaCompiler}
      />,
    );

    fireEvent.click(
      await waitFor(() => {
        const el = document.querySelector('[data-slot="detail-field-viewer"][data-editable="true"]');
        expect(el).toBeTruthy();
        return el as HTMLButtonElement;
      }),
    );

    const editor = await waitFor(() => {
      const el = document.querySelector('[data-slot="detail-field-inline-editor"]');
      expect(el).toBeTruthy();
      return el as HTMLInputElement;
    });

    fireEvent.change(editor, { target: { value: 'InFlight' } });
    fireEvent.keyDown(editor, { key: 'Enter' });

    await waitFor(() => {
      expect(editor.getAttribute('aria-busy')).toBe('true');
    });

    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.blur(editor);

    releaseTransformOut?.('InFlight');

    await waitFor(() =>
      expect(document.querySelector('[data-slot="detail-field-inline-editor"]')).toBeNull(),
    );
    expect(calls.filter((entry) => entry.method === 'toCommit').length).toBe(1);
    expect(
      document.querySelector('[data-slot="detail-field-viewer"]')?.textContent,
    ).toContain('InFlight');
  });
});

describe('detail-field inline regression pins (surface default path)', () => {
  it('schema without editMode never renders editable viewer or inline editor', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-inline.test.tsx#surface-pin"
        schema={{
          type: 'form',
          data: { address: { street: '123 Main St' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              surface: { mode: 'dialog', title: 'Edit Address' },
              content: [{ type: 'input-text', name: 'street', label: 'Street' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    expect(
      document.querySelector('[data-slot="detail-field-viewer"][data-editable]'),
    ).toBeNull();
    expect(document.querySelector('[data-slot="detail-field-inline-editor"]')).toBeNull();

    fireEvent.click(screen.getByText('Edit Address'));
    await waitFor(() => expect(screen.getByLabelText('Street')).toBeTruthy());

    expect(document.querySelector('[data-slot="detail-field-inline-editor"]')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeTruthy();
  });
});
