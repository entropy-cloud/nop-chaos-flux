import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { t } from '@nop-chaos/flux-i18n';
import { createDataSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(cleanup);

function renderTableWithInlineColumnSettings() {
  const SchemaRenderer = createDataSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://data/table-column-settings-disclosure"
      schema={{
        type: 'page',
        body: [
          {
            type: 'table',
            columnSettings: { enabled: true, overlay: false, align: 'left' },
            columns: [
              { label: 'Name', name: 'name' },
              { label: 'Email', name: 'email' },
            ],
            source: [{ id: 1, name: 'Alice', email: 'alice@example.com' }],
          },
        ],
      }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('table column settings inline disclosure a11y (20-05)', () => {
  it('wires aria-expanded/aria-controls on the inline trigger and points them at the panel id', async () => {
    renderTableWithInlineColumnSettings();

    const trigger = await screen.findByRole('button', { name: t('flux.table.columns') });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeNull();

    fireEvent.click(trigger);
    const panel = await waitFor(() => {
      const el = document.querySelector(
        '[data-slot="table-column-settings-inline"]',
      ) as HTMLElement | null;
      expect(el).toBeTruthy();
      return el!;
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.id).not.toBe('');

    fireEvent.click(trigger);
    await waitFor(() => {
      expect(document.querySelector('[data-slot="table-column-settings-inline"]')).toBeNull();
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeNull();
  });
});
