import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

afterEach(() => cleanup());

function renderSchema(body: unknown) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://component-handles-button"
      schema={{ type: 'page', body: body as any }}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

describe('button component handle: focus', () => {
  it('component:focus focuses the target button', async () => {
    renderSchema([
      { type: 'button', id: 'target-btn', label: 'Target' },
      {
        type: 'button',
        label: 'Trigger',
        onClick: { action: 'component:focus', componentId: 'target-btn' },
      },
    ]);

    const target = screen.getByRole('button', { name: 'Target' });
    expect(document.activeElement).not.toBe(target);
    fireEvent.click(screen.getByRole('button', { name: 'Trigger' }));
    await waitFor(() => expect(document.activeElement).toBe(target));
  });

  it('button publishes component:focus capability contract', async () => {
    const { basicRendererDefinitions } = await import('../index.js');
    const button = basicRendererDefinitions.find((d) => d.type === 'button');
    expect(button?.componentCapabilityContracts?.map((c) => c.handle)).toEqual(['focus']);
  });
});
