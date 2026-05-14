import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '../schema-renderer.js';
import { buttonRenderer, env, pageRenderer, sharedFormulaCompiler, textRenderer } from '../test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Surface lifecycle contracts', () => {
  it('H6: closing a dialog removes it from surface store entries', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open dialog',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'Test dialog',
                  body: [{ type: 'text', text: 'Dialog content here' }],
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
    expect(await screen.findByText('Test dialog')).toBeTruthy();
    expect(screen.getByText('Dialog content here')).toBeTruthy();

    const closeBtn = document.querySelector('[data-slot="dialog-close"]');
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn!);

    await waitFor(() => {
      expect(screen.queryByText('Test dialog')).toBeNull();
      expect(screen.queryByText('Dialog content here')).toBeNull();
    });
  });

  it('H6b: opening and closing a dialog does not leak entries in surface store', async () => {
    const SchemaRenderer = createSchemaRenderer([pageRenderer, textRenderer, buttonRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://schema.json"
        schema={{
          type: 'page',
          body: [
            {
              type: 'button',
              label: 'Open dialog',
              onClick: {
                action: 'openDialog',
                args: {
                  title: 'Leak test',
                  body: [{ type: 'text', text: 'Leak content' }],
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
    await screen.findByText('Leak content');

    const surfacesBefore = document.querySelectorAll('[data-slot="dialog-surface"]');
    expect(surfacesBefore.length).toBe(1);

    fireEvent.click(document.querySelector('[data-slot="dialog-close"]')!);
    await waitFor(() => {
      expect(screen.queryByText('Leak content')).toBeNull();
    });

    const surfacesAfter = document.querySelectorAll('[data-slot="dialog-surface"]');
    expect(surfacesAfter.length).toBe(0);
  });
});
