import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormContext } from './contexts.js';
import { createSchemaRenderer } from './schema-renderer.js';
import { hasRendererSlotContent, resolveRendererSlotContent } from './render-nodes.js';
import { FieldFrame } from './field-frame.js';
import { EMPTY_FORM_STORE_STATE } from './form-state.js';
import { NodeFrameWrapper } from './node-frame-wrapper.js';
import { resolveFrameWrapMode } from './node-renderer-utils.js';
import {
  buttonRenderer,
  env,
  formRenderer,
  pageRenderer,
  probeButtonRenderer,
  probeQueryInputRenderer,
  sharedFormulaCompiler,
  textRenderer,
} from './test-support.js';

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
          fieldStates: {
            '': { errors: [{ path: '', rule: 'form', message: 'Root error', sourceKind: 'form' }] },
          },
        }),
      },
      validation: undefined,
    } as any;

    render(
      <FormContext.Provider value={form}>
        <FieldFrame label="Unbound field">content</FieldFrame>
      </FormContext.Provider>,
    );

    expect(screen.getByText('Unbound field')).toBeTruthy();
    expect(screen.queryByText('Root error')).toBeNull();
  });

  it('keeps the root marker semantic-only and publishes presence-only field state attributes', () => {
    const state = {
      ...EMPTY_FORM_STORE_STATE,
      fieldStates: {
        email: {
          touched: true,
          dirty: true,
          visited: true,
          errors: [
            { path: 'email', rule: 'required', message: 'Email is required', sourceKind: 'field' },
          ],
        },
      },
    };
    const form = {
      store: {
        subscribe: () => () => undefined,
        getState: () => state,
      },
      validation: {
        behavior: {
          triggers: ['blur'],
          showErrorOn: ['touched', 'submit'],
        },
      },
    } as any;

    const { container } = render(
      <FormContext.Provider value={form}>
        <FieldFrame name="email" label="Email">
          content
        </FieldFrame>
      </FormContext.Provider>,
    );

    const field = container.querySelector('.nop-field');
    expect(field).toBeTruthy();
    expect(field?.className).toContain('nop-field');
    expect(field?.getAttribute('data-field-visited')).toBe('');
    expect(field?.getAttribute('data-field-touched')).toBe('');
    expect(field?.getAttribute('data-field-dirty')).toBe('');
    expect(field?.getAttribute('data-field-invalid')).toBe('');
    expect(container.querySelector('[data-slot="field-label"]')?.textContent).toContain('Email');
    expect(container.querySelector('[data-slot="field-required"]')).toBeNull();
    expect(container.querySelector('[data-slot="field-control"]')?.textContent).toContain(
      'content',
    );
    expect(container.querySelector('[data-slot="field-error"]')?.textContent).toContain(
      'Email is required',
    );
  });

  it('omits presence-only field state attributes when the field is clean and exposes required/hint slots through data-slot markers', () => {
    const form = {
      store: {
        subscribe: () => () => undefined,
        getState: () => EMPTY_FORM_STORE_STATE,
      },
      validation: undefined,
    } as any;

    const { container } = render(
      <FormContext.Provider value={form}>
        <FieldFrame name="email" label="Email" required hint="Helpful hint">
          <input aria-label="Email input" />
        </FieldFrame>
      </FormContext.Provider>,
    );

    const field = container.querySelector('.nop-field');
    expect(field).toBeTruthy();
    expect(field?.hasAttribute('data-field-visited')).toBe(false);
    expect(field?.hasAttribute('data-field-touched')).toBe(false);
    expect(field?.hasAttribute('data-field-dirty')).toBe(false);
    expect(field?.hasAttribute('data-field-invalid')).toBe(false);
    expect(container.querySelector('[data-slot="field-label"]')?.textContent).toContain('Email');
    expect(container.querySelector('[data-slot="field-required"]')?.textContent).toBe('*');
    expect(container.querySelector('[data-slot="field-control"] input[aria-label="Email input"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="field-hint"]')).toBeNull();

    fireEvent.focus(screen.getByLabelText('Email input'));

    expect(container.querySelector('[data-slot="field-hint"]')?.textContent).toContain('Helpful hint');
    expect(container.querySelector('[data-slot="field-error"]')).toBeNull();
  });

  it('forwards extra root data attributes', () => {
    const form = {
      store: {
        subscribe: () => () => undefined,
        getState: () => EMPTY_FORM_STORE_STATE,
      },
      validation: undefined,
    } as any;

    const { container } = render(
      <FormContext.Provider value={form}>
        <FieldFrame name="email" label="Email" rootProps={{ 'data-active-variant': 'text' }}>
          content
        </FieldFrame>
      </FormContext.Provider>,
    );

    expect(container.querySelector('.nop-field')?.getAttribute('data-active-variant')).toBe('text');
  });

  it('supports non-label roots for composite controls', () => {
    const form = {
      store: {
        subscribe: () => () => undefined,
        getState: () => EMPTY_FORM_STORE_STATE,
      },
      validation: undefined,
    } as any;

    const { container } = render(
      <FormContext.Provider value={form}>
        <FieldFrame name="payload" label="Payload" rootTag="div">
          content
        </FieldFrame>
      </FormContext.Provider>,
    );

    expect(container.querySelector('.nop-field')?.tagName).toBe('DIV');
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
            templateNode: null,
            render: () => regionContent,
          },
        },
      },
      'title',
      { metaKey: 'label', fallback: 'Fallback title' },
    );

    expect(slotContent).toBe(regionContent);
  });

  it('falls back from prop to meta and then fallback when slot content is absent', () => {
    expect(
      resolveRendererSlotContent(
        { props: { label: 'Prop label' }, meta: { label: 'Meta label' } as any, regions: {} },
        'label',
        {
          metaKey: 'label',
          fallback: 'Fallback label',
        },
      ),
    ).toBe('Prop label');
    expect(
      resolveRendererSlotContent(
        { props: {}, meta: { label: 'Meta label' } as any, regions: {} },
        'label',
        {
          metaKey: 'label',
          fallback: 'Fallback label',
        },
      ),
    ).toBe('Meta label');
    expect(
      resolveRendererSlotContent({ props: {}, meta: {} as any, regions: {} }, 'label', {
        metaKey: 'label',
        fallback: 'Fallback label',
      }),
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
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      formRenderer,
      probeButtonRenderer,
      probeQueryInputRenderer,
    ]);
    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={
          {
            type: 'page',
            body: [
              {
                type: 'form',
                id: 'search-form',
                data: { query: '' },
                body: [
                  { type: 'probe-button', disabled: '${!query}' },
                  { type: 'probe-query-input' },
                ],
              },
            ],
          } as any
        }
        data={{}}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    const searchButton = screen.getByRole('button', { name: 'Search' }) as HTMLButtonElement;
    fireEvent.change(screen.getByRole('textbox', { name: 'Query' }), {
      target: { value: 'alice' },
    });
    await waitFor(() => {
      expect(searchButton.disabled).toBe(false);
    });
  });

  it('re-evaluates disabled expression when page scope changes', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, probeButtonRenderer]);
    const schema = {
      type: 'page',
      body: [{ type: 'probe-button', disabled: '${!ready}' }],
    } as const;
    const { rerender } = render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={schema}
        data={{ ready: false }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );
    const searchButton = screen.getByRole('button', { name: 'Search' }) as HTMLButtonElement;
    rerender(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={schema}
        data={{ ready: true }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );
    await waitFor(() => {
      expect(searchButton.disabled).toBe(false);
    });
  });

  it('renders dialog with drag handle around the title', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open drag-handle dialog',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'Draggable title',
                  body: [{ type: 'text', text: 'Dialog content' }],
                },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
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
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open transform dialog',
              onClick: {
                action: 'openDialog',
                args: { title: 'Drag test', body: [{ type: 'text', text: 'Body' }] },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Open transform dialog'));
    const content = await screen.findByRole('dialog');
    expect(content.style.transform).toBe('translate(-50%, -50%)');
    expect(content.className).not.toContain('translate-x-[-50%]');
    expect(content.getAttribute('data-slot')).toBe('dialog-surface');
    expect(document.querySelector('.nop-dialog-card')).toBeNull();
  });

  it('registers drag listeners on pointerdown and updates transform', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open pointer dialog',
              onClick: {
                action: 'openDialog',
                args: { title: 'Drag me', body: [{ type: 'text', text: 'Content' }] },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Open pointer dialog'));
    const content = await screen.findByRole('dialog');
    const header = content.querySelector('[data-slot="dialog-header"]')!;
    fireEvent.pointerDown(header, { clientX: 500, clientY: 300, button: 0 });
    expect(content.style.transition).toBe('none');
  });

  it('marks drawer host content with a data-slot instead of an internal nop drawer card class', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);
    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open drawer',
              onClick: {
                action: 'openDrawer',
                args: { title: 'Drawer title', body: [{ type: 'text', text: 'Drawer body' }] },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Open drawer'));
    await screen.findByText('Drawer title');
    const drawerSurface = document.querySelector('[data-slot="drawer-surface"]');
    expect(drawerSurface).toBeTruthy();
    expect(document.querySelector('.nop-drawer-card')).toBeNull();
  });

  it('uses resolved frame props instead of raw schema values for field chrome', async () => {
    const { container } = render(
      <FormContext.Provider
        value={{
          store: {
            subscribe: () => () => undefined,
            getState: () => EMPTY_FORM_STORE_STATE,
          },
          validation: undefined,
        } as any}
      >
        <NodeFrameWrapper
          templateNode={{
            type: 'wrap-probe',
            component: { frameRootTag: 'div' },
            schema: {
              type: 'wrap-probe',
              frameWrap: true,
              hint: 'Schema hint',
              description: 'Schema description',
              labelAlign: 'left',
              labelWidth: '80px',
            },
          } as any}
          definitionWrap={true}
          resolvedMeta={{} as any}
          resolvedPropsValue={{
            name: 'query',
            label: 'Resolved Query',
            hint: 'Runtime hint',
            description: 'Runtime description',
            labelAlign: 'top',
            labelWidth: '240px',
          }}
          regions={{}}
        >
          <input aria-label="Query" />
        </NodeFrameWrapper>
      </FormContext.Provider>,
    );

    const field = await screen.findByText('Resolved Query');
    expect(field).toBeTruthy();
    expect(container.querySelector('.nop-field')?.getAttribute('data-label-align')).toBe('top');
    expect(container.querySelector('[data-slot="field-label"]')?.getAttribute('style')).toContain(
      'width: 240px',
    );
    expect(container.querySelector('[data-slot="field-description"]')?.textContent).toBe(
      'Runtime description',
    );
  });

  it('falls back to hint and description regions for wrapped field chrome', async () => {
    const { container } = render(
      <FormContext.Provider
        value={{
          store: {
            subscribe: () => () => undefined,
            getState: () => EMPTY_FORM_STORE_STATE,
          },
          validation: undefined,
        } as any}
      >
        <NodeFrameWrapper
          templateNode={{
            type: 'wrap-probe',
            component: { frameRootTag: 'div' },
            schema: { type: 'wrap-probe', frameWrap: true },
          } as any}
          definitionWrap={true}
          resolvedMeta={{} as any}
          resolvedPropsValue={{ name: 'query', label: 'Resolved Query' }}
          regions={{
            hint: { key: 'hint', templateNode: null as any, render: () => <span>Region hint</span> },
            description: {
              key: 'description',
              templateNode: null as any,
              render: () => <span>Region description</span>,
            },
          }}
        >
          <input aria-label="Query" />
        </NodeFrameWrapper>
      </FormContext.Provider>,
    );

    expect(container.querySelector('[data-slot="field-description"]')?.textContent).toContain(
      'Region description',
    );

    fireEvent.focus(screen.getByLabelText('Query'));

    expect(container.querySelector('[data-slot="field-hint"]')?.textContent).toContain('Region hint');
    expect(container.querySelector('[data-slot="field-description"]')).toBeNull();
  });
});
