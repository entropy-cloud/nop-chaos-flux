import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createFieldHandlers, formRendererDefinitions } from '../index.js';
import { env } from './form-test-support.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderField() {
  const SchemaRenderer = createSchemaRenderer(formRendererDefinitions);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/engagement"
      schema={{ type: 'form', body: [{ type: 'select', name: 'role', label: 'Role', options: [{ label: 'Admin', value: 'admin' }] }] } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

function capturedEngagementRemovals(spy: { mock: { calls: unknown[][] } }): string[] {
  return spy.mock.calls
    .filter(
      ([type, , options]) =>
        (type === 'pointerdown' || type === 'keydown') && (options as { capture?: boolean } | undefined)?.capture === true,
    )
    .map(([type]) => type as string);
}

describe('field control engagement listeners', () => {
  it('removes the document listeners when a focused field unmounts without blur', () => {
    const view = renderField();
    const control = screen.getByRole('combobox', { name: 'Role' });
    fireEvent.focus(control);

    const removeSpy = vi.spyOn(document, 'removeEventListener');
    view.unmount();

    expect(capturedEngagementRemovals(removeSpy).sort()).toEqual(['keydown', 'pointerdown']);
  });

  it('self-cleans for direct createFieldHandlers callers once the armed element is detached', () => {
    const handlers = createFieldHandlers({
      name: 'title',
      currentForm: undefined,
      currentValidationScope: undefined,
      setValue: () => {},
    });
    const element = document.createElement('input');
    document.body.appendChild(element);
    handlers.onFocus({ target: element });
    element.remove();

    const removeSpy = vi.spyOn(document, 'removeEventListener');
    document.dispatchEvent(new Event('pointerdown'));

    expect(capturedEngagementRemovals(removeSpy).sort()).toEqual(['keydown', 'pointerdown']);
  });
});
