import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { baseEnv, createFormSchemaRenderer, formulaCompiler } from '../test-support';

describe('detail-field renderer basic behavior', () => {
  it('renders the trigger button when not readOnly', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-basic.test.tsx#1"
        schema={{
          type: 'form',
          data: { address: { street: '123 Main St', city: 'Springfield' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              content: [
                { type: 'input-text', name: 'street', label: 'Street' },
                { type: 'input-text', name: 'city', label: 'City' },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Address')).toBeTruthy();
    });

    const field = screen.getByText('Edit Address').closest('.nop-field');
    expect(field).toBeTruthy();
    expect(field?.querySelector('[data-slot="field-label"]')?.textContent).toContain('Address');
    expect(field?.querySelector('[data-slot="field-control"]')).toBeTruthy();
    expect(field?.querySelector('[data-slot="detail-field-viewer"]')).toBeTruthy();
    expect(field?.querySelector('[data-slot="detail-field-draft-body"]')).toBeNull();
  });

  it('does not render trigger button when readOnly', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-basic.test.tsx#2"
        schema={{
          type: 'form',
          data: { address: { street: '123 Main St' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              readOnly: true,
              triggerLabel: 'Edit Address',
              content: [{ type: 'input-text', name: 'street', label: 'Street' }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.queryByText('Edit Address')).toBeNull());
  });

  it('opens a dialog with the edit content when trigger is clicked', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-basic.test.tsx#3"
        schema={{
          type: 'form',
          data: { address: { street: '123 Main St', city: 'Springfield' } },
          body: [
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              surface: { mode: 'dialog', title: 'Edit Address' },
              content: [
                { type: 'input-text', name: 'street', label: 'Street' },
                { type: 'input-text', name: 'city', label: 'City' },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));

    await waitFor(() => {
      expect(screen.getByLabelText('Street')).toBeTruthy();
      expect(screen.getByLabelText('City')).toBeTruthy();
    });

    expect((screen.getByLabelText('Street') as HTMLInputElement).value).toBe('123 Main St');
    expect((screen.getByLabelText('City') as HTMLInputElement).value).toBe('Springfield');
    expect(document.querySelector('[data-slot="detail-field-draft-body"]')).toBeTruthy();
  });

  it('blocks confirm if draft has required fields empty', async () => {
    cleanup();
    const SchemaRenderer = createFormSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-field-basic.test.tsx#4"
        schema={{
          type: 'form',
          data: { profile: { name: '' } },
          body: [
            {
              type: 'detail-field',
              name: 'profile',
              label: 'Profile',
              triggerLabel: 'Edit Profile',
              surface: { mode: 'dialog', title: 'Edit Profile' },
              content: [{ type: 'input-text', name: 'name', label: 'Name', required: true }],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Profile')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Profile'));

    await waitFor(() => expect(screen.getByLabelText('Name', { exact: false })).toBeTruthy());

    expect((screen.getByLabelText('Name', { exact: false }) as HTMLInputElement).value).toBe('');

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Please fix validation errors before confirming.')).toBeTruthy();
    });

    expect(screen.getByLabelText('Name', { exact: false })).toBeTruthy();
    expect(document.querySelector('[data-slot="detail-field-draft-error"]')?.textContent).toContain('Please fix validation errors before confirming.');
  });
});
