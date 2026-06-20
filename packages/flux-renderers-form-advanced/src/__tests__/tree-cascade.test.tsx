import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import {
  buildTreeOptionMetaList,
  cascadeDeselectParent,
  cascadeSelectParent,
  deriveCheckedState,
  type TreeOptionMeta,
} from '../tree-options.js';
import { allFormDefs } from './tree-checkbox-fields-test-helpers.js';
import { env, formStateProbeRenderer } from '../test-support.js';

// E0b Phase 1 裁定: 删除 showIcon / showOutline 字段。
// Note: 因为 `SchemaObject` 基类带字符串索引签名（`[key: string]: SchemaValue`），
// `keyof InputTreeSchema` 必然包含任意 string，所以"字段已从类型消失"无法用
// `K extends keyof T` 的类型层断言证明。改为运行时结构验证 + 源码 grep：
// - 运行时：renderer 不渲染任何 option-icon 元素（见下方 deletion describe）。
// - 源码：`schemas.ts` 不再声明 showIcon/showOutline，renderer 不再消费
//   （由 Closure `pnpm typecheck` + `pnpm lint` 把关）。

function checkboxFor(label: string): HTMLElement {
  const el = document.querySelector(`[role="checkbox"][aria-label="${label}"]`);
  if (!el) {
    throw new Error(`Expected checkbox with aria-label="${label}"`);
  }
  return el as HTMLElement;
}

function isChecked(label: string): boolean {
  return checkboxFor(label).hasAttribute('data-checked');
}

function isIndeterminate(label: string): boolean {
  return checkboxFor(label).hasAttribute('data-indeterminate');
}

function readState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null');
}

const TREE_OPTIONS_INPUT = [
  {
    label: 'Engineering',
    value: 'eng',
    children: [
      {
        label: 'Frontend',
        value: 'frontend',
        children: [
          { label: 'React', value: 'react' },
          { label: 'Vue', value: 'vue' },
        ],
      },
      { label: 'Backend', value: 'backend' },
    ],
  },
];

function buildTree(): TreeOptionMeta[] {
  return buildTreeOptionMetaList(TREE_OPTIONS_INPUT);
}

function findChild(option: TreeOptionMeta, value: string): TreeOptionMeta {
  const match = option.children.find((child) => child.value === value);
  if (!match) {
    throw new Error(`Expected child with value ${value}`);
  }
  return match;
}

describe('cascade helpers - parent-child propagation (onlyLeaf: false)', () => {
  it('cascadeSelectParent selects parent + all descendants', () => {
    const [eng] = buildTree();
    const next = cascadeSelectParent([], eng, false);
    expect(next).toEqual(
      expect.arrayContaining(['eng', 'frontend', 'backend', 'react', 'vue']),
    );
    expect(next).toHaveLength(5);
  });

  it('cascadeDeselectParent removes parent + all descendants', () => {
    const [eng] = buildTree();
    const next = cascadeDeselectParent(
      ['eng', 'frontend', 'backend', 'react', 'vue'],
      eng,
      false,
    );
    expect(next).toEqual([]);
  });

  it('cascadeDeselectParent leaves unrelated branches intact', () => {
    const [eng] = buildTree();
    const next = cascadeDeselectParent(
      ['eng', 'frontend', 'backend', 'react', 'vue', 'design'],
      eng,
      false,
    );
    expect(next).toEqual(['design']);
  });
});

describe('cascade helpers - onlyLeaf priority', () => {
  it('cascadeSelectParent with onlyLeaf:true selects only leaf descendants', () => {
    const [eng] = buildTree();
    const next = cascadeSelectParent([], eng, true);
    expect(next).toEqual(expect.arrayContaining(['backend', 'react', 'vue']));
    expect(next).toHaveLength(3);
    expect(next).not.toContain('eng');
    expect(next).not.toContain('frontend');
  });

  it('cascadeDeselectParent with onlyLeaf:true removes only leaf descendants', () => {
    const [eng] = buildTree();
    const next = cascadeDeselectParent(['backend', 'react', 'vue'], eng, true);
    expect(next).toEqual([]);
  });

  it('cascadeSelectParent on a leaf toggles only the leaf regardless of onlyLeaf', () => {
    const [eng] = buildTree();
    const backend = findChild(eng, 'backend');
    expect(cascadeSelectParent([], backend, false)).toEqual(['backend']);
    expect(cascadeSelectParent([], backend, true)).toEqual(['backend']);
  });
});

