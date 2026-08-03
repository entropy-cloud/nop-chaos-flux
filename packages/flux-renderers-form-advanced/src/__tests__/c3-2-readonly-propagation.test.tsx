import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { env, formulaCompiler } from '../test-support.js';
import { formAdvancedRendererDefinitions } from '../index.js';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

function renderSchema(schema: object) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...allFormDefs,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://c3-2-readonly-propagation"
      schema={schema as never}
      env={env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

async function expectInputsReadonly(placeholder: string, count: number) {
  await waitFor(() => {
    expect(screen.getAllByPlaceholderText(placeholder)).toHaveLength(count);
  });

  for (const input of screen.getAllByPlaceholderText(placeholder) as HTMLInputElement[]) {
    expect(input.getAttribute('readonly')).not.toBeNull();
  }
}

describe('array-field: readOnly/disabled propagate to item fields (C3.2 P1-3 / CX-8)', () => {
  const objectItem = [{ type: 'input-text', name: 'name', placeholder: 'AName' }];

  it('readOnly: true renders item inputs read-only and hides add/remove chrome', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { contacts: [{ name: 'Alice' }, { name: 'Bob' }] },
      body: [
        { type: 'array-field', id: 'a', name: 'contacts', label: 'Contacts', itemKind: 'object', readOnly: true, item: objectItem },
        { type: 'form-state-probe', name: 'contacts' },
      ],
    });

    await expectInputsReadonly('AName', 2);
    expect(screen.queryByText('Remove')).toBeNull();
    expect(screen.queryByText('Add item')).toBeNull();
  });

  it('disabled: true renders item inputs read-only', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { contacts: [{ name: 'Alice' }] },
      body: [
        { type: 'array-field', id: 'a', name: 'contacts', label: 'Contacts', itemKind: 'object', disabled: true, item: objectItem },
        { type: 'form-state-probe', name: 'contacts' },
      ],
    });

    await expectInputsReadonly('AName', 1);
  });

  it('scalar itemKind readOnly propagates to the scalar editor', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { tags: ['x', 'y'] },
      body: [
        { type: 'array-field', id: 'a', name: 'tags', label: 'Tags', itemKind: 'scalar', readOnly: true, item: [{ type: 'input-text', placeholder: 'Tag' }] },
        { type: 'form-state-probe', name: 'tags' },
      ],
    });

    await expectInputsReadonly('Tag', 2);
  });
});

describe('object-field: readOnly/disabled propagate to body fields (C3.2 P1-3 / CX-8)', () => {
  const body = [
    { type: 'input-text', name: 'street', placeholder: 'Street' },
    { type: 'input-text', name: 'city', placeholder: 'City' },
  ];

  it('readOnly: true renders body inputs read-only', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { address: { street: '1 Main', city: 'Spring' } },
      body: [
        { type: 'object-field', id: 'o', name: 'address', label: 'Address', readOnly: true, body },
        { type: 'form-state-probe', name: 'address' },
      ],
    });

    await expectInputsReadonly('Street', 1);
    await expectInputsReadonly('City', 1);
  });

  it('disabled: true renders body inputs read-only', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { address: { street: '1 Main', city: 'Spring' } },
      body: [
        { type: 'object-field', id: 'o', name: 'address', label: 'Address', disabled: true, body },
        { type: 'form-state-probe', name: 'address' },
      ],
    });

    await expectInputsReadonly('Street', 1);
  });
});

describe('detail-field / detail-view: readOnly propagates into the draft surface (C3.2 P1-3 / CX-8)', () => {
  it('detail-field readOnly draft renders child inputs read-only', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { address: { street: '1 Main', city: 'Spring' } },
      body: [
        {
          type: 'detail-field',
          id: 'd',
          name: 'address',
          label: 'Address',
          readOnly: true,
          triggerLabel: 'Open Address',
          content: [
            { type: 'input-text', name: 'street', placeholder: 'DStreet' },
            { type: 'input-text', name: 'city', placeholder: 'DCity' },
          ],
        },
      ],
    });

    await waitFor(() => expect(screen.getByText('Open Address')).toBeTruthy());
    fireEvent.click(screen.getByText('Open Address'));

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('DStreet')).toHaveLength(1);
    });

    for (const input of screen.getAllByPlaceholderText('DStreet') as HTMLInputElement[]) {
      expect(input.getAttribute('readonly')).not.toBeNull();
    }

    const confirmButton = screen.queryByText('Confirm');
    expect(confirmButton).toBeNull();
    expect(screen.getAllByText('Close').length).toBeGreaterThanOrEqual(1);
  });

  it('detail-view readOnly draft renders child inputs read-only', async () => {
    renderSchema({
      type: 'page',
      body: [
        {
          type: 'detail-view',
          id: 'dv',
          scopePath: 'server',
          label: 'Server',
          readOnly: true,
          triggerLabel: 'Open Server',
          data: { name: 's1', status: 'active' },
          content: [{ type: 'input-text', name: 'name', placeholder: 'VName' }],
        },
      ],
    });

    await waitFor(() => expect(screen.getByText('Open Server')).toBeTruthy());
    fireEvent.click(screen.getByText('Open Server'));

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('VName')).toHaveLength(1);
    });

    for (const input of screen.getAllByPlaceholderText('VName') as HTMLInputElement[]) {
      expect(input.getAttribute('readonly')).not.toBeNull();
    }
  });
});

describe('variant-field: readOnly content-fallback renders branch fields read-only (C3.2 P1-3 / CX-8)', () => {
  it('readOnly with content-only variants renders branch inputs read-only', async () => {
    renderSchema({
      type: 'form',
      id: 'f',
      data: { kind: 'alpha' },
      body: [
        {
          type: 'variant-field',
          id: 'v',
          name: 'kind',
          label: 'Kind',
          readOnly: true,
          variants: [
            {
              key: 'alpha',
              label: 'Alpha',
              content: [{ type: 'input-text', name: 'code', placeholder: 'VAlpha' }],
            },
            {
              key: 'beta',
              label: 'Beta',
              content: [{ type: 'input-text', name: 'code', placeholder: 'VBeta' }],
            },
          ],
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getAllByPlaceholderText('VAlpha')).toHaveLength(1);
    });

    for (const input of screen.getAllByPlaceholderText('VAlpha') as HTMLInputElement[]) {
      expect(input.getAttribute('readonly')).not.toBeNull();
    }
  });
});
