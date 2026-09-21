import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { t } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index.js';
import { env, installFormAdvancedTestHooks } from '../test-support.js';

installFormAdvancedTestHooks();

/**
 * Plan 489 Phase 1 — [G2-视角8-01]:
 * array-editor / key-value row action buttons must carry the composite-family
 * baseline established by combo-renderer.tsx: variant="ghost" + size="icon-sm"
 * (resolved `size-7`, no text/padding of the `sm` size) + `size-4` icons.
 */

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

function renderSchema(body: Record<string, unknown>[], data: Record<string, unknown>) {
  const SchemaRenderer = createSchemaRenderer(allFormDefs);
  return render(
    <SchemaRenderer
      schemaUrl="test://flux-renderers-form-advanced/__tests__/v12c-p1-row-action-button-baseline.test.tsx"
      schema={
        {
          type: 'form',
          data,
          body,
        } as React.ComponentProps<typeof SchemaRenderer>['schema']
      }
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function expectFamilyBaseline(button: HTMLElement) {
  const className = button.className;
  // icon-sm square footprint (combo family), not the sm text-button footprint
  expect(className).toContain('size-7');
  expect(className).not.toContain('px-2.5');
  expect(className).not.toContain('text-[0.8rem]');
  // ghost variant signature
  expect(className).toContain('hover:bg-muted');
  // size-4 icon, matching combo's ChevronUp/Down + Trash2 row icons
  const icon = button.querySelector('svg');
  expect(icon).toBeTruthy();
  expect(icon!.getAttribute('class')).toContain('size-4');
}

describe('[G2-视角8-01] array-editor row action buttons match the combo family baseline', () => {
  afterEach(() => {
    cleanup();
  });

  it('move/remove buttons are ghost icon-sm with size-4 icons', async () => {
    renderSchema(
      [
        {
          type: 'array-editor',
          name: 'reviewers',
          label: 'Reviewers',
          itemLabel: 'Reviewer',
        },
      ],
      { reviewers: [{ id: 'item-1', value: 'alice' }] },
    );

    await screen.findByPlaceholderText('Reviewer 1');

    for (const slot of ['array-editor-move-up', 'array-editor-move-down', 'array-editor-remove']) {
      const button = document.querySelector(`[data-slot="${slot}"]`) as HTMLElement | null;
      expect(button, slot).toBeTruthy();
      expectFamilyBaseline(button!);
    }
  });
});

describe('[G2-视角8-01] key-value row action buttons match the combo family baseline', () => {
  afterEach(() => {
    cleanup();
  });

  it('move/remove buttons are ghost icon-sm with size-4 icons', () => {
    renderSchema([{ type: 'key-value', name: 'metadata', label: 'Metadata' }], {
      metadata: [{ key: 'env', value: 'prod' }],
    });

    for (const slot of ['key-value-move-up', 'key-value-move-down']) {
      const button = document.querySelector(`[data-slot="${slot}"]`) as HTMLElement | null;
      expect(button, slot).toBeTruthy();
      expectFamilyBaseline(button!);
    }

    const remove = screen.getByRole('button', {
      name: `${t('flux.form.remove')} entry 1`,
    });
    expectFamilyBaseline(remove);
  });
});