describe('deriveCheckedState - indeterminate derivation', () => {
  it('returns checked:true when all selectable descendants selected (onlyLeaf:false)', () => {
    const [eng] = buildTree();
    expect(deriveCheckedState(eng, ['frontend', 'backend', 'react', 'vue'], false)).toEqual({
      checked: true,
      indeterminate: false,
    });
  });

  it('returns indeterminate:true when some (not all) selectable descendants selected', () => {
    const [eng] = buildTree();
    expect(deriveCheckedState(eng, ['frontend', 'react'], false)).toEqual({
      checked: false,
      indeterminate: true,
    });
  });

  it('returns fully unchecked when no selectable descendants selected', () => {
    const [eng] = buildTree();
    expect(deriveCheckedState(eng, [], false)).toEqual({
      checked: false,
      indeterminate: false,
    });
  });

  it('derives only from leaf descendants when onlyLeaf:true', () => {
    const [eng] = buildTree();
    expect(deriveCheckedState(eng, ['backend', 'react', 'vue'], true)).toEqual({
      checked: true,
      indeterminate: false,
    });
    expect(deriveCheckedState(eng, ['backend'], true)).toEqual({
      checked: false,
      indeterminate: true,
    });
  });

  it('for a leaf node, checked is direct membership and indeterminate is always false', () => {
    const [eng] = buildTree();
    const backend = findChild(eng, 'backend');
    expect(deriveCheckedState(backend, ['backend'], false)).toEqual({
      checked: true,
      indeterminate: false,
    });
    expect(deriveCheckedState(backend, [], false)).toEqual({
      checked: false,
      indeterminate: false,
    });
  });
});

