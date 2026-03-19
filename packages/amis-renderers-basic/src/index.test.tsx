import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { RendererEnv } from '@nop-chaos/amis-schema';
import { createFormulaCompiler } from '@nop-chaos/amis-formula';
import { createSchemaRenderer } from '@nop-chaos/amis-react';
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
          title: { type: 'tpl', tpl: 'Profile for ${user.name}' } as any,
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
              type: 'tpl',
              tpl: '${message}'
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
});
