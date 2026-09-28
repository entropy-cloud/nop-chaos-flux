import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildTreeOptionMetaList } from '../tree-options.js';
import { TreeOptionList } from '../tree-option-list.js';

// plan 2026-09-28-5 Phase 3: the chevron toggle carried a size-5 class
// override that shrank the click target below the 24px icon-xs button size.
// The icon itself stays visually small (size-3.5).
afterEach(() => {
  cleanup();
});

function renderList() {
  const options = buildTreeOptionMetaList([
    {
      label: 'Parent',
      value: 'parent',
      children: [{ label: 'Child', value: 'child' }],
    },
  ]);
  return render(
    <TreeOptionList
      options={options}
      value={undefined}
      multiple={false}
      cascade={false}
      onlyLeaf={false}
      showPathLabel={false}
      searchable={false}
      disabled={false}
      onChange={() => {}}
      ariaLabel="tree"
      searchLabel="search"
    />,
  );
}

describe('tree chevron hit area (plan 2026-09-28-5 Phase 3)', () => {
  it('chevron button keeps the icon-xs hit size (no size-5 override)', () => {
    renderList();
    const button = document.querySelector(
      '[data-slot="tree-option-node"] button',
    ) as HTMLButtonElement | null;
    expect(button).toBeTruthy();
    expect(button?.className).not.toContain('size-5');
  });

  it('chevron icon keeps its small visual size-3.5', () => {
    renderList();
    const icon = document.querySelector('[data-slot="tree-option-node"] button svg');
    expect(icon?.getAttribute('class')).toContain('size-3.5');
  });
});
