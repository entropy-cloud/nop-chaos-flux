import React from 'react';
import { describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { formRendererDefinitions } from '../index';
import { buttonRenderer, env, selectOption } from './form-test-support';

describe('formRendererDefinitions - relational and conditional field validation', () => {
  it('supports relational field validation with dependent revalidation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            password: 'alpha',
            confirmPassword: 'alpha',
            role: 'viewer',
            adminCode: ''
          },
          body: [
            {
              type: 'input-password',
              name: 'password',
              label: 'Password'
            },
            {
              type: 'input-password',
              name: 'confirmPassword',
              label: 'Confirm Password',
              equalsField: 'password'
            },
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Viewer', value: 'viewer' },
                { label: 'Admin', value: 'admin' }
              ]
            },
            {
              type: 'input-text',
              name: 'adminCode',
              label: 'Admin Code',
              requiredWhen: {
                path: 'role',
                equals: 'admin',
                message: 'Admin code is required for admins'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const confirmInput = screen.getByLabelText('Confirm Password');
    const passwordInput = screen.getAllByDisplayValue('alpha')[0];
    const adminCodeInput = screen.getByLabelText('Admin Code');

    fireEvent.focus(confirmInput);
    fireEvent.blur(confirmInput);
    expect(screen.queryByText('Confirm Password must match password')).toBeNull();

    fireEvent.change(passwordInput, { target: { value: 'beta' } });

    expect(await screen.findByText('Confirm Password must match password')).toBeTruthy();

    fireEvent.focus(adminCodeInput);
    fireEvent.blur(adminCodeInput);
    expect(screen.queryByText('Admin code is required for admins')).toBeNull();

    await selectOption('Role', 'Admin');

    expect(await screen.findByText('Admin code is required for admins')).toBeTruthy();

    await selectOption('Role', 'Viewer');

    await waitFor(() => {
      expect(screen.queryByText('Admin code is required for admins')).toBeNull();
    });
  });

  it('supports not-equals and required-unless relational validation in the UI', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          showErrorOn: ['touched', 'submit'],
          data: {
            username: 'alice',
            backupUsername: 'bob',
            status: 'draft',
            publishReason: ''
          },
          body: [
            {
              type: 'input-text',
              name: 'username',
              label: 'Username'
            },
            {
              type: 'input-text',
              name: 'backupUsername',
              label: 'Backup Username',
              notEqualsField: 'username'
            },
            {
              type: 'select',
              name: 'status',
              label: 'Status',
              options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Review', value: 'review' },
                { label: 'Published', value: 'published' }
              ]
            },
            {
              type: 'input-text',
              name: 'publishReason',
              label: 'Publish Reason',
              requiredUnless: {
                path: 'status',
                equals: 'published',
                message: 'Publish reason is required before publishing'
              }
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const usernameInput = screen.getByLabelText('Username');
    const backupInput = screen.getByLabelText('Backup Username');
    const publishReasonInput = screen.getByRole('textbox', { name: /Publish Reason/ });

    fireEvent.focus(backupInput);
    fireEvent.blur(backupInput);
    fireEvent.change(usernameInput, { target: { value: 'bob' } });

    expect(await screen.findByText('Backup Username must not match username')).toBeTruthy();

    fireEvent.change(usernameInput, { target: { value: 'carol' } });

    await waitFor(() => {
      expect(screen.queryByText('Backup Username must not match username')).toBeNull();
    });

    fireEvent.focus(publishReasonInput);
    fireEvent.blur(publishReasonInput);
    await selectOption('Status', 'Review');

    expect(await screen.findByText('Publish reason is required before publishing')).toBeTruthy();

    await selectOption('Status', 'Published');

    await waitFor(() => {
      expect(screen.queryByText('Publish reason is required before publishing')).toBeNull();
    });
  });

  it('supports disabled and required expressions for conditional field presentation', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            role: 'viewer',
            adminCode: '',
            isAdmin: false
          },
          body: [
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Viewer', value: 'viewer' },
                { label: 'Admin', value: 'admin' }
              ]
            },
            {
              type: 'input-text',
              name: 'adminCode',
              label: 'Admin Code',
              disabled: '${role !== "admin"}'
            },
            {
              type: 'input-text',
              name: 'adminCodeRequired',
              label: 'Admin Code Required',
              visible: '${role === "admin"}',
              required: true
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    const adminCodeInput = screen.getByLabelText('Admin Code') as HTMLInputElement;
    expect(adminCodeInput.disabled).toBe(true);
    expect(screen.queryByText('Admin Code Required')).toBeNull();

    await selectOption('Role', 'Admin');

    await waitFor(() => {
      expect(adminCodeInput.disabled).toBe(false);
    });

    expect(await screen.findByText('Admin Code Required')).toBeTruthy();
    const requiredLabel = screen.getByText('Admin Code Required').closest('[data-slot="field-label"]');
    expect(requiredLabel?.querySelector('[data-slot="field-required"]')).toBeTruthy();
  });

  it('supports visible and options expressions for conditional field presentation', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions, buttonRenderer]);

    render(
      <SchemaRenderer
        schema={{
          type: 'form',
          data: {
            role: 'viewer',
            permission: 'read',
            adminOptions: [
              { label: 'Manage users', value: 'manage-users' },
              { label: 'Publish content', value: 'publish-content' }
            ],
            viewerOptions: [
              { label: 'Read only', value: 'read' }
            ]
          },
          body: [
            {
              type: 'select',
              name: 'role',
              label: 'Role',
              options: [
                { label: 'Viewer', value: 'viewer' },
                { label: 'Admin', value: 'admin' }
              ]
            },
            {
              type: 'radio-group',
              name: 'permission',
              label: 'Permission',
              visible: '${role === "admin"}',
              options: '${role === "admin" ? adminOptions : viewerOptions}'
            }
          ]
        }}
        env={env}
        formulaCompiler={createFormulaCompiler()}
      />
    );

    expect(screen.queryByLabelText('Manage users')).toBeNull();
    expect(screen.queryByText('Permission')).toBeNull();

    await selectOption('Role', 'Admin');

    expect(await screen.findByText('Permission')).toBeTruthy();
    expect(screen.getByText('Manage users')).toBeTruthy();
    expect(screen.getByText('Publish content')).toBeTruthy();
  });
});
