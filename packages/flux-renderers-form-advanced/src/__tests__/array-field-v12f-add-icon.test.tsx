import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { resetFluxI18n, initFluxI18n } from '@nop-chaos/flux-i18n';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formAdvancedRendererDefinitions } from '../index.js';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { env, formulaCompiler, installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

const allDefinitions = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

/**
 * V12f Phase 3 — [G2-视角10-01] array-field Add 按钮缺 PlusIcon。
 * 兄弟组件（array-editor / combo / input-table / condition-group）的 Add
 * 动作都带 lucide PlusIcon；array-field 的 Add 是裸文本按钮，视觉上脱离
 * composite 家族。契约：Add 按钮内含图标 + 文本，点击仍追加条目。
 */
function renderArrayField() {
  const SchemaRenderer = createSchemaRenderer(allDefinitions);
  render(
    <SchemaRenderer
      schemaUrl="test://array-field-v12f-add-icon"
      schema={
        {
          type: 'form',
          id: 'f',
          data: { tags: ['alpha'] },
          body: [
            {
              type: 'array-field',
              id: 'a',
              name: 'tags',
              label: 'Tags',
              itemKind: 'scalar',
              item: [{ type: 'input-text', placeholder: 'Tag' }],
            },
          ],
        } as never
      }
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function addButton(): HTMLButtonElement {
  return screen.getByText('Add item').closest('button') as HTMLButtonElement;
}

describe('V12f [G2-视角10-01] array-field Add button carries a PlusIcon', () => {
  it('renders an icon inside the Add button', () => {
    renderArrayField();
    const button = addButton();
    expect(button).toBeTruthy();
    expect(button.querySelector('svg')).not.toBeNull();
  });

  it('keeps the add behavior: clicking appends an item', async () => {
    renderArrayField();
    expect(screen.getAllByPlaceholderText('Tag')).toHaveLength(1);
    fireEvent.click(addButton());
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('Tag')).toHaveLength(2);
    });
  });
});
