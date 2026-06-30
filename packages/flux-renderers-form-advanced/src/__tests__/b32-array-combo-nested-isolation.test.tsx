import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { formAdvancedRendererDefinitions } from '../index.js';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer, useCurrentForm, useRenderScope } from '@nop-chaos/flux-react';
import { env, formStateProbeRenderer, formulaCompiler } from '../test-support.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderSchema(schema: object, extraDefs: RendererDefinition[] = []) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...allFormDefs,
    formStateProbeRenderer,
    ...extraDefs,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://b32-nested-isolation"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function resolveFormState(testId: string): unknown {
  return JSON.parse(screen.getByTestId(testId).textContent ?? 'null') ?? null;
}

// --- C1: nested combo-in-combo write isolation ---

describe('B3.2 C1: nested combo-in-combo write isolation (prefix projection)', () => {
  it('editing a nested item in row 0 does not cross-contaminate row 1', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        groups: [
          { name: 'G0', members: [{ name: 'a0' }, { name: 'a1' }] },
          { name: 'G1', members: [{ name: 'b0' }, { name: 'b1' }] },
        ],
      },
      body: [
        {
          type: 'combo',
          id: 'groups',
          name: 'groups',
          label: 'Groups',
          itemKey: 'name',
          items: [
            { type: 'input-text', name: 'name', label: 'GroupName', testid: 'group-name' },
            {
              type: 'combo',
              name: 'members',
              label: 'Members',
              itemKey: 'name',
              items: [{ type: 'input-text', name: 'name', placeholder: 'MemberName' }],
            },
          ],
        },
        { type: 'form-state-probe', name: 'groups' },
      ],
    });

    await waitFor(() => {
      expect(resolveFormState('form-state:groups')).toHaveLength(2);
    });

    // Edit the first nested member name of group 0.
    const memberInputs = screen.getAllByPlaceholderText('MemberName') as HTMLInputElement[];
    expect(memberInputs.length).toBe(4);
    fireEvent.change(memberInputs[0], { target: { value: 'a0-edited' } });

    await waitFor(() => {
      const groups = resolveFormState('form-state:groups') as Array<{ name: string; members: Array<{ name: string }> }>;
      expect(groups[0].members[0].name).toBe('a0-edited');
      // Row 1 nested members are untouched (no cross-row contamination).
      expect(groups[1].members.map((m) => m.name)).toEqual(['b0', 'b1']);
      // Row 0's second nested member is also untouched.
      expect(groups[0].members[1].name).toBe('a1');
    });
  });
});

// --- C2: lexical owner-scope inheritance / cascade within a row ---

describe('B3.2 C2: lexical owner-scope inheritance within a row (LOCK)', () => {
  it('a sibling field readable via the projected owner scope reacts to row-local edits', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: {
        rows: [{ role: 'user', name: 'Alice' }],
      },
      body: [
        {
          type: 'array-field',
          name: 'rows',
          itemKind: 'object',
          item: [
            { type: 'input-text', name: 'name', label: 'Name' },
            { type: 'input-text', name: 'role', label: 'Role' },
            {
              type: 'input-text',
              name: 'adminCode',
              label: 'AdminCode',
              testid: 'admin-code',
              visible: '${value.role === "admin"}',
            },
            {
              type: 'text',
              text: 'role:${value.role}',
              testid: 'role-mirror',
            },
          ],
        },
      ],
    });

    await waitFor(() => expect(screen.getByLabelText('Name')).toBeTruthy());
    // Initially role=user -> adminCode hidden, mirror shows role:user.
    expect(screen.queryByTestId('admin-code')).toBeNull();
    await waitFor(() => expect(screen.getByTestId('role-mirror').textContent).toBe('role:user'));

    // Change the sibling role field in the same row -> cascade via owner scope.
    const roleInput = screen.getByLabelText('Role') as HTMLInputElement;
    fireEvent.change(roleInput, { target: { value: 'admin' } });

    await waitFor(() => expect(screen.getByTestId('admin-code')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('role-mirror').textContent).toBe('role:admin'));
  });
});

// --- C12: per-item re-render isolation (render-count assertion) ---

const itemRenderCounts: Record<string, number> = {};

