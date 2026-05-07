import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer, useCurrentForm } from '@nop-chaos/flux-react';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '../index';
import {
  buttonRenderer,
  env,
  formStateProbeRenderer,
  selectOption,
  sharedFormulaCompiler,
  submitCalls,
} from '@nop-chaos/flux-renderers-form/test-support';

const allFormDefs = [...formRendererDefinitions, ...formAdvancedRendererDefinitions];

describe(
  'second edit to the same field reflects updated value (bug 30 regression)',
  { timeout: 15000 },
  () => {
    afterEach(() => {
      submitCalls.length = 0;
    });

    it('input-text: second edit to the same field is reflected on submit', async () => {
      cleanup();
      const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/__tests__/form-double-edit-regression.test.tsx#1"
          schema={{
            type: 'form',
            id: 'second-edit-text-form',
            data: { username: 'Alice' },
            body: [{ type: 'input-text', name: 'username', label: 'Username' }],
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            actions: [
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'component:submit', componentId: 'second-edit-text-form' },
              },
            ],
          }}
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />,
      );

      const input = screen.getByDisplayValue('Alice');

      fireEvent.change(input, { target: { value: 'Bob' } });
      expect((screen.getByDisplayValue('Bob') as HTMLInputElement).value).toBe('Bob');

      fireEvent.change(screen.getByDisplayValue('Bob'), { target: { value: 'Charlie' } });
      expect((screen.getByDisplayValue('Charlie') as HTMLInputElement).value).toBe('Charlie');

      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(submitCalls.length).toBeGreaterThan(0));
      expect(submitCalls[0]).toMatchObject({ username: 'Charlie' });
    });

    it('input-password: second edit to the same field is reflected on submit', async () => {
      cleanup();
      const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/__tests__/form-double-edit-regression.test.tsx#2"
          schema={{
            type: 'form',
            id: 'second-edit-pw-form',
            data: { password: '' },
            body: [{ type: 'input-password', name: 'password', label: 'Password' }],
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            actions: [
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'component:submit', componentId: 'second-edit-pw-form' },
              },
            ],
          }}
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />,
      );

      const input = screen.getByLabelText('Password');
      fireEvent.change(input, { target: { value: 'pass1' } });
      expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('pass1');

      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass2' } });
      expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('pass2');

      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(submitCalls.length).toBeGreaterThan(0));
      expect(submitCalls[0]).toMatchObject({ password: 'pass2' });
    });

    it('textarea: second edit to the same field is reflected on submit', async () => {
      cleanup();
      const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/__tests__/form-double-edit-regression.test.tsx#3"
          schema={{
            type: 'form',
            id: 'second-edit-ta-form',
            data: { notes: 'Initial' },
            body: [{ type: 'textarea', name: 'notes', label: 'Notes' }],
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            actions: [
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'component:submit', componentId: 'second-edit-ta-form' },
              },
            ],
          }}
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />,
      );

      const textarea = screen.getByLabelText('Notes');
      fireEvent.change(textarea, { target: { value: 'First edit' } });
      fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Second edit' } });

      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(submitCalls.length).toBeGreaterThan(0));
      expect(submitCalls[0]).toMatchObject({ notes: 'Second edit' });
    });

    it('select: second selection on the same field is reflected on submit', async () => {
      cleanup();
      const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/__tests__/form-double-edit-regression.test.tsx#4"
          schema={{
            type: 'form',
            id: 'second-edit-sel-form',
            data: { role: '' },
            body: [
              {
                type: 'select',
                name: 'role',
                label: 'Role',
                options: [
                  { label: 'Admin', value: 'admin' },
                  { label: 'Editor', value: 'editor' },
                  { label: 'Viewer', value: 'viewer' },
                ],
              },
            ],
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            actions: [
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'component:submit', componentId: 'second-edit-sel-form' },
              },
            ],
          }}
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />,
      );

      await selectOption('Role', 'Editor');
      await selectOption('Role', 'Viewer');

      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(submitCalls.length).toBeGreaterThan(0));
      expect(submitCalls[0]).toMatchObject({ role: 'viewer' });
    });

    it('checkbox: toggling the same checkbox twice returns to original value', async () => {
      cleanup();
      const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/__tests__/form-double-edit-regression.test.tsx#5"
          schema={{
            type: 'form',
            id: 'second-edit-cb-form',
            data: { approved: false },
            body: [
              { type: 'checkbox', name: 'approved', label: 'Approved', option: { label: 'Yes' } },
            ],
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            actions: [
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'component:submit', componentId: 'second-edit-cb-form' },
              },
            ],
          }}
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />,
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      fireEvent.click(checkbox);

      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(submitCalls.length).toBeGreaterThan(0));
      expect(submitCalls[0]).toMatchObject({ approved: false });
    });

    it('switch: toggling the same switch twice returns to original value', async () => {
      cleanup();
      const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/__tests__/form-double-edit-regression.test.tsx#6"
          schema={{
            type: 'form',
            id: 'second-edit-sw-form',
            data: { active: false },
            body: [{ type: 'switch', name: 'active', label: 'Active' }],
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            actions: [
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'component:submit', componentId: 'second-edit-sw-form' },
              },
            ],
          }}
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />,
      );

      const sw = screen.getByRole('switch', { name: /Active/ });
      fireEvent.click(sw);
      fireEvent.click(sw);

      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(submitCalls.length).toBeGreaterThan(0));
      expect(submitCalls[0]).toMatchObject({ active: false });
    });

    it('radio-group: second selection replaces the first', async () => {
      cleanup();
      const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/__tests__/form-double-edit-regression.test.tsx#7"
          schema={{
            type: 'form',
            id: 'second-edit-rg-form',
            data: { status: 'draft' },
            body: [
              {
                type: 'radio-group',
                name: 'status',
                label: 'Status',
                options: [
                  { label: 'Draft', value: 'draft' },
                  { label: 'Published', value: 'published' },
                  { label: 'Archived', value: 'archived' },
                ],
              },
            ],
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            actions: [
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'component:submit', componentId: 'second-edit-rg-form' },
              },
            ],
          }}
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />,
      );

      fireEvent.click(screen.getByRole('radio', { name: /Published/ }));
      fireEvent.click(screen.getByRole('radio', { name: /Archived/ }));

      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(submitCalls.length).toBeGreaterThan(0));
      expect(submitCalls[0]).toMatchObject({ status: 'archived' });
    });

    it('checkbox-group: unchecking a previously checked item updates the array', async () => {
      cleanup();
      const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/__tests__/form-double-edit-regression.test.tsx#8"
          schema={{
            type: 'form',
            id: 'second-edit-cg-form',
            data: { tags: ['stable'] },
            body: [
              {
                type: 'checkbox-group',
                name: 'tags',
                label: 'Tags',
                options: [
                  { label: 'Stable', value: 'stable' },
                  { label: 'Beta', value: 'beta' },
                ],
              },
            ],
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            actions: [
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'component:submit', componentId: 'second-edit-cg-form' },
              },
            ],
          }}
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />,
      );

      fireEvent.click(screen.getByRole('checkbox', { name: /Beta/ }));
      fireEvent.click(screen.getByRole('checkbox', { name: /Stable/ }));

      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(submitCalls.length).toBeGreaterThan(0));
      expect(submitCalls[0]).toMatchObject({ tags: ['beta'] });
    });

    it('input-tree: unchecking a previously checked node updates the array', async () => {
      cleanup();
      const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/__tests__/form-double-edit-regression.test.tsx#9"
          schema={
            {
              type: 'form',
              id: 'second-edit-it-form',
              data: { categoryIds: [] },
              body: [
                {
                  type: 'input-tree',
                  name: 'categoryIds',
                  label: 'Categories',
                  treeMode: 'checkbox' as const,
                  options: [
                    { label: 'Platform', value: 'platform' },
                    { label: 'Runtime', value: 'runtime' },
                  ],
                },
              ],
              submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
              actions: [
                {
                  type: 'button',
                  label: 'Submit',
                  onClick: { action: 'component:submit', componentId: 'second-edit-it-form' },
                },
              ],
            } as any
          }
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />,
      );

      fireEvent.click(document.querySelector('[role="checkbox"][aria-label="Platform"]')!);
      fireEvent.click(document.querySelector('[role="checkbox"][aria-label="Runtime"]')!);
      fireEvent.click(document.querySelector('[role="checkbox"][aria-label="Platform"]')!);

      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(submitCalls.length).toBeGreaterThan(0));
      expect(submitCalls[0]).toMatchObject({ categoryIds: ['runtime'] });
    });

    it('tree-select: second write to the same field via form.setValue is reflected in probe', async () => {
      cleanup();

      function SetDepartmentBtn() {
        const form = useCurrentForm();
        return (
          <button type="button" onClick={() => form?.setValue('departmentId', 'runtime')}>
            Set Runtime
          </button>
        );
      }

      const setValueBtnRenderer: RendererDefinition = {
        type: 'set-value-btn',
        component: SetDepartmentBtn,
      };

      const SchemaRenderer = createSchemaRenderer([
        ...allFormDefs,
        formStateProbeRenderer,
        setValueBtnRenderer,
      ]);

      render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/__tests__/form-double-edit-regression.test.tsx#10"
          schema={
            {
              type: 'form',
              data: { departmentId: '' },
              body: [
                {
                  type: 'tree-select',
                  name: 'departmentId',
                  label: 'Dept',
                  options: [{ label: 'Platform', value: 'platform' }],
                },
                { type: 'form-state-probe', name: 'departmentId' },
                { type: 'set-value-btn' },
              ],
            } as any
          }
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />,
      );

      const trigger = document.querySelector('[data-slot="popover-trigger"]') as HTMLElement;
      fireEvent.click(trigger);
      fireEvent.click(await screen.findByText('Platform'));

      await waitFor(() => {
        expect(
          JSON.parse(screen.getByTestId('form-state:departmentId').textContent ?? 'null'),
        ).toBe('platform');
      });

      fireEvent.click(screen.getByText('Set Runtime'));

      await waitFor(() => {
        expect(
          JSON.parse(screen.getByTestId('form-state:departmentId').textContent ?? 'null'),
        ).toBe('runtime');
      });
    });

    it('tag-list: unchecking a previously selected tag updates the array', async () => {
      cleanup();
      const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/__tests__/form-double-edit-regression.test.tsx#11"
          schema={{
            type: 'form',
            id: 'second-edit-tl-form',
            data: { tags: ['alpha'] },
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            body: [
              { type: 'tag-list', name: 'tags', label: 'Tags', tags: ['alpha', 'beta', 'gamma'] },
            ],
            actions: [
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'submitForm' },
              },
            ],
          }}
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />,
      );

      fireEvent.click(screen.getByText('beta'));
      fireEvent.click(screen.getByText('alpha'));

      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(submitCalls.length).toBeGreaterThan(0));
      expect(submitCalls[0]).toMatchObject({ tags: ['beta'] });
    });

    it('key-value: user edits the same row value twice and submits the second value', async () => {
      cleanup();
      const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/__tests__/form-double-edit-regression.test.tsx#12"
          schema={{
            type: 'form',
            id: 'second-edit-kv-form',
            data: {
              metadata: [{ key: 'env', value: 'dev' }],
            },
            body: [
              {
                type: 'key-value',
                name: 'metadata',
                label: 'Metadata',
                keyLabel: 'Key',
                valueLabel: 'Value',
              },
            ],
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            actions: [
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'component:submit', componentId: 'second-edit-kv-form' },
              },
            ],
          }}
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />,
      );

      await waitFor(() => expect(screen.getByDisplayValue('dev')).toBeTruthy());

      fireEvent.change(screen.getByDisplayValue('dev'), { target: { value: 'staging' } });
      fireEvent.change(screen.getByDisplayValue('staging'), { target: { value: 'production' } });

      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(submitCalls.length).toBeGreaterThan(0));
      expect(submitCalls[0]).toMatchObject({
        metadata: [{ key: 'env', value: 'production' }],
      });
    });

    it('array-editor: user edits the same cell twice and submits the second value', async () => {
      cleanup();
      const SchemaRenderer = createSchemaRenderer([...allFormDefs, buttonRenderer]);

      render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/__tests__/form-double-edit-regression.test.tsx#13"
          schema={{
            type: 'form',
            id: 'second-edit-ae-form',
            data: {
              reviewers: [{ value: 'alice' }],
            },
            body: [
              {
                type: 'array-editor',
                name: 'reviewers',
                label: 'Reviewers',
                itemLabel: 'Reviewer',
              },
            ],
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            actions: [
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'component:submit', componentId: 'second-edit-ae-form' },
              },
            ],
          }}
          env={env}
          formulaCompiler={sharedFormulaCompiler}
        />,
      );

      await waitFor(() => expect(screen.getByDisplayValue('alice')).toBeTruthy());

      fireEvent.change(screen.getByDisplayValue('alice'), { target: { value: 'bob' } });
      fireEvent.change(screen.getByDisplayValue('bob'), { target: { value: 'carol' } });

      fireEvent.click(screen.getByText('Submit'));
      await waitFor(() => expect(submitCalls.length).toBeGreaterThan(0));
      expect(submitCalls[0]).toMatchObject({
        reviewers: [{ value: 'carol' }],
      });
    });
  },
);
