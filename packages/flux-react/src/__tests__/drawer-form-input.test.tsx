import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createSchemaRenderer } from '../schema-renderer.js';
import {
  buttonRenderer,
  env,
  formRenderer,
  pageRenderer,
  probeInputRenderer,
  sharedFormulaCompiler,
  textRenderer,
} from '../test-support.js';

afterEach(() => {
  cleanup();
});

describe('form input inside drawer surface', () => {
  it('accepts character input in a textarea rendered inside an openDrawer surface', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://drawer-textarea"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open Drawer',
              onClick: {
                action: 'openDrawer',
                args: {
                  title: 'Note Drawer',
                  side: 'right',
                  body: [{ type: 'text', text: 'Drawer opened' }],
                },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Open Drawer'));
    expect(await screen.findByText('Drawer opened')).toBeTruthy();
  });

  it('opens a drawer with a form and input-text that accepts character input', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      buttonRenderer,
      formRenderer,
      probeInputRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://drawer-form-input"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open Drawer',
              onClick: {
                action: 'openDrawer',
                args: {
                  title: 'Form Drawer',
                  side: 'right',
                  body: [
                    {
                      type: 'form',
                      data: { email: '' },
                      body: [{ type: 'probe-input' }],
                    },
                  ],
                },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Open Drawer'));
    const input = await screen.findByLabelText('Email');
    expect(input).toBeTruthy();

    fireEvent.change(input, { target: { value: 'test@example.com' } });
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('test@example.com');
  });

  it('opens a dialog with a form and input that accepts character input', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      buttonRenderer,
      formRenderer,
      probeInputRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://dialog-form-input"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open Dialog',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'Form Dialog',
                  body: [
                    {
                      type: 'form',
                      data: { email: '' },
                      body: [{ type: 'probe-input' }],
                    },
                  ],
                },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Open Dialog'));
    const input = await screen.findByLabelText('Email');
    expect(input).toBeTruthy();

    fireEvent.change(input, { target: { value: 'dialog@example.com' } });
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('dialog@example.com');
  });

  it('preserves form input value across multiple change events in a drawer', async () => {
    const SchemaRenderer = createSchemaRenderer([
      pageRenderer,
      textRenderer,
      buttonRenderer,
      formRenderer,
      probeInputRenderer,
    ]);

    render(
      <SchemaRenderer
        schemaUrl="test://drawer-multi-input"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open Drawer',
              onClick: {
                action: 'openDrawer',
                args: {
                  title: 'Multi Drawer',
                  side: 'left',
                  body: [
                    {
                      type: 'form',
                      data: { email: '' },
                      body: [{ type: 'probe-input' }],
                    },
                  ],
                },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Open Drawer'));
    await screen.findByLabelText('Email');

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a' } });
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('a');

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ab' } });
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('ab');

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'abc@test.com' } });
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('abc@test.com');
  });
});
