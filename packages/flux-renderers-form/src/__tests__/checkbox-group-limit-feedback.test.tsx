import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { formRendererDefinitions } from '../index.js';
import { env } from './form-test-support.js';

const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

afterEach(() => cleanup());

function renderCheckboxGroup(field: Record<string, unknown>, data: Record<string, unknown> = {}) {
  return render(
    <SchemaRenderer
      schemaUrl="test://checkbox-group-limit-feedback"
      schema={{
        type: 'form',
        ...(Object.keys(data).length ? { data } : {}),
        body: [{ type: 'checkbox-group', name: 'prefs', label: 'Prefs', ...field }],
      } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

const OPTIONS = [
  { label: 'A', value: 'a' },
  { label: 'B', value: 'b' },
  { label: 'C', value: 'c' },
];

function getHint(): HTMLElement | null {
  return document.querySelector('[data-slot="checkbox-group-limit-hint"]');
}

/** Option checkboxes render as span[role=checkbox] inside the option label. */
function optionBox(label: string): HTMLElement {
  const item = Array.from(document.querySelectorAll('[data-slot="checkbox-group-item"]')).find(
    (el) => el.textContent === label,
  );
  if (!item) throw new Error(`checkbox-group item ${label} not found`);
  return item.querySelector('[data-slot="checkbox"]') as HTMLElement;
}

function checkAllBox(): HTMLElement {
  return document.querySelector('[data-slot="checkbox-group-checkall"]') as HTMLElement;
}

function isChecked(el: HTMLElement): boolean {
  return el.getAttribute('aria-checked') === 'true' || el.hasAttribute('data-checked');
}

/**
 * V12f Phase 3 wave B — [G2-视角4-02] the max/min guards inside toggleOption
 * and the check-all clamp returned silently: blocked interactions produced no
 * user-visible feedback. The caps must surface a polite status hint.
 */
describe('[G2-视角4-02] checkbox-group max/min limit feedback', () => {
  it('unchecking below minSelected shows a hint instead of silently ignoring', () => {
    renderCheckboxGroup({ options: OPTIONS, minSelected: 1 }, { prefs: ['a', 'b'] });
    const a = optionBox('A');
    const b = optionBox('B');
    expect(isChecked(a)).toBe(true);
    expect(isChecked(b)).toBe(true);
    // Uncheck 'a' — 2 -> 1 is allowed (min 1), so no hint yet.
    fireEvent.click(a);
    expect(getHint()).toBeNull();
    // Uncheck 'b' — 1 -> 0 would violate minSelected=1: the request is
    // rejected AND explained.
    fireEvent.click(optionBox('B'));
    const hint = getHint();
    expect(hint, 'blocked uncheck below min must render the limit hint').toBeTruthy();
    expect(hint!.getAttribute('role')).toBe('status');
    expect(hint!.textContent).toContain('1');
    // The value must NOT have changed.
    expect(isChecked(optionBox('B'))).toBe(true);
  });

  it('shows the max-cap hint while the cap is reached', () => {
    renderCheckboxGroup({ options: OPTIONS, maxSelected: 1 }, { prefs: ['a'] });
    // Proactive: at the cap the hint explains why the remaining options are
    // capped/disabled.
    const hint = getHint();
    expect(hint, 'reaching maxSelected must surface the cap hint').toBeTruthy();
    expect(hint!.textContent).toContain('1');
  });

  it('check-all clamped by maxSelected explains the clamp', () => {
    renderCheckboxGroup({ options: OPTIONS, maxSelected: 2, checkAll: true });
    fireEvent.click(checkAllBox());
    const checkedCount = OPTIONS.filter((o) => isChecked(optionBox(o.label))).length;
    expect(checkedCount).toBe(2);
    const hint = getHint();
    expect(hint, 'clamped check-all must explain the cap').toBeTruthy();
    expect(hint!.textContent).toContain('2');
  });
});
