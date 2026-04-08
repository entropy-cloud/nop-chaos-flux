import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer, hasRendererSlotContent, resolveRendererSlotContent } from './index';
import { FieldFrame } from './field-frame';
import { EMPTY_FORM_STORE_STATE } from './form-state';
import { resolveFrameWrapMode } from './node-renderer-utils';
import { FormContext } from './test-support';
import { buttonRenderer, env, formRenderer, pageRenderer, probeButtonRenderer, probeQueryInputRenderer, sharedFormulaCompiler, textRenderer } from './test-support';

describe('resolveFrameWrapMode', () => {
  it('returns none when renderer definition is not wrap-compatible', () => {
    expect(resolveFrameWrapMode(false, undefined)).toBe('none');
    expect(resolveFrameWrapMode(false, true)).toBe('none');
    expect(resolveFrameWrapMode(false, 'label')).toBe('none');
    expect(resolveFrameWrapMode(false, 'group')).toBe('none');
    expect(resolveFrameWrapMode(false, 'none')).toBe('none');
  });

  it('preserves default label wrapping when frameWrap is unset or label-like', () => {
    expect(resolveFrameWrapMode(true, undefined)).toBe('label');
    expect(resolveFrameWrapMode(true, true)).toBe('label');
    expect(resolveFrameWrapMode(true, 'label')).toBe('label');
  });

  it('allows wrap-compatible renderers to opt out or use group layout', () => {
    expect(resolveFrameWrapMode(true, false)).toBe('none');
    expect(resolveFrameWrapMode(true, 'none')).toBe('none');
    expect(resolveFrameWrapMode(true, 'group')).toBe('group');
  });
});

describe('FieldFrame', () => {
  it('ignores root-path form errors when no field name is provided', () => {
    const form = {
      store: {
        subscribe: () => () => undefined,
        getState: () => ({
          ...EMPTY_FORM_STORE_STATE,
          errors: {
            '': [{ path: '', rule: 'form', message: 'Root error', sourceKind: 'form' }]
          }
        })
      },
      validation: undefined
    } as any;

    render(
      <FormContext.Provider value={form}>
        <FieldFrame label="Unbound field">content</FieldFrame>
      </FormContext.Provider>
    );

    expect(screen.getByText('Unbound field')).toBeTruthy();
    expect(screen.queryByText('Root error')).toBeNull();
  });
});

describe('renderer slot helpers', () => {
  it('prefers region content over prop, meta, and fallback values', () => {
    const regionContent = <span>Region title</span>;
    const slotContent = resolveRendererSlotContent(
      {
        props: { title: 'Prop title' },
        meta: { label: 'Meta title' } as any,
        regions: {
          title: {
            key: 'title',
            path: '$.title',
            node: [] as any,
            render: () => regionContent
          }
        }
      },
      'title',
      { metaKey: 'label', fallback: 'Fallback title' }
    );

    expect(slotContent).toBe(regionContent);
  });

  it('falls back from prop to meta and then fallback when slot content is absent', () => {
    expect(
      resolveRendererSlotContent({ props: { label: 'Prop label' }, meta: { label: 'Meta label' } as any, regions: {} }, 'label', {
        metaKey: 'label',
        fallback: 'Fallback label'
      })
    ).toBe('Prop label');
    expect(
      resolveRendererSlotContent({ props: {}, meta: { label: 'Meta label' } as any, regions: {} }, 'label', {
        metaKey: 'label',
        fallback: 'Fallback label'
      })
    ).toBe('Meta label');
    expect(
      resolveRendererSlotContent({ props: {}, meta: {} as any, regions: {} }, 'label', {
        metaKey: 'label',
        fallback: 'Fallback label'
      })
    ).toBe('Fallback label');
  });

  it('treats nullish and false slot content as absent but keeps renderable arrays and zero', () => {
    expect(hasRendererSlotContent(undefined)).toBe(false);
    expect(hasRendererSlotContent(null)).toBe(false);
    expect(hasRendererSlotContent(false)).toBe(false);
    expect(hasRendererSlotContent([])).toBe(false);
    expect(hasRendererSlotContent([null, false, undefined])).toBe(false);
    expect(hasRendererSlotContent([null, <span key="value">Value</span>])).toBe(true);
    expect(hasRendererSlotContent(0)).toBe(true);
    expect(hasRendererSlotContent('')).toBe(true);
  });
});

describe('reactive meta and draggable dialogs', () => {
  it('re-evaluates disabled expression when form scope changes', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, formRenderer, probeButtonRenderer, probeQueryInputRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              id: 'search-form',
              data: { query: '' },
              body: [{ type: 'probe-button', disabled: '${!query}' }, { type: 'probe-query-input' }]
            }
          ]
        } as any}
        data={{}}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    const searchButton = screen.getByRole('button', { name: 'Search' }) as HTMLButtonElement;
    fireEvent.change(screen.getByRole('textbox', { name: 'Query' }), { target: { value: 'alice' } });
    await waitFor(() => {
      expect(searchButton.disabled).toBe(false);
    });
  });

  it('re-evaluates disabled expression when page scope changes', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, probeButtonRenderer]);
    const schema = { type: 'page', body: [{ type: 'probe-button', disabled: '${!ready}' }] } as const;
    const { rerender } = render(
      <SchemaRenderer schema={schema} data={{ ready: false }} env={env} formulaCompiler={sharedFormulaCompiler} />
    );
    const searchButton = screen.getByRole('button', { name: 'Search' }) as HTMLButtonElement;
    rerender(<SchemaRenderer schema={schema} data={{ ready: true }} env={env} formulaCompiler={sharedFormulaCompiler} />);
    await waitFor(() => {
      expect(searchButton.disabled).toBe(false);
    });
  });

  it('renders dialog with drag handle around the title', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open drag-handle dialog',
              onClick: { action: 'dialog', dialog: { title: 'Draggable title', body: [{ type: 'text', text: 'Dialog content' }] } }
            }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    fireEvent.click(screen.getByText('Open drag-handle dialog'));
    const titleEl = await screen.findByText('Draggable title');
    const header = titleEl.closest('[data-slot="dialog-header"]');
    expect(header).toBeTruthy();
    expect(header!.className).toContain('cursor-grab');
  });

  it('applies inline transform for draggable dialogs instead of Tailwind centering', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            { type: 'button', label: 'Open transform dialog', onClick: { action: 'dialog', dialog: { title: 'Drag test', body: [{ type: 'text', text: 'Body' }] } } }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    fireEvent.click(screen.getByText('Open transform dialog'));
    const content = await screen.findByRole('dialog');
    expect(content.style.transform).toBe('translate(-50%, -50%)');
    expect(content.className).not.toContain('translate-x-[-50%]');
  });

  it('registers drag listeners on pointerdown and updates transform', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            { type: 'button', label: 'Open pointer dialog', onClick: { action: 'dialog', dialog: { title: 'Drag me', body: [{ type: 'text', text: 'Content' }] } } }
          ]
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />
    );

    fireEvent.click(screen.getByText('Open pointer dialog'));
    const content = await screen.findByRole('dialog');
    const header = content.querySelector('[data-slot="dialog-header"]')!;
    fireEvent.pointerDown(header, { clientX: 500, clientY: 300, button: 0 });
    expect(content.style.transition).toBe('none');
  });
});