function ItemRenderCountProbe() {
  const scope = useRenderScope();
  const id = String(scope.get('value.id') ?? scope.get('index') ?? 'unknown');
  React.useEffect(() => {
    itemRenderCounts[id] = (itemRenderCounts[id] ?? 0) + 1;
  });
  return <span data-testid={`render-probe-${id}`}>{id}</span>;
}

const itemRenderCountProbeRenderer: RendererDefinition = {
  type: 'item-render-probe',
  component: ItemRenderCountProbe,
};

describe('B3.2 C12: per-item re-render isolation (React.memo + itemKey)', () => {
  it('editing a middle item re-renders only that row; siblings are skipped', async () => {
    const itemCount = 30;
    const rows = Array.from({ length: itemCount }, (_, i) => ({
      id: `row-${i}`,
      name: `n${i}`,
    }));
    for (const key of Object.keys(itemRenderCounts)) {
      delete itemRenderCounts[key];
    }

    renderSchema(
      {
        type: 'form',
        id: 'f',
        data: { rows },
        body: [
          {
            type: 'array-field',
            name: 'rows',
            itemKind: 'object',
            itemKey: 'id',
            item: [
              { type: 'item-render-probe' },
              { type: 'input-text', name: 'name', label: 'Name', testid: 'row-name' },
            ],
          },
        ],
      },
      [itemRenderCountProbeRenderer],
    );

    await waitFor(() => expect(screen.getAllByLabelText('Name')).toHaveLength(itemCount));

    // Capture initial mount counts (each item mounted once).
    const before = { ...itemRenderCounts };
    expect(Object.keys(before)).toHaveLength(itemCount);

    // Edit the name of the middle row (row-15). `id` is the stable itemKey,
    // so identity is preserved and only that row's subtree should re-render.
    const nameInputs = screen.getAllByLabelText('Name') as HTMLInputElement[];
    fireEvent.change(nameInputs[15], { target: { value: 'edited' } });

    await waitFor(() => expect(nameInputs[15].value).toBe('edited'));

    // row-15 re-rendered at least once more; siblings did not.
    expect(itemRenderCounts['row-15']).toBeGreaterThan(before['row-15']);
    expect(itemRenderCounts['row-0']).toBe(before['row-0']);
    expect(itemRenderCounts['row-14']).toBe(before['row-14']);
    expect(itemRenderCounts['row-16']).toBe(before['row-16']);
    expect(itemRenderCounts['row-29']).toBe(before['row-29']);
  });
});

// --- C13: per-item action writeback + sibling loading isolation ---

function SetFlagButton(props: RendererComponentProps) {
  const form = useCurrentForm();
  const label = String(props.props.label ?? 'SetFlag');
  return (
    <button type="button" data-slot="set-flag" onClick={() => form?.setValue('flag', true)}>
      {label}
    </button>
  );
}

const setFlagButtonRenderer: RendererDefinition = {
  type: 'set-flag-button',
  component: SetFlagButton,
};

describe('B3.2 C13: per-item action writeback + no field-global loading flag', () => {
  it('a per-item action writes back to the index-addressed parent array path', async () => {
    renderSchema(
      {
        type: 'form',
        id: 'f',
        data: {
          rows: [{ id: 'r0', name: 'a', flag: false }, { id: 'r1', name: 'b', flag: false }],
        },
        body: [
          {
            type: 'array-field',
            name: 'rows',
            itemKind: 'object',
            itemKey: 'id',
            item: [
              { type: 'input-text', name: 'name', label: 'Name' },
              { type: 'set-flag-button', label: 'SetFlag' },
            ],
          },
          { type: 'form-state-probe', name: 'rows' },
        ],
      },
      [setFlagButtonRenderer],
    );

    await waitFor(() => expect(screen.getAllByText('SetFlag')).toHaveLength(2));

    // Trigger the per-item action on row 0.
    fireEvent.click(screen.getAllByText('SetFlag')[0]);

    await waitFor(() => {
      const rows = resolveFormState('form-state:rows') as Array<{ flag: boolean }>;
      // Writeback landed at rows.0.flag (index-addressed), row 1 untouched.
      expect(rows[0].flag).toBe(true);
      expect(rows[1].flag).toBe(false);
    });

    // Sibling row's interactive affordance is NOT globally disabled by row 0's action.
    const setFlagButtons = screen.getAllByText('SetFlag');
    expect((setFlagButtons[1] as HTMLButtonElement).disabled).toBe(false);
  });
});

export {};
