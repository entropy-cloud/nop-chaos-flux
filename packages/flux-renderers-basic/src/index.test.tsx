import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from './index';

const env: RendererEnv = {
  fetcher: async function <T>() {
    return { ok: true, status: 200, data: null as T };
  },
  notify: () => undefined
};

describe('basicRendererDefinitions', () => {
  it('renders page title from a plain value', () => {
    const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          title: 'User Profile',
          body: [{ type: 'text', text: 'Page body' }]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByRole('heading', { name: 'User Profile' })).toBeTruthy();
    expect(screen.getByText('Page body')).toBeTruthy();
    cleanup();
  });

  it('renders page title from a schema fragment', () => {
    const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          title: { type: 'text', text: 'Profile for ${user.name}' } as any,
          body: [{ type: 'text', text: 'Page body' }]
        }}
        data={{ user: { name: 'Alice' } }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Profile for Alice' })).toBeTruthy();
    expect(screen.getByText('Page body')).toBeTruthy();
    cleanup();
  });

  it('renders text nodes with interpolated values', () => {
    const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [{ type: 'text', text: 'Welcome, ${user.name}' }]
        }}
        data={{ user: { name: 'Alice' } }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Welcome, Alice')).toBeTruthy();
    cleanup();
  });

  it('prefers flex body region over deprecated items region', () => {
    const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

    render(
      <SchemaRenderer
        schema={{
          type: 'flex',
          body: [{ type: 'text', text: 'Body content' }],
          items: [{ type: 'text', text: 'Deprecated items content' }]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Body content')).toBeTruthy();
    expect(screen.queryByText('Deprecated items content')).toBeNull();
    cleanup();
  });

  it('falls back to flex items region when body is absent', () => {
    const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

    render(
      <SchemaRenderer
        schema={{
          type: 'flex',
          items: [{ type: 'text', text: 'Deprecated items fallback' }]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Deprecated items fallback')).toBeTruthy();
    cleanup();
  });

  it('dispatches event fields through renderer-generated handlers', async () => {
    const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open dialog',
              onClick: {
                action: 'dialog',
                dialog: {
                  title: 'Runtime event dialog',
                  body: [{ type: 'text', text: 'Opened from event' }]
                }
              }
            },
            {
              type: 'text',
              text: '${message}'
            }
          ]
        }}
        data={{ message: 'Initial' }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Initial')).toBeTruthy();
    screen.getByText('Open dialog').click();
    expect(await screen.findByText('Runtime event dialog')).toBeTruthy();
    expect(await screen.findByText('Opened from event')).toBeTruthy();
    cleanup();
  });

  it('renders page header and footer through normalized regions', () => {
    const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          title: 'Workspace',
          header: [{ type: 'text', text: 'Header tools' }],
          body: [{ type: 'text', text: 'Page body' }],
          footer: [{ type: 'text', text: 'Footer actions' }]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Workspace' })).toBeTruthy();
    expect(screen.getByText('Header tools')).toBeTruthy();
    expect(screen.getByText('Page body')).toBeTruthy();
    expect(screen.getByText('Footer actions')).toBeTruthy();
    cleanup();
  });

  it('renders container header and footer through normalized regions', () => {
    const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

    render(
      <SchemaRenderer
        schema={{
          type: 'container',
            header: [{ type: 'text', text: 'Container header' }],
            body: [{ type: 'text', text: 'Container body' }],
            footer: [{ type: 'text', text: 'Container footer' }]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.getByText('Container header')).toBeTruthy();
    expect(screen.getByText('Container body')).toBeTruthy();
    expect(screen.getByText('Container footer')).toBeTruthy();
    cleanup();
  });

  it('resolves classAliases at page level', () => {
    const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          classAliases: {
            card: 'bg-white rounded-lg shadow-md p-4'
          },
          body: [
            {
              type: 'container',
              className: 'card custom-class',
                body: [{ type: 'text', text: 'Card content' }]
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const container = screen.getByText('Card content').parentElement;
    expect(container?.className).toContain('bg-white');
    expect(container?.className).toContain('rounded-lg');
    expect(container?.className).toContain('shadow-md');
    expect(container?.className).toContain('p-4');
    expect(container?.className).toContain('custom-class');
    cleanup();
  });

  it('supports nested classAliases expansion', () => {
    const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          classAliases: {
            btn: 'px-4 py-2 rounded',
            'btn-primary': 'btn bg-blue-500 text-white'
          },
          body: [
            {
              type: 'button',
              label: 'Submit',
              className: 'btn-primary'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const button = screen.getByRole('button', { name: 'Submit' });
    expect(button.className).toContain('px-4');
    expect(button.className).toContain('py-2');
    expect(button.className).toContain('rounded');
    expect(button.className).toContain('bg-blue-500');
    expect(button.className).toContain('text-white');
    cleanup();
  });

  it('inherits classAliases from parent to child', () => {
    const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

    render(
      <SchemaRenderer
        schema={{
          type: 'page',
          classAliases: {
            card: 'bg-white rounded-lg'
          },
          body: [
            {
              type: 'container',
              classAliases: {
                card: 'bg-gray-100 rounded-xl'
              },
              body: [
                {
                  type: 'text',
                  text: 'Nested card',
                  className: 'card'
                }
              ]
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const text = screen.getByText('Nested card');
    expect(text.className).toContain('bg-gray-100');
    expect(text.className).toContain('rounded-xl');
    expect(text.className).not.toContain('bg-white');
    expect(text.className).not.toContain('rounded-lg');
    cleanup();
  });

  describe('dynamic-renderer', () => {
    it('renders body content while loading', () => {
      const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

      render(
        <SchemaRenderer
          schema={{
            type: 'page',
            body: [
              {
                type: 'dynamic-renderer',
                schemaApi: { url: '/api/schema' },
                body: { type: 'text', text: 'Loading...' }
              }
            ]
          }}
          env={env}
          formulaCompiler={createFormulaCompiler()}
        />
      );

      expect(screen.getByText('Loading...')).toBeTruthy();
      cleanup();
    });

    it('replaces body with loaded schema on success', async () => {
      const fetcher = vi.fn(async () => ({
        ok: true,
        status: 200,
        data: { type: 'text', text: 'Dynamic content loaded' }
      })) as RendererEnv['fetcher'];

      const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

      render(
        <SchemaRenderer
          schema={{
            type: 'page',
            body: [
              {
                type: 'dynamic-renderer',
                schemaApi: { url: '/api/schema' },
                body: { type: 'text', text: 'Loading...' }
              }
            ]
          }}
          env={{ ...env, fetcher }}
          formulaCompiler={createFormulaCompiler()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Dynamic content loaded')).toBeTruthy();
      });

      expect(fetcher).toHaveBeenCalledTimes(1);
      cleanup();
    });

    it('shows error message on fetch failure', async () => {
      const fetcher = vi.fn(async () => {
        throw new Error('Failed to load schema');
      }) as RendererEnv['fetcher'];

      const SchemaRenderer = createSchemaRenderer(basicRendererDefinitions);

      render(
        <SchemaRenderer
          schema={{
            type: 'page',
            body: [
              {
                type: 'dynamic-renderer',
                schemaApi: { url: '/api/schema' },
                body: { type: 'text', text: 'Loading...' }
              }
            ]
          }}
          env={{ ...env, fetcher }}
          formulaCompiler={createFormulaCompiler()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Error: Failed to load schema')).toBeTruthy();
      });
      cleanup();
    });
  });
});

