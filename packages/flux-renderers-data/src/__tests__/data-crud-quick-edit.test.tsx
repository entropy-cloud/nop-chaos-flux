import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  ActionContext,
  RendererComponentProps,
  RendererDefinition,
} from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { Button } from '@nop-chaos/ui';
import { buttonRenderer, createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function SaveProbeRenderer(props: RendererComponentProps) {
  return (
    <Button variant="ghost" size="sm" onClick={() => void props.events.onClick?.()}>
      {String(props.props.label ?? 'Save probe')}
    </Button>
  );
}

const saveProbeCalls: Array<{ scopeRecord: unknown }> = [];

const saveProbeRenderer: RendererDefinition = {
  type: 'save-probe',
  component: SaveProbeRenderer,
  fields: [{ key: 'onClick', kind: 'event' }],
};

describe('CRUD renderer quick-edit baseline', () => {
  it('renders inline quick-edit cells and saves through quickSaveItemAction', async () => {
    cleanup();
    saveProbeCalls.length = 0;
    const observeSave = vi.fn(
      (_payload: Record<string, unknown> | undefined, ctx: ActionContext) => {
        saveProbeCalls.push({ scopeRecord: ctx.scope.get('record') });
        return { ok: true, data: ctx.scope.get('record') };
      },
    );

    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer, saveProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-quick-edit"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'quick-edit-crud',
              source: [{ id: '1', name: 'Alice' }],
              quickSaveItemAction: { action: 'probe:saveItem' },
              footerToolbar: [{ type: 'text', text: 'Row: ${users?.[0]?.name || "none"}' }],
              columns: [{ name: 'name', label: 'Name', quickEdit: true }],
            },
          ],
        }}
        data={{ users: [{ id: '1', name: 'Alice' }] }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          actionScope?.registerNamespace('probe', {
            kind: 'host',
            invoke(
              method: string,
              payload: Record<string, unknown> | undefined,
              ctx: ActionContext,
            ) {
              if (method === 'saveItem') {
                return observeSave(payload, ctx);
              }

              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    expect(input.value).toBe('Alice');

    fireEvent.change(input, { target: { value: 'Alicia' } });

    await waitFor(() => {
      expect(input.value).toBe('Alicia');
    });

    fireEvent.click(screen.getByRole('button', { name: t('flux.common.save') }));

    await waitFor(() => {
      expect(observeSave).toHaveBeenCalledTimes(1);
      expect(saveProbeCalls[0]?.scopeRecord).toMatchObject({ id: '1', name: 'Alicia' });
    });
  });

  it('falls back to quickSaveAction when quickSaveItemAction is not configured', async () => {
    cleanup();
    const observeSave = vi.fn(
      (_payload: Record<string, unknown> | undefined, ctx: ActionContext) => {
        return { ok: true, data: ctx.scope.get('record') };
      },
    );

    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer, saveProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-quick-edit-fallback-save"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'quick-edit-crud-fallback-save',
              source: [{ id: '1', name: 'Alice' }],
              quickSaveAction: { action: 'probe:saveItem' },
              columns: [{ name: 'name', label: 'Name', quickEdit: true }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          actionScope?.registerNamespace('probe', {
            kind: 'host',
            invoke(
              method: string,
              payload: Record<string, unknown> | undefined,
              ctx: ActionContext,
            ) {
              if (method === 'saveItem') {
                return observeSave(payload, ctx);
              }

              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Alicia' } });
    fireEvent.click(screen.getByRole('button', { name: t('flux.common.save') }));

    await waitFor(() => {
      expect(observeSave).toHaveBeenCalledTimes(1);
      expect(observeSave.mock.calls[0]?.[1].scope.get('record')).toMatchObject({
        id: '1',
        name: 'Alicia',
      });
    });
  });

  it('auto-saves inline quick-edit cells on blur when saveImmediately is enabled', async () => {
    cleanup();
    const observeSave = vi.fn(
      (_payload: Record<string, unknown> | undefined, ctx: ActionContext) => {
        return { ok: true, data: ctx.scope.get('record') };
      },
    );

    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer, saveProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-quick-edit-blur"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'quick-edit-crud-blur',
              source: [{ id: '1', name: 'Alice' }],
              quickSaveItemAction: { action: 'probe:saveItem' },
              columns: [{ name: 'name', label: 'Name', quickEdit: { saveImmediately: true } }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          actionScope?.registerNamespace('probe', {
            kind: 'host',
            invoke(
              method: string,
              payload: Record<string, unknown> | undefined,
              ctx: ActionContext,
            ) {
              if (method === 'saveItem') {
                return observeSave(payload, ctx);
              }

              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Alicia' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(observeSave).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByRole('button', { name: t('flux.common.save') })).toBeNull();
  });

  it('renders custom quickEdit body inline on row scope and saves edited values', async () => {
    cleanup();
    const observeSave = vi.fn(
      (_payload: Record<string, unknown> | undefined, ctx: ActionContext) => {
        return { ok: true, data: ctx.scope.get('record') };
      },
    );

    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer, saveProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-quick-edit-custom-body"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'quick-edit-crud-custom-body',
              source: [{ id: '1', name: 'Alice' }],
              quickSaveItemAction: { action: 'probe:saveItem' },
              columns: [
                {
                  name: 'name',
                  label: 'Name',
                  quickEdit: {
                    body: {
                      type: 'input-text',
                      name: 'record.name',
                      label: 'Inline Name',
                      frameWrap: false,
                    },
                  },
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          actionScope?.registerNamespace('probe', {
            kind: 'host',
            invoke(
              method: string,
              payload: Record<string, unknown> | undefined,
              ctx: ActionContext,
            ) {
              if (method === 'saveItem') {
                return observeSave(payload, ctx);
              }

              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    const input = screen.getByRole('textbox', { name: 'Inline Name' }) as HTMLInputElement;
    expect(input.value).toBe('Alice');

    fireEvent.change(input, { target: { value: 'Alicia' } });

    await waitFor(() => {
      expect(input.value).toBe('Alicia');
    });

    fireEvent.click(screen.getByRole('button', { name: t('flux.common.save') }));

    await waitFor(() => {
      expect(observeSave).toHaveBeenCalledTimes(1);
      expect(observeSave.mock.calls[0]?.[1].scope.get('record')).toMatchObject({
        id: '1',
        name: 'Alicia',
      });
    });
  });

  it('opens dialog quickEdit mode, saves edited values, and closes the dialog', async () => {
    cleanup();
    const observeSave = vi.fn(
      (_payload: Record<string, unknown> | undefined, ctx: ActionContext) => {
        return { ok: true, data: ctx.scope.get('record') };
      },
    );

    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer, saveProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-quick-edit-dialog"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'quick-edit-crud-dialog',
              source: [{ id: '1', name: 'Alice' }],
              quickSaveItemAction: { action: 'probe:saveItem' },
              columns: [
                {
                  name: 'name',
                  label: 'Edit Name',
                  quickEdit: {
                    mode: 'dialog',
                    body: {
                      type: 'input-text',
                      name: 'record.name',
                      label: 'Dialog Name',
                      frameWrap: false,
                    },
                  },
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          actionScope?.registerNamespace('probe', {
            kind: 'host',
            invoke(
              method: string,
              payload: Record<string, unknown> | undefined,
              ctx: ActionContext,
            ) {
              if (method === 'saveItem') {
                return observeSave(payload, ctx);
              }

              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit Name' }));

    const dialogInput = (await screen.findByRole('textbox', {
      name: 'Dialog Name',
    })) as HTMLInputElement;
    expect(dialogInput.value).toBe('Alice');

    fireEvent.change(dialogInput, { target: { value: 'Alicia' } });
    fireEvent.click(screen.getByRole('button', { name: t('flux.common.save') }));

    await waitFor(() => {
      expect(observeSave).toHaveBeenCalledTimes(1);
      expect(observeSave.mock.calls[0]?.[1].scope.get('record')).toMatchObject({
        id: '1',
        name: 'Alicia',
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: 'Dialog Name' })).toBeNull();
    });
  });

  it('restores the saved row value when dialog quickEdit is closed without saving', async () => {
    cleanup();
    const observeSave = vi.fn(
      (_payload: Record<string, unknown> | undefined, ctx: ActionContext) => {
        return { ok: true, data: ctx.scope.get('record') };
      },
    );

    const SchemaRenderer = createDataSchemaRenderer([buttonRenderer, saveProbeRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://data/crud-quick-edit-dialog-cancel"
        schema={{
          type: 'page',
          body: [
            {
              type: 'crud',
              id: 'quick-edit-crud-dialog-cancel',
              source: [{ id: '1', name: 'Alice' }],
              quickSaveItemAction: { action: 'probe:saveItem' },
              columns: [
                {
                  name: 'name',
                  label: 'Edit Name',
                  quickEdit: {
                    mode: 'dialog',
                    body: {
                      type: 'input-text',
                      name: 'record.name',
                      label: 'Dialog Name',
                      frameWrap: false,
                    },
                  },
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
        onActionScopeChange={(actionScope) => {
          actionScope?.registerNamespace('probe', {
            kind: 'host',
            invoke(
              method: string,
              payload: Record<string, unknown> | undefined,
              ctx: ActionContext,
            ) {
              if (method === 'saveItem') {
                return observeSave(payload, ctx);
              }

              return { ok: false, error: new Error(`Unsupported method: ${method}`) };
            },
          });
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit Name' }));
    const dialogInput = (await screen.findByRole('textbox', {
      name: 'Dialog Name',
    })) as HTMLInputElement;
    fireEvent.change(dialogInput, { target: { value: 'Alicia' } });
    fireEvent.click(screen.getByRole('button', { name: t('flux.common.close') }));

    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: 'Dialog Name' })).toBeNull();
    });

    expect(observeSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Edit Name' }));
    const reopenedDialogInput = (await screen.findByRole('textbox', {
      name: 'Dialog Name',
    })) as HTMLInputElement;
    expect(reopenedDialogInput.value).toBe('Alice');
  });
});