describe('input-tree renderer - cascade checkbox propagation', () => {
  it('clicking a parent checks parent + all descendants; clicking again unchecks all', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-cascade.test.tsx#input-tree-select-parent"
        schema={
          {
            type: 'form',
            data: { teams: [] },
            body: [
              {
                type: 'input-tree',
                name: 'teams',
                label: 'Teams',
                treeMode: 'checkbox',
                cascade: true,
                options: TREE_OPTIONS_INPUT,
              },
              { type: 'form-state-probe', name: 'teams' },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(screen.getByText('Engineering')).toBeTruthy());

    fireEvent.click(screen.getByRole('treeitem', { name: /Engineering/ }));

    await waitFor(() => {
      expect(isChecked('Engineering')).toBe(true);
      expect(isChecked('Frontend')).toBe(true);
      expect(isChecked('Backend')).toBe(true);
    });

    expect(readState('form-state:teams')).toEqual(
      expect.arrayContaining(['eng', 'frontend', 'backend', 'react', 'vue']),
    );

    fireEvent.click(screen.getByRole('treeitem', { name: /Engineering/ }));

    await waitFor(() => {
      expect(isChecked('Engineering')).toBe(false);
      expect(isChecked('Frontend')).toBe(false);
      expect(isChecked('Backend')).toBe(false);
    });
    expect(readState('form-state:teams')).toEqual([]);
  });

  it('selecting a subset of children puts the parent into indeterminate state', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-cascade.test.tsx#input-tree-indeterminate"
        schema={
          {
            type: 'form',
            data: { teams: [] },
            body: [
              {
                type: 'input-tree',
                name: 'teams',
                label: 'Teams',
                treeMode: 'checkbox',
                cascade: true,
                options: TREE_OPTIONS_INPUT,
              },
              { type: 'form-state-probe', name: 'teams' },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(screen.getByText('React')).toBeTruthy());

    fireEvent.click(screen.getByRole('treeitem', { name: 'React' }));

    await waitFor(() => {
      expect(isIndeterminate('Frontend')).toBe(true);
      expect(isChecked('Frontend')).toBe(false);
      expect(isIndeterminate('Engineering')).toBe(true);
    });

    expect(readState('form-state:teams')).toEqual(['react']);
  });

  it('selecting all children auto-checks the parent', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-cascade.test.tsx#input-tree-auto-parent"
        schema={
          {
            type: 'form',
            data: { teams: [] },
            body: [
              {
                type: 'input-tree',
                name: 'teams',
                label: 'Teams',
                treeMode: 'checkbox',
                cascade: true,
                options: TREE_OPTIONS_INPUT,
              },
              { type: 'form-state-probe', name: 'teams' },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(screen.getByText('React')).toBeTruthy());

    fireEvent.click(screen.getByRole('treeitem', { name: 'React' }));
    fireEvent.click(screen.getByRole('treeitem', { name: 'Vue' }));

    await waitFor(() => {
      expect(isChecked('Frontend')).toBe(true);
      expect(isIndeterminate('Frontend')).toBe(false);
    });
  });

  it('onlyLeaf:true keeps cascade propagation but never writes parent/internal values', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-cascade.test.tsx#input-tree-only-leaf"
        schema={
          {
            type: 'form',
            data: { teams: [] },
            body: [
              {
                type: 'input-tree',
                name: 'teams',
                label: 'Teams',
                treeMode: 'checkbox',
                cascade: true,
                onlyLeaf: true,
                options: TREE_OPTIONS_INPUT,
              },
              { type: 'form-state-probe', name: 'teams' },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(screen.getByText('Engineering')).toBeTruthy());

    fireEvent.click(screen.getByRole('treeitem', { name: /Engineering/ }));

    await waitFor(() => {
      expect(isChecked('Engineering')).toBe(true);
      expect(isChecked('Frontend')).toBe(true);
    });

    const state = readState('form-state:teams');
    expect(state).toEqual(expect.arrayContaining(['backend', 'react', 'vue']));
    expect(state).not.toContain('eng');
    expect(state).not.toContain('frontend');
  });
});

describe('tree-select renderer - cascade multiple-selection propagation', () => {
  it('clicking a parent in the popover checks parent + all descendants and shows indeterminate for partial', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-cascade.test.tsx#tree-select-cascade"
        schema={
          {
            type: 'form',
            data: { departments: [] },
            body: [
              {
                type: 'tree-select',
                name: 'departments',
                label: 'Departments',
                treeMode: 'checkbox',
                cascade: true,
                options: TREE_OPTIONS_INPUT,
              },
              { type: 'form-state-probe', name: 'departments' },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Departments/ }));

    await waitFor(() => expect(screen.getByText('React')).toBeTruthy());

    fireEvent.click(screen.getByRole('treeitem', { name: 'React' }));

    await waitFor(() => {
      expect(isIndeterminate('Frontend')).toBe(true);
      expect(isIndeterminate('Engineering')).toBe(true);
    });

    expect(readState('form-state:departments')).toEqual(['react']);
  });
});

describe('cascade negative paths (no propagation when disabled)', () => {
  it('cascade:false (default) does not propagate parent->child and shows no indeterminate', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-cascade.test.tsx#cascade-off"
        schema={
          {
            type: 'form',
            data: { teams: [] },
            body: [
              {
                type: 'input-tree',
                name: 'teams',
                label: 'Teams',
                treeMode: 'checkbox',
                options: TREE_OPTIONS_INPUT,
              },
              { type: 'form-state-probe', name: 'teams' },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(screen.getByText('Engineering')).toBeTruthy());

    fireEvent.click(screen.getByRole('treeitem', { name: /Engineering/ }));

    await waitFor(() => {
      expect(isChecked('Engineering')).toBe(true);
    });

    expect(isChecked('Frontend')).toBe(false);
    expect(isChecked('Backend')).toBe(false);
    expect(isIndeterminate('Frontend')).toBe(false);
    expect(readState('form-state:teams')).toEqual(['eng']);
  });

  it('treeMode:radio + cascade:true preserves single-selection semantics', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs, formStateProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-cascade.test.tsx#radio-cascade"
        schema={
          {
            type: 'form',
            data: { dept: '' },
            body: [
              {
                type: 'input-tree',
                name: 'dept',
                label: 'Dept',
                treeMode: 'radio',
                cascade: true,
                options: TREE_OPTIONS_INPUT,
              },
              { type: 'form-state-probe', name: 'dept' },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(screen.getByText('Engineering')).toBeTruthy());

    fireEvent.click(screen.getByRole('treeitem', { name: /Engineering/ }));

    await waitFor(() => {
      expect(readState('form-state:dept')).toBe('eng');
    });

    expect(screen.queryByRole('checkbox', { name: 'Frontend' })).toBeNull();
    expect(readState('form-state:dept')).toBe('eng');
  });
});

describe('showIcon / showOutline deletion (E0b Phase 1裁定: 删字段)', () => {
  it('input-tree never renders a per-node option icon regardless of showIcon/showOutline', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...allFormDefs]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/tree-cascade.test.tsx#show-icon-deleted"
        schema={
          {
            type: 'form',
            body: [
              {
                type: 'input-tree',
                name: 'teams',
                label: 'Teams',
                treeMode: 'checkbox',
                // Pass the deleted fields via `as any` to prove they have no effect.
                showIcon: true,
                showOutline: true,
                options: TREE_OPTIONS_INPUT,
              },
            ],
          } as any
        }
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />,
    );

    await waitFor(() => expect(screen.getByText('Engineering')).toBeTruthy());

    // The deleted fields are not consumed: no option-icon / outline slot is
    // ever published by the renderer. This is the structural proof that the
    // showIcon/showOutline fields have no rendering effect (and confirms the
    // Phase 1 deletion rationale: the drift is removed, not retrofitted).
    expect(document.querySelector('[data-slot="tree-option-icon"]')).toBeNull();
    expect(document.querySelector('[data-slot="tree-option-outline"]')).toBeNull();
    expect(document.querySelector('[data-slot="tree-option-icon-img"]')).toBeNull();

    // Sanity: the standard tree structure is still rendered.
    expect(document.querySelectorAll('[data-slot="tree-option-node"]').length).toBeGreaterThan(
      0,
    );
  });
});
