import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '../index.js';
import {
  buttonRenderer,
  env,
  pageRenderer,
  sharedFormulaCompiler,
  textRenderer,
} from '../test-support.js';

afterEach(() => {
  cleanup();
});

describe('openDialog surface-level actions region', () => {
  it('renders the body region inside the dialog (control)', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://dialog-actions/body"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open dialog',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'Body dialog',
                  body: [{ type: 'text', text: 'Dialog body content' }],
                },
              },
            },
          ],
        }}
        env={env}
        formulaCompiler={sharedFormulaCompiler}
      />,
    );

    fireEvent.click(screen.getByText('Open dialog'));
    expect(await screen.findByText('Dialog body content')).toBeTruthy();
  });

  it('renders buttons authored under args.actions in the dialog footer', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://dialog-actions/actions"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open actions dialog',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'Actions dialog',
                  body: [{ type: 'text', text: 'Actions dialog body' }],
                  actions: [
                    { type: 'button', label: 'Confirm Action' },
                    { type: 'button', label: 'Cancel Action' },
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

    fireEvent.click(screen.getByText('Open actions dialog'));
    expect(await screen.findByText('Actions dialog body')).toBeTruthy();

    await waitFor(
      () => {
        expect(screen.getByText('Confirm Action')).toBeTruthy();
        expect(screen.getByText('Cancel Action')).toBeTruthy();
      },
      { timeout: 2000 },
    );
  });
});
