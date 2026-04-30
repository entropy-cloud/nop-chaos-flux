import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import {
  allRenderers,
  baseEnv,
  formulaCompiler,
  makeCapturingFetcher,
} from './composite-form-support';

describe('composite form - six-component integration', () => {
  it('renders all six components together and submits when valid', async () => {
    cleanup();
    const submitValues: Record<string, unknown>[] = [];
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-integration.test.tsx#1"
        schema={{
          type: 'form',
          id: 'six-form',
          data: {
            profile: { firstName: 'Jane', lastName: 'Doe' },
            tags: ['alpha', 'beta'],
            contactMethod: { type: 'email', email: 'jane@example.com' },
            address: { street: '1 Main St', city: 'Townsville' },
            config: { theme: 'dark' },
            recentItems: ['alpha', 'beta'],
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              body: [
                { type: 'input-text', name: 'firstName', label: 'First Name', required: true },
                { type: 'input-text', name: 'lastName', label: 'Last Name', required: true },
              ],
            },
            {
              type: 'array-field',
              name: 'tags',
              itemKind: 'scalar',
              label: 'Tags',
              item: [{ type: 'input-text', name: 'value', label: 'Tag' }],
            },
            {
              type: 'variant-field',
              name: 'contactMethod',
              label: 'Contact',
              selectorMode: 'select',
              variants: [
                {
                  key: 'email',
                  label: 'Email',
                  initialValue: { type: 'email', email: '' },
                  content: [{ type: 'input-text', name: 'email', label: 'Email Address' }],
                },
                {
                  key: 'phone',
                  label: 'Phone',
                  initialValue: { type: 'phone', phone: '' },
                  content: [{ type: 'input-text', name: 'phone', label: 'Phone Number' }],
                },
              ],
            },
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
            {
              type: 'detail-view',
              scopePath: 'config',
              triggerLabel: 'Edit Config',
              surface: { mode: 'dialog', title: 'Edit Config' },
              content: [{ type: 'input-text', name: 'theme', label: 'Theme' }],
            },
            {
              type: 'loop',
              items: '${recentItems}',
              body: [{ type: 'text', text: '${$slot.item}' }],
            },
          ],
          submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
          actions: [
            {
              type: 'button',
              label: 'Submit',
              onClick: { action: 'component:submit', componentId: 'six-form' },
            },
          ],
        }}
        env={{
          ...baseEnv,
          fetcher: makeCapturingFetcher(submitValues),
        }}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Submit')).toBeTruthy();
      expect(screen.getByText('Edit Address')).toBeTruthy();
      expect(screen.getByText('Edit Config')).toBeTruthy();
      expect(screen.getByText('alpha')).toBeTruthy();
    });

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

    const result = submitValues[0] as Record<string, unknown>;
    expect(result).toMatchObject({
      profile: { firstName: 'Jane', lastName: 'Doe' },
    });
    expect(Array.isArray(result.tags)).toBe(true);
  });

  it('detail-field confirm gating works within combined form', async () => {
    cleanup();
    const SchemaRenderer = createSchemaRenderer(allRenderers);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-integration.test.tsx#2"
        schema={{
          type: 'form',
          id: 'six-block',
          data: {
            profile: { name: 'Jane' },
            address: { street: '', city: '' },
          },
          body: [
            {
              type: 'object-field',
              name: 'profile',
              label: 'Profile',
              body: [{ type: 'input-text', name: 'name', label: 'Profile Name', required: true }],
            },
            {
              type: 'detail-field',
              name: 'address',
              label: 'Address',
              triggerLabel: 'Edit Address',
              surface: { mode: 'dialog', title: 'Edit Address' },
              content: [
                { type: 'input-text', name: 'street', label: 'Street', required: true },
                { type: 'input-text', name: 'city', label: 'City', required: true },
              ],
            },
          ],
          actions: [],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Address')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Address'));

    await waitFor(() => expect(screen.getByLabelText('Street', { exact: false })).toBeTruthy());

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(screen.getByText('Please fix validation errors before confirming.')).toBeTruthy();
    });

    expect(screen.getByLabelText('Street', { exact: false })).toBeTruthy();
  });
});

describe('composite form - submit supersedes debounced validation', () => {
  it('submit catches required errors even when fired before blur debounce fires', async () => {
    cleanup();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    try {
      const submitValues: Record<string, unknown>[] = [];
      const SchemaRenderer = createSchemaRenderer(allRenderers);

      render(
        <SchemaRenderer
          schemaUrl="test://flux-renderers-form-advanced/__tests__/composite-form-integration.test.tsx#3"
          schema={{
            type: 'form',
            id: 'debounce-form',
            data: { title: '' },
            body: [{ type: 'input-text', name: 'title', label: 'Title', required: true }],
            submitAction: { action: 'ajax', args: { url: '/api/test', method: 'post' } },
            actions: [
              {
                type: 'button',
                label: 'Submit',
                onClick: { action: 'component:submit', componentId: 'debounce-form' },
              },
            ],
          }}
          env={{
            ...baseEnv,
            fetcher: makeCapturingFetcher(submitValues),
          }}
          formulaCompiler={formulaCompiler}
        />,
      );

      await waitFor(() => expect(screen.getByText('Submit')).toBeTruthy());

      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        const errors = screen.queryAllByText(/required/i);
        expect(errors.length).toBeGreaterThan(0);
      });

      expect(submitValues.length).toBe(0);

      fireEvent.change(screen.getByLabelText('Title', { exact: false }), {
        target: { value: 'My Title' },
      });

      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => expect(submitValues.length).toBeGreaterThan(0));

      expect(submitValues[0]).toMatchObject({ title: 'My Title' });
    } finally {
      vi.useRealTimers();
    }
  });
});